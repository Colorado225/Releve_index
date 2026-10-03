import { fmt, fmtFCFA } from "./format";
import type { PdfDocument, PdfText } from "./pdf";

// Relevé brut saisi dans le formulaire d'export.
export type RawReading = {
  date_releve: string;
  index_valeur: number;
};

export type ExportFormData = {
  societeNom: string;
  societeAdresse: string;
  societeEmail: string;
  societeTelephone: string;
  abonneNom: string;
  abonneAdresse: string;
  abonneEmail: string;
  compteurType: "electricite" | "eau";
  compteurNumero: string;
  compteurPrixUnitaire: number;
  compteurAbonnementJour: number;
  periodeDebut: string;
  periodeFin: string;
};

// Ligne de détail d'un relevé, avec les montants dérivés.
export type ExportRow = {
  date: string;
  index: number;
  consommation: number;
  jours: number;
  energie: number;
  abonnement: number;
  total: number;
};

/**
 * Calcule consommation, jours écoulés et coût de chaque relevé.
 * Le premier relevé sert d'ancrage : consommation nulle, faute de relevé
 * précédent pour établir une différence.
 */
export function computeExportRows(
  releves: RawReading[],
  prixUnitaire: number,
  prixAbonnementJour: number,
): ExportRow[] {
  const sorted = [...releves].sort(
    (a, b) =>
      new Date(a.date_releve).getTime() - new Date(b.date_releve).getTime(),
  );

  return sorted.map((r, i) => {
    let consommation = 0;
    let jours = 0;

    if (i > 0) {
      const prev = sorted[i - 1];
      consommation = Math.max(r.index_valeur - prev.index_valeur, 0);
      jours = Math.max(
        Math.floor(
          (new Date(r.date_releve).getTime() -
            new Date(prev.date_releve).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
        0,
      );
    }

    const energie = Math.round(consommation * prixUnitaire);
    const abonnement = Math.round(jours * prixAbonnementJour);
    return {
      date: r.date_releve,
      index: r.index_valeur,
      consommation,
      jours,
      energie,
      abonnement,
      total: energie + abonnement,
    };
  });
}

/**
 * Construit le document PDF « Historique des relevés » à partir du formulaire
 * d'export. Reprend la mise en page du template historique (en-tête
 * société/document, période, informations, synthèse, tableau des relevés)
 * mais en texte paginé, sans dépendance externe ni appel réseau.
 */
export function buildExportReport(
  form: ExportFormData,
  rows: ExportRow[],
  numeroDoc: string,
): PdfDocument {
  const lines: PdfText[] = [];
  const unite = form.compteurType === "eau" ? "m³" : "kWh";
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const totalConso = rows.reduce((s, r) => s + r.consommation, 0);
  const totalJours = rows.reduce((s, r) => s + r.jours, 0);
  const totalEnergie = rows.reduce((s, r) => s + r.energie, 0);
  const totalAbonnement = rows.reduce((s, r) => s + r.abonnement, 0);
  const grandTotal = totalEnergie + totalAbonnement;

  const d = (iso: string) =>
    iso
      ? new Date(iso).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "—";

  lines.push({ text: `N° ${numeroDoc}`, size: 9, gapBefore: 24 });
  lines.push({ text: `Document généré le ${today}`, size: 9 });

  // ── Société / abonné ──────────────────────────────────────────────────
  lines.push({ text: "SOCIÉTÉ", size: 10, bold: true, gapBefore: 20 });
  if (form.societeNom) lines.push({ text: `Nom : ${form.societeNom}`, size: 10 });
  if (form.societeAdresse)
    lines.push({ text: `Adresse : ${form.societeAdresse}`, size: 10 });
  if (form.societeTelephone)
    lines.push({ text: `Téléphone : ${form.societeTelephone}`, size: 10 });
  if (form.societeEmail)
    lines.push({ text: `Email : ${form.societeEmail}`, size: 10 });

  lines.push({ text: "ABONNÉ", size: 10, bold: true, gapBefore: 14 });
  lines.push({ text: `Nom : ${form.abonneNom}`, size: 10 });
  if (form.abonneAdresse)
    lines.push({ text: `Adresse : ${form.abonneAdresse}`, size: 10 });
  if (form.abonneEmail)
    lines.push({ text: `Email : ${form.abonneEmail}`, size: 10 });

  // ── Compteur & période ────────────────────────────────────────────────
  lines.push({ text: "COMPTEUR", size: 10, bold: true, gapBefore: 14 });
  lines.push({ text: `Numéro : ${form.compteurNumero || "—"}`, size: 10 });
  lines.push({
    text: `Type : ${form.compteurType === "eau" ? "Eau" : "Électricité"}`,
    size: 10,
  });
  lines.push({ text: `Unité : ${unite}`, size: 10 });
  lines.push({
    text: `Période : du ${d(form.periodeDebut)} au ${d(form.periodeFin)}`,
    size: 10,
  });
  lines.push({
    text: `Prix unitaire : ${fmtFCFA(form.compteurPrixUnitaire, 2)}/${unite}`,
    size: 10,
  });
  lines.push({
    text: `Abonnement : ${fmtFCFA(form.compteurAbonnementJour, 2)}/jour`,
    size: 10,
  });

  // ── Synthèse ──────────────────────────────────────────────────────────
  lines.push({ text: "SYNTHÈSE", size: 10, bold: true, gapBefore: 18 });
  lines.push({
    text: `Consommation totale : ${fmt(totalConso)} ${unite}`,
    size: 12,
    bold: true,
  });
  lines.push({ text: `Durée cumulée : ${totalJours} jours`, size: 10 });
  lines.push({
    text: `Coût de l'énergie : ${fmtFCFA(totalEnergie)}`,
    size: 11,
    bold: true,
  });
  lines.push({
    text: `Coût de l'abonnement : ${fmtFCFA(totalAbonnement)}`,
    size: 11,
    bold: true,
  });
  lines.push({
    text: `Total à payer : ${fmtFCFA(grandTotal)}`,
    size: 14,
    bold: true,
    gapBefore: 4,
  });

  // ── Détail des relevés ────────────────────────────────────────────────
  lines.push({
    text: "DÉTAIL DES RELEVÉS",
    size: 10,
    bold: true,
    gapBefore: 18,
  });
  lines.push({ text: "Consommation totale et coûts, par relevé", size: 9 });
  lines.push({ text: "", size: 6, gapBefore: 4 });

  // Format compact sans suffixe "FCFA" pour garder des colonnes régulières
  // (l'unité est précisée dans l'en-tête de colonne).
  const num = (n: number) => fmtFCFA(n, 2).replace(" FCFA", "");
  const col = (s: string, w: number) => s.padEnd(w);

  lines.push({
    text: col("Date", 12) + col(`Index (${unite})`, 14) + "Conso.     Jours      Énergie      Abonn.       Total",
    size: 8,
    bold: true,
  });
  for (const r of rows) {
    lines.push({
      text:
        col(r.date, 12) +
        col(num(r.index), 14) +
        col(num(r.consommation), 12) +
        col(String(r.jours), 8) +
        col(num(r.energie), 13) +
        col(num(r.abonnement), 13) +
        num(r.total),
      size: 8,
    });
  }
  lines.push({
    text: col("TOTAL", 12) + `${num(totalConso)} ${unite}`,
    size: 9,
    bold: true,
    gapBefore: 6,
  });
  lines.push({
    text: `Coût total (énergie + abonnement) : ${fmtFCFA(grandTotal)}`,
    size: 12,
    bold: true,
    gapBefore: 6,
  });

  return {
    title: "Historique des relevés",
    subtitle: form.societeNom || "Relevé Index",
    lines,
  };
}