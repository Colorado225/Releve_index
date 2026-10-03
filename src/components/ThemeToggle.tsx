import { Icon, type IconName } from "./Icon";
import { useTheme } from "../hooks/useTheme";
import type { Theme } from "../lib/theme";

const ORDER: Theme[] = ["auto", "light", "dark"];
const ICON: Record<Theme, IconName> = {
  auto: "contrast",
  light: "sun",
  dark: "moon",
};
const LABEL: Record<Theme, string> = {
  auto: "Thème : automatique",
  light: "Thème : clair",
  dark: "Thème : sombre",
};

// Bouton cyclique : auto → clair → sombre → auto.
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={LABEL[theme]}
      title={LABEL[theme]}
      className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 transition hover:bg-white/25 active:scale-95"
    >
      <Icon name={ICON[theme]} className="h-5 w-5" />
    </button>
  );
}