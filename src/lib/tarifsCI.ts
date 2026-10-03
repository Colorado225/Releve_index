// ─────────────────────────────────────────────────────────────
// TARIFS OFFICIELS CÔTE D'IVOIRE — CIE & SODECI
//
// CIE — VALIDÉ le 2026-10-02 contre le texte intégral de l'arrêté
//   interministériel n° 1355/MMPE/MFB du 27 décembre 2023 (publié au JODCI),
//   recoupé avec ANARE-CI (registre des arrêtés) et CIE. Aucun arrêté
//   tarifaire postérieur n'est recensé → barème encore en vigueur.
// SODECI — « Méthode de calcul d'une facture SODECI » : 4 tranches
//   9 + 9 + 72 + reste de la consommation à 250,3 / 250,3 / 403,3 / 664 F/m³,
//   recoupée avec une facture réelle 2025. Frais d'abonnement (28 443 F +
//   16 500 F) confirmés sur sodeci.ci. Le prix du m³ SODECI n'est fixé par
//   aucun arrêté JODCI (concession contractuelle) → à revalider sur facture.
//
// Barème DATÉ et versionné (TARIF_VERSION) : les tarifs évoluent par arrêté,
// et une facture ancienne doit se recalculer avec le barème EN VIGUEUR à sa
// date, jamais avec celui du jour.
//
// Module PUR : aucune importation vers ../types (évite un cycle d'imports,
// types.ts dépendant de ce fichier pour TypeCompteur / RegimeCIE).
// ─────────────────────────────────────────────────────────────

export type TypeCompteur = "eau" | "electricite";
export type RegimeCIE =
  | "social_5A"
  | "general_5A"
  | "general_15A"
  | "general_20A";

/**
 * Politique de calcul d'un compteur.
 * - "lineaire" : conso × prix unitaire + abonnement proratisé (repli, ancien
 *   schéma, ou compteur à tarif négocié hors barème public).
 * - "tarif-ci" : barème officiel CIE / SODECI selon `Meter.type`.
 * Champ explicite (décision d'archi) : une migration doit VIDER la mue,
 * jamais réécrire silencieusement le coût des relevés historiques.
 */
export type ModeFacturation = "lineaire" | "tarif-ci";

export const TARIF_VERSION = "2024.1";
export const TARIF_SOURCES =
  "Arrêté interministériel n° 1355/MMPE/MFB du 27/12/2023 (JODCI) · ANARE-CI · CIE";

/**
 * Date d'entrée en vigueur du barème courant — **validée le 2026-10-02**
 * contre le texte de l'arrêté 1355 :
 * - art. 31 : « le présent arrêté prend effet à compter du 1ᵉʳ janvier 2024
 *   et s'applique aux consommations d'électricité enregistrées à partir de
 *   cette date » ;
 * - art. 32 : abroge l'arrêté n° 0644/MMPE/MEF/MBPE du 07 juin 2023 ;
 * - art. 30 : les tarifs peuvent être révisés chaque année → revalider à
 *   chaque nouvel arrêté publié au JODCI (registre ANARE : aucun postérieur
 *   au 27/12/2023 au 02/10/2026) et renseigner `until` sur le barème sortant.
 */
export const TARIF_EFFECTIVE_FROM = "2024-01-01";

export interface TarifBar {
  version: string;
  effectiveFrom: string; // YYYY-MM-DD (inclus)
  until: string | null; // YYYY-MM-DD (exclu) ; null = barème en cours
  sources: string;
}

/**
 * Historique des barèmes. Une facture ancienne se recalcule avec le barème en
 * vigueur À SA DATE, jamais avec celui du jour.
 */
export const TARIFS_HISTORIQUE: TarifBar[] = [
  {
    version: TARIF_VERSION,
    effectiveFrom: TARIF_EFFECTIVE_FROM,
    until: null,
    sources: TARIF_SOURCES,
  },
];

/** Barème applicable à une date. Repli : le plus ancien barème connu. */
export function tarifApplicable(dateISO: string): TarifBar {
  const d = (dateISO ?? "").slice(0, 10);
  const known = [...TARIFS_HISTORIQUE].sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom),
  );
  let chosen = known[0];
  for (const bar of known) {
    if (bar.effectiveFrom <= d && (!bar.until || d < bar.until)) chosen = bar;
  }
  return chosen;
}

/** Durée d'un bimestre de facturation CIE (jours). */
export const BIMESTRE_JOURS = 60;
/** Constante de proratisation d'un abonnement mensuel (jours). */
export const MOIS_JOURS = 30.44;
/** Seuil du tarif social CIE, en kWh/bimestre. */
export const SEUIL_SOCIAL_BIMESTRE = 200;
/** Puissance souscrite (kVA) requise par le tarif social 5A. */
export const PUISSANCE_SOCIALE_KVA = 1.1;

// ── ÉLECTRICITÉ (CIE) ───────────────────────────────────────────────────────
export interface TarifElec {
  label: string;
  primeFixeBimestre: number; // FCFA TTC / bimestre
  prixKwhTranche1: number; // FCFA TTC / kWh
  /** Seuil de la tranche 1 en kWh/bimestre (repli si puissance inconnue). */
  seuilTranche1: number;
  /**
   * Si défini, le seuil vaut `facteur × puissanceSouscrite (kVA)`
   * (règle CIE « 180 × P souscrite » pour les régimes généraux).
   */
  seuilParPuissance?: number;
  prixKwhTranche2: number;
  redevanceRtiParKwh: number; // FCFA / kWh
  redevanceRtiPlafond: number; // FCFA / bimestre
  redevanceElecRuraleKwh: number; // FCFA / kWh (zone rurale)
  taxeOrduresAbidjan: number; // FCFA / kWh
  taxeOrduresAutres: number; // FCFA / kWh
}

export const TARIFS_CIE: Record<RegimeCIE, TarifElec> = {
  social_5A: {
    label: "Tarif Domestique Social 5A (post-paiement)",
    primeFixeBimestre: 614.9,
    prixKwhTranche1: 31.72,
    seuilTranche1: 80, // fixe, indépendant de la puissance
    prixKwhTranche2: 65.11,
    redevanceRtiParKwh: 2.0,
    redevanceRtiPlafond: 2000,
    redevanceElecRuraleKwh: 1.0,
    taxeOrduresAbidjan: 2.5,
    taxeOrduresAutres: 1.0,
  },
  general_5A: {
    label: "Tarif Domestique Général 5A",
    primeFixeBimestre: 1618.04,
    prixKwhTranche1: 86.92,
    seuilTranche1: 198, // 180 × 1,1 kVA (valeur figée : évite 198,00000000000003)
    seuilParPuissance: 180,
    prixKwhTranche2: 75.34,
    redevanceRtiParKwh: 2.0,
    redevanceRtiPlafond: 2000,
    redevanceElecRuraleKwh: 1.06,
    taxeOrduresAbidjan: 2.5,
    taxeOrduresAutres: 1.0,
  },
  general_15A: {
    label: "Tarif Domestique Général 15A",
    // Arrêté 1355, article 5 (15A et plus, post-paiement) : TTC auto-cohérent
    // (HT × 1,18). CORRIGÉ le 2026-10-02 — les anciennes valeurs
    // (2 216,09 / 123,23 / 104,79) venaient de regime.md sans source.
    primeFixeBimestre: 1779.84,
    prixKwhTranche1: 95.62,
    seuilTranche1: 594, // 180 × 3,3 kVA (valeur figée : évite 594,0000000000001)
    seuilParPuissance: 180,
    prixKwhTranche2: 82.86,
    redevanceRtiParKwh: 2.0,
    redevanceRtiPlafond: 2000,
    redevanceElecRuraleKwh: 1.06,
    taxeOrduresAbidjan: 2.5,
    taxeOrduresAutres: 1.0,
  },
  general_20A: {
    label: "Tarif Domestique Général 20A",
    primeFixeBimestre: 1941.64, // Prime fixe supérieure pour 20A (selon CIE)
    prixKwhTranche1: 98.24,
    seuilTranche1: 792, // 180 × 4,4 kVA (valeur figée : évite 792,0000000000001)
    seuilParPuissance: 180,
    prixKwhTranche2: 85.48,
    redevanceRtiParKwh: 2.0,
    redevanceRtiPlafond: 2000,
    redevanceElecRuraleKwh: 1.06,
    taxeOrduresAbidjan: 2.5,
    taxeOrduresAutres: 1.0,
  },
};

/**
 * Seuil réel de la tranche 1, en kWh/bimestre.
 * Les régimes généraux suivent la règle CIE « 180 × P souscrite » ; le régime
 * social a un seuil fixe de 80 kWh/bimestre.
 */
export function seuilKwhBimestre(
  regime: RegimeCIE,
  puissanceSouscrite?: number,
): number {
  const t = TARIFS_CIE[regime];
  if (
    t.seuilParPuissance &&
    puissanceSouscrite !== undefined &&
    puissanceSouscrite > 0
  ) {
    // Arrondi au centième : 180 × 1,1 vaut 198,00000000000003 en flottants.
    return Math.round(t.seuilParPuissance * puissanceSouscrite * 100) / 100;
  }
  return t.seuilTranche1;
}

// ── EAU (SODECI) ────────────────────────────────────────────────────────────
export interface TrancheEauDef {
  label: string;
  min: number; // m³ inclus
  max: number; // m³ exclu (Infinity pour la dernière)
  prixM3: number; // FCFA TTC / m³ (part SODECI + FDE + FNE + taxes)
}

/**
 * Barème SODECI — méthode officielle de calcul d'une facture (4 tranches) :
 *   forfait 9 m³ + social 9 m³ + domestique 72 m³ + **reste** au tarif normal.
 * Prix TTC par m³ (part SODECI + FDE + FNE + taxes), CORRIGÉ le 2026-10-02 :
 * les valeurs Domestique/Normal de regime.md (« ~427 » / « ~750 ») n'étaient
 * pas traçables ; la méthode SODECI dit 403,3 / 664, cohérente avec une
 * facture réelle (mars-mai 2025). Pas de tranche « industriel » dans la
 * méthode : au-delà de 90 m³, tout le volume est facturé au tarif normal.
 * Le prix du m³ SODECI n'est fixé par aucun arrêté JODCI (concession
 * contractuelle) → revalider sur la prochaine facture disponible.
 */
export const TRANCHES_SODECI: TrancheEauDef[] = [
  { label: "Forfaitaire", min: 0, max: 9, prixM3: 250.3 },
  { label: "Social", min: 9, max: 18, prixM3: 250.3 },
  { label: "Domestique", min: 18, max: 90, prixM3: 403.3 },
  { label: "Normal", min: 90, max: Infinity, prixM3: 664.0 },
];

/**
 * Frais SODECI de mise en service (compteur Ø15 mm) : paiement unique,
 * À NE PAS ajouter automatiquement à la facture périodique.
 */
export const ABONNEMENT_SODECI = {
  compteur15mm: 28443, // FCFA TTC
  avanceConso: 16500, // FCFA TTC remboursable
};

export interface RepartitionTranche {
  label: string;
  min: number;
  max: number;
  m3: number;
  prixM3: number;
  montant: number;
}

/**
 * Répartition d'un volume en m³ sur les tranches SODECI (barème progressif).
 * Le volume est découpé tranche par tranche : on ne paie le prix fort que sur
 * la fraction qui dépasse le seuil, jamais sur l'intégralité.
 * @param tranches barème à appliquer — permet une facture ancienne de se
 *   recalculer avec le barème de son jour (voir `baremeEauPour`).
 */
export function repartirTranchesEau(
  consoM3: number,
  tranches: TrancheEauDef[] = TRANCHES_SODECI,
): RepartitionTranche[] {
  const out: RepartitionTranche[] = [];
  let reste = Number.isFinite(consoM3) ? Math.max(0, consoM3) : 0;

  for (const tr of tranches) {
    if (reste <= 0) break;
    const pris = Math.min(reste, tr.max - tr.min);
    if (pris > 0) {
      out.push({
        label: tr.label,
        min: tr.min,
        max: tr.max,
        m3: pris,
        prixM3: tr.prixM3,
        montant: pris * tr.prixM3,
      });
      reste -= pris;
    }
  }
  return out;
}

// ── DÉTECTION DE RÉGIME ─────────────────────────────────────────────────────

/**
 * Régime CIE à partir d'une consommation moyenne par bimestre.
 *
 * Note métier : le tarif social est perdu au-delà de 200 kWh/bimestre sur
 * **3 bimestres consécutifs** (et la bascule est réversible). La règle
 * glissante exige les cycles de facturation (P1) ; ici la moyenne est fournie
 * par l'appelant.
 * La puissance souscrite prime : au-delà de 1,1 kVA, le régime social n'est
 * pas éligible quel que soit le volume.
 */
export function detecterRegimeCIE(
  consoMoyenneBimestre: number,
  puissanceSouscrite?: number,
): RegimeCIE {
  if (
    puissanceSouscrite !== undefined &&
    puissanceSouscrite > PUISSANCE_SOCIALE_KVA
  ) {
    return "general_5A";
  }
  return consoMoyenneBimestre <= SEUIL_SOCIAL_BIMESTRE
    ? "social_5A"
    : "general_5A";
}

/** Infère le type de compteur à partir de l'unité saisie (migrations). */
export function inferTypeCompteur(unit: string): TypeCompteur | undefined {
  const u = (unit ?? "").trim().toLowerCase().replace("³", "3");
  if (u === "m3" || u.startsWith("m3") || u === "l" || u.startsWith("litre"))
    return "eau";
  if (u === "kwh" || u.startsWith("kwh")) return "electricite";
  return undefined;
}

// ── BARÈMES PAR DATE ─────────────────────────────────────────────────────────
/**
 * Registre des barèmes par version. `tarifApplicable(date)` donne la version,
 * la map donne le tableau de tarifs correspondant.
 * Une seule version est publiée pour l'instant ; l'insertion d'un nouveau
 * barème = ajouter une entrée ici + une entrée dans `TARIFS_HISTORIQUE`.
 */
const BAREMES_ELEC: Record<string, Record<RegimeCIE, TarifElec>> = {
  [TARIF_VERSION]: TARIFS_CIE,
};
const BAREMES_EAU: Record<string, TrancheEauDef[]> = {
  [TARIF_VERSION]: TRANCHES_SODECI,
};

/**
 * Barème électricité en vigueur à une date.
 * Repli : le barème courant (jamais un plantage sur une date inconnue).
 */
export function baremeElecPour(dateISO: string): Record<RegimeCIE, TarifElec> {
  return BAREMES_ELEC[tarifApplicable(dateISO).version] ?? TARIFS_CIE;
}

/** Barème eau en vigueur à une date. Repli : le barème courant. */
export function baremeEauPour(dateISO: string): TrancheEauDef[] {
  return BAREMES_EAU[tarifApplicable(dateISO).version] ?? TRANCHES_SODECI;
}
