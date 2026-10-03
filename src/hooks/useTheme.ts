import { useEffect, useState } from "react";
import { applyTheme, getTheme, THEME_KEY, type Theme } from "../lib/theme";

// Gère la préférence de thème (auto / clair / sombre) et son application.
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // En mode « auto », réagit aux changements de préférence du système.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(getTheme());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = (t: Theme) => {
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* stockage indisponible : la préférence reste en mémoire */
    }
    setThemeState(t);
  };

  return { theme, setTheme };
}