// Formatage générique (index, consommation…) : séparateurs fr-FR.
export const fmt = (n: number, digits = 2) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: digits });

// Montant en francs CFA (XOF). Le FCFA n'a pas de décimales en usage courant,
// mais on autorise `digits` pour les prix unitaires (ex : 99,50 FCFA/kWh).
export const fmtFCFA = (n: number, digits = 0) =>
  `${n.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} FCFA`;

// Date locale au format ISO "YYYY-MM-DD" (évite le décalage UTC de toISOString)
export const todayISO = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};