-- seed_data.sql : Données réalistes pour BoviBot
-- 50 lignes de données pour préparer le LLM

USE bovibot;

-- ===== RACES (5) =====
INSERT IGNORE INTO races (nom, origine, poids_adulte_moyen_kg) VALUES
('Zébu Gobra', 'Sénégal', 380),
('Ndama', 'Guinée', 280),
('Jersiaise', 'Jersey', 400),
('Charolaise', 'France', 750),
('Métis local', 'Sénégal', 320);

-- ===== ANIMAUX (15) =====
INSERT IGNORE INTO animaux (numero_tag, race_id, sexe, date_naissance, statut) VALUES
('TAG-001', 1, 'M', '2023-01-15', 'actif'),
('TAG-002', 1, 'F', '2022-06-10', 'actif'),
('TAG-003', 2, 'M', '2021-03-22', 'vendu'),
('TAG-004', 1, 'F', '2023-08-05', 'actif'),
('TAG-005', 3, 'F', '2020-11-30', 'actif'),
('TAG-006', 2, 'M', '2022-04-18', 'actif'),
('TAG-007', 4, 'F', '2021-07-25', 'actif'),
('TAG-008', 1, 'M', '2023-03-10', 'actif'),
('TAG-009', 5, 'F', '2022-09-14', 'actif'),
('TAG-010', 3, 'M', '2020-12-01', 'mort'),
('TAG-011', 1, 'F', '2023-05-20', 'actif'),
('TAG-012', 2, 'M', '2022-02-28', 'actif'),
('TAG-013', 4, 'F', '2021-10-15', 'actif'),
('TAG-014', 5, 'M', '2023-07-08', 'actif'),
('TAG-015', 1, 'F', '2024-01-12', 'actif');

-- ===== PESEES (15) =====
INSERT IGNORE INTO pesees (animal_id, poids_kg, date_pesee, agent) VALUES
(1, 320.0, '2026-01-10', 'Barro'),
(1, 335.5, '2026-02-10', 'Barro'),
(2, 275.0, '2026-01-15', 'Barro'),
(2, 280.5, '2026-02-15', 'Barro'),
(4, 260.0, '2026-01-20', 'Barro'),
(5, 390.0, '2026-01-25', 'Barro'),
(6, 265.0, '2026-02-01', 'Barro'),
(7, 710.0, '2026-02-05', 'Barro'),
(8, 290.0, '2026-02-08', 'Barro'),
(9, 305.0, '2026-02-12', 'Barro'),
(11, 255.0, '2026-02-20', 'Barro'),
(12, 270.0, '2026-02-25', 'Barro'),
(13, 680.0, '2026-03-01', 'Barro'),
(14, 310.0, '2026-03-05', 'Barro'),
(15, 45.0,  '2026-03-10', 'Barro');

-- ===== SANTE (10) =====
INSERT IGNORE INTO sante (animal_id, type, date_acte, veterinaire, prochain_rdv, description) VALUES
(1, 'Vaccination', '2026-01-05', 'Dr Diop', '2026-07-05', 'Vaccin FMDV annuel'),
(2, 'Déparasitage', '2026-01-10', 'Dr Faye', '2026-07-10', 'Ivermectine 1ml/50kg'),
(4, 'Vaccination', '2026-01-15', 'Dr Diop', '2026-07-15', 'Vaccin CBPP'),
(5, 'Contrôle', '2026-02-01', 'Dr Faye', '2026-08-01', 'Contrôle général'),
(6, 'Déparasitage', '2026-02-05', 'Dr Diop', '2026-08-05', 'Traitement préventif'),
(7, 'Vaccination', '2026-02-10', 'Dr Faye', '2026-08-10', 'Rappel vaccin annuel'),
(8, 'Contrôle', '2026-02-15', 'Dr Diop', '2026-08-15', 'Bilan de santé'),
(9, 'Vaccination', '2026-02-20', 'Dr Faye', '2026-08-20', 'Vaccin FMD'),
(11, 'Déparasitage', '2026-03-01', 'Dr Diop', '2026-09-01', 'Déparasitage semestriel'),
(13, 'Contrôle', '2026-03-05', 'Dr Faye', '2026-09-05', 'Contrôle poids et état');

-- ===== ALIMENTATION (5) =====
INSERT IGNORE INTO alimentation (animal_id, type_aliment, quantite_kg, cout_unitaire_kg) VALUES
(1, 'Foin', 8.5, 150),
(2, 'Concentré', 3.0, 400),
(4, 'Foin', 7.0, 150),
(7, 'Concentré', 5.0, 400),
(9, 'Pâturage', 12.0, 50);