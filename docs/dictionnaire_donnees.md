# Dictionnaire de données — BoviBot

## Conventions

| Symbole | Signification |
|---------|---------------|
| 🔑 | Clé primaire (PRIMARY KEY) |
| 🔗 | Clé étrangère (FOREIGN KEY) |
| NN | NOT NULL |
| UQ | UNIQUE |
| DEF | Valeur par défaut (DEFAULT) |

---

## Table 1 — `races`

> **Rôle métier :** Référentiel des races bovines disponibles dans l'élevage. Permet de classer les animaux et d'anticiper leur comportement productif (lait, viande).

| # | Champ | Type SQL | Contraintes | Rôle métier |
|---|-------|----------|-------------|-------------|
| 1 | 🔑 `id` | `INT AUTO_INCREMENT` | PK | Identifiant technique unique de la race |
| 2 | `nom` | `VARCHAR(100)` | NN | Nom vernaculaire de la race (ex : « Zébu Gobra ») |
| 3 | `origine` | `VARCHAR(100)` | — | Pays ou région d'origine géographique |
| 4 | `poids_adulte_moyen_kg` | `DECIMAL(6,2)` | — | Poids adulte moyen en kg, sert de référence pour évaluer la croissance |
| 5 | `production_lait_litre_jour` | `DECIMAL(6,2)` | DEF 0 | Production laitière moyenne journalière en litres (0 pour les races allaitantes) |

**Remarques :** Cette table est une référence stable ; elle est rarement modifiée en exploitation. Elle alimente les analyses de performance par race.

---

## Table 2 — `animaux`

> **Rôle métier :** Table centrale du système. Chaque ligne représente un individu du troupeau. Elle porte l'identité complète, l'état courant (poids, statut) et la généalogie (mère, père).

| # | Champ | Type SQL | Contraintes | Rôle métier |
|---|-------|----------|-------------|-------------|
| 1 | 🔑 `id` | `INT AUTO_INCREMENT` | PK | Identifiant interne unique |
| 2 | `numero_tag` | `VARCHAR(30)` | NN, UQ | Numéro de boucle auriculaire physique (ex : TAG-001). Identifiant terrain |
| 3 | `nom` | `VARCHAR(100)` | — | Nom usuel donné par l'éleveur |
| 4 | 🔗 `race_id` | `INT` | FK → races(id) | Race de l'animal ; NULL possible si race inconnue |
| 5 | `sexe` | `ENUM('M','F')` | NN | Sexe biologique ; conditionne la gestion (gestation, saillie) |
| 6 | `date_naissance` | `DATE` | NN | Date de naissance ; base de calcul pour l'âge (fn_age_en_mois) |
| 7 | `poids_actuel` | `DECIMAL(6,2)` | — | Poids en kg mis à jour automatiquement par sp_enregistrer_pesee |
| 8 | `statut` | `ENUM('actif','vendu','mort','quarantaine')` | DEF 'actif' | État opérationnel de l'animal dans le troupeau |
| 9 | 🔗 `mere_id` | `INT` | FK → animaux(id), NULL | Référence réflexive vers la mère (même table) |
| 10 | 🔗 `pere_id` | `INT` | FK → animaux(id), NULL | Référence réflexive vers le père (même table) |
| 11 | `notes` | `TEXT` | — | Observations libres de l'éleveur |
| 12 | `created_at` | `TIMESTAMP` | DEF CURRENT_TIMESTAMP | Horodatage de l'enregistrement |

**Remarques :** La relation réflexive (mere_id, pere_id) permet de construire l'arbre généalogique du troupeau. Le trigger `trg_historique_statut` surveille toute modification du champ `statut`.

---

## Table 3 — `pesees`

> **Rôle métier :** Historique chronologique des pesées. Chaque ligne capture une mesure de poids à une date donnée. La procédure `sp_enregistrer_pesee` y insère les données et déclenche le calcul du GMQ.

| # | Champ | Type SQL | Contraintes | Rôle métier |
|---|-------|----------|-------------|-------------|
| 1 | 🔑 `id` | `INT AUTO_INCREMENT` | PK | Identifiant unique de la pesée |
| 2 | 🔗 `animal_id` | `INT` | NN, FK → animaux(id) | Animal concerné |
| 3 | `poids_kg` | `DECIMAL(6,2)` | NN | Poids mesuré en kilogrammes |
| 4 | `date_pesee` | `DATE` | NN | Date de la mesure |
| 5 | `agent` | `VARCHAR(100)` | — | Nom de l'agent ayant effectué la pesée |
| 6 | `notes` | `TEXT` | — | Observations éventuelles (conditions, anomalies) |
| 7 | `created_at` | `TIMESTAMP` | DEF CURRENT_TIMESTAMP | Horodatage d'insertion |

**Remarques :** Le trigger `trg_alerte_poids_faible` se déclenche AFTER INSERT pour alerter si un veau de moins de 6 mois pèse sous 60 kg. La fonction `fn_gmq` utilise la première et la dernière pesée pour calculer le gain moyen quotidien global.

---

## Table 4 — `sante`

> **Rôle métier :** Journal des actes vétérinaires. Couvre vaccinations, traitements médicamenteux, examens de routine et chirurgies. Le champ `prochain_rdv` déclenche des alertes automatiques.

| # | Champ | Type SQL | Contraintes | Rôle métier |
|---|-------|----------|-------------|-------------|
| 1 | 🔑 `id` | `INT AUTO_INCREMENT` | PK | Identifiant unique de l'acte |
| 2 | 🔗 `animal_id` | `INT` | NN, FK → animaux(id) | Animal traité |
| 3 | `type` | `ENUM('vaccination','traitement','examen','chirurgie')` | NN | Catégorie de l'acte médical |
| 4 | `description` | `TEXT` | NN | Description détaillée de l'acte réalisé |
| 5 | `date_acte` | `DATE` | NN | Date de réalisation |
| 6 | `veterinaire` | `VARCHAR(100)` | — | Nom du vétérinaire intervenant |
| 7 | `medicament` | `VARCHAR(200)` | — | Médicament(s) administré(s) |
| 8 | `cout` | `DECIMAL(10,2)` | DEF 0 | Coût de l'acte en FCFA |
| 9 | `prochain_rdv` | `DATE` | NULL | Date du prochain rendez-vous ; si dépassée → alerte critique via trigger |
| 10 | `created_at` | `TIMESTAMP` | DEF CURRENT_TIMESTAMP | Horodatage d'insertion |

**Remarques :** Le trigger `trg_alerte_vaccination` s'exécute AFTER INSERT et crée une alerte de niveau CRITICAL si `prochain_rdv < CURDATE()`.

---

## Table 5 — `reproduction`

> **Rôle métier :** Suivi du cycle de reproduction. Chaque ligne représente une gestation en cours ou terminée. Lie une femelle (mère) à un mâle (père) avec les dates clés du cycle.

| # | Champ | Type SQL | Contraintes | Rôle métier |
|---|-------|----------|-------------|-------------|
| 1 | 🔑 `id` | `INT AUTO_INCREMENT` | PK | Identifiant de l'événement reproductif |
| 2 | 🔗 `mere_id` | `INT` | NN, FK → animaux(id) | Femelle gestante (doit être de sexe F) |
| 3 | 🔗 `pere_id` | `INT` | NN, FK → animaux(id) | Mâle saillisseur (doit être de sexe M) |
| 4 | `date_saillie` | `DATE` | NN | Date de la saillie naturelle ou insémination |
| 5 | `date_velage_prevue` | `DATE` | — | Date de vêlage calculée (saillie + ~280 jours) |
| 6 | `date_velage_reelle` | `DATE` | NULL | Date effective du vêlage ; NULL tant que non vêlé |
| 7 | `nb_veaux` | `INT` | DEF 0 | Nombre de veaux nés |
| 8 | `statut` | `ENUM('en_gestation','vele','avortement','echec')` | DEF 'en_gestation' | État actuel de la gestation |
| 9 | `notes` | `TEXT` | — | Observations vétérinaires sur la gestation |

**Remarques :** L'event `evt_alerte_velages` surveille quotidiennement les vêlages prévus dans les 7 prochains jours et génère des alertes de type INFO.

---

## Table 6 — `alimentation`

> **Rôle métier :** Enregistrement journalier des rations alimentaires distribuées à chaque animal. Permet le suivi des coûts d'alimentation et l'analyse des apports nutritionnels.

| # | Champ | Type SQL | Contraintes | Rôle métier |
|---|-------|----------|-------------|-------------|
| 1 | 🔑 `id` | `INT AUTO_INCREMENT` | PK | Identifiant de la distribution |
| 2 | 🔗 `animal_id` | `INT` | NN, FK → animaux(id) | Animal nourri |
| 3 | `type_aliment` | `VARCHAR(100)` | NN | Nature de l'aliment (foin, concentré, lait maternel, pâturage…) |
| 4 | `quantite_kg` | `DECIMAL(6,2)` | NN | Quantité distribuée en kilogrammes |
| 5 | `date_alimentation` | `DATE` | NN | Date de la distribution |
| 6 | `cout_unitaire_kg` | `DECIMAL(6,2)` | DEF 0 | Coût par kilogramme en FCFA (0 pour pâturage) |

**Remarques :** Le coût total = `quantite_kg × cout_unitaire_kg`. Agrégeable par période pour calculer le coût d'alimentation mensuel (requête LLM : "Quel est le coût total d'alimentation ce mois-ci ?").

---

## Table 7 — `ventes`

> **Rôle métier :** Registre officiel des ventes d'animaux. Chaque vente est définitive et fait passer l'animal au statut `vendu` via la procédure `sp_declarer_vente`.

| # | Champ | Type SQL | Contraintes | Rôle métier |
|---|-------|----------|-------------|-------------|
| 1 | 🔑 `id` | `INT AUTO_INCREMENT` | PK | Identifiant unique de la vente |
| 2 | 🔗 `animal_id` | `INT` | NN, FK → animaux(id) | Animal vendu |
| 3 | `acheteur` | `VARCHAR(150)` | NN | Nom complet de l'acheteur |
| 4 | `telephone_acheteur` | `VARCHAR(20)` | — | Numéro de téléphone pour suivi |
| 5 | `date_vente` | `DATE` | NN | Date effective de la transaction |
| 6 | `poids_vente_kg` | `DECIMAL(6,2)` | — | Poids à la vente, base du prix au kilo vif |
| 7 | `prix_fcfa` | `DECIMAL(12,2)` | NN | Prix de cession en Francs CFA |
| 8 | `notes` | `TEXT` | — | Conditions particulières de la vente |
| 9 | `created_at` | `TIMESTAMP` | DEF CURRENT_TIMESTAMP | Horodatage d'enregistrement |

**Remarques :** La procédure `sp_declarer_vente` vérifie que le statut de l'animal est `actif` avant d'insérer. Un animal `vendu`, `mort` ou `quarantaine` ne peut pas être revendu (SIGNAL SQLSTATE '45000').

---

## Table 8 — `alertes`

> **Rôle métier :** Centre de notification du système. Collecte les alertes générées automatiquement par les triggers et events MySQL, ainsi que les alertes manuelles. Le LLM interroge cette table pour informer l'éleveur.

| # | Champ | Type SQL | Contraintes | Rôle métier |
|---|-------|----------|-------------|-------------|
| 1 | 🔑 `id` | `INT AUTO_INCREMENT` | PK | Identifiant unique de l'alerte |
| 2 | 🔗 `animal_id` | `INT` | NULL, FK → animaux(id) | Animal concerné ; NULL pour les alertes globales (rapports, events hebdo) |
| 3 | `type` | `ENUM('poids','vaccination','velage','sante','alimentation','autre')` | NN | Catégorie fonctionnelle de l'alerte |
| 4 | `message` | `TEXT` | NN | Message descriptif en langage naturel |
| 5 | `niveau` | `ENUM('info','warning','critical')` | DEF 'warning' | Sévérité : INFO = informatif, WARNING = attention, CRITICAL = action urgente |
| 6 | `date_creation` | `TIMESTAMP` | DEF CURRENT_TIMESTAMP | Date et heure de déclenchement |
| 7 | `traitee` | `BOOLEAN` | DEF FALSE | TRUE quand l'éleveur a pris en charge l'alerte |

**Remarques :** Le champ `animal_id` est nullable intentionnellement pour accueillir les rapports généraux (ex : rapport hebdomadaire du troupeau produit par `evt_rapport_croissance`).

---

## Table 9 — `historique_statut`

> **Rôle métier :** Journal d'audit des changements de statut des animaux. Alimentée exclusivement par le trigger `trg_historique_statut`. Permet la traçabilité réglementaire.

| # | Champ | Type SQL | Contraintes | Rôle métier |
|---|-------|----------|-------------|-------------|
| 1 | 🔑 `id` | `INT AUTO_INCREMENT` | PK | Identifiant de l'entrée d'historique |
| 2 | 🔗 `animal_id` | `INT` | NN, FK → animaux(id) | Animal dont le statut a changé |
| 3 | `ancien_statut` | `VARCHAR(20)` | — | Valeur du statut avant la modification |
| 4 | `nouveau_statut` | `VARCHAR(20)` | — | Valeur du statut après la modification |
| 5 | `date_changement` | `TIMESTAMP` | DEF CURRENT_TIMESTAMP | Horodatage automatique du changement |

**Remarques :** Cette table est en lecture seule pour l'application. Seul le trigger `trg_historique_statut` (BEFORE UPDATE ON animaux) y écrit. Elle ne peut pas être manipulée directement par le LLM.

---

## Récapitulatif des relations

| Table source | Champ FK | Table cible | Cardinalité | Type |
|---|---|---|---|---|
| animaux | race_id | races | N,1 | Obligatoire (peut être NULL si race inconnue) |
| animaux | mere_id | animaux | N,1 | Réflexive, optionnelle |
| animaux | pere_id | animaux | N,1 | Réflexive, optionnelle |
| pesees | animal_id | animaux | N,1 | Obligatoire |
| sante | animal_id | animaux | N,1 | Obligatoire |
| reproduction | mere_id | animaux | N,1 | Obligatoire |
| reproduction | pere_id | animaux | N,1 | Obligatoire |
| alimentation | animal_id | animaux | N,1 | Obligatoire |
| ventes | animal_id | animaux | N,1 | Obligatoire |
| alertes | animal_id | animaux | N,1 | **Optionnelle (NULL autorisé)** |
| historique_statut | animal_id | animaux | N,1 | Obligatoire |

## Éléments PL/SQL — Justification Métier
Cette section documente chaque élément PL/SQL implémenté, son déclencheur et sa valeur métier.

## Procédures Stockées

## sp_enregistrer_pesee
Paramètres : animal_id INT, poids_kg DECIMAL(6,2), date DATE, agent VARCHAR(100)
Rôle : Enregistre une nouvelle pesée, met à jour poids_actuel dans animaux, calcule le GMQ par rapport à la pesée précédente et insère une alerte si GMQ < 300 g/jour.
Justification métier : L'éleveur ne doit pas gérer manuellement la mise à jour du poids courant ni calculer le GMQ. Cette procédure garantit la cohérence des données et l'automatisation des alertes de croissance.

## sp_declarer_vente
Paramètres : animal_id INT, acheteur VARCHAR, telephone VARCHAR, prix DECIMAL, poids_vente DECIMAL, date_vente DATE
Rôle : Vérifie que l'animal est en statut "actif" (SIGNAL SQLSTATE si non), enregistre la vente et change le statut en "vendu". Le trigger trg_historique_statut archive automatiquement le changement.
Justification métier : Empêche la vente d'animaux déjà vendus, morts ou en quarantaine. Garantit l'intégrité commerciale.

## Fonctions

## fn_age_en_mois(animal_id INT) → INT
Retourne l'âge de l'animal en mois entiers via TIMESTAMPDIFF(MONTH, date_naissance, CURDATE()).
Utilisation : Toute requête LLM impliquant l'âge ("Quels animaux ont moins de 6 mois ?", alertes poids veaux).

## fn_gmq(animal_id INT) → DECIMAL(6,3)
Calcule le Gain Moyen Quotidien sur l'ensemble de l'historique de pesées : (poids_final - poids_initial) / nb_jours.
Utilisation : Analyse de croissance, classement du troupeau, identification des animaux sous-performants.

## Triggers
## trg_historique_statut (BEFORE UPDATE animaux)
Se déclenche avant toute mise à jour sur animaux. Si OLD.statut ≠ NEW.statut, insère une ligne dans historique_statut avec l'ancien et le nouveau statut.
Justification : Traçabilité réglementaire et audit. L'éleveur peut reconstituer l'historique complet de chaque animal.

## trg_alerte_vaccination (AFTER INSERT sante)
Se déclenche après chaque insertion dans sante. Si prochain_rdv est renseigné et déjà dépassé (< CURDATE()), une alerte critique est créée dans la table alertes.
Justification : Prévention des oublis de vaccination qui peuvent engager la responsabilité de l'éleveur.

## trg_alerte_poids_faible (AFTER INSERT pesees)
Se déclenche après chaque insertion dans pesees. Utilise fn_age_en_mois() pour vérifier si l'animal a ≤ 6 mois et poids < 60 kg, auquel cas une alerte critique est créée.
Justification : Un veau de moins de 6 mois sous 60 kg présente un risque vital. L'alerte immédiate permet une intervention rapide.

## Events MySQL Scheduler
## evt_alerte_velages (Quotidien)
S'exécute chaque jour. Recherche toutes les gestations dont le vêlage prévu est dans les 7 prochains jours et insère une alerte info par animal concerné (anti-doublon sur la date du jour).
Justification : Permet à l'éleveur de préparer les conditions de vêlage à l'avance (box propre, vétérinaire préavisé).

## evt_rapport_croissance (Hebdomadaire)
S'exécute chaque semaine. Compte les animaux actifs et insère un résumé global dans la table alertes (type "autre", niveau "info").
Justification : Tableau de bord hebdomadaire automatique pour le suivi global du troupeau sans action de l'éleveur.



