import { useMemo, useState } from "react";
import { useStore } from "../store";
import { Card } from "../components/Card";
import { CollapsibleCard } from "../components/CollapsibleCard";
import { BarChart } from "../components/BarChart";
import { Icon, type IconName } from "../components/Icon";
import { Field } from "../components/Field";
import { Select } from "../components/Select";
import { PhotoModal, PhotoThumb } from "../components/PhotoModal";
import { fmt, fmtFCFA } from "../lib/format";
import { detectLeak, enrichReadings } from "../lib/calc";
import { describeTariff, formatLine } from "../lib/billing";
import {
  REGLE_BASCULE_FR,
  anchorFor,
  consoParCycles,
  cycleCourant,
  cycleForDate,
  formatCycle,
} from "../lib/cycles";
import { buildPdf } from "../lib/pdf";
import { buildSummaryReport, buildSingleMeterReport } from "../lib/report";
import { useSettings } from "../lib/settings";
import { deletePhotos } from "../lib/photos";

export function HistoryPage() {
  const { meters, readings, removeReading, removeReadingPhoto } = useStore();
  const [meterId, setMeterId] = useState(meters[0]?.id ?? "");
  const [openPhoto, setOpenPhoto] = useState<{
    photoId: string;
    readingId: string;
  } | null>(null);

  // Robustesse : si le compteur sélectionné a été supprimé, on retombe sur le 1er
  const effectiveId = meters.some((m) => m.id === meterId)
    ? meterId
    : (meters[0]?.id ?? "");
  const meter = meters.find((m) => m.id === effectiveId);

  const list = useMemo(
    () => (meter ? enrichReadings(meter, readings) : []),
    [meter, readings],
  );
  const reversed = [...list].reverse();

  // Phase des cycles de facturation (ancrage du contrat, sinon 1er relevé).
  const anchor = meter ? anchorFor(meter, list.map((r) => r.date)) : "";

  const totals = useMemo(() => {
    const withConso = list.filter((r) => r.conso !== null);
    const totalConso = withConso.reduce((s, r) => s + (r.conso ?? 0), 0);
    const totalDays = withConso.reduce((s, r) => s + (r.days ?? 0), 0) || 1;
    const daily = totalConso / totalDays;
    // Somme des factures par période (moteur tarifaire), pas une formule
    // linéaire codée en dur : barème officiel si le compteur en a un.
    const cost = withConso.reduce((s, r) => s + (r.cost ?? 0), 0);

    // Calcul du crédit restant pour les compteurs CIE (électricité)
    const totalRecharged = list.reduce((s, r) => s + (r.rechargeAmount ?? 0), 0);
    const remainingCredit = totalRecharged - cost;
    const estimatedDaysLeft = daily > 0 && meter?.price ? remainingCredit / (daily * meter.price) : 0;

    // Calcul de la date estimée de prochaine recharge
    const today = new Date();
    const estimatedRechargeDate = new Date(today.getTime() + estimatedDaysLeft * 24 * 60 * 60 * 1000);
    const formattedRechargeDate = estimatedRechargeDate.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    // Comparaison avec les moyennes nationales ivoiriennes
    // CIE : ~110 kWh/mois | SODECI : ~15 m³/mois pour un foyer standard
    const monthsCount = totalDays > 0 ? totalDays / 30.44 : 1; // moyenne des jours par mois
    const userMonthlyAvg = monthsCount > 0 ? totalConso / monthsCount : 0;
    const isElectricity = meter?.unit === "kWh";
    const nationalAvg = isElectricity ? 110 : (meter?.unit === "m³" ? 15 : 0);
    const percentDiff = nationalAvg > 0 ? ((userMonthlyAvg - nationalAvg) / nationalAvg) * 100 : 0;
    const isAbove = percentDiff > 10; // +10% au-dessus de la moyenne
    const isBelow = percentDiff < -10; // -10% en dessous
    const status = isAbove ? "above" : isBelow ? "below" : "average";

    return {
      totalConso,
      daily,
      cost,
      userMonthlyAvg,
      nationalAvg,
      percentDiff,
      status,
      totalRecharged,
      remainingCredit,
      estimatedDaysLeft,
      formattedRechargeDate
    };
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

  const leakWindowMonths = useSettings((s) => s.leakWindowMonths);
  const leakFactor = useSettings((s) => s.leakFactor);

  // Alerte « fuite » : conso/jour du dernier relevé vs médiane des N mois.
  const leak = useMemo(
    () =>
      detectLeak(list, {
        windowMonths: leakWindowMonths,
        factor: leakFactor,
      }),
    [list, leakWindowMonths, leakFactor],
  );

  // Conso du cycle bimestriel EN COURS : KPI ancré sur le cycle de
  // facturation (ancrage du contrat), pas sur le mois calendaire.
  const cycleNow = useMemo(() => {
    if (!meter || !anchor) return null;
    const intervalles = list
      .filter((r) => r.conso !== null)
      .map((r) => ({ date: r.date, conso: r.conso as number }));
    const current = cycleCourant(anchor);
    const found = consoParCycles(intervalles, anchor).find(
      (c) => c.index === current.index,
    );
    return { cycle: current, conso: found?.conso ?? 0 };
  }, [list, anchor, meter]);



  // Récapitulatif PDF de tous les compteurs (généré localement, sans dépendance).
  const exportPDF = () => {
    const bytes = buildPdf(buildSummaryReport(meters, readings));
    const url = URL.createObjectURL(
      new Blob([bytes], { type: "application/pdf" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "releve-index-recapitulatif.pdf";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // PDF d'un seul compteur sélectionné
  const exportSingleMeterPDF = () => {
    if (!meter) return;
    const bytes = buildPdf(buildSingleMeterReport(meter, readings));
    const url = URL.createObjectURL(
      new Blob([bytes], { type: "application/pdf" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meter.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-releves.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <Card title="Compteur" icon="gauge">
        <Field label="Sélectionner un compteur">
          <Select
            value={effectiveId}
            onChange={(value) => setMeterId(value)}
            options={meters.map((m) => ({
              value: m.id,
              label: `${m.name} (${m.unit})`
            }))}
            placeholder="Choisissez un compteur"
          />
        </Field>
        {meter && (
          <p className="mt-2 text-[11px] text-slate-500">
            {describeTariff(meter)}
          </p>
        )}
      </Card>

      {meter && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KPI
              label="Conso totale"
              value={fmt(totals.totalConso)}
              unit={meter.unit}
              icon="chart"
              tone="bg-sky-500"
            />
            <KPI
              label="Moyenne / j"
              value={fmt(totals.daily)}
              unit={`${meter.unit}/j`}
              icon="clock"
              tone="bg-violet-500"
            />
            <KPI
              label="Coût estimé"
              value={fmt(totals.cost, 0)}
              unit="FCFA"
              icon="banknote"
              tone="bg-amber-500"
            />
            <KPI
              label="Cycle en cours"
              value={fmt(cycleNow?.conso ?? 0)}
              unit={
                cycleNow
                  ? `${meter.unit} · ${formatCycle(cycleNow.cycle)}`
                  : meter.unit
              }
              icon="calendar"
              tone="bg-teal-500"
            />
          </div>

          {/* KPI supplémentaires pour les compteurs CIE (électricité à carte) */}
          {meter.unit === "kWh" && totals.totalRecharged > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mt-3">
              <KPI
                label="Total rechargé"
                value={fmtFCFA(totals.totalRecharged)}
                unit=""
                icon="creditcard"
                tone="bg-blue-500"
              />
              <KPI
                label="Crédit restant"
                value={fmtFCFA(Math.max(totals.remainingCredit, 0))}
                unit=""
                icon="wallet"
                tone={totals.remainingCredit < 5000 ? "bg-red-500" : "bg-emerald-500"}
              />
              <KPI
                label="Jours restants estimés"
                value={Math.max(Math.round(totals.estimatedDaysLeft), 0).toString()}
                unit="j"
                icon="timer"
                tone={totals.estimatedDaysLeft < 7 ? "bg-red-500" : "bg-teal-500"}
              />
              <KPI
                label="Prochaine recharge estimée"
                value={totals.formattedRechargeDate}
                unit=""
                icon="calendar"
                tone={totals.estimatedDaysLeft < 7 ? "bg-red-500" : "bg-orange-500"}
              />
            </div>
          )}

          {/* Comparaison avec la moyenne nationale */}
          <CollapsibleCard
            title="Comparaison moyenne nationale"
            icon="scale"
            action={
              <span className="text-[11px] px-2 py-1 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-400">
                {totals.status === "below" ? "Économe" : totals.status === "above" ? "Surconsommation" : "Moyenne"}
              </span>
            }
            defaultOpen={false}
          >
            <div className="mt-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-600 dark:text-slate-400">Votre moyenne mensuelle</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {totals.userMonthlyAvg.toFixed(1)} {meter?.unit}
                </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-600 dark:text-slate-400">Moyenne nationale ivoirienne</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {totals.nationalAvg} {meter?.unit}
                </span>
              </div>

              {/* Barre de comparaison visuelle */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 mb-3">
                <div
                  className={`h-4 rounded-full transition-all ${totals.status === "below" ? "bg-emerald-500" :
                    totals.status === "above" ? "bg-red-500" : "bg-teal-500"
                    }`}
                  style={{ width: `${Math.min(Math.abs(totals.percentDiff) + 50, 100)}%` }}
                />
              </div>

              <p className={`text-sm font-medium ${totals.status === "below" ? "text-emerald-600 dark:text-emerald-400" :
                totals.status === "above" ? "text-red-600 dark:text-red-400" :
                  "text-teal-600 dark:text-teal-400"
                }`}>
                {totals.status === "below" && `✅ Vous consommez ${Math.abs(totals.percentDiff).toFixed(0)}% de moins que la moyenne, bravo !`}
                {totals.status === "above" && `⚠️ Vous consommez ${totals.percentDiff.toFixed(0)}% de plus que la moyenne nationale.`}
                {totals.status === "average" && `👍 Votre consommation est dans la moyenne nationale.`}
              </p>
            </div>
          </CollapsibleCard>

          {leak && (
            <CollapsibleCard
              title="Alerte fuite potentielle"
              icon="alert"
              action={
                <span className="text-[11px] px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400">
                  Critique
                </span>
              }
              defaultOpen={true}
            >
              <div className="flex items-start gap-3">
                <div className="text-sm">
                  <p className="font-semibold text-amber-800 dark:text-amber-300">
                    Consommation inhabituelle détectée
                  </p>
                  <p className="mt-0.5 text-amber-700 dark:text-amber-400/90">
                    {fmt(leak.ratio, 1)}× la normale sur {leakWindowMonths} mois
                    (relevé du {leak.date}). Vérifiez une éventuelle fuite.
                  </p>
                </div>
              </div>
            </CollapsibleCard>
          )}

          {/* Carte de comparaison avec les moyennes nationales */}
          {totals.nationalAvg > 0 && (
            <Card title="Comparaison nationale" icon="scale">
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Votre moyenne mensuelle</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {fmt(totals.userMonthlyAvg)} {meter?.unit}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Moyenne nationale (foyer)</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {totals.nationalAvg} {meter?.unit}
                  </span>
                </div>
                <div className="mt-6">
                  <div className="flex items-center gap-3">
                    <div className={`flex-1 h-3 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700`}>
                      <div
                        className={`h-full rounded-full transition-all ${totals.status === "above" ? "bg-red-500" :
                          totals.status === "below" ? "bg-green-500" : "bg-teal-500"
                          }`}
                        style={{ width: `${Math.min(Math.max((totals.userMonthlyAvg / totals.nationalAvg) * 100, 5), 200)}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium w-16 text-right ${totals.status === "above" ? "text-red-600 dark:text-red-400" :
                      totals.status === "below" ? "text-green-600 dark:text-green-400" : "text-teal-600 dark:text-teal-400"
                      }`}>
                      {totals.percentDiff > 0 ? "+" : ""}{fmt(totals.percentDiff, 0)}%
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    {totals.status === "above"
                      ? "Votre consommation est supérieure à la moyenne nationale. Vous pourriez réaliser des économies !"
                      : totals.status === "below"
                        ? "Bravo ! Votre consommation est inférieure à la moyenne nationale."
                        : "Votre consommation est dans la moyenne nationale."}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card title="Consommation mensuelle" icon="chart">
            {monthly.length === 0 ? (
              <p className="text-sm text-slate-500">
                Pas encore assez de données.
              </p>
            ) : (
              <BarChart data={monthly} />
            )}
          </Card>

          <Card title="Relevés" icon="clock">
            {anchor && list.length > 0 && (
              <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
                Cycle de facturation en cours :{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatCycle(cycleCourant(anchor))}
                </span>
                . {REGLE_BASCULE_FR}
              </p>
            )}
            {reversed.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun relevé.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {reversed.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-mono text-base font-semibold">
                          {fmt(r.index)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {meter.unit}
                        </span>
                        {r.conso !== null && (
                          <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-500/10 dark:text-teal-400">
                            +{fmt(r.conso)}
                          </span>
                        )}
                        {r.rechargeAmount !== undefined && r.rechargeAmount > 0 && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                            Rechargé : {fmtFCFA(r.rechargeAmount)}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Icon name="calendar" className="h-3 w-3" />
                          {r.date}
                        </span>
                        {r.days !== null && <span>· {r.days} j</span>}
                        {anchor && (
                          <span className="text-teal-700 dark:text-teal-400">
                            · cycle {formatCycle(cycleForDate(r.date, anchor))}
                          </span>
                        )}
                        {r.note && <span className="truncate">· {r.note}</span>}
                      </div>
                      {r.invoice && r.invoice.lines.length > 0 && (
                        <details className="mt-1.5">
                          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                            <Icon name="banknote" className="h-3.5 w-3.5" />
                            {fmtFCFA(r.cost ?? 0, 2)}
                            {r.invoice.tarifVersion &&
                              ` · barème ${r.invoice.tarifVersion}`}
                          </summary>
                          <ul className="mt-1 space-y-0.5 border-l-2 border-teal-500/40 pl-2">
                            {r.invoice.lines.map((l, k) => (
                              <li key={k} className="text-[11px] text-slate-500">
                                {formatLine(l)}
                              </li>
                            ))}
                            {r.invoice.note && (
                              <li className="text-[11px] text-amber-600 dark:text-amber-400">
                                {r.invoice.note}
                              </li>
                            )}
                          </ul>
                        </details>
                      )}
                      {r.photos && r.photos.length > 0 && (
                        <div className="mt-1.5 flex gap-1.5">
                          {r.photos.map((pid) => (
                            <PhotoThumb
                              key={pid}
                              photoId={pid}
                              onClick={() =>
                                setOpenPhoto({ photoId: pid, readingId: r.id })
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (confirm("Supprimer ce relevé ?")) {
                          deletePhotos(r.photos ?? []);
                          removeReading(r.id);
                        }
                      }}
                      aria-label="Supprimer le relevé"
                      className="shrink-0 rounded-lg p-2 text-slate-300 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={exportSingleMeterPDF}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-600 px-3 py-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-500/10"
              >
                <Icon name="download" className="h-4 w-4" />
                PDF Compteur
              </button>
              <button
                onClick={exportPDF}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-3 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:from-teal-700 hover:to-emerald-600 active:scale-[.99]"
              >
                <Icon name="download" className="h-4 w-4" />
                Récapitulatif PDF
              </button>
            </div>
          </Card>
        </>
      )}

      {openPhoto && (
        <PhotoModal
          photoId={openPhoto.photoId}
          onClose={() => setOpenPhoto(null)}
          onDelete={() => {
            deletePhotos([openPhoto.photoId]);
            removeReadingPhoto(openPhoto.readingId, openPhoto.photoId);
            setOpenPhoto(null);
          }}
        />
      )}
    </>
  );
}

function KPI({
  label,
  value,
  unit,
  icon,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  icon: IconName;
  tone: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900">
      <span className={`absolute inset-x-0 top-0 h-1 ${tone}`} />
      <Icon name={icon} className="mb-1.5 h-4 w-4 text-slate-400" />
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 truncate text-base font-bold leading-tight">
        {value}
      </div>
      <div className="truncate text-[11px] text-slate-400">{unit}</div>
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