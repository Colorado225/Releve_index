import type { Meter, Reading, EnrichedReading } from "../types";
import { simulate, type Invoice } from "./billing";
import { anchorFor, consoParCycles, cycleForDate, regimeEffectif } from "./cycles";

export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

/**
 * Enrichit les relevés d'un compteur avec la conso, les jours et le coût.
 * - Tri par date puis par index (dates ISO => tri lexicographique fiable)
 * - Conso = différence entre deux index consécutifs (jamais stockée)
 * - Passage à zéro (rollover) : si conso < 0, ajoute 10^digits
 * - Coût = **délégué au moteur tarifaire** (`billing.ts`) : barème officiel
 *   CIE/SODECI ou tarif unitaire, selon la politique du compteur. Aucun tarif
 *   n'est codé en dur ici.
 * - Le régime CIE est résolu par cycle (règle des 3 bimestres) avant
 *   facturation : la mesure reste pure, la politique tarifaire reste isolée.
 */
export function enrichReadings(
  meter: Meter,
  allReadings: Reading[],
): EnrichedReading[] {
  const sorted = allReadings
    .filter((r) => r.meterId === meter.id)
    .sort((a, b) => a.date.localeCompare(b.date) || a.index - b.index);

  // Phase des cycles : date d'ancrage du contrat, sinon 1er relevé connu.
  const anchor = anchorFor(meter, sorted.map((r) => r.date));

  // 1) Mesure — indépendante de tout barème.
  const rows = sorted.map((r, i) => {
    const prev = i > 0 ? sorted[i - 1] : null;
    if (!prev) return { r, conso: null, days: null };
    let conso = r.index - prev.index;
    if (conso < 0) conso += Math.pow(10, meter.digits); // passage à zéro
    return { r, conso, days: daysBetween(prev.date, r.date) };
  });

  // 2) Agrégation par cycle (nécessaire : la bascule de régime s'appuie sur
  //    les cycles antérieurs, pas sur l'intervalle courant).
  const intervalles: { date: string; conso: number }[] = [];
  for (const x of rows) {
    if (x.conso !== null) intervalles.push({ date: x.r.date, conso: x.conso });
  }
  const cycles = consoParCycles(intervalles, anchor);

  // 3) Facturation — une facture par intervalle, avec le régime du cycle.
  return rows.map((x): EnrichedReading => {
    const { r, conso, days } = x;
    if (conso === null || days === null) {
      return { ...r, conso: null, days: null, cost: null, invoice: null };
    }
    const cycle = cycleForDate(r.date, anchor);
    const invoice: Invoice = simulate({
      meter,
      conso,
      days,
      date: r.date,
      regime: regimeEffectif(meter, cycles, cycle.index),
    });
    return { ...r, conso, days, cost: invoice.total, invoice };
  });
}

// ── Détection de consommation anormale (« fuite ») ──────────────────────────

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export interface LeakAlert {
  readingId: string;
  date: string;
  daily: number; // conso/jour du dernier relevé
  baseline: number; // médiane des conso/jour de référence
  ratio: number; // daily / baseline
}

// Décale une date ISO de `months` mois (négatif = dans le passé).
function shiftMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

/**
 * Détecte une consommation anormalement élevée sur le dernier relevé, en
 * comparant sa conso/jour à la médiane des conso/jour des 6 mois précédents.
 * @returns l'alerte si le ratio dépasse `factor`, sinon null.
 */
export function detectLeak(
  list: EnrichedReading[],
  { windowMonths = 6, factor = 2, minSamples = 3 } = {},
): LeakAlert | null {
  const rates = list
    .filter((r) => r.conso !== null && r.days !== null && r.days > 0)
    .map((r) => ({ id: r.id, date: r.date, rate: (r.conso as number) / (r.days as number) }));

  if (rates.length < minSamples + 1) return null;

  const current = rates[rates.length - 1];
  const cutoff = shiftMonths(current.date, windowMonths);
  const past = rates.slice(0, -1).filter((r) => r.date >= cutoff);
  if (past.length < minSamples) return null;

  const baseline = median(past.map((r) => r.rate));
  if (baseline <= 0) return null;

  const ratio = current.rate / baseline;
  if (ratio < factor) return null;

  return {
    readingId: current.id,
    date: current.date,
    daily: current.rate,
    baseline,
    ratio,
  };
}