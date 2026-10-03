import { describe, it, expect } from "vitest";
import type { Meter } from "../types";
import {
  ABONNEMENT_SODECI,
  PUISSANCE_SOCIALE_KVA,
  SEUIL_SOCIAL_BIMESTRE,
  TARIF_EFFECTIVE_FROM,
  TARIF_SOURCES,
  TARIF_VERSION,
  TARIFS_CIE,
  TRANCHES_SODECI,
  baremeEauPour,
  baremeElecPour,
  detecterRegimeCIE,
  inferTypeCompteur,
  repartirTranchesEau,
  seuilKwhBimestre,
  tarifApplicable,
} from "./tarifsCI";
import {
  describeTariff,
  round2,
  simulate,
  tariffId,
} from "./billing";
import { enrichReadings } from "./calc";

const elec = (over: Partial<Meter> = {}): Meter => ({
  id: "e1",
  name: "Compteur élec",
  unit: "kWh",
  digits: 6,
  billing: "tarif-ci",
  type: "electricite",
  ...over,
});

const eau = (over: Partial<Meter> = {}): Meter => ({
  id: "e2",
  name: "Compteur eau",
  unit: "m³",
  digits: 5,
  billing: "tarif-ci",
  type: "eau",
  ...over,
});

const amount = (lines: { label: string; amount: number }[], label: string) =>
  lines.find((l) => l.label === label)?.amount;

describe("Barème CIE — cas de référence (Social 5A)", () => {
  // Référence regime.md : 100 kWh sur un bimestre complet en Abidjan, zone
  // rurale → 614,90 + 80×31,72 + 20×65,11 + 100×2 + 100×1 + 100×2,50.
  it("facture 100 kWh / 60 j à 5 004,70 FCFA", () => {
    const inv = simulate({ meter: elec(), conso: 100, days: 60 });
    expect(inv.engine).toBe("cie");
    expect(inv.days).toBe(60);
    expect(inv.total).toBeCloseTo(5004.7, 2);

    expect(amount(inv.lines, "Prime fixe")).toBeCloseTo(614.9, 2);
    expect(amount(inv.lines, "Tranche 1 (≤ 80 kWh/bimestre)")).toBeCloseTo(
      2537.6,
      2,
    );
    expect(amount(inv.lines, "Tranche 2 (> 80 kWh/bimestre)")).toBeCloseTo(
      1302.2,
      2,
    );
    expect(amount(inv.lines, "Redevance RTI")).toBeCloseTo(200, 2);
    expect(
      amount(inv.lines, "Redevance électrification rurale"),
    ).toBeCloseTo(100, 2);
    expect(amount(inv.lines, "Taxe ordures ménagères (Abidjan)")).toBeCloseTo(
      250,
      2,
    );
  });

  it("ne proratise QUE la prime sur la durée (jamais le volume)", () => {
    const inv = simulate({ meter: elec(), conso: 50, days: 30 });
    expect(amount(inv.lines, "Prime fixe")).toBeCloseTo(614.9 / 2, 2);
    // Le volume n'est pas projeté sur 60 j : 50 kWh réels, pas 100.
    expect(amount(inv.lines, "Tranche 1 (≤ 80 kWh/bimestre)")).toBeCloseTo(
      50 * 31.72,
      2,
    );
  });

  it("plafonne la redevance RTI à 2 000 FCFA par bimestre", () => {
    const inv = simulate({ meter: elec(), conso: 2000, days: 60 });
    expect(amount(inv.lines, "Redevance RTI")).toBe(2000); // 2000×2 = 4000 → plafond
  });

  it("somme les lignes arrondies (et non l'arrondi de la somme)", () => {
    const inv = simulate({ meter: elec(), conso: 7, days: 45 });
    expect(inv.total).toBe(round2(inv.lines.reduce((s, l) => s + l.amount, 0)));
    expect(inv.total).toBeCloseTo(721.72, 2);
  });

  it("est strictement croissant avec la consommation (monotonicité)", () => {
    let prev = -1;
    for (let c = 0; c <= 1200; c += 7) {
      const t = simulate({ meter: elec(), conso: c, days: 60 }).total;
      expect(t).toBeGreaterThan(prev);
      prev = t;
    }
  });

  it("ne facture rien d'autre que la prime à 0 kWh", () => {
    const inv = simulate({ meter: elec(), conso: 0, days: 60 });
    expect(inv.total).toBeCloseTo(614.9, 2);
  });
});

describe("Barème CIE — seuils et régimes", () => {
  it("utilise un seuil fixe de 80 kWh pour le régime social", () => {
    expect(seuilKwhBimestre("social_5A")).toBe(80);
    expect(seuilKwhBimestre("social_5A", 3.3)).toBe(80);
  });

  it("applique la règle CIE « 180 × P souscrite » pour les régimes généraux", () => {
    expect(seuilKwhBimestre("general_5A", 1.1)).toBe(198);
    expect(seuilKwhBimestre("general_15A", 3.3)).toBe(594);
    expect(seuilKwhBimestre("general_5A")).toBe(198); // repli sans puissance
    expect(seuilKwhBimestre("general_5A", 5)).toBe(900);
  });

  it("a une tranche 2 DÉCROISSANTE pour les régimes généraux", () => {
    expect(TARIFS_CIE.general_5A.prixKwhTranche2).toBeLessThan(
      TARIFS_CIE.general_5A.prixKwhTranche1,
    );
    expect(TARIFS_CIE.general_15A.prixKwhTranche2).toBeLessThan(
      TARIFS_CIE.general_15A.prixKwhTranche1,
    );
    // ...et croissante pour le social.
    expect(TARIFS_CIE.social_5A.prixKwhTranche2).toBeGreaterThan(
      TARIFS_CIE.social_5A.prixKwhTranche1,
    );
  });

  it("détecte le régime à partir de la conso moyenne et de la puissance", () => {
    expect(detecterRegimeCIE(150)).toBe("social_5A");
    expect(detecterRegimeCIE(250)).toBe("general_5A");
    expect(detecterRegimeCIE(100, 3.3)).toBe("general_5A"); // > 1,1 kVA
  });
});

describe("Barème SODECI — tranches progressives", () => {
  it("facture aux bornes des tranches", () => {
    expect(simulate({ meter: eau(), conso: 9, days: 60 }).total).toBeCloseTo(
      9 * 250.3,
      2,
    );
    expect(simulate({ meter: eau(), conso: 18, days: 60 }).total).toBeCloseTo(
      18 * 250.3,
      2,
    );
  });

  it("n'applique le prix fort qu'à la fraction excédentaire", () => {
    // 9 × 250,30 + 9 × 250,30 + 2 × 403,30 (méthode officielle SODECI)
    expect(simulate({ meter: eau(), conso: 20, days: 60 }).total).toBeCloseTo(
      5312.0,
      2,
    );
    // 9×250,30 + 9×250,30 + 72×403,30 + 10×664 (au-delà de 90 m³ : tarif normal)
    expect(simulate({ meter: eau(), conso: 100, days: 60 }).total).toBeCloseTo(
      40183.0,
      2,
    );
  });

  it("conserve le volume lors de la répartition", () => {
    const parts = repartirTranchesEau(37.5);
    expect(parts.reduce((s, p) => s + p.m3, 0)).toBeCloseTo(37.5, 6);
    expect(parts.map((p) => p.label)).toEqual([
      "Forfaitaire",
      "Social",
      "Domestique",
    ]);
    expect(repartirTranchesEau(0)).toHaveLength(0);
  });

  it("n'ajoute pas les frais uniques de mise en service", () => {
    const inv = simulate({ meter: eau(), conso: 5, days: 60 });
    expect(inv.lines.some((l) => l.label.toLowerCase().includes("mise"))).toBe(
      false,
    );
  });
});

describe("Stratégie tarifaire (getEngine)", () => {
  it("choisit le moteur selon billing + type", () => {
    expect(tariffId(elec())).toBe("cie");
    expect(tariffId(eau())).toBe("sodeci");
    expect(
      tariffId({ id: "x", name: "x", unit: "u", digits: 5, price: 100 }),
    ).toBe("lineaire");
  });

  it("reste strictement équivalent à l'ancien calcul linéaire", () => {
    const legacy: Meter = {
      id: "l1",
      name: "Gaz",
      unit: "u",
      digits: 5,
      price: 99,
      abon: 3000,
    };
    const inv = simulate({ meter: legacy, conso: 500, days: 30 });
    expect(inv.engine).toBe("lineaire");
    expect(inv.total).toBeCloseTo(500 * 99 + round2((3000 * 30) / 30.44), 2);
    expect(inv.total).toBeCloseTo(52456.64, 2);
  });

  it("replie en linéaire + avertissement si type manquant", () => {
    const broken: Meter = {
      id: "b",
      name: "b",
      unit: "kWh",
      digits: 5,
      billing: "tarif-ci",
      price: 100,
    };
    const inv = simulate({ meter: broken, conso: 10, days: 60 });
    expect(inv.engine).toBe("lineaire");
    expect(inv.note).toMatch(/linéaire de repli/);
  });

  it("décrit le barème appliqué pour l'UI et le PDF", () => {
    expect(describeTariff(elec())).toContain("Social 5A");
    expect(describeTariff(eau())).toContain("SODECI");
    expect(describeTariff({ id: "g", name: "g", unit: "u", digits: 5, price: 50 }))
      .toContain("50");
  });
});

describe("Historisation des barèmes", () => {
  it("expose une version datée", () => {
    expect(TARIF_VERSION).toMatch(/^\d{4}\.\d+$/);
    expect(TARIF_EFFECTIVE_FROM).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(tarifApplicable("2025-06-01").version).toBe(TARIF_VERSION);
    // Repli déterministe sur le barème le plus ancien connu.
    expect(tarifApplicable("1999-01-01").version).toBe(TARIF_VERSION);
  });

  it("est calé sur l'arrêté 1355 (effet au 1er janvier 2024, art. 31)", () => {
    // Validé le 2026-10-02 contre le texte de l'arrêté (JODCI) + registre ANARE.
    expect(TARIF_EFFECTIVE_FROM).toBe("2024-01-01");
    expect(TARIF_SOURCES).toContain("1355");
    expect(tarifApplicable("2023-12-31").effectiveFrom).toBe(
      TARIF_EFFECTIVE_FROM,
    ); // repli : barème unique connu
    expect(tarifApplicable("2024-01-01").effectiveFrom).toBe(
      TARIF_EFFECTIVE_FROM,
    );
  });
});

describe("Conformité aux textes officiels (arrêté 1355 / méthode SODECI)", () => {
  it("reprend l'arrêté 1355 art. 2 — Social 5A (TTC)", () => {
    expect(TARIFS_CIE.social_5A.primeFixeBimestre).toBe(614.9);
    expect(TARIFS_CIE.social_5A.prixKwhTranche1).toBe(31.72);
    expect(TARIFS_CIE.social_5A.prixKwhTranche2).toBe(65.11);
    expect(TARIFS_CIE.social_5A.redevanceRtiPlafond).toBe(2000);
    expect(TARIFS_CIE.social_5A.taxeOrduresAbidjan).toBe(2.5);
    expect(TARIFS_CIE.social_5A.taxeOrduresAutres).toBe(1.0);
    expect(SEUIL_SOCIAL_BIMESTRE).toBe(200); // moyenne ≤ 200 kWh/3 bimestres
    expect(PUISSANCE_SOCIALE_KVA).toBe(1.1);
  });

  it("reprend l'arrêté 1355 art. 3 — Général 5A (TTC)", () => {
    expect(TARIFS_CIE.general_5A.primeFixeBimestre).toBe(1618.04);
    expect(TARIFS_CIE.general_5A.prixKwhTranche1).toBe(86.92);
    expect(TARIFS_CIE.general_5A.prixKwhTranche2).toBe(75.34);
    expect(TARIFS_CIE.general_5A.redevanceElecRuraleKwh).toBe(1.06);
  });

  it("reprend l'arrêté 1355 art. 5 — Général 15A et plus (TTC)", () => {
    expect(TARIFS_CIE.general_15A.primeFixeBimestre).toBe(1779.84);
    expect(TARIFS_CIE.general_15A.prixKwhTranche1).toBe(95.62);
    expect(TARIFS_CIE.general_15A.prixKwhTranche2).toBe(82.86);
    expect(TARIFS_CIE.general_15A.seuilTranche1).toBe(594); // 180 × 3,3 kVA
  });

  it("reprend la méthode de calcul SODECI — 4 tranches", () => {
    expect(TRANCHES_SODECI.map((t) => [t.label, t.min, t.prixM3])).toEqual([
      ["Forfaitaire", 0, 250.3],
      ["Social", 9, 250.3],
      ["Domestique", 18, 403.3],
      ["Normal", 90, 664],
    ]);
    expect(TRANCHES_SODECI[TRANCHES_SODECI.length - 1].max).toBe(Infinity);
    expect(ABONNEMENT_SODECI.compteur15mm).toBe(28443);
    expect(ABONNEMENT_SODECI.avanceConso).toBe(16500);
  });
});

describe("Intégration enrichReadings", () => {
  it("délègue le coût au moteur et expose la facture détaillée", () => {
    const m = elec();
    const list = enrichReadings(m, [
      { id: "r1", meterId: m.id, date: "2025-01-01", index: 1000 },
      { id: "r2", meterId: m.id, date: "2025-03-02", index: 1100 }, // 60 j
    ]);
    expect(list[1].conso).toBe(100);
    expect(list[1].cost).toBeCloseTo(5004.7, 2);
    expect(list[1].invoice?.engine).toBe("cie");
    expect(list[0].invoice).toBeNull();
  });

  it("garde l'unité libre des compteurs hors barème", () => {
    const m: Meter = {
      id: "gaz",
      name: "Gaz",
      unit: "bouteille",
      digits: 3,
      price: 5000,
    };
    expect(inferTypeCompteur("bouteille")).toBeUndefined();
    expect(tariffId(m)).toBe("lineaire");
  });
});

describe("Barèmes par date", () => {
  it("sélectionne le barème en vigueur à la date de facture", () => {
    expect(baremeElecPour("2025-06-15")).toBe(TARIFS_CIE);
    expect(baremeEauPour("2025-06-15")).toBe(TRANCHES_SODECI);
    expect(baremeElecPour("2025-06-15").general_5A.prixKwhTranche1).toBe(86.92);
  });

  it("retombe sur le barème courant avant le premier arrêté connu", () => {
    expect(baremeElecPour("1999-01-01")).toBe(TARIFS_CIE);
    expect(baremeEauPour("1999-01-01")).toBe(TRANCHES_SODECI);
  });

  it("stampe la version de barème sur la facture officielle", () => {
    const cie = simulate({
      meter: elec(),
      conso: 10,
      days: 60,
      date: "2025-06-15",
    });
    expect(cie.tarifVersion).toBe(TARIF_VERSION);
    expect(cie.tarifVersion).toBe(tarifApplicable("2025-06-15").version);
  });

  it("ne stampe rien sur le moteur linéaire (pas de barème officiel)", () => {
    const lin = simulate({
      meter: { id: "x", name: "x", unit: "u", digits: 3, price: 100 },
      conso: 2,
      days: 30,
      date: "2025-06-15",
    });
    expect(lin.engine).toBe("lineaire");
    expect(lin.tarifVersion).toBeUndefined();
  });
});
