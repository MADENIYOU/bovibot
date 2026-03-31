# Audit d'intégrité SQL — BoviBot

## Objectif

Vérifier la cohérence et la robustesse du fichier `schema.sql` en analysant :

1. La précision des types `DECIMAL` pour les champs de poids et de prix
2. La pertinence des `ENUM` pour les statuts des animaux et les catégories
3. Les contraintes d'intégrité (`NULL`, `NOT NULL`, `UNIQUE`)
4. Les incohérences ou risques identifiés




## 1. Audit des types DECIMAL — Poids et Prix

### 1.1 Champs de poids (`DECIMAL(6,2)`)

| Table | Champ | Type actuel | Analyse | Verdict |
|---|---|---|---|---|
| `races` | `poids_adulte_moyen_kg` | `DECIMAL(6,2)` | Max = 9999.99 kg. Un bovin Holstein pèse ~700 kg | ✅ Correct |
| `animaux` | `poids_actuel` | `DECIMAL(6,2)` | Veau naît à ~30 kg, vache adulte ≤ 700 kg | ✅ Correct |
| `pesees` | `poids_kg` | `DECIMAL(6,2)` | Cohérent avec `poids_actuel` | ✅ Correct |
| `ventes` | `poids_vente_kg` | `DECIMAL(6,2)` | Cohérent avec les autres champs de poids | ✅ Correct |
| `alimentation` | `quantite_kg` | `DECIMAL(6,2)` | Ration dépasse rarement 50 kg | ✅ Correct |
| `alimentation` | `cout_unitaire_kg` | `DECIMAL(6,2)` | Foin ~150-500 FCFA/kg | ✅ Correct |

**Conclusion poids :** Le type `DECIMAL(6,2)` est adapté pour tous les champs de poids et quantités. Il offre une précision au gramme près (0.01 kg) et couvre les extrêmes biologiques réalistes pour les bovins.

### 1.2 Champs de prix (DECIMAL financiers)

| Table | Champ | Type actuel | Analyse | Verdict |
|---|---|---|---|---|
| `sante` | `cout` | `DECIMAL(10,2)` | Max = 99 999 999.99 FCFA. Chirurgie véto < 500 000 FCFA | ✅ Correct, large marge |
| `ventes` | `prix_fcfa` | `DECIMAL(12,2)` | Max = 9 999 999 999.99 FCFA. Couvre un troupeau entier | ✅ Correct |
| `races` | `production_lait_litre_jour` | `DECIMAL(6,2)` | Quantité. Holstein produit ~25-40 L/jour | ✅ Correct |

> ⚠️ **Point de vigilance — `alimentation.cout_unitaire_kg`** : Type actuel `DECIMAL(6,2)` → max 9999.99 FCFA/kg. Un aliment concentré premium peut atteindre 800-1000 FCFA/kg. **Verdict : ✅ Suffisant pour le contexte**, mais à surveiller si des aliments importés sont ajoutés.

---

## 2. Audit des ENUM — Pertinence métier

### 2.1 `animaux.statut` — `ENUM('actif','vendu','mort','quarantaine')`

| Valeur | Justification métier | Couverture |
|---|---|---|
| `actif` | Animal présent dans le troupeau, géré normalement | ✅ Cas standard |
| `vendu` | Sorti du troupeau après transaction commerciale | ✅ Déclenché par `sp_declarer_vente` |
| `mort` | Animal décédé, reste en base pour historique épidémiologique | ✅ Important pour traçabilité |
| `quarantaine` | Animal isolé pour raison sanitaire (FMDV, péripneumonie) | ✅ Pertinent |

✅ **Verdict : ENUM complet et pertinent.**  
⚠️ **Recommandation :** Envisager l'ajout de `'transfert'` pour les animaux prêtés à d'autres élevages (pratique courante en zone rurale). Non bloquant.

---

### 2.2 `sante.type` — `ENUM('vaccination','traitement','examen','chirurgie')`

| Valeur | Justification métier | Couverture |
|---|---|---|
| `vaccination` | Acte préventif majeur (FMDV, CBPP, FVR) | ✅ Déclenche trigger alerte rappel |
| `traitement` | Antiparasitaires, antibiotiques, anti-inflammatoires | ✅ Cas courant |
| `examen` | Consultation, prise de sang, contrôle laitier | ✅ Suivi sanitaire de routine |
| `chirurgie` | Castration, césarienne, opération traumatique | ✅ Cas exceptionnel nécessaire |

✅ **Verdict : ENUM couvrant les cas métier essentiels.**

---

### 2.3 `reproduction.statut` — `ENUM('en_gestation','vele','avortement','echec')`

| Valeur | Justification métier | Couverture |
|---|---|---|
| `en_gestation` | Gestation confirmée en cours | ✅ État initial normal |
| `vele` | Vêlage réussi (un ou plusieurs veaux nés vivants) | ✅ Issue positive |
| `avortement` | Perte du fœtus avant terme (cause pathologique ou accidentelle) | ✅ Suivi épidémiologique |
| `echec` | Saillie non fécondante ou détectée tardivement | ✅ Distinction utile avec avortement |

✅ **Verdict : ENUM pertinent et complet pour la gestion reproductrice.**

---

### 2.4 `alertes.type` — `ENUM('poids','vaccination','velage','sante','alimentation','autre')`

| Valeur | Source de déclenchement | Couverture |
|---|---|---|
| `poids` | Trigger `trg_alerte_poids_faible`, procédure `sp_enregistrer_pesee` | ✅ |
| `vaccination` | Trigger `trg_alerte_vaccination` | ✅ |
| `velage` | Event `evt_alerte_velages` | ✅ |
| `sante` | Réservé aux alertes manuelles ou futures | ✅ |
| `alimentation` | Prévu pour alertes sur stocks ou rationnement | ✅ |
| `autre` | Event `evt_rapport_croissance`, alertes globales | ✅ |

✅ **Verdict : ENUM cohérent avec les triggers et events définis.**

---

### 2.5 `alertes.niveau` — `ENUM('info','warning','critical')`

| Valeur | Usage | Cohérence |
|---|---|---|
| `info` | Rapports hebdo, vêlages prévus à 7 jours | ✅ Bon usage |
| `warning` | GMQ faible (< 300 g/jour) | ✅ Bon usage |
| `critical` | Rappel vaccination dépassé, poids veau critique | ✅ Bon usage |

✅ **Verdict : Échelle de sévérité logique et bien appliquée dans le code.**

---

## 3. Audit des contraintes d'intégrité

### 3.1 Contraintes NOT NULL manquantes ou discutables

| Table | Champ | Statut actuel | Recommandation |
|---|---|---|---|
| `animaux` | `race_id` | NULL autorisé | ✅ Acceptable : race parfois inconnue à l'arrivée |
| `animaux` | `nom` | NULL autorisé | ✅ Acceptable : certains animaux sans nom |
| `animaux` | `poids_actuel` | NULL autorisé | ✅ Acceptable : pas pesé à la création |
| `pesees` | `notes` | NULL autorisé | ✅ Correct |
| `sante` | `prochain_rdv` | NULL autorisé | ✅ Correct : pas toujours de rappel prévu |
| `reproduction` | `date_velage_prevue` | NULL autorisé | ✅ Correct : peut être calculé après |
| `ventes` | `poids_vente_kg` | NULL autorisé | ⚠️ Recommander `NOT NULL` pour calcul prix/kg |

### 3.2 Contrainte UNIQUE

| Table | Champ | Contrainte actuelle | Verdict |
|---|---|---|---|
| `animaux` | `numero_tag` | UNIQUE ✅ | Correct : deux animaux ne peuvent pas avoir le même tag |

> ⚠️ **Contrainte UNIQUE absente (non bloquant) :**
> - `pesees` — deux pesées le même jour pour le même animal restent possibles (acceptable).
> - `reproduction` — une femelle pourrait avoir deux gestations actives si les dates ne se chevauchent pas.

### 3.3 Relation réflexive `animaux` (`mere_id` / `pere_id`)

**Problème identifié :** Il n'y a pas de contrainte empêchant un animal d'être son propre père ou sa propre mère (`mere_id = id` ou `pere_id = id`). Cela reste biologiquement impossible mais techniquement faisable en base.

**Recommandation :** Ajouter une contrainte `CHECK` (disponible en MySQL 8.0.16+) :

```sql
CONSTRAINT chk_not_self_parent
  CHECK (mere_id != id AND pere_id != id)
```

---

## 4. Risques identifiés et recommandations

| # | Risque | Niveau | Recommandation |
|---|---|---|---|
| R1 | Un animal `'mort'` pourrait être inséré en `'reproduction'` | Moyen | Ajouter validation dans sp ou trigger `CHECK` |
| R2 | Absence de transactions ACID dans les procédures (Étape 9 — Kane) | **Élevé** | Injecter `START TRANSACTION / COMMIT / ROLLBACK` |
| R3 | `mere_id` / `pere_id` acceptent le même `id` que l'animal | Faible | Contrainte `CHECK` (voir §3.3) |
| R4 | `ventes.poids_vente_kg` nullable peut fausser les calculs prix/kg | Faible | Ajouter `NOT NULL` ou valeur par défaut |
| R5 | `alertes.animal_id` NULL sans distinction claire de type global | Faible | Acceptable, documenté dans le dictionnaire |

---

## 5. Bilan général

| Critère | Résultat |
|---|---|
| Types DECIMAL (poids) | ✅ Tous adaptés au contexte métier |
| Types DECIMAL (prix) | ✅ Précision et plage suffisantes |
| ENUM statuts animaux | ✅ Complet, pertinent pour l'élevage |
| ENUM types actes santé | ✅ Couvre les cas courants |
| ENUM reproduction | ✅ Logique et complet |
| ENUM alertes | ✅ Cohérent avec les triggers et events |
| Contraintes NOT NULL | ✅ Bien appliquées sur les champs essentiels |
| Contraintes UNIQUE | ✅ `numero_tag` protégé |
| Risques bloquants | ❌ Absence de transactions ACID (priorité Kane, Étape 9) |
| Risques mineurs | ⚠️ 4 points à surveiller (non bloquants) |

**Conclusion :** Le schéma SQL est globalement cohérent et adapté au domaine métier de l'élevage bovin. Les types de données sont correctement dimensionnés. Le principal risque à adresser concerne l'atomicité des transactions dans les procédures stockées (responsabilité Kane). Les 4 risques mineurs identifiés peuvent faire l'objet d'améliorations itératives sans bloquer le projet.