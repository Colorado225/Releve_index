// Générateur PDF minimaliste — AUCUNE dépendance externe.
// Gère du texte multi-pages avec les polices standard (Helvetica) et un
// encodage WinAnsi (≈ Latin-1) : suffisant pour un récapitulatif en français.

export interface PdfText {
  text: string;
  /** Taille de police en points (défaut : 11). */
  size?: number;
  /** Texte en gras (défaut : false). */
  bold?: boolean;
  /** Espace supplémentaire avant la ligne, en points (défaut : 0). */
  gapBefore?: number;
}

export interface PdfDocument {
  title: string;
  subtitle?: string;
  lines: PdfText[];
}

// A4 en points, origine en bas à gauche.
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_TOP = PAGE_H - MARGIN - 72;
const CONTENT_BOTTOM = MARGIN + 36;
const LINE_RATIO = 1.5;

interface Op {
  x: number;
  y: number;
  size: number;
  bold: boolean;
  text: string;
}

// Encode en WinAnsi (≈ Latin-1) et échappe la syntaxe des chaînes PDF.
function escapeText(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0x3f;
    let b = code;
    if (code === 0x20ac) b = 0x80; // €
    else if (code > 0xff) b = 0x3f; // non représentable → '?'
    let c = String.fromCharCode(b);
    if (c === "\\" || c === "(" || c === ")") c = "\\" + c;
    out += c;
  }
  return out;
}

function paginate(doc: PdfDocument): Op[][] {
  const pages: Op[][] = [];
  let ops: Op[] = [];
  let y = CONTENT_TOP;

  for (const line of doc.lines) {
    const size = line.size ?? 11;
    const lh = size * LINE_RATIO + (line.gapBefore ?? 0);
    if (y - lh < CONTENT_BOTTOM) {
      pages.push(ops);
      ops = [];
      y = CONTENT_TOP;
    }
    y -= lh;
    ops.push({ x: MARGIN, y, size, bold: !!line.bold, text: line.text });
  }
  pages.push(ops);
  return pages;
}

function pageContent(
  doc: PdfDocument,
  ops: Op[],
  index: number,
  total: number,
): string {
  let s = "";

  // En-tête
  s += "0.06 0.46 0.43 rg\n";
  s += `BT /F2 16 Tf 1 0 0 1 ${MARGIN} ${(PAGE_H - MARGIN - 16).toFixed(2)} Tm (${escapeText(doc.title)}) Tj ET\n`;
  if (doc.subtitle) {
    s += "0.4 0.4 0.4 rg\n";
    s += `BT /F1 10 Tf 1 0 0 1 ${MARGIN} ${(PAGE_H - MARGIN - 32).toFixed(2)} Tm (${escapeText(doc.subtitle)}) Tj ET\n`;
  }
  const ruleY = PAGE_H - MARGIN - 44;
  s += `0.85 0.85 0.85 RG 0.7 w ${MARGIN} ${ruleY.toFixed(2)} m ${(PAGE_W - MARGIN).toFixed(2)} ${ruleY.toFixed(2)} l S\n`;

  // Corps
  for (const op of ops) {
    s += "0 0 0 rg\n";
    s += `BT /${op.bold ? "F2" : "F1"} ${op.size} Tf 1 0 0 1 ${op.x} ${op.y.toFixed(2)} Tm (${escapeText(op.text)}) Tj ET\n`;
  }

  // Pied de page
  s += "0.4 0.4 0.4 rg\n";
  s += `BT /F1 9 Tf 1 0 0 1 ${MARGIN} ${(MARGIN - 10).toFixed(2)} Tm (Page ${index + 1} / ${total}) Tj ET\n`;

  return s;
}

export function buildPdf(doc: PdfDocument): ArrayBuffer {
  const pages = paginate(doc);
  const total = pages.length;

  const numOfPage = (i: number) => 5 + 2 * i;
  const numOfContent = (i: number) => 6 + 2 * i;
  const kids = pages.map((_, i) => `${numOfPage(i)} 0 R`).join(" ");

  const objects: { num: number; body: string }[] = [
    { num: 1, body: "<< /Type /Catalog /Pages 2 0 R >>" },
    { num: 2, body: `<< /Type /Pages /Kids [${kids}] /Count ${total} >>` },
    {
      num: 3,
      body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    },
    {
      num: 4,
      body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    },
  ];

  pages.forEach((ops, i) => {
    const content = pageContent(doc, ops, i, total);
    objects.push({
      num: numOfPage(i),
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${numOfContent(i)} 0 R >>`,
    });
    objects.push({
      num: numOfContent(i),
      body: `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    });
  });

  const maxNum = 4 + 2 * total;

  let pdf = "%PDF-1.4\n";
  const offsets = new Array<number>(maxNum + 1).fill(0);
  for (const obj of objects) {
    offsets[obj.num] = pdf.length;
    pdf += `${obj.num} 0 obj\n${obj.body}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  let xref = `xref\n0 ${maxNum + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= maxNum; n++) {
    xref += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += xref;
  pdf += `trailer\n<< /Size ${maxNum + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  // Chaque caractère vaut 1 octet (tous les codes sont ≤ 0xFF).
  // On retourne un ArrayBuffer : type directement compatible avec Blob et
  // exempt du conflit ArrayBufferLike / SharedArrayBuffer des types récents.
  const buffer = new ArrayBuffer(pdf.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return buffer;
}