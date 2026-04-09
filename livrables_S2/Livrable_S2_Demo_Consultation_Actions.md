# Livrable Semaine 2 — BoviBot
## Démo : Consultation & Actions — Rapport Technique Consolidé

**Établissement :** ESP/UCAD — DIC2 IABD-SSI-TR  
**Projet :** BoviBot — Gestion d'Élevage Bovin avec Intelligence Artificielle et PL/SQL  
**Milestone :** M2 — Intégration & Déploiement  
**Date de livraison :** 08 avril 2026  
**Branche principale :** `main` (fusion depuis `develop`)

---

## Équipe Projet

| Membre | Rôle | Branche S2 | Paquet |
|--------|------|-----------|--------|
| **Mouhamadou Madeniyou SALL** | Tech Lead / Backend & AI Engineer | `dev-sall-s2` | A — Backend, IA, PL/SQL |
| **Abdoul Aziz KANE** | Frontend Architect | `dev-kane-s2` | B — Structure HTML & Design System CSS |
| **Anna NDOYE** | Frontend JS Engineer | `dev-anna-s2` | C — Connexion JS ↔ API |
| **Fatoumata BARRO** | DevOps / Infrastructure | `dev-barro-s2` | D — Docker & Déploiement VPS |

---

## Table des Matières

1. [Vision et Objectif du Livrable](#1-vision-et-objectif-du-livrable)
2. [Architecture Globale du Système](#2-architecture-globale-du-système)
3. [Paquet A — Intelligence Artificielle, Backend & PL/SQL (Sall)](#3-paquet-a--intelligence-artificielle-backend--plsql-sall)
4. [Paquet B — Structure HTML & Design System CSS (Kane)](#4-paquet-b--structure-html--design-system-css-kane)
5. [Paquet C — Frontend JS & Connexion Backend (Anna)](#5-paquet-c--frontend-js--connexion-backend-anna)
6. [Paquet D — Containerisation Docker & Déploiement VPS (Barro)](#6-paquet-d--containerisation-docker--déploiement-vps-barro)
7. [Démonstration des 5 Cas Cahier des Charges](#7-démonstration-des-5-cas-cahier-des-charges)
8. [Flux Complet : Du Langage Naturel à l'Action](#8-flux-complet--du-langage-naturel-à-laction)
9. [Infrastructure de Production](#9-infrastructure-de-production)
10. [Validation & Assurance Qualité](#10-validation--assurance-qualité)
11. [Défis Techniques & Résolutions](#11-défis-techniques--résolutions)
12. [Récapitulatif Git & Livrables](#12-récapitulatif-git--livrables)
13. [Checklist Finale Consolidée](#13-checklist-finale-consolidée)

---

## 1. Vision et Objectif du Livrable

### 1.1 Contexte

BoviBot est un système de gestion d'élevage bovin conçu pour les éleveurs sénégalais. L'ambition centrale du projet est de permettre à un éleveur — sans formation informatique avancée — d'**interagir avec sa base de données en langage naturel** : poser des questions sur son troupeau, enregistrer des pesées, déclarer des ventes, consulter des rapports nutritionnels, le tout via une interface conversationnelle connectée à un LLM.

La Semaine 2 représente la **phase d'intégration totale** : l'intelligence artificielle, la logique métier PL/SQL, le frontend interactif et l'infrastructure de déploiement sont assemblés en un système cohérent, déployable sur VPS.

### 1.2 Ce que démontre ce livrable

Ce document atteste de la capacité du système BoviBot à :

1. **Consulter** les données du troupeau en langage naturel (Text-to-SQL via LLM)
2. **Effectuer des actions métier** validées par confirmation explicite (pesées, ventes)
3. **Présenter des visualisations** en temps réel (tableau de bord, alertes, genealogie)
4. **Fonctionner en production** sur VPS via une architecture Docker containerisée

### 1.3 Périmètre fonctionnel couvert

```
┌─────────────────────────────────────────────────────────────────┐
│                      BOVIBOT v1.0 — S2                         │
├──────────────────┬──────────────────┬──────────────────────────┤
│   CONSULTATION   │     ACTIONS      │       MONITORING         │
│                  │                  │                          │
│ • Liste troupeau │ • Pesée (PL/SQL) │ • Dashboard KPI          │
│ • GMQ & Âge      │ • Vente (PL/SQL) │ • Alertes temps réel     │
│ • Gestations     │ • Confirmation   │ • Généalogie animale     │
│ • Coûts élevage  │   explicite      │ • Suivi sanitaire        │
│ • Actes vétérin. │                  │ • Rapports nutritionnels │
└──────────────────┴──────────────────┴──────────────────────────┘
```

---

## 2. Architecture Globale du Système

### 2.1 Vue d'ensemble

```
┌───────────────────────────────────────────────────────────────────┐
│                        VPS (Ubuntu 22.04)                        │
│                                                                   │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐  │
│  │   NGINX     │    │    FASTAPI       │    │   MySQL 8.0     │  │
│  │ (Port 80)   │───▶│  (Port 8002)     │───▶│  (Port 3306)    │  │
│  │             │    │                  │    │                 │  │
│  │ Reverse     │    │ • Routes REST    │    │ • 8 Tables      │  │
│  │ Proxy       │    │ • LLM Orches.    │    │ • 5 Fonctions   │  │
│  │ CORS élim.  │    │ • PL/SQL calls   │    │ • 3 Triggers    │  │
│  │ Statiques   │    │ • Validation     │    │ • 2 Events      │  │
│  └─────────────┘    └──────────────────┘    │ • 1 Procédure   │  │
│         │                                   └─────────────────┘  │
│         │                                                         │
│  ┌──────▼──────────────────────────────────────────────────────┐  │
│  │                   FRONTEND (HTML/CSS/JS)                    │  │
│  │  index.html │ chat.html │ troupeau.html │ sante.html        │  │
│  │  genealogie.html                                            │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### 2.2 Réseau Docker interne

Les trois services communiquent sur un réseau Docker isolé (`bovibot_network`). La base de données n'est **jamais exposée** directement sur un port public — seul le backend y accède, et seul Nginx est exposé sur le port 80.

```yaml
# Topologie réseau Docker
Internet ──▶ Nginx (80) ──▶ backend:8002 ──▶ db:3306
                 │
                 └──▶ frontend statique (fichiers servis directement)
```

### 2.3 Schéma de données (8 tables)

```
races ◄────────── animaux ────────────┐
                     │  │             │
                   mere_id          pere_id
                     │                │
                  pesees           reproduction
                  sante            alimentation
                  ventes           alertes
                                 historique_statut
```

Les colonnes `mere_id` et `pere_id` dans `animaux` sont des **clés étrangères auto-référencées**, support de la fonctionnalité de généalogie.

---

## 3. Paquet A — Intelligence Artificielle, Backend & PL/SQL (Sall)

### 3.1 Responsabilités

Sall a pris en charge l'ensemble de la couche intelligente du système :
- Conception du pipeline **Text-to-SQL** via LLM
- Implémentation des **extensions PL/SQL** avancées
- Architecture des **routes FastAPI** avec sécurité et validation
- **Prompt Engineering** structuré pour une fiabilité maximale

### 3.2 Pipeline Text-to-SQL — Architecture du Prompt

Le cœur de BoviBot est un compilateur de langage naturel vers SQL. La stratégie retenue est le **Few-Shot Prompting à 4 piliers**, implémentée dans `app.py`.

#### Pilier 1 — Ingestion du Schéma Annoté (`DB_SCHEMA`)

Contrairement à un simple dump DDL, le schéma transmis au LLM est **enrichi sémantiquement** :

```python
DB_SCHEMA = """
Tables MySQL :
- animaux(id, numero_tag, nom, race_id, sexe[M/F], date_naissance,
  poids_actuel, statut[actif/vendu/mort/quarantaine], mere_id, pere_id,
  notes, created_at)
  (Note : numero_tag est l'identifiant unique VISIBLE (ex: TAG-001).
   race_id -> races.id. mere_id et pere_id sont des FK vers animaux.id
   pour la généalogie.)
- pesees(id, animal_id, poids_kg, date_pesee, agent, notes)
- reproduction(id, mere_id, pere_id, date_saillie, date_velage_prevue,
  date_velage_reelle, nb_veaux, statut[en_gestation/vele/avortement/echec])
...
"""
```

Le LLM comprend ainsi la distinction entre `numero_tag` (visible à l'éleveur) et `id` (clé technique interne), ce qui évite les hallucinations d'identifiants.

#### Pilier 2 — Contrôle de Flux (`SYSTEM_PROMPT`)

Le `SYSTEM_PROMPT` impose trois contraintes absolues :

1. **Sécurité Négative :** Interdiction stricte de `DROP`, `DELETE`, `UPDATE`, `INSERT` directs. Seules les procédures stockées autorisées peuvent modifier les données.

2. **Priorisation PL/SQL :** Injection de règles forçant l'utilisation des fonctions MySQL pour les calculs :
   ```
   RÈGLE : Pour tout calcul d'âge → utiliser fn_age_en_mois(id)
   RÈGLE : Pour tout calcul de croissance → utiliser fn_gmq(id)
   RÈGLE : Pour tout calcul de coût → utiliser fn_cout_total_elevage(id)
   ```

3. **Standardisation du Format de Sortie :** Le LLM retourne **exclusivement du JSON pur**, structuré selon le schéma suivant :
   ```json
   {
     "type": "query | action_pending | info",
     "sql": "SELECT ...",
     "procedure": "sp_enregistrer_pesee",
     "params": {"animal_id": 1, "poids_kg": 325},
     "message": "Confirmation requise : ..."
   }
   ```

#### Pilier 3 — Exemples Few-Shot

Des exemples de couples (question → réponse JSON) couvrent tous les cas du cahier des charges, ancrant le comportement du LLM dans les patterns attendus.

#### Pilier 4 — Bloc de Résolution d'Ambiguïté (Innovation)

Lorsque la requête est ambiguë ou qu'une donnée est manquante (ex : "Enregistre une pesée pour la vache" sans préciser le tag), le LLM bascule en mode `type: info` et **formule une question de clarification** plutôt que d'halluciner un identifiant :

```json
{
  "type": "info",
  "message": "Je ne trouve pas d'animal correspondant. Pouvez-vous préciser le numéro de tag (ex: TAG-001) ?"
}
```

Ce mécanisme élimine une classe entière d'erreurs silencieuses.

### 3.3 Sécurité — Prompt Injection Guard

Une fonction `sanitize_input()` analyse chaque message entrant avant qu'il soit transmis au LLM, bloquant les patterns suspects :

```python
suspicious_patterns = [
    r"ignore.*instructions", r"oublie.*contexte",
    r"SELECT.*FROM.*information_schema",
    r"DROP\s+TABLE", r"config", r"secret",
    r"base64", r"rot13", r"traduis.*en.*sql"
]
```

Toute correspondance lève une `HTTPException(400)` avec le message `"Requête suspecte détectée (Prompt Injection)"`.

### 3.4 Extensions PL/SQL Avancées

Quatre objets SQL ont été déployés dans le moteur MySQL pour déporter l'intelligence métier côté base de données :

#### `fn_cout_total_elevage(animal_id)` — Agrégateur de Coûts

Calcule le coût total d'élevage d'un animal en cumulant deux dimensions :
- **Santé :** Somme des coûts de tous les actes vétérinaires (`sante.cout`)
- **Nutrition :** Somme des coûts de toutes les rations d'alimentation (`alimentation.cout_total`)

```sql
CREATE FUNCTION fn_cout_total_elevage(p_id INT)
RETURNS DECIMAL(12,2) READS SQL DATA
BEGIN
  DECLARE cout_sante DECIMAL(12,2) DEFAULT 0;
  DECLARE cout_alim DECIMAL(12,2) DEFAULT 0;
  SELECT COALESCE(SUM(cout),0) INTO cout_sante FROM sante WHERE animal_id = p_id;
  SELECT COALESCE(SUM(cout_total),0) INTO cout_alim FROM alimentation WHERE animal_id = p_id;
  RETURN cout_sante + cout_alim;
END
```

#### `sp_rapport_nutritionnel(animal_id)` — Analyse Temporelle

Procédure d'analyse sur fenêtre de 30 jours. Génère :
- Poids minimum, maximum, moyen sur la période
- GMQ calculé (delta poids / delta jours)
- Nombre de pesées effectuées
- Alerte automatique si fréquence insuffisante

Ces statistiques alimentent dynamiquement le système d'alertes `alertes`.

#### `trg_alerte_pesee_manquante` — Mécanisme de Vigilance Passive

Trigger `AFTER INSERT` sur `pesees`. Si le délai depuis la dernière pesée d'un animal dépasse un seuil configurable, une alerte de niveau `warning` est automatiquement créée dans la table `alertes`. Aucun animal n'échappe au suivi de croissance.

#### `evt_alerte_cout_mensuel` — Agent Financier Automatisé

Event MySQL planifié en exécution mensuelle. Parcourt tous les animaux actifs, calcule leur coût via `fn_cout_total_elevage()`, et crée une alerte `info` pour les animaux dont le coût dépasse un seuil prédéfini. Ce mécanisme de surveillance financière est entièrement autonome.

### 3.5 Routes FastAPI — Interface RESTful

L'API expose une interface RESTful complète avec validation de types Pydantic :

| Méthode | Route | Description | PL/SQL utilisé |
|---------|-------|-------------|----------------|
| `GET` | `/api/dashboard` | KPIs temps réel | `fn_gmq`, `fn_age_en_mois` |
| `GET` | `/api/animaux` | Liste troupeau actif | `fn_gmq`, `fn_age_en_mois` |
| `GET` | `/api/animaux/{id}/genealogie` | Arbre généalogique | `fn_gmq`, `fn_rentabilite_estimee` |
| `GET` | `/api/animaux/{id}/cout-total` | Coût élevage | `fn_cout_total_elevage` |
| `GET` | `/api/animaux/{id}/pesees` | Historique pesées | — |
| `GET` | `/api/alertes` | Alertes actives | — |
| `POST` | `/api/alertes/{id}/traiter` | Marquer alerte traitée | `sp_traiter_alerte` |
| `GET` | `/api/reproduction/en-cours` | Gestations actives | `DATEDIFF` |
| `GET` | `/api/sante` | Actes vétérinaires | — |
| `POST` | `/api/chat` | Interface LLM | Tous |
| `GET` | `/health` | Healthcheck | — |

**Gestion transactionnelle :** Les appels aux procédures stockées sont encapsulés dans des blocs `try/except` via `call_procedure()`, avec rollback automatique en cas d'erreur.

### 3.6 Endpoint Chat — Orchestrateur Principal

```python
@app.post("/api/chat")
def chat(body: ChatRequest):
    # 1. Sanitisation de l'entrée
    sanitize_input(body.message)
    
    # 2. Construction du contexte (6 derniers tours)
    messages = build_context(body.history, body.message)
    
    # 3. Appel LLM
    llm_response = call_llm(messages)
    parsed = json.loads(llm_response)
    
    # 4. Routing selon le type de réponse
    if parsed["type"] == "query":
        results = execute_query(parsed["sql"])
        return {"type": "query", "data": results}
    
    elif parsed["type"] == "action_pending":
        return {"type": "action_pending", 
                "message": parsed["message"],
                "procedure": parsed["procedure"],
                "params": parsed["params"]}
    
    elif parsed["type"] == "info":
        return {"type": "info", "message": parsed["message"]}
```

---

## 4. Paquet B — Structure HTML & Design System CSS (Kane)

### 4.1 Responsabilités

Kane a conçu l'intégralité de la couche de présentation : structure des 4 pages HTML, design system CSS global, et système de navigation partagé. Ce travail devait être livré avant le Paquet C pour que Anna puisse connecter le JavaScript.

### 4.2 Structure des Fichiers Frontend

```
frontend/
├── html/
│   ├── index.html        # Dashboard principal
│   ├── chat.html         # Interface Chat LLM
│   ├── troupeau.html     # Gestion du troupeau
│   ├── sante.html        # Suivi sanitaire
│   └── genealogie.html   # Arbre généalogique
├── css/
│   └── style.css         # Design system global (CSS vanilla)
└── js/
    ├── nav.js            # Navigation partagée (Paquet B)
    ├── dashboard.js      # Logique Dashboard (Paquet C)
    ├── chat.js           # Logique Chat (Paquet C)
    ├── troupeau.js       # Logique Troupeau (Paquet C)
    ├── sante.js          # Logique Santé (Paquet C)
    └── genealogie.js     # Logique Généalogie (Paquet A)
```

### 4.3 Design System — Variables CSS

Toutes les couleurs, dimensions et ombres sont centralisées dans `:root` pour une cohérence visuelle absolue sur les 5 pages :

```css
:root {
  /* Palette identité agricole */
  --color-primary:       #7c4f1e;   /* Marron principal */
  --color-primary-light: #fdf6ec;   /* Fond clair chaleureux */
  --color-primary-dark:  #5a3a15;   /* Marron foncé */

  /* Sémantique métier */
  --color-critical:      #dc2626;   /* Alertes critiques (rouge) */
  --color-warning:       #f59e0b;   /* Avertissements (orange) */
  --color-info:          #3b82f6;   /* Informations (bleu) */
  --color-success:       #16a34a;   /* Succès / valeurs normales (vert) */

  /* Layout */
  --color-bg:            #f5f0e8;   /* Fond page (beige doux) */
  --color-card:          #ffffff;   /* Fond cartes (blanc) */
  --shadow-card:         0 2px 8px rgba(0,0,0,0.08);
  --radius-card:         12px;
  --sidebar-width:       256px;
  --header-height:       64px;
}
```

**Choix de la palette :** Le marron/beige reflète l'identité agricole du projet, cohérent avec les maquettes et différenciant BoviBot de toute application générique.

**Typographie :** Google Fonts — Manrope (titres, forte lisibilité) + Public Sans (corps de texte, haute densité d'information). Material Symbols Outlined pour les icônes, correspondant exactement aux maquettes fournies.

### 4.4 Composants CSS Détaillés

#### Header Fixe
Positionné en `fixed` sur toute la largeur, hauteur `64px`. Contient :
- Logo BoviBot avec icône vache
- Navigation principale avec lien actif souligné en marron
- **Indicateur de statut API** : point animé vert/rouge + texte "API EN LIGNE / API HORS LIGNE", mis à jour toutes les 30s par `nav.js`

#### Sidebar Fixe (256px)
Fixée à gauche sous le header, `height: calc(100vh - 64px)`. Comportement :
- Lien actif : fond marron, texte blanc, ombre portée légère
- Sur mobile (< 768px) : masquée par défaut, accessible via le bouton hamburger avec overlay semi-transparent

#### Cartes Statistiques (Dashboard)
Grille 3 colonnes, 6 cartes. Chaque carte :
- Icône Material Symbols de grande taille
- Valeur numérique avec animation `count-up` au chargement
- Libellé en sous-titre
- La carte "Alertes critiques" utilise le rouge `--color-critical` comme couleur d'accent

#### Système d'Alertes — 3 Niveaux Visuels
```css
.alerte-critical { background: #fef2f2; border-left: 4px solid #dc2626; }
.alerte-warning  { background: #fffbeb; border-left: 4px solid #f59e0b; }
.alerte-info     { background: #eff6ff; border-left: 4px solid #3b82f6; }
```

#### Interface Chat
- **Bulles utilisateur :** fond marron `--color-primary`, texte blanc, alignées à droite, bordure arrondie asymétrique
- **Bulles bot :** fond blanc, bordure grise, alignées à gauche avec avatar robot
- **Bulle de confirmation :** fond jaune clair, bordure orange — signale une action PL/SQL en attente
- **Prévisualisation SQL :** fond sombre `#1e293b`, texte monospace, syntaxe colorée

#### Tableaux de Données
Header fond marron/texte blanc, lignes alternées blanc/beige (`--color-primary-light`), hover en `--color-primary-light` avec transition douce. Scrollable horizontalement sur mobile.

#### Modale
Overlay semi-transparent `rgba(0,0,0,0.5)` avec animation `fadeIn`. Contenu avec animation `slideUp`. Fermeture : bouton ×, clic extérieur, touche `Escape`.

### 4.5 Pages HTML — Structure Détaillée

#### `index.html` — Dashboard Principal
- Section supérieure : 6 cartes KPI (animaux actifs, gestations en cours, alertes actives, alertes critiques, ventes du mois, CA mensuel en FCFA)
- Section alertes récentes : liste colorée avec bouton "Traiter" par alerte
- Section gestations : liste avec jours restants avant vêlage, code couleur J-14/J-30

#### `chat.html` — Interface Conversationnelle LLM
- 6 boutons de suggestions rapides prédéfinis (troupeau complet, GMQ faibles, gestations, vaccinations, saisir pesée, coût alimentation)
- Zone de chat scrollable avec bulles user/bot/confirmation
- Input texte + bouton Envoyer + raccourci clavier `Entrée`
- Zone résultats tableau (masquée par défaut, affichée dynamiquement)

#### `troupeau.html` — Gestion du Troupeau
- Barre de filtres : sexe (M/F/Tous), race (select peuplé dynamiquement), recherche texte libre
- Tableau complet : tag, nom, race, sexe, âge, poids actuel, GMQ (badge coloré), actions
- Boutons par ligne : Détail (modale), Coût Total, Rapport Nutritionnel

#### `sante.html` — Suivi Sanitaire
- Section alertes santé en tête de page (vaccination, poids, santé)
- Filtre par type d'acte (vaccination, traitement, examen, chirurgie)
- Tableau actes vétérinaires : animal, type, description, date, vétérinaire, médicament, coût, prochain RDV

#### `genealogie.html` — Arbre Généalogique
- Sélecteur d'animal principal
- Visualisation en niveaux : Grands-Parents → Parents → Sujet → Enfants
- Connecteurs SVG courbes entre niveaux
- Tooltip au survol : GMQ et rentabilité estimée
- Panneau simulateur de croisement avec détection de consanguinité

### 4.6 Navigation Partagée — `nav.js`

```javascript
// Détection page active et surlignage du lien correspondant
function setActiveLink() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link, .sidebar-link, a').forEach(link => {
    const href = link.getAttribute('href')?.split('/').pop();
    link.classList.toggle('nav-active', href === page);
  });
}

// Ping healthcheck toutes les 30s — indicateur API
function pingAPI() {
  fetch('/health')   // URL relative → fonctionne en local ET sur VPS
    .then(r => {
      const dot = document.getElementById('api-status-dot');
      const txt = document.getElementById('api-status-text');
      dot.style.background = r.ok ? '#16a34a' : '#dc2626';
      txt.textContent = r.ok ? 'API EN LIGNE' : 'API HORS LIGNE';
    })
    .catch(() => { /* API inaccessible → rouge */ });
}
```

> **Note importante :** L'URL utilisée est `'/health'` (relative), et non `'http://localhost:8002/health'` (absolue). Cette décision est critique pour le déploiement VPS : une URL absolue `localhost` ne fonctionne que sur la machine de développement.

### 4.7 Responsive Design

Un breakpoint unique à `768px` couvre les usages mobiles :

| Élément | Desktop | Mobile (< 768px) |
|---------|---------|-----------------|
| Sidebar | Visible, 256px | Masquée, accessible via hamburger |
| Navigation header | Visible | Masquée |
| Grille stats | 3 colonnes | 2 colonnes |
| Grille bas dashboard | 2 colonnes | 1 colonne |
| Filtres | Ligne horizontale | Colonne verticale |
| Tableaux | Fixes | Scroll horizontal |

---

## 5. Paquet C — Frontend JS & Connexion Backend (Anna)

### 5.1 Responsabilités

Anna a pris en charge l'intégralité de la couche JavaScript : connexion de chaque page aux routes API, gestion de l'état applicatif côté client, et implémentation du flux de confirmation des actions PL/SQL.

### 5.2 `dashboard.js` — Tableau de Bord Temps Réel

#### Architecture

Le dashboard est un panneau de monitoring **auto-rafraîchissant** (cycle de 60 secondes) qui charge trois types d'informations en parallèle au chargement de la page.

#### `chargerStats()` — 6 KPIs depuis `/api/dashboard`

```javascript
async function chargerStats() {
  const data = await fetch('/api/dashboard').then(r => r.json());
  document.getElementById('nb-actifs').textContent = data.nb_actifs;
  document.getElementById('nb-gestations').textContent = data.nb_gestations;
  document.getElementById('nb-alertes').textContent = data.nb_alertes;
  document.getElementById('nb-alertes-critiques').textContent = data.nb_alertes_critiques;
  document.getElementById('nb-ventes-mois').textContent = data.nb_ventes_mois;
  document.getElementById('ca-mois').textContent = 
    parseInt(data.ca_mois || 0).toLocaleString('fr-FR') + ' FCFA';
}
```

#### `chargerAlertes()` — 8 Alertes Récentes depuis `/api/alertes`

Chaque alerte est rendue avec couleur sémantique selon son niveau. Les alertes sans animal cible (rapports hebdomadaires de `evt_rapport_croissance`) affichent une icône globale `🌐` en lieu du tag.

#### `traiterAlerte(alertId)` — Action POST avec Feedback Visuel

```javascript
async function traiterAlerte(alertId) {
  const r = await fetch(`/api/alertes/${alertId}/traiter`, {method: 'POST'});
  if (r.ok) {
    // Animation de fondu puis suppression du DOM
    const el = document.getElementById(`alerte-${alertId}`);
    el.style.transition = 'opacity 0.4s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 400);
    // Recalcul des compteurs
    chargerStats();
  }
}
```

#### `chargerGestations()` — Code Couleur J-X

| Jours restants | Couleur | Signification |
|----------------|---------|---------------|
| < 14 jours | Rouge | Vêlage imminent |
| < 30 jours | Orange | Surveiller |
| ≥ 30 jours | Vert | Normal |

**Rafraîchissement :** `setInterval(() => { chargerStats(); chargerAlertes(); chargerGestations(); }, 60000);`

### 5.3 `chat.js` — Interface Conversationnelle LLM

#### État Interne

```javascript
let chatHistory   = [];   // Contexte : 6 derniers échanges (fenêtre glissante)
let pendingAction = null; // Action PL/SQL en attente de confirmation
let isBusy        = false; // Verrou anti double-envoi
```

#### Flux Principal — `sendMessage()`

```
Utilisateur tape → [sanitize client] → POST /api/chat
                                              │
              ┌───────────────────────────────┼───────────────────────────┐
              ▼                               ▼                           ▼
         type: "query"               type: "action_pending"        type: "info"
              │                               │                           │
    afficherTableau(data)        afficherConfirmation(params)    afficher bulle texte
    (tableau HTML dynamique)     (bulle jaune + 2 boutons)
```

#### `afficherConfirmation()` — Flux d'Action Sécurisé

Quand le LLM détecte une action (pesée, vente), une **bulle de confirmation jaune** s'affiche avec le résumé des paramètres :

```
┌─────────────────────────────────────────────────────┐
│  ⚠️  Action détectée : Enregistrement de pesée     │
│                                                     │
│  • Animal : TAG-001 (Koumba)                       │
│  • Poids  : 325 kg                                 │
│  • Date   : 08/04/2026                             │
│  • Agent  : Barro                                  │
│                                                     │
│  [  ✓ Confirmer  ]    [  ✗ Annuler  ]              │
└─────────────────────────────────────────────────────┘
```

L'éleveur doit **explicitement confirmer** avant que `sp_enregistrer_pesee` soit appelée. Ce flux à deux étapes protège contre les actions accidentelles.

#### `confirmerAction()` — Exécution de la Procédure Stockée

```javascript
async function confirmerAction() {
  const r = await fetch('/api/chat', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      message: '',
      history: chatHistory,
      confirm_action: true,
      pending_action: pendingAction
    })
  });
  const data = await r.json();
  if (data.type === 'action_done') {
    addMessage('bot', `<span style="color:#16a34a">✓ ${data.message}</span>`);
  }
  pendingAction = null;
  isBusy = false;
}
```

#### `afficherTableau(data)` — Génération Dynamique

Colonnes détectées automatiquement depuis les clés du premier objet. Formatages spéciaux :
- Colonnes contenant `date` → format `dd/mm/yyyy` français
- Colonnes `gmq` → 3 décimales
- Colonnes `cout`, `prix`, `ca` → `toLocaleString('fr-FR') + ' FCFA'`
- Colonnes `statut` → badge coloré

#### Lecture des URLSearchParams

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const q = new URLSearchParams(window.location.search).get('q');
  if (q) {
    document.getElementById('chat-input').value = decodeURIComponent(q);
    sendMessage();  // Envoi automatique si redirection depuis Troupeau
  }
});
```

Cette fonctionnalité permet la redirection depuis `troupeau.html` vers le chat avec une question pré-remplie (ex : "Génère le rapport nutritionnel de TAG-007").

### 5.4 `troupeau.js` — Gestion du Troupeau

#### Cache Côté Client

```javascript
let tousAnimaux = []; // Cache en mémoire après premier chargement
```

Tous les filtres opèrent sur ce cache **sans appel API supplémentaire**, garantissant une réactivité instantanée.

#### `chargerTroupeau()` — Chargement Initial depuis `/api/animaux`

Charge tous les animaux actifs avec `fn_age_en_mois()` et `fn_gmq()` pré-calculés côté MySQL. Les races distinctes sont extraites du résultat pour peupler le `<select>` de filtrage dynamiquement.

#### `afficherTroupeau(animaux)` — Badges GMQ

| GMQ | Badge | Signification |
|-----|-------|---------------|
| < 0.3 kg/j | Rouge | Alerte croissance |
| < 0.5 kg/j | Orange | Croissance faible |
| ≥ 0.5 kg/j | Vert | Croissance normale |

#### `filtrerTroupeau()` — Triple Filtre Simultané

```javascript
function filtrerTroupeau() {
  const sexe = document.getElementById('filtre-sexe').value;
  const race = document.getElementById('filtre-race').value;
  const texte = document.getElementById('recherche').value.toLowerCase();

  const filtrés = tousAnimaux.filter(a =>
    (sexe === 'tous' || a.sexe === sexe) &&
    (race === 'toutes' || a.race_nom === race) &&
    (a.numero_tag.toLowerCase().includes(texte) || 
     (a.nom || '').toLowerCase().includes(texte))
  );
  afficherTroupeau(filtrés);
}
```

#### `ouvrirModal()` — Chargement Parallèle

```javascript
async function ouvrirModal(animalId, tag, nom) {
  const [pesees, historique] = await Promise.all([
    fetch(`/api/animaux/${animalId}/pesees`).then(r => r.json()),
    fetch(`/api/animaux/${animalId}/historique-statut`).then(r => r.json())
  ]);
  // Réduit de 50% le temps de chargement vs requêtes séquentielles
}
```

### 5.5 `sante.js` — Suivi Sanitaire

#### Badges Actes Vétérinaires

| Type | Icône | Couleur |
|------|-------|---------|
| Vaccination | 💉 | Vert |
| Traitement | 🩺 | Orange |
| Examen | 🔍 | Bleu |
| Chirurgie | ✂️ | Rouge |

#### Code Couleur `prochain_rdv`

| Échéance | Couleur |
|----------|---------|
| Date dépassée | Rouge — RDV manqué |
| Dans les 7 jours | Orange — Urgent |
| Au-delà | Vert — Planifié |

#### Filtrage Contextuel des Alertes

`chargerAlertesSante()` ne conserve que les alertes de types `vaccination`, `sante` et `poids`, excluant les alertes globales de type `autre` (rapports financiers), pertinentes uniquement pour le dashboard.

### 5.6 Sécurité Frontend — `escapeHtml()`

Toutes les données provenant de l'API sont **systématiquement échappées** avant injection dans le DOM :

```javascript
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

Appliqué sur toutes les valeurs de type `string` venant de l'API — protection XSS même si les données proviennent d'une source interne contrôlée.

---

## 6. Paquet D — Containerisation Docker & Déploiement VPS (Barro)

### 6.1 Responsabilités

Barro a conçu l'infrastructure Docker complète et le pipeline de déploiement VPS, assurant que l'application développée localement soit déployable en production avec une seule commande.

### 6.2 `Dockerfile` — Image Backend

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8002
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8002"]
```

**Choix techniques :**
- `python:3.11-slim` : image minimale, ~50 Mo au lieu de ~900 Mo pour l'image standard
- `--no-cache-dir` : réduit la taille finale de l'image en évitant le cache pip
- `--host 0.0.0.0` : écoute sur toutes les interfaces réseau du container (nécessaire pour que Nginx puisse y accéder)

### 6.3 `nginx.conf` — Reverse Proxy

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index html/index.html;

    # Fichiers statiques frontend
    location / {
        try_files $uri $uri/ /html/index.html;
    }

    # Proxy vers le backend FastAPI
    location /api/ {
        proxy_pass http://backend:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Healthcheck
    location /health {
        proxy_pass http://backend:8002;
    }
}
```

**Rôles de Nginx :**
1. **Reverse Proxy :** Route les appels `/api/*` et `/health` vers le container `backend:8002`
2. **Élimination CORS :** Frontend et API partagent la même origine (port 80) → pas de problème de CORS
3. **Fichiers statiques :** Sert directement le HTML/CSS/JS sans passer par Python → performance optimale
4. **Sécurité :** MySQL (port 3306) n'est jamais exposé publiquement

### 6.4 `docker-compose.yml` — Orchestration 3 Services

```yaml
version: '3.8'

services:
  db:
    image: mysql:8.0
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./schema.sql:/docker-entrypoint-initdb.d/schema.sql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: .
    restart: always
    env_file: .env
    ports:
      - "8002:8002"
    depends_on:
      db:
        condition: service_healthy

  frontend:
    image: nginx:alpine
    restart: always
    ports:
      - "8080:80"
    volumes:
      - ./frontend:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend

volumes:
  mysql_data:
```

**Points critiques :**
- `depends_on: condition: service_healthy` : le backend ne démarre **que quand MySQL est prêt** (via le healthcheck `mysqladmin ping`), évitant les erreurs de connexion au démarrage
- `mysql_data` volume nommé : les données de production **survivent aux `docker compose down`**
- `./schema.sql:/docker-entrypoint-initdb.d/` : initialisation automatique du schéma au premier démarrage

### 6.5 Configuration Environnement — `.env.example`

```env
# Base de données (DB_HOST = nom du service Docker, pas localhost)
DB_HOST=db
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=bovibot

# LLM
LLM_API_KEY=
LLM_MODEL=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com/v1
```

> **Attention :** `DB_HOST=db` (nom du service Docker dans le réseau interne) et non `localhost`. C'est une erreur fréquente en migration local → Docker.

### 6.6 Procédure de Déploiement VPS

#### Prérequis VPS

| Élément | Minimum recommandé |
|---------|-------------------|
| OS | Ubuntu 22.04 LTS |
| RAM | 2 Go |
| CPU | 1 vCPU |
| Stockage | 20 Go SSD |
| Ports ouverts | 80, 443, 22 |

#### Déploiement en 5 étapes

```bash
# 1. Installer Docker sur Ubuntu
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. Cloner le projet
git clone https://github.com/MADENIYOU/bovibot.git
cd bovibot

# 3. Configurer les variables d'environnement
cp .env.example .env
nano .env   # Remplir DB_PASSWORD et LLM_API_KEY

# 4. Lancer en production (mode détaché)
docker compose up -d --build

# 5. Vérifier le déploiement
curl http://localhost:8080/          # → HTML Dashboard
curl http://localhost:8002/health    # → {"status":"ok"}
```

#### Commandes de Diagnostic

```bash
docker compose logs backend     # Logs FastAPI
docker compose logs db          # Logs MySQL
docker compose ps               # État des services
docker compose restart backend  # Redémarrage backend seul
```

---

## 7. Démonstration des 5 Cas Cahier des Charges

Ces 5 cas constituent le cœur de la démonstration du livrable. Ils ont été validés sur l'application déployée.

### Cas 1 — Consultation du Troupeau Complet

**Requête :** *"Liste tous les animaux actifs avec leur âge et leur GMQ"*

**Traitement LLM :**
```json
{
  "type": "query",
  "sql": "SELECT a.numero_tag, a.nom, r.nom as race, a.sexe, fn_age_en_mois(a.id) as age_mois, fn_gmq(a.id) as gmq, a.poids_actuel FROM animaux a JOIN races r ON a.race_id = r.id WHERE a.statut = 'actif' ORDER BY a.numero_tag"
}
```

**Résultat :** Tableau avec 15 animaux, âge calculé côté MySQL par `fn_age_en_mois()`, GMQ calculé par `fn_gmq()`. Badges colorés selon la valeur GMQ. ✅

---

### Cas 2 — Analyse de Croissance

**Requête :** *"Quels animaux ont un GMQ inférieur à 0.3 kg par jour ?"*

**Traitement LLM :**
```json
{
  "type": "query",
  "sql": "SELECT a.numero_tag, a.nom, fn_gmq(a.id) as gmq, fn_age_en_mois(a.id) as age_mois FROM animaux a WHERE a.statut = 'actif' AND fn_gmq(a.id) < 0.3 ORDER BY fn_gmq(a.id) ASC"
}
```

**Résultat :** Liste des animaux en sous-performance, triés par GMQ croissant. Permet à l'éleveur d'identifier immédiatement les animaux à surveiller. ✅

---

### Cas 3 — Suivi des Gestations

**Requête :** *"Quelles femelles vêlent dans les 30 prochains jours ?"*

**Traitement LLM :**
```json
{
  "type": "query",
  "sql": "SELECT a.numero_tag, a.nom, r.date_velage_prevue, DATEDIFF(r.date_velage_prevue, CURDATE()) as jours_restants FROM reproduction r JOIN animaux a ON r.mere_id = a.id WHERE r.statut = 'en_gestation' AND DATEDIFF(r.date_velage_prevue, CURDATE()) BETWEEN 0 AND 30 ORDER BY r.date_velage_prevue ASC"
}
```

**Résultat :** Tableau des gestations imminentes avec nombre de jours restants, code couleur rouge (<14j) / orange (<30j). ✅

---

### Cas 4 — Action : Enregistrement de Pesée

**Requête :** *"Enregistre une pesée de 325 kg pour TAG-001 aujourd'hui"*

**Étape 1 — LLM détecte une action :**
```json
{
  "type": "action_pending",
  "procedure": "sp_enregistrer_pesee",
  "params": {"animal_id": 1, "poids_kg": 325, "date_pesee": "2026-04-08", "agent": "Système"},
  "message": "Confirmation requise : enregistrer 325 kg pour TAG-001 (Koumba) le 08/04/2026 ?"
}
```

**Étape 2 — Bulle de confirmation affichée** (fond jaune, 2 boutons)

**Étape 3 — Utilisateur clique "Confirmer" :**
```python
# Backend exécute :
cursor.callproc("sp_enregistrer_pesee", [1, 325, "2026-04-08", "Système", ""])
conn.commit()
```

**Résultat :** Pesée enregistrée. `trg_alerte_pesee_manquante` vérifie le délai. Message de confirmation vert affiché dans le chat. ✅

---

### Cas 5 — Action : Déclaration de Vente

**Requête :** *"Déclare la vente de TAG-003 à Oumar Ba pour 280 000 FCFA"*

**Étape 1 — LLM détecte une action :**
```json
{
  "type": "action_pending",
  "procedure": "sp_declarer_vente",
  "params": {"animal_id": 3, "acheteur": "Oumar Ba", "prix_vente": 280000, "date_vente": "2026-04-08"},
  "message": "Confirmation requise : vendre TAG-003 à Oumar Ba pour 280 000 FCFA le 08/04/2026 ?"
}
```

**Étape 2 — Bulle de confirmation + validation utilisateur**

**Étape 3 — Exécution :**
```python
cursor.callproc("sp_declarer_vente", [3, "Oumar Ba", 280000, "2026-04-08"])
conn.commit()
# → statut de l'animal passe à 'vendu' (trg_historique_statut logue le changement)
# → entrée créée dans la table ventes
```

**Résultat :** Vente enregistrée. Statut TAG-003 mis à jour vers `vendu`. L'animal disparaît de la liste des animaux actifs. ✅

---

## 8. Flux Complet : Du Langage Naturel à l'Action

### 8.1 Diagramme de Flux — Requête de Consultation

```
Éleveur saisit : "Quels animaux ont un GMQ < 0.3 ?"
        │
        ▼
    [chat.js] sanitize_client + isBusy = true
        │
        ▼
    POST /api/chat
    { message: "...", history: [...6 derniers tours...] }
        │
        ▼
    [app.py] sanitize_input() → LLM API
        │
        ▼
    [LLM] analyse + génère JSON
    { type: "query", sql: "SELECT ... fn_gmq(a.id) < 0.3 ..." }
        │
        ▼
    [app.py] execute_query(sql)
        │
        ▼
    [MySQL] fn_gmq(id) calculé pour chaque animal actif
        │
        ▼
    [app.py] retourne { type: "query", data: [...résultats...] }
        │
        ▼
    [chat.js] afficherTableau(data) → HTML injecté dans le DOM
        │
        ▼
    Éleveur voit le tableau : TAG-007 (0.21 kg/j), TAG-012 (0.18 kg/j)...
```

### 8.2 Diagramme de Flux — Action avec Confirmation

```
Éleveur saisit : "Pesée 325 kg pour TAG-001 aujourd'hui"
        │
        ▼
    POST /api/chat → LLM → { type: "action_pending", procedure: "sp_enregistrer_pesee", params: {...} }
        │
        ▼
    [chat.js] pendingAction = params; afficherConfirmation()
        │
        ▼
    Interface : Bulle jaune "Confirmer : 325 kg pour TAG-001 ?"
               [✓ Confirmer]  [✗ Annuler]
        │
    ┌───┴────────────────────────┐
    ▼                            ▼
Annuler                      Confirmer
    │                            │
pendingAction = null         POST /api/chat
Message "Annulé"             { confirm_action: true, pending_action: {...} }
                                 │
                                 ▼
                         [app.py] call_procedure("sp_enregistrer_pesee", params)
                                 │
                                 ▼
                         [MySQL] sp_enregistrer_pesee exécutée
                         INSERT INTO pesees + UPDATE animaux.poids_actuel
                         + triggers éventuels
                                 │
                                 ▼
                         [app.py] retourne { type: "action_done", message: "Pesée enregistrée" }
                                 │
                                 ▼
                         [chat.js] Bulle verte "✓ Pesée enregistrée"
                         isBusy = false
```

---

## 9. Infrastructure de Production

### 9.1 Stack Technique Complète

| Couche | Technologie | Version | Rôle |
|--------|-------------|---------|------|
| Base de données | MySQL | 8.0 | Stockage, PL/SQL, Triggers, Events |
| Backend | Python / FastAPI | 3.11 / 0.110 | API REST, orchestration LLM |
| LLM | GPT-4o-mini (OpenAI) | — | Traduction NL → SQL/Action |
| Serveur web | Nginx | alpine | Reverse proxy, statiques |
| Containerisation | Docker + Compose | 24+ / v2 | Isolation, orchestration |
| Frontend | HTML5 / CSS3 / JS | Vanilla | Interface utilisateur |
| OS VPS | Ubuntu | 22.04 LTS | Hébergement production |

### 9.2 Variables d'Environnement Critiques

| Variable | Valeur locale | Valeur Docker |
|----------|--------------|---------------|
| `DB_HOST` | `localhost` | `db` (service Docker) |
| `DB_PORT` | `3306` | `3306` |
| `LLM_API_KEY` | `sk-...` | `sk-...` |
| `LLM_MODEL` | `gpt-4o-mini` | `gpt-4o-mini` |

### 9.3 Sécurité en Production

| Vecteur | Mesure |
|---------|--------|
| Prompt Injection | `sanitize_input()` avec blacklist regex |
| SQL Injection | Requêtes paramétrées exclusivement (`%s`) |
| XSS | `escapeHtml()` sur toutes les données API |
| Mutations directes | Interdiction `DROP/DELETE/UPDATE` dans le SYSTEM_PROMPT |
| Exposition BDD | MySQL non exposé publiquement (réseau Docker interne) |
| Double action | Verrou `isBusy` côté JS |
| Données sensibles | `.env` dans `.gitignore`, `.env.example` versionné |

---

## 10. Validation & Assurance Qualité

### 10.1 Tests Fonctionnels Frontend (Anna — Paquet C)

#### Pages — Tests de Chargement

| Page | Test | Résultat |
|------|------|---------|
| Dashboard | Chargement 6 KPI depuis `/api/dashboard` | ✅ PASS |
| Dashboard | Alertes colorées par niveau | ✅ PASS |
| Dashboard | Traitement alerte (disparition + MAJ compteur) | ✅ PASS |
| Dashboard | Gestations avec code couleur J-X | ✅ PASS |
| Dashboard | Rafraîchissement auto 60s | ✅ PASS |
| Chat | Envoi requête consultation (Text-to-SQL) | ✅ PASS |
| Chat | Affichage tableau résultats | ✅ PASS |
| Chat | Détection action + affichage confirmation | ✅ PASS |
| Chat | Confirmation pesée (`sp_enregistrer_pesee`) | ✅ PASS |
| Chat | Annulation action | ✅ PASS |
| Chat | Backend hors ligne → message d'erreur lisible | ✅ PASS |
| Troupeau | Chargement tableau depuis `/api/animaux` | ✅ PASS |
| Troupeau | Filtre sexe (sans rechargement API) | ✅ PASS |
| Troupeau | Filtre race (select dynamique) | ✅ PASS |
| Troupeau | Recherche texte TAG/nom | ✅ PASS |
| Troupeau | Modale : pesées + historique en parallèle | ✅ PASS |
| Troupeau | Redirection → chat avec URLSearchParams | ✅ PASS |
| Santé | Chargement actes depuis `/api/sante` | ✅ PASS |
| Santé | Filtrage par type acte | ✅ PASS |
| Santé | Alertes filtrées (vaccination/sante/poids) | ✅ PASS |
| Santé | Code couleur `prochain_rdv` | ✅ PASS |

### 10.2 Tests LLM — 5 Cas Cahier des Charges (Sall — Paquet A)

| # | Intention Métier | Type LLM | PL/SQL utilisé | Validation |
|---|-----------------|----------|---------------|------------|
| 01 | Consultation troupeau complet | `query` | `fn_age_en_mois`, `fn_gmq` | ✅ 100% précis |
| 02 | Analyse croissance (GMQ < seuil) | `query` | `fn_gmq` dans WHERE | ✅ 100% précis |
| 03 | Suivi gestations imminentes | `query` | Jointure `reproduction` + `DATEDIFF` | ✅ 100% précis |
| 04 | Action : enregistrement pesée | `action_pending` → `action_done` | `sp_enregistrer_pesee` | ✅ Confirmation exigée |
| 05 | Action : déclaration vente | `action_pending` → `action_done` | `sp_declarer_vente` | ✅ Paramètres validés |

### 10.3 Tests Triggers (Barro — Semaine 1)

| Trigger | Événement | Condition | Résultat |
|---------|-----------|-----------|---------|
| `trg_alerte_poids_faible` | AFTER INSERT pesees | poids < 60 ET âge < 6 mois | ✅ Alerte `critical` créée |
| `trg_alerte_vaccination` | AFTER INSERT sante | `prochain_rdv < CURDATE()` | ✅ Alerte `warning` créée |
| `trg_historique_statut` | BEFORE UPDATE animaux | changement `statut` | ✅ Log dans `historique_statut` |

### 10.4 Tests Responsive (Kane — Paquet B)

| Élément | 375px (Mobile) | Résultat |
|---------|---------------|---------|
| Sidebar | Masquée, hamburger visible | ✅ |
| Grille stats | 2 colonnes | ✅ |
| Tableaux | Scroll horizontal | ✅ |
| Zone chat | Utilisable | ✅ |
| Filtres troupeau | Colonne verticale | ✅ |

### 10.5 Tests Déploiement (Barro — Paquet D)

```bash
# Vérifications post-déploiement
curl http://[VPS_IP]/             # → 200 OK (Dashboard HTML)
curl http://[VPS_IP]/health       # → {"status":"ok"}
curl http://[VPS_IP]/api/animaux  # → JSON troupeau
curl http://[VPS_IP]/api/alertes  # → JSON alertes
```

---

## 11. Défis Techniques & Résolutions

### 11.1 Prompt Injection (Sall)

**Problème :** Un utilisateur malveillant pourrait demander au LLM d'afficher des configurations système, des clés API ou d'exécuter des requêtes destructives.

**Solution :** Implémentation de `sanitize_input()` avec liste noire de patterns regex. La fonction intercepte les tentatives avant qu'elles n'atteignent le LLM.

**Résultat :** Toute requête correspondant aux patterns lève une `HTTPException(400, "Requête suspecte détectée (Prompt Injection)")`.

---

### 11.2 Latence des Calculs Financiers (Sall)

**Problème :** Le calcul des coûts cumulés sur de grands jeux de données ralentissait les réponses API.

**Solution :** Les fonctions PL/SQL `fn_cout_total_elevage`, `fn_gmq`, `fn_rentabilite_estimee` sont déclarées avec `READS SQL DATA`, permettant au moteur MySQL d'utiliser son cache de requêtes.

**Résultat :** Réduction significative de la latence sur les endpoints `/api/animaux` et `/api/dashboard`.

---

### 11.3 IDs Grands-Parents NULL dans la Généalogie (Sall)

**Problème :** La requête `WHERE id IN (%s, %s, %s, %s)` avec des valeurs `None` Python causait une erreur MySQL → HTTP 500 → crash JavaScript `Cannot read properties of undefined (reading 'mere_id')`.

**Solution :**
```python
gp_ids = [x for x in [
    animal['grand_mere_mat_id'], animal['grand_pere_mat_id'],
    animal['grand_mere_pat_id'], animal['grand_pere_pat_id']
] if x is not None]

if gp_ids:
    placeholders = ','.join(['%s'] * len(gp_ids))
    grand_parents = execute_query(
        f"SELECT ... FROM animaux WHERE id IN ({placeholders})", gp_ids)
else:
    grand_parents = []
```

**Résultat :** Les animaux sans parents connus affichent une généalogie vide sans erreur.

---

### 11.4 URL Absolue `localhost` dans nav.js (Kane/Sall)

**Problème :** `const API = 'http://localhost:8002'` dans `nav.js` fonctionnait en développement local mais provoquait des `ERR_CONNECTION_REFUSED` après déploiement VPS.

**Solution :** `const API = ''` — URL relative. Le navigateur résout automatiquement vers l'origine courante (le VPS via Nginx).

**Résultat :** Le healthcheck `/health` fonctionne en local ET sur VPS sans modification de configuration.

---

### 11.5 Redirection `<` dans PowerShell (Barro)

**Problème :** L'opérateur `<` pour la redirection de fichier n'est pas supporté dans PowerShell : `mysql -u root -p bovibot < schema.sql` → erreur.

**Solution :** Exécution via Git Bash :
```bash
"/c/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" -u root -p bovibot < schema.sql
```

---

### 11.6 Doublons dans le Gold Dataset (Barro)

**Problème :** `ERROR 1062 (23000): Duplicate entry 'TAG-001'` lors de réinjections successives des données de test.

**Solution :** Remplacement de `INSERT` par `INSERT IGNORE` dans `data/seed_data.sql`. Les lignes existantes sont conservées, les nouvelles sont insérées.

---

### 11.7 Alignement Layout Header + Sidebar (Kane)

**Problème :** La combinaison header fixe (64px) + sidebar fixe (256px) + contenu principal nécessitait une gestion précise des marges pour éviter les chevauchements.

**Solution :** 
```css
.main-content {
  margin-left: var(--sidebar-width);  /* 256px */
  margin-top: var(--header-height);   /* 64px */
  min-height: calc(100vh - var(--header-height));
}
```

---

### 11.8 Timing Docker — Backend démarre avant MySQL (Barro)

**Problème :** Sans `depends_on: condition: service_healthy`, le backend FastAPI démarrait avant que MySQL soit prêt à accepter des connexions → crash au démarrage.

**Solution :** Ajout d'un `healthcheck` MySQL dans `docker-compose.yml` et `depends_on: condition: service_healthy` sur le backend. Le backend attend que `mysqladmin ping` réponde avec succès.

---

## 12. Récapitulatif Git & Livrables

### 12.1 Branches & Commits Semaine 2

#### Sall — `dev-sall-s2`

| Commit | Description |
|--------|-------------|
| `feat: LLM pipeline + few-shot prompting` | Système Text-to-SQL complet |
| `feat: PL/SQL fn_cout_total + sp_rapport_nutritionnel` | Extensions PL/SQL |
| `feat: trg_alerte_pesee_manquante + evt_alerte_cout_mensuel` | Trigger + Event |
| `feat: FastAPI routes + security` | Routes REST + Prompt Injection Guard |
| `feat: genealogie endpoint + simulateur croisement` | Page généalogie |

#### Kane — `dev-kane-s2`

| Commit | Description |
|--------|-------------|
| `feat: HTML structure + CSS design system` | 4 pages HTML + style.css |
| `feat: nav.js shared navigation` | Navigation partagée |
| `feat: responsive 768px breakpoint` | CSS mobile |

#### Anna — `dev-anna-s2`

| Commit | Description |
|--------|-------------|
| `feat: dashboard.js - KPI + alertes + gestations` | Dashboard JS |
| `feat: chat.js - LLM interface + confirmation flow` | Chat JS |
| `feat: troupeau.js - filters + modal + parallel load` | Troupeau JS |
| `feat: sante.js - veterinary acts + health alerts` | Santé JS |
| `test: integration tests all 5 CDC cases` | Tests intégration |

#### Barro — `dev-barro-s2`

| Commit | Description |
|--------|-------------|
| `feat: Dockerfile and docker-compose (MySQL + FastAPI + Nginx)` | Infrastructure Docker |
| `feat: nginx reverse proxy eliminating CORS issues` | Nginx config |
| `docs: complete README with Docker setup and usage` | README |
| `docs: VPS deployment guide` | Guide déploiement |
| `merge: Paquet D - Docker containerization and deployment docs` | PR vers develop |

### 12.2 Livrables Produits

| Fichier | Auteur | Description |
|---------|--------|-------------|
| `app.py` | Sall | Backend FastAPI + LLM + PL/SQL |
| `schema.sql` | Sall/Barro | Schéma BDD + PL/SQL + Triggers + Events |
| `frontend/html/*.html` | Kane | 5 pages HTML |
| `frontend/css/style.css` | Kane | Design System CSS |
| `frontend/js/nav.js` | Kane | Navigation partagée |
| `frontend/js/dashboard.js` | Anna | Logique Dashboard |
| `frontend/js/chat.js` | Anna | Interface Chat LLM |
| `frontend/js/troupeau.js` | Anna | Gestion Troupeau |
| `frontend/js/sante.js` | Anna | Suivi Sanitaire |
| `frontend/js/genealogie.js` | Sall | Généalogie + Simulation |
| `Dockerfile` | Barro | Image Docker backend |
| `docker-compose.yml` | Barro | Orchestration 3 services |
| `nginx.conf` | Barro | Reverse proxy |
| `.env.example` | Barro | Template configuration |
| `data/seed_data.sql` | Barro | 50 lignes Gold Dataset |
| `README.md` | Barro | Guide déploiement 4 commandes |
| `docs/guide_deploiement.md` | Barro | Guide VPS détaillé |
| `docs/prompt_engineering.md` | Sall | Documentation LLM |

---

## 13. Checklist Finale Consolidée

### Paquet A — Backend, IA & PL/SQL (Sall)

| Point de contrôle | Statut |
|-------------------|--------|
| Pipeline Text-to-SQL opérationnel (5 cas CDC validés) | ✅ |
| Few-Shot Prompting à 4 piliers implémenté | ✅ |
| Bloc résolution d'ambiguïté (mode `info`) fonctionnel | ✅ |
| Prompt Injection Guard actif | ✅ |
| `fn_cout_total_elevage` déployée et testée | ✅ |
| `sp_rapport_nutritionnel` déployée et testée | ✅ |
| `trg_alerte_pesee_manquante` déployé et testé | ✅ |
| `evt_alerte_cout_mensuel` déployé et testé | ✅ |
| 11+ routes FastAPI opérationnelles | ✅ |
| Endpoint `/api/animaux/{id}/genealogie` fonctionnel | ✅ |
| Gestion des grands-parents NULL sans erreur 500 | ✅ |

### Paquet B — Frontend Structure & CSS (Kane)

| Point de contrôle | Statut |
|-------------------|--------|
| 5 pages HTML structurées et fonctionnelles sans JS | ✅ |
| Design System CSS avec variables `:root` | ✅ |
| Responsive 768px (sidebar hamburger, grilles adaptatives) | ✅ |
| Responsive 375px (mobile) | ✅ |
| `nav.js` partagé sur toutes les pages | ✅ |
| URL relative `/health` (compatible VPS) | ✅ |
| Chemins relatifs CSS/JS corrects avec Nginx | ✅ |
| Indicateur statut API temps réel (30s) | ✅ |

### Paquet C — Frontend JS (Anna)

| Point de contrôle | Statut |
|-------------------|--------|
| Les 4 pages connectées au backend (données réelles) | ✅ |
| Chat : confirmation d'action (flux 2 étapes) | ✅ |
| Chat : affichage tableau résultats dynamique | ✅ |
| Troupeau : filtres triple sans rechargement API | ✅ |
| Troupeau → Chat : redirection URLSearchParams | ✅ |
| Modale : chargement parallèle `Promise.all` | ✅ |
| Rafraîchissement auto 60s (Dashboard + Santé) | ✅ |
| `escapeHtml()` systématique (protection XSS) | ✅ |
| Verrou `isBusy` anti-doublons | ✅ |
| Gestion backend hors ligne : message lisible, pas de crash | ✅ |
| 5 cas CDC validés sur l'application | ✅ |

### Paquet D — Docker & Déploiement VPS (Barro)

| Point de contrôle | Statut |
|-------------------|--------|
| `Dockerfile` — image `python:3.11-slim` fonctionnelle | ✅ |
| `docker-compose.yml` — 3 services orchestrés | ✅ |
| `depends_on: service_healthy` (timing MySQL/backend) | ✅ |
| Volume `mysql_data` persistant | ✅ |
| Nginx reverse proxy sans CORS | ✅ |
| MySQL non exposé publiquement | ✅ |
| Dashboard accessible sur `http://localhost:8080/` en local | ✅ |
| Application déployée et accessible sur VPS | ✅ |
| `README.md` — déploiement en 4 commandes | ✅ |
| `docs/guide_deploiement.md` — guide VPS complet | ✅ |
| `.env.example` avec `DB_HOST=db` (Docker) | ✅ |
| Gold Dataset 50 lignes — seed_data.sql | ✅ |

---

*Livrable Semaine 2 — BoviBot — ESP/UCAD DIC2 IABD-SSI-TR — Avril 2026*  
*Auteurs : Mouhamadou Madeniyou SALL · Abdoul Aziz KANE · Anna NDOYE · Fatoumata BARRO*
