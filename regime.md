Pour adapter votre application aux réalités ivoiriennes, il faut modéliser les choses différemment : la CIE et la SODECI facturent par **tranches progressives** et **par bimestre**, avec des taxes fixes. Voici les données officielles et leur implémentation.

---

## 1. Ce que change la réglementation ivoirienne

### 1.1 Électricité (CIE) — Tarif Domestique Social 5A (le plus courant)

Le tarif est **bimestriel** et **progressif par tranches** :

| Élément                                            | FCFA HT | TVA 18% | FCFA TTC   |
| -------------------------------------------------- | ------- | ------- | ---------- |
| Prime fixe / bimestre                              | 614,90  | 0,00    | **614,90** |
| kWh ≤ 80 kWh / bimestre                            | 31,72   | 0,00    | **31,72**  |
| kWh > 80 kWh / bimestre                            | 55,18   | 9,93    | **65,11**  |
| Redevance électrification rurale / kWh             | —       | —       | **1,00**   |
| Redevance RTI / kWh (plafonnée à 2 000 F/bimestre) | —       | —       | **2,00**   |
| Taxe ordures ménagères Abidjan / kWh               | —       | —       | **2,50**   |
| Taxe ordures ménagères autres communes / kWh       | —       | —       | **1,00**   |

**Conditions d'éligibilité au tarif social 5A** : puissance souscrite 1,1 kVA (5A), consommation moyenne ≤ 200 kWh/bimestre sur 3 bimestres consécutifs. Au-delà, basculement automatique vers le **Tarif Domestique Général** .

### 1.2 Tarif Domestique Général 5A (si vous dépassez le seuil social)

| Élément                            | FCFA TTC             |
| ---------------------------------- | -------------------- |
| Prime fixe / bimestre              | **1 618,04**         |
| kWh ≤ 180 × P souscrite / bimestre | **86,92**            |
| kWh > 180 × P souscrite / bimestre | **75,34**            |
| Redevance RTI / kWh                | **2,00** (plafonnée) |

### 1.3 Eau (SODECI) — Tarification par tranches

La SODECI facture **par tranches progressives** selon le volume consommé :

| Tranche | Plage (m³)  | Type             |
| ------- | ----------- | ---------------- |
| 1       | < 9 m³      | Forfaitaire      |
| 2       | 10 – 18 m³  | Tarif social     |
| 3       | 19 – 90 m³  | Tarif domestique |
| 4       | 91 – 300 m³ | Tarif normal     |

**Taxes incluses dans le prix du m³** :

- **Taxe spéciale consommation d'eau** : 0 F/m³ (social), 27 F/m³ (domestique), 165 F/m³ (normal), 221 F/m³ (industriel)
- **FDE** (Fonds de Développement de l'Eau) : finance les branchements sociaux
- **FNE** (Fonds National de l'Eau) : remboursement des emprunts
- **TVA**

**Abonnement SODECI** : 28 443 FCFA TTC pour un compteur Ø15 mm, avec avance sur consommation de 16 500 F TTC remboursable .

---

## 2. Impact sur le code

Il faut **remplacer** le calcul simple `conso × prix + abon/30` par un **moteur de calcul par tranches**.

### 2.1 Nouveau fichier `src/lib/tarifsCI.ts`

```ts
// ─────────────────────────────────────────────────────────────
// TARIFS OFFICIELS CÔTE D'IVOIRE — CIE & SODECI
// Sources : CIE (cie.ci), ANARE-CI, Arrêté interministériel 2023
// ─────────────────────────────────────────────────────────────

export type TypeCompteur = "eau" | "electricite";
export type RegimeCIE = "social_5A" | "general_5A" | "general_15A";
export type TrancheEau =
  | "forfait"
  | "social"
  | "domestique"
  | "normal"
  | "industriel";

// ── ÉLECTRICITÉ (CIE) ─────────────────────────────────────
// Le tarif est BIMESTRIEL et PROGRESSIF.
export interface TarifElec {
  label: string;
  primeFixeBimestre: number; // FCFA TTC
  prixKwhTranche1: number; // FCFA TTC / kWh
  seuilTranche1: number; // kWh par bimestre (80 pour social, 180×P pour général)
  prixKwhTranche2: number; // FCFA TTC / kWh
  redevanceRtiParKwh: number; // FCFA / kWh (plafonnée 2000 F/bimestre)
  redevanceRtiPlafond: number; // FCFA / bimestre
  redevanceElecRuraleKwh: number; // FCFA / kWh
  taxeOrduresAbidjan: number; // FCFA / kWh
  taxeOrduresAutres: number; // FCFA / kWh
}

export const TARIFS_CIE: Record<RegimeCIE, TarifElec> = {
  social_5A: {
    label: "Tarif Domestique Social 5A (post-paiement)",
    primeFixeBimestre: 614.9,
    prixKwhTranche1: 31.72,
    seuilTranche1: 80, // kWh / bimestre
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
    seuilTranche1: 180 * 1.1, // 180 × P souscrite (P = 1,1 kVA pour 5A)
    prixKwhTranche2: 75.34,
    redevanceRtiParKwh: 2.0,
    redevanceRtiPlafond: 2000,
    redevanceElecRuraleKwh: 1.06,
    taxeOrduresAbidjan: 2.5,
    taxeOrduresAutres: 1.0,
  },
  general_15A: {
    label: "Tarif Domestique Général 15A",
    primeFixeBimestre: 1779.84, // arrêté 1355, art. 5 (TTC ; HT × 1,18)
    prixKwhTranche1: 95.62,
    seuilTranche1: 594, // 180 × 3,3 kVA
    prixKwhTranche2: 82.86,
    redevanceRtiParKwh: 2.0,
    redevanceRtiPlafond: 2000,
    redevanceElecRuraleKwh: 1.06,
    taxeOrduresAbidjan: 2.5,
    taxeOrduresAutres: 1.0,
  },
};

// ── EAU (SODECI) ──────────────────────────────────────────
// Le tarif est PROGRESSIF par tranches de m³.
export interface TrancheEauDef {
  label: string;
  min: number; // m³ (inclus)
  max: number; // m³ (exclu, Infinity pour la dernière)
  prixM3: number; // FCFA TTC / m³ (part SODECI + FDE + FNE + taxes)
}

export const TRANCHES_SODECI: TrancheEauDef[] = [
  { label: "Forfaitaire", min: 0, max: 9, prixM3: 250.3 },
  { label: "Social", min: 9, max: 18, prixM3: 250.3 },
  { label: "Domestique", min: 18, max: 90, prixM3: 403.3 },
  { label: "Normal", min: 90, max: Infinity, prixM3: 664.0 },
];

export const ABONNEMENT_SODECI = {
  compteur15mm: 28443, // FCFA TTC
  avanceConso: 16500, // FCFA TTC remboursable
};

// ── MOTEUR DE CALCUL ──────────────────────────────────────

/** Calcule la facture électricité CIE pour une conso en kWh sur un bimestre. */
export function calculerFactureElec(
  consoKwh: number,
  regime: RegimeCIE,
  communeAbidjan: boolean,
): {
  primeFixe: number;
  consoTranche1: number;
  consoTranche2: number;
  montantTranche1: number;
  montantTranche2: number;
  redevanceRti: number;
  redevanceRurale: number;
  taxeOrdures: number;
  total: number;
} {
  const t = TARIFS_CIE[regime];
  const consoT1 = Math.min(consoKwh, t.seuilTranche1);
  const consoT2 = Math.max(0, consoKwh - t.seuilTranche1);

  const montantT1 = consoT1 * t.prixKwhTranche1;
  const montantT2 = consoT2 * t.prixKwhTranche2;

  const redevanceRti = Math.min(
    consoKwh * t.redevanceRtiParKwh,
    t.redevanceRtiPlafond,
  );
  const redevanceRurale = consoKwh * t.redevanceElecRuraleKwh;
  const taxeOrdures =
    consoKwh * (communeAbidjan ? t.taxeOrduresAbidjan : t.taxeOrduresAutres);

  const total =
    t.primeFixeBimestre +
    montantT1 +
    montantT2 +
    redevanceRti +
    redevanceRurale +
    taxeOrdures;

  return {
    primeFixe: t.primeFixeBimestre,
    consoTranche1: consoT1,
    consoTranche2: consoT2,
    montantTranche1: montantT1,
    montantTranche2: montantT2,
    redevanceRti,
    redevanceRurale,
    taxeOrdures,
    total,
  };
}

/** Calcule la facture eau SODECI pour une conso en m³ sur un bimestre. */
export function calculerFactureEau(consoM3: number): {
  details: { label: string; m3: number; prixM3: number; montant: number }[];
  total: number;
} {
  const details: {
    label: string;
    m3: number;
    prixM3: number;
    montant: number;
  }[] = [];
  let reste = consoM3;

  for (const tr of TRANCHES_SODECI) {
    if (reste <= 0) break;
    const dispo = tr.max - tr.min;
    const pris = Math.min(reste, dispo);
    if (pris > 0) {
      details.push({
        label: tr.label,
        m3: pris,
        prixM3: tr.prixM3,
        montant: pris * tr.prixM3,
      });
      reste -= pris;
    }
  }

  const total = details.reduce((s, d) => s + d.montant, 0);
  return { details, total };
}

/** Détecte le régime CIE à partir de la conso moyenne sur 3 bimestres. */
export function detecterRegimeCIE(consoMoyenneBimestre: number): RegimeCIE {
  if (consoMoyenneBimestre <= 200) return "social_5A";
  return "general_5A";
}
```

### 2.2 Mise à jour de `src/types.ts`

Ajoutez les champs nécessaires :

```ts
import type { TypeCompteur, RegimeCIE } from "./lib/tarifsCI";

export interface Meter {
  id: string;
  name: string;
  type: TypeCompteur; // 'eau' | 'electricite'
  unit: string; // 'm³' | 'kWh'
  regime?: RegimeCIE; // uniquement pour l'électricité
  communeAbidjan?: boolean; // pour la taxe ordures
  digits: number;
  // Optionnel : conservé pour compatibilité
  price?: number;
  abon?: number;
}
```

### 2.3 Mise à jour de `src/lib/calc.ts`

Remplacez le calcul de `cost` par un appel au moteur :

```ts
import {
  calculerFactureElec,
  calculerFactureEau,
  detecterRegimeCIE,
} from "./tarifsCI";
import type { Meter, Reading, EnrichedReading } from "../types";

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
      if (conso < 0) conso += Math.pow(10, meter.digits);

      const d1 = new Date(prev.date).getTime();
      const d2 = new Date(r.date).getTime();
      days = Math.round((d2 - d1) / 86400000);

      // ── Calcul selon le type de compteur ──
      if (meter.type === "electricite") {
        // La CIE facture par bimestre → on proratise la conso sur 60 jours
        const consoBimestre = days > 0 ? (conso * 60) / days : conso;
        const facture = calculerFactureElec(
          consoBimestre,
          meter.regime ?? "social_5A",
          meter.communeAbidjan ?? true,
        );
        // On proratise la facture sur la période réelle
        cost = days > 0 ? (facture.total * days) / 60 : facture.total;
      } else {
        // SODECI : la conso est déjà en m³
        const facture = calculerFactureEau(conso);
        cost = facture.total;
      }
    }

    return { ...r, conso, days, cost };
  });
}
```

### 2.4 Mise à jour de `src/pages/MetersPage.tsx`

Adaptez le formulaire d'ajout pour choisir le **type** et le **régime** :

```tsx
// Dans le state du formulaire :
const [form, setForm] = useState({
  name: "",
  type: "electricite" as "eau" | "electricite",
  regime: "social_5A" as RegimeCIE,
  communeAbidjan: "true",
  digits: "5",
});

// Dans le JSX, remplacez les champs prix/abon par :
<div>
  <label className="text-xs text-slate-500">Type de compteur</label>
  <select
    value={form.type}
    onChange={(e) =>
      setForm({ ...form, type: e.target.value as "eau" | "electricite" })
    }
    className={inputCls}
  >
    <option value="electricite">Électricité (CIE)</option>
    <option value="eau">Eau (SODECI)</option>
  </select>
</div>;

{
  form.type === "electricite" && (
    <>
      <div>
        <label className="text-xs text-slate-500">Régime CIE</label>
        <select
          value={form.regime}
          onChange={(e) =>
            setForm({ ...form, regime: e.target.value as RegimeCIE })
          }
          className={inputCls}
        >
          <option value="social_5A">Social 5A (≤ 200 kWh/bimestre)</option>
          <option value="general_5A">
            Général 5A (≤ 180×1,1 kWh/bimestre)
          </option>
          <option value="general_15A">Général 15A</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-500">Commune</label>
        <select
          value={form.communeAbidjan}
          onChange={(e) => setForm({ ...form, communeAbidjan: e.target.value })}
          className={inputCls}
        >
          <option value="true">Abidjan (taxe ordures 2,50 F/kWh)</option>
          <option value="false">Autres communes (1,00 F/kWh)</option>
        </select>
      </div>
    </>
  );
}

// À la soumission :
addMeter({
  name: form.name.trim(),
  type: form.type,
  unit: form.type === "eau" ? "m³" : "kWh",
  regime: form.type === "electricite" ? form.regime : undefined,
  communeAbidjan:
    form.type === "electricite" ? form.communeAbidjan === "true" : undefined,
  digits: parseInt(form.digits) || 5,
});
```

### 2.5 Affichage du coût dans `HistoryPage.tsx`

Ajoutez le **détail de la facture** pour transparence :

```tsx
// Dans la liste des relevés, après la conso :
{
  r.cost !== null && meter && (
    <div className="text-xs text-slate-500 mt-0.5">
      Coût estimé : {fmt(r.cost)} FCFA
      {meter.type === "electricite" && (
        <span> · {r.days} j (facturé par bimestre)</span>
      )}
    </div>
  );
}
```

Et un **KPI "Coût estimé"** en FCFA au lieu d'euros :

```tsx
<KPI label="Coût estimé" value={fmt(totals.cost)} unit="FCFA" />
```

---

## 3. Tableau de synthèse des tarifs (2025)

### Électricité — CIE

| Régime          | Prime fixe / bimestre | Tranche 1    | Tranche 2    | Seuil         |
| --------------- | --------------------- | ------------ | ------------ | ------------- |
| **Social 5A**   | 614,90 F              | 31,72 F/kWh  | 65,11 F/kWh  | 80 kWh        |
| **Général 5A**  | 1 618,04 F            | 86,92 F/kWh  | 75,34 F/kWh  | 180 × 1,1 kWh |
| **Général 15A** | 1 779,84 F            | 95,62 F/kWh  | 82,86 F/kWh  | 180 × 3,3 kWh |

**Taxes s'ajoutant par kWh** : RTI 2,00 F (plafonné 2 000 F/bim.), Électrification rurale 1,00-1,06 F, Ordures 2,50 F (Abidjan) ou 1,00 F (autres).

### Eau — SODECI

| Tranche     | Plage       | Prix indicatif / m³ |
| ----------- | ----------- | ------------------- |
| Forfaitaire | < 9 m³      | 250,30 F            |
| Social      | 9 – 18 m³   | 250,30 F            |
| Domestique  | 18 – 90 m³  | 403,30 F            |
| Normal      | > 90 m³     | 664 F               |

**Taxe spéciale eau** : 0 F (social), 27 F (domestique), 165 F (normal), 221 F (industriel) .

---

## 4. Prochaines étapes

1. **Remplacez** `src/lib/calc.ts`, `src/types.ts`, `src/pages/MetersPage.tsx` par les versions ci-dessus.
2. **Ajoutez** `src/lib/tarifsCI.ts`.
3. **Testez** avec un relevé fictif : 100 kWh sur 60 jours → facture ≈ 614,90 + 80×31,72 + 20×65,11 + 100×2 + 100×1 + 100×2,50 = **~4 400 FCFA**.
4. **Vérifiez** que le graphique et les KPI affichent bien des FCFA.

Souhaitez-vous que je génère la **version complète et finale** de tous les fichiers modifiés (prêts à copier), ou que j'ajoute la **détection automatique du régime CIE** (bascule social → général si dépassement sur 3 bimestres) ?
