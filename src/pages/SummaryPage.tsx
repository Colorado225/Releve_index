import { useState, useMemo, useEffect } from "react";
import { useStore } from "../store";
import { enrichReadings } from "../lib/calc";
import { Card } from "../components/Card";
import { Field } from "../components/Field";
import { Select } from "../components/Select";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
} from "recharts";
import { Icon } from "../components/Icon";
import type { EnrichedReading } from "../types";

// Couleurs pour les graphiques
const COLORS = {
    water: "#0ea5e9", // Bleu pour l'eau (SODECI)
    electricity: "#f59e0b", // Orange pour l'électricité (CIE)
    cost: "#10b981", // Vert pour les coûts
    consumption: "#8b5cf6", // Violet pour les consommations
};

const PIE_COLORS = ["#0ea5e9", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

type CategoryFilter = "all" | "sodeci" | "cie";
type PeriodFilter = "6months" | "1year" | "all";

// Type pour les données enrichies étendues
type ExtendedEnrichedReading = EnrichedReading & {
    meterName: string;
    meterUnit: string;
    meterType: string;
    meterId: string;
};

// Type compatible avec PieLabelRenderProps de Recharts
type PieLabelProps = {
    name?: string;
    percent?: number;
};

export function SummaryPage() {
    const { meters, readings } = useStore();
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("1year");
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

    // Écouter les changements de taille de fenêtre
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Filtrer les compteurs par catégorie
    const filteredMeters = useMemo(() => {
        return meters.filter((meter) => {
            if (categoryFilter === "all") return true;
            if (categoryFilter === "sodeci") return meter.unit === "m³"; // SODECI = eau
            if (categoryFilter === "cie") return meter.unit === "kWh"; // CIE = électricité
            return true;
        });
    }, [meters, categoryFilter]);

    // Enrichir les données de tous les compteurs filtrés
    const allEnrichedReadings = useMemo(() => {
        const enriched: ExtendedEnrichedReading[] = [];

        filteredMeters.forEach((meter) => {
            const readingsForMeter = enrichReadings(meter, readings);
            readingsForMeter.forEach((r) => {
                if (r.conso !== null && r.cost !== null) {
                    enriched.push({
                        ...r,
                        meterId: meter.id,
                        meterName: meter.name,
                        meterUnit: meter.unit,
                        meterType: meter.unit === "m³" ? "sodeci" : "cie",
                    });
                }
            });
        });

        // Filtrer par période
        const now = new Date();
        const cutoffDate = new Date();
        if (periodFilter === "6months") {
            cutoffDate.setMonth(now.getMonth() - 6);
        } else if (periodFilter === "1year") {
            cutoffDate.setFullYear(now.getFullYear() - 1);
        }

        return enriched.filter((r) => new Date(r.date) >= cutoffDate);
    }, [filteredMeters, readings, periodFilter]);

    // Données pour le graphique en barres (consommation mensuelle)
    const monthlyData = useMemo(() => {
        const monthly: Record<string, {
            month: string;
            waterConsumption: number;
            electricityConsumption: number;
            waterCost: number;
            electricityCost: number;
        }> = {};

        allEnrichedReadings.forEach((reading) => {
            const date = new Date(reading.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            const monthLabel = `${date.toLocaleString("fr-FR", { month: "short" })} ${date.getFullYear()}`;

            if (!monthly[monthKey]) {
                monthly[monthKey] = {
                    month: monthLabel,
                    waterConsumption: 0,
                    electricityConsumption: 0,
                    waterCost: 0,
                    electricityCost: 0,
                };
            }

            if (reading.meterType === "sodeci") {
                monthly[monthKey].waterConsumption += reading.conso || 0;
                monthly[monthKey].waterCost += reading.cost || 0;
            } else {
                monthly[monthKey].electricityConsumption += reading.conso || 0;
                monthly[monthKey].electricityCost += reading.cost || 0;
            }
        });

        return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
    }, [allEnrichedReadings]);

    // Données pour le camembert (répartition des coûts)
    const pieData = useMemo(() => {
        const totals = {
            sodeci: 0,
            cie: 0,
        };

        allEnrichedReadings.forEach((reading) => {
            if (reading.meterType === "sodeci") {
                totals.sodeci += reading.cost || 0;
            } else {
                totals.cie += reading.cost || 0;
            }
        });

        return [
            { name: "SODECI (Eau)", value: totals.sodeci },
            { name: "CIE (Électricité)", value: totals.cie },
        ].filter((item) => item.value > 0);
    }, [allEnrichedReadings]);

    // Données pour l'évolution des coûts
    const trendData = useMemo(() => {
        return monthlyData.map((m) => ({
            month: m.month,
            "Total Eau": m.waterCost,
            "Total Électricité": m.electricityCost,
        }));
    }, [monthlyData]);

    // Statistiques globales
    const statistics = useMemo(() => {
        const totalWater = allEnrichedReadings
            .filter((r) => r.meterType === "sodeci")
            .reduce((sum, r) => sum + (r.conso || 0), 0);

        const totalElectricity = allEnrichedReadings
            .filter((r) => r.meterType === "cie")
            .reduce((sum, r) => sum + (r.conso || 0), 0);

        const totalCostWater = allEnrichedReadings
            .filter((r) => r.meterType === "sodeci")
            .reduce((sum, r) => sum + (r.cost || 0), 0);

        const totalCostElectricity = allEnrichedReadings
            .filter((r) => r.meterType === "cie")
            .reduce((sum, r) => sum + (r.cost || 0), 0);

        const avgDailyWater = totalWater / (allEnrichedReadings.filter(r => r.meterType === "sodeci").reduce((sum, r) => sum + (r.days || 0), 0) || 1);
        const avgDailyElectricity = totalElectricity / (allEnrichedReadings.filter(r => r.meterType === "cie").reduce((sum, r) => sum + (r.days || 0), 0) || 1);

        return {
            totalWater,
            totalElectricity,
            totalCostWater,
            totalCostElectricity,
            totalCost: totalCostWater + totalCostElectricity,
            avgDailyWater,
            avgDailyElectricity,
        };
    }, [allEnrichedReadings]);

    // Si pas de données
    if (allEnrichedReadings.length === 0) {
        return (
            <div className="space-y-4">
                <Card className="p-6">
                    <div className="text-center py-12">
                        <Icon name="gauge" className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                            Pas encore de données
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                            Ajoutez des relevés pour voir votre récapitulatif de consommations
                        </p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* En-tête avec filtres */}
            <Card className="p-3 sm:p-4">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                    📊 Récapitulatif des consommations
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
                    <Field label="Filtrer par catégorie">
                        <Select
                            value={categoryFilter}
                            onChange={(value) => setCategoryFilter(value as CategoryFilter)}
                            options={[
                                { value: "all", label: "Toutes les catégories" },
                                { value: "sodeci", label: "SODECI (Eau)" },
                                { value: "cie", label: "CIE (Électricité)" },
                            ]}
                            placeholder="Choisissez une catégorie"
                        />
                    </Field>
                    <Field label="Période">
                        <Select
                            value={periodFilter}
                            onChange={(value) => setPeriodFilter(value as PeriodFilter)}
                            options={[
                                { value: "6months", label: "6 derniers mois" },
                                { value: "1year", label: "12 derniers mois" },
                                { value: "all", label: "Toute la période" },
                            ]}
                            placeholder="Choisissez une période"
                        />
                    </Field>
                </div>
            </Card>

            {/* Cartes de statistiques */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {(categoryFilter === "all" || categoryFilter === "sodeci") && (
                    <Card className="p-3 sm:p-4 bg-gradient-to-br from-sky-50 to-blue-100 dark:from-sky-950 dark:to-blue-900">
                        <div className="flex items-center gap-1.5">
                            <Icon name="droplet" className="h-4 w-4 sm:h-5 sm:w-5 text-sky-600 dark:text-sky-400" />
                            <span className="text-xs sm:text-sm font-medium text-sky-800 dark:text-sky-200">SODECI</span>
                        </div>
                        <p className="mt-2 text-xl sm:text-2xl font-bold text-sky-900 dark:text-sky-100 truncate">
                            {statistics.totalWater.toFixed(1)} m³
                        </p>
                        <p className="text-[10px] sm:text-xs text-sky-700 dark:text-sky-300 truncate">
                            {statistics.totalCostWater.toLocaleString("fr-FR")} FCFA
                        </p>
                        <p className="mt-1 text-[10px] sm:text-xs text-sky-600 dark:text-sky-400">
                            ≈ {statistics.avgDailyWater.toFixed(3)} m³/jour
                        </p>
                    </Card>
                )}

                {(categoryFilter === "all" || categoryFilter === "cie") && (
                    <Card className="p-3 sm:p-4 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900">
                        <div className="flex items-center gap-1.5">
                            <Icon name="bolt" className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
                            <span className="text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-200">CIE</span>
                        </div>
                        <p className="mt-2 text-xl sm:text-2xl font-bold text-amber-900 dark:text-amber-100 truncate">
                            {statistics.totalElectricity.toFixed(1)} kWh
                        </p>
                        <p className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-300 truncate">
                            {statistics.totalCostElectricity.toLocaleString("fr-FR")} FCFA
                        </p>
                        <p className="mt-1 text-[10px] sm:text-xs text-amber-600 dark:text-amber-400">
                            ≈ {statistics.avgDailyElectricity.toFixed(3)} kWh/jour
                        </p>
                    </Card>
                )}
            </div>

            {/* Coût total */}
            {categoryFilter === "all" && (
                <Card className="p-3 sm:p-4 bg-gradient-to-r from-teal-50 to-emerald-100 dark:from-teal-950 dark:to-emerald-900">
                    <div className="text-center">
                        <p className="text-xs sm:text-sm font-medium text-teal-800 dark:text-teal-200">Coût total sur la période</p>
                        <p className="mt-2 text-2xl sm:text-3xl font-bold text-teal-900 dark:text-teal-100">
                            {statistics.totalCost.toLocaleString("fr-FR")} FCFA
                        </p>
                    </div>
                </Card>
            )}

            {/* Graphique en barres - Consommations mensuelles */}
            {monthlyData.length > 0 && (
                <Card className="p-3 sm:p-4">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                        Consommations mensuelles
                    </h3>
                    <div className="h-72 sm:h-80 w-full overflow-x-auto">
                        <div className="min-w-[300px] sm:min-w-0 h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="month"
                                        tick={{ fontSize: 9 }}
                                        tickLine={{ strokeWidth: 0.5 }}
                                        axisLine={{ strokeWidth: 0.5 }}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 9 }}
                                        tickLine={{ strokeWidth: 0.5 }}
                                        axisLine={{ strokeWidth: 0.5 }}
                                    />
                                    <Tooltip
                                        contentStyle={{ fontSize: '12px' }}
                                        formatter={(value, name) => {
                                            const labels: Record<string, string> = {
                                                waterConsumption: "Eau (m³)",
                                                electricityConsumption: "Électricité (kWh)",
                                            };
                                            const n = typeof value === "number" ? value : Number(value) || 0;
                                            return [
                                                n.toFixed(2),
                                                name ? (labels[String(name)] || String(name)) : "",
                                            ] as [string, string];
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    {(categoryFilter === "all" || categoryFilter === "sodeci") && (
                                        <Bar dataKey="waterConsumption" name="Eau (m³)" fill={COLORS.water} radius={[4, 4, 0, 0]} />
                                    )}
                                    {(categoryFilter === "all" || categoryFilter === "cie") && (
                                        <Bar dataKey="electricityConsumption" name="Électricité (kWh)" fill={COLORS.electricity} radius={[4, 4, 0, 0]} />
                                    )}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </Card>
            )}

            {/* Graphique en lignes - Évolution des coûts */}
            {trendData.length > 0 && categoryFilter === "all" && (
                <Card className="p-3 sm:p-4">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                        Évolution des coûts mensuels (FCFA)
                    </h3>
                    <div className="h-72 sm:h-80 w-full overflow-x-auto">
                        <div className="min-w-[300px] sm:min-w-0 h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="month"
                                        tick={{ fontSize: 9 }}
                                        tickLine={{ strokeWidth: 0.5 }}
                                        axisLine={{ strokeWidth: 0.5 }}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 9 }}
                                        tickLine={{ strokeWidth: 0.5 }}
                                        axisLine={{ strokeWidth: 0.5 }}
                                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                    />
                                    <Tooltip
                                        formatter={(value) =>
                                            (typeof value === "number" ? value : Number(value) || 0).toLocaleString("fr-FR")
                                        }
                                        contentStyle={{ fontSize: '12px' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Line
                                        type="monotone"
                                        dataKey="Total Eau"
                                        stroke={COLORS.water}
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="Total Électricité"
                                        stroke={COLORS.electricity}
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </Card>
            )}

            {/* Graphique en camembert - Répartition des coûts */}
            {pieData.length > 1 && (
                <Card className="p-3 sm:p-4">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                        Répartition des coûts totaux
                    </h3>
                    <div className="h-56 sm:h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }: PieLabelProps) => `${name || ''} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                                    outerRadius={windowWidth < 640 ? 70 : 100}
                                    fill="#8884d8"
                                    dataKey="value"
                                    style={{ fontSize: '11px' }}
                                >
                                    {pieData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) =>
                                        (typeof value === "number" ? value : Number(value) || 0).toLocaleString("fr-FR") + " FCFA"
                                    }
                                    contentStyle={{ fontSize: '12px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            )}

            {/* Détail des compteurs */}
            <Card className="p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 sm:mb-4">
                    Détail par compteur
                </h3>
                <div className="space-y-2.5 sm:space-y-3">
                    {filteredMeters.map((meter) => {
                        const meterReadings = allEnrichedReadings.filter((r) => r.meterId === meter.id);
                        const totalConso = meterReadings.reduce((sum, r) => sum + (r.conso || 0), 0);
                        const totalCost = meterReadings.reduce((sum, r) => sum + (r.cost || 0), 0);
                        const isSodeci = meter.unit === "m³";

                        return (
                            <div
                                key={meter.id}
                                className={`flex items-center justify-between rounded-xl p-2.5 sm:p-4 ${isSodeci
                                    ? "bg-sky-50 dark:bg-sky-950/50"
                                    : "bg-amber-50 dark:bg-amber-950/50"
                                    }`}
                            >
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                    <div
                                        className={`flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center rounded-lg shrink-0 ${isSodeci
                                            ? "bg-sky-200 dark:bg-sky-800"
                                            : "bg-amber-200 dark:bg-amber-800"
                                            }`}
                                    >
                                        <Icon
                                            name={isSodeci ? "droplet" : "bolt"}
                                            className={`h-3.5 w-3.5 sm:h-5 sm:w-5 ${isSodeci
                                                ? "text-sky-700 dark:text-sky-300"
                                                : "text-amber-700 dark:text-amber-300"
                                                }`}
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate text-sm sm:text-base">
                                            {meter.name}
                                        </p>
                                        <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400">
                                            {isSodeci ? "SODECI" : "CIE"} · {meterReadings.length} relevés
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                    <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                                        {totalConso.toFixed(1)} {meter.unit}
                                    </p>
                                    <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 truncate max-w-24">
                                        {totalCost.toLocaleString("fr-FR")} FCFA
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}