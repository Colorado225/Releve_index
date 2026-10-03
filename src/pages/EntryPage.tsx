import { useMemo, useState } from "react";
import { useStore } from "../store";
import { Card } from "../components/Card";
import { Icon, meterIconName, type IconName } from "../components/Icon";
import { PhotoField } from "../components/PhotoField";
import { Field } from "../components/Field";
import { Input } from "../components/Input";
import { fmt, todayISO } from "../lib/format";
import { enrichReadings } from "../lib/calc";
import { compressImage } from "../lib/image";
import { savePhoto } from "../lib/photos";
import { uid } from "../lib/uid";
import type { Meter } from "../types";

export function EntryPage() {
  const { meters, readings, addReading } = useStore();
  const [meterId, setMeterId] = useState(meters[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const [index, setIndex] = useState("");
  const [note, setNote] = useState("");
  const [rechargeAmount, setRechargeAmount] = useState(""); // Montant rechargé (pour CIE)
  const [photos, setPhotos] = useState<File[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  // Robustesse : si le compteur sélectionné a été supprimé, on retombe sur le 1er
  const effectiveId = meters.some((m) => m.id === meterId)
    ? meterId
    : (meters[0]?.id ?? "");
  const meter = meters.find((m) => m.id === effectiveId);

  const list = useMemo(
    () => (meter ? enrichReadings(meter, readings) : []),
    [meter, readings],
  );
  const last = list[list.length - 1] ?? null;
  const prev = list.length > 1 ? list[list.length - 2] : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meter || !date || index === "") return;

    const readingId = uid();
    const photoIds = photos.map(() => uid());

    addReading({
      id: readingId,
      meterId: effectiveId,
      date,
      index: parseFloat(index),
      note: note.trim() || undefined,
      photos: photoIds.length ? photoIds : undefined,
      rechargeAmount: rechargeAmount ? parseFloat(rechargeAmount) : undefined,
    });

    // Les photos (compressées) sont stockées dans IndexedDB, pas dans le store.
    await Promise.all(
      photos.map(async (f, i) => {
        try {
          const blob = await compressImage(f);
          await savePhoto(photoIds[i], blob, date);
        } catch {
          /* image illisible : on l'ignore */
        }
      }),
    );

    setIndex("");
    setNote("");
    setPhotos([]);
    setMsg("Relevé enregistré");
    setTimeout(() => setMsg(null), 1800);
  };

  return (
    <>
      <Card title="Nouveau relevé" icon="pencil">
        <form onSubmit={submit} className="space-y-4">
          <MeterChips
            meters={meters}
            value={effectiveId}
            onChange={setMeterId}
          />

          <Field label="Date du relevé">
            <div className="relative">
              <Icon
                name="calendar"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <Input
                type="date"
                value={date}
                onChange={setDate}
                className="pl-10"
              />
            </div>
          </Field>

          <Field label={`Index ${meter ? `(${meter.unit})` : ""}`}>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={index}
              onChange={(e) => setIndex(e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 text-center font-mono text-3xl font-semibold tracking-wider text-slate-900 placeholder-slate-300 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-600"
            />
          </Field>

          {/* Champ de rechargement uniquement pour les compteurs CIE (électricité) */}
          {meter?.unit === "kWh" && (
            <Field label="Montant rechargé (FCFA, optionnel)" helper="Renseignez le montant de votre recharge si vous avez rechargé votre carte">
              <Input
                type="number"
                step="any"
                value={rechargeAmount}
                onChange={setRechargeAmount}
                placeholder="ex : 5000"
              />
            </Field>
          )}

          <Field label="Note (optionnel)">
            <Input
              type="text"
              value={note}
              onChange={setNote}
              placeholder="ex : relevé de contrôle"
            />
          </Field>

          <PhotoField
            files={photos}
            onAdd={(list) => setPhotos((prev) => [...prev, ...list])}
            onRemove={(i) =>
              setPhotos((prev) => prev.filter((_, idx) => idx !== i))
            }
          />

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 py-3.5 font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:from-teal-700 hover:to-emerald-600 active:scale-[.99]"
          >
            <Icon name="check" className="h-5 w-5" />
            Enregistrer
          </button>
        </form>
      </Card>

      {meter && (
        <Card
          title={`Dernier état · ${meter.name}`}
          icon={meterIconName(meter)}
          className="animate-fade-up"
        >
          {!last ? (
            <EmptyState icon="clock" text="Aucun relevé pour ce compteur." />
          ) : (
            <div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="font-mono text-3xl font-bold tracking-tight">
                    {fmt(last.index)}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {last.date} · {meter.unit}
                  </div>
                </div>
                {last.conso !== null && (
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <Icon name="chart" className="h-3.5 w-3.5" />
                      +{fmt(last.conso)}
                    </span>
                    <div className="mt-1 text-[11px] text-slate-500">
                      sur {last.days} j
                    </div>
                  </div>
                )}
              </div>
              {prev && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60">
                  <Icon name="clock" className="h-3.5 w-3.5" />
                  Index précédent :{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {fmt(prev.index)} {meter.unit}
                  </span>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {msg && (
        <div className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 animate-toast-in">
          <div className="flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl dark:bg-white dark:text-slate-900">
            <Icon
              name="check"
              className="h-4 w-4 text-emerald-400 dark:text-emerald-600"
            />
            {msg}
          </div>
        </div>
      )}
    </>
  );
}

function MeterChips({
  meters,
  value,
  onChange,
}: {
  meters: Meter[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-500">
        Compteur
      </label>
      <div className="flex flex-wrap gap-2">
        {meters.length === 0 && (
          <p className="text-sm text-slate-500">
            Aucun compteur — ajoutez-en un dans l'onglet Compteurs.
          </p>
        )}
        {meters.map((m) => {
          const active = value === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${active
                ? "border-teal-600 bg-teal-600 text-white shadow-sm shadow-teal-600/30"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
            >
              <Icon name={meterIconName(m)} className="h-4 w-4" />
              {m.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: IconName; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <Icon
        name={icon}
        className="h-8 w-8 text-slate-300 dark:text-slate-600"
      />
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}