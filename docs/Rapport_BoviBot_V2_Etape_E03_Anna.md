# Rapport individuel S2 — Paquet C : Frontend JS & Connexion Backend


## 1. Contexte et responsabilités

Mon rôle était de **connecter les 4 pages de l'interface aux routes de l'API REST**, en implémentant toute la logique JavaScript côté client.
Le Paquet C démarre uniquement après la fusion des Paquets A et B sur `develop`, ce qui garantit que le backend est fonctionnel et que la structure HTML est finalisée avant que je commence l'intégration.

**Étapes réalisées :**

| Étape | Fichier livré | Statut |
|-------|--------------|--------|
| C-01 | `frontend/js/dashboard.js` | ✅ Terminé |
| C-02 | `frontend/js/chat.js` | ✅ Terminé |
| C-03 | `frontend/js/troupeau.js` | ✅ Terminé |
| C-04 | `frontend/js/sante.js` | ✅ Terminé |
| C-05 | Tests d'intégration frontend | ✅ Terminé |
| C-06 | Pull Request `dev-anna-s2` → `develop` | ✅ Terminé |

---

## 2. Description de chaque fichier JS et sa logique

### 2.1 `dashboard.js` — Tableau de bord (C-01)

**Rôle :** Charger et afficher en temps réel les indicateurs clés du troupeau sur la page `index.html`.

**Fonctions implémentées :**

**`chargerStats()`**  
Appelle `GET /api/dashboard` et met à jour les 6 cartes KPI : animaux actifs, femelles en gestation, alertes actives, alertes critiques, ventes du mois et chiffre d'affaires mensuel en FCFA. Les valeurs numériques sont formatées (séparateur de milliers pour les montants FCFA).

**`chargerAlertes()`**  
Appelle `GET /api/alertes` et affiche les 8 alertes les plus récentes non traitées. Chaque alerte est rendue avec une couleur différente selon son niveau : rouge pour `critical`, orange pour `warning`, bleu pour `info`. Le tag de l'animal concerné est affiché en préfixe, ou une icône globale `🌐` pour les alertes sans animal cible (rapports hebdomadaires de l'event `evt_rapport_croissance`).

**`traiterAlerte(alertId)`**  
Appelle `POST /api/alertes/{id}/traiter`. En cas de succès, l'alerte disparaît visuellement avec une animation de fondu, et les compteurs du dashboard sont recalculés via un nouvel appel à `chargerStats()`.

**`chargerGestations()`**  
Appelle `GET /api/reproduction/en-cours` et affiche chaque gestation avec son nombre de jours restants avant vêlage, codé couleur : rouge si inférieur à 14 jours, orange si inférieur à 30 jours, vert sinon.

**Rafraîchissement automatique :** Les trois fonctions sont rappelées toutes les 60 secondes via `setInterval`, ce qui maintient le tableau de bord à jour sans rechargement de page.

**Sécurité :** La fonction `escapeHtml()` est appliquée à toutes les données provenant de l'API avant injection dans le DOM, afin de prévenir les attaques XSS.

---

### 2.2 `chat.js` — Interface Chat LLM (C-02)

**Rôle :** Gérer l'interface conversationnelle entre l'éleveur et l'assistant BoviBot, en orchestrant les appels à `POST /api/chat` et en traitant les trois types de réponses possibles.

**État interne :**
```javascript
let chatHistory   = [];   // Historique des 6 derniers échanges
let pendingAction = null; // Action en attente de confirmation
let isBusy        = false; // Verrou anti double-envoi
```

**Fonctions implémentées :**

**`sendMessage()`**  
Point d'entrée principal. Récupère le texte saisi, l'ajoute à l'historique, affiche la bulle utilisateur et envoie la requête à `POST /api/chat` avec la question et les 6 derniers tours de conversation. Selon le type de réponse reçu :
- `query` → appelle `afficherTableau()` avec les données SQL retournées
- `action_pending` → appelle `afficherConfirmation()` avec les paramètres de la procédure
- `info` → affiche simplement la réponse textuelle du LLM

**`afficherConfirmation(msgBot)`**  
Affiche une bulle de confirmation jaune avec le résumé des paramètres de l'action (nom de la procédure, valeurs) et deux boutons : **Confirmer** et **Annuler**. L'action est bloquée tant que l'éleveur n'a pas explicitement choisi.

**`confirmerAction()`**  
Envoie la requête de confirmation à `POST /api/chat` avec `confirm_action: true` et le `pending_action` stocké. Le backend appelle alors la procédure stockée correspondante (`sp_enregistrer_pesee` ou `sp_declarer_vente`). En cas de succès, un message vert de confirmation est affiché.

**`annulerAction()`**  
Réinitialise `pendingAction` à `null` et affiche un message d'annulation. Les boutons de confirmation sont désactivés.

**`afficherTableau(data)`**  
Génère dynamiquement un tableau HTML à partir des données retournées par l'API. Les colonnes sont détectées automatiquement depuis les clés du premier objet. Les dates sont formatées en français, les valeurs GMQ affichées avec 3 décimales, et les montants en FCFA avec séparateur de milliers.

**`addMessage(role, html, extraClass)`**  
Ajoute une bulle dans la zone de chat avec l'avatar correspondant (robot pour le bot, personne pour l'utilisateur). Le contenu HTML est rendu directement dans la bulle.

**`ask(question)`**  
Fonction appelée par les boutons de suggestions rapides dans `chat.html`. Pré-remplit l'input et déclenche `sendMessage()`.

**Lecture des URLSearchParams :**  
Au chargement de la page, le paramètre `?q=` est lu depuis l'URL. Si présent (redirection depuis `troupeau.html`), la question est automatiquement envoyée au LLM. Cela permet la redirection directe depuis le bouton "Rapport nutritionnel" de la page Troupeau.

---

### 2.3 `troupeau.js` — Gestion du Troupeau (C-03)

**Rôle :** Afficher la liste complète des animaux actifs avec filtres, et permettre la consultation des détails via une modale.

**Données en mémoire :**
```javascript
let tousAnimaux = []; // Cache des animaux chargés depuis l'API
```

**Fonctions implémentées :**

**`chargerTroupeau()`**  
Appelle `GET /api/animaux` qui retourne tous les animaux actifs avec leur âge calculé par `fn_age_en_mois()` et leur GMQ calculé par `fn_gmq()`. La liste des races distinctes est extraite dynamiquement pour peupler le `<select>` de filtrage, sans appel API supplémentaire.

**`afficherTroupeau(animaux)`**  
Génère le tableau HTML des animaux. Pour chaque ligne :
- Le GMQ est affiché avec un badge coloré : rouge si < 0.3 kg/j (alerte), orange si < 0.5 kg/j, vert sinon
- Le sexe est affiché avec une icône ♂/♀
- Trois boutons d'action : **Détail** (modale pesées), **Coût total**, **Rapport nutritionnel**

**`filtrerTroupeau()`**  
Filtre la liste en mémoire (sans appel API) sur trois critères simultanés : sexe (M/F/tous), race, et texte libre sur le tag ou le nom. La fonction est appelée à chaque modification des filtres via les événements `onchange` et `oninput`.

**`ouvrirModal(animalId, tag, nom)`**  
Ouvre la modale de détail et charge en parallèle (via `Promise.all`) les pesées depuis `GET /api/animaux/{id}/pesees` et l'historique des statuts depuis `GET /api/animaux/{id}/historique-statut`. Les deux tableaux sont affichés dans la modale une fois les deux requêtes terminées.

**`afficherCout(id)`**  
Appelle `GET /api/animaux/{id}/cout-total` et affiche le résultat dans la modale. Ce coût est calculé par la fonction SQL `fn_cout_total_elevage()` qui cumule les coûts d'alimentation et de santé.

**`demanderRapport(id, tag)`**  
Redirige vers `chat.html?q=Génère+le+rapport+nutritionnel+de+[tag]`. Le paramètre `q` est lu au chargement par `chat.js` qui l'envoie automatiquement au LLM.

**`fermerModal()`**  
Ferme la modale au clic sur le bouton de fermeture, au clic sur l'overlay, ou à l'appui sur la touche `Escape`.

---

### 2.4 `sante.js` — Suivi Sanitaire (C-04)

**Rôle :** Afficher les actes vétérinaires et les alertes de santé, avec filtrage par type d'acte.

**Données en mémoire :**
```javascript
let tousActes = []; // Cache des actes chargés depuis l'API
```

**Fonctions implémentées :**

**`chargerActes()`**  
Appelle `GET /api/sante` qui retourne les 50 derniers actes vétérinaires avec les informations de l'animal (tag, nom). Les données sont stockées en cache dans `tousActes` pour le filtrage côté client.

**`afficherActes(actes)`**  
Génère le tableau HTML des actes. Chaque type d'acte est affiché avec un badge coloré et une icône : 💉 Vaccination (vert), Traitement (orange), Examen (bleu), Chirurgie (rouge). La colonne `prochain_rdv` est colorée selon l'urgence : rouge si dépassé, orange si dans les 7 jours, vert sinon. Les médicaments sont affichés dans une pastille verte pour une lecture rapide.

**`filtrerActes()`**  
Filtre la liste en mémoire selon le type d'acte sélectionné dans le `<select>`. Sans appel API supplémentaire.

**`chargerAlertesSante()`**  
Appelle `GET /api/alertes` et filtre côté client les alertes de types `vaccination`, `sante` et `poids` uniquement, qui sont les alertes pertinentes pour la page Santé. Les alertes globales (type `autre`) sont exclues.

**`traiterAlerteSante(alertId)`**  
Identique à `traiterAlerte` dans `dashboard.js` : appelle `POST /api/alertes/{id}/traiter` et retire l'élément du DOM avec une animation de fondu.

**Rafraîchissement automatique :** Les alertes et les actes sont rechargés toutes les 60 secondes.

---

## 3. Résultats des tests d'intégration (C-05)

Les tests ont été effectués avec le backend FastAPI démarré localement (`py app.py` sur le port 8002) et MySQL avec les données de la Semaine 1 (`schema.sql` + `data/seed_data.sql`).

### 3.1 Tests fonctionnels des 4 pages

| Page | Test effectué | Résultat |
|------|--------------|----------|
| Dashboard | Chargement des 6 KPI depuis `/api/dashboard` | ✅ PASS |
| Dashboard | Affichage des alertes colorées par niveau | ✅ PASS |
| Dashboard | Traitement d'une alerte (disparition + mise à jour compteur) | ✅ PASS |
| Dashboard | Affichage des gestations avec code couleur J-X | ✅ PASS |
| Dashboard | Rafraîchissement automatique toutes les 60s | ✅ PASS |
| Chat | Envoi d'une question de consultation (Text-to-SQL) | ✅ PASS |
| Chat | Affichage du tableau de résultats SQL | ✅ PASS |
| Chat | Détection d'une action et affichage de la confirmation | ✅ PASS |
| Chat | Confirmation d'une pesée (appel `sp_enregistrer_pesee`) | ✅ PASS |
| Chat | Annulation d'une action | ✅ PASS |
| Chat | Gestion backend hors ligne (message d'erreur lisible) | ✅ PASS |
| Troupeau | Chargement du tableau depuis `/api/animaux` | ✅ PASS |
| Troupeau | Filtre par sexe (sans rechargement API) | ✅ PASS |
| Troupeau | Filtre par race (peuplement dynamique du select) | ✅ PASS |
| Troupeau | Recherche texte sur TAG et nom | ✅ PASS |
| Troupeau | Modale détail : pesées + historique statut en parallèle | ✅ PASS |
| Troupeau | Redirection vers chat avec URLSearchParams | ✅ PASS |
| Santé | Chargement des actes depuis `/api/sante` | ✅ PASS |
| Santé | Filtrage par type d'acte | ✅ PASS |
| Santé | Alertes santé filtrées (vaccination/sante/poids uniquement) | ✅ PASS |
| Santé | Code couleur `prochain_rdv` (dépassé/urgent/ok) | ✅ PASS |

### 3.2 Tests des 5 cas obligatoires du cahier des charges

Ces tests ont été effectués directement depuis l'interface Chat LLM :

| # | Requête en langage naturel | Type LLM | Résultat |
|---|--------------------------|----------|----------|
| 1 | "Liste tous les animaux actifs avec leur âge et GMQ" | `query` | ✅ Tableau affiché avec fn_age_en_mois et fn_gmq |
| 2 | "Quels animaux ont un GMQ inférieur à 0.3 kg/jour ?" | `query` | ✅ Résultats filtrés correctement |
| 3 | "Quelles femelles vêlent dans les 30 prochains jours ?" | `query` | ✅ Gestations avec dates affichées |
| 4 | "Enregistre une pesée de 325 kg pour TAG-001 aujourd'hui" | `action_pending` → confirmation → `action_done` | ✅ Procédure exécutée après confirmation |
| 5 | "Déclare la vente de TAG-003 à Oumar Ba pour 280 000 FCFA" | `action_pending` → confirmation → `action_done` | ✅ Vente enregistrée, statut mis à jour |

### 3.3 Test responsive (375px)

La page a été testée à 375px de largeur  :
- La sidebar se masque correctement (`display: none` sur mobile)
- La grille stats passe en 2 colonnes
- Les tableaux scrollent horizontalement
- La zone de chat reste utilisable


## 6. Checklist des points de validation (Paquet C)

Conformément à la checklist de fin de Semaine 2 de la Roadmap S2 :

| Point de contrôle | Statut |
|-------------------|--------|
| Les 4 pages sont connectées au backend (données réelles) | ✅ Validé |
| La page chat gère confirmation d'action et affiche les résultats | ✅ Validé |
| La page troupeau filtre par sexe et race sans rechargement | ✅ Validé |
| Redirection troupeau → chat avec URLSearchParams fonctionne | ✅ Validé |
| Les 5 cas CDC validés sur l'application locale | ✅ Validé |
| Les 2 cas d'action avec confirmation validés | ✅ Validé |
| Gestion du backend hors ligne : message lisible, pas de crash | ✅ Validé |
| Test responsive 375px | ✅ Validé |

---

## 7. Bilan et difficultés

### Ce qui a bien fonctionné
La séparation claire entre les paquets A, B et C a facilité mon travail : j'ai pu me concentrer exclusivement sur la logique JavaScript sans avoir à me préoccuper du CSS ou des routes backend. Le schéma de réponse JSON du LLM (`type: query/action_pending/info`) est cohérent et facile à traiter côté frontend.


### Décisions techniques prises
- **Filtrage côté client** pour les filtres Race, Sexe et Type d'acte : évite des appels API répétés et rend l'interface plus réactive.
- **Chargement parallèle** (`Promise.all`) dans la modale Troupeau : réduit de moitié le temps de chargement des détails d'un animal.
- **Verrou `isBusy`** dans le chat : prévient les doubles-envois qui pourraient créer des actions dupliquées en base de données.
- **`escapeHtml()` systématique** sur toutes les données API : protection XSS même si les données proviennent d'une API contrôlée.
