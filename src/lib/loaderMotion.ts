// ─────────────────────────────────────────────────────────────
// Moteur d'animation du <Loader />.
//
// Port des courbes du composant Framer d'origine (« Animation loader »)
// vers du CSS/React pur : aucune dépendance d'animation (règle du projet).
// Tout ce qui est testable vit ici — le composant n'est qu'une couche de
// rendu.
// ─────────────────────────────────────────────────────────────

/** Easing de la barre de progression et du compteur (0 → 100 %). */
export const EASE_BARRE: [number, number, number, number] = [0.12, 0.23, 0.5, 1];

/** Easing de la sortie : morphose du masque en cercle (600 ms). */
export const EASE_SORTIE: [number, number, number, number] = [
  0.77, 0.02, 0.24, 1.02,
];

/** Durée totale de la séquence, comme le modèle Framer (3 s). */
export const DUREE_DEFAUT_MS = 3000;

/** Durée d'apparition d'une lettre (ressort du modèle, ≈ 600 ms). */
export const DUREE_LETTRE_MS = 600;

/** Décalage entre deux lettres (staggering). */
export const PAS_LETTRE_MS = 45;

/** Durée de la phase de sortie (morphose + fondu). */
export const DUREE_SORTIE_MS = 600;

export type Easing = (t: number) => number;

/** Fonction identité — mode « animations réduites » et tests. */
export const lin: Easing = (t) => t;

/**
 * Approximation d'une courbe de Bézier cubique CSS `cubic-bezier(x1,y1,x2,y2)`.
 * Newton-Raphson, puis dichotomie de secours si la pente est quasi nulle
 * (même stratégie que le moteur de rendu du navigateur).
 */
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): Easing {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) return sampleY(t);
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }

    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 24; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) break;
      if (err > 0) hi = t;
      else lo = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}

/** Avancement d'une animation, borné à [0 ; 1]. */
export function progression(
  elapsedMs: number,
  durationMs: number,
  ease: Easing = lin,
): number {
  if (durationMs <= 0) return 1;
  const t = Math.min(1, Math.max(0, elapsedMs / durationMs));
  return ease(t);
}

/** Pourcentage entier affiché par le compteur (0 → 100). */
export function pourcentage(avancement: number): number {
  return Math.round(Math.min(1, Math.max(0, avancement)) * 100);
}

/** Délai d'apparition de la i-ème lettre, en ms. */
export function delaiLettre(index: number): number {
  return Math.max(0, index) * PAS_LETTRE_MS;
}

/** Représente une courbe au format CSS (`inline-style`). */
export function cssBezier(e: [number, number, number, number]): string {
  return `cubic-bezier(${e.join(",")})`;
}

/**
 * Préférence système « animations réduites ». Ne lève jamais d'erreur :
 * renvoie `false` hors navigateur (tests en environnement node).
 */
export function animationsReduites(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function")
    return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
