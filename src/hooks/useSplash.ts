import { useCallback, useState } from "react";
import { animationsReduites } from "../lib/loaderMotion";

// Clé de session : le splash ne joue qu'au premier rendu de l'onglet.
const SPLASH_KEY = "releve-index-splash";

/**
 * Splash d'amorçage de l'application.
 *
 * - affiché une seule fois par session (jamais après un simple rafraîchissement) ;
 * - ignoré si l'utilisateur demande des animations réduites ;
 * - `done()` doit être branché sur `onDone` du <Loader />.
 */
export function useSplash(): { visible: boolean; done: () => void } {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    if (animationsReduites()) return false;
    try {
      return sessionStorage.getItem(SPLASH_KEY) !== "1";
    } catch {
      return true; // stockage indisponible : on montre une fois par onglet
    }
  });

  const done = useCallback(() => {
    try {
      sessionStorage.setItem(SPLASH_KEY, "1");
    } catch {
      /* stockage indisponible : le splash repartira au prochain rendu */
    }
    setVisible(false);
  }, []);

  return { visible, done };
}
