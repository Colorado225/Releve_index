import { describe, expect, it } from "vitest";
import {
  DUREE_SORTIE_MS,
  EASE_BARRE,
  EASE_SORTIE,
  PAS_LETTRE_MS,
  animationsReduites,
  cssBezier,
  cubicBezier,
  delaiLettre,
  progression,
  pourcentage,
} from "./loaderMotion";

describe("cubicBezier", () => {
  const ease = cubicBezier(...EASE_BARRE);

  it("passe par les extrémités", () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
  });

  it("reste strictement croissante et bornée entre 0 et 1", () => {
    let prev = -1;
    for (let x = 0; x <= 1.0001; x += 0.02) {
      const y = ease(x);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = y;
    }
  });

  it("suit la courbe de la barre : ~0,75 à mi-parcours", () => {
    // Courbe du modèle : rapide au départ, puis amortie (ease-out).
    expect(ease(0.5)).toBeCloseTo(0.75, 2);
    expect(ease(0.25)).toBeCloseTo(0.44, 2);
  });

  it("supporte une pente nulle (dichotomie de secours)", () => {
    // x1 = x2 = 0 → dérivée nulle en 0, la Newton-Raphson échoue.
    const flat = cubicBezier(0, 0, 0, 0);
    expect(flat(0.5)).toBeCloseTo(0.5, 5);
    expect(flat(-1)).toBe(0);
    expect(flat(2)).toBe(1);
  });
});

describe("progression", () => {
  it("vaut 0 au démarrage et 1 à la fin", () => {
    expect(progression(0, 3000)).toBe(0);
    expect(progression(3000, 3000)).toBe(1);
  });

  it("se borne en dehors de l'intervalle", () => {
    expect(progression(-500, 3000)).toBe(0);
    expect(progression(9999, 3000)).toBe(1);
  });

  it("applique l'easing fourni", () => {
    expect(progression(500, 1000, (t) => t * t)).toBeCloseTo(0.25, 6);
  });

  it("est immédiate si la durée est nulle", () => {
    expect(progression(10, 0)).toBe(1);
  });

  it("monte continûment pendant la séquence", () => {
    const ease = cubicBezier(...EASE_BARRE);
    let prev = -1;
    for (let ms = 0; ms <= 3000; ms += 150) {
      const p = progression(ms, 3000, ease);
      expect(p).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = p;
    }
    expect(prev).toBe(1);
  });
});

describe("pourcentage", () => {
  it("arrondit et reste borné", () => {
    expect(pourcentage(0)).toBe(0);
    expect(pourcentage(0.456)).toBe(46);
    expect(pourcentage(1)).toBe(100);
    expect(pourcentage(1.7)).toBe(100);
    expect(pourcentage(-0.2)).toBe(0);
  });
});

describe("delaiLettre", () => {
  it("décale chaque lettre du pas configuré", () => {
    expect(delaiLettre(0)).toBe(0);
    expect(delaiLettre(1)).toBe(PAS_LETTRE_MS);
    expect(delaiLettre(4)).toBe(4 * PAS_LETTRE_MS);
    expect(delaiLettre(-3)).toBe(0);
  });
});

describe("cssBezier", () => {
  it("génère la notation CSS", () => {
    expect(cssBezier(EASE_SORTIE)).toBe("cubic-bezier(0.77,0.02,0.24,1.02)");
    expect(DUREE_SORTIE_MS).toBe(600);
  });
});

describe("animationsReduites", () => {
  it("ne lève jamais d'erreur hors navigateur", () => {
    expect(typeof animationsReduites()).toBe("boolean");
  });
});
