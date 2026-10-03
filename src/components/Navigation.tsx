import type { View } from "../App";
import { Icon, type IconName } from "./Icon";

const items: { id: View; label: string; icon: IconName }[] = [
  { id: "home", label: "Accueil", icon: "home" },
  { id: "entry", label: "Saisie", icon: "pencil" },
  { id: "history", label: "Historique", icon: "chart" },
  { id: "summary", label: "Récap", icon: "layers" },
  { id: "meters", label: "Compteurs", icon: "gauge" },
  { id: "pdf-export", label: "Export PDF", icon: "file-text" },
  { id: "settings", label: "Réglages", icon: "sliders" },
];

export function Navigation({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto grid max-w-2xl grid-cols-6">
        {items.map((it) => {
          const active = view === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-w-0 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition ${active
                ? "text-teal-700 dark:text-teal-400"
                : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                }`}
            >
              <span
                className={`absolute top-0 h-0.5 w-8 rounded-full bg-teal-600 transition-opacity ${active ? "opacity-100" : "opacity-0"
                  }`}
              />
              <Icon name={it.icon} className="h-5 w-5" />
              <span className="truncate w-full text-center">{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}