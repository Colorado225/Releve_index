import { describe, it, expect } from "vitest";
import { buildPdf } from "./pdf";

const toStr = (b: ArrayBuffer) =>
  Array.from(new Uint8Array(b))
    .map((c) => String.fromCharCode(c))
    .join("");

describe("buildPdf", () => {
  it("produit un PDF structurellement valide", () => {
    const pdf = toStr(
      buildPdf({ title: "Test", lines: [{ text: "Bonjour" }] }),
    );
    expect(pdf.startsWith("%PDF-1.4\n")).toBe(true);
    expect(pdf.endsWith("%%EOF\n")).toBe(true);
    expect(pdf).toContain("/Type /Catalog");
    expect(pdf).toContain("/Type /Pages");
    expect(pdf).toContain("xref");
  });

  it("les offsets de la table xref pointent vers les bons objets", () => {
    const pdf = toStr(
      buildPdf({ title: "T", subtitle: "s", lines: [{ text: "a" }, { text: "b" }] }),
    );
    const xrefPos = pdf.lastIndexOf("\nxref\n") + 1;
    expect(xrefPos).toBeGreaterThan(0);

    // startxref doit indiquer la position de la table xref.
    const declared = parseInt(
      pdf.slice(pdf.indexOf("startxref") + "startxref".length).trim(),
      10,
    );
    expect(declared).toBe(xrefPos);

    // Structure : rows[0]="xref", rows[1]="0 N", rows[2]=entrée libre de
    // l'objet 0, puis rows[2 + n] = entrée de l'objet n.
    const rows = pdf.slice(xrefPos).split("\n");
    const count = parseInt(rows[1].split(" ")[1], 10);
    expect(count).toBeGreaterThan(4);
    // L'objet 0 est toujours l'entrée libre (offset 0, type "f").
    expect(rows[2]).toBe("0000000000 65535 f ");
    for (let n = 1; n < count; n++) {
      const off = parseInt(rows[2 + n].slice(0, 10), 10);
      expect(off).toBeGreaterThan(0);
      expect(rows[2 + n].endsWith(" 00000 n ")).toBe(true);
      expect(pdf.slice(off, off + `${n} 0 obj`.length)).toBe(`${n} 0 obj`);
    }
  });

  it("encode les accents et symboles en WinAnsi (Latin-1)", () => {
    const pdf = toStr(
      buildPdf({ title: "Électricité", lines: [{ text: "m³ € à ç" }] }),
    );
    expect(pdf.includes(String.fromCharCode(0xe9))).toBe(true); // é
    expect(pdf.includes(String.fromCharCode(0xb3))).toBe(true); // ³
    expect(pdf.includes(String.fromCharCode(0x80))).toBe(true); // € en WinAnsi
  });

  it("pagine automatiquement au-delà d'une page", () => {
    const lines = Array.from({ length: 200 }, (_, i) => ({ text: `ligne ${i}` }));
    const pdf = toStr(buildPdf({ title: "T", lines }));
    const pageObjs = pdf.match(/\/Type \/Page[^s]/g) ?? [];
    expect(pageObjs.length).toBeGreaterThan(1);
    expect(pdf).toContain("Page 1 / ");
  });
});