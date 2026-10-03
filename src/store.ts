import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Meter, Reading } from "./types";
import { uid } from "./lib/uid";
import { inferTypeCompteur } from "./lib/tarifsCI";

interface State {
  meters: Meter[];
  readings: Reading[];
  addMeter: (m: Omit<Meter, "id">) => void;
  removeMeter: (id: string) => void;
  addReading: (r: Omit<Reading, "id"> & { id?: string }) => string;
  removeReading: (id: string) => void;
  removeReadingPhoto: (readingId: string, photoId: string) => void;
  importData: (data: { meters: Meter[]; readings: Reading[] }) => void;
}

// Compteurs par défaut — montants en francs CFA (XOF).
const defaultMeters: Meter[] = [
  { id: "eau", name: "Eau", unit: "m³", price: 400, abon: 0, digits: 5 },
  {
    id: "elec",
    name: "Électricité",
    unit: "kWh",
    price: 99,
    abon: 0,
    digits: 6,
  },
];

// ── Versioning du stockage local ────────────────────────────────────────────
// Clé unique et stable + numéro de version : la façon idiomatique et
// pérenne de gérer les évolutions de schéma. Les anciennes clés sont adoptées
// automatiquement et ne sont jamais supprimées.
// Parité fixe du franc CFA : 1 EUR = 655,957 XOF.
const EUR_TO_FCFA = 655.957;
export const STORAGE_KEY = "releve-index";
export const STATE_VERSION = 4;
const LEGACY_FCFA_KEY = "releve-index-v2"; // prix déjà en FCFA
const LEGACY_EUR_KEY = "releve-index-v1"; // prix en euros

// Sous-ensemble de l'API Storage suffisant (facilite les tests unitaires).
type StorageLike = Pick<Storage, "getItem" | "setItem">;

// Partie du state réellement persistée (les méthodes ne sont pas sérialisées).
export type PersistedState = { meters: Meter[]; readings: Reading[] };

function parseLegacy(raw: string | null): PersistedState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { state?: Partial<PersistedState> };
    const state = parsed.state;
    if (!state || !Array.isArray(state.meters)) return null;
    return {
      meters: state.meters,
      readings: Array.isArray(state.readings) ? state.readings : [],
    };
  } catch {
    return null;
  }
}

/**
 * Adopte les données des clés héritées vers la clé courante « releve-index ».
 * - v2 : les prix sont déjà en FCFA → copie directe.
 * - v1 : les prix sont en euros → conversion via la parité fixe 655,957.
 * Ne fait rien si la clé courante existe déjà. Aucune donnée n'est supprimée.
 * @returns true si une adoption a eu lieu.
 */
export function adoptLegacy(storage: StorageLike): boolean {
  // VÉRIFICATION CRITIQUE : ne JAMAIS écraser des données existantes
  const existingData = storage.getItem(STORAGE_KEY);
  if (existingData) {
    try {
      const parsed = JSON.parse(existingData);
      if (
        parsed?.state?.readings?.length > 0 ||
        parsed?.state?.meters?.length > 0
      ) {
        console.log(
          `📦 [Store] Données existantes présentes, adoption legacy ignorée`,
        );
        return false;
      }
    } catch (e) {
      // Si les données existantes sont corrompues, on continue l'adoption
      console.log(
        `⚠️ [Store] Données existantes corrompues, tentative d'adoption legacy`,
      );
    }
  }

  const fcfa = parseLegacy(storage.getItem(LEGACY_FCFA_KEY));
  if (fcfa) {
    console.log(`♻️ [Store] Adoption des données legacy FCFA...`);
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          meters: fcfa.meters.map(normalizeMeter),
          readings: fcfa.readings,
        },
        version: STATE_VERSION,
      }),
    );
    return true;
  }

  const eur = parseLegacy(storage.getItem(LEGACY_EUR_KEY));
  if (!eur) return false;

  console.log(`♻️ [Store] Adoption des données legacy EUR...`);
  const meters: Meter[] = eur.meters.map((m) =>
    normalizeMeter({
      ...m,
      price: Math.round((m.price ?? 0) * EUR_TO_FCFA),
      abon: Math.round((m.abon ?? 0) * EUR_TO_FCFA),
    }),
  );
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      state: { meters, readings: eur.readings },
      version: STATE_VERSION,
    }),
  );
  return true;
}

// Fonction de diagnostic pour déboguer les problèmes de persistance
export function debugStorage() {
  if (typeof localStorage === "undefined") return;
  console.log(`🔍 [Debug] État du localStorage:`);
  console.log(
    `  - Clé principale (${STORAGE_KEY}):`,
    localStorage.getItem(STORAGE_KEY) ? "✅ Présente" : "❌ Absente",
  );
  console.log(
    `  - Legacy v2 (${LEGACY_FCFA_KEY}):`,
    localStorage.getItem(LEGACY_FCFA_KEY) ? "✅ Présente" : "❌ Absente",
  );
  console.log(
    `  - Legacy v1 (${LEGACY_EUR_KEY}):`,
    localStorage.getItem(LEGACY_EUR_KEY) ? "✅ Présente" : "❌ Absente",
  );

  const current = localStorage.getItem(STORAGE_KEY);
  if (current) {
    try {
      const parsed = JSON.parse(current);
      console.log(
        `  - Nombre de lectures:`,
        parsed?.state?.readings?.length || 0,
      );
      console.log(
        `  - Nombre de compteurs:`,
        parsed?.state?.meters?.length || 0,
      );
      console.log(`  - Version:`, parsed?.version);
    } catch (e) {
      console.log(`  - ⚠️ Données corrompues`);
    }
  }
}

/**
 * Normalise un compteur — **idempotente** (appelée par la migration v4, par
 * `adoptLegacy` et par `importData`).
 *
 * - `type` : inféré de l'unité si absent (m³ → eau, kWh → électricité).
 * - `billing` : verrouillé sur `"lineaire"` si absent. **C'est le garde-fou**
 *   de la mue : adopter une version de schéma ne doit jamais réécrire
 *   silencieusement le coût des relevés historiques. Le passage aux barèmes
 *   CIE/SODECI reste un choix explicite de l'utilisateur.
 * - `price` / `abon` : ramenés à des nombres (les champs sont optionnels
 *   depuis v4 pour les compteurs au barème officiel, qui n'en ont pas besoin).
 */
export function normalizeMeter(m: Meter): Meter {
  return {
    ...m,
    type: m.type ?? inferTypeCompteur(m.unit),
    billing: m.billing ?? "lineaire",
    price: m.price ?? 0,
    abon: m.abon ?? 0,
  };
}

// Migration interne (même clé, versions futures) : garantit la forme du state.
// v3 → v4 : champs de facturation tarifaire. Idempotente → sûre pour tout
// état persisté, quelle que soit la version d'origine.
// ⚠️ Correction critique : on préserve les readings existants !
export function migratePersisted(persisted: unknown): PersistedState {
  const s = (persisted ?? {}) as Partial<PersistedState>;
  const meters = Array.isArray(s.meters) ? s.meters : defaultMeters;
  // PRÉSERVER les lectures existantes — ne JAMAIS renvoyer [] par défaut si des données existent
  const readings =
    Array.isArray(s.readings) && s.readings.length > 0
      ? s.readings
      : Array.isArray(s.readings)
        ? s.readings
        : [];
  return {
    meters: meters.map(normalizeMeter),
    readings,
  };
}

// Exécutée avant la création du store : la clé courante est prête dès le
// premier rendu, quel que soit l'historique local.
if (typeof localStorage !== "undefined") adoptLegacy(localStorage);

export const useStore = create<State>()(
  persist<State, [], [], PersistedState>(
    (set) => ({
      meters: defaultMeters,
      readings: [],
      addMeter: (m) =>
        set((s) => ({
          meters: [...s.meters, normalizeMeter({ ...m, id: uid() })],
        })),
      removeMeter: (id) =>
        set((s) => ({
          meters: s.meters.filter((m) => m.id !== id),
          readings: s.readings.filter((r) => r.meterId !== id),
        })),
      addReading: (r) => {
        const id = r.id ?? uid();
        set((s) => ({ readings: [...s.readings, { ...r, id }] }));
        return id;
      },
      removeReading: (id) =>
        set((s) => ({ readings: s.readings.filter((r) => r.id !== id) })),
      removeReadingPhoto: (readingId, photoId) =>
        set((s) => ({
          readings: s.readings.map((r) =>
            r.id === readingId
              ? { ...r, photos: (r.photos ?? []).filter((p) => p !== photoId) }
              : r,
          ),
        })),
      importData: (data) =>
        set(() => ({
          meters: data.meters.map(normalizeMeter),
          readings: data.readings,
        })),
    }),
    {
      name: STORAGE_KEY,
      version: STATE_VERSION,
      storage: {
        getItem: (name) => {
          try {
            const item = localStorage.getItem(name);
            if (item) {
              const parsed = JSON.parse(item);
              console.log(
                `📦 [Store] Chargement de localStorage: ${parsed?.state?.readings?.length || 0} lectures trouvées`,
              );
            } else {
              console.log(`📦 [Store] Aucune donnée trouvée dans localStorage`);
            }
            return item ? JSON.parse(item) : null;
          } catch (e) {
            console.error(`❌ [Store] Erreur lecture localStorage:`, e);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
            console.log(
              `💾 [Store] Sauvegarde dans localStorage: ${value.state?.readings?.length || 0} lectures`,
            );
          } catch (e) {
            console.error(`❌ [Store] Erreur écriture localStorage:`, e);
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      // Seules les données sont persistées (pas les méthodes du store).
      partialize: (s): PersistedState => ({
        meters: s.meters,
        readings: s.readings,
      }),
      migrate: (persisted) => {
        console.log(`🔄 [Store] Migration des données...`);
        const result = migratePersisted(persisted);
        console.log(
          `✅ [Store] Migration terminée: ${result.readings.length} lectures préservées`,
        );
        return result;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log(
            `🎉 [Store] Hydratation terminée: ${state.readings.length} lectures chargées`,
          );
        } else {
          console.log(`⚠️ [Store] Aucun état à hydrater`);
        }
      },
    },
  ),
);
