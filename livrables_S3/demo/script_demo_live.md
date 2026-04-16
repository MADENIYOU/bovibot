# Script Démo Live — BoviBot — Soutenance

## Durée cible : 8 à 10 minutes
**Régisseur technique** : Barro  
**Date** : Jour de soutenance  
**URL** : http://http://212.90.121.51:8080/ ou http://localhost/ (plan de secours)

---

## Pré-requis vérifiés avant d'entrer en salle

- [ ] VPS accessible : `curl http://http://212.90.121.51:8080/api/health` → `{"status":"ok"}`
- [ ] Données fraîches chargées (seed_data.sql réinjecté si nécessaire)
- [ ] Navigateur ouvert en plein écran sur `http://http://212.90.121.51:8080/`
- [ ] Connexion internet de secours prête (partage de connexion mobile)
- [ ] Docker Desktop lancé sur le PC (pour plan de secours local)

---

## Séquence démo

### Étape 1 — Dashboard (1 min)

**Actions à montrer :**
- Les 4 KPIs chargés depuis l'API : animaux actifs, gestations, alertes, CA
- Cliquer sur "Traiter" sur une alerte warning → disparition avec feedback visuel
- Montrer la section gestations avec le J-countdown coloré

**Ce que tu dis :**
> "Voici le tableau de bord en temps réel. Toutes les données viennent
> de notre API FastAPI connectée à MySQL. On voit les animaux actifs,
> les gestations en cours et les alertes générées automatiquement
> par nos triggers."

---

### Étape 2 — Consultation LLM (2 min)

**Actions à montrer :**

1. Saisir dans le chat :
```
Quels animaux ont un GMQ inférieur à 0.3 kg/jour ?
```
- Montrer le SQL généré dans le Data Playground
- Montrer le tableau de résultats

2. Saisir ensuite :
```
Quelles femelles vêlent dans les 30 prochains jours ?
```
- Montrer les résultats filtrés

**Ce que tu dis :**
> "Notre LLM convertit les questions en langage naturel en SQL précis.
> Il utilise nos fonctions fn_gmq() et fn_age_en_mois() pour répondre
> à des questions métier complexes."

---

### Étape 3 — Action Pesée avec confirmation (2 min)

**Actions à montrer :**

1. Saisir dans le chat :
```
Enregistre une pesée de 325 kg pour TAG-008 aujourd'hui
```
- Montrer la bulle jaune de confirmation
- Cliquer "Confirmer"
- Montrer le message vert de succès

2. (Optionnel) Aller sur la page Troupeau → voir le poids de TAG-008 mis à jour

**Ce que tu dis :**
> "En mode ACTION, le LLM identifie la procédure stockée à appeler,
> demande confirmation obligatoire, puis exécute sp_enregistrer_pesee().
> Aucune action irréversible sans validation de l'utilisateur."

---

### Étape 4 — Action Vente avec confirmation (2 min)

**Actions à montrer :**

1. Saisir dans le chat :
```
Déclare la vente de TAG-003 à Oumar Ba pour 280 000 FCFA
```
- Montrer la confirmation
- Valider l'exécution
- Aller sur la page Troupeau → TAG-003 n'est plus dans la liste des actifs

**Ce que tu dis :**
> "Même principe pour les ventes. sp_declarer_vente() change le statut
> de l'animal, enregistre la transaction et met à jour les statistiques
> du dashboard automatiquement."

---

### Étape 5 — Généalogie et Bonus (1 min)

**Actions à montrer :**

1. Ouvrir `genealogie.html`
2. Sélectionner un animal avec parents connus
3. Montrer l'arbre sur 4 niveaux
4. Montrer le simulateur de croisement
5. (Si temps) Montrer l'export PDF d'une fiche individuelle depuis Troupeau

**Ce que tu dis :**
> "En bonus, nous avons implémenté un arbre généalogique interactif
> sur 4 niveaux et un simulateur de croisement. L'export PDF
> est également disponible pour chaque animal."

---

## Plan de secours

Si le VPS est inaccessible :
```bash
docker compose up -d
# Ouvrir http://localhost/
# Tout fonctionne identiquement en local
```

---

## Timing récapitulatif

| Étape | Contenu | Durée |
|-------|---------|-------|
| 1 | Dashboard + KPIs + alertes | 1 min |
| 2 | Consultation LLM (GMQ + vêlages) | 2 min |
| 3 | Action pesée avec confirmation | 2 min |
| 4 | Action vente avec confirmation | 2 min |
| 5 | Généalogie + bonus | 1 min |
| **Total** | | **8 min** |