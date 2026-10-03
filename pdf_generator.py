from datetime import date, datetime
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid
import os

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

# ---------- Filtres ----------
def _num(value, decimals=2):
    """1 234,56  (espace = séparateur de milliers)"""
    if value is None:
        return "—"
    s = f"{float(value):,.{decimals}f}"
    return s.replace(",", "\u202f").replace(".", ",")   # espace fine insécable


def _date_fr(value):
    if value is None:
        return "—"
    if isinstance(value, str):
        value = datetime.fromisoformat(str(value)).date()
    return value.strftime("%d/%m/%Y")


def _env():
    env = Environment(loader=FileSystemLoader("templates"), autoescape=True)
    env.filters["num"] = _num
    env.filters["date_fr"] = _date_fr
    return env


# ---------- Logique métier ----------
def construire_historique(releves_bruts, prix_unitaire, prix_abonnement_jour=0.0):
    """
    releves_bruts : liste de dicts {date_releve, index_valeur}
                    triés du plus ancien au plus récent.
    Retourne la liste enrichie + les totaux.
    """
    # Tri chronologique croissant pour calculer les deltas
    tries = sorted(releves_bruts, key=lambda r: r["date_releve"])

    lignes = []
    for i, r in enumerate(tries):
        date_r = r["date_releve"]
        index_r = float(r["index_valeur"])

        if i == 0:
            delta_index = None
            consommation = 0.0
            nb_jours = 0
        else:
            precedent = tries[i - 1]
            delta_index = round(index_r - float(precedent["index_valeur"]), 2)
            consommation = max(delta_index, 0.0)          # sécurité
            nb_jours = (datetime.fromisoformat(str(date_r)).date()
                        - datetime.fromisoformat(str(precedent["date_releve"])).date()).days

        energie     = round(consommation * prix_unitaire, 2)
        abonnement  = round(nb_jours * prix_abonnement_jour, 2)
        total       = round(energie + abonnement, 2)

        lignes.append({
            "date":         date_r,
            "index":        index_r,
            "delta_index":  delta_index,
            "consommation": consommation,
            "nb_jours":     nb_jours,
            "prix_unitaire": prix_unitaire,
            "energie":      energie,
            "abonnement":   abonnement,
            "total":        total,
        })

    # On affiche du plus récent au plus ancien
    lignes_affichage = list(reversed(lignes))

    conso_totale      = round(sum(l["consommation"] for l in lignes), 2)
    total_energie     = round(sum(l["energie"]      for l in lignes), 2)
    total_abonnement  = round(sum(l["abonnement"]   for l in lignes), 2)
    cout_total        = round(total_energie + total_abonnement, 2)

    nb_jours_total = sum(l["nb_jours"] for l in lignes) or 1
    moyenne        = round(conso_totale / nb_jours_total, 2) if nb_jours_total else 0

    dernier = lignes[-1] if lignes else None

    synthese = {
        "conso_totale":      conso_totale,
        "moyenne":           moyenne,
        "cout_total":        cout_total,
        "total_energie":     total_energie,
        "total_abonnement":  total_abonnement,
        "nb_releves":        len(lignes),
        "nb_jours":          nb_jours_total,
        "dernier_index":     dernier["index"] if dernier else 0,
        "dernier_date":      _date_fr(dernier["date"]) if dernier else "—",
    }

    return lignes_affichage, synthese


# ---------- Génération PDF ----------
def generer_historique_pdf(
    *,
    societe,
    abonne,
    compteur,
    releves_bruts,
    periode,                 # {"debut": "2026-10-01", "fin": "2026-10-03"}
    prix_unitaire,
    unite="m³",
    prix_abonnement_jour=0.0,
    numero_doc="HIST-0001",
    sortie="historique.pdf",
):
    lignes, synthese = construire_historique(
        releves_bruts, prix_unitaire, prix_abonnement_jour
    )

    html = _env().get_template("historique_releves.html").render(
        societe=societe,
        abonne=abonne,
        compteur=compteur,
        lignes=lignes,
        synthese=synthese,
        unite=unite,
        prix_unitaire=prix_unitaire,
        periode=periode,
        doc={"numero": numero_doc},
        date_generation=_date_fr(date.today()),
    )

    sortie = Path(sortie)
    sortie.parent.mkdir(parents=True, exist_ok=True)
    HTML(string=html).write_pdf(sortie)
    return sortie


# ---------- API FastAPI ----------
class Societe(BaseModel):
    nom: str
    adresse: Optional[str] = None
    email: Optional[str] = None

class Abonne(BaseModel):
    nom: str
    adresse: Optional[str] = None
    email: Optional[str] = None

class Compteur(BaseModel):
    numero: Optional[str] = None
    type: str  # "eau" ou "electricite"

class ReleveBrut(BaseModel):
    date_releve: str
    index_valeur: float

class Periode(BaseModel):
    debut: str
    fin: str

class GeneratePdfRequest(BaseModel):
    societe: Societe
    abonne: Abonne
    compteur: Compteur
    releves_bruts: List[ReleveBrut]
    periode: Periode
    prix_unitaire: float
    unite: str = "m³"
    prix_abonnement_jour: float = 0.0


app = FastAPI(title="API Génération PDF Relevés", version="1.0")

# Configuration CORS pour accepter les requêtes depuis l'application React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En production, remplacez par votre domaine
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Créer le dossier pour les PDFs générés
PDF_DIR = Path("generated_pdfs")
PDF_DIR.mkdir(exist_ok=True)

@app.post("/api/generate-pdf", response_class=FileResponse)
async def generate_pdf(request: GeneratePdfRequest):
    try:
        # Générer un numéro de document unique
        numero_doc = f"HIST-{uuid.uuid4().hex[:6].upper()}"
        # Chemin de sortie
        sortie_pdf = PDF_DIR / f"historique_{numero_doc}.pdf"
        
        # Convertir les releves_bruts en dictionnaires
        releves_bruts_dict = [r.dict() for r in request.releves_bruts]
        
        # Appeler la fonction de génération
        fichier_genere = generer_historique_pdf(
            societe=request.societe.dict(),
            abonne=request.abonne.dict(),
            compteur=request.compteur.dict(),
            releves_bruts=releves_bruts_dict,
            periode=request.periode.dict(),
            prix_unitaire=request.prix_unitaire,
            unite=request.unite,
            prix_abonnement_jour=request.prix_abonnement_jour,
            numero_doc=numero_doc,
            sortie=str(sortie_pdf)
        )
        
        # Vérifier que le fichier existe
        if not fichier_genere.exists():
            raise HTTPException(status_code=500, detail="Erreur lors de la génération du PDF")
        
        # Retourner le fichier
        return FileResponse(
            path=str(fichier_genere),
            media_type="application/pdf",
            filename=f"historique_releves_{numero_doc}.pdf"
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")


# Nettoyer les anciens PDFs (optionnel, pour éviter de remplir le disque)
@app.delete("/api/cleanup-pdfs")
async def cleanup_old_pdfs():
    """Supprime les PDF générés il y a plus de 24h"""
    import time
    now = time.time()
    deleted = 0
    for f in PDF_DIR.glob("*.pdf"):
        if os.stat(f).st_mtime < now - 86400:  # 24h en secondes
            os.remove(f)
            deleted += 1
    return {"deleted": deleted}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)