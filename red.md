# Prompt complet — Application "Relevé Index" (React + TypeScript + Tailwind + Local Storage)

Voici le prompt à copier-coller tel quel dans un assistant IA (Claude, GPT, Cursor, Copilot…) pour générer **l'application entière, fonctionnelle, sans rien ajouter**.

---

## 🎯 PROMPT À COPIER

```
Tu es un développeur senior React/TypeScript. Génère une application web complète,
fonctionnelle et prête à l'emploi appelée "Relevé Index" qui permet de gérer les
relevés d'index de compteurs d'eau et d'électricité. Respecte EXACTEMENT le cahier
des charges ci-dessous, sans rien omettre ni ajouter.

═══════════════════════════════════════════════════════════════════════
1. STACK TECHNIQUE IMPOSÉE
═══════════════════════════════════════════════════════════════════════
- Vite 5 + React 18 + TypeScript 5 (mode strict)
- TailwindCSS 3 (avec mode sombre automatique via prefers-color-scheme)
- Zustand 4 pour l'état global, avec middleware `persist` → localStorage
- Aucun backend, aucune API externe, aucune clé. 100% local, hors-ligne.
- Cible : mobile-first (utilisable debout devant le compteur)

═══════════════════════════════════════════════════════════════════════
2. FONCTIONNALITÉS EXIGÉES
═══════════════════════════════════════════════════════════════════════
A. SAISIE D'UN RELEVÉ (page par défaut)
   - Sélection du compteur (Eau / Électricité / autres créés par l'utilisateur)
   - Date (préremplie à aujourd'hui)
   - Index (nombre décimal)
   - Note optionnelle
   - Bouton "Enregistrer" → toast "Relevé enregistré ✓" pendant 1,8 s
   - Affiche en dessous le dernier état du compteur :
       date, index, index précédent, conso depuis (X j) en vert

B. HISTORIQUE
   - Sélecteur de compteur
   - 3 KPI en haut : Conso totale · Moyenne/jour · Coût estimé (€)
   - Graphique à barres SVG (12 derniers mois, valeurs au-dessus des barres)
   - Liste des relevés (plus récent en haut) avec index, conso (+X), date,
     jours écoulés, note, bouton de suppression (avec confirmation)
   - Bouton "Exporter en CSV" (séparateur `;`, BOM UTF-8, format FR)

C. COMPTEURS
   - Liste des compteurs avec nom, unité, prix unitaire, abonnement, nb de chiffres
   - Formulaire d'ajout : nom, unité, prix unitaire (€), abonnement mensuel (€),
     nombre de chiffres du compteur (pour la gestion du passage à zéro)
   - Suppression d'un compteur (avec confirmation si des relevés existent)
   - Bouton "Exporter les données (JSON)" → fichier `releve-index-sauvegarde.json`
   - Input "Restaurer un fichier JSON" → remplace toutes les données après confirmation

═══════════════════════════════════════════════════════════════════════
3. RÈGLES MÉTIER (NE PAS DÉROGER)
═══════════════════════════════════════════════════════════════════════
- La consommation n'est JAMAIS stockée : elle est calculée par différence entre
  deux index consécutifs (tri par date puis par index).
- Gestion du PASSAGE À ZÉRO : si index courant < index précédent, alors
  conso += 10^digits  (ex : compteur 5 chiffres, 00012 → 99990 ⇒ conso ≈ +22)
- Coût d'une période = conso × prix_unitaire + (abonnement_mensuel × jours / 30,44)
- Les dates sont au format ISO "YYYY-MM-DD" (string, tri lexicographique)
- Les unités par défaut : Eau → "m³", Électricité → "kWh"
- Compteurs par défaut :
    { id: 'eau',  name: 'Eau',         unit: 'm³',  price: 3.5,  abon: 0, digits: 5 }
    { id: 'elec', name: 'Électricité', unit: 'kWh', price: 0.25, abon: 0, digits: 6 }

═══════════════════════════════════════════════════════════════════════
4. STRUCTURE DE FICHIERS À GÉNÉRER (exactement)
═══════════════════════════════════════════════════════════════════════
releve-index/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── types.ts
    ├── store.ts
    ├── lib/
    │   ├── calc.ts
    │   └── format.ts
    ├── components/
    │   ├── Card.tsx
    │   ├── Navigation.tsx
    │   └── BarChart.tsx
    └── pages/
        ├── EntryPage.tsx
        ├── HistoryPage.tsx
        └── MetersPage.tsx

═══════════════════════════════════════════════════════════════════════
5. DESIGN / UX
═══════════════════════════════════════════════════════════════════════
- Couleur principale : teal-700 (#0f766e). Thème sombre automatique.
- Navigation fixe en bas (3 onglets : Saisie / Historique / Compteurs)
  avec indicateur de l'onglet actif.
- Cartes blanches (dark: slate-900) avec coins arrondis (rounded-2xl),
  bordure slate-200 (dark: slate-800), ombre légère.
- Inputs : rounded-xl, focus:ring-2 focus:ring-teal-600
- Largeur max : 640-672 px, centré. Padding mobile : p-4.
- Boutons principaux : bg-teal-700 hover:bg-teal-800 text-white font-semibold
  rounded-xl py-3 w-full
- Textes en français, formats numériques en fr-FR
- Labels en text-xs text-slate-500 au-dessus des champs

═══════════════════════════════════════════════════════════════════════
6. CONTRAINTES DE QUALITÉ
═══════════════════════════════════════════════════════════════════════
- TypeScript strict : tous les types explicites, aucun `any`
- Aucune dépendance UI externe (pas de shadcn, MUI, etc.) — Tailwind seul
- Pas de `console.log` en production
- Code commenté en français, aux endroits clés uniquement
- Composants fonctionnels avec hooks, pas de classes
- Le projet doit se lancer avec `npm install && npm run dev` sans erreur
- Le build `npm run build` doit passer sans warning TypeScript

═══════════════════════════════════════════════════════════════════════
7. LIVRABLE ATTENDU
═══════════════════════════════════════════════════════════════════════
Fournis TOUS les fichiers, chacun dans un bloc de code séparé précédé de son
chemin exact. Ne saute aucun fichier. Ne demande pas de clarification.
Ne propose pas d'alternative : écris directement le code final, complet,
prêt à copier-coller, tel que spécifié ci-dessus.
```

---

## 📦 IMPLÉMENTATION COMPLÈTE (fichiers prêts à copier)

### 1. `package.json`

```json
{
  "name": "releve-index",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "vite": "^5.4.10"
  }
}
```

### 2. `vite.config.ts`

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({ plugins: [react()] });
```

### 3. `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: { extend: {} },
  plugins: [],
};
```

### 4. `postcss.config.js`

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

### 5. `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 6. `tsconfig.node.json`

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler"
  },
  "include": ["vite.config.ts"]
}
```

### 7. `index.html`

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width,initial-scale=1,viewport-fit=cover"
    />
    <meta name="theme-color" content="#0f766e" />
    <title>Relevé Index</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 8. `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body,
#root {
  height: 100%;
}
body {
  -webkit-tap-highlight-color: transparent;
}
```

### 9. `src/types.ts`

```ts
export interface Meter {
  id: string;
  name: string;
  unit: string;
  price: number; // € / unité
  abon: number; // € / mois
  digits: number; // nb de chiffres du compteur (rollover)
}

export interface Reading {
  id: string;
  meterId: string;
  date: string; // YYYY-MM-DD
  index: number;
  note?: string;
}

export interface EnrichedReading extends Reading {
  conso: number | null;
  days: number | null;
  cost: number | null;
}
```

### 10. `src/lib/format.ts`

```ts
export const fmt = (n: number, digits = 2) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: digits });

export const todayISO = () => new Date().toISOString().slice(0, 10);
```

### 11. `src/lib/calc.ts`

```ts
import type { Meter, Reading, EnrichedReading } from "../types";

export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

export function enrichReadings(
  meter: Meter,
  allReadings: Reading[],
): EnrichedReading[] {
  const sorted = allReadings
    .filter((r) => r.meterId === meter.id)
    .sort((a, b) => a.date.localeCompare(b.date) || a.index - b.index);

  return sorted.map((r, i) => {
    const prev = i > 0 ? sorted[i - 1] : null;
    let conso: number | null = null;
    let days: number | null = null;
    let cost: number | null = null;

    if (prev) {
      conso = r.index - prev.index;
      if (conso < 0) conso += Math.pow(10, meter.digits); // passage à zéro
      days = daysBetween(prev.date, r.date);
      cost = conso * meter.price + (meter.abon * days) / 30.44;
    }
    return { ...r, conso, days, cost };
  });
}
```

### 12. `src/store.ts`

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Meter, Reading } from "./types";

interface State {
  meters: Meter[];
  readings: Reading[];
  addMeter: (m: Omit<Meter, "id">) => void;
  removeMeter: (id: string) => void;
  addReading: (r: Omit<Reading, "id">) => void;
  removeReading: (id: string) => void;
  importData: (data: { meters: Meter[]; readings: Reading[] }) => void;
}

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const defaultMeters: Meter[] = [
  { id: "eau", name: "Eau", unit: "m³", price: 3.5, abon: 0, digits: 5 },
  {
    id: "elec",
    name: "Électricité",
    unit: "kWh",
    price: 0.25,
    abon: 0,
    digits: 6,
  },
];

export const useStore = create<State>()(
  persist(
    (set) => ({
      meters: defaultMeters,
      readings: [],
      addMeter: (m) =>
        set((s) => ({ meters: [...s.meters, { ...m, id: uid() }] })),
      removeMeter: (id) =>
        set((s) => ({
          meters: s.meters.filter((m) => m.id !== id),
          readings: s.readings.filter((r) => r.meterId !== id),
        })),
      addReading: (r) =>
        set((s) => ({ readings: [...s.readings, { ...r, id: uid() }] })),
      removeReading: (id) =>
        set((s) => ({ readings: s.readings.filter((r) => r.id !== id) })),
      importData: (data) =>
        set(() => ({ meters: data.meters, readings: data.readings })),
    }),
    { name: "releve-index-v1" },
  ),
);
```

### 13. `src/components/Card.tsx`

```tsx
import type { ReactNode } from "react";

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm ${className}`}
    >
      {title && (
        <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
```

### 14. `src/components/Navigation.tsx`

```tsx
import type { View } from "../App";

const items: { id: View; label: string }[] = [
  { id: "entry", label: "Saisie" },
  { id: "history", label: "Historique" },
  { id: "meters", label: "Compteurs" },
];

export function Navigation({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={`py-4 text-sm font-medium transition ${
            view === it.id
              ? "text-teal-700 dark:text-teal-400 border-t-2 border-teal-700 dark:border-teal-400 -mt-px"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {it.label}
        </button>
      ))}
    </nav>
  );
}
```

### 15. `src/components/BarChart.tsx`

```tsx
export function BarChart({ data }: { data: [string, number][] }) {
  const W = 560,
    H = 180,
    padX = 26,
    padTop = 25,
    padBottom = 30;
  const max = Math.max(...data.map(([, v]) => v), 1);
  const bw = (W - padX * 2) / data.length;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      className="text-teal-700"
    >
      {data.map(([month, value], i) => {
        const bh = Math.max(2, (value / max) * (H - padTop - padBottom));
        const x = padX + i * bw + bw * 0.15;
        const y = H - padBottom - bh;
        return (
          <g key={month}>
            <rect
              x={x}
              y={y}
              width={bw * 0.7}
              height={bh}
              rx={4}
              fill="currentColor"
            />
            <text
              x={x + bw * 0.35}
              y={y - 5}
              fontSize={10}
              textAnchor="middle"
              className="fill-slate-500"
            >
              {value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
            </text>
            <text
              x={x + bw * 0.35}
              y={H - 10}
              fontSize={10}
              textAnchor="middle"
              className="fill-slate-500"
            >
              {month.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
```

### 16. `src/pages/EntryPage.tsx`

```tsx
import { useMemo, useState } from "react";
import { useStore } from "../store";
import { Card } from "../components/Card";
import { fmt, todayISO } from "../lib/format";
import { enrichReadings } from "../lib/calc";

export function EntryPage() {
  const { meters, readings, addReading } = useStore();
  const [meterId, setMeterId] = useState(meters[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const [index, setIndex] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const meter = meters.find((m) => m.id === meterId);

  const last = useMemo(() => {
    if (!meter) return null;
    const list = enrichReadings(meter, readings);
    return list[list.length - 1] ?? null;
  }, [meter, readings]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meter || !date || index === "") return;
    addReading({
      meterId,
      date,
      index: parseFloat(index),
      note: note.trim() || undefined,
    });
    setIndex("");
    setNote("");
    setMsg("Relevé enregistré ✓");
    setTimeout(() => setMsg(null), 1800);
  };

  const inputCls =
    "w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 focus:outline-none focus:ring-2 focus:ring-teal-600";

  return (
    <>
      <Card title="Nouveau relevé">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-500">Compteur</label>
            <select
              value={meterId}
              onChange={(e) => setMeterId(e.target.value)}
              className={inputCls}
            >
              {meters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.unit})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">
              Index relevé {meter && `(${meter.unit})`}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={index}
              onChange={(e) => setIndex(e.target.value)}
              placeholder="ex : 12345"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Note (optionnel)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputCls}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl py-3 transition"
          >
            Enregistrer
          </button>
          {msg && (
            <p className="text-teal-700 dark:text-teal-400 text-sm text-center">
              {msg}
            </p>
          )}
        </form>
      </Card>

      {meter && (
        <Card title={`Dernier état — ${meter.name}`}>
          {!last ? (
            <p className="text-slate-500 text-sm">
              Aucun relevé pour ce compteur.
            </p>
          ) : (
            <div className="text-sm">
              <Row label="Date" value={last.date} />
              <Row
                label="Index"
                value={`${fmt(last.index)} ${meter.unit}`}
                bold
              />
              {last.conso !== null && (
                <Row
                  label={`Conso depuis (${last.days} j)`}
                  value={`+${fmt(last.conso)} ${meter.unit}`}
                  accent
                />
              )}
            </div>
          )}
        </Card>
      )}
    </>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 last:border-0 py-1.5">
      <span className="text-slate-500">{label}</span>
      <span
        className={`${bold ? "text-lg font-bold" : ""} ${accent ? "text-teal-700 dark:text-teal-400 font-semibold" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
```

### 17. `src/pages/HistoryPage.tsx`

```tsx
import { useMemo, useState } from "react";
import { useStore } from "../store";
import { Card } from "../components/Card";
import { BarChart } from "../components/BarChart";
import { fmt } from "../lib/format";
import { enrichReadings } from "../lib/calc";

export function HistoryPage() {
  const { meters, readings, removeReading } = useStore();
  const [meterId, setMeterId] = useState(meters[0]?.id ?? "");
  const meter = meters.find((m) => m.id === meterId);

  const list = useMemo(
    () => (meter ? enrichReadings(meter, readings) : []),
    [meter, readings],
  );
  const reversed = [...list].reverse();

  const totals = useMemo(() => {
    const withConso = list.filter((r) => r.conso !== null);
    const totalConso = withConso.reduce((s, r) => s + (r.conso ?? 0), 0);
    const totalDays = withConso.reduce((s, r) => s + (r.days ?? 0), 0) || 1;
    const daily = totalConso / totalDays;
    const cost = meter
      ? totalConso * meter.price + (meter.abon * totalDays) / 30.44
      : 0;
    return { totalConso, daily, cost };
  }, [list, meter]);

  const monthly = useMemo<[string, number][]>(() => {
    const groups: Record<string, number> = {};
    list.forEach((r) => {
      if (r.conso === null) return;
      const k = r.date.slice(0, 7);
      groups[k] = (groups[k] ?? 0) + r.conso;
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12);
  }, [list]);

  const exportCSV = () => {
    if (!meter) return;
    const rows: string[][] = [
      ["date", "index", "unite", "conso", "jours", "note"],
    ];
    list.forEach((r) =>
      rows.push([
        r.date,
        String(r.index),
        meter.unit,
        r.conso === null ? "" : r.conso.toFixed(2),
        r.days === null ? "" : String(r.days),
        r.note ?? "",
      ]),
    );
    const csv = rows
      .map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    download(`${meter.name}_releves.csv`, "\ufeff" + csv, "text/csv");
  };

  return (
    <>
      <Card title="Compteur">
        <select
          value={meterId}
          onChange={(e) => setMeterId(e.target.value)}
          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3"
        >
          {meters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.unit})
            </option>
          ))}
        </select>
      </Card>

      {meter && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <KPI
              label="Conso totale"
              value={fmt(totals.totalConso)}
              unit={meter.unit}
            />
            <KPI
              label="Moyenne/j"
              value={fmt(totals.daily)}
              unit={`${meter.unit}/j`}
            />
            <KPI label="Coût estimé" value={fmt(totals.cost)} unit="€" />
          </div>

          <Card title="Consommation mensuelle">
            {monthly.length === 0 ? (
              <p className="text-slate-500 text-sm">
                Pas encore assez de données.
              </p>
            ) : (
              <BarChart data={monthly} />
            )}
          </Card>

          <Card title="Relevés">
            {reversed.length === 0 ? (
              <p className="text-slate-500 text-sm">Aucun relevé.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {reversed.map((r) => (
                  <div
                    key={r.id}
                    className="flex justify-between items-center py-2.5"
                  >
                    <div>
                      <div className="text-sm">
                        <strong>{fmt(r.index)}</strong> {meter.unit}
                        {r.conso !== null && (
                          <span className="text-teal-700 dark:text-teal-400">
                            {" "}
                            (+{fmt(r.conso)})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {r.date}
                        {r.days !== null && ` · ${r.days} j`}
                        {r.note && ` · ${r.note}`}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm("Supprimer ce relevé ?"))
                          removeReading(r.id);
                      }}
                      className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg px-2.5 py-1 text-lg"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={exportCSV}
              className="mt-4 w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl py-3 transition"
            >
              Exporter en CSV
            </button>
          </Card>
        </>
      )}
    </>
  );
}

function KPI({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-slate-500">{unit}</div>
    </div>
  );
}

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

### 18. `src/pages/MetersPage.tsx`

```tsx
import { useRef, useState } from "react";
import { useStore } from "../store";
import { Card } from "../components/Card";
import { fmt } from "../lib/format";

export function MetersPage() {
  const { meters, readings, addMeter, removeMeter, importData } = useStore();
  const [form, setForm] = useState({
    name: "",
    unit: "kWh",
    price: "",
    abon: "",
    digits: "5",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addMeter({
      name: form.name.trim(),
      unit: form.unit.trim() || "u",
      price: parseFloat(form.price) || 0,
      abon: parseFloat(form.abon) || 0,
      digits: parseInt(form.digits) || 5,
    });
    setForm({ name: "", unit: "kWh", price: "", abon: "", digits: "5" });
  };

  const exportJSON = () => {
    const data = JSON.stringify({ meters, readings }, null, 2);
    const url = URL.createObjectURL(
      new Blob([data], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "releve-index-sauvegarde.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const data = JSON.parse(fr.result as string);
        if (!Array.isArray(data.meters) || !Array.isArray(data.readings))
          throw new Error();
        if (confirm("Remplacer toutes les données actuelles ?"))
          importData(data);
      } catch {
        alert("Fichier invalide.");
      }
      if (fileRef.current) fileRef.current.value = "";
    };
    fr.readAsText(file);
  };

  return (
    <>
      <Card title="Mes compteurs">
        {meters.length === 0 && (
          <p className="text-slate-500 text-sm">Aucun compteur.</p>
        )}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {meters.map((m) => (
            <div
              key={m.id}
              className="flex justify-between items-center py-2.5"
            >
              <div>
                <div>
                  <strong>{m.name}</strong>{" "}
                  <span className="text-slate-500 text-sm">({m.unit})</span>
                </div>
                <div className="text-xs text-slate-500">
                  {fmt(m.price, 4)} €/{m.unit}
                  {m.abon > 0 && ` · abo ${fmt(m.abon)} €/mois`}
                  {` · ${m.digits} chiffres`}
                </div>
              </div>
              <button
                onClick={() => {
                  if (
                    readings.some((r) => r.meterId === m.id) &&
                    !confirm("Ce compteur a des relevés. Tout supprimer ?")
                  )
                    return;
                  removeMeter(m.id);
                }}
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg px-2.5 py-1 text-lg"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Ajouter un compteur">
        <div className="space-y-3">
          <Input
            label="Nom"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
          />
          <Input
            label="Unité"
            value={form.unit}
            onChange={(v) => setForm({ ...form, unit: v })}
          />
          <Input
            label="Prix unitaire (€)"
            type="number"
            step="0.0001"
            value={form.price}
            onChange={(v) => setForm({ ...form, price: v })}
          />
          <Input
            label="Abonnement mensuel (€)"
            type="number"
            step="0.01"
            value={form.abon}
            onChange={(v) => setForm({ ...form, abon: v })}
          />
          <Input
            label="Nombre de chiffres du compteur"
            type="number"
            value={form.digits}
            onChange={(v) => setForm({ ...form, digits: v })}
          />
          <button
            onClick={handleAdd}
            className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl py-3 transition"
          >
            Ajouter
          </button>
        </div>
      </Card>

      <Card title="Sauvegarde">
        <button
          onClick={exportJSON}
          className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl py-3 transition"
        >
          Exporter les données (JSON)
        </button>
        <label className="block text-xs text-slate-500 mt-4 mb-1">
          Restaurer un fichier JSON
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          onChange={handleImport}
          className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-teal-700 file:text-white file:px-3 file:py-2 file:font-medium"
        />
      </Card>
    </>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="text-xs text-slate-500">{label}</label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 focus:outline-none focus:ring-2 focus:ring-teal-600"
      />
    </div>
  );
}
```

### 19. `src/App.tsx`

```tsx
import { useState } from "react";
import { Navigation } from "./components/Navigation";
import { EntryPage } from "./pages/EntryPage";
import { HistoryPage } from "./pages/HistoryPage";
import { MetersPage } from "./pages/MetersPage";

export type View = "entry" | "history" | "meters";

export default function App() {
  const [view, setView] = useState<View>("entry");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      <header className="bg-teal-700 text-white px-4 py-3 font-semibold shadow">
        📊 Relevé Index
      </header>
      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {view === "entry" && <EntryPage />}
        {view === "history" && <HistoryPage />}
        {view === "meters" && <MetersPage />}
      </main>
      <Navigation view={view} onChange={setView} />
    </div>
  );
}
```

### 20. `src/main.tsx`

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

---

## 🚀 Installation en une commande

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # dist/ déployable sur Vercel/Netlify/GitHub Pages
```

---

## ✅ Récapitulatif — ce que fait l'app

| Fonction                                        | Statut |
| ----------------------------------------------- | ------ |
| Saisie rapide d'un relevé                       | ✅     |
| Multi-compteurs (eau, élec, custom)             | ✅     |
| Calcul de conso entre 2 relevés                 | ✅     |
| Gestion du passage à zéro du compteur           | ✅     |
| Historique + suppression                        | ✅     |
| KPI (total, moyenne/jour, coût)                 | ✅     |
| Graphique mensuel SVG                           | ✅     |
| Export CSV / JSON + import JSON                 | ✅     |
| Persistance locale (`localStorage` via Zustand) | ✅     |
| Thème sombre automatique                        | ✅     |
| 100% offline, aucun backend                     | ✅     |

---

## 🔧 Évolutions possibles (à demander ensuite)

- **PWA installable + offline réel** → `vite-plugin-pwa` + `manifest.webmanifest` + Service Worker
- **Photos du compteur** → `IndexedDB` (localStorage limité à ~5 Mo)
- **Détection de fuite** → comparer la conso/jour à la médiane des 6 derniers mois
- **Rappels mensuels** → Notification API + Service Worker
- **Synchronisation multi-appareils** → Supabase + sync Zustand
- **Test unitaires** → Vitest sur `calc.ts` (rollover, coût, jours)

Dites-moi laquelle de ces extensions vous voulez, je vous livre les fichiers additionnels prêts à coller.
