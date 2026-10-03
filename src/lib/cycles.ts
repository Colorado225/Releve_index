// ─────────────────────────────────────────────────────────────
// CYCLES DE FACTURATION & BASCULE DE RÉGIME
// Un compteur CIE est facturé tous les 2 mois. La date de facturation ne suit
// pas les relevés de l'utilisateur : elle dépend du cycle ouvert à la
// création du contrat (`Meter.anchorDate`).
// Ce module est la source de vérité du découpage temporal.
// ─────────────────────────────────────────────────────────────

import type { Meter } from "../types";
import { todayISO } from "./format";
import {
  PUISSANCE_SOCIALE_KVA,
  SEUIL_SOCIAL_BIMESTRE,
  type RegimeCIE,
} from "./tarifsCI";

/** Durée d'un cycle CIE : 2 mois calendaires (bimestre). */
export const MOIS_PAR_CYCLE = 2;
/** Bimestres consécutifs au-delà desquels le tarif social est perdu. */
export const CYCLES_BASCULE = 3;
/** Seuil de consommation d'un cycle en kWh — c'est le seuil du tarif social. */
export const SEUIL_BASCULE_KWH = SEUIL_SOCIAL_BIMESTRE;

const MOIS = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" → date locale (sans décalage UTC, contrairement à toISOString). */
const parseISO = (s: string): Date => {
  const [y, m, d] = (s ?? "").slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const toISO = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export interface Cycle {
  /** Ouverture du cycle (inclus), YYYY-MM-DD. */
  start: string;
  /** Ouverture du cycle suivant (exclu), YYYY-MM-DD. */
  end: string;
  /** Rang par rapport à l'ancrage : 0 = cycle contenant la date d'ancrage. */
  index: number;
}

/**
 * Cycle bimestriel (2 mois calendaires) contenant `dateISO`.
 * L'ancrage fixe la PHASE : ancré au 1er janvier → janv.-févr., mars-avr., …
 * Les dates antérieures à l'ancrage donnent des index négatifs.
 * Aucune valeur par défaut sur l'ancrage : l'appelant décide (transparence).
 */
export function cycleForDate(dateISO: string, anchorISO: string): Cycle {
  const d = parseISO(dateISO);
  const a = parseISO(anchorISO);
  const months =
    (d.getFullYear() - a.getFullYear()) * 12 + (d.getMonth() - a.getMonth());
  const k = Math.floor(months / MOIS_PAR_CYCLE);
  const start = new Date(a.getFullYear(), a.getMonth() + k * MOIS_PAR_CYCLE, 1);
  const end = new Date(a.getFullYear(), a.getMonth() + (k + 1) * MOIS_PAR_CYCLE, 1);
  return { start: toISO(start), end: toISO(end), index: k };
}

/** Cycle ouvert aujourd'hui. */
export function cycleCourant(anchorISO: string, today = todayISO()): Cycle {
  return cycleForDate(today, anchorISO);
}

/**
 * Date d'ancrage d'un compteur : `Meter.anchorDate` si posée, sinon le premier
 * relevé connu, sinon aujourd'hui (compteur neuf).
 */
export function anchorFor(meter: Meter, dates: string[]): string {
  return meter.anchorDate ?? dates[0] ?? todayISO();
}

/** Libellé lisible d'un cycle, ex. « mars – avr. 2025 ». */
export function formatCycle(c: Cycle): string {
  const s = parseISO(c.start);
  const end = parseISO(c.end);
  const last = new Date(end.getFullYear(), end.getMonth(), 0);
  if (s.getFullYear() === last.getFullYear()) {
    return `${MOIS[s.getMonth()]} – ${MOIS[last.getMonth()]} ${s.getFullYear()}`;
  }
  return `${MOIS[s.getMonth()]} ${s.getFullYear()} – ${MOIS[last.getMonth()]} ${last.getFullYear()}`;
}

export interface CycleConso extends Cycle {
  /** Consommation totale du cycle (somme des intervalles terminés dedans). */
  conso: number;
  /** Cycle clos : sa date de fin est passée à `today`. */
  termine: boolean;
}

/**
 * Consommation agrégée par cycle.
 * Un intervalle est rattaché au cycle de sa date de FIN : la consommation
 * n'est connue qu'à la clôture du relevé.
 * @param intervalles tous les intervalles (date de fin + conso)
 * @param anchorISO phase du découpage
 * @param today sert à marquer les cycles clos
 */
export function consoParCycles(
  intervalles: { date: string; conso: number }[],
  anchorISO: string,
  today = todayISO(),
): CycleConso[] {
  const byIndex = new Map<number, CycleConso>();
  for (const it of intervalles) {
    const c = cycleForDate(it.date, anchorISO);
    let e = byIndex.get(c.index);
    if (!e) {
      e = { ...c, conso: 0, termine: false };
      byIndex.set(c.index, e);
    }
    e.conso += it.conso;
  }
  for (const e of byIndex.values()) e.termine = e.end <= today;
  return [...byIndex.values()].sort((a, b) => a.index - b.index);
}

/**
 * Règle CIE de perte du tarif social : 3 bimestres CONSÉCUTIFS au-delà de
 * 200 kWh, jugée sur les cycles déjà facturés (jamais sur le cycle en cours).
 * Un cycle manquant (relevé absent) rend la règle non démontrable → on reste
 * sur le régime de base plutôt que d'appliquer une bascule non prouvée.
 * @param cycles cycles connus, triés par index
 * @param index index du cycle courant (n'est PAS examiné)
 */
export function basculeSociale(
  cycles: CycleConso[],
  index: number,
  seuil = SEUIL_BASCULE_KWH,
): boolean {
  const seen: number[] = [];
  for (let k = index - 1; k > index - 1 - CYCLES_BASCULE; k--) {
    const c = cycles.find((x) => x.index === k);
    if (!c) return false;
    seen.push(c.conso);
  }
  return seen.length === CYCLES_BASCULE && seen.every((x) => x > seuil);
}

/**
 * Régime CIE effectif pour un cycle.
 * - Puissance souscrite > 1,1 kVA → un régime général est imposé (jamais
 *   social) : on conserve le régime général choisi, sinon général 5A.
 * - Régime général choisi à la main → jamais rétrogradé vers le social.
 * - Régime social → bascule automatique vers le général après la règle des
 *   3 bimestres. (`meter.regime` absent = social, comportement par défaut.)
 * @returns undefined si le compteur n'est pas électrique.
 */
export function regimeEffectif(
  meter: Meter,
  cycles: CycleConso[],
  index: number,
): RegimeCIE | undefined {
  if (meter.type !== "electricite") return undefined;
  const p = meter.puissanceSouscrite;
  if (p !== undefined && p > PUISSANCE_SOCIALE_KVA) {
    const base: RegimeCIE = meter.regime ?? "general_5A";
    return base === "social_5A" ? "general_5A" : base;
  }
  const base: RegimeCIE = meter.regime ?? "social_5A";
  // Stabilisé en général : ni bascule ni rétrogradation (pas de va-et-vient).
  if (base !== "social_5A") return base;
  return basculeSociale(cycles, index) ? "general_5A" : "social_5A";
}

/** Rappel de la règle pour l'aide-contextuelle de l'UI. */
export const REGLE_BASCULE_FR =
  `Tarif social CIE perdu après ${CYCLES_BASCULE} bimestres consécutifs ` +
  `au-delà de ${SEUIL_BASCULE_KWH} kWh.`;

