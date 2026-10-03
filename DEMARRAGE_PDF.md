# Guide de démarrage - Export PDF des relevés

## Prérequis

- Python 3.10+ installé
- Les dépendances listées dans `requirements.txt`

## Installation des dépendances Python

```bash
pip install -r requirements.txt
```

## Lancer le serveur de génération de PDF

```bash
python pdf_generator.py
```

Le serveur démarre sur `http://localhost:8000`

## Documentation de l'API

Une fois le serveur lancé, vous avez accès à :

- Interface Swagger UI : http://localhost:8000/docs
- ReDoc : http://localhost:8000/redoc

## Utilisation depuis l'application React

1. Assurez-vous que le serveur Python est démarré
2. Dans votre application React, allez dans la section "Export PDF"
3. Remplissez les informations :
   - Informations de la société
   - Informations de l'abonné
   - Sélectionnez un compteur existant (chargement automatique des données)
4. Cliquez sur "Générer le PDF"

## Structure des fichiers créés

- `templates/historique_releves.html` - Template HTML utilisé pour générer le PDF
- `pdf_generator.py` - Serveur API Python avec toute la logique métier
- `requirements.txt` - Dépendances Python nécessaires
- `generated_pdfs/` - Dossier où sont stockés les PDFs générés (automatiquement créé)

## Nettoyage des anciens PDFs

Pour supprimer les PDFs générés il y a plus de 24h, appelez :

```bash
curl -X DELETE http://localhost:8000/api/cleanup-pdfs
```
