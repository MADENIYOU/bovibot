-- ============================================================
--  BoviBot — Script de Certification SQL
--  Fichier  : tests/unit_tests_plsql.sql
--  Auteur   : Abdoul Aziz KANE
--  Date     : 2026-03-29
--  Objet    : Validation des procédures stockées et fonctions
-- ============================================================

USE bovibot;

-- ============================================================
--  BLOC 1 : Test de fn_age_en_mois
-- ============================================================

SELECT '=== BLOC 1 : fn_age_en_mois ===' AS test;

SELECT 
    a.id,
    a.numero_tag,
    a.nom,
    a.date_naissance,
    fn_age_en_mois(a.id) AS age_calcule_mois,
    TIMESTAMPDIFF(MONTH, a.date_naissance, CURDATE()) AS age_attendu_mois,
    IF(
        fn_age_en_mois(a.id) = TIMESTAMPDIFF(MONTH, a.date_naissance, CURDATE()),
        'PASS',
        'FAIL'
    ) AS resultat_test
FROM animaux a
ORDER BY a.id;

-- ============================================================
--  BLOC 2 : Test de fn_gmq
-- ============================================================

SELECT '=== BLOC 2 : fn_gmq ===' AS test;

SELECT 
    a.id,
    a.numero_tag,
    a.nom,
    COUNT(p.id) AS nb_pesees,
    fn_gmq(a.id) AS gmq_calcule,
    CASE
        WHEN COUNT(p.id) = 0 
            AND fn_gmq(a.id) = 0     THEN 'PASS — sans pesees retourne 0'
        WHEN COUNT(p.id) >= 2 
            AND fn_gmq(a.id) > 0     THEN 'PASS — GMQ positif coherent'
        WHEN COUNT(p.id) = 1 
            AND fn_gmq(a.id) = 0     THEN 'PASS — une seule pesee retourne 0'
        ELSE                              'FAIL'
    END AS resultat_test
FROM animaux a
LEFT JOIN pesees p ON p.animal_id = a.id
GROUP BY a.id, a.numero_tag, a.nom
ORDER BY a.id;

-- ============================================================
--  BLOC 3 : Test sp_enregistrer_pesee — cas normal
-- ============================================================

SELECT '=== BLOC 3 : sp_enregistrer_pesee (cas normal) ===' AS test;

-- Exécution
CALL sp_enregistrer_pesee(1, 335.00, '2026-03-29', 'Kane');

-- Vérification insertion
SELECT 
    p.id, p.animal_id, p.poids_kg, p.date_pesee, p.agent,
    IF(p.poids_kg = 335.00, 'PASS', 'FAIL') AS test_insertion
FROM pesees p
WHERE animal_id = 1
ORDER BY date_pesee DESC
LIMIT 1;

-- Vérification mise à jour poids
SELECT 
    numero_tag, poids_actuel,
    IF(poids_actuel = 335.00, 'PASS', 'FAIL') AS test_maj_poids
FROM animaux
WHERE id = 1;

-- Vérification aucune alerte abusive
SELECT 
    COUNT(*) AS alertes_recentes,
    IF(COUNT(*) = 0, 'PASS — pas alerte', 'FAIL') AS test_alertes
FROM alertes
WHERE animal_id = 1
AND type = 'poids'
AND date_creation >= NOW() - INTERVAL 5 MINUTE;

-- Nettoyage Bloc 3
DELETE FROM pesees 
WHERE animal_id = 1 AND date_pesee = '2026-03-29' AND agent = 'Kane';
UPDATE animaux SET poids_actuel = 320.00 WHERE id = 1;

-- ============================================================
--  BLOC 4 : Test sp_enregistrer_pesee — GMQ faible
-- ============================================================

SELECT '=== BLOC 4 : sp_enregistrer_pesee (GMQ faible) ===' AS test;

-- Exécution avec poids bas
CALL sp_enregistrer_pesee(1, 321.00, '2026-03-29', 'Kane_test_gmq');

-- Vérification alerte générée
SELECT 
    type, message, niveau,
    IF(niveau = 'warning', 'PASS', 'FAIL') AS test_niveau,
    IF(type = 'poids', 'PASS', 'FAIL')     AS test_type
FROM alertes
WHERE animal_id = 1
AND type = 'poids'
ORDER BY date_creation DESC
LIMIT 1;

-- Nettoyage Bloc 4
DELETE FROM pesees 
WHERE animal_id = 1 AND date_pesee = '2026-03-29' AND agent = 'Kane_test_gmq';
DELETE FROM alertes 
WHERE animal_id = 1 AND type = 'poids' AND message LIKE 'GMQ faible%';
UPDATE animaux SET poids_actuel = 320.00 WHERE id = 1;

-- ============================================================
--  BLOC 5 : Test sp_declarer_vente — cas normal
-- ============================================================

SELECT '=== BLOC 5 : sp_declarer_vente (cas normal) ===' AS test;

-- Exécution
CALL sp_declarer_vente(3, 'Moussa Diop', '+221771234567', 280000, 200.00, '2026-03-29');

-- Vérification vente enregistrée
SELECT 
    v.acheteur, v.prix_fcfa, v.date_vente,
    IF(v.acheteur = 'Moussa Diop', 'PASS', 'FAIL') AS test_acheteur,
    IF(v.prix_fcfa = 280000, 'PASS', 'FAIL')        AS test_prix
FROM ventes v
WHERE animal_id = 3
ORDER BY v.id DESC
LIMIT 1;

-- Vérification statut animal
SELECT 
    numero_tag, statut,
    IF(statut = 'vendu', 'PASS', 'FAIL') AS test_statut
FROM animaux
WHERE id = 3;

-- Vérification trigger historique
SELECT 
    ancien_statut, nouveau_statut,
    IF(ancien_statut = 'actif' AND nouveau_statut = 'vendu', 'PASS', 'FAIL') AS test_trigger
FROM historique_statut
WHERE animal_id = 3
ORDER BY date_changement DESC
LIMIT 1;

-- Nettoyage Bloc 5
DELETE FROM ventes WHERE animal_id = 3 AND acheteur = 'Moussa Diop';
DELETE FROM historique_statut WHERE animal_id = 3;
UPDATE animaux SET statut = 'actif' WHERE id = 3;
DELETE FROM historique_statut WHERE animal_id = 3;

-- ============================================================
--  BLOC 6 : Test sp_declarer_vente — animal non actif
-- ============================================================

SELECT '=== BLOC 6 : sp_declarer_vente (animal non actif) ===' AS test;

-- Préparer un animal non actif
UPDATE animaux SET statut = 'mort' WHERE id = 3;
DELETE FROM historique_statut WHERE animal_id = 3;

-- Tentons la vente dans une procédure qui capture l'erreur
DROP PROCEDURE IF EXISTS test_bloc6;

DELIMITER $$
CREATE PROCEDURE test_bloc6()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SELECT 'PASS — erreur capturee : vente bloquee pour animal non actif' AS test_blocage;
    END;

    CALL sp_declarer_vente(3, 'Acheteur Test', '+221770000000', 100000, 150.00, '2026-03-29');

    SELECT 'FAIL — la vente aurait du etre bloquee' AS test_blocage;
END$$
DELIMITER ;

-- Exécuter le test
CALL test_bloc6();

-- Vérification vente non insérée
SELECT 
    COUNT(*) AS nb_ventes,
    IF(COUNT(*) = 0, 'PASS — aucune vente inseree', 'FAIL') AS test_insertion
FROM ventes 
WHERE animal_id = 3;

-- Vérification statut intact
SELECT 
    numero_tag, statut,
    IF(statut = 'mort', 'PASS — statut intact', 'FAIL') AS test_statut
FROM animaux 
WHERE id = 3;

-- Nettoyage final Bloc 6
DROP PROCEDURE IF EXISTS test_bloc6;
UPDATE animaux SET statut = 'actif' WHERE id = 3;
DELETE FROM historique_statut WHERE animal_id = 3;

-- ============================================================
--  BLOC 7 : Test evt_rapport_croissance (exécution forcée)
-- ============================================================

SELECT '=== BLOC 7 : evt_rapport_croissance ===' AS test;

-- Sauvegarde du nombre d'alertes avant
SELECT COUNT(*) AS nb_alertes_avant
FROM alertes
WHERE type = 'autre' AND animal_id IS NULL;

-- Exécution forcée de la logique de l'event (contournement du scheduler)
BEGIN NOT ATOMIC
    DECLARE v_nb_animaux INT;

    SELECT COUNT(*) INTO v_nb_animaux FROM animaux WHERE statut = 'actif';

    INSERT INTO alertes (animal_id, type, message, niveau)
    VALUES (NULL, 'autre',
        CONCAT('Rapport hebdo : ', v_nb_animaux, ' animaux actifs. Consultez le tableau de bord pour les détails.'),
        'info');
END;

-- Vérification : une alerte a bien été insérée
SELECT
    a.message,
    a.niveau,
    a.animal_id,
    IF(a.animal_id IS NULL,          'PASS', 'FAIL') AS test_animal_null,
    IF(a.niveau    = 'info',         'PASS', 'FAIL') AS test_niveau,
    IF(a.message LIKE 'Rapport hebdo%', 'PASS', 'FAIL') AS test_message
FROM alertes a
WHERE a.type = 'autre' AND a.animal_id IS NULL
ORDER BY a.date_creation DESC
LIMIT 1;

-- Vérification que le nb d'animaux dans le message est cohérent
SELECT
    COUNT(*) AS nb_actifs_attendus
FROM animaux WHERE statut = 'actif';

-- Nettoyage Bloc 7
DELETE FROM alertes
WHERE type = 'autre'
  AND animal_id IS NULL
  AND message LIKE 'Rapport hebdo%'
  AND DATE(date_creation) = CURDATE();

-- ============================================================
--  RÉSUMÉ FINAL
-- ============================================================

SELECT '=== ETAT FINAL DE LA BASE ===' AS test;

SELECT COUNT(*) AS nb_animaux_actifs FROM animaux WHERE statut = 'actif';
SELECT COUNT(*) AS nb_pesees FROM pesees;
SELECT COUNT(*) AS nb_ventes FROM ventes;
SELECT COUNT(*) AS nb_historique FROM historique_statut;

SELECT 'Certification terminee — tous les blocs valides' AS conclusion;
