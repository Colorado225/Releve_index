import { useMemo } from "react";
import { useStore } from "../store";
import { Card } from "../components/Card";
import { fmt, fmtFCFA } from "../lib/format";
import { enrichReadings } from "../lib/calc";
import { useSettings } from "../lib/settings";

export function HomePage() {
    const { meters, readings } = useStore();
    const { lowCreditThreshold, lowDaysThreshold } = useSettings();

    // Calcul des statistiques globales pour tous les compteurs
    const globalStats = useMemo(() => {
        let totalWaterConso = 0;
        let totalElectricityConso = 0;
        let totalRecharged = 0;
        let totalCost = 0;
        const activeAlerts: string[] = [];

        meters.forEach(meter => {
            const list = enrichReadings(meter, readings);
            const withConso = list.filter(r => r.conso !== null);
            const meterConso = withConso.reduce((s, r) => s + (r.conso ?? 0), 0);

            if (meter.unit === "m³") {
                totalWaterConso += meterConso;
            } else if (meter.unit === "kWh") {
                totalElectricityConso += meterConso;
                // Calcul des statistiques CIE
                const meterRecharged = list.reduce((s, r) => s + (r.rechargeAmount ?? 0), 0);
                const meterCost = withConso.reduce((s, r) => s + (r.cost ?? 0), 0);
                totalRecharged += meterRecharged;
                totalCost += meterCost;

                // Vérification des alertes CIE
                const remainingCredit = meterRecharged - meterCost;
                const totalDays = withConso.reduce((s, r) => s + (r.days ?? 0), 0) || 1;
                const daily = totalDays > 0 ? meterConso / totalDays : 0;
                const estimatedDaysLeft = daily > 0 && meter.price ? remainingCredit / (daily * meter.price) : 0;

                if (remainingCredit < lowCreditThreshold) {
                    activeAlerts.push(`${meter.name} : Crédit faible (${fmtFCFA(remainingCredit)})`);
                }
                if (estimatedDaysLeft < lowDaysThreshold) {
                    activeAlerts.push(`${meter.name} : Plus que ${Math.round(estimatedDaysLeft)}j de crédit`);
                }
            }
        });

        return {
            totalWaterConso,
            totalElectricityConso,
            totalRecharged,
            remainingCredit: totalRecharged - totalCost,
            activeAlerts
        };
    }, [meters, readings, lowCreditThreshold, lowDaysThreshold]);

    return (
        <>
            {/* Bannière de bienvenue */}
            <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-500 p-4 sm:p-6 text-white shadow-lg">
                <h2 className="text-xl sm:text-2xl font-bold">Bonjour ! 👋</h2>
                <p className="mt-2 text-sm sm:text-base text-teal-100">Voici le résumé de vos consommations</p>
            </div>

            {/* Alertes actives */}
            {globalStats.activeAlerts.length > 0 && (
                <div className="rounded-2xl border border-red-300 bg-red-50 p-3 sm:p-4 dark:border-red-500/30 dark:bg-red-500/10">
                    <h3 className="font-semibold text-red-800 dark:text-red-300 text-sm sm:text-base">⚠️ Alertes en cours</h3>
                    <ul className="mt-2 space-y-1">
                        {globalStats.activeAlerts.map((alert, idx) => (
                            <li key={idx} className="text-xs sm:text-sm text-red-700 dark:text-red-400">• {alert}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Résumé des consommations */}
            <Card title="Consommations globales" icon="chart">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4">
                    <div className="rounded-xl bg-sky-50 p-3 sm:p-4 dark:bg-sky-900/20">
                        <p className="text-[10px] sm:text-xs font-medium text-sky-600 dark:text-sky-400">Eau (SODECI)</p>
                        <p className="mt-2 text-xl sm:text-2xl font-bold text-sky-700 dark:text-sky-300">
                            {fmt(globalStats.totalWaterConso)} <span className="text-[10px] sm:text-sm">m³</span>
                        </p>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-3 sm:p-4 dark:bg-amber-900/20">
                        <p className="text-[10px] sm:text-xs font-medium text-amber-600 dark:text-amber-400">Électricité (CIE)</p>
                        <p className="mt-2 text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-300">
                            {fmt(globalStats.totalElectricityConso)} <span className="text-[10px] sm:text-sm">kWh</span>
                        </p>
                    </div>
                </div>
            </Card>

            {/* Statistiques CIE globales */}
            {globalStats.totalRecharged > 0 && (
                <Card title="Crédit électrique global" icon="wallet">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4">
                        <div className="rounded-xl bg-blue-50 p-3 sm:p-4 dark:bg-blue-900/20">
                            <p className="text-[10px] sm:text-xs font-medium text-blue-600 dark:text-blue-400">Total rechargé</p>
                            <p className="mt-2 text-lg sm:text-xl font-bold text-blue-700 dark:text-blue-300 truncate">
                                {fmtFCFA(globalStats.totalRecharged)}
                            </p>
                        </div>
                        <div className={`rounded-xl p-3 sm:p-4 ${globalStats.remainingCredit < lowCreditThreshold
                            ? "bg-red-50 dark:bg-red-900/20"
                            : "bg-emerald-50 dark:bg-emerald-900/20"
                            }`}>
                            <p className={`text-[10px] sm:text-xs font-medium ${globalStats.remainingCredit < lowCreditThreshold
                                ? "text-red-600 dark:text-red-400"
                                : "text-emerald-600 dark:text-emerald-400"
                                }`}>Crédit restant</p>
                            <p className={`mt-2 text-lg sm:text-xl font-bold ${globalStats.remainingCredit < lowCreditThreshold
                                ? "text-red-700 dark:text-red-300"
                                : "text-emerald-700 dark:text-emerald-300"
                                } truncate`}>
                                {fmtFCFA(Math.max(globalStats.remainingCredit, 0))}
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Liste rapide des compteurs */}
            <Card title="Vos compteurs" icon="gauge">
                <div className="space-y-2 sm:space-y-3 mt-4">
                    {meters.map(meter => {
                        const list = enrichReadings(meter, readings);
                        const lastReading = list.length > 0 ? list[list.length - 1] : null;

                        return (
                            <div key={meter.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 sm:p-3 dark:border-slate-700 min-w-0">
                                <div className="min-w-0">
                                    <p className="font-medium text-sm sm:text-base text-slate-900 dark:text-white truncate">{meter.name}</p>
                                    <p className="text-[10px] sm:text-xs text-slate-500">
                                        {meter.unit === "m³" ? "Eau (SODECI)" : "Électricité (CIE)"}
                                    </p>
                                </div>
                                <div className="text-right min-w-0">
                                    {lastReading ? (
                                        <>
                                            <p className="font-mono font-semibold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                                                {fmt(lastReading.index)}
                                            </p>
                                            <p className="text-[10px] sm:text-xs text-slate-500">{lastReading.date}</p>
                                        </>
                                    ) : (
                                        <p className="text-[10px] sm:text-xs text-slate-500">Aucun relevé</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </>
    );
}