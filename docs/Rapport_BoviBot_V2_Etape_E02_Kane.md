# Rapport Individuel S2 — Paquet B : Frontend Structure & CSS Global
**Auteur :** Abdoul Aziz Kane    
**Branche :** dev-kane-s2  
**Date :** 08 avril 2026  
**Projet :** BoviBot — Gestion d'Élevage Bovin avec IA et PL/SQL  
  

---

## 1. Introduction

Ce rapport documente mon travail sur le **Paquet B** de la Semaine 2 du projet BoviBot. Ma mission consistait à créer la structure HTML des 4 pages de l'application ainsi que le design system CSS global.

---

## 2. Décisions d'architecture frontend

### 2.1 Structure des fichiers

La structure retenue sépare clairement HTML, CSS et JavaScript :

```
frontend/
├── html/
│   ├── index.html       # Dashboard principal
│   ├── chat.html        # Interface chat LLM
│   ├── troupeau.html    # Gestion du troupeau
│   └── sante.html       # Suivi sanitaire
├── css/
│   └── style.css        # Design system global
└── js/
    ├── nav.js           # Navigation partagée
    ├── dashboard.js     # JS Dashboard (Paquet C)
    ├── chat.js          # JS Chat (Paquet C)
    ├── troupeau.js      # JS Troupeau (Paquet C)
    └── sante.js         # JS Santé (Paquet C)
```

### 2.2 Choix techniques

- **Pas de framework CSS** : CSS vanilla avec variables CSS pour rester léger et maintenable
- **Google Fonts** : Manrope (titres) + Public Sans (corps) 
- **Material Symbols Outlined** : icônes Google pour correspondre exactement aux maquettes
- **Layout sidebar fixe** : sidebar de 256px + header de 64px fixes, contenu principal avec margin-left adapté
- **CSS Variables** : toutes les couleurs et dimensions centralisées dans `:root` pour faciliter les modifications

---

## 3. Design System — Palette et variables CSS

```css
:root {
  --color-primary:       #7c4f1e;  /* Marron principal */
  --color-primary-light: #fdf6ec;  /* Fond clair */
  --color-primary-dark:  #5a3a15;  /* Marron foncé */
  --color-critical:      #dc2626;  /* Rouge alertes critiques */
  --color-warning:       #f59e0b;  /* Orange avertissements */
  --color-info:          #3b82f6;  /* Bleu informations */
  --color-success:       #16a34a;  /* Vert succès */
  --color-bg:            #f5f0e8;  /* Fond page */
  --color-card:          #ffffff;  /* Fond cartes */
  --shadow-card:         0 2px 8px rgba(0,0,0,0.08);
  --radius-card:         12px;
  --sidebar-width:       256px;
  --header-height:       64px;
}
```

La palette marron/beige reflète l'identité visuelle agricole du projet, cohérente avec les maquettes fournies.

---

## 4. Description des composants CSS

### 4.1 Header fixe
Header positionné en `fixed` sur toute la largeur avec indicateur de statut API (point vert animé + texte). La navigation principale affiche la page active avec un soulignement marron.

### 4.2 Sidebar fixe
Sidebar de 256px fixée à gauche sous le header. Le lien actif est surligné en marron avec ombre portée. Compatible responsive : la sidebar se cache sur mobile (< 768px).

### 4.3 Cartes stats (Dashboard)
Grille de 3 colonnes avec 6 cartes. Chaque carte affiche une icône Material Symbols, une valeur numérique animée (animation `count-up`) et un libellé. La carte "Alertes critiques" utilise la couleur rouge.

### 4.4 Système d'alertes
Trois niveaux visuellement distincts :
- `alerte-critical` : fond rouge clair, bordure gauche rouge
- `alerte-warning` : fond orange clair, bordure gauche orange
- `alerte-info` : fond bleu clair, bordure gauche bleu

### 4.5 Interface Chat
- Bulles utilisateur : fond marron, texte blanc, alignées à droite
- Bulles bot : fond blanc, bordure grise, alignées à gauche
- Bulle confirmation : fond jaune clair, bordure orange (pour les actions PL/SQL)
- Prévisualisation SQL : fond sombre (`#1e293b`), texte monospace

### 4.6 Tableaux de données
Header marron avec texte blanc, lignes alternées (blanc/beige), hover en `--color-primary-light`. Utilisés dans les pages Troupeau et Santé.

### 4.7 Modale
Overlay semi-transparent avec animation `fadeIn`. Contenu avec animation `slideUp`. Fermeture au clic extérieur gérée par `nav.js`.

---

## 5. Description des 4 pages HTML

### 5.1 index.html — Dashboard
- 6 cartes statistiques (animaux actifs, gestations, alertes actives, alertes critiques, ventes du mois, CA du mois)
- Section alertes récentes avec bouton "traiter" par alerte
- Section gestations en cours avec jours restants
- Les données sont chargées par `dashboard.js` (Paquet C)

### 5.2 chat.html — Chat LLM
- 6 boutons de suggestions rapides (troupeau complet, GMQ faibles, gestations, vaccinations, saisir pesée, coût alimentation)
- Zone de chat avec bulles user/bot/confirmation
- Input + bouton Envoyer avec raccourci clavier Entrée
- Zone résultats tableau (masquée par défaut, affichée par `chat.js`)

### 5.3 troupeau.html — Gestion du troupeau
- Barre de filtres : sexe (M/F/tous), race (select dynamique), recherche texte
- Tableau complet avec colonnes : tag, nom, race, sexe, âge, poids, GMQ, actions
- Boutons par ligne : "Pesées", "Coût total", "Rapport nutritionnel"
- Modale légère pour l'affichage des détails

### 5.4 sante.html — Suivi sanitaire
- Section alertes santé en haut (vaccination, santé)
- Filtre par type d'acte (vaccination, traitement, examen, chirurgie)
- Tableau des actes vétérinaires avec colonnes : animal, type, description, date, vétérinaire, médicament, coût, prochain RDV

---

## 6. Navigation partagée — nav.js

Le fichier `nav.js` gère trois fonctions communes à toutes les pages :

1. **`setActiveLink()`** : détecte la page courante via `window.location.pathname` et applique les classes `nav-active`/`sidebar-active` sur les bons liens
2. **`pingAPI()`** : effectue un `fetch('/health')` toutes les 30 secondes et met à jour l'indicateur (point vert/rouge + texte)
3. **`DOMContentLoaded`** : déclenche les deux fonctions au chargement de chaque page

---

## 7. Responsive design

Le CSS inclut un breakpoint à 768px qui :
- Masque la sidebar (les pages restent utilisables sur mobile)
- Masque la navigation header
- Passe la grille stats en 2 colonnes
- Passe la grille bas de dashboard en 1 colonne
- Passe les filtres en colonne unique

---

## 8. Bilan et difficultés

### Ce qui a bien fonctionné
- La séparation HTML/CSS/JS a facilité le travail en parallèle avec les autres membres
- Les variables CSS ont permis de maintenir une cohérence visuelle sur les 4 pages sans duplication
- Le rendu visuel est conforme aux maquettes fournies par Sall

### Difficultés rencontrées
- L'alignement précis du layout (header fixe + sidebar fixe + contenu principal) a nécessité des ajustements de `margin-left` et `margin-top`
- Les chemins relatifs `../css/style.css` et `../js/nav.js` depuis `frontend/html/` ont été vérifiés pour fonctionner correctement avec nginx (Paquet D)

---

## 9. Checklist B-03

| Point de contrôle | Statut |
|-------------------|--------|
| Les 4 pages HTML s'affichent correctement sans JS | 
| style.css est responsive à 375px (mobile) | 
| nav.js est partagé par les 4 pages | 
| Les chemins relatifs CSS/JS sont corrects | 
| Fichiers JS vides créés pour Paquet C | 
| Commit pushé sur dev-kane-s2 | 