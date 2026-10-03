import { useState } from "react";
import { Navigation } from "./components/Navigation";
import { Icon } from "./components/Icon";
import { Loader } from "./components/Loader";
import { PwaUpdater } from "./components/PwaUpdater";
import { ThemeToggle } from "./components/ThemeToggle";
import { ToastProvider } from "./components/Toast";
import { useOnline } from "./hooks/useOnline";
import { useSplash } from "./hooks/useSplash";
import { useReminders } from "./hooks/useReminders";
import { HomePage } from "./pages/HomePage";
import { EntryPage } from "./pages/EntryPage";
import { HistoryPage } from "./pages/HistoryPage";
import { MetersPage } from "./pages/MetersPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SummaryPage } from "./pages/SummaryPage";
import { PdfExportPage } from "./pages/PdfExportPage";

export type View = "home" | "entry" | "history" | "meters" | "settings" | "summary" | "pdf-export";

export default function App() {
  const [view, setView] = useState<View>("home");
  const online = useOnline();
  const splash = useSplash();
  useReminders();

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100">
        <header className="sticky top-0 z-20 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-500 text-white shadow-lg shadow-teal-900/20">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <Icon name="gauge" className="h-6 w-6" />
            </span>
            <div className="leading-tight">
              <h1 className="text-lg font-bold">Relevé Index</h1>
              <p className="text-[11px] text-white/75">
                Eau &amp; électricité · hors-ligne
              </p>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {!online && (
          <div className="bg-amber-500 py-1.5 text-center text-xs font-medium text-amber-950">
            Hors-ligne — vos données restent enregistrées localement.
          </div>
        )}

        <main className="mx-auto max-w-2xl space-y-4 p-4 pb-28">
          {view === "home" && <HomePage />}
          {view === "entry" && <EntryPage />}
          {view === "history" && <HistoryPage />}
          {view === "meters" && <MetersPage />}
          {view === "settings" && <SettingsPage />}
          {view === "summary" && <SummaryPage />}
          {view === "pdf-export" && <PdfExportPage />}
        </main>

        <PwaUpdater />
        <Navigation view={view} onChange={setView} />

        {/* Splash d'amorçage : une seule fois par session (voir useSplash). */}
        {splash.visible && (
          <Loader
            variant="overlay"
            brand="Relevé Index"
            sub="Eau & électricité · hors-ligne"
            label="Chargement de vos relevés…"
            durationMs={2400}
            accent="#0f766e"
            onDone={splash.done}
          />
        )}
      </div>
    </ToastProvider>
  );
}