// Génère les icônes PWA (PNG + favicon) depuis public/logo.svg.
// Utilise @resvg/resvg-js (binaire précompilé N-API : aucune compilation,
// aucun outil natif externe requis). Reproductible via `npm run generate-pwa-assets`.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const source = path.join(publicDir, "logo.svg");

// Fond de marque (identique au theme_color du manifest).
const BRAND = "#0f766e";

// Cibles générées : nom de fichier → taille (en px).
const targets = [
  { file: "pwa-64x64.png", size: 64 },
  { file: "pwa-192x192.png", size: 192 },
  { file: "pwa-512x512.png", size: 512 },
  // Le glyphe source respecte déjà la « safe zone » : le fond plein cadre
  // convient donc directement pour un usage maskable.
  { file: "maskable-icon-512x512.png", size: 512 },
  { file: "apple-touch-icon-180x180.png", size: 180 },
  { file: "favicon-48.png", size: 48 },
];

function renderPng(svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    background: BRAND,
  });
  return resvg.render().asPng();
}

const svg = await readFile(source, "utf8");

for (const { file, size } of targets) {
  const png = renderPng(svg, size);
  await writeFile(path.join(publicDir, file), png);
  console.log(`✓ ${file} (${size}×${size})`);
}

// favicon vectoriel (adapté aux écrans haute densité).
await writeFile(path.join(publicDir, "favicon.svg"), svg);
console.log("✓ favicon.svg");

// ── Splash screens iOS (apple-touch-startup-image) ──────────────────────────
// Rendu : fond de marque plein écran + logo centré.
// NB : ces images ne sont PAS précachées par le Service Worker (globIgnores).
const glyph = svg
  .replace(/^[\s\S]*?<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "");

// Dimensions en pixels de l'appareil (portrait) des principaux iPhone / iPad.
const splashDevices = [
  { w: 1290, h: 2796 },
  { w: 1179, h: 2556 },
  { w: 1170, h: 2532 },
  { w: 1284, h: 2778 },
  { w: 1242, h: 2688 },
  { w: 1125, h: 2436 },
  { w: 828, h: 1792 },
  { w: 750, h: 1334 },
  { w: 640, h: 1136 },
  { w: 2048, h: 2732 },
  { w: 1668, h: 2388 },
  { w: 1640, h: 2360 },
  { w: 1620, h: 2160 },
  { w: 1536, h: 2048 },
];

for (const { w, h } of splashDevices) {
  const logoSize = Math.round(Math.min(w, h) * 0.28);
  const x = Math.round((w - logoSize) / 2);
  const y = Math.round((h - logoSize) / 2);
  const k = logoSize / 512; // le glyphe source est en 512×512
  const splash = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `<rect width="${w}" height="${h}" fill="${BRAND}"/>`,
    `<g transform="translate(${x} ${y}) scale(${k})">${glyph}</g>`,
    `</svg>`,
  ].join("");
  const png = new Resvg(splash, { fitTo: { mode: "width", value: w } })
    .render()
    .asPng();
  await writeFile(path.join(publicDir, `apple-splash-${w}x${h}.png`), png);
  console.log(`✓ apple-splash-${w}x${h}.png`);
}

console.log("\nIcônes PWA + splash screens générés dans public/.");