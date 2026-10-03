import type { Meter, Reading } from "../types";
import { enrichReadings } from "./calc";
import { describeTariff, formatLine } from "./billing";
import { fmt, fmtFCFA } from "./format";
import type { PdfDocument, PdfText } from "./pdf";

// Construit le récapitulatif PDF de TOUS les compteurs.
export function buildSummaryReport(
  meters: Meter[],
  readings: Reading[],
): PdfDocument {
  const lines: PdfText[] = [];
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  lines.push({ text: `Document généré le ${today}`, size: 10, gapBefore: 24 });

  if (meters.length === 0) {
    lines.push({ text: "Aucun compteur enregistré.", size: 11, gapBefore: 10 });
  }

  for (const m of meters) {
    const list = enrichReadings(m, readings);
    const withConso = list.filter((r) => r.conso !== null);
    const totalConso = withConso.reduce((s, r) => s + (r.conso ?? 0), 0);
    const totalDays = withConso.reduce((s, r) => s + (r.days ?? 0), 0);
    const daily = totalDays > 0 ? totalConso / totalDays : 0;
    // Coût = somme des factures par période (moteur tarifaire), pas une
    // formule codée en dur — cohérent avec l'écran Historique.
    const cost = withConso.reduce((s, r) => s + (r.cost ?? 0), 0);
    const last = list.length > 0 ? list[list.length - 1] : null;

    lines.push({
      text: `${m.name} (${m.unit})`,
      size: 13,
      bold: true,
      gapBefore: 22,
    });
    lines.push({
      text: `Barème : ${describeTariff(m)}`,
      size: 10,
    });
    lines.push({ text: `Nombre de relevés : ${list.length}`, size: 10 });

    if (list.length >= 2 && last) {
      const first = list[0];
      lines.push({
        text: `Période : du ${first.date} au ${last.date} (${totalDays} jours)`,
        size: 10,
      });
      lines.push({
        text: `Consommation totale : ${fmt(totalConso)} ${m.unit}`,
        size: 11,
        bold: true,
        gapBefore: 8,
      });
      lines.push({ text: `Moyenne : ${fmt(daily)} ${m.unit}/jour`, size: 10 });
      lines.push({
        text: `Coût estimé : ${fmtFCFA(Math.round(cost))}`,
        size: 11,
        bold: true,
      });
      if (last.conso !== null) {
        lines.push({
          text: `Dernier relevé : ${last.date} — index ${fmt(last.index)} (+${fmt(last.conso)} ${m.unit} sur ${last.days} j)`,
          size: 10,
        });
      }
      lines.push({ text: "Derniers relevés :", size: 10, gapBefore: 10 });
      const recent = [...list].slice(-5).reverse();
      for (const r of recent) {
        const c = r.conso === null ? "—" : `+${fmt(r.conso)} ${m.unit}`;
        const k = r.cost === null ? "" : `      ${fmtFCFA(r.cost, 0)}`;
        lines.push({
          text: `      ${r.date}      index ${fmt(r.index)}      ${c}${k}`,
          size: 9,
        });
      }

      // Détail du dernier cycle facturé (lignes du moteur tarifaire).
      if (last.invoice && last.invoice.lines.length > 0) {
        lines.push({
          text: "Détail de la dernière période facturée :",
          size: 10,
          gapBefore: 10,
        });
        for (const l of last.invoice.lines) {
          lines.push({ text: `      ${formatLine(l)}`, size: 9 });
        }
        lines.push({
          text: `      Total : ${fmtFCFA(last.invoice.total, 2)}`,
          size: 9,
          bold: true,
        });
        if (last.invoice.note) {
          lines.push({ text: `      ${last.invoice.note}`, size: 9 });
        }
        if (last.invoice.tarifVersion) {
          lines.push({
            text: `Barème officiel appliqué : version ${last.invoice.tarifVersion}`,
            size: 9,
          });
        }
      }
    } else {
      lines.push({
        text: "Pas encore assez de relevés pour un calcul de consommation.",
        size: 10,
        gapBefore: 6,
      });
    }
  }

  return {
    title: "Relevé Index — Récapitulatif",
    subtitle: "Suivi des compteurs d'eau et d'électricité",
    lines,
  };
}

// Construit le récapitulatif PDF d'UN SEUL compteur.
export function buildSingleMeterReport(
  meter: Meter,
  readings: Reading[],
): PdfDocument {
  const lines: PdfText[] = [];
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  lines.push({ text: `Document généré le ${today}`, size: 10, gapBefore: 24 });

  const list = enrichReadings(meter, readings);
  const withConso = list.filter((r) => r.conso !== null);
  const totalConso = withConso.reduce((s, r) => s + (r.conso ?? 0), 0);
  const totalDays = withConso.reduce((s, r) => s + (r.days ?? 0), 0);
  const daily = totalDays > 0 ? totalConso / totalDays : 0;
  const cost = withConso.reduce((s, r) => s + (r.cost ?? 0), 0);
  const last = list.length > 0 ? list[list.length - 1] : null;

  lines.push({
    text: `${meter.name} (${meter.unit})`,
    size: 16,
    bold: true,
    gapBefore: 22,
  });
  lines.push({
    text: `Barème : ${describeTariff(meter)}`,
    size: 10,
  });
  lines.push({ text: `Nombre de relevés : ${list.length}`, size: 10 });

  if (list.length >= 2 && last) {
    const first = list[0];
    lines.push({
      text: `Période : du ${first.date} au ${last.date} (${totalDays} jours)`,
      size: 10,
    });
    lines.push({
      text: `Consommation totale : ${fmt(totalConso)} ${meter.unit}`,
      size: 13,
      bold: true,
      gapBefore: 8,
    });
    lines.push({
      text: `Moyenne : ${fmt(daily)} ${meter.unit}/jour`,
      size: 10,
    });
    lines.push({
      text: `Coût estimé : ${fmtFCFA(Math.round(cost))}`,
      size: 13,
      bold: true,
    });

    // Ajout des statistiques CIE (rechargements) si c'est un compteur électrique
    if (meter.unit === "kWh") {
      const totalRecharged = list.reduce(
        (s, r) => s + (r.rechargeAmount ?? 0),
        0,
      );
      if (totalRecharged > 0) {
        const remainingCredit = totalRecharged - cost;
        lines.push({
          text: `Total rechargé : ${fmtFCFA(totalRecharged)}`,
          size: 11,
          bold: true,
          gapBefore: 8,
        });
        lines.push({
          text: `Crédit restant estimé : ${fmtFCFA(Math.max(remainingCredit, 0))}`,
          size: 10,
        });
      }
    }
    if (last.conso !== null) {
      lines.push({
        text: `Dernier relevé : ${last.date} — index ${fmt(last.index)} (+${fmt(last.conso)} ${meter.unit} sur ${last.days} j)`,
        size: 10,
      });
    }
    lines.push({ text: "Tous les relevés :", size: 10, gapBefore: 10 });
    const all = [...list].reverse();
    for (const r of all) {
      const c = r.conso === null ? "—" : `+${fmt(r.conso)} ${meter.unit}`;
      const k = r.cost === null ? "" : `      ${fmtFCFA(r.cost, 0)}`;
      const recharge =
        r.rechargeAmount && r.rechargeAmount > 0
          ? `      Rechargé : ${fmtFCFA(r.rechargeAmount)}`
          : "";
      lines.push({
        text: `      ${r.date}      index ${fmt(r.index)}      ${c}${k}${recharge}`,
        size: 9,
      });
      if (r.invoice && r.invoice.lines.length > 0) {
        for (const l of r.invoice.lines) {
          lines.push({ text: `            ${formatLine(l)}`, size: 8 });
        }
        lines.push({
          text: `            Total : ${fmtFCFA(r.invoice.total, 2)}`,
          size: 8,
          bold: true,
        });
      }
    }
  } else {
    lines.push({
      text: "Pas encore assez de relevés pour un calcul de consommation.",
      size: 10,
      gapBefore: 6,
    });
  }

  return {
    title: "Relevé Index — Détail",
    subtitle: `Compteur : ${meter.name}`,
    lines,
  };
}
