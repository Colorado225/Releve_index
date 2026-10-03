# Design Brief : Page d'export PDF pour Relevé Index

## 1. Objectif

Créer une interface web moderne et responsive pour exporter les relevés de compteurs en PDF, intégrée à l'application existante "Relevé Index" (suivi des consommations d'eau et électricité). Cette page permettra aux utilisateurs de générer des historiques détaillés au format PDF avec leur calculateur Python.

## 2. Cible utilisateur

Particuliers et petites entreprises qui suivent leurs consommations énergétiques. Utilisent l'application sur mobile et desktop, ont besoin de partager ou archiver leurs relevés.

## 3. Aesthetic direction

- Continuer l'identité visuelle de l'app existante : couleurs teal/émeraude (dégradé de teal-700 à emerald-500), design sombre/clair (dark mode), interface minimaliste et professionnelle
- Style "corporate mais accessible" : clean, structuré, avec des cartes pour séparer les sections
- Prioriser la lisibilité des formulaires et l'accessibilité
- Animations subtiles pour les interactions (hover, validation)

## 4. Structure du contenu

La page doit contenir :

1. **En-tête** : Identification de l'entreprise "Relevé Index", thème toggle (clair/sombre)
2. **Section Informations société** : Formulaire pour saisir les coordonnées de l'entreprise qui édite l'historique
3. **Section Informations abonné** : Formulaire pour les coordonnées du client/abonné
4. **Section Compteur** : Détails du compteur (type, numéro, prix unitaire, abonnement journalier)
5. **Section Période et relevés** : Sélection de la période + zone pour saisir/coller les relevés bruts (date + index)
6. **Section Aperçu** : Aperçu des données saisies avant génération
7. **Bouton d'export** : Générer le PDF avec retour visuel de progression
8. **Footer** : Liens utiles, version de l'application

## 5. Typographie

- Police sans-serif moderne (Inter, comme l'app existante)
- Hiérarchie claire : titres en gras, labels de formulaire lisibles, valeurs importantes mises en évidence
- Espacement généreux pour éviter la surcharge

## 6. Palette de couleurs

- Primary : teal-700 → emerald-500 (même dégradé que le header de l'app)
- Neutres : slate-50 à slate-950 pour le texte et les fonds (support dark mode)
- Accents : amber pour les warnings, emerald pour les validations
- Support complet du mode sombre Tailwind

## 7. Output path

Intégrer la page dans l'application existante : `/Users/melvyn/projetSass/ReleveCompteur/src/pages/PdfExportPage.tsx`

## 8. Besoins en images

Aucune image externe nécessaire. Utiliser les icônes existantes de l'application (Icon.tsx) : "gauge", "bolt", "droplet", "download", "file-text", "building", "user"

## 9. Contraintes techniques

- Utiliser React 18 + TypeScript, comme le reste de l'app
- Utiliser les composants existants : Card, Icon, Loader, Toast
- Intégrer le système de navigation existant (Navigation.tsx)
- Respecter les conventions de style Tailwind de l'application
- Appeler le backend Python (générer_historique_pdf) depuis l'interface web
- Gérer les erreurs de saisie et de génération
