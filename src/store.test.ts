import { describe, it, expect } from "vitest";
import { adoptLegacy, STORAGE_KEY, STATE_VERSION } from "./store";
import type { Meter, Reading } from "./types";

// Fausse implémentation de Storage (l'API n'existe pas en environnement node).
function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

const eurMeters: Meter[] = [
  { id: "eau", name: "Eau", unit: "m³", price: 3.5, abon: 0, digits: 5 },
  {
    id: "elec",
    name: "Électricité",
    unit: "kWh",
    price: 0.25,
    abon: 2,
    digits: 6,
  },
];
const readings: Reading[] = [
  { id: "r1", meterId: "eau", date: "2024-01-01", index: 1000 },
];
const v1Payload = JSON.stringify({
  state: { meters: eurMeters, readings },
  version: 0,
});
const v2Payload = JSON.stringify({
  state: {
    meters: [
      { id: "eau", name: "Eau", unit: "m³", price: 400, abon: 0, digits: 5 },
    ],
    readings,
  },
  version: 0,
});

describe("adoptLegacy (clés héritées → clé courante)", () => {
  it("convertit les prix v1 (euros) avec la parité 655,957 et garde les relevés", () => {
    const s = fakeStorage({ "releve-index-v1": v1Payload });
    expect(adoptLegacy(s)).toBe(true);

    const out = JSON.parse(s.getItem(STORAGE_KEY) as string);
    expect(out.version).toBe(STATE_VERSION);
    expect(out.state.meters[0].price).toBe(Math.round(3.5 * 655.957)); // 2296
    expect(out.state.meters[1].price).toBe(Math.round(0.25 * 655.957)); // 164
    expect(out.state.meters[1].abon).toBe(Math.round(2 * 655.957)); // 1312
    expect(out.state.readings).toEqual(readings);
  });

  it("adopte sans conversion les données v2 (déjà en FCFA)", () => {
    const s = fakeStorage({ "releve-index-v2": v2Payload });
    expect(adoptLegacy(s)).toBe(true);

    const out = JSON.parse(s.getItem(STORAGE_KEY) as string);
    expect(out.state.meters[0].price).toBe(400);
    expect(out.state.readings).toEqual(readings);
  });

  it("donne la priorité à la v2 sur la v1 (prix déjà en FCFA)", () => {
    const s = fakeStorage({
      "releve-index-v1": v1Payload,
      "releve-index-v2": v2Payload,
    });
    expect(adoptLegacy(s)).toBe(true);
    const out = JSON.parse(s.getItem(STORAGE_KEY) as string);
    expect(out.state.meters[0].price).toBe(400);
  });

  it("ne fait rien si la clé courante existe déjà", () => {
    const s = fakeStorage({
      "releve-index": JSON.stringify({ state: { meters: [], readings: [] } }),
      "releve-index-v1": v1Payload,
    });
    expect(adoptLegacy(s)).toBe(false);
  });

  it("ne fait rien s'il n'y a aucune donnée héritée", () => {
    const s = fakeStorage();
    expect(adoptLegacy(s)).toBe(false);
    expect(s.getItem(STORAGE_KEY)).toBeNull();
  });

  it("ignore un JSON invalide ou une structure inattendue", () => {
    expect(
      adoptLegacy(fakeStorage({ "releve-index-v1": "{ pas du json" })),
    ).toBe(false);
    expect(
      adoptLegacy(
        fakeStorage({
          "releve-index-v1": JSON.stringify({ state: { readings: [] } }),
        }),
      ),
    ).toBe(false);
  });
});