import type { Meter } from "../types";
import { fmt, fmtFCFA, todayISO } from "./format";
import {
  BIMESTRE_JOURS,
  MOIS_JOURS,
  TARIFS_CIE,
  TRANCHES_SODECI,
  baremeEauPour,
  baremeElecPour,
  repartirTranchesEau,
  seuilKwhBimestre,
  tarifApplicable,
  type ModeFacturation,
  type RegimeCIE,
} from "./tarifsCI";

// ─────────────────────────────────────────────────────────────
// MOTEUR DE FACTURATION
// Sépare strictement la MESURE (index → conso, reste dans calc.ts) de la
// FACTURATION (conso → facture). Trois moteurs interchangeables derrière une
// même interface : c'est la stratégie tarifaire.
// ─────────────────────────────────────────────────────────────

export type TariffId = "lineaire" | "cie" | "sodeci";

/** Arrondi au centime, avec compensation des erreurs de représentation. */
export const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;

/** Une ligne de facture : montant déjà arrondi au centime. */
export interface InvoiceLine {
  label: string;
  qty?: number;
  unit?: string;
  /** Tarif unitaire (par `unit`). */
  rate?: number;
  amount: number;
}

/** Facture : la somme des lignes arrondies, jamais un arrondi d'une somme brute. */
export interface Invoice {
  engine: TariffId;
  /** Période couverte, en jours (sert au prorata des charges fixes). */
  days: number;
  lines: InvoiceLine[];
  total: number;
  /** Avertissement de repli éventuel (ex. type de compteur manquant). */
  note?: string;
  /** Version du barème officiel appliquée (barèmes CIE/SODECI uniquement). */
  tarifVersion?: string;
}

export interface BillingInput {
  meter: Meter;
  conso: number;
  days: number;
  /** Date de fin de période (YYYY-MM-DD) : sélectionne le barème de ce jour. */
  date?: string;
  /**
   * Régime CIE effectif, résolu par l'appelant à partir des cycles de
   * facturation (règle des 3 bimestres). À défaut : `meter.regime`, sinon social.
   */
  regime?: RegimeCIE;
}

export interface TariffEngine {
  id: TariffId;
  label: string;
  /** Libellé lisible du barème appliqué, pour l'UI et le PDF. */
  describe: (m: Meter) => string;
  simulate: (input: BillingInput) => Invoice;
}

const sumLines = (lines: InvoiceLine[]) =>
  lines.reduce((s, l) => s + l.amount, 0);

/** Ligne de facture formatée pour l'affichage ou l'export PDF. */
export function formatLine(l: InvoiceLine): string {
  const detail =
    l.qty !== undefined && l.unit
      ? l.rate !== undefined
        ? `${fmt(l.qty)} ${l.unit} × ${fmtFCFA(l.rate, 2)}`
        : `${fmt(l.qty)} ${l.unit}`
      : "";
  return detail
    ? `${l.label} (${detail}) : ${fmtFCFA(l.amount, 2)}`
    : `${l.label} : ${fmtFCFA(l.amount, 2)}`;
}

// ── MOTEUR « LINÉAIRE » (repli / tarif négocié) ─────────────────────────────
// Ancien schéma conservé tel quel : conso × prix unitaire + abonnement mensuel
// proratisé sur 30,44 jours. C'est le moteur par défaut des données migrées.
const lineaire: TariffEngine = {
  id: "lineaire",
  label: "Tarif unitaire",
  describe: (m) =>
    `Prix unitaire ${fmtFCFA(m.price ?? 0, 2)}/${m.unit}` +
    ((m.abon ?? 0) > 0 ? ` · abonnement ${fmtFCFA(m.abon ?? 0)}/mois` : ""),
  simulate: ({ meter, conso, days }) => {
    const price = meter.price ?? 0;
    const abon = meter.abon ?? 0;
    const energy = round2(conso * price);
    const sub = round2((abon * days) / MOIS_JOURS);
    const lines: InvoiceLine[] = [
      {
        label: "Énergie",
        qty: conso,
        unit: meter.unit,
        rate: price,
        amount: energy,
      },
      { label: "Abonnement", qty: days, unit: "j", amount: sub },
    ];
    return { engine: "lineaire", days, lines, total: round2(sumLines(lines)) };
  },
};

// ── MOTEUR « ÉLECTRICITÉ CIE » ──────────────────────────────────────────────
// Barème BIMESTRIEL et progressif. La charge fixe (prime) n'est facturée
// qu'une fois par bimestre : on ne la proratise QUE sur la durée réelle du
// relevé (days/60), jamais sur le volume projeté.
// REMARQUE (corrigé par rapport à spec) : appliquer le barème sur une conso
// projetée × 60/jours puis moyenner le montant total surestime la facture
// (fonction convexe) — d'où ce découpage volume/ratio.
const cie: TariffEngine = {
  id: "cie",
  label: "Électricité CIE",
  describe: (m) => {
    const t = TARIFS_CIE[m.regime ?? "social_5A"];
    const bits = [
      t.label,
      (m.communeAbidjan ?? true) ? "Abidjan" : "autres communes",
      (m.zoneRurale ?? true) ? "zone rurale" : "hors zone rurale",
    ];
    if (m.puissanceSouscrite) bits.push(`${fmt(m.puissanceSouscrite)} kVA`);
    bits.push(`prime ${fmtFCFA(t.primeFixeBimestre, 2)}/bimestre`);
    return bits.join(" · ");
  },
  simulate: ({ meter, conso, days, date, regime: regimeInput }) => {
    const regime: RegimeCIE = regimeInput ?? meter.regime ?? "social_5A";
    // Barème du jour de la facture (historisation des arrêtés).
    const t = baremeElecPour(date ?? todayISO())[regime];
    const abidjan = meter.communeAbidjan ?? true;
    const rurale = meter.zoneRurale ?? true;
    const seuil = seuilKwhBimestre(regime, meter.puissanceSouscrite);
    const kwh1 = Math.max(0, Math.min(conso, seuil));
    const kwh2 = Math.max(0, conso - seuil);

    const lines: InvoiceLine[] = [
      {
        label: "Prime fixe",
        qty: days,
        unit: "j",
        amount: round2((t.primeFixeBimestre * days) / BIMESTRE_JOURS),
      },
      {
        label: `Tranche 1 (≤ ${fmt(seuil, 0)} kWh/bimestre)`,
        qty: kwh1,
        unit: "kWh",
        rate: t.prixKwhTranche1,
        amount: round2(kwh1 * t.prixKwhTranche1),
      },
    ];

    if (kwh2 > 0) {
      lines.push({
        label: `Tranche 2 (> ${fmt(seuil, 0)} kWh/bimestre)`,
        qty: kwh2,
        unit: "kWh",
        rate: t.prixKwhTranche2,
        amount: round2(kwh2 * t.prixKwhTranche2),
      });
    }

    const rti = Math.min(conso * t.redevanceRtiParKwh, t.redevanceRtiPlafond);
    if (rti > 0) {
      lines.push({
        label: "Redevance RTI",
        qty: conso,
        unit: "kWh",
        rate: t.redevanceRtiParKwh,
        amount: round2(rti),
      });
    }

    if (rurale) {
      const rur = conso * t.redevanceElecRuraleKwh;
      if (rur > 0) {
        lines.push({
          label: "Redevance électrification rurale",
          qty: conso,
          unit: "kWh",
          rate: t.redevanceElecRuraleKwh,
          amount: round2(rur),
        });
      }
    }

    const ordures = abidjan ? t.taxeOrduresAbidjan : t.taxeOrduresAutres;
    const taxe = conso * ordures;
    if (taxe > 0) {
      lines.push({
        label: `Taxe ordures ménagères (${abidjan ? "Abidjan" : "autres communes"})`,
        qty: conso,
        unit: "kWh",
        rate: ordures,
        amount: round2(taxe),
      });
    }

    return { engine: "cie", days, lines, total: round2(sumLines(lines)) };
  },
};

// ── MOTEUR « EAU SODECI » ───────────────────────────────────────────────────
// Barème progressif appliqué au volume RÉEL du relevé (découpage tranche par
// tranche). La mise en service (28 443 F) est un frais unique → jamais ajouté.
const sodeci: TariffEngine = {
  id: "sodeci",
  label: "Eau SODECI",
  describe: (m) => {
    const first = TRANCHES_SODECI[0];
    const last = TRANCHES_SODECI[TRANCHES_SODECI.length - 1];
    return (
      `SODECI — tranches progressives (${fmtFCFA(first.prixM3, 2)}/m³ → ` +
      `${fmtFCFA(last.prixM3, 2)}/m³)` +
      ((m.abon ?? 0) > 0 ? ` · abonnement ${fmtFCFA(m.abon ?? 0)}/mois` : "")
    );
  },
  simulate: ({ meter, conso, days, date }) => {
    const tranches = baremeEauPour(date ?? todayISO());
    const lines: InvoiceLine[] = repartirTranchesEau(conso, tranches).map((r) => ({
      label: `Tranche ${r.label}`,
      qty: r.m3,
      unit: "m³",
      rate: r.prixM3,
      amount: round2(r.montant),
    }));

    const sub = round2(((meter.abon ?? 0) * days) / MOIS_JOURS);
    if (sub !== 0) {
      lines.push({ label: "Abonnement", qty: days, unit: "j", amount: sub });
    }
    if (lines.length === 0) {
      lines.push({
        label: "Tranche Forfaitaire",
        qty: 0,
        unit: "m³",
        rate: tranches[0].prixM3,
        amount: 0,
      });
    }
    return { engine: "sodeci", days, lines, total: round2(sumLines(lines)) };
  },
};

// ── STRATÉGIE : choix du moteur ─────────────────────────────────────────────
export const ENGINES: Record<TariffId, TariffEngine> = {
  lineaire: lineaire,
  cie,
  sodeci,
};

/**
 * Identifiant du moteur pour un compteur.
 * - `billing: "tarif-ci"` + `type` valide → barème officiel.
 * - Dans tous les autres cas (compteurs migrés, type manquant, tarif négocié)
 *   → moteur linéaire, strictement équivalent à l'ancien comportement.
 */
export function tariffId(meter: Meter): TariffId {
  const mode: ModeFacturation = meter.billing ?? "lineaire";
  if (mode === "tarif-ci") {
    if (meter.type === "electricite") return "cie";
    if (meter.type === "eau") return "sodeci";
  }
  return "lineaire";
}

export function getEngine(meter: Meter): TariffEngine {
  return ENGINES[tariffId(meter)];
}

/** Facture d'une consommation donnée sur une période de `days` jours. */
export function simulate(input: BillingInput): Invoice {
  const meter = input.meter;
  const engine = ENGINES[tariffId(meter)];
  const invoice = engine.simulate(input);
  // La version de barème n'a un sens que pour les moteurs officiels.
  const withTarif: Invoice =
    engine.id === "lineaire"
      ? invoice
      : {
          ...invoice,
          tarifVersion: tarifApplicable(input.date ?? todayISO()).version,
        };
  if (meter.billing === "tarif-ci" && tariffId(meter) === "lineaire") {
    return {
      ...withTarif,
      note: "Type de compteur manquant : calcul linéaire de repli.",
    };
  }
  return withTarif;
}

/** Libellé du barème appliqué, pour l'UI (liste des compteurs) et le PDF. */
export function describeTariff(meter: Meter): string {
  return getEngine(meter).describe(meter);
}


