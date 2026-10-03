import { describe, it, expect } from "vitest";
import { enrichReadings, daysBetween, detectLeak, median } from "./calc";
import type { EnrichedReading, Meter, Reading } from "../types";

const eau: Meter = {
  id: "eau",
  name: "Eau",
  unit: "m³",
  price: 400,
  abon: 0,
  digits: 5,
};
const elec: Meter = {
  id: "elec",
  name: "Électricité",
  unit: "kWh",
  price: 99,
  abon: 3000,
  digits: 6,
};

const reading = (
  id: string,
  meterId: string,
  date: string,
  index: number,
): Reading => ({ id, meterId, date, index });

describe("daysBetween", () => {
  it("calcule le nombre de jours entre deux dates ISO", () => {
    expect(daysBetween("2024-01-01", "2024-01-31")).toBe(30);
    expect(daysBetween("2024-01-01", "2024-01-01")).toBe(0);
    // 2024 est bissextile → février compte 29 jours
    expect(daysBetween("2024-02-01", "2024-03-01")).toBe(29);
  });
});

describe("enrichReadings", () => {
  it("retourne un tableau vide si aucun relevé", () => {
    expect(enrichReadings(eau, [])).toEqual([]);
  });

  it("le premier relevé n'a ni conso, ni jours, ni coût", () => {
    const [first] = enrichReadings(eau, [
      reading("a", "eau", "2024-01-01", 100),
    ]);
    expect(first.conso).toBeNull();
    expect(first.days).toBeNull();
    expect(first.cost).toBeNull();
  });

  it("calcule la conso par différence d'index consécutifs", () => {
    const list = enrichReadings(eau, [
      reading("a", "eau", "2024-01-01", 1000),
      reading("b", "eau", "2024-01-31", 1500),
    ]);
    expect(list[1].conso).toBe(500);
  });

  it("gère le passage à zéro du compteur (rollover)", () => {
    const list = enrichReadings(eau, [
      reading("a", "eau", "2024-01-01", 99990),
      reading("b", "eau", "2024-02-01", 12),
    ]);
    // 12 - 99990 + 10^5 = 22
    expect(list[1].conso).toBe(22);
  });

  it("calcule les jours écoulés entre deux relevés", () => {
    const list = enrichReadings(eau, [
      reading("a", "eau", "2024-01-01", 1000),
      reading("b", "eau", "2024-01-31", 1500),
    ]);
    expect(list[1].days).toBe(30);
  });

  it("calcule le coût = conso * prix + abon * jours / 30.44", () => {
    const list = enrichReadings(elec, [
      reading("a", "elec", "2024-01-01", 1000),
      reading("b", "elec", "2024-01-31", 1500),
    ]);
    // 500 * 99 + 3000 * 30 / 30.44 ≈ 52456.64
    expect(list[1].cost).toBeCloseTo(52456.64, 1);
  });

  it("trie les relevés par date puis par index", () => {
    const list = enrichReadings(eau, [
      reading("c", "eau", "2024-03-01", 2000),
      reading("a", "eau", "2024-01-01", 1000),
      reading("b", "eau", "2024-02-01", 1500),
    ]);
    expect(list.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("ignore les relevés des autres compteurs", () => {
    const list = enrichReadings(eau, [
      reading("a", "eau", "2024-01-01", 1000),
      reading("x", "elec", "2024-01-15", 500),
      reading("b", "eau", "2024-02-01", 1200),
    ]);
    expect(list).toHaveLength(2);
    expect(list.every((r) => r.meterId === "eau")).toBe(true);
  });
});

describe("median", () => {
  it("calcule la médiane d'une série (vide, impaire, paire)", () => {
    expect(median([])).toBe(0);
    expect(median([10])).toBe(10);
    expect(median([1, 3, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("ne modifie pas le tableau d'origine", () => {
    const v = [3, 1, 2];
    median(v);
    expect(v).toEqual([3, 1, 2]);
  });
});

describe("detectLeak", () => {
  const mk = (
    id: string,
    date: string,
    conso: number | null,
    days: number | null,
  ): EnrichedReading => ({
    id,
    meterId: "eau",
    date,
    index: 0,
    conso,
    days,
    cost: 0,
  });

  it("retourne null s'il y a trop peu de données", () => {
    expect(detectLeak([])).toBeNull();
    expect(detectLeak([mk("a", "2024-01-01", null, null)])).toBeNull();
    expect(
      detectLeak([
        mk("a", "2024-01-01", null, null),
        mk("b", "2024-02-01", 100, 30),
      ]),
    ).toBeNull();
  });

  it("détecte une consommation anormalement élevée", () => {
    const list = [
      mk("r1", "2024-01-01", null, null),
      mk("r2", "2024-02-01", 100, 30), // 3,33 /j
      mk("r3", "2024-03-01", 100, 31), // 3,23 /j
      mk("r4", "2024-04-01", 110, 30), // 3,67 /j
      mk("r5", "2024-05-01", 400, 31), // 12,9 /j → ratio ≈ 3,9
    ];
    const alert = detectLeak(list);
    expect(alert).not.toBeNull();
    expect(alert?.readingId).toBe("r5");
    expect(alert?.ratio).toBeGreaterThan(2);
  });

  it("ne signale rien pour une consommation normale", () => {
    const list = [
      mk("r1", "2024-01-01", null, null),
      mk("r2", "2024-02-01", 100, 30),
      mk("r3", "2024-03-01", 100, 31),
      mk("r4", "2024-04-01", 110, 30),
      mk("r5", "2024-05-01", 105, 31),
    ];
    expect(detectLeak(list)).toBeNull();
  });

  it("respecte la fenêtre d'analyse (ignore les relevés trop anciens)", () => {
    const list = [
      mk("r1", "2020-01-01", null, null),
      mk("r2", "2020-02-01", 100, 30), // ancien → hors fenêtre
      mk("r3", "2020-03-01", 100, 30),
      mk("r4", "2020-04-01", 100, 30),
      // dernier relevé bien plus tard : plus assez de références récentes
      mk("r5", "2024-05-01", 400, 31),
    ];
    expect(detectLeak(list)).toBeNull();
  });

  it("comme prévu pour un compteur 5 chiffres, un bond reste relatif au prix", () => {
    // Vérifie seulement que detectLeak utilise bien la médiane et le ratio.
    const list = [
      mk("r1", "2024-01-01", null, null),
      mk("r2", "2024-02-01", 30, 30), // 1/j
      mk("r3", "2024-03-01", 30, 30), // 1/j
      mk("r4", "2024-04-01", 30, 30), // 1/j
      mk("r5", "2024-05-01", 31, 31), // 1/j
    ];
    expect(detectLeak(list)).toBeNull();
  });
});