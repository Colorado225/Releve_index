import { useEffect, useMemo, useRef, useState } from "react";
import { useElapsed } from "../hooks/useElapsed";
import {
  DUREE_DEFAUT_MS,
  DUREE_LETTRE_MS,
  DUREE_SORTIE_MS,
  EASE_BARRE,
  EASE_SORTIE,
  animationsReduites,
  cssBezier,
  cubicBezier,
  delaiLettre,
  progression,
  pourcentage,
} from "../lib/loaderMotion";

/**
 * Loader animé — port du composant Framer « Animation loader ».
 *
 * Séquence (mode `determinate`) :
 * 1. la marque apparaît lettre par lettre (flou → net) ;
 * 2. la barre se remplit et le compteur monte de 0 à 100 % sur `durationMs` ;
 * 3. le masque se transforme en cercle (600 ms) puis `onDone` est appelé.
 *
 * En mode `indeterminate` (durée de tâche inconnue), seule la barre boucle en
 * boucle infinie : aucun compteur, aucun `onDone`.
 */
export type LoaderProps = {
  /** Texte révélé lettre par lettre (marque ou titre). */
  brand?: string;
  /** Sous-titre, sous la marque. */
  sub?: string;
  /** Légende sous le compteur, annoncée aux lecteurs d'écran. */
  label?: string;
  /** Durée de la séquence en ms (3 000 par défaut, comme le modèle). */
  durationMs?: number;
  /** Couleur marque / barre / compteur — défaut : couleur du texte. */
  accent?: string;
  /** Fond du masque — défaut : thème clair/sombre. */
  background?: string;
  /** `overlay` plein écran · `inline` à l'intérieur d'une carte. */
  variant?: "overlay" | "inline";
  /** `indeterminate` : barre en boucle, sans compteur ni fin de séquence. */
  mode?: "determinate" | "indeterminate";
  /** Appelé en fin de séquence (morphose de sortie comprise). */
  onDone?: () => void;
  className?: string;
};

const TRANSITION_SORTIE = [
  `border-radius ${DUREE_SORTIE_MS}ms ${cssBezier(EASE_SORTIE)}`,
  `opacity ${DUREE_SORTIE_MS}ms ease`,
  `transform ${DUREE_SORTIE_MS}ms ${cssBezier(EASE_SORTIE)}`,
].join(", ");

export function Loader({
  brand,
  sub,
  label,
  durationMs = DUREE_DEFAUT_MS,
  accent,
  background,
  variant = "overlay",
  mode = "determinate",
  onDone,
  className = "",
}: LoaderProps) {
  // En « animations réduites », la séquence est réduite à un simple fondu.
  const reduced = useMemo(() => animationsReduites(), []);
  const ease = useMemo(() => cubicBezier(...EASE_BARRE), []);
  const elapsed = useElapsed(true);
  const duree = reduced ? Math.min(durationMs, 600) : durationMs;

  const avancement = progression(elapsed, duree, reduced ? undefined : ease);
  const [sortie, setSortie] = useState(false);

  // Fin de séquence → phase de sortie (morphose du masque en cercle).
  useEffect(() => {
    if (mode !== "determinate") return;
    const t = window.setTimeout(() => setSortie(true), duree);
    return () => window.clearTimeout(t);
  }, [mode, duree]);

  // `onDone` est lu via une ref pour ne jamais relancer la séquence.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!sortie) return;
    const t = window.setTimeout(
      () => onDoneRef.current?.(),
      reduced ? 0 : DUREE_SORTIE_MS,
    );
    return () => window.clearTimeout(t);
  }, [sortie, reduced]);

  const marque = brand ? (
    <div className="flex flex-col items-center gap-1.5" style={{ color: accent }}>
      <p className="text-2xl font-semibold tracking-[-0.05em]">
        <span className="sr-only">{brand}</span>
        <span aria-hidden="true">
          {Array.from(brand).map((ch, i) => (
            <span
              key={`${i}-${ch}`}
              className="inline-block animate-letter-in motion-reduce:animate-none"
              style={{
                animationDelay: `${delaiLettre(i)}ms`,
                animationDuration: `${DUREE_LETTRE_MS}ms`,
              }}
            >
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))}
        </span>
      </p>
      {sub && <p className="text-xs opacity-60">{sub}</p>}
    </div>
  ) : null;

  const barre = (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
      {mode === "determinate" ? (
        <div
          className="h-full w-full origin-left rounded-full"
          style={{
            backgroundColor: accent ?? "currentColor",
            transform: `scaleX(${avancement})`,
          }}
        />
      ) : (
        <div
          className="h-full w-1/3 animate-bar-slide rounded-full motion-reduce:animate-none"
          style={{ backgroundColor: accent ?? "currentColor" }}
        />
      )}
    </div>
  );

  const compteur =
    mode === "determinate" ? (
      <div
        className="flex items-end justify-center gap-1"
        style={{ color: accent }}
      >
        <span className="text-[26vw] font-light leading-[0.8] tracking-[-0.06em] sm:text-[8rem]">
          {pourcentage(avancement)}
        </span>
        <span className="pb-1 text-3xl font-light leading-none sm:text-4xl">
          %
        </span>
      </div>
    ) : null;

  // La légende n'utilise PAS l'accent : contraste garanti sur les petits textes.
  const legende = label ? (
    <p role="status" className="text-center text-xs opacity-70 sm:text-sm">
      {label}
    </p>
  ) : null;

  const contenu = (
    <>
      {marque}
      {barre}
      <div className="flex flex-col items-center gap-3">
        {compteur}
        {legende}
      </div>
    </>
  );

  if (variant === "inline") {
    return (
      <div
        role="status"
        aria-busy="true"
        className={`flex w-full flex-col items-center justify-center gap-5 rounded-2xl p-6 ${
          background
            ? ""
            : "bg-white text-slate-900 shadow-xl dark:bg-slate-900 dark:text-slate-100"
        } ${className}`}
        style={{
          backgroundColor: background,
          opacity: sortie ? 0 : 1,
          transition: "opacity 300ms ease",
        }}
      >
        {contenu}
      </div>
    );
  }

  // Plein écran : le masque (120 % de large, comme le modèle) se transforme en
  // cercle à la sortie, ce qui laisse deviner l'application derrière puis la
  // révèle complètement pendant le fondu.
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={`fixed inset-0 z-50 overflow-hidden ${className}`}
    >
      <div
        className={`absolute inset-y-0 -left-[10%] flex w-[120%] flex-col ${
          background
            ? ""
            : "bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100"
        }`}
        style={{
          backgroundColor: background,
          borderRadius: sortie ? "50%" : "0%",
          opacity: sortie ? 0 : 1,
          transform: sortie ? "scale(1.06)" : "scale(1)",
          transition: TRANSITION_SORTIE,
        }}
      >
        <div className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-between gap-8 px-6 py-12">
          {contenu}
        </div>
      </div>
    </div>
  );
}
