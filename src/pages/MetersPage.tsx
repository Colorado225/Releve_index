import { useRef, useState } from "react";
import { useStore } from "../store";
import { Card } from "../components/Card";
import { Icon, meterIconName } from "../components/Icon";
import { useToast } from "../components/Toast";
import { Field } from "../components/Field";
import { Select } from "../components/Select";
import { Input } from "../components/Input";
import { deletePhotos } from "../lib/photos";
import { describeTariff } from "../lib/billing";
import type { Meter } from "../types";
import type {
  ModeFacturation,
  RegimeCIE,
  TypeCompteur,
} from "../lib/tarifsCI";

type MeterForm = {
  name: string;
  unit: string;
  price: string;
  abon: string;
  digits: string;
  billing: ModeFacturation;
  type: TypeCompteur;
  regime: RegimeCIE;
  puissance: string;
  communeAbidjan: string;
  zoneRurale: string;
  anchorDate: string; // YYYY-MM-DD, vide = ancré au 1er relevé
};

const EMPTY_FORM: MeterForm = {
  name: "",
  unit: "kWh",
  price: "",
  abon: "",
  digits: "6",
  billing: "lineaire",
  type: "electricite",
  regime: "social_5A",
  puissance: "",
  communeAbidjan: "true",
  zoneRurale: "true",
  anchorDate: "",
};

/** Puissance contractuelle usuelle du régime (préremplissage modifiable). */
const PUISSANCE_PAR_REGIME: Record<RegimeCIE, string> = {
  social_5A: "1.1",
  general_5A: "1.1",
  general_15A: "3.3",
  general_20A: "4.4", // 20A = 4.4 kVA (220V × 20A)
};

export function MetersPage() {
  const { showToast } = useToast();
  const { meters, readings, addMeter, removeMeter, importData } = useStore();
  const [form, setForm] = useState<MeterForm>(EMPTY_FORM);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!form.name.trim()) return;
    const tarifCI = form.billing === "tarif-ci";

    const base: Omit<Meter, "id"> = {
      name: form.name.trim(),
      // Le barème officiel impose son unité ; sinon champ libre historique.
      unit: tarifCI
        ? form.type === "eau"
          ? "m³"
          : "kWh"
        : form.unit.trim() || "u",
      digits: parseInt(form.digits) || 5,
      billing: form.billing,
    };

    const tariffFields: Partial<Meter> = tarifCI
      ? form.type === "electricite"
        ? {
          type: "electricite",
          regime: form.regime,
          // Non renseignée → `undefined` : le régime impose sa puissance usuelle
          // (1,1 kVA pour 5A, 3,3 kVA pour 15A) via `seuilKwhBimestre`.
          puissanceSouscrite:
            form.puissance.trim() === ""
              ? undefined
              : parseFloat(form.puissance) || undefined,
          communeAbidjan: form.communeAbidjan === "true",
          zoneRurale: form.zoneRurale === "true",
          // Vide → les cycles seront calés sur le premier relevé.
          anchorDate: form.anchorDate || undefined,
        }
        : { type: "eau", price: 0, abon: 0 }
      : {
        price: parseFloat(form.price) || 0,
        abon: parseFloat(form.abon) || 0,
      };

    addMeter({ ...base, ...tariffFields });
    setForm(EMPTY_FORM);
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
        showToast("Fichier invalide.", "error");
      }
      if (fileRef.current) fileRef.current.value = "";
    };
    fr.readAsText(file);
  };

  return (
    <>
      <Card title="Mes compteurs" icon="gauge">
        {meters.length === 0 && (
          <p className="text-sm text-slate-500">Aucun compteur.</p>
        )}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {meters.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">
                  <Icon name={meterIconName(m)} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{m.name}</div>
                  <div className="truncate text-[11px] text-slate-500">
                    {describeTariff(m)}
                    {` · ${m.digits} chiffres`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  const meterReadings = readings.filter(
                    (r) => r.meterId === m.id,
                  );
                  if (
                    meterReadings.length > 0 &&
                    !confirm("Ce compteur a des relevés. Tout supprimer ?")
                  )
                    return;
                  // Supprime aussi les photos associées (IndexedDB).
                  deletePhotos(
                    meterReadings.flatMap((r) => r.photos ?? []),
                  );
                  removeMeter(m.id);
                }}
                aria-label="Supprimer le compteur"
                className="shrink-0 rounded-lg p-2 text-slate-300 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
              >
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Ajouter un compteur" icon="plus">
        <div className="space-y-3">
          <Field label="Nom">
            <Input
              placeholder="ex : Gaz"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
            />
          </Field>
          <Field label="Facturation">
            <Select
              value={form.billing}
              onChange={(v) => setForm({ ...form, billing: v as ModeFacturation })}
              options={[
                { value: "lineaire", label: "Tarif unitaire (personnalisé)" },
                { value: "tarif-ci", label: "Barème officiel CIE / SODECI" },
              ]}
            />
          </Field>

          {form.billing === "lineaire" ? (
            <>
              <Field label="Unité">
                <Input
                  placeholder="ex : m³, kWh, L"
                  value={form.unit}
                  onChange={(v) => setForm({ ...form, unit: v })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prix unitaire (FCFA)">
                  <Input
                    type="number"
                    step="1"
                    placeholder="0"
                    value={form.price}
                    onChange={(v) => setForm({ ...form, price: v })}
                  />
                </Field>
                <Field label="Abonnement (FCFA/mois)">
                  <Input
                    type="number"
                    step="1"
                    placeholder="0"
                    value={form.abon}
                    onChange={(v) => setForm({ ...form, abon: v })}
                  />
                </Field>
              </div>
            </>
          ) : (
            <>
              <Field label="Type de compteur">
                <Select
                  value={form.type}
                  onChange={(v) => setForm({ ...form, type: v as TypeCompteur })}
                  options={[
                    { value: "electricite", label: "Électricité (CIE)" },
                    { value: "eau", label: "Eau (SODECI)" },
                  ]}
                />
              </Field>
              <p className="text-[11px] text-slate-500">
                Unité fixée à {form.type === "eau" ? "m³" : "kWh"} · le barème
                s'applique aux relevés facturés.
              </p>

              {form.type === "electricite" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Régime CIE">
                      <Select
                        value={form.regime}
                        onChange={(v) =>
                          setForm({
                            ...form,
                            regime: v as RegimeCIE,
                            puissance: PUISSANCE_PAR_REGIME[v as RegimeCIE] ?? "",
                          })
                        }
                        options={[
                          { value: "social_5A", label: "Social 5A" },
                          { value: "general_5A", label: "Général 5A" },
                          { value: "general_15A", label: "Général 15A" },
                          { value: "general_20A", label: "Général 20A" },
                        ]}
                      />
                    </Field>
                    <Field label="Puissance (kVA)">
                      <Input
                        type="number"
                        step="0.1"
                        placeholder={PUISSANCE_PAR_REGIME[form.regime]}
                        value={form.puissance}
                        onChange={(v) => setForm({ ...form, puissance: v })}
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Commune">
                      <Select
                        value={form.communeAbidjan}
                        onChange={(v) =>
                          setForm({ ...form, communeAbidjan: v })
                        }
                        options={[
                          { value: "true", label: "Abidjan (2,50 F/kWh)" },
                          { value: "false", label: "Autres (1,00 F/kWh)" },
                        ]}
                      />
                    </Field>
                    <Field label="Zone">
                      <Select
                        value={form.zoneRurale}
                        onChange={(v) => setForm({ ...form, zoneRurale: v })}
                        options={[
                          { value: "true", label: "Rurale (redevance)" },
                          { value: "false", label: "Urbaine" },
                        ]}
                      />
                    </Field>
                  </div>
                  <Field label="Ancrage des cycles (date du contrat)">
                    <Input
                      type="date"
                      value={form.anchorDate}
                      onChange={(v) => setForm({ ...form, anchorDate: v })}
                    />
                  </Field>
                  <p className="text-[11px] text-slate-500">
                    Découpe la facturation en bimestres calés sur cette date.
                    Vide = calé sur le premier relevé.
                  </p>
                </>
              )}
            </>
          )}
          <Field label="Nombre de chiffres du compteur">
            <Input
              type="number"
              placeholder="5"
              value={form.digits}
              onChange={(v) => setForm({ ...form, digits: v })}
            />
          </Field>
          <button
            onClick={handleAdd}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 py-3 font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:from-teal-700 hover:to-emerald-600 active:scale-[.99]"
          >
            <Icon name="plus" className="h-5 w-5" />
            Ajouter
          </button>
        </div>
      </Card>

      <Card title="Sauvegarde" icon="download">
        <button
          onClick={exportJSON}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 py-3 font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:from-teal-700 hover:to-emerald-600 active:scale-[.99]"
        >
          <Icon name="download" className="h-5 w-5" />
          Exporter les données (JSON)
        </button>
        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-3 text-sm font-medium text-slate-600 transition hover:border-teal-500 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <Icon name="upload" className="h-4 w-4" />
          Restaurer un fichier JSON
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
      </Card>
    </>
  );
}