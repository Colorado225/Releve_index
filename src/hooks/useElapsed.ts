import { useEffect, useState } from "react";

/**
 * Temps écoulé (ms) depuis l'activation, rafraîchi à chaque frame.
 * Sert à piloter la barre et le compteur du <Loader /> sans dépendance
 * d'animation : la valeur rendue est un simple `progression(elapsed, durée)`.
 */
export function useElapsed(active = true): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      setElapsed(performance.now() - start);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return elapsed;
}
