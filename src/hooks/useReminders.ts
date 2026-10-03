import { useEffect } from "react";
import { useSettings } from "../lib/settings";
import { useStore } from "../store";
import { todayISO } from "../lib/format";

/**
 * Hook qui gère les rappels de saisie de relevés:
 * - Demande la permission pour les notifications du navigateur
 * - Vérifie chaque jour si un rappel doit être envoyé
 * - Évite les doublons si un relevé a déjà été saisi ce mois-ci
 */
export function useReminders() {
  const {
    remindersEnabled,
    reminderDayOfMonth,
    reminderHour,
    reminderFrequency,
    lastReminderSent,
    setLastReminderSent,
  } = useSettings();
  const { readings } = useStore();

  // Demander la permission des notifications si les rappels sont activés
  useEffect(() => {
    if (remindersEnabled && "Notification" in window) {
      Notification.requestPermission();
    }
  }, [remindersEnabled]);

  // Vérifier si on doit envoyer un rappel aujourd'hui
  useEffect(() => {
    if (!remindersEnabled) return;
    if (!("Notification" in window) || Notification.permission !== "granted")
      return;

    const today = new Date();
    const currentDateISO = todayISO();
    const currentMonth = currentDateISO.slice(0, 7); // "2026-10"

    // Calculer le trimestre actuel pour les rappels trimestriels (ex: "2026-Q3")
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-11
    const quarter = Math.floor(month / 3) + 1; // 1-4
    const currentQuarter = `${year}-Q${quarter}`;

    // Vérifier si on a déjà envoyé un rappel pour la période actuelle
    const alreadySentThisPeriod =
      (reminderFrequency === "monthly" &&
        lastReminderSent?.slice(0, 7) === currentMonth) ||
      (reminderFrequency === "quarterly" &&
        lastReminderSent?.includes(currentQuarter));

    if (alreadySentThisPeriod) {
      return;
    }

    // Vérifier si c'est le jour et l'heure configurés pour le rappel
    if (
      today.getDate() === reminderDayOfMonth &&
      today.getHours() >= reminderHour
    ) {
      // Vérifier si un relevé a déjà été saisi dans la période actuelle
      const lastReading = readings[readings.length - 1];
      const readingHasSamePeriod =
        (reminderFrequency === "monthly" &&
          lastReading?.date.slice(0, 7) === currentMonth) ||
        (reminderFrequency === "quarterly" &&
          lastReading?.date.includes(currentQuarter));

      if (lastReading && readingHasSamePeriod) {
        // Déjà un relevé dans la période, pas de rappel nécessaire
        setLastReminderSent(currentDateISO);
        return;
      }

      // Envoyer la notification adaptée à la fréquence
      const notificationTitle = "Relevé Index - Pensez à saisir votre relevé !";
      const notificationBody =
        reminderFrequency === "monthly"
          ? "C'est le moment d'enregistrer vos nouveaux index de compteurs d'eau et d'électricité."
          : "C'est le moment d'enregistrer votre relevé trimestriel pour la facture SODECI !";

      new Notification(notificationTitle, {
        body: notificationBody,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
      });

      setLastReminderSent(currentDateISO);
    }
  }, [
    remindersEnabled,
    reminderDayOfMonth,
    reminderHour,
    lastReminderSent,
    readings,
    setLastReminderSent,
  ]);
}
