// Préférence de thème : « auto » (suit le système), « light » ou « dark ».
// Stockée à part du store métier (c'est une préférence d'interface).
export type Theme = "auto" | "light" | "dark";

export const THEME_KEY = "releve-index-theme";

export function getTheme(): Theme {
  if (typeof localStorage === "undefined") return "auto";
  const v = localStorage.getItem(THEME_KEY);
  return v === "light" || v === "dark" ? v : "auto";
}

// Détermine si le thème sombre doit être appliqué.
export function resolveDark(theme: Theme): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Applique la classe `dark` sur <html> (Tailwind en darkMode: "class").
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolveDark(theme));
}