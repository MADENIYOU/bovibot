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

Le moteur PL/SQL de BoviBot repose sur **3 procédures stockées**, **4 fonctions**, **4 triggers** et **3 events MySQL Scheduler**. Ces éléments constituent la couche logique métier de la base de données : ils garantissent l'intégrité des données, automatisent les calculs et génèrent les alertes sans intervention humaine.

---

### 5.1 Procédures stockées

Les procédures stockées encapsulent les opérations d'écriture critiques. Contrairement à un INSERT direct depuis l'application, elles garantissent l'atomicité (START TRANSACTION / COMMIT / ROLLBACK), centralisent les règles métier dans la base et sont les seuls points d'entrée que le LLM peut appeler pour modifier les données.

---

#### 5.1.1 `sp_enregistrer_pesee`

**Rôle :** Enregistre une pesée, met à jour le poids courant de l'animal, calcule le Gain Moyen Quotidien (GMQ) par rapport à la pesée précédente et insère une alerte si le GMQ est inférieur à 300 g/jour.

**Paramètres :**

| Paramètre | Type | Description |
|---|---|---|
| `p_animal_id` | `INT` | Identifiant de l'animal |
| `p_poids_kg` | `DECIMAL(6,2)` | Poids mesuré en kg |
| `p_date` | `DATE` | Date de la pesée |
| `p_agent` | `VARCHAR(100)` | Nom de l'agent ayant effectué la pesée |

**Justification métier :** L'éleveur ne doit pas gérer manuellement la mise à jour du poids courant ni calculer le GMQ. Cette procédure garantit la cohérence des données (`poids_actuel` toujours synchronisé avec la dernière pesée) et automatise la détection des retards de croissance.

**Comportement ACID :**
- `START TRANSACTION` — tout est annulé si une erreur survient (EXIT HANDLER → ROLLBACK + RESIGNAL).
- L'INSERT dans `pesees` et l'UPDATE de `poids_actuel` dans `animaux` sont atomiques : ils réussissent ensemble ou échouent ensemble.

**Code commenté :**

```sql
CREATE PROCEDURE sp_enregistrer_pesee(
    IN p_animal_id INT,
    IN p_poids_kg  DECIMAL(6,2),
    IN p_date      DATE,
    IN p_agent     VARCHAR(100)
)
BEGIN
    DECLARE v_derniere_pesee DECIMAL(6,2);
    DECLARE v_jours INT;
    DECLARE v_gmq   DECIMAL(6,2);

    -- Annule tout si erreur SQL (intégrité référentielle, etc.)
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

        -- 1. Insérer la pesée dans l'historique
        INSERT INTO pesees (animal_id, poids_kg, date_pesee, agent)
        VALUES (p_animal_id, p_poids_kg, p_date, p_agent);

        -- 2. Mettre à jour le poids courant de l'animal
        UPDATE animaux SET poids_actuel = p_poids_kg WHERE id = p_animal_id;

        -- 3. Récupérer la pesée précédente pour calculer le GMQ
        SELECT poids_kg, DATEDIFF(p_date, date_pesee)
        INTO v_derniere_pesee, v_jours
        FROM pesees
        WHERE animal_id = p_animal_id
          AND date_pesee < p_date
        ORDER BY date_pesee DESC
        LIMIT 1;

        -- 4. Insérer une alerte si GMQ < 300 g/jour
        IF v_derniere_pesee IS NOT NULL AND v_jours > 0 THEN
            SET v_gmq = (p_poids_kg - v_derniere_pesee) / v_jours;
            IF v_gmq < 0.3 THEN
                INSERT INTO alertes (animal_id, type, message, niveau)
                VALUES (p_animal_id, 'poids',
                    CONCAT('GMQ faible : ', ROUND(v_gmq * 1000), ' g/jour (seuil : 300 g/jour)'),
                    'warning');
            END IF;
        END IF;

    COMMIT;
END$$
```

**Exemple d'appel :**

```sql
CALL sp_enregistrer_pesee(1, 320.00, '2026-04-12', 'BoviBot');
```

> Résultat : pesée insérée dans `pesees`, `poids_actuel` de TAG-001 mis à 320 kg. GMQ calculé : si pesée précédente était 305 kg il y a 42 jours → GMQ = 0,357 kg/jour → aucune alerte.

---

#### 5.1.2 `sp_declarer_vente`

**Rôle :** Vérifie que l'animal est actif, enregistre la vente dans la table `ventes` et change le statut de l'animal en `vendu`. Le trigger `trg_historique_statut` archive automatiquement la transition de statut.

**Paramètres :**

| Paramètre | Type | Description |
|---|---|---|
| `p_animal_id` | `INT` | Identifiant de l'animal |
| `p_acheteur` | `VARCHAR(150)` | Nom de l'acheteur |
| `p_telephone` | `VARCHAR(20)` | Téléphone de l'acheteur |
| `p_prix` | `DECIMAL(12,2)` | Prix en FCFA |
| `p_poids_vente` | `DECIMAL(6,2)` | Poids à la vente en kg |
| `p_date_vente` | `DATE` | Date de la transaction |

**Justification métier :** Empêche la vente d'animaux déjà vendus, morts ou en quarantaine. La vérification du statut avant tout INSERT garantit l'intégrité commerciale (on ne peut pas vendre deux fois le même animal).

**Comportement ACID :** Même pattern que `sp_enregistrer_pesee`. En cas d'animal non actif, un `SIGNAL SQLSTATE '45000'` lève une exception métier qui déclenche le ROLLBACK automatique.

**Code commenté :**

```sql
CREATE PROCEDURE sp_declarer_vente(
    IN p_animal_id   INT,
    IN p_acheteur    VARCHAR(150),
    IN p_telephone   VARCHAR(20),
    IN p_prix        DECIMAL(12,2),
    IN p_poids_vente DECIMAL(6,2),
    IN p_date_vente  DATE
)
BEGIN
    DECLARE v_statut VARCHAR(20);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

        -- 1. Vérifier que l'animal est en statut 'actif'
        SELECT statut INTO v_statut
        FROM animaux
        WHERE id = p_animal_id;

        IF v_statut != 'actif' THEN
            -- Erreur métier : annule la transaction
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Cet animal ne peut pas être vendu (statut non actif)';
        END IF;

        -- 2. Enregistrer la vente
        INSERT INTO ventes (animal_id, acheteur, telephone_acheteur, date_vente, poids_vente_kg, prix_fcfa)
        VALUES (p_animal_id, p_acheteur, p_telephone, p_date_vente, p_poids_vente, p_prix);

        -- 3. Changer le statut (déclenche trg_historique_statut)
        UPDATE animaux SET statut = 'vendu' WHERE id = p_animal_id;

    COMMIT;
END$$
```

**Exemple d'appel :**

```sql
CALL sp_declarer_vente(3, 'Oumar Ba', '771234567', 280000.00, 195.00, '2026-04-12');
```

> Résultat : vente de TAG-003 (Samba) enregistrée. Statut passe de `actif` à `vendu`. La transition est archivée dans `historique_statut` par le trigger.

---

#### 5.1.3 `sp_rapport_nutritionnel`

**Rôle :** Génère un rapport nutritionnel des 30 derniers jours pour un animal donné : quantité totale consommée, coût total, aliment principal, GMQ actuel et coût par kg de gain. Insère également une alerte informative dans `alertes`.

**Paramètres :**

| Paramètre | Type | Description |
|---|---|---|
| `p_animal_id` | `INT` | Identifiant de l'animal à analyser |

**Justification métier :** Permet à l'éleveur d'évaluer le rendement économique de l'alimentation : combien coûte chaque kilogramme de prise de poids ? Ce ratio oriente les décisions d'ajustement des rations.

**Code commenté :**

```sql
CREATE PROCEDURE sp_rapport_nutritionnel(IN p_animal_id INT)
BEGIN
    DECLARE v_quantite_totale DECIMAL(10,2);
    DECLARE v_cout_total      DECIMAL(12,2);
    DECLARE v_aliment_principal VARCHAR(100);
    DECLARE v_gmq             DECIMAL(6,3);
    DECLARE v_cout_par_kg_gain DECIMAL(12,2) DEFAULT 0;

    -- 1. Consommation et coût sur les 30 derniers jours
    SELECT SUM(quantite_kg), SUM(quantite_kg * cout_unitaire_kg)
    INTO v_quantite_totale, v_cout_total
    FROM alimentation
    WHERE animal_id = p_animal_id
      AND date_alimentation >= DATE_SUB(CURDATE(), INTERVAL 30 DAY);

    -- 2. Aliment le plus distribué (en poids)
    SELECT type_aliment INTO v_aliment_principal
    FROM alimentation
    WHERE animal_id = p_animal_id
      AND date_alimentation >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY type_aliment
    ORDER BY SUM(quantite_kg) DESC
    LIMIT 1;

    -- 3. Calcul du coût par kg de gain
    SET v_gmq = fn_gmq(p_animal_id);
    IF v_gmq > 0 THEN
        SET v_cout_par_kg_gain = (v_cout_total / 30) / v_gmq;
    END IF;

    -- 4. Alerte informative dans la table alertes
    IF v_quantite_totale IS NOT NULL THEN
        INSERT INTO alertes (animal_id, type, message, niveau)
        VALUES (p_animal_id, 'alimentation',
            CONCAT('Rapport 30j: ', ROUND(v_quantite_totale,1), 'kg (',
                   v_aliment_principal, '). Coût: ', ROUND(v_cout_total,0), ' FCFA.'),
            'info');
    END IF;

    -- 5. Retourner les indicateurs
    SELECT
        v_quantite_totale    AS quantite_totale_30j,
        v_cout_total         AS cout_total_30j,
        v_aliment_principal  AS aliment_principal,
        v_gmq                AS gmq_actuel,
        v_cout_par_kg_gain   AS cout_kg_gain;
END$$
```

**Exemple d'appel :**

```sql
CALL sp_rapport_nutritionnel(1);
-- TAG-001 (Baaba) : 240 kg de foin sur 30j, coût 36 000 FCFA,
-- GMQ 0.500 kg/jour → coût/kg gain = 2 400 FCFA/kg
```

---

### 5.2 Fonctions

Les fonctions PL/SQL encapsulent les calculs métier récurrents. Le LLM les invoque systématiquement dans les requêtes SQL (règle du SYSTEM_PROMPT : interdiction de recalculer l'âge ou le GMQ en dehors des fonctions dédiées).

---

#### 5.2.1 `fn_age_en_mois`

**Retourne :** `INT` — âge de l'animal en mois entiers.

**Formule :** `TIMESTAMPDIFF(MONTH, date_naissance, CURDATE())`

**Utilisation :** Toute requête impliquant l'âge (filtrage veaux < 6 mois, classement par tranche d'âge, trigger `trg_alerte_poids_faible`).

```sql
CREATE FUNCTION fn_age_en_mois(p_animal_id INT)
RETURNS INT
READS SQL DATA
BEGIN
    DECLARE v_date_naissance DATE;
    SELECT date_naissance INTO v_date_naissance FROM animaux WHERE id = p_animal_id;
    RETURN TIMESTAMPDIFF(MONTH, v_date_naissance, CURDATE());
END$$
```

**Exemple d'utilisation :**

```sql
-- Lister tous les animaux actifs avec leur âge
SELECT numero_tag, nom, fn_age_en_mois(id) AS age_mois
FROM animaux
WHERE statut = 'actif'
ORDER BY age_mois;
```

---

#### 5.2.2 `fn_gmq`

**Retourne :** `DECIMAL(6,3)` — Gain Moyen Quotidien en kg/jour sur l'ensemble de l'historique de pesées.

**Formule :** `(poids_dernière_pesée − poids_première_pesée) / nombre_de_jours`

**Utilisation :** Analyse de croissance, classement du troupeau, identification des animaux sous-performants.

```sql
CREATE FUNCTION fn_gmq(p_animal_id INT)
RETURNS DECIMAL(6,3)
READS SQL DATA
BEGIN
    DECLARE v_premiere_pesee DECIMAL(6,2);
    DECLARE v_derniere_pesee DECIMAL(6,2);
    DECLARE v_premiere_date  DATE;
    DECLARE v_derniere_date  DATE;
    DECLARE v_jours INT;

    -- Première pesée (poids de départ)
    SELECT poids_kg, date_pesee INTO v_premiere_pesee, v_premiere_date
    FROM pesees WHERE animal_id = p_animal_id ORDER BY date_pesee ASC LIMIT 1;

    -- Dernière pesée (poids actuel mesuré)
    SELECT poids_kg, date_pesee INTO v_derniere_pesee, v_derniere_date
    FROM pesees WHERE animal_id = p_animal_id ORDER BY date_pesee DESC LIMIT 1;

    SET v_jours = DATEDIFF(v_derniere_date, v_premiere_date);

    -- Retourner 0 si une seule pesée ou aucune
    IF v_jours = 0 OR v_premiere_pesee IS NULL THEN
        RETURN 0;
    END IF;

    RETURN (v_derniere_pesee - v_premiere_pesee) / v_jours;
END$$
```

**Exemple d'utilisation :**

```sql
-- Animaux avec GMQ inférieur à 0.3 kg/jour
SELECT a.numero_tag, a.nom, fn_gmq(a.id) AS gmq
FROM animaux a
WHERE a.statut = 'actif'
HAVING gmq < 0.3;
```

---

#### 5.2.3 `fn_cout_total_elevage`

**Retourne :** `DECIMAL(12,2)` — coût total d'élevage d'un animal en FCFA (alimentation + soins vétérinaires).

**Formule :** `SUM(quantite_kg × cout_unitaire_kg) + SUM(cout_sante)`

```sql
CREATE FUNCTION fn_cout_total_elevage(p_animal_id INT)
RETURNS DECIMAL(12,2)
READS SQL DATA
BEGIN
    DECLARE v_alim  DECIMAL(12,2) DEFAULT 0;
    DECLARE v_sante DECIMAL(12,2) DEFAULT 0;

    SELECT COALESCE(SUM(quantite_kg * cout_unitaire_kg), 0) INTO v_alim
    FROM alimentation WHERE animal_id = p_animal_id;

    SELECT COALESCE(SUM(cout), 0) INTO v_sante
    FROM sante WHERE animal_id = p_animal_id;

    RETURN v_alim + v_sante;
END$$
```

**Exemple d'utilisation :**

```sql
-- Coût total d'élevage par animal actif
SELECT numero_tag, nom, fn_cout_total_elevage(id) AS cout_total_fcfa
FROM animaux
WHERE statut = 'actif'
ORDER BY cout_total_fcfa DESC;
```

---

#### 5.2.4 `fn_rentabilite_estimee`

**Retourne :** `DECIMAL(12,2)` — rentabilité estimée en FCFA = valeur marchande au kilo vif moins le coût total d'élevage.

**Formule :** `(poids_actuel × 1 300 FCFA/kg) − fn_cout_total_elevage(animal_id)`

Le prix de référence de 1 300 FCFA/kg correspond au cours moyen du bétail sur pied au marché de Dakar.

```sql
CREATE FUNCTION fn_rentabilite_estimee(p_animal_id INT)
RETURNS DECIMAL(12,2)
READS SQL DATA
BEGIN
    DECLARE v_poids      DECIMAL(6,2);
    DECLARE v_cout_total DECIMAL(12,2);
    DECLARE v_prix_marche_kg DECIMAL(6,2) DEFAULT 1300.00;

    SELECT poids_actuel INTO v_poids FROM animaux WHERE id = p_animal_id;
    SET v_cout_total = fn_cout_total_elevage(p_animal_id);

    IF v_poids IS NULL OR v_cout_total IS NULL THEN
        RETURN 0;
    END IF;

    RETURN (v_poids * v_prix_marche_kg) - v_cout_total;
END$$
```

**Exemple d'utilisation :**

```sql
-- Top 3 des animaux les plus rentables à vendre aujourd'hui
SELECT numero_tag, nom, poids_actuel,
       fn_rentabilite_estimee(id) AS rentabilite_fcfa
FROM animaux
WHERE statut = 'actif'
ORDER BY rentabilite_fcfa DESC
LIMIT 3;
```

---

### 5.3 Triggers

Les triggers assurent la réactivité du système : ils s'exécutent automatiquement lors d'événements de base de données, sans intervention de l'application ni du LLM.

---

#### 5.3.1 `trg_historique_statut`

| Propriété | Valeur |
|---|---|
| Événement | `BEFORE UPDATE ON animaux` |
| Condition | `OLD.statut != NEW.statut` |
| Action | INSERT dans `historique_statut` |

**Justification :** Toute modification du champ `statut` est archivée avant d'être appliquée. Ce trigger est la seule source d'écriture dans `historique_statut`, ce qui garantit l'exhaustivité de l'audit.

```sql
CREATE TRIGGER trg_historique_statut
BEFORE UPDATE ON animaux
FOR EACH ROW
BEGIN
    IF OLD.statut != NEW.statut THEN
        INSERT INTO historique_statut (animal_id, ancien_statut, nouveau_statut)
        VALUES (OLD.id, OLD.statut, NEW.statut);
    END IF;
END$$
```

**Cas déclencheur :** `CALL sp_declarer_vente(3, ...)` → UPDATE statut de `actif` à `vendu` → trigger s'exécute → ligne insérée dans `historique_statut` avec horodatage.

---

#### 5.3.2 `trg_alerte_vaccination`

| Propriété | Valeur |
|---|---|
| Événement | `AFTER INSERT ON sante` |
| Condition | `prochain_rdv IS NOT NULL AND prochain_rdv < CURDATE()` |
| Action | INSERT alerte CRITICAL dans `alertes` |

**Justification :** Un rappel de vaccination déjà dépassé au moment de la saisie indique un oubli avéré. L'alerte de niveau CRITICAL s'affiche immédiatement sur le tableau de bord.

```sql
CREATE TRIGGER trg_alerte_vaccination
AFTER INSERT ON sante
FOR EACH ROW
BEGIN
    IF NEW.prochain_rdv IS NOT NULL AND NEW.prochain_rdv < CURDATE() THEN
        INSERT INTO alertes (animal_id, type, message, niveau)
        VALUES (NEW.animal_id, 'vaccination',
            CONCAT('Rappel vaccination en retard depuis le ', NEW.prochain_rdv),
            'critical');
    END IF;
END$$
```

**Cas déclencheur :** Saisie d'un acte de santé avec `prochain_rdv = '2025-12-01'` le 2026-04-12 → alerte critique générée automatiquement.

---

#### 5.3.3 `trg_alerte_poids_faible`

| Propriété | Valeur |
|---|---|
| Événement | `AFTER INSERT ON pesees` |
| Condition | `fn_age_en_mois(animal_id) <= 6 AND poids_kg < 60` |
| Action | INSERT alerte CRITICAL dans `alertes` |

**Justification :** Un veau de moins de 6 mois pesant moins de 60 kg présente un risque vital immédiat (dénutrition, maladie). L'alerte critique permet une intervention vétérinaire rapide.

```sql
CREATE TRIGGER trg_alerte_poids_faible
AFTER INSERT ON pesees
FOR EACH ROW
BEGIN
    DECLARE v_age_mois INT;
    SELECT fn_age_en_mois(NEW.animal_id) INTO v_age_mois;
    IF v_age_mois <= 6 AND NEW.poids_kg < 60 THEN
        INSERT INTO alertes (animal_id, type, message, niveau)
        VALUES (NEW.animal_id, 'poids',
            CONCAT('Poids critique pour un veau de ', v_age_mois,
                   ' mois : ', NEW.poids_kg, ' kg'),
            'critical');
    END IF;
END$$
```

**Cas déclencheur :** Pesée de TAG-006 (né le 2025-11-01, 5 mois) à 45 kg → alerte critique : *"Poids critique pour un veau de 5 mois : 45 kg"*.

---

#### 5.3.4 `trg_alerte_pesee_manquante`

| Propriété | Valeur |
|---|---|
| Événement | `AFTER INSERT ON pesees` |
| Condition | Animal actif sans pesée depuis > 30 jours |
| Action | INSERT alerte WARNING dans `alertes` (anti-doublon journalier) |

**Justification :** À chaque nouvelle pesée saisie, le système vérifie l'ensemble du troupeau et signale les animaux oubliés. Cela transforme chaque saisie en opportunité de contrôle global.

```sql
CREATE TRIGGER trg_alerte_pesee_manquante
AFTER INSERT ON pesees
FOR EACH ROW
BEGIN
    INSERT INTO alertes (animal_id, type, message, niveau)
    SELECT a.id, 'poids',
           CONCAT('Pesée manquante depuis > 30 jours : ', a.numero_tag),
           'warning'
    FROM animaux a
    WHERE a.statut = 'actif'
      AND NOT EXISTS (
          SELECT 1 FROM pesees p
          WHERE p.animal_id = a.id
            AND p.date_pesee >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      )
      AND NOT EXISTS (
          -- Anti-doublon : pas deux alertes du même type le même jour
          SELECT 1 FROM alertes al
          WHERE al.animal_id = a.id
            AND al.type = 'poids'
            AND al.message LIKE 'Pesée manquante%'
            AND DATE(al.date_creation) = CURDATE()
      );
END$$
```

---

### 5.4 Events MySQL Scheduler

Les events s'exécutent de façon autonome selon une planification définie. Ils sont activés par `SET GLOBAL event_scheduler = ON` au démarrage de MySQL.

---

#### 5.4.1 `evt_alerte_velages`

| Propriété | Valeur |
|---|---|
| Fréquence | Quotidienne (`EVERY 1 DAY`) |
| Logique | Gestations prévues dans les 7 prochains jours → alerte INFO par animal |
| Anti-doublon | Vérifie qu'aucune alerte du même type n'existe déjà pour le jour courant |

**Justification :** Un vêlage nécessite une préparation (box propre, matériel, vétérinaire préavisé). 7 jours d'anticipation est le délai minimal pour organiser les conditions d'accueil.

```sql
CREATE EVENT evt_alerte_velages
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    INSERT INTO alertes (animal_id, type, message, niveau)
    SELECT r.mere_id, 'velage',
        CONCAT('Vêlage prévu dans ',
               DATEDIFF(r.date_velage_prevue, CURDATE()),
               ' jour(s) : ', a.numero_tag),
        'info'
    FROM reproduction r
    JOIN animaux a ON r.mere_id = a.id
    WHERE r.statut = 'en_gestation'
      AND r.date_velage_prevue BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      AND NOT EXISTS (
          SELECT 1 FROM alertes al
          WHERE al.animal_id = r.mere_id
            AND al.type = 'velage'
            AND DATE(al.date_creation) = CURDATE()
      );
END$$
```

---

#### 5.4.2 `evt_rapport_croissance`

| Propriété | Valeur |
|---|---|
| Fréquence | Hebdomadaire (`EVERY 1 WEEK`) |
| Logique | Compte les animaux actifs → insère un résumé global dans `alertes` |

**Justification :** Un rapport hebdomadaire automatique fournit à l'éleveur un tableau de bord de synthèse sans aucune action de sa part. Il est visible dans l'onglet Alertes du dashboard.

```sql
CREATE EVENT evt_rapport_croissance
ON SCHEDULE EVERY 1 WEEK
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    DECLARE v_nb_animaux INT;

    SELECT COUNT(*) INTO v_nb_animaux FROM animaux WHERE statut = 'actif';

    INSERT INTO alertes (animal_id, type, message, niveau)
    VALUES (NULL, 'autre',
        CONCAT('Rapport hebdo : ', v_nb_animaux,
               ' animaux actifs. Consultez le tableau de bord pour les détails.'),
        'info');
END$$
```

---

#### 5.4.3 `evt_alerte_cout_mensuel`

| Propriété | Valeur |
|---|---|
| Fréquence | Mensuelle (`EVERY 1 MONTH`) |
| Logique | Somme le coût d'alimentation du mois écoulé → insère un bilan dans `alertes` |

**Justification :** Le coût d'alimentation est la principale charge variable d'un élevage. Un bilan mensuel automatique permet à l'éleveur de détecter rapidement une dérive budgétaire.

```sql
CREATE EVENT evt_alerte_cout_mensuel
ON SCHEDULE EVERY 1 MONTH
STARTS '2026-04-01 00:00:00'
DO
BEGIN
    DECLARE v_total DECIMAL(12,2);

    SELECT SUM(quantite_kg * cout_unitaire_kg) INTO v_total
    FROM alimentation
    WHERE date_alimentation >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH);

    INSERT INTO alertes (animal_id, type, message, niveau)
    VALUES (NULL, 'autre',
        CONCAT('Bilan mensuel alimentation : ',
               COALESCE(ROUND(v_total, 0), 0), ' FCFA.'),
        'info');
END$$
```

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
