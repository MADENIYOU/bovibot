---
project: BoviBot
week: 2
author: Mouhamadou Madeniyou Sall
role: Tech Lead / Backend & AI Engineer
deliverable: D-E01
milestone: M2 - Integration & Deployment
status: 🟢 Finalized
date: 2026-04-05
---


  

## 📋 Résumé Exécutif

> [!abstract] Objectifs et Vision

> Au cours de cette deuxième semaine, mon intervention s'est concentrée sur la **solidification de l'intelligence métier** et l'**orchestration de l'infrastructure**. L'enjeu était de transformer une base de données relationnelle classique en un système d'aide à la décision proactif, capable de comprendre des requêtes naturelles complexes tout en garantissant une intégrité transactionnelle absolue sur VPS.

  

  

## 1. 🏗️ Architecture & Réalisations Techniques

### 1.1 🤖 Paquet A : Intelligence Artificielle & Prompt Engineering

L'objectif était de concevoir un **compilateur de langage naturel vers SQL** robuste. J'ai implémenté une stratégie de "Few-Shot Prompting" structurée en 4 piliers au sein de [[app.py]] :

*   **Ingestion du Schéma (`DB_SCHEMA`) :** Contrairement à un simple dump DDL, j'ai enrichi le schéma avec des annotations sémantiques. Le LLM comprend désormais la relation entre le `numero_tag` (visible) et l' `animal_id` (technique).

*   **Contrôle de Flux (`SYSTEM_PROMPT`) :**

    *   **Sécurité Negative :** Interdiction stricte des opérations de mutation destructives (`DROP`, `DELETE`).

    *   **Priorisation PL/SQL :** Injection de règles forçant l'utilisation des fonctions [[schema.sql|PL/SQL]] (`fn_gmq`, `fn_age`) pour garantir que les calculs restent côté serveur de données.

    *   **Gestion du Format :** Standardisation de la sortie en **JSON pur**, éliminant les erreurs de parsing en sortie de LLM.

> [!tip] Innovation Technique

> J'ai intégré un **Bloc de Résolution d'Ambiguïté** (Bloc 4) qui bascule l'IA en mode "Investigation" (`type: info`) lorsqu'une donnée est manquante, évitant ainsi les "hallucinations" d'identifiants.

### 1.2 ⚡ Paquet A : Extensions PL/SQL Avancées

Pour décharger le backend Python, j'ai déporté l'intelligence métier dans le moteur MySQL :

1.  **`fn_cout_total_elevage`** : Un agrégateur de coûts multidimensionnel (Santé + Nutrition).

2.  **`sp_rapport_nutritionnel`** : Une procédure d'analyse temporelle (30j) qui génère des statistiques de performance et alimente dynamiquement le système d'alertes.

3.  **`trg_alerte_pesee_manquante`** : Un mécanisme de vigilance passive assurant qu'aucun animal n'échappe au suivi de croissance.

4.  **`evt_alerte_cout_mensuel`** : Un agent de surveillance financière automatisé via le `event_scheduler`.
### 1.3 🌐 Backend & Orchestration API

J'ai conçu une interface RESTful avec **FastAPI** pour exposer ces services au frontend d'Anna :

- **Routage Dynamique :** Implémentation de routes avec validation de types via Pydantic.

- **Gestion Transactionnelle :** Utilisation de `call_procedure` pour encapsuler les appels PL/SQL complexes dans des blocs `try/except` robustes.

### 1.4 🐳 Paquet D-04 : Stratégie de Déploiement & DevOps

Le déploiement sur VPS repose sur une architecture conteneurisée :

- **Reverse Proxy Strategy :** Configuration d'[[nginx.conf]] comme passerelle unique. Cela permet de résoudre les problématiques de **CORS** et de sécuriser l'accès aux fichiers statiques du frontend.

- **Docker Orchestration :** Liaison de trois services (DB, Backend, Nginx) via un réseau interne isolé, garantissant que la base de données n'est pas exposée directement sur le port public.

## 2. 🧪 Validation & Assurance Qualité (CDC)

> [!check] Conformité au Cahier des Charges

| Cas | Intention métier | Comportement LLM | Validation SQL / Backend |
| :-- | :--- | :--- | :--- |
| 01 | Consultation Troupeau | Identification `fn_age_en_mois` | ✅ 100% Précis |
| 02 | Analyse Croissance | Utilisation `fn_gmq` dans le WHERE | ✅ 100% Précis |
| 03 | Suivi Repro | Jointure `reproduction` + `DATEDIFF` | ✅ 100% Précis |
| 04 | Action Pesée | Détection `sp_enregistrer_pesee` | ✅ Confirmation exigée |
| 05 | Action Vente | Détection `sp_declarer_vente` | ✅ Paramètres validés |

## 3. 🛡️ Défis Techniques & Résolutions

> [!failure] Problème : Exfiltration de Données via Prompt Injection

> J'ai identifié un risque où l'utilisateur pourrait demander au LLM d'afficher des configurations système.

> **Solution :** Implémentation d'une fonction `sanitize_input` dans [[app.py]] avec une liste noire de patterns suspects (Prompt Injection Guard).  

> [!failure] Problème : Latence des calculs financiers

> Le calcul des coûts sur de grands jeux de données ralentissait l'API.

> **Solution :** Optimisation des requêtes via des fonctions PL/SQL avec le mot-clé `READS SQL DATA` pour permettre au moteur MySQL d'optimiser le cache.
## 4. 🎯 Conclusion & Perspectives

La semaine 2 se termine avec une infrastructure **Production-Ready**. Le cœur de l'intelligence (IA + PL/SQL) est parfaitement synchronisé. Mon focus pour la phase finale sera la consolidation des rapports de l'équipe et la fusion vers la branche `main` pour la livraison v1.0.

**Tags :** #BoviBot #TechnicalReport #FinTech #AgriTech #LLM #MySQL #Docker #FastAPI