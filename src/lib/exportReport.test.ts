import { describe, it, expect } from "vitest";
import {
  buildExportReport,
  computeExportRows,
  type ExportFormData,
  type RawReading,
} from "./exportReport";
import { buildPdf } from "./pdf";

const form: ExportFormData = {
  societeNom: "SODECI",
  societeAdresse: "Rue des Jardins, Abidjan",
  societeEmail: "contact@sodeci.ci",
  societeTelephone: "01 02 03 04 05",
  abonneNom: "Kouassi Yao",
  abonneAdresse: "Cocody Angré, Abidjan",
  abonneEmail: "kouassi@example.ci",
  compteurType: "eau",
  compteurNumero: "EAU-00123",
  compteurPrixUnitaire: 100,
  compteurAbonnementJour: 31.72,
  periodeDebut: "2024-01-01",
  periodeFin: "2024-03-01",
};

const releves: RawReading[] = [
  { date_releve: "2024-03-01", index_valeur: 130 },
  { date_releve: "2024-01-01", index_valeur: 100 }, // volontairement non trié
];

const toStr = (b: ArrayBuffer) =>
  Array.from(new Uint8Array(b))
    .map((c) => String.fromCharCode(c))
    .join("");

describe("computeExportRows", () => {
  it("trie les relevés par date croissante", () => {
    const rows = computeExportRows(releves, 100, 31.72);
    expect(rows.map((r) => r.date)).toEqual(["2024-01-01", "2024-03-01"]);
  });

  it("considère le premier relevé comme un ancrage (consommation nulle)", () => {
    const rows = computeExportRows(releves, 100, 31.72);
    expect(rows[0].consommation).toBe(0);
    expect(rows[0].jours).toBe(0);
    expect(rows[0].total).toBe(0);
  });

  it("calcule consommation, jours et coût du relevé suivant", () => {
    const rows = computeExportRows(releves, 100, 31.72);
    // 130 - 100 = 30 m³ sur 60 jours (1er janv. → 1er mars)
    expect(rows[1].consommation).toBe(30);
    expect(rows[1].jours).toBe(60);
    expect(rows[1].energie).toBe(3000);
    expect(rows[1].abonnement).toBe(Math.round(60 * 31.72));
    expect(rows[1].total).toBe(rows[1].energie + rows[1].abonnement);
  });

  it("ne produit jamais de consommation négative si l'index recule", () => {
    const rows = computeExportRows(
      [
        { date_releve: "2024-01-01", index_valeur: 100 },
        { date_releve: "2024-02-01", index_valeur: 80 },
      ],
      100,
      0,
    );
    expect(rows[1].consommation).toBe(0);
  });
});

describe("buildExportReport", () => {
  const rows = computeExportRows(releves, 100, 31.72);
  const doc = buildExportReport(form, rows, "HIST-12345678");

  it("reporte les identités et la période du formulaire", () => {
    const text = doc.lines.map((l) => l.text).join("\n");
    expect(doc.title).toBe("Historique des relevés");
    expect(text).toContain("Kouassi Yao");
    expect(text).toContain("EAU-00123");
    expect(text).toContain("HIST-12345678");
    expect(text).toContain("Eau");
  });

  it("affiche les totaux de la période", () => {
    const text = doc.lines.map((l) => l.text).join("\n");
    expect(text).toContain("Consommation totale : 30 m³");
    expect(text).toContain("60 jours");
  });

  it("produit un PDF valide prêt au téléchargement", () => {
    const pdf = toStr(buildPdf(doc));
    expect(pdf.startsWith("%PDF-1.4\n")).toBe(true);
    expect(pdf.endsWith("%%EOF\n")).toBe(true);
    expect(pdf).toContain("/Type /Catalog");
  });
});