-- seed_data.sql : Données réalistes et denses pour BoviBot
-- Préparé pour les tests LLM et Dashboard

USE bovibot;

-- ===== RACES (10) =====
INSERT IGNORE INTO races (id, nom, origine, poids_adulte_moyen_kg, production_lait_litre_jour) VALUES
(1, 'Zébu Gobra', 'Sénégal', 380, 3.5),
(2, 'Ndama', 'Guinée', 280, 2.0),
(3, 'Jersiaise', 'Jersey', 400, 20.0),
(4, 'Charolaise', 'France', 750, 5.0),
(5, 'Métis local', 'Sénégal', 320, 4.0),
(6, 'Holstein', 'Europe', 650, 25.0),
(7, 'Brahman', 'USA/Inde', 600, 4.0),
(8, 'Guzerat', 'Brésil', 550, 5.0),
(9, 'Simmental', 'Suisse', 700, 15.0),
(10, 'Montbéliarde', 'France', 680, 20.0);

-- ===== ANIMAUX (25) =====
INSERT IGNORE INTO animaux (id, numero_tag, race_id, sexe, nom, date_naissance, statut) VALUES
(1, 'TAG-001', 1, 'M', 'Baaba', '2023-01-15', 'actif'),
(2, 'TAG-002', 1, 'F', 'Yaye', '2022-06-10', 'actif'),
(3, 'TAG-003', 2, 'M', 'Samba', '2021-03-22', 'vendu'),
(4, 'TAG-004', 1, 'F', 'Fatou', '2023-08-05', 'actif'),
(5, 'TAG-005', 3, 'F', 'Bella', '2020-11-30', 'actif'),
(6, 'TAG-006', 2, 'M', 'Demba', '2022-04-18', 'actif'),
(7, 'TAG-007', 4, 'F', 'Grosse', '2021-07-25', 'actif'),
(8, 'TAG-008', 1, 'M', 'Bouba', '2023-03-10', 'actif'),
(9, 'TAG-009', 5, 'F', 'Penda', '2022-09-14', 'actif'),
(10, 'TAG-010', 3, 'M', 'Moro', '2020-12-01', 'mort'),
(11, 'TAG-011', 1, 'F', 'Coumba', '2023-05-20', 'actif'),
(12, 'TAG-012', 2, 'M', 'Omar', '2022-02-28', 'actif'),
(13, 'TAG-013', 4, 'F', 'Daisy', '2021-10-15', 'actif'),
(14, 'TAG-014', 5, 'M', 'Ibou', '2023-07-08', 'actif'),
(15, 'TAG-015', 1, 'F', 'Veau1', '2024-01-12', 'actif'),
(16, 'TAG-016', 6, 'F', 'Blanche', '2022-01-01', 'actif'),
(17, 'TAG-017', 6, 'F', 'Noire', '2022-02-15', 'actif'),
(18, 'TAG-018', 7, 'M', 'Texas', '2021-11-20', 'actif'),
(19, 'TAG-019', 8, 'F', 'Rosa', '2022-05-05', 'actif'),
(20, 'TAG-020', 9, 'M', 'Bernie', '2021-08-30', 'actif'),
(21, 'TAG-021', 10, 'F', 'Monty', '2022-03-12', 'actif'),
(22, 'TAG-022', 1, 'F', 'Astou', '2023-09-22', 'actif'),
(23, 'TAG-023', 2, 'M', 'Lamine', '2022-12-05', 'actif'),
(24, 'TAG-024', 4, 'F', 'Chacha', '2021-04-18', 'vendu'),
(25, 'TAG-025', 5, 'F', 'Sira', '2023-02-28', 'actif');

-- ===== PESEES (25) =====
INSERT IGNORE INTO pesees (animal_id, poids_kg, date_pesee, agent) VALUES
(1, 320.0, '2026-01-10', 'Barro'), (1, 335.5, '2026-02-10', 'Barro'),
(2, 275.0, '2026-01-15', 'Barro'), (2, 280.5, '2026-02-15', 'Barro'),
(4, 260.0, '2026-01-20', 'Barro'), (5, 390.0, '2026-01-25', 'Barro'),
(6, 265.0, '2026-02-01', 'Barro'), (7, 710.0, '2026-02-05', 'Barro'),
(8, 290.0, '2026-02-08', 'Barro'), (9, 305.0, '2026-02-12', 'Barro'),
(11, 255.0, '2026-02-20', 'Barro'), (12, 270.0, '2026-02-25', 'Barro'),
(13, 680.0, '2026-03-01', 'Barro'), (14, 310.0, '2026-03-05', 'Barro'),
(15, 45.0,  '2026-03-10', 'Barro'), (16, 620.0, '2026-01-05', 'Sow'),
(17, 615.0, '2026-01-10', 'Sow'), (18, 580.0, '2026-01-15', 'Sow'),
(19, 540.0, '2026-01-20', 'Sow'), (20, 690.0, '2026-01-25', 'Sow'),
(21, 660.0, '2026-02-01', 'Sow'), (22, 240.0, '2026-02-05', 'Sow'),
(23, 210.0, '2026-02-10', 'Sow'), (25, 295.0, '2026-02-15', 'Sow'),
(1, 345.0, '2026-03-10', 'Barro');

-- ===== SANTE (15) =====
INSERT IGNORE INTO sante (animal_id, type, date_acte, veterinaire, prochain_rdv, description) VALUES
(1, 'Vaccination', '2026-01-05', 'Dr Diop', '2026-07-05', 'Vaccin FMDV'),
(2, 'Traitement', '2026-01-10', 'Dr Faye', '2026-07-10', 'Ivermectine'),
(4, 'Vaccination', '2026-01-15', 'Dr Diop', '2026-07-15', 'Vaccin CBPP'),
(5, 'Examen', '2026-02-01', 'Dr Faye', '2026-08-01', 'Contrôle gestation'),
(6, 'Traitement', '2026-02-05', 'Dr Diop', '2026-08-05', 'Traitement plaie'),
(7, 'Vaccination', '2026-02-10', 'Dr Faye', '2026-08-10', 'Rappel annuel'),
(8, 'Examen', '2026-02-15', 'Dr Diop', '2026-08-15', 'Bilan général'),
(9, 'Vaccination', '2026-02-20', 'Dr Faye', '2026-08-20', 'Vaccin FMD'),
(11, 'Traitement', '2026-03-01', 'Dr Diop', '2026-09-01', 'Déparasitage'),
(13, 'Examen', '2026-03-05', 'Dr Faye', '2026-09-05', 'Contrôle état'),
(16, 'Vaccination', '2026-01-20', 'Dr Diop', '2026-07-20', 'Charbon symptomatique'),
(17, 'Vaccination', '2026-01-25', 'Dr Diop', '2026-07-25', 'Charbon symptomatique'),
(19, 'Traitement', '2026-02-12', 'Dr Faye', '2026-03-12', 'Traitement mammite'),
(21, 'Vaccination', '2026-02-18', 'Dr Diop', '2026-08-18', 'Brucellose'),
(25, 'Examen', '2026-03-02', 'Dr Faye', '2026-09-02', 'Bilan croissance');

-- ===== REPRODUCTION (10) =====
INSERT IGNORE INTO reproduction (mere_id, pere_id, date_saillie, date_velage_prevue, statut) VALUES
(2, 1, '2025-08-10', '2026-05-15', 'en_gestation'),
(4, 1, '2025-09-05', '2026-06-10', 'en_gestation'),
(5, 8, '2025-07-20', '2026-04-25', 'en_gestation'),
(7, 12, '2025-10-15', '2026-07-20', 'en_gestation'),
(9, 1, '2025-11-01', '2026-08-05', 'en_gestation'),
(11, 8, '2025-12-10', '2026-09-15', 'en_gestation'),
(13, 12, '2025-08-25', '2026-05-30', 'en_gestation'),
(16, 18, '2025-09-20', '2026-06-25', 'en_gestation'),
(17, 18, '2025-10-05', '2026-07-10', 'en_gestation'),
(19, 20, '2025-11-15', '2026-08-20', 'en_gestation');

-- ===== ALIMENTATION (10) =====
INSERT IGNORE INTO alimentation (animal_id, type_aliment, quantite_kg, cout_unitaire_kg) VALUES
(1, 'Foin', 8.5, 150), (2, 'Concentré', 3.0, 400),
(4, 'Foin', 7.0, 150), (7, 'Concentré', 5.0, 400),
(9, 'Pâturage', 12.0, 50), (16, 'Ensilage', 15.0, 200),
(17, 'Ensilage', 14.5, 200), (18, 'Pâturage', 10.0, 50),
(21, 'Concentré', 4.5, 400), (25, 'Foin', 6.0, 150);

-- ===== VENTES (10) =====
INSERT IGNORE INTO ventes (animal_id, acheteur, telephone_acheteur, prix_fcfa, date_vente, poids_vente_kg) VALUES
(3, 'Moussa Ndiaye', '776543210', 450000, '2026-03-01', 310.5),
(24, 'Alioune Sow', '701234567', 850000, '2026-03-15', 650.0),
(10, 'Boucher Dakar', '338221100', 150000, '2026-02-10', 280.0), -- Cas mort/vendu pour carcasse
(18, 'Elevage Moderne', '765554433', 900000, '2026-04-01', 590.0),
(20, 'Ferme Nord', '771112233', 950000, '2026-04-02', 700.0),
(12, 'M. Touré', '789990011', 400000, '2026-01-15', 265.0),
(6, 'Boucher Rufisque', '704445566', 380000, '2026-02-20', 270.0),
(8, 'Elevage Sine', '772223344', 420000, '2026-03-25', 300.0),
(14, 'M. Fall', '761119988', 410000, '2026-03-28', 315.0),
(23, 'Ferme Est', '770008877', 350000, '2026-04-03', 220.0);

-- ===== ALERTES (10) =====
INSERT IGNORE INTO alertes (animal_id, type, message, niveau, date_creation) VALUES
(1, 'poids', 'Gain de poids ralenti pour Baaba (TAG-001).', 'warning', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(2, 'vaccination', 'Rappel Fièvre Aphteuse en retard pour Yaye (TAG-002).', 'critical', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(5, 'velage', 'Vêlage imminent pour Bella (TAG-005) - 20 jours restants.', 'info', DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(15, 'poids', 'Poids critique pour veau : 45kg à 2 mois.', 'critical', DATE_SUB(NOW(), INTERVAL 5 HOUR)),
(NULL, 'autre', 'Rapport hebdomadaire : 22 animaux actifs recensés.', 'info', DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
(19, 'sante', 'Suspicion de mammite sur Rosa (TAG-019).', 'warning', DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(21, 'vaccination', 'Vaccin Brucellose à prévoir pour Monty (TAG-021).', 'info', DATE_SUB(NOW(), INTERVAL 12 HOUR)),
(22, 'poids', 'Pesée manquante depuis 35 jours pour Astou (TAG-022).', 'warning', DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(25, 'alimentation', 'Consommation de foin supérieure à la moyenne pour Sira.', 'info', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(13, 'velage', 'Daisy (TAG-013) : Prévoir mise bas fin mai.', 'info', DATE_SUB(NOW(), INTERVAL 2 DAY));

-- ===== HISTORIQUE STATUT (10) =====
INSERT IGNORE INTO historique_statut (animal_id, ancien_statut, nouveau_statut, date_changement) VALUES
(3, 'actif', 'vendu', '2026-03-01'),
(24, 'actif', 'vendu', '2026-03-15'),
(10, 'actif', 'mort', '2026-02-10'),
(18, 'actif', 'vendu', '2026-04-01'),
(20, 'actif', 'vendu', '2026-04-02'),
(12, 'actif', 'vendu', '2026-01-15'),
(6, 'actif', 'vendu', '2026-02-20'),
(8, 'actif', 'vendu', '2026-03-25'),
(14, 'actif', 'vendu', '2026-03-28'),
(23, 'actif', 'vendu', '2026-04-03');
