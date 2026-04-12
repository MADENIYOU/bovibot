# BoviBot — Gestion d'Élevage Bovin avec IA et PL/SQL

---

## 1. Page de garde

| | |
|:---|:---|
| **Titre** | BoviBot — Gestion d'Élevage Bovin avec IA et PL/SQL |
| **Établissement** | École Supérieure Polytechnique (ESP / UCAD) — Dakar, Sénégal |
| **Filière** | Licence 3 DIC2 — Parcours IABD · SSI · TR |
| **Cours** | Intégration de l'IA et des Bases de Données Avancées |
| **Enseignant** | Pr. Ahmath Bamba MBACKE |
| **Année académique** | 2025 – 2026 |
| **Date de remise** | Dernière semaine du semestre — avril 2026 |

### Membres du groupe

| Nom complet | Rôle | Parcours |
|:---|:---|:---|
| Mouhamadou Madeniyou Sall | Chef de groupe | Intelligence Artificielle & Big Data |
| Anna Ndoye | Membre | Sécurité des Systèmes d'Information |
| Abdoul Aziz Kane | Membre | Télécommunications & Réseaux |
| Fatoumata Barro | Membre | Télécommunications & Réseaux |

---

## 2. Table des matières

1. [Page de garde](#1-page-de-garde)
2. [Table des matières](#2-table-des-matières)
3. [Introduction et contexte métier](#3-introduction-et-contexte-métier)
   - 3.1 Contexte général
   - 3.2 Présentation du projet BoviBot
   - 3.3 Problématique
   - 3.4 Objectifs du projet
4. [Modélisation de la base de données](#4-modélisation-de-la-base-de-données)
   - 4.1 Dictionnaire de données
   - 4.2 Modèle Conceptuel de Données (MCD)
   - 4.3 Modèle Logique de Données (MLD)
5. [Éléments PL/SQL — Description et justification métier](#5-éléments-plsql--description-et-justification-métier)
   - 5.1 Procédures stockées
   - 5.2 Fonctions
   - 5.3 Triggers
   - 5.4 Events MySQL Scheduler
6. [Architecture technique](#6-architecture-technique)
7. [Prompt Engineering et intégration LLM](#7-prompt-engineering-et-intégration-llm)
   - 7.1 Stratégie de prompting (Few-Shot à 4 piliers)
   - 7.2 SYSTEM_PROMPT final
   - 7.3 Exemples de dialogues LLM avec SQL/procédures générées
8. [Tests](#8-tests)
   - 8.1 Tests cas normaux (5 cas CDC)
   - 8.2 Tests cas limites (poids critique, vente animal non-actif, injection SQL…)
9. [Guide d'installation et de déploiement](#9-guide-dinstallation-et-de-déploiement)
10. [Conclusion et perspectives](#10-conclusion-et-perspectives)
- [Annexe A — Déclaration d'usage de l'IA](#annexe-a--déclaration-dusage-de-lia)

---

## 3. Introduction et contexte métier

<!-- À remplir en A-01 (introduction déjà rédigée dans livrables_S1/semaine1.md — à intégrer ici) -->

*[Section à intégrer depuis `livrables_S1/semaine1.md` — sections 1.1 à 1.4]*

---

## 4. Modélisation de la base de données

La base de données BoviBot est construite autour de **11 tables** couvrant l'intégralité des dimensions de la gestion d'un troupeau bovin : identité des animaux, suivi zootechnique (pesées, alimentation, reproduction), contrôle sanitaire, traçabilité des ventes, journalisation des événements et gestion des stocks. Elle respecte la troisième forme normale (3NF) pour garantir l'absence de redondance et la cohérence des données.

### 4.1 Dictionnaire de données

#### Conventions

| Symbole | Signification |
|---------|---------------|
| PK | Clé primaire (PRIMARY KEY) |
| FK | Clé étrangère (FOREIGN KEY) |
| NN | NOT NULL |
| UQ | UNIQUE |
| DEF | Valeur par défaut (DEFAULT) |

---

#### Table 1 — `races`

> **Rôle métier :** Référentiel des races bovines disponibles dans l'élevage. Permet de classer les animaux et d'anticiper leur comportement productif (lait, viande).

| # | Champ | Type SQL | Contraintes | Rôle métier |
|---|-------|----------|-------------|-------------|
| 1 | `id` | `INT AUTO_INCREMENT` | PK | Identifiant technique unique de la race |
| 2 | `nom` | `VARCHAR(100)` | NN | Nom vernaculaire de la race (ex : Zébu Gobra) |
| 3 | `origine` | `VARCHAR(100)` | — | Pays ou région d'origine géographique |
| 4 | `poids_adulte_moyen_kg` | `DECIMAL(6,2)` | — | Poids adulte moyen en kg, sert de référence pour évaluer la croissance |
| 5 | `production_lait_litre_jour` | `DECIMAL(6,2)` | DEF 0 | Production laitière moyenne journalière en litres (0 pour les races allaitantes) |

---

#### Table 2 — `animaux`

> **Rôle métier :** Table centrale du système. Chaque ligne représente un individu du troupeau. Elle porte l'identité complète, l'état courant (poids, statut) et la généalogie (mère, père).

| # | Champ | Type SQL | Contraintes | Rôle métier |
|---|-------|----------|-------------|-------------|
| 1 | `id` | `INT AUTO_INCREMENT` | PK | Identifiant interne unique |
| 2 | `numero_tag` | `VARCHAR(30)` | NN, UQ | Numéro de boucle auriculaire physique (ex : TAG-001). Identifiant terrain |
| 3 | `nom` | `VARCHAR(100)` | — | Nom usuel donné par l'éleveur |
| 4 | `race_id` | `INT` | FK → races(id) | Race de l'animal ; NULL possible si race inconnue |
| 5 | `sexe` | `ENUM('M','F')` | NN | Sexe biologique ; conditionne la gestion (gestation, saillie) |
| 6 | `date_naissance` | `DATE` | NN | Date de naissance ; base de calcul pour l'âge (`fn_age_en_mois`) |
| 7 | `poids_actuel` | `DECIMAL(6,2)` | — | Poids en kg mis à jour automatiquement par `sp_enregistrer_pesee` |
| 8 | `statut` | `ENUM('actif','vendu','mort','quarantaine')` | DEF 'actif' | État opérationnel de l'animal dans le troupeau |
| 9 | `mere_id` | `INT` | FK → animaux(id), NULL | Référence réflexive vers la mère (même table) |
| 10 | `pere_id` | `INT` | FK → animaux(id), NULL | Référence réflexive vers le père (même table) |
| 11 | `notes` | `TEXT` | — | Observations libres de l'éleveur |
| 12 | `created_at` | `TIMESTAMP` | DEF CURRENT_TIMESTAMP | Horodatage de l'enregistrement |

---

#### Table 3 — `pesees`

> **Rôle métier :** Historique chronologique des pesées. Chaque ligne capture une mesure de poids à une date donnée. La procédure `sp_enregistrer_pesee` y insère les données et déclenche le calcul du GMQ.

| # | Champ | Type SQL | Contraintes | Rôle métier |
|---|-------|----------|-------------|-------------|
| 1 | `id` | `INT AUTO_INCREMENT` | PK | Identifiant unique de la pesée |
| 2 | `animal_id` | `INT` | NN, FK → animaux(id) | Animal concerné |
| 3 | `poids_kg` | `DECIMAL(6,2)` | NN | Poids mesuré en kilogrammes |
| 4 | `date_pesee` | `DATE` | NN | Date de la mesure |
| 5 | `agent` | `VARCHAR(100)` | — | Nom de l'agent ayant effectué la pesée |
| 6 | `notes` | `TEXT` | — | Observations éventuelles (conditions, anomalies) |
| 7 | `created_at` | `TIMESTAMP` | DEF CURRENT_TIMESTAMP | Horodatage d'insertion |

---

#### Table 4 — `sante`

> **Rôle métier :** Journal des actes vétérinaires. Couvre vaccinations, traitements, examens et chirurgies. Le champ `prochain_rdv` déclenche des alertes automatiques via trigger.

| # | Champ | Type SQL | Contraintes | Rôle métier |
|---|-------|----------|-------------|-------------|
| 1 | `id` | `INT AUTO_INCREMENT` | PK | Identifiant unique de l'acte |
| 2 | `animal_id` | `INT` | NN, FK → animaux(id) | Animal traité |
| 3 | `type` | `ENUM('vaccination','traitement','examen','chirurgie')` | NN | Catégorie de l'acte médical |
| 4 | `description` | `TEXT` | NN | Description détaillée de l'acte réalisé |
| 5 | `date_acte` | `DATE` | NN | Date de réalisation |
| 6 | `veterinaire` | `VARCHAR(100)` | — | Nom du vétérinaire intervenant |
| 7 | `medicament` | `VARCHAR(200)` | — | Médicament(s) administré(s) |
| 8 | `cout` | `DECIMAL(10,2)` | DEF 0 | Coût de l'acte en FCFA |
| 9 | `prochain_rdv` | `DATE` | NULL | Date du prochain rendez-vous ; si dépassée → alerte critique via trigger |
| 10 | `created_at` | `TIMESTAMP` | DEF CURRENT_TIMESTAMP | Horodatage d'insertion |

---

#### Table 5 — `reproduction`

> **Rôle métier :** Suivi du cycle de reproduction. Chaque ligne représente une gestation en cours ou terminée. Lie une femelle à un mâle avec les dates clés du cycle.

| # | Champ | Type SQL | Contraintes | Rôle métier |
|---|-------|----------|-------------|-------------|
| 1 | `id` | `INT AUTO_INCREMENT` | PK | Identifiant de l'événement reproductif |
| 2 | `mere_id` | `INT` | NN, FK → animaux(id) | Femelle gestante (sexe F) |
| 3 | `pere_id` | `INT` | NN, FK → animaux(id) | Mâle saillisseur (sexe M) |
| 4 | `date_saillie` | `DATE` | NN | Date de la saillie naturelle ou insémination |
| 5 | `date_velage_prevue` | `DATE` | — | Date de vêlage calculée (saillie + ~280 jours) |
| 6 | `date_velage_reelle` | `DATE` | NULL | Date effective du vêlage ; NULL tant que non vêlé |
| 7 | `nb_veaux` | `INT` | DEF 0 | Nombre de veaux nés |
| 8 | `statut` | `ENUM('en_gestation','vele','avortement','echec')` | DEF 'en_gestation' | État actuel de la gestation |
| 9 | `notes` | `TEXT` | — | Observations vétérinaires sur la gestation |

---

#### Table 6 — `alimentation`

> **Rôle métier :** Enregistrement journalier des rations alimentaires distribuées à chaque animal. Permet le suivi des coûts d'alimentation et l'analyse des apports nutritionnels.

| # | Champ | Type SQL | Contraintes | Rôle métier |
|---|-------|----------|-------------|-------------|
| 1 | `id` | `INT AUTO_INCREMENT` | PK | Identifiant de la distribution |
| 2 | `animal_id` | `INT` | NN, FK → animaux(id) | Animal nourri |
| 3 | `type_aliment` | `VARCHAR(100)` | NN | Nature de l'aliment (foin, concentré, lait maternel, pâturage…) |
| 4 | `quantite_kg` | `DECIMAL(6,2)` | NN | Quantité distribuée en kilogrammes |
| 5 | `date_alimentation` | `DATE` | NN | Date de la distribution |
| 6 | `cout_unitaire_kg` | `DECIMAL(6,2)` | DEF 0 | Coût par kilogramme en FCFA (0 pour pâturage) |

---

#### Table 7 — `ventes`

> **Rôle métier :** Registre officiel des ventes d'animaux. Chaque vente est définitive et fait passer l'animal au statut `vendu` via la procédure `sp_declarer_vente`.

| # | Champ | Type SQL | Contraintes | Rôle métier |
|---|-------|----------|-------------|-------------|
| 1 | `id` | `INT AUTO_INCREMENT` | PK | Identifiant unique de la vente |
| 2 | `animal_id` | `INT` | NN, FK → animaux(id) | Animal vendu |
| 3 | `acheteur` | `VARCHAR(150)` | NN | Nom complet de l'acheteur |
| 4 | `telephone_acheteur` | `VARCHAR(20)` | — | Numéro de téléphone pour suivi |
| 5 | `date_vente` | `DATE` | NN | Date effective de la transaction |
| 6 | `poids_vente_kg` | `DECIMAL(6,2)` | — | Poids à la vente, base du prix au kilo vif |
| 7 | `prix_fcfa` | `DECIMAL(12,2)` | NN | Prix de cession en Francs CFA |
| 8 | `notes` | `TEXT` | — | Conditions particulières de la vente |
| 9 | `created_at` | `TIMESTAMP` | DEF CURRENT_TIMESTAMP | Horodatage d'enregistrement |

---

#### Table 8 — `alertes`

> **Rôle métier :** Centre de notification du système. Collecte les alertes générées automatiquement par les triggers et events MySQL, ainsi que les alertes manuelles.

| # | Champ | Type SQL | Contraintes | Rôle métier |
|---|-------|----------|-------------|-------------|
| 1 | `id` | `INT AUTO_INCREMENT` | PK | Identifiant unique de l'alerte |
| 2 | `animal_id` | `INT` | NULL, FK → animaux(id) | Animal concerné ; NULL pour les alertes globales (rapports, events hebdo) |
| 3 | `type` | `ENUM('poids','vaccination','velage','sante','alimentation','autre')` | NN | Catégorie fonctionnelle de l'alerte |
| 4 | `message` | `TEXT` | NN | Message descriptif en langage naturel |
| 5 | `niveau` | `ENUM('info','warning','critical')` | DEF 'warning' | Sévérité : INFO = informatif, WARNING = attention, CRITICAL = action urgente |
| 6 | `date_creation` | `TIMESTAMP` | DEF CURRENT_TIMESTAMP | Date et heure de déclenchement |
| 7 | `traitee` | `BOOLEAN` | DEF FALSE | TRUE quand l'éleveur a pris en charge l'alerte |

---

#### Table 9 — `historique_statut`

> **Rôle métier :** Journal d'audit des changements de statut des animaux. Alimentée exclusivement par le trigger `trg_historique_statut`. Permet la traçabilité réglementaire.

| # | Champ | Type SQL | Contraintes | Rôle métier |
|---|-------|----------|-------------|-------------|
| 1 | `id` | `INT AUTO_INCREMENT` | PK | Identifiant de l'entrée d'historique |
| 2 | `animal_id` | `INT` | NN, FK → animaux(id) | Animal dont le statut a changé |
| 3 | `ancien_statut` | `VARCHAR(20)` | — | Valeur du statut avant la modification |
| 4 | `nouveau_statut` | `VARCHAR(20)` | — | Valeur du statut après la modification |
| 5 | `date_changement` | `TIMESTAMP` | DEF CURRENT_TIMESTAMP | Horodatage automatique du changement |

---

#### Table 10 — `production_lait`

> **Rôle métier :** Enregistrement des traites journalières (matin et soir) pour les femelles laitières. Permet le suivi de la productivité laitière individuelle et du troupeau.

| # | Champ | Type SQL | Contraintes | Rôle métier |
|---|-------|----------|-------------|-------------|
| 1 | `id` | `INT AUTO_INCREMENT` | PK | Identifiant unique de la traite |
| 2 | `animal_id` | `INT` | NN, FK → animaux(id) | Femelle traite |
| 3 | `date_traite` | `DATE` | NN | Date de la traite |
| 4 | `quantite_litre` | `DECIMAL(6,2)` | NN | Volume de lait collecté en litres |
| 5 | `periode` | `ENUM('matin','soir')` | NN | Moment de la traite dans la journée |

---

#### Table 11 — `stocks`

> **Rôle métier :** Gestion des stocks d'intrants (aliments, soins). Le trigger `trg_alerte_stock_bas` génère une alerte critique dès que le stock descend sous le seuil d'alerte.

| # | Champ | Type SQL | Contraintes | Rôle métier |
|---|-------|----------|-------------|-------------|
| 1 | `id` | `INT AUTO_INCREMENT` | PK | Identifiant unique du stock |
| 2 | `nom` | `VARCHAR(100)` | NN | Désignation de l'intrant (ex : Foin de luzerne) |
| 3 | `categorie` | `ENUM('aliment','soin','autre')` | NN | Catégorie fonctionnelle |
| 4 | `quantite_disponible` | `DECIMAL(10,2)` | NN | Quantité actuellement en stock |
| 5 | `unite` | `VARCHAR(20)` | NN | Unité de mesure (kg, doses, litres…) |
| 6 | `seuil_alerte` | `DECIMAL(10,2)` | NN | Seuil en dessous duquel une alerte critique est déclenchée |
| 7 | `date_maj` | `TIMESTAMP` | DEF CURRENT_TIMESTAMP ON UPDATE | Horodatage de la dernière mise à jour |

---

#### Récapitulatif des relations inter-tables

| Table source | Champ FK | Table cible | Cardinalité | Nature |
|---|---|---|---|---|
| animaux | race_id | races | N,1 | Optionnelle (NULL si race inconnue) |
| animaux | mere_id | animaux | N,1 | Réflexive, optionnelle |
| animaux | pere_id | animaux | N,1 | Réflexive, optionnelle |
| pesees | animal_id | animaux | N,1 | Obligatoire |
| sante | animal_id | animaux | N,1 | Obligatoire |
| reproduction | mere_id | animaux | N,1 | Obligatoire |
| reproduction | pere_id | animaux | N,1 | Obligatoire |
| alimentation | animal_id | animaux | N,1 | Obligatoire |
| ventes | animal_id | animaux | N,1 | Obligatoire |
| alertes | animal_id | animaux | N,1 | Optionnelle (NULL autorisé pour alertes globales) |
| historique_statut | animal_id | animaux | N,1 | Obligatoire |
| production_lait | animal_id | animaux | N,1 | Obligatoire |

---

### 4.2 Modèle Conceptuel de Données (MCD)

Le MCD ci-dessous représente les entités métier et leurs associations avant toute traduction en tables relationnelles. Il met en évidence les cardinalités et la relation réflexive de généalogie sur l'entité **ANIMAL**.

![MCD BoviBot](../docs/MCD_BoviBot.png)

**Entités principales :**
- **RACE** — référentiel stable des races bovines.
- **ANIMAL** — entité centrale portant l'identité et l'état courant de chaque individu.
- **PESEE**, **SANTE**, **ALIMENTATION**, **PRODUCTION_LAIT** — entités d'événements liées à un animal (association 1,N depuis ANIMAL).
- **REPRODUCTION** — association ternaire entre deux ANIMAUx (mère et père) avec attributs propres (dates, statut).
- **VENTE** — enregistrement transactionnel définitif d'une cession d'animal.
- **ALERTE**, **HISTORIQUE_STATUT** — entités de journalisation générées automatiquement par le moteur PL/SQL.
- **STOCK** — entité indépendante gérant les intrants de l'élevage.

**Choix notables :**
- La relation **ANIMAL → ANIMAL** (généalogie) est une association réflexive avec deux rôles distincts : `est_mere_de` et `est_pere_de`. Ce choix permet de naviguer l'arbre généalogique sans table intermédiaire.
- **ALERTE** est liée à ANIMAL par une association optionnelle (0,N) pour accueillir les alertes globales (rapports hebdomadaires) sans animal associé.

---

### 4.3 Modèle Logique de Données (MLD)

Le MLD traduit le MCD en schéma relationnel. Les clés étrangères matérialisent les associations, et les contraintes d'intégrité référentielle sont définies explicitement.

![MLD BoviBot](../docs/MLD_BoviBot.png)

**Justifications des choix de modélisation non-triviaux :**

**1. Clés étrangères auto-référencées (`mere_id`, `pere_id`) dans `animaux`**

La table `animaux` contient deux clés étrangères pointant vers elle-même (`mere_id` et `pere_id`). Ce choix évite de créer une table de généalogie séparée et permet d'interroger la parenté directement via des jointures réflexives :

```sql
SELECT a.numero_tag, m.numero_tag AS mere, p.numero_tag AS pere
FROM animaux a
LEFT JOIN animaux m ON a.mere_id = m.id
LEFT JOIN animaux p ON a.pere_id = p.id;
```

Les deux champs sont nullable (NULL si parenté inconnue), ce qui reflète la réalité terrain où l'origine d'un animal peut être incertaine.

**2. Table `historique_statut` pour la traçabilité ACID**

Plutôt que de simplement écraser le champ `statut` dans `animaux`, une table dédiée `historique_statut` archive chaque transition (ancien → nouveau statut avec horodatage). Cette table est alimentée exclusivement par le trigger `trg_historique_statut` (BEFORE UPDATE), ce qui garantit qu'aucun changement de statut ne peut échapper à l'audit. Elle est en lecture seule pour l'application et pour le LLM.

Ce choix répond à une exigence de traçabilité réglementaire : en cas de litige commercial (vente contestée, décès non déclaré), l'éleveur peut reconstituer l'historique complet de chaque animal.

**3. Table `alertes` polyvalente (automatique + manuelle)**

La table `alertes` centralise deux types d'événements hétérogènes :
- Alertes **automatiques** générées par les triggers (`trg_alerte_vaccination`, `trg_alerte_poids_faible`) et les events (`evt_alerte_velages`, `evt_rapport_croissance`).
- Alertes **manuelles** potentiellement créées par l'éleveur ou le LLM.

Le champ `animal_id` est nullable pour permettre les alertes globales (ex : rapport hebdomadaire du troupeau) qui ne sont pas liées à un animal spécifique. Le champ `traitee` (BOOLEAN) permet à l'interface de distinguer les alertes actives des alertes prises en charge, sans jamais supprimer l'historique.

---

## 5. Éléments PL/SQL — Description et justification métier

### 5.1 Procédures stockées

<!-- À rédiger en A-03 -->

*[À compléter en étape A-03]*

### 5.2 Fonctions

*[À compléter en étape A-03]*

### 5.3 Triggers

*[À compléter en étape A-03]*

### 5.4 Events MySQL Scheduler

*[À compléter en étape A-03]*

---

## 6. Architecture technique

<!-- À rédiger en A-04 -->

*[À compléter en étape A-04]*

---

## 7. Prompt Engineering et intégration LLM

### 7.1 Stratégie de prompting (Few-Shot à 4 piliers)

*[À compléter en étape A-05]*

### 7.2 SYSTEM_PROMPT final

*[À compléter en étape A-05]*

### 7.3 Exemples de dialogues LLM avec SQL/procédures générées

*[À compléter en étape A-05]*

---

## 8. Tests

### 8.1 Tests cas normaux (5 cas CDC)

*[À compléter en étape A-06]*

### 8.2 Tests cas limites (poids critique, vente animal non-actif, injection SQL…)

*[À compléter en étape A-06]*

---

## 9. Guide d'installation et de déploiement

<!-- À intégrer depuis docs/guide_deploiement.md -->

*[À compléter en étape A-04 — voir `docs/guide_deploiement.md`]*

---

## 10. Conclusion et perspectives

*[À compléter en étape A-07]*

---

## Annexe A — Déclaration d'usage de l'IA

*[À compléter en étape A-07]*
