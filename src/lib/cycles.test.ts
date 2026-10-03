import { describe, expect, it } from "vitest";
import type { Meter, Reading } from "../types";
import { enrichReadings } from "./calc";
import {
  CYCLES_BASCULE,
  SEUIL_BASCULE_KWH,
  anchorFor,
  basculeSociale,
  consoParCycles,
  cycleCourant,
  cycleForDate,
  formatCycle,
  regimeEffectif,
} from "./cycles";
import { TARIF_VERSION } from "./tarifsCI";

const A = "2025-01-01"; // ancrage au 1er janvier → janv.-févr., mars-avr., …

describe("cycleForDate", () => {
  it("découpe l'année en bimestres calés sur l'ancrage", () => {
    const jan = cycleForDate("2025-01-15", A);
    expect(jan).toEqual({ start: "2025-01-01", end: "2025-03-01", index: 0 });

    const feb = cycleForDate("2025-02-28", A);
    expect(feb.index).toBe(0);
    expect(feb.end).toBe("2025-03-01");

    // Borne haute strictement exclue : le 1er mars ouvre le cycle suivant.
    const mar = cycleForDate("2025-03-01", A);
    expect(mar.index).toBe(1);
    expect(mar.start).toBe("2025-03-01");
  });

  it("traverse les millésimes", () => {
    expect(cycleForDate("2026-01-01", A)).toEqual({
      start: "2026-01-01",
      end: "2026-03-01",
      index: 6,
    });
    expect(cycleForDate("2026-12-31", A).index).toBe(11);
  });

  it("gère les dates antérieures à l'ancrage (index négatifs)", () => {
    const c = cycleForDate("2024-12-15", A);
    expect(c.index).toBe(-1);
    expect(c.start).toBe("2024-11-01");
    expect(c.end).toBe("2025-01-01");
    expect("2024-12-15" >= c.start && "2024-12-15" < c.end).toBe(true);
  });

  it("respecte la phase de l'ancrage (contrat ouvert en mars)", () => {
    const anchor = "2025-03-15";
    const c = cycleForDate("2025-03-15", anchor);
    expect(c).toEqual({ start: "2025-03-01", end: "2025-05-01", index: 0 });
    expect(cycleForDate("2025-05-01", anchor).index).toBe(1);
  });

  it("cycleCourant = cycle du jour", () => {
    expect(cycleCourant(A, "2025-07-20")).toMatchObject({ index: 3 });
    expect(cycleCourant(A, "2025-07-20").start).toBe("2025-07-01");
  });

  it("formatCycle produit un libellé lisible", () => {
    expect(formatCycle(cycleForDate("2025-03-15", A))).toBe("mars – avr. 2025");
    expect(formatCycle(cycleForDate("2026-01-05", A))).toBe("janv. – févr. 2026");
  });
});

describe("anchorFor", () => {
  const meter = { id: "m", name: "m", unit: "kWh", digits: 6 } as Meter;

  it("privilégie l'ancrage déclaré", () => {
    expect(anchorFor({ ...meter, anchorDate: "2024-06-01" }, ["2025-01-01"])).toBe(
      "2024-06-01",
    );
  });

  it("retombe sur le premier relevé, puis sur aujourd'hui", () => {
    expect(anchorFor(meter, ["2025-04-10", "2025-05-10"])).toBe("2025-04-10");
    expect(anchorFor(meter, [])).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("consoParCycles", () => {
  const intervalles = [
    { date: "2025-02-28", conso: 250 },
    { date: "2025-03-02", conso: 10 }, // déjà dans le cycle mars-avril
    { date: "2025-04-30", conso: 240 },
  ];

  it("agrège les intervalles par cycle de fin", () => {
    const cycles = consoParCycles(intervalles, A, "2025-06-01");
    expect(cycles.map((c) => [c.index, c.conso])).toEqual([
      [0, 250],
      [1, 250],
    ]);
    expect(cycles.every((c) => c.termine)).toBe(true);
  });

  it("marque les cycles encore ouverts", () => {
    const cycles = consoParCycles(intervalles, A, "2025-04-01");
    expect(cycles.find((c) => c.index === 1)?.termine).toBe(false);
    expect(cycles.find((c) => c.index === 0)?.termine).toBe(true);
  });

  it("conserve le volume total", () => {
    const cycles = consoParCycles(intervalles, A, "2025-06-01");
    const sum = cycles.reduce((s, c) => s + c.conso, 0);
    expect(sum).toBe(intervalles.reduce((s, i) => s + i.conso, 0));
  });
});

describe("basculeSociale — règle des 3 bimestres", () => {
  const mk = (index: number, conso: number) => ({
    start: "",
    end: "",
    index,
    conso,
    termine: true,
  });

  it("n'examine que les cycles strictement antérieurs", () => {
    // Le cycle courant (index 3) ne doit jamais être pris en compte.
    const cycles = [mk(0, 300), mk(1, 300), mk(2, 300), mk(3, 0)];
    expect(basculeSociale(cycles, 3)).toBe(true);
    expect(basculeSociale(cycles, 0)).toBe(false);
  });

  it("requiert exactement 3 cycles consécutifs au-delà du seuil", () => {
    expect(basculeSociale([mk(0, 201), mk(1, 201), mk(2, 201)], 3)).toBe(true);
    expect(basculeSociale([mk(0, 201), mk(1, 201)], 2)).toBe(false);
    // Seuil strict : 200 pile ne déclenche rien.
    expect(basculeSociale([mk(0, 999), mk(1, 999), mk(2, 200)], 3)).toBe(false);
    // Un cycle dans les clous interrompt la série.
    expect(basculeSociale([mk(0, 999), mk(1, 100), mk(2, 999)], 3)).toBe(false);
  });

  it("refuse de conclure si un cycle manque (relevé absent)", () => {
    expect(basculeSociale([mk(0, 999), mk(2, 999)], 3)).toBe(false);
    expect(CYCLES_BASCULE).toBe(3);
    expect(SEUIL_BASCULE_KWH).toBe(200);
  });
});

describe("regimeEffectif", () => {
  const elec = (extra: Partial<Meter> = {}): Meter =>
    ({
      id: "e",
      name: "Élec",
      unit: "kWh",
      digits: 6,
      billing: "tarif-ci",
      type: "electricite",
      ...extra,
    }) as Meter;

  const mk = (index: number, conso: number) => ({
    start: "",
    end: "",
    index,
    conso,
    termine: true,
  });

  it("n'intervient pas sur un compteur d'eau", () => {
    expect(
      regimeEffectif(elec({ type: "eau" }), [mk(0, 500), mk(1, 500), mk(2, 500)], 3),
    ).toBeUndefined();
  });

  it("impose un régime général au-delà de 1,1 kVA (sans rétrograder le 15A)", () => {
    expect(regimeEffectif(elec({ puissanceSouscrite: 3.3 }), [], 0)).toBe(
      "general_5A",
    );
    // Un compteur déclaré en Général 15A avec sa puissance reste en 15A :
    // seule la bascule « social → général » existe, jamais l'inverse.
    expect(
      regimeEffectif(
        elec({ regime: "general_15A", puissanceSouscrite: 3.3 }),
        [],
        0,
      ),
    ).toBe("general_15A");
  });

  it("ne rétrograde jamais un régime général choisi à la main", () => {
    expect(
      regimeEffectif(elec({ regime: "general_5A" }), [mk(0, 10), mk(1, 10), mk(2, 10)], 3),
    ).toBe("general_5A");
  });

  it("bascule social → général après 3 cycles > 200 kWh", () => {
    expect(regimeEffectif(elec(), [mk(0, 250), mk(1, 250), mk(2, 250)], 3)).toBe(
      "general_5A",
    );
    expect(regimeEffectif(elec(), [mk(0, 250), mk(1, 250), mk(2, 50)], 3)).toBe(
      "social_5A",
    );
    expect(regimeEffectif(elec(), [], 0)).toBe("social_5A");
  });
});

describe("intégration enrichReadings — bascule répercutée sur la facture", () => {
  const meter: Meter = {
    id: "cie",
    name: "Électricité",
    unit: "kWh",
    digits: 6,
    billing: "tarif-ci",
    type: "electricite",
    anchorDate: A,
  };

  const rd = (date: string, index: number): Reading => ({
    id: date,
    meterId: meter.id,
    date,
    index,
  });

  // Un relevé à la fin de chaque cycle : 250 kWh sur 3 cycles, puis 100.
  const readings: Reading[] = [
    rd("2025-01-01", 0),
    rd("2025-02-28", 250),
    rd("2025-04-30", 500),
    rd("2025-06-30", 750),
    rd("2025-08-31", 850),
  ];

  const list = enrichReadings(meter, readings);

  it("produit une facture datée et versionnée par période", () => {
    expect(list[0].invoice).toBeNull();
    const billed = list.slice(1);
    for (const r of billed) {
      expect(r.invoice?.tarifVersion).toBe(TARIF_VERSION);
      expect(r.invoice?.days).toBeGreaterThan(0);
      expect(r.cost).toBe(r.invoice?.total);
    }
  });

  it("reste au tarif social tant que la série n'est pas complète", () => {
    const third = list.find((r) => r.date === "2025-06-30")!;
    const rates = (third.invoice?.lines ?? []).map((l) => l.rate);
    expect(rates).toContain(31.72); // tranche 1 sociale
    expect(rates).not.toContain(86.92);
    // 250 kWh sur 61 j : prime 625,15 + 80×31,72 + 170×65,11 + RTI 500 + rural 250 + ordures 625
    expect(third.invoice?.total).toBe(15606.45);
  });

  it("bascule au tarif général au 4e bimestre consécutif", () => {
    const fourth = list.find((r) => r.date === "2025-08-31")!;
    const rates = (fourth.invoice?.lines ?? []).map((l) => l.rate);
    expect(rates).toContain(86.92); // tranche 1 générale
    expect(rates).not.toContain(31.72);
    // 100 kWh sur 62 j, prime générale : 1671,97 + 100×86,92 + RTI 200
    // + rural 100×1,06 + ordures 100×2,50
    expect(fourth.invoice?.total).toBe(10919.97);
    expect(fourth.cost).toBe(10919.97);
  });
});

