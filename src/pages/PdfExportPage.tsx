import { useState } from "react";
import { Card } from "../components/Card";
import { Icon, meterIconName } from "../components/Icon";
import { Loader } from "../components/Loader";
import { useToast } from "../components/Toast";
import { inferTypeCompteur } from "../lib/tarifsCI";
import { useStore } from "../store";
import * as XLSX from "xlsx";

// Types pour le formulaire d'export (PDF + Excel)
type FormData = {
    // Société (éditeur)
    societeNom: string;
    societeAdresse: string;
    societeEmail: string;
    societeTelephone: string;

    // Abonné
    abonneNom: string;
    abonneAdresse: string;
    abonneEmail: string;

    // Compteur
    compteurType: "electricite" | "eau";
    compteurNumero: string;
    compteurPrixUnitaire: number;
    compteurAbonnementJour: number;

    // Période
    periodeDebut: string;
    periodeFin: string;

    // Relevés bruts (format JSON ou texte)
    relevesBruts: string;
};

// Type pour un relevé brut validé
type RawReading = {
    date_releve: string;
    index_valeur: number;
};

const defaultFormData: FormData = {
    societeNom: "",
    societeAdresse: "",
    societeEmail: "",
    societeTelephone: "",
    abonneNom: "",
    abonneAdresse: "",
    abonneEmail: "",
    compteurType: "electricite",
    compteurNumero: "",
    compteurPrixUnitaire: 0,
    compteurAbonnementJour: 0,
    periodeDebut: "",
    periodeFin: "",
    relevesBruts: "",
};

export function PdfExportPage() {
    const [formData, setFormData] = useState<FormData>(defaultFormData);
    const [isGenerating, setIsGenerating] = useState(false);
    const [parsedReadings, setParsedReadings] = useState<RawReading[] | null>(null);
    const { showToast } = useToast();

    // Charger les compteurs existants depuis le store
    const { meters, readings } = useStore();

    // Gérer les changements de formulaire
    const handleChange = (field: keyof FormData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Parser automatiquement les relevés si le champ change
        if (field === "relevesBruts") {
            try {
                // Essayer de parser le JSON
                const parsed = JSON.parse(value as string);
                if (Array.isArray(parsed)) {
                    const valid = parsed.every(r =>
                        r.date_releve && typeof r.index_valeur === "number"
                    );
                    if (valid) {
                        setParsedReadings(parsed);
                    } else {
                        setParsedReadings(null);
                    }
                }
            } catch {
                // Si ce n'est pas du JSON, essayer de parser le format texte (une ligne par relevé)
                const lines = (value as string).split('\n').filter(l => l.trim());
                const parsed: RawReading[] = [];
                for (const line of lines) {
                    const parts = line.split(',').map(p => p.trim());
                    if (parts.length >= 2) {
                        const date = parts[0];
                        const index = parseFloat(parts[1]);
                        if (date && !isNaN(index)) {
                            parsed.push({ date_releve: date, index_valeur: index });
                        }
                    }
                }
                if (parsed.length > 0) {
                    setParsedReadings(parsed);
                } else {
                    setParsedReadings(null);
                }
            }
        }
    };

    // Charger automatiquement les données d'un compteur existant
    const loadFromExistingMeter = (meterId: string) => {
        const meter = meters.find(m => m.id === meterId);
        if (!meter) return;

        // Remplir les données du compteur
        setFormData(prev => ({
            ...prev,
            compteurType: (meter.type ?? inferTypeCompteur(meter.unit)) === "eau"
                ? "eau"
                : "electricite",
            compteurNumero: meter.name || "",
            compteurPrixUnitaire: meter.price || 0,
            compteurAbonnementJour: meter.abon ? meter.abon / 30 : 0,
        }));

        // Convertir les lectures du store en format brut
        const meterReadings = readings.filter(r => r.meterId === meterId);
        const rawReadings = meterReadings.map(r => ({
            date_releve: r.date,
            index_valeur: r.index,
        }));

        // Trier par date et ajouter au formulaire
        rawReadings.sort((a, b) =>
            new Date(a.date_releve).getTime() - new Date(b.date_releve).getTime()
        );

        setFormData(prev => ({
            ...prev,
            relevesBruts: JSON.stringify(rawReadings, null, 2),
            periodeDebut: rawReadings.length > 0 ? rawReadings[0].date_releve : "",
            periodeFin: rawReadings.length > 0
                ? rawReadings[rawReadings.length - 1].date_releve
                : "",
        }));

        setParsedReadings(rawReadings);
        showToast(
            `${rawReadings.length} relevés importés du compteur`,
            "success",
        );
    };

    // Générer le PDF
    const generatePdf = async () => {
        // Valider le formulaire
        if (!formData.societeNom || !formData.abonneNom || !parsedReadings || parsedReadings.length === 0) {
            showToast(
                "Veuillez remplir tous les champs obligatoires et ajouter des relevés",
                "error",
            );
            return;
        }

        setIsGenerating(true);
        try {
            // URL dynamique pour fonctionner en local et sur Vercel
            const apiUrl = import.meta.env.DEV
                ? 'http://localhost:8000/api/generate-pdf'
                : '/api/generate-pdf';

            // Appel au backend Python pour générer le PDF
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: 'cors',
                body: JSON.stringify({
                    societe: {
                        nom: formData.societeNom,
                        adresse: formData.societeAdresse,
                        email: formData.societeEmail,
                        telephone: formData.societeTelephone,
                    },
                    abonne: {
                        nom: formData.abonneNom,
                        adresse: formData.abonneAdresse,
                        email: formData.abonneEmail,
                    },
                    compteur: {
                        type: formData.compteurType,
                        numero: formData.compteurNumero,
                        unite: formData.compteurType === "eau" ? "m³" : "kWh",
                    },
                    releves_bruts: parsedReadings,
                    periode: {
                        debut: formData.periodeDebut,
                        fin: formData.periodeFin,
                    },
                    prix_unitaire: formData.compteurPrixUnitaire,
                    prix_abonnement_jour: formData.compteurAbonnementJour,
                    numero_doc: `HIST-${Date.now().toString().slice(-8)}`,
                }),
            });

            if (!response.ok) throw new Error("Erreur lors de la génération");

            // Télécharger le PDF généré
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `historique_${formData.compteurNumero || 'releves'}_${new Date().toISOString().slice(0, 10)}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showToast("Votre historique a été téléchargé avec succès", "success");
        } catch (error) {
            console.error("Erreur génération PDF:", error);
            showToast("Impossible de générer le PDF. Vérifiez les logs.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    // Générer l'Excel
    const generateExcel = () => {
        // Valider le formulaire
        if (!formData.societeNom || !formData.abonneNom || !parsedReadings || parsedReadings.length === 0) {
            showToast(
                "Veuillez remplir tous les champs obligatoires et ajouter des relevés",
                "error",
            );
            return;
        }

        try {
            // Préparer les données pour Excel
            const unite = formData.compteurType === "eau" ? "m³" : "kWh";

            // Feuille 1 : Informations générales
            const infoSheet: (string | number)[][] = [
                ["HISTORIQUE DES RELEVES"],
                [""],
                ["Société", formData.societeNom],
                ["Adresse", formData.societeAdresse],
                ["Email", formData.societeEmail],
                [""],
                ["Abonné", formData.abonneNom],
                ["Adresse abonné", formData.abonneAdresse],
                ["Email abonné", formData.abonneEmail],
                [""],
                ["Compteur", formData.compteurNumero],
                ["Type", formData.compteurType === "eau" ? "Eau" : "Électricité"],
                ["Unité", unite],
                ["Prix unitaire", `${formData.compteurPrixUnitaire} FCFA/${unite}`],
                ["Période", `Du ${formData.periodeDebut} au ${formData.periodeFin}`],
            ];

            // Feuille 2 : Détail des relevés
            const readingsSheet: (string | number)[][] = [
                ["Date", `Index (${unite})`, "Consommation", "Jours", "Coût énergie", "Abonnement", "Total"]
            ];

            // Recalculer les mêmes valeurs que le PDF pour la cohérence
            const tries = [...parsedReadings].sort((a, b) =>
                new Date(a.date_releve).getTime() - new Date(b.date_releve).getTime()
            );

            for (let i = 0; i < tries.length; i++) {
                const r = tries[i];
                let consommation = 0;
                let nb_jours = 0;

                if (i > 0) {
                    const precedent = tries[i - 1];
                    consommation = Math.max(r.index_valeur - precedent.index_valeur, 0);
                    nb_jours = Math.floor(
                        (new Date(r.date_releve).getTime() - new Date(precedent.date_releve).getTime())
                        / (1000 * 60 * 60 * 24)
                    );
                }

                const energie = Math.round(consommation * formData.compteurPrixUnitaire);
                const abonnement = Math.round(nb_jours * formData.compteurAbonnementJour);
                const total = energie + abonnement;

                readingsSheet.push([
                    r.date_releve,
                    r.index_valeur,
                    consommation,
                    nb_jours,
                    energie,
                    abonnement,
                    total
                ]);
            }

            // Créer le workbook
            const wb = XLSX.utils.book_new();

            // Ajouter la feuille informations
            const wsInfo = XLSX.utils.aoa_to_sheet(infoSheet);
            XLSX.utils.book_append_sheet(wb, wsInfo, "Informations");

            // Ajouter la feuille relevés
            const wsReadings = XLSX.utils.aoa_to_sheet(readingsSheet);
            XLSX.utils.book_append_sheet(wb, wsReadings, "Relevés");

            // Ajuster la largeur des colonnes
            const wscols = [
                { wch: 15 },
                { wch: 15 },
                { wch: 15 },
                { wch: 10 },
                { wch: 15 },
                { wch: 15 },
                { wch: 15 },
            ];
            wsReadings['!cols'] = wscols;

            // Télécharger le fichier
            XLSX.writeFile(wb, `historique_${formData.compteurNumero || 'releves'}_${new Date().toISOString().slice(0, 10)}.xlsx`);

            showToast("Votre fichier Excel a été téléchargé avec succès", "success");
        } catch (error) {
            console.error("Erreur génération Excel:", error);
            showToast("Impossible de générer le fichier Excel", "error");
        }
    };

    // Réinitialiser le formulaire
    const resetForm = () => {
        setFormData(defaultFormData);
        setParsedReadings(null);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold">Export des relevés</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Générez un PDF professionnel ou un fichier Excel exploitable avec l'historique de vos consommations
                </p>
            </div>

            {/* Charger depuis un compteur existant */}
            {meters.length > 0 && (
                <Card>
                    <div className="space-y-3">
                        <h3 className="font-medium flex items-center gap-2">
                            <Icon name="gauge" className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                            Charger depuis un compteur existant
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {meters.map(meter => (
                                <button
                                    key={meter.id}
                                    onClick={() => loadFromExistingMeter(meter.id)}
                                    className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                                >
                                    <Icon
                                        name={meterIconName(meter)}
                                        className="h-5 w-5 flex-shrink-0 text-slate-500"
                                    />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{meter.name}</p>
                                        <p className="text-xs text-slate-500">{readings.filter(r => r.meterId === meter.id).length} relevés</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            {/* Informations société */}
            <Card>
                <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                        <Icon name="building" className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        Informations de la société
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium mb-1.5">Nom *</label>
                            <input
                                type="text"
                                value={formData.societeNom}
                                onChange={e => handleChange("societeNom", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                placeholder="Nom de votre entreprise"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium mb-1.5">Adresse</label>
                            <textarea
                                value={formData.societeAdresse}
                                onChange={e => handleChange("societeAdresse", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-teal-500 outline-none transition-all resize-none"
                                rows={2}
                                placeholder="Adresse postale"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Email</label>
                            <input
                                type="email"
                                value={formData.societeEmail}
                                onChange={e => handleChange("societeEmail", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                placeholder="contact@entreprise.fr"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Téléphone</label>
                            <input
                                type="tel"
                                value={formData.societeTelephone}
                                onChange={e => handleChange("societeTelephone", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                placeholder="+33 1 23 45 67 89"
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Informations abonné */}
            <Card>
                <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                        <Icon name="user" className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        Informations de l'abonné
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium mb-1.5">Nom et prénom *</label>
                            <input
                                type="text"
                                value={formData.abonneNom}
                                onChange={e => handleChange("abonneNom", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                placeholder="Jean Dupont"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium mb-1.5">Adresse</label>
                            <textarea
                                value={formData.abonneAdresse}
                                onChange={e => handleChange("abonneAdresse", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-teal-500 outline-none transition-all resize-none"
                                rows={2}
                                placeholder="Adresse postale"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium mb-1.5">Email</label>
                            <input
                                type="email"
                                value={formData.abonneEmail}
                                onChange={e => handleChange("abonneEmail", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                placeholder="jean.dupont@email.com"
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Informations compteur */}
            <Card>
                <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                        <Icon
                            name={formData.compteurType === "eau" ? "droplet" : "bolt"}
                            className="h-4 w-4 text-teal-600 dark:text-teal-400"
                        />
                        Détails du compteur
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Type de compteur</label>
                            <select
                                value={formData.compteurType}
                                onChange={e => handleChange("compteurType", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                            >
                                <option value="electricite">Électricité (kWh)</option>
                                <option value="eau">Eau (m³)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Numéro de série</label>
                            <input
                                type="text"
                                value={formData.compteurNumero}
                                onChange={e => handleChange("compteurNumero", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                placeholder="123456789"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Prix unitaire (FCFA/unité)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.compteurPrixUnitaire || ""}
                                onChange={e => handleChange("compteurPrixUnitaire", parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                placeholder="75"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Abonnement journalier (FCFA/jour)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.compteurAbonnementJour || ""}
                                onChange={e => handleChange("compteurAbonnementJour", parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                placeholder="100"
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Période et relevés */}
            <Card>
                <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                        <Icon name="calendar" className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        Période et relevés
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Date de début</label>
                            <input
                                type="date"
                                value={formData.periodeDebut}
                                onChange={e => handleChange("periodeDebut", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Date de fin</label>
                            <input
                                type="date"
                                value={formData.periodeFin}
                                onChange={e => handleChange("periodeFin", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5">
                            Relevés bruts * (JSON ou format texte: date,index par ligne)
                        </label>
                        <textarea
                            value={formData.relevesBruts}
                            onChange={e => handleChange("relevesBruts", e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-teal-500 outline-none transition-all font-mono text-sm resize-none"
                            rows={6}
                            placeholder='Format JSON :
[{"date_releve":"2025-01-01","index_valeur":1000},
 {"date_releve":"2025-02-01","index_valeur":1100}]

Ou format texte :
2025-01-01, 1000
2025-02-01, 1100'
                        />
                    </div>

                    {/* Aperçu des relevés parsés */}
                    {parsedReadings && parsedReadings.length > 0 && (
                        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium text-sm">
                                <Icon name="check" className="h-4 w-4" />
                                {parsedReadings.length} relevés valides détectés
                            </div>
                            <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-500">
                                Du {new Date(parsedReadings[0].date_releve).toLocaleDateString('fr-FR')} au{' '}
                                {new Date(parsedReadings[parsedReadings.length - 1].date_releve).toLocaleDateString('fr-FR')}
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={resetForm}
                    className="flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                    <Icon name="close" className="h-4 w-4" />
                    Réinitialiser
                </button>
                <button
                    onClick={generatePdf}
                    disabled={isGenerating || !parsedReadings || parsedReadings.length === 0}
                    className="flex-[2] px-4 py-3 rounded-lg bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-500 text-white hover:opacity-90 transition-opacity font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGenerating ? (
                        <>
                            <Loader variant="inline" />
                            Génération en cours...
                        </>
                    ) : (
                        <>
                            <Icon name="download" className="h-4 w-4" />
                            Générer et télécharger le PDF
                        </>
                    )}
                </button>
                <button
                    onClick={generateExcel}
                    disabled={isGenerating || !parsedReadings || parsedReadings.length === 0}
                    className="flex-[2] px-4 py-3 rounded-lg border border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Icon name="download" className="h-4 w-4" />
                    Générer et télécharger l'Excel
                </button>
            </div>
        </div>
    );
}