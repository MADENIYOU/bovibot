# Documentation Prompt Engineering — BoviBot

Cette documentation détaille la conception, l'implémentation et la validation du système de pilotage par langage naturel de l'élevage BoviBot.

## 1. Architecture du Prompt Système

Le `SYSTEM_PROMPT` (défini dans `app.py`) agit comme un compilateur de langage naturel vers SQL/PL-SQL. Il est structuré en 4 piliers :

*   **Formatage Strict :** Exclusion du Markdown, réponse en JSON pur pour garantir l'interopérabilité avec le backend FastAPI.
*   **Intégrité des Données :** Filtrage systématique des animaux `actifs` et interdiction des commandes destructives (`DELETE`, `DROP`).
*   **Abstraction PL/SQL :** Utilisation obligatoire des fonctions métiers (`fn_age_en_mois`, `fn_gmq`, `fn_cout_total_elevage`) pour centraliser la logique de calcul dans la base de données.
*   **Sécurité des Actions :** Gestion de l'ambiguïté pour éviter les écritures erronées (vérification des IDs avant appel de procédure).

---

## 2. Analyse Détaillée des Cas de Test (CDC)

### Cas 1 : Consultation Globale
**Question :** *"Liste tous les animaux actifs avec leur âge et GMQ"*
*   **Type :** `query`
*   **Analyse :** L'IA identifie correctement le besoin de jointure entre `animaux` et `races`. Elle applique la règle du Bloc 2 en utilisant les fonctions PL/SQL au lieu de calculer l'âge ou le GMQ en Python/SQL brut.
*   **JSON produit :**
```json
{
  "type": "query",
  "sql": "SELECT a.numero_tag, a.nom, r.nom AS race, fn_age_en_mois(a.id) AS age_mois, a.poids_actuel, fn_gmq(a.id) AS gmq_kg_jour FROM animaux a LEFT JOIN races r ON a.race_id = r.id WHERE a.statut = 'actif' LIMIT 100",
  "explication": "Liste complète du troupeau actif avec les indicateurs de croissance."
}
```

### Cas 2 : Filtrage Analytique
**Question :** *"Quels animaux ont un GMQ inférieur à 0.3 kg/jour ?"*
*   **Type :** `query`
*   **Analyse :** Démontre la capacité de l'IA à utiliser une fonction PL/SQL (`fn_gmq`) dans une clause `WHERE`. C'est une validation critique de l'interopérabilité SQL/LLM.
*   **JSON produit :**
```json
{
  "type": "query",
  "sql": "SELECT numero_tag, nom, fn_gmq(id) AS gmq FROM animaux WHERE statut = 'actif' AND fn_gmq(id) < 0.3",
  "explication": "Identification des animaux présentant une croissance insuffisante."
}
```

### Cas 3 : Suivi de Reproduction
**Question :** *"Quelles femelles vêlent dans les 30 prochains jours ?"*
*   **Type :** `query`
*   **Analyse :** L'IA effectue une jointure complexe avec la table `reproduction`, filtre par le statut `en_gestation` et calcule l'intervalle de date avec `CURDATE()` et `DATE_ADD`.
*   **JSON produit :**
```json
{
  "type": "query",
  "sql": "SELECT a.numero_tag, r.date_velage_prevue FROM reproduction r JOIN animaux a ON r.mere_id = a.id WHERE r.statut = 'en_gestation' AND r.date_velage_prevue BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)",
  "explication": "Liste des mises-bas prévues pour le mois prochain."
}
```

### Cas 4 : Action avec Paramètres (Pesée)
**Question :** *"Enregistre une pesée de 325 kg pour TAG-001 aujourd'hui"*
*   **Type :** `action_pending`
*   **Analyse :** **Validation du Bloc 4 (Sécurité).** L'IA reconnaît l'intention d'action mais identifie que `TAG-001` est une chaîne de caractères et non l' `animal_id` requis par la procédure `sp_enregistrer_pesee`. Elle met l'action en attente de confirmation.
*   **JSON produit :**
```json
{
  "type": "action_pending",
  "action": "sp_enregistrer_pesee",
  "params": {"animal_id": null, "poids_kg": 325, "date": "2026-04-01", "agent": "BoviBot"},
  "confirmation": "Confirmez-vous l'enregistrement d'un poids de 325kg pour l'animal TAG-001 ?"
}
```

### Cas 5 : Action Complexe (Vente)
**Question :** *"Déclare la vente de TAG-003 à Oumar Ba pour 280 000 FCFA"*
*   **Type :** `info`
*   **Analyse :** L'IA détecte qu'il manque une information cruciale pour la procédure `sp_declarer_vente` (le poids de vente). Au lieu d'inventer une donnée ou de générer une erreur SQL, elle bascule en mode `info` pour interroger l'utilisateur.
*   **Réponse de l'IA :** *"Je vais déclarer la vente, mais pouvez-vous me préciser le poids de l'animal au moment de la vente ?"*

---

## 3. Synthèse des Cas Limites Identifiés

1.  **Résolution des TAGs :** Le passage de `numero_tag` à `id` est la principale source de friction pour les actions directes. 
    *   *Solution :* Le backend doit résoudre le TAG en ID avant l'appel final de la procédure si l'IA ne l'a pas fait.
2.  **Format des Dates :** Bien que le prompt demande `YYYY-MM-DD`, l'IA utilise parfois `CURDATE()`. Le backend gère les deux cas.
3.  **Encodage :** L'affichage des caractères accentués (ex: Zébu) nécessite une attention particulière sur la chaîne de connexion MySQL (Charset UTF8MB4).
