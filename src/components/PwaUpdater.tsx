import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Icon } from "./Icon";

// Invite l'utilisateur à recharger quand une nouvelle version est prête.
// Le mode « prompt » évite de recharger en pleine saisie d'un relevé.
export function PwaUpdater() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  // Le message « prêt hors-ligne » se referme tout seul.
  useEffect(() => {
    if (!offlineReady) return;
    const t = setTimeout(() => setOfflineReady(false), 4000);
    return () => clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-30 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-toast-in">
      <div className="flex items-center gap-3 rounded-2xl bg-slate-900 p-3 text-white shadow-2xl dark:bg-slate-800">
        <Icon
          name={needRefresh ? "download" : "check"}
          className="h-5 w-5 shrink-0 text-emerald-400"
        />
        <p className="flex-1 text-sm">
          {needRefresh
            ? "Une nouvelle version est disponible."
            : "Application prête hors-ligne."}
        </p>
        {needRefresh && (
          <button
            onClick={() => updateServiceWorker(true)}
            className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-emerald-400"
          >
            Recharger
          </button>
        )}
        <button
          onClick={() => {
            setNeedRefresh(false);
            setOfflineReady(false);
          }}
          aria-label="Fermer"
          className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:text-white"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}