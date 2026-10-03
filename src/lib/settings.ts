import { create } from "zustand";
import { persist } from "zustand/middleware";

// Réglages de l'application (préférences métier, persistées à part du store).
export interface Settings {
  /** Fenêtre d'analyse de la détection d'anomalie, en mois. */
  leakWindowMonths: number;
  /** Seuil d'alerte : multiple de la médiane. */
  leakFactor: number;
  /** Activer les rappels mensuels pour saisir un relevé */
  remindersEnabled: boolean;
  /** Jour du mois pour le rappel (1-31) */
  reminderDayOfMonth: number;
  /** Heure du rappel (0-23) */
  reminderHour: number;
  /** Date du dernier rappel envoyé */
  lastReminderSent?: string;
  /** Fréquence des rappels : "monthly" (mensuel) ou "quarterly" (trimestriel = tous les 3 mois) */
  reminderFrequency: "monthly" | "quarterly";
  /** Seuils d'alerte pour le crédit CIE */
  lowCreditThreshold: number; // Seuil de crédit bas en FCFA
  lowDaysThreshold: number; // Seuil de jours restants bas
}

interface SettingsState extends Settings {
  setLeakWindowMonths: (n: number) => void;
  setLeakFactor: (n: number) => void;
  setRemindersEnabled: (enabled: boolean) => void;
  setReminderDayOfMonth: (day: number) => void;
  setReminderHour: (hour: number) => void;
  setLastReminderSent: (date: string) => void;
  setReminderFrequency: (freq: "monthly" | "quarterly") => void;
  setLowCreditThreshold: (threshold: number) => void;
  setLowDaysThreshold: (days: number) => void;
  reset: () => void;
}

export const LEAK_DEFAULTS: Settings = {
  leakWindowMonths: 6,
  leakFactor: 2,
  remindersEnabled: false,
  reminderDayOfMonth: 1,
  reminderHour: 9,
  lastReminderSent: undefined,
  reminderFrequency: "monthly", // Par défaut : rappels mensuels
  lowCreditThreshold: 5000, // Seuil par défaut : 5000 FCFA
  lowDaysThreshold: 7, // Seuil par défaut : 7 jours restants
};

export const LEAK_WINDOW_RANGE = { min: 1, max: 24 };
export const LEAK_FACTOR_RANGE = { min: 1.2, max: 5 };
export const REMINDER_DAY_RANGE = { min: 1, max: 28 };
export const REMINDER_HOUR_RANGE = { min: 0, max: 23 };
export const LOW_CREDIT_THRESHOLD_RANGE = { min: 1000, max: 50000 };
export const LOW_DAYS_THRESHOLD_RANGE = { min: 1, max: 30 };

function clamp(n: number, r: { min: number; max: number }): number {
  if (Number.isNaN(n)) return r.min;
  return Math.min(r.max, Math.max(r.min, n));
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...LEAK_DEFAULTS,
      setLeakWindowMonths: (n) =>
        set({ leakWindowMonths: clamp(Math.round(n), LEAK_WINDOW_RANGE) }),
      setLeakFactor: (n) => set({ leakFactor: clamp(n, LEAK_FACTOR_RANGE) }),
      setRemindersEnabled: (enabled: boolean) =>
        set({ remindersEnabled: enabled }),
      setReminderDayOfMonth: (day: number) =>
        set({ reminderDayOfMonth: clamp(Math.round(day), REMINDER_DAY_RANGE) }),
      setReminderHour: (hour: number) =>
        set({ reminderHour: clamp(Math.round(hour), REMINDER_HOUR_RANGE) }),
      setLastReminderSent: (date: string) => set({ lastReminderSent: date }),
      setReminderFrequency: (freq: "monthly" | "quarterly") =>
        set({ reminderFrequency: freq }),
      setLowCreditThreshold: (n: number) =>
        set({ lowCreditThreshold: clamp(n, LOW_CREDIT_THRESHOLD_RANGE) }),
      setLowDaysThreshold: (n: number) =>
        set({
          lowDaysThreshold: clamp(Math.round(n), LOW_DAYS_THRESHOLD_RANGE),
        }),
      reset: () => set({ ...LEAK_DEFAULTS }),
    }),
    { name: "releve-index-settings" },
  ),
);
