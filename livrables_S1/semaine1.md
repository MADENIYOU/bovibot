# BOVIBOT
## Gestion d'Élevage Bovin avec IA et PL/SQL
### Rapport de Projet Complet

**Cours :** Intégration de l'IA et des Bases de Données Avancées · DIC 2
**Établissement :** ESP / UCAD · École Supérieure Polytechnique · Dakar, Sénégal
**Encadrant :** Pr. Ahmath Bamba MBACKE
**Année académique :** 2025 – 2026
**Date de rédaction :** 30 mars 2026

---

## COMPOSITION DU GROUPE

| **Mouhamadou Madeniyou Sall** | **Anna Ndoye** |
| :--- | :--- |
| Chef de groupe | Membre |
| *Intelligence Artificielle & Big Data* | *Sécurité des Systèmes d'Information* |

| **Abdoul Aziz Kane** | **Fatoumata Barro** |
| :--- | :--- |
| Membre | Membre |
| *Télécommunications & Réseaux* | *Télécommunications & Réseaux* |

---

# 1. Introduction et contexte métier

## 1.1 Contexte général
L'élevage bovin occupe une place centrale dans l'économie rurale sénégalaise. Selon les données du Ministère de l'Élevage, le cheptel bovin national dépasse les 3,5 millions de têtes, constituant une source essentielle de revenus pour les ménages ruraux, de sécurité alimentaire et de capital social. Pourtant, la majorité des exploitations sont gérées de manière informelle, sans outil de suivi structuré, ce qui limite la productivité et l'accès au crédit agricole.

Dans ce contexte, le numérique représente un levier de modernisation à fort impact. La combinaison de bases de données relationnelles avancées et d'assistants intelligents permet d'automater le suivi sanitaire, la traçabilité des pesées, la gestion de la reproduction et les alertes critiques --- autant de tâches qui reposent aujourd'hui sur la mémoire et les registres papier de l'éleveur.

## 1.2 Présentation du projet BoviBot
BoviBot est une application web de gestion d'élevage bovin développée dans le cadre du cours d'intégration de l'IA et des bases de données avancées (Licence 3, ESP/UCAD). Elle intègre deux composantes techniques complémentaires :
- Un assistant LLM (Large Language Model) capable d'interroger la base de données en langage naturel (mode Text-to-SQL) et d'exécuter des actions métier via des procédures stockées avec confirmation explicite.
- Un moteur PL/SQL avancé comprenant des procédures stockées, des fonctions, des triggers et des events MySQL Scheduler qui automatisent les alertes et les calculs de croissance du troupeau.

L'application s'adresse à un éleveur gérant un troupeau mixte : elle permet de consulter l'état du troupeau en langage naturel, d'enregistrer des pesées et des ventes via une interface de chat, et de recevoir des alertes automatiques sur la santé, la vaccination et les vêlages à venir.

## 1.3 Problématique
Comment concevoir un système de gestion d'élevage bovin qui soit à la fois rigoureux sur le plan de la logique métier (intégrité des données, contraintes, automatisations) et accessible à un utilisateur non technicien via une interface conversationnelle en langage naturel ?

## 1.4 Objectifs du projet
- Modéliser une base de données MySQL normalisée couvrant toutes les dimensions de la gestion d'un troupeau bovin.
- Implémenter les éléments PL/SQL obligatoires : 2 procédures stockées, 2 fonctions, 3 triggers, 2 events.
- Intégrer un assistant LLM (gpt-4o-mini ou équivalent) capable de générer du SQL à partir de questions en langue naturelle et d'appeler les procédures stockées via une interface de chat.
- Déployer l'application sur une infrastructure accessible en ligne avec tableau de bord, gestion des alertes et interface de chat.

# 2. Architecture technique

## 2.1 Vue d'ensemble
BoviBot repose sur une architecture trois tiers classique, enrichie d'une couche LLM intercalée entre le frontend et la base de données. Chaque couche a un rôle clairement délimité :

| **Couche** | **Technologie** | **Rôle** |
| :--- | :--- | :--- |
| Présentation | HTML / CSS / JavaScript | Tableau de bord, interface de chat, gestion des alertes |
| Application | Python FastAPI (port 8002) | API REST, orchestration LLM, appel des procédures stockées |
| Intelligence | OpenAI gpt-4o-mini / Ollama | Text-to-SQL, détection d'intention, génération de réponses |
| Données | MySQL 8.x + Event Scheduler | Stockage, PL/SQL, triggers, events automatisés |

## 2.2 Flux de traitement d'une requête
Le traitement d'une requête utilisateur suit le flux suivant :
- L'utilisateur saisit un message en langage naturel dans l'interface de chat.
- Le frontend envoie la requête au backend FastAPI via une requête HTTP POST.
- FastAPI transmet le message au LLM avec un prompt système contenant le schéma de la base de données.
- Le LLM identifie l'intention : CONSULTATION (génère du SQL) ou ACTION (identifie la procédure à appeler).
- En mode ACTION, le système demande une confirmation explicite à l'utilisateur avant tout appel de procédure.
- FastAPI exécute la requête SQL ou appelle la procédure stockée sur MySQL, puis formate la réponse.
- La réponse est affichée dans l'interface de chat avec les données pertinentes.

## 2.3 Justification des choix techniques
### FastAPI (Python)
FastAPI a été retenu pour sa performance (basé sur ASGI/Starlette), sa documentation automatique via OpenAPI, et sa compatibilité native avec les bibliothèques Python d'accès aux LLM (openai, httpx). Il simplifie également la validation des données entrantes via Pydantic.

### MySQL 8.x avec Event Scheduler
MySQL 8.x est requis pour la compatibilité avec les éléments PL/SQL du cahier des charges. L'activation de l'Event Scheduler (SET GLOBAL event_scheduler = ON) permet l'exécution automatique des events quotidiens et hebdomadaires sans dépendance à un outil externe comme cron.

### LLM : gpt-4o-mini / Ollama
Deux options sont prévues selon les contraintes de déploiement : l'API OpenAI (gpt-4o-mini) pour une mise en production rapide avec de bonnes performances en génération SQL, et Ollama (LLaMA3/Mistral) pour un déploiement entièrement local sans dépendance à une API externe.

### Frontend HTML/CSS/JS
Un frontend léger sans framework lourd a été privilégié pour limiter la complexité de déploiement. Il inclut un tableau de bord avec indicateurs clés, une interface de chat, une vue dédiée aux alertes et un suivi des gestations.

## 2.4 Déploiement
L'application est conçue pour être déployée sur Railway, Render ou un VPS. La configuration Docker permet de conteneuriser les trois composantes (frontend statique, backend FastAPI, base MySQL) pour simplifier la portabilité et la reproductibilité de l'environnement.

# 3. Modélisation de la Base de Données

La conception de la base de données BoviBot repose sur une analyse rigoureuse des besoins métier de la gestion d'un élevage bovin au Sénégal. L'objectif était de produire un schéma relationnel normalisé (3NF), cohérent et extensible, capable de supporter à la fois les requêtes analytiques du LLM (Text-to-SQL) et les opérations transactionnelles des procédures stockées PL/SQL.

## 3.1 Modèle Conceptuel de Données (MCD)
Le MCD a été obtenu par rétro-conception (reverse engineering) à partir du fichier schema.sql. Il identifie les entités métier, leurs attributs essentiels et les associations qui les relient, indépendamment de toute considération technique d'implémentation.

### Entités et familles
Le MCD de BoviBot comporte 9 entités regroupées en trois familles fonctionnelles :
- **ANIMAL** (entité centrale) : hub du système. Toutes les autres entités gravitent autour de lui via leurs clés étrangères.
- **RACES** (entité référentielle) : dictionnaire stable des races bovines. Alimentée manuellement par l'administrateur.
- **PESÉES, SANTÉ, ALIMENTATION, VENTES, REPRODUCTION** (entités de suivi) : enregistrent les événements du cycle de vie de l'animal au fil du temps.
- **ALERTES, HISTORIQUE_STATUT** (entités système) : alimentées automatiquement par les triggers et events MySQL, sans intervention de l'éleveur.

### Auto-référence dans ANIMAUX
L'entité ANIMAL porte deux associations réflexives : mere_id et pere_id, toutes deux des clés étrangères pointant vers la même table animaux. Ce choix permet de représenter la généalogie complète du troupeau (lignage maternel et paternel) sans table supplémentaire. Le MCD l'illustre via l'association « a » (parent-enfant) avec la notation « 2 » indiquant les deux rôles distincts (mère / père).

![Figure 2.1 --- Modèle Conceptuel de Données (MCD)](../docs/MCD_BoviBot.png) 

## 3.2 Modèle Logique de Données (MLD)
Le MLD traduit le MCD en schéma relationnel directement implémentable dans MySQL 8.x. Chaque entité devient une table avec ses attributs typés, ses clés primaires (id souligné), ses clés étrangères (# préfixe) et ses contraintes d'intégrité.

 ![Figure 2.2 --- Modèle Logique de Données (MLD)](../docs/MLD_BoviBot.png)     

### Récapitulatif des relations et cardinalités
| **Table source** | **Champ FK** | **Table cible** | **Cardinalité** | **Nature / Remarque** |
| :--- | :--- | :--- | :--- | :--- |
| **animaux** | *race_id* | races | **N --- 1** | Optionnelle (NULL si race inconnue) |
| **animaux** | *mere_id* | animaux | **N --- 1** | Auto-référence réflexive, optionnelle |
| **animaux** | *pere_id* | animaux | **N --- 1** | Auto-référence réflexive, optionnelle |
| **pesees** | *animal_id* | animaux | **N --- 1** | Obligatoire |
| **sante** | *animal_id* | animaux | **N --- 1** | Obligatoire |
| **reproduction** | *mere_id* | animaux | **N --- 1** | Obligatoire (sexe F attendu) |
| **reproduction** | *pere_id* | animaux | **N --- 1** | Obligatoire (sexe M attendu) |
| **alimentation** | *animal_id* | animaux | **N --- 1** | Obligatoire |
| **ventes** | *animal_id* | animaux | **N --- 1** | Obligatoire |
| **alertes** | *animal_id* | animaux | **N --- 1** | Optionnelle (NULL pour alertes globales) |
| **historique_statut** | *animal_id* | animaux | **N --- 1** | Obligatoire --- écriture trigger uniquement |

*La clé étrangère alertes.animal_id est la seule à accepter NULL intentionnellement : les events MySQL (evt_rapport_croissance) génèrent des alertes globales sans animal cible spécifique.*

## 3.3 Dictionnaire de Données Technique
Le dictionnaire ci-dessous documente exhaustivement les attributs répartis sur les 9 tables du schéma bovibot. Pour chaque champ : type MySQL exact, contraintes appliquées et rôle métier précis. Les clés primaires (🔑 PK) sont surlignées en jaune, les clés étrangères (🔗 FK) en bleu.

**Table : races --- Référentiel des races bovines**
| **\#** | **Champ** | **Type SQL** | **Contraintes** | **Rôle métier** |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **🔑 id** | *INT AUTO_INCREMENT* | PK | Identifiant technique unique de la race |
| 2 | nom | *VARCHAR(100)* | NN | Nom vernaculaire de la race (ex : Zébu Gobra) |
| 3 | origine | *VARCHAR(100)* | --- | Pays ou région d'origine géographique |
| 4 | poids_adulte_moyen_kg | *DECIMAL(6,2)* | --- | Poids adulte moyen en kg, référence pour évaluer la croissance |
| 5 | production_lait_litre_jour | *DECIMAL(6,2)* | DEF 0 | Production laitière moyenne journalière en litres (0 = race allaitante) |

**Table : animaux --- Table centrale du troupeau**
| **\#** | **Champ** | **Type SQL** | **Contraintes** | **Rôle métier** |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **🔑 id** | *INT AUTO_INCREMENT* | PK | Identifiant interne unique de l'animal |
| 2 | numero_tag | *VARCHAR(30)* | NN, UQ | N° boucle auriculaire physique (ex : TAG-001) --- identifiant terrain |
| 3 | nom | *VARCHAR(100)* | --- | Nom usuel donné par l'éleveur |
| 4 | **🔗 race_id** | *INT* | FK→races(id) | Race de l'animal ; NULL possible si race inconnue |
| 5 | sexe | *ENUM('M','F')* | NN | Sexe biologique ; conditionne la gestion (gestation, saillie) |
| 6 | date_naissance | *DATE* | NN | Date de naissance ; base de calcul pour fn_age_en_mois() |
| 7 | poids_actuel | *DECIMAL(6,2)* | --- | Poids en kg mis à jour automatiquement par sp_enregistrer_pesee |
| 8 | statut | *ENUM(actif,vendu,mort,quarantaine)* | DEF actif | État opérationnel de l'animal dans le troupeau |
| 9 | **🔗 mere_id** | *INT* | FK→animaux(id), NULL | Auto-référence vers la mère (même table) --- généalogie maternelle |
| 10 | **🔗 pere_id** | *INT* | FK→animaux(id), NULL | Auto-référence vers le père (même table) --- généalogie paternelle |
| 11 | notes | *TEXT* | --- | Observations libres de l'éleveur |
| 12 | created_at | *TIMESTAMP* | DEF NOW() | Horodatage d'insertion automatique |

**Table : pesees --- Historique des pesées**
| **\#** | **Champ** | **Type SQL** | **Contraintes** | **Rôle métier** |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **🔑 id** | *INT AUTO_INCREMENT* | PK | Identifiant unique de la pesée |
| 2 | **🔗 animal_id** | *INT* | NN, FK→animaux | Animal concerné par la mesure |
| 3 | poids_kg | *DECIMAL(6,2)* | NN | Poids mesuré en kilogrammes |
| 4 | date_pesee | *DATE* | NN | Date de la mesure de poids |
| 5 | agent | *VARCHAR(100)* | --- | Nom de l'agent ayant effectué la pesée |
| 6 | notes | *TEXT* | --- | Observations éventuelles (conditions, anomalies) |
| 7 | created_at | *TIMESTAMP* | DEF NOW() | Horodatage d'insertion |

**Table : sante --- Journal vétérinaire**
| **\#** | **Champ** | **Type SQL** | **Contraintes** | **Rôle métier** |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **🔑 id** | *INT AUTO_INCREMENT* | PK | Identifiant unique de l'acte vétérinaire |
| 2 | **🔗 animal_id** | *INT* | NN, FK→animaux | Animal traité |
| 3 | type | *ENUM(vaccination,traitement,examen,chirurgie)* | NN | Catégorie de l'acte médical |
| 4 | description | *TEXT* | NN | Description détaillée de l'acte réalisé |
| 5 | date_acte | *DATE* | NN | Date de réalisation de l'acte |
| 6 | veterinaire | *VARCHAR(100)* | --- | Nom du vétérinaire intervenant |
| 7 | medicament | *VARCHAR(200)* | --- | Médicament(s) administré(s) |
| 8 | cout | *DECIMAL(10,2)* | DEF 0 | Coût de l'acte en FCFA |
| 9 | prochain_rdv | *DATE* | NULL | Prochain RDV ; si dépassé → alerte CRITICAL via trigger |
| 10 | created_at | *TIMESTAMP* | DEF NOW() | Horodatage d'insertion |

**Table : reproduction --- Suivi des gestations**
| **\#** | **Champ** | **Type SQL** | **Contraintes** | **Rôle métier** |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **🔑 id** | *INT AUTO_INCREMENT* | PK | Identifiant de l'événement reproductif |
| 2 | **🔗 mere_id** | *INT* | NN, FK→animaux | Femelle gestante (sexe F attendu) |
| 3 | **🔗 pere_id** | *INT* | NN, FK→animaux | Mâle saillisseur (sexe M attendu) |
| 4 | date_saillie | *DATE* | NN | Date de la saillie naturelle ou insémination artificielle |
| 5 | date_velage_prevue | *DATE* | --- | Vêlage estimé : saillie + ~280 jours |
| 6 | date_velage_reelle | *DATE* | NULL | Date effective du vêlage ; NULL tant que non vêlé |
| 7 | nb_veaux | *INT* | DEF 0 | Nombre de veaux nés lors du vêlage |
| 8 | statut | *ENUM(en_gestation,vele,avortement,echec)* | DEF en_gestation | État actuel du cycle reproductif |
| 9 | notes | *TEXT* | --- | Observations vétérinaires sur la gestation |

**Table : alimentation --- Rations alimentaires**
| **\#** | **Champ** | **Type SQL** | **Contraintes** | **Rôle métier** |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **🔑 id** | *INT AUTO_INCREMENT* | PK | Identifiant de la distribution alimentaire |
| 2 | **🔗 animal_id** | *INT* | NN, FK→animaux | Animal nourri |
| 3 | type_aliment | *VARCHAR(100)* | NN | Nature de l'aliment (foin, concentré, lait maternel, pâturage...) |
| 4 | quantite_kg | *DECIMAL(6,2)* | NN | Quantité distribuée en kilogrammes |
| 5 | date_alimentation | *DATE* | NN | Date de la distribution |
| 6 | cout_unitaire_kg | *DECIMAL(6,2)* | DEF 0 | Coût par kg en FCFA (0 pour pâturage naturel) |

**Table : ventes --- Registre commercial**
| **\#** | **Champ** | **Type SQL** | **Contraintes** | **Rôle métier** |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **🔑 id** | *INT AUTO_INCREMENT* | PK | Identifiant unique de la vente |
| 2 | **🔗 animal_id** | *INT* | NN, FK→animaux | Animal vendu |
| 3 | acheteur | *VARCHAR(150)* | NN | Nom complet de l'acheteur |
| 4 | telephone_acheteur | *VARCHAR(20)* | --- | Numéro de téléphone pour suivi post-vente |
| 5 | date_vente | *DATE* | NN | Date effective de la transaction commerciale |
| 6 | poids_vente_kg | *DECIMAL(6,2)* | --- | Poids à la vente --- base du prix au kilo vif |
| 7 | prix_fcfa | *DECIMAL(12,2)* | NN | Prix de cession en Francs CFA |
| 8 | notes | *TEXT* | --- | Conditions particulières de la vente |
| 9 | created_at | *TIMESTAMP* | DEF NOW() | Horodatage d'enregistrement |

**Table : alertes --- Centre de notification système**
| **\#** | **Champ** | **Type SQL** | **Contraintes** | **Rôle métier** |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **🔑 id** | *INT AUTO_INCREMENT* | PK | Identifiant unique de l'alerte |
| 2 | **🔗 animal_id** | *INT* | NULL, FK→animaux | Animal concerné ; NULL pour alertes globales (rapports, events) |
| 3 | type | *ENUM(poids,vaccination,velage,sante,alimentation,autre)* | NN | Catégorie fonctionnelle de l'alerte |
| 4 | message | *TEXT* | NN | Message descriptif en langage naturel |
| 5 | niveau | *ENUM(info,warning,critical)* | DEF warning | Sévérité : INFO = informatif, WARNING = attention, CRITICAL = urgent |
| 6 | date_creation | *TIMESTAMP* | DEF NOW() | Date et heure de déclenchement de l'alerte |
| 7 | traitee | *BOOLEAN* | DEF FALSE | TRUE quand l'éleveur a pris en charge l'alerte |

**Table : historique_statut --- Journal d'audit (trigger)**
| **\#** | **Champ** | **Type SQL** | **Contraintes** | **Rôle métier** |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **🔑 id** | *INT AUTO_INCREMENT* | PK | Identifiant de l'entrée d'historique |
| 2 | **🔗 animal_id** | *INT* | NN, FK→animaux | Animal dont le statut a changé |
| 3 | ancien_statut | *VARCHAR(20)* | --- | Valeur du statut avant la modification |
| 4 | nouveau_statut | *VARCHAR(20)* | --- | Valeur du statut après la modification |
| 5 | date_changement | *TIMESTAMP* | DEF NOW() | Horodatage automatique (lecture seule --- trigger uniquement) |

## 3.4 Audit d'Intégrité des Types et Contraintes SQL
L'étape consistait à vérifier que les types DECIMAL retenus pour les données numériques sensibles (poids, prix, coûts) et les ENUM utilisés pour les statuts sont adaptés aux réalités métier de l'élevage bovin sénégalais.

| **Champ** | **Type choisi** | **Justification métier** | **Val. max** | **Verdict** |
| :--- | :--- | :--- | :--- | :--- |
| **poids_actuel / poids_kg** | *DECIMAL(6,2)* | Précision centimétrique nécessaire pour le GMQ (g/jour). DECIMAL évite les erreurs d'arrondi des FLOAT. | 9 999.99 kg | **✅** |
| **prix_fcfa** | *DECIMAL(12,2)* | Montants en FCFA pouvant largement dépasser 1 million. DECIMAL garantit l'exactitude des calculs financiers. | 999 Mds FCFA | **✅** |
| **cout (sante)** | *DECIMAL(10,2)* | Couvre les actes vétérinaires les plus coûteux. Plafond à 99 millions FCFA adapté. | 99 M FCFA | **✅** |
| **cout_unitaire_kg** | *DECIMAL(6,2)* | Prix au kg des aliments, concentrés inclus. | 9 999.99 FCFA | **✅** |
| **sexe ENUM(M,F)** | *ENUM* | Valeurs biologiques stables et fermées pour les bovins. Stockage 1 octet vs VARCHAR --- validation moteur automatique. | --- | **✅** |
| **statut ENUM** | *ENUM(4 val.)* | Cycle de vie fermé : actif → vendu / mort / quarantaine. Empêche toute valeur aberrante. | --- | **✅** |
| **niveau ENUM** | *ENUM(3 val.)* | Aligné sur les standards ITIL/SNMP (info / warning / critical). | --- | **✅** |
| **nb_veaux (repro.)** | *INT sans CHECK* | Valeur entière correcte mais sans contrainte de plage. Amélioration : ajouter CHECK(nb_veaux BETWEEN 0 AND 5). | --- | **⚠️** |

### Bilan et recommandations
Sept des huit points de contrôle sont validés sans réserve. Un seul point d'amélioration est identifié : l'ajout d'une contrainte CHECK sur reproduction.nb_veaux. Cette contrainte, qui limite le nombre de veaux à 5 par vêlage (réalité biologique bovine), sera intégrée dans le script refactorisé. Aucune anomalie critique n'a été détectée ; le schéma est considéré comme sain et prêt pour l'intégration du backend FastAPI.

# 4. Logique PL/SQL --- Procédures, Fonctions, Triggers et Events

Cette section documente l'ensemble des éléments PL/SQL implémentés : 2 procédures stockées, 2 fonctions, 3 triggers et 2 events MySQL Scheduler. Pour chaque élément, la justification métier, la logique technique et les résultats des tests unitaires sont présentés. Tous les éléments ont été validés par le script de certification SQL (tests/unit_tests_plsql.sql). Les procédures stockées ont été sécurisées avec des transactions ACID (START TRANSACTION / COMMIT / ROLLBACK) pour garantir l'intégrité des données.

## 4.1 Fonctions PL/SQL

### 4.1.1 fn_age_en_mois(animal_id)
**Justification métier :** L'âge en mois est un indicateur fondamental en élevage bovin. Il permet de catégoriser les animaux, de déclencher les alertes de vaccination adaptées et de contextualiser les mesures de poids. Le calculer à la volée garantit une valeur toujours exacte.

| **Paramètre** | **Type** | **Description** |
| :--- | :--- | :--- |
| p_animal_id | INT (IN) | Identifiant de l'animal dans la table animaux |
| Retour | INT | Nombre de mois entiers depuis la date de naissance jusqu'à aujourd'hui |

```sql
CREATE FUNCTION fn_age_en_mois(p_animal_id INT)
RETURNS INT
READS SQL DATA
BEGIN
    DECLARE v_date_naissance DATE;
    SELECT date_naissance INTO v_date_naissance
    FROM animaux WHERE id = p_animal_id;
    RETURN TIMESTAMPDIFF(MONTH, v_date_naissance, CURDATE());
END
```
Résultat des tests : La fonction a été comparée à TIMESTAMPDIFF() appelé directement sur les 7 animaux de la base de test. Résultat : 7/7 PASS.

### 4.1.2 fn_gmq(animal_id)
**Justification métier :** Le Gain Moyen Quotidien (GMQ) est l'indicateur central de la performance de croissance d'un bovin. Un GMQ inférieur à 300 g/jour signale un animal en difficulté. Cette fonction est appelée par le LLM et par la procédure sp_enregistrer_pesee pour déclencher les alertes.

| **Paramètre** | **Type** | **Description** |
| :--- | :--- | :--- |
| p_animal_id | INT (IN) | Identifiant de l'animal |
| Retour | DECIMAL(6,3) | GMQ en kg/jour. Retourne 0 si moins de 2 pesées disponibles |

```sql
CREATE FUNCTION fn_gmq(p_animal_id INT)
RETURNS DECIMAL(6,3)
READS SQL DATA
BEGIN
    DECLARE v_premiere_pesee DECIMAL(6,2);
    DECLARE v_derniere_pesee DECIMAL(6,2);
    DECLARE v_premiere_date DATE;
    DECLARE v_derniere_date DATE;
    DECLARE v_jours INT;

    -- Récupérer première et dernière pesée
    SELECT poids_kg, date_pesee INTO v_premiere_pesee, v_premiere_date
    FROM pesees WHERE animal_id = p_animal_id ORDER BY date_pesee ASC LIMIT 1;

    SELECT poids_kg, date_pesee INTO v_derniere_pesee, v_derniere_date
    FROM pesees WHERE animal_id = p_animal_id ORDER BY date_pesee DESC LIMIT 1;

    SET v_jours = DATEDIFF(v_derniere_date, v_premiere_date);

    IF v_jours = 0 OR v_premiere_pesee IS NULL THEN RETURN 0; END IF;

    RETURN (v_derniere_pesee - v_premiere_pesee) / v_jours;
END
```
Résultat des tests : Test sur 7 animaux avec 3 scénarios : GMQ positif (3 pesées), retour 0 (0 pesée), retour 0 (1 pesée). Résultat : 7/7 PASS.

## 4.2 Procédures Stockées
Les deux procédures stockées constituent le cœur transactionnel de BoviBot. Chaque procédure est sécurisée avec une transaction ACID.

### 4.2.1 sp_enregistrer_pesee
**Justification métier :** L'enregistrement d'une pesée est une opération composée de plusieurs actions interdépendantes. La transaction ACID garantit que les 3 actions (insertion pesée, mise à jour poids, création alerte éventuelle) sont exécutées en bloc ou pas du tout.

| **Paramètre** | **Type** | **Rôle** |
| :--- | :--- | :--- |
| p_animal_id | INT | Animal à peser |
| p_poids_kg | DECIMAL(6,2) | Nouveau poids en kilogrammes |
| p_date | DATE | Date de la pesée (format YYYY-MM-DD) |
| p_agent | VARCHAR(100) | Nom de l'agent ayant effectué la pesée |

**Logique interne :**
1. Déclaration du gestionnaire d'erreur ACID : ROLLBACK + RESIGNAL en cas d'exception
2. START TRANSACTION
3. INSERT dans pesees
4. UPDATE animaux SET poids_actuel = p_poids_kg
5. Calcul du GMQ et alerte si GMQ < 0.3 kg/jour
6. COMMIT

**Résultats des tests :**
| **Bloc** | **Scénario testé** | **Résultat** |
| :--- | :--- | :--- |
| Bloc 3 | Cas normal : 335 kg pour TAG-001 | PASS --- insertion + MAJ poids confirmées |
| Bloc 4 | GMQ faible : 321 kg après 320 kg en 28 jours (35 g/jour) | PASS --- alerte warning créée |

### 4.2.2 sp_declarer_vente
**Justification métier :** La vente d'un animal est une opération irréversible à fort impact financier. La procédure intègre une vérification de statut et une mise à jour atomique dans la même transaction.

| **Paramètre** | **Type** | **Rôle** |
| :--- | :--- | :--- |
| p_animal_id | INT | Animal à vendre |
| p_acheteur | VARCHAR(150) | Nom complet de l'acheteur |
| p_telephone | VARCHAR(20) | Téléphone de l'acheteur pour suivi |
| p_prix | DECIMAL(12,2) | Prix de vente en Francs CFA |
| p_poids_vente | DECIMAL(6,2) | Poids à la vente en kg |
| p_date_vente | DATE | Date effective de la transaction |

**Logique interne :**
1. Déclaration du gestionnaire d'erreur ACID
2. START TRANSACTION
3. Si statut != 'actif' : SIGNAL SQLSTATE '45000' (bloque la procédure)
4. INSERT dans ventes
5. UPDATE animaux SET statut = 'vendu'
6. COMMIT

**Résultats des tests :**
| **Bloc** | **Scénario testé** | **Résultat** |
| :--- | :--- | :--- |
| Bloc 5 | Vente normale de TAG-003 à Moussa Diop pour 280 000 FCFA | PASS --- vente enregistrée, statut='vendu', trigger loggé |
| Bloc 6 | Vente d'un animal avec statut='mort' | PASS --- SIGNAL bloqué, ROLLBACK, aucune vente insérée |

## 4.3 Triggers
Les trois triggers automatisent la traçabilité et les alertes sans intervention de l'application.

| **Trigger** | **Événement** | **Table** | **Action** |
| :--- | :--- | :--- | :--- |
| trg_historique_statut | BEFORE UPDATE | animaux | Logue tout changement de statut dans historique_statut |
| trg_alerte_vaccination | AFTER INSERT | sante | Crée une alerte CRITICAL si prochain_rdv est dépassé |
| trg_alerte_poids_faible | AFTER INSERT | pesees | Crée une alerte CRITICAL si veau < 60 kg avant 6 mois |

### 4.3.1 trg_historique_statut
**Justification métier :** La traçabilité des changements de statut est exigée pour l'audit et la détection de fraudes. Ce trigger enregistre automatiquement l'ancien et le nouveau statut à chaque UPDATE.

```sql
CREATE TRIGGER trg_historique_statut
BEFORE UPDATE ON animaux
FOR EACH ROW
BEGIN
    IF OLD.statut != NEW.statut THEN
        INSERT INTO historique_statut (animal_id, ancien_statut, nouveau_statut)
        VALUES (OLD.id, OLD.statut, NEW.statut);
    END IF;
END
```
Validation : Confirmé lors du Bloc 5 des tests unitaires. Lors de l'appel de sp_declarer_vente, le trigger a automatiquement inscrit la transition actif → vendu dans historique_statut. PASS.

### 4.3.2 trg_alerte_vaccination
**Justification métier :** Un rappel de vaccination dépassé expose l'ensemble du troupeau à un risque épidémique. Ce trigger vérifie, à chaque insertion d'un acte vétérinaire, si la date de prochain rendez-vous est déjà dépassée, et crée immédiatement une alerte de niveau CRITICAL.

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
END
```

### 4.3.3 trg_alerte_poids_faible
**Justification métier :** Un veau de moins de 6 mois pesant moins de 60 kg est en situation critique. Ce trigger détecte cette situation automatiquement à chaque insertion de pesée.

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
                CONCAT('Poids critique pour un veau de ', v_age_mois, ' mois : ', NEW.poids_kg, ' kg'),
                'critical');
    END IF;
END
```
Validation : Ce trigger s'est déclenché automatiquement lors de l'import des données de test (Veau1 --- TAG-006 pesait 45 kg à 4 mois lors de sa première pesée). L'alerte CRITICAL a été créée instantanément. PASS.


## 4.4 Events MySQL Scheduler
Les deux events sont exécutés automatiquement par le planificateur MySQL (activé par SET GLOBAL event_scheduler = ON). Ils automatisent les tâches récurrentes de surveillance.

| **Event** | **Fréquence** | **Action métier** |
| :--- | :--- | :--- |
| evt_alerte_velages | Quotidien | Crée une alerte INFO pour chaque gestation dont le vêlage est prévu dans les 7 prochains jours |
| evt_rapport_croissance | Hebdomadaire | Insère un résumé global du troupeau dans les alertes (type='autre', niveau='info') |

### 4.4.1 evt_alerte_velages
**Justification métier :** Un vêlage non anticipé peut mettre en danger la mère et le veau. Cet événement quotidien scrute les gestations en cours et notifie l'éleveur 7 jours avant la date de vêlage prévue.

```sql
CREATE EVENT evt_alerte_velages
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO BEGIN
    INSERT INTO alertes (animal_id, type, message, niveau)
    SELECT r.mere_id, 'velage',
           CONCAT('Vêlage prévu dans ', DATEDIFF(r.date_velage_prevue, CURDATE()), ' jour(s) : ', a.numero_tag),
           'info'
    FROM reproduction r
    JOIN animaux a ON r.mere_id = a.id
    WHERE r.statut = 'en_gestation'
      AND r.date_velage_prevue BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      AND NOT EXISTS (
          SELECT 1 FROM alertes al
          WHERE al.animal_id = r.mere_id AND al.type = 'velage'
            AND DATE(al.date_creation) = CURDATE()
      );
END
```

### 4.4.2 evt_rapport_croissance
**Justification métier :** L'éleveur a besoin d'un point de situation hebdomadaire sans avoir à interroger le système manuellement. Cet événement insère chaque semaine un résumé dans le centre d'alertes.

```sql
CREATE EVENT evt_rapport_croissance
ON SCHEDULE EVERY 1 WEEK
STARTS CURRENT_TIMESTAMP
DO BEGIN
    DECLARE v_nb_animaux INT;
    SELECT COUNT(*) INTO v_nb_animaux FROM animaux WHERE statut = 'actif';

    INSERT INTO alertes (animal_id, type, message, niveau)
    VALUES (NULL, 'autre',
            CONCAT('Rapport hebdo : ', v_nb_animaux, ' animaux actifs. Consultez le tableau de bord.'),
            'info');
END
```
Validation : L'event s'est exécuté automatiquement au démarrage de la base (STARTS CURRENT_TIMESTAMP). L'alerte globale a été trouvée dans la table alertes lors de la vérification finale. PASS.


## 4.5 Récapitulatif de validation
| **Élément PL/SQL** | **Bloc test** | **Scénario** | **Résultat** |
| :--- | :--- | :--- | :--- |
| fn_age_en_mois | Bloc 1 | Comparaison sur 7 animaux | 7/7 PASS |
| fn_gmq | Bloc 2 | GMQ positif + retour 0 sans pesée | 7/7 PASS |
| sp_enregistrer_pesee | Bloc 3 | Cas normal --- insertion + MAJ poids | PASS |
| sp_enregistrer_pesee | Bloc 4 | GMQ faible --- alerte warning créée | PASS |
| sp_declarer_vente | Bloc 5 | Cas normal --- vente + statut + trigger | PASS |
| sp_declarer_vente | Bloc 6 | Animal mort --- SIGNAL + ROLLBACK | PASS |
| trg_historique_statut | Bloc 5 | Transition actif → vendu loggée | PASS |
| trg_alerte_poids_faible | Données test | Veau 45 kg à 4 mois --- alerte CRITICAL | PASS |
| evt_rapport_croissance | Import initial | Alerte hebdo insérée au démarrage | PASS |

# 5. Bilan Semaine 1
## 5.1 Travaux réalisés
Les phases de la Roadmap Semaine 1 ont été exécutées dans leur intégralité.

| **Étape** | **Responsable** | **Livrable** | **Statut** |
| :--- | :--- | :--- | :--- |
| 01 --- Init repo & branches | Sall | main + develop + branches dev-* | ✓ Terminé |
| 02 --- Branching model | Sall | dev-barro, dev-anna, dev-kane | ✓ Terminé |
| 03 --- Config environnement | Barro | .env.example | ✓ Terminé |
| 04 --- Audit backend-SQL | Sall | app.py synchronisé avec schema.sql | ✓ Terminé |
| 05 --- MCD / MLD | Anna | docs/MCD_BoviBot.png, docs/MLD_BoviBot.png | ✓ Terminé |
| 06 --- Dictionnaire de données | Anna | docs/dictionnaire_donnees.md | ✓ Terminé |
| 07 --- Audit intégrité SQL | Anna | Types DECIMAL et ENUM vérifiés | ✓ Terminé |
| 08 --- Script certification SQL | Kane | tests/unit_tests_plsql.sql | ✓ Terminé |
| 09 --- Transactions ACID | Kane | schema.sql avec START TRANSACTION / COMMIT | ✓ Terminé |
| 10 --- Certification triggers | Barro | tests/rapport_tests_triggers.md | ✓ Terminé |
| 11 --- Test evt_alerte_velages | Barro | Rapport de validation | ✓ Terminé |
| 12 --- Gold dataset (50 lignes) | Barro | data/seed_data.sql | ✓ Terminé |
| 13 --- Rapport cadre & archi | Sall | Rapport_BoviBot_V1_Etape_13.docx | ✓ Terminé |

## 5.2 Points de validation clés
L'ensemble des éléments PL/SQL obligatoires a été validé par les tests unitaires (tous PASS).

| **Élément PL/SQL** | **Test effectué** | **Résultat** |
| :--- | :--- | :--- |
| fn_age_en_mois | Comparaison avec TIMESTAMPDIFF sur 7 animaux | PASS --- 7/7 |
| fn_gmq | GMQ positif (≥2 pesées) et retour 0 sinon | PASS --- 7/7 |
| sp_enregistrer_pesee | Insertion + MAJ poids + alerte GMQ faible | PASS |
| sp_declarer_vente | Vente normale + blocage animal non actif | PASS |
| trg_historique_statut | Log automatique lors du changement de statut | PASS |
| trg_alerte_vaccination | Alerte critical sur prochain_rdv dépassé | PASS |
| trg_alerte_poids_faible | Alerte critical veau < 60 kg avant 6 mois | PASS |
| evt_alerte_velages | Alerte vêlage pour femelles à ≤7 jours | PASS |
| evt_rapport_croissance | Insertion alerte globale hebdomadaire | PASS |

## 5.3 Écarts par rapport à la Roadmap initiale
- Le test de evt_rapport_croissance, absent du script de Kane, a été pris en charge par le chef de projet (Bloc 7 ajouté à unit_tests_plsql.sql).
- La validation de trg_historique_statut a été confirmée comme déjà couverte par le Bloc 5 --- aucune action supplémentaire requise.

## 5.4 Checklist de fin de Semaine 1
| **Point de contrôle** | **Responsable** | **État** |
| :--- | :--- | :--- |
| Au moins 5 commits par membre dans l'historique Git | Sall | ✓ Validé |
| schema.sql sur develop inclut les transactions ACID | Kane | ✓ Validé |
| La vente d'un animal 'mort' est bloquée par le SQL | Kane | ✓ Validé (Bloc 6) |
| docs/ contient MCD et MLD en haute résolution | Anna | ✓ Validé |
| seed_data.sql injecte 50 lignes sans erreur de clé étrangère | Barro | ✓ Validé |
| app.py se lance sans erreur de connexion MySQL | Sall | ✓ Validé |

# 6. Gold Dataset --- Données de Test
Pour préparer le LLM et permettre des tests réalistes, un script data/seed_data.sql a été créé et injecté avec succès dans la base bovibot.

| **Table** | **Nb lignes** | **Description** |
| :--- | :--- | :--- |
| races | 5 | Races bovines : Zebu Gobra, Ndama, Jersiaise, Charolaise, Metis local |
| animaux | 15 | Animaux TAG-001 à TAG-015 avec statuts variés (actif, vendu, mort) |
| pesees | 15 | Pesees janvier-mars 2026, agent Barro |
| sante | 10 | Actes vétérinaires avec RDV de suivi (Dr Diop, Dr Faye) |
| alimentation | 5 | Rations : foin, concentre, paturage |
| **TOTAL** | **50** | Donnees realistes pour l'entrainement du LLM BoviBot |

**Cas limites couverts :**
- Poids critique : TAG-015 avec 45 kg -> déclenche trg_alerte_poids_faible
- Animal vendu : TAG-003 statut 'vendu' -> testé avec trg_historique_statut
- Animal mort : TAG-010 statut 'mort' -> cas limite pour les ventes bloquées
- Races diversifiées : locales (Zebu Gobra, Ndama) et importées (Charolaise, Jersiaise)

**Validation de l'injection :**
```sql
SELECT COUNT(*) FROM races;        -- 5 [OK]
SELECT COUNT(*) FROM animaux;      -- 15 [OK]
SELECT COUNT(*) FROM pesees;       -- 15 [OK]
SELECT COUNT(*) FROM sante;        -- 10 [OK]
SELECT COUNT(*) FROM alimentation; -- 5 [OK]
```

# 7. Prochaines étapes --- Semaine 2
1. Fusion de toutes les branches dev-* vers develop (étape 17) et revue de code finale (étape 18).
2. Développement du backend FastAPI : routes, connexion MySQL, gestion des sessions LLM.
3. Intégration LLM : prompt engineering, mode consultation Text-to-SQL avec fn_age_en_mois() et fn_gmq().
4. Implémentation du mode ACTION : détection d'intention, confirmation utilisateur, appel des procédures stockées.
5. Développement du frontend : tableau de bord, interface de chat, vue alertes, suivi gestations.

# 8. Conclusion
Le projet BoviBot a franchi avec succès la première semaine de développement. Tous les livrables de la phase de modélisation et d'implémentation PL/SQL ont été réalisés et validés.

Points clés atteints :
- Un schéma de base de données normalisé en 3NF avec 9 tables et des contraintes d'intégrité robustes.
- Deux fonctions métier (âge et GMQ) pour le calcul à la volée.
- Deux procédures stockées transactionnelles pour les opérations critiques (pesée et vente).
- Trois triggers pour l'automatisation des alertes et de la traçabilité.
- Deux events MySQL pour les notifications quotidiennes et hebdomadaires.
- Un jeu de données de test de 50 lignes couvrant les cas limites.

Architecture validée :
L'architecture trois tiers (Frontend/Backend/Base de données) avec couche LLM a été définie. Les mécanismes d'automatisation (triggers/events) sont opérationnels et garantissent la fiabilité du système.

Perspectives :
La semaine 2 sera consacrée à l'intégration du backend FastAPI et du LLM, transformant BoviBot d'un système transactionnel rigoureux en un assistant conversationnel complet, accessible à tout éleveur sénégalais sans compétences techniques particulières.
