import type { Invoice } from "./lib/billing";
import type { ModeFacturation, RegimeCIE, TypeCompteur } from "./lib/tarifsCI";

export interface Meter {
  id: string;
  name: string;
  unit: string;
  digits: number; // nb de chiffres du compteur (rollover)

  // ── Politique de facturation (v4) ──────────────────────────────────────
  /** Absent = "lineaire" (données migrées, tarif négocié, repli sûr). */
  billing?: ModeFacturation;
  /** Type de compteur ; requis quand `billing === "tarif-ci"`. */
  type?: TypeCompteur;

  // ── Moteur « linéaire » ────────────────────────────────────────────────
  price?: number; // FCFA / unité
  abon?: number; // FCFA / mois

  // ── Moteur « tarif-ci » (barème CIE / SODECI) ──────────────────────────
  regime?: RegimeCIE; // electricité uniquement
  puissanceSouscrite?: number; // kVA (règle CIE « 180 × P »)
  communeAbidjan?: boolean; // taxe ordures 2,50 vs 1,00 F/kWh
  zoneRurale?: boolean; // redevance électrification rurale
  /** Date d'ancrage des cycles bimestriels (v4 — cycles de facturation). */
  anchorDate?: string; // YYYY-MM-DD
}

export interface Reading {
  id: string;
  meterId: string;
  date: string; // YYYY-MM-DD
  index: number;
  note?: string;
  photos?: string[]; // identifiants des photos stockées dans IndexedDB
  rechargeAmount?: number; // Montant/unité rechargé (pour compteurs CIE à carte)
}

export interface EnrichedReading extends Reading {
  conso: number | null;
  days: number | null;
  cost: number | null; // FCFA
  /** Facture détaillée de la période (lignes arrondies au centime). */
  invoice?: Invoice | null;
}
