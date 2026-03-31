# Rapport de tests — Triggers & Events BoviBot

## trg_alerte_poids_faible
- **Test** : INSERT pesée poids = 45 kg
- **Résultat** : Alerte créée automatiquement ✅
- **Message** : "Poids critique pour un veau de 4 mois : 45.00 kg"
- **Niveau** : critical

## trg_alerte_vaccination
- **Test** : INSERT sante avec prochain_rdv dépassé d'1 jour
- **Résultat** : Alerte créée automatiquement ✅

## trg_historique_statut
- **Test** : UPDATE statut TAG-TEST → vendu
- **Résultat** : Changement loggé automatiquement ✅

## Event Scheduler
- **SET GLOBAL event_scheduler = ON** ✅
- **evt_alerte_velages** : exécution forcée ✅
- **evt_rapport_croissance** : actif ✅
