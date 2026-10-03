import { Card } from "../components/Card";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { useStore } from "../store";
import {
  LEAK_DEFAULTS,
  LEAK_FACTOR_RANGE,
  LEAK_WINDOW_RANGE,
  REMINDER_DAY_RANGE,
  REMINDER_HOUR_RANGE,
  LOW_CREDIT_THRESHOLD_RANGE,
  LOW_DAYS_THRESHOLD_RANGE,
  useSettings,
} from "../lib/settings";

export function SettingsPage() {
  const { showToast } = useToast();
  const {
    leakWindowMonths,
    leakFactor,
    remindersEnabled,
    reminderDayOfMonth,
    reminderHour,
    reminderFrequency,
    lowCreditThreshold,
    lowDaysThreshold,
    setLeakWindowMonths,
    setLeakFactor,
    setRemindersEnabled,
    setReminderDayOfMonth,
    setReminderHour,
    setReminderFrequency,
    setLowCreditThreshold,
    setLowDaysThreshold,
    reset,
  } = useSettings();

  const { meters, readings, importData } = useStore();

  // Exporter les données vers un fichier JSON
  const handleExport = () => {
    const data = { meters, readings, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `releve-compteur-sauvegarde-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Importer les données depuis un fichier JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.meters && data.readings) {
          importData({ meters: data.meters, readings: data.readings });
          showToast("Importation réussie ! Vos données ont été restaurées.", "success");
        } else {
          showToast("Fichier invalide : données de compteurs ou relevés manquantes.", "error");
        }
      } catch (err) {
        showToast("Erreur lors de l'importation : fichier JSON invalide.", "error");
      }
    };
    reader.readAsText(file);
    // Réinitialiser l'input pour permettre de réimporter le même fichier
    e.target.value = '';
  };

  return (
    <>
      <Card title="Détection d'anomalie" icon="alert">
        <div className="space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Fenêtre d'analyse</label>
              <span className="rounded-lg bg-teal-50 px-2 py-0.5 text-sm font-semibold text-teal-700 dark:bg-teal-500/10 dark:text-teal-400">
                {leakWindowMonths} mois
              </span>
            </div>
            <input
              type="range"
              min={LEAK_WINDOW_RANGE.min}
              max={LEAK_WINDOW_RANGE.max}
              step={1}
              value={leakWindowMonths}
              onChange={(e) => setLeakWindowMonths(Number(e.target.value))}
              className="w-full accent-teal-600"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Période de référence (relevés récents) servant à estimer la
              consommation « normale ».
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Seuil d'alerte</label>
              <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-sm font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                {leakFactor.toLocaleString("fr-FR", {
                  maximumFractionDigits: 1,
                })}
                ×
              </span>
            </div>
            <input
              type="range"
              min={LEAK_FACTOR_RANGE.min}
              max={LEAK_FACTOR_RANGE.max}
              step={0.1}
              value={leakFactor}
              onChange={(e) => setLeakFactor(Number(e.target.value))}
              className="w-full accent-teal-600"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Une alerte est levée si la consommation du dernier relevé dépasse
              ce multiple de la normale.
            </p>
          </div>
        </div>
      </Card>

      <Card title="Rappels de relevés" icon="bell">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Activer les rappels</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Recevez une notification pour ne pas oublier de saisir vos relevés.
              </p>
            </div>
            <button
              onClick={() => setRemindersEnabled(!remindersEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${remindersEnabled
                ? "bg-teal-600"
                : "bg-slate-300 dark:bg-slate-700"
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${remindersEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
              />
            </button>
          </div>

          {remindersEnabled && (
            <>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium">Fréquence des rappels</label>
                  <span className="rounded-lg bg-teal-50 px-2 py-0.5 text-sm font-semibold text-teal-700 dark:bg-teal-500/10 dark:text-teal-400">
                    {reminderFrequency === "monthly" ? "Mensuel" : "Trimestriel (tous les 3 mois)"}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setReminderFrequency("monthly")}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${reminderFrequency === "monthly"
                      ? "bg-teal-600 text-white"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                  >
                    Mensuel
                  </button>
                  <button
                    onClick={() => setReminderFrequency("quarterly")}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${reminderFrequency === "quarterly"
                      ? "bg-teal-600 text-white"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                  >
                    Trimestriel (SODECI)
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Choisis "Trimestriel" pour tes factures SODECI qui arrivent tous les 3 mois.
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium">
                    {reminderFrequency === "monthly" ? "Jour du mois" : "Jour du premier mois du trimestre"}
                  </label>
                  <span className="rounded-lg bg-teal-50 px-2 py-0.5 text-sm font-semibold text-teal-700 dark:bg-teal-500/10 dark:text-teal-400">
                    {reminderDayOfMonth}
                  </span>
                </div>
                <input
                  type="range"
                  min={REMINDER_DAY_RANGE.min}
                  max={REMINDER_DAY_RANGE.max}
                  step={1}
                  value={reminderDayOfMonth}
                  onChange={(e) => setReminderDayOfMonth(Number(e.target.value))}
                  className="w-full accent-teal-600"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  {reminderFrequency === "monthly"
                    ? "Jour du mois où vous recevrez le rappel (max 28 pour éviter les mois courts)."
                    : "Jour du premier mois du trimestre où vous recevrez le rappel pour ta facture SODECI."
                  }
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium">Heure</label>
                  <span className="rounded-lg bg-teal-50 px-2 py-0.5 text-sm font-semibold text-teal-700 dark:bg-teal-500/10 dark:text-teal-400">
                    {reminderHour.toString().padStart(2, "0")}:00
                  </span>
                </div>
                <input
                  type="range"
                  min={REMINDER_HOUR_RANGE.min}
                  max={REMINDER_HOUR_RANGE.max}
                  step={1}
                  value={reminderHour}
                  onChange={(e) => setReminderHour(Number(e.target.value))}
                  className="w-full accent-teal-600"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Heure à laquelle la notification sera envoyée.
                </p>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card title="Alertes crédit CIE" icon="alert">
        <div className="space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Seuil de crédit faible (FCFA)</label>
              <span className="rounded-lg bg-red-50 px-2 py-0.5 text-sm font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-400">
                {lowCreditThreshold.toLocaleString("fr-FR")} FCFA
              </span>
            </div>
            <input
              type="range"
              min={LOW_CREDIT_THRESHOLD_RANGE.min}
              max={LOW_CREDIT_THRESHOLD_RANGE.max}
              step={1000}
              value={lowCreditThreshold}
              onChange={(e) => setLowCreditThreshold(Number(e.target.value))}
              className="w-full accent-teal-600"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Une alerte s'affiche quand ton crédit restant tombe en dessous de ce seuil.
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Seuil de jours restants</label>
              <span className="rounded-lg bg-orange-50 px-2 py-0.5 text-sm font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
                {lowDaysThreshold} jours
              </span>
            </div>
            <input
              type="range"
              min={LOW_DAYS_THRESHOLD_RANGE.min}
              max={LOW_DAYS_THRESHOLD_RANGE.max}
              step={1}
              value={lowDaysThreshold}
              onChange={(e) => setLowDaysThreshold(Number(e.target.value))}
              className="w-full accent-teal-600"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Alerte déclenchée si l'estimation de jours restants de crédit est inférieure.
            </p>
          </div>
        </div>
      </Card>

      <Card title="Sauvegarde des données" icon="download">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/60">
            <Icon
              name="alert"
              className="mt-0.5 h-4 w-4 shrink-0 text-teal-500"
            />
            <p>
              Exportez vos données pour les sauvegarder sur votre ordinateur.
              Vous pourrez les restaurer plus tard en important le fichier sauvegardé.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
            >
              <Icon name="download" className="h-4 w-4" />
              Exporter les données
            </button>

            <label className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">
              <Icon name="upload" className="h-4 w-4" />
              Importer une sauvegarde
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </Card>

      <Card title="Réinitialisation" icon="sliders">
        <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/60">
          <Icon
            name="alert"
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
          />
          <p>
            Valeurs par défaut : fenêtre {LEAK_DEFAULTS.leakWindowMonths} mois,
            seuil {LEAK_DEFAULTS.leakFactor}×, rappel le {LEAK_DEFAULTS.reminderDayOfMonth} à {LEAK_DEFAULTS.reminderHour.toString().padStart(2, "0")}:00,
            seuil crédit {LEAK_DEFAULTS.lowCreditThreshold.toLocaleString("fr-FR")} FCFA, seuil jours {LEAK_DEFAULTS.lowDaysThreshold}j.
          </p>
        </div>
        <button
          onClick={reset}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Réinitialiser les réglages
        </button>
      </Card>
    </>
  );
}