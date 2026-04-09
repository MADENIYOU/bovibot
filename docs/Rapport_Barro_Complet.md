# Rapport Technique Complet — Barro
## Projet BoviBot | Gestion d'Élevage Bovin avec IA et PL/SQL

**Établissement** : ESP/UCAD — DIC2 TR 
**Responsable** : Barro  
**Branches** : `dev-barro` (S1) → `dev-barro-s2` (S2)  

---

## Table des matières

1. [Semaine 1 — Fondations & SQL](#semaine-1)
   - [Étape 03 — Setup & Configuration locale](#étape-03)
   - [Étape 10 — Certification des Triggers](#étape-10)
   - [Étape 11 — Test du Planificateur d'Événements](#étape-11)
   - [Étape 12 — Injection du Gold Dataset](#étape-12)
   - [Étape 16 — Rédaction Rapport Automatisation](#étape-16)
2. [Semaine 2 — Docker & Déploiement](#semaine-2)
   - [Étape D-01 — Containerisation Docker](#étape-d-01)
   - [Étape D-02 — README & Guide de Déploiement](#étape-d-02)
   - [Étape D-03 — Pull Request vers develop](#étape-d-03)
3. [Récapitulatif Git](#récapitulatif-git)
4. [Checklist finale](#checklist-finale)

---

## Semaine 1 — Fondations & SQL {#semaine-1}

### Étape 03 — Setup & Configuration locale {#étape-03}

**Branche** : `dev-barro`  
**Commit** : `setup: local environment and environment variables template`  
**Livrable** : `.env.example`

#### Contexte

Première étape de la semaine 1, réalisée dès la création des branches par Sall.
L'objectif était de configurer l'environnement de développement local et de
fournir un modèle de configuration pour toute l'équipe.

#### Actions réalisées

**1. Clonage du repo et bascule sur la branche**
```bash
git clone https://github.com/MADENIYOU/bovibot.git
cd bovibot
git checkout dev-barro
```

**2. Installation de MySQL 8.x sur Windows**
- Téléchargement depuis dev.mysql.com/downloads
- Installation avec profil "Developer Default"
- Configuration du mot de passe root
- Ajout de MySQL au PATH système

**3. Création de l'environnement virtuel Python**
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

**4. Création du fichier `.env.example`**
```env
# .env.example — BoviBot | Modèle de configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=bovibot
OPENAI_API_KEY=sk-...your_key_here
LLM_MODEL=gpt-4o-mini
APP_PORT=8002
APP_ENV=development
```

**5. Création du `.env` local** (non commité, ignoré par `.gitignore`)

**6. Chargement du schema SQL**

Problème rencontré : l'opérateur `<` n'est pas supporté dans PowerShell.

```
# Erreur PowerShell :
L'opérateur « < » est réservé à une utilisation future.
```

Solution appliquée — utilisation de Git Bash :
```bash
"/c/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" -u root -p bovibot < schema.sql
```

**7. Vérification des 8 tables**
```sql
SHOW TABLES;
-- races, animaux, pesees, sante, reproduction,
-- alimentation, ventes, alertes  ✅
```

#### Problèmes rencontrés et solutions

| Problème | Cause | Solution |
|----------|-------|----------|
| `<` non supporté dans PowerShell | PowerShell ne gère pas la redirection `<` | Utilisation de Git Bash |
| `git push` échoue avec erreur Win32 | Projet dans `C:\Windows\System32` (dossier protégé) | Push depuis Git Bash |
| Authentication GitHub échoue | GitHub n'accepte plus les mots de passe | Génération d'un token `ghp_...` via platform.github.com |

#### Résultat

```
[dev-barro 75519a8] setup: local environment and environment variables template
1 file changed, 1 insertion(+), 1 deletion(-)
✅ Push réussi sur dev-barro
```

---

### Étape 10 — Certification des Triggers {#étape-10}

**Branche** : `dev-barro`  
**Commit** : `test: triggers and event scheduler validation report`  
**Livrable** : `tests/rapport_tests_triggers.md`

#### Contexte

Cette étape a été réalisée après validation de la Phase 3 par Kane.
L'objectif était de tester les 3 triggers implémentés dans le schema SQL
et de documenter les résultats.

#### Trigger 1 — `trg_alerte_poids_faible`

**Événement** : `AFTER INSERT` sur `pesees`  
**Condition** : `poids_kg < 60` ET âge animal < 6 mois

```sql
-- Insertion d'un animal de test
INSERT INTO animaux (numero_tag, race_id, sexe, date_naissance, statut)
VALUES ('TAG-TEST', 1, 'M', '2023-01-01', 'actif');

-- Pesée critique
INSERT INTO pesees (animal_id, poids_kg, date_pesee, agent)
VALUES (LAST_INSERT_ID(), 45.0, CURDATE(), 'Barro');

-- Vérification
SELECT * FROM alertes ORDER BY id DESC LIMIT 3;
```

**Résultat obtenu** :
```
id | animal_id | type  | message                                          | niveau   | date_creation
2  | 6         | poids | Poids critique pour un veau de 4 mois : 45.00 kg | critical | 2026-03-29 21:20:01
```
✅ **Alerte créée automatiquement**

---

#### Trigger 2 — `trg_alerte_vaccination`

**Événement** : `AFTER INSERT` sur `sante`  
**Condition** : `prochain_rdv < CURDATE()`

```sql
INSERT INTO sante (animal_id, type, date_acte, veterinaire, prochain_rdv, description)
VALUES (1, 'Vaccination', CURDATE(), 'Dr Diop',
        DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'Vaccin annuel obligatoire');
```

> **Problème rencontré** : champ `description` obligatoire non mentionné initialement.  
> **Solution** : ajout du champ `description` dans l'INSERT.

✅ **Alerte warning créée automatiquement**

---

#### Trigger 3 — `trg_historique_statut`

**Événement** : `BEFORE UPDATE` sur `animaux`  
**Condition** : changement de la colonne `statut`

```sql
UPDATE animaux SET statut = 'vendu' WHERE numero_tag = 'TAG-TEST';
-- Résultat : changement loggé dans historique_statut ✅
```

---

### Étape 11 — Test du Planificateur d'Événements {#étape-11}

**Branche** : `dev-barro`  
**Commit** : `test: verify daily event scheduler for calving alerts`

#### Activation du scheduler

```sql
SET GLOBAL event_scheduler = ON;
SHOW VARIABLES LIKE 'event_scheduler';
-- Résultat : event_scheduler | ON  ✅
```

#### Test de `evt_alerte_velages`

```sql
-- Vérification des events existants
SHOW EVENTS;

-- Exécution forcée
ALTER EVENT evt_alerte_velages ON SCHEDULE AT NOW();

-- Vérification des alertes
SELECT * FROM alertes ORDER BY id DESC LIMIT 5;
-- Résultat : alertes de type velage générées ✅
```

#### Test de `evt_rapport_croissance`

```
Message généré automatiquement :
"Rapport hebdo : 0 animaux actifs. Consultez le tableau de bord pour les détails."
type : autre | niveau : info  ✅
```

---

### Étape 12 — Injection du Gold Dataset {#étape-12}

**Branche** : `dev-barro`  
**Commit** : `data: 50 rows of real-world test data for LLM preparation`  
**Livrable** : `data/seed_data.sql`

#### Objectif

Créer 50 lignes de données réalistes pour préparer le LLM BoviBot
à répondre à des requêtes en langage naturel sur un vrai troupeau bovin sénégalais.

#### Contenu du dataset

| Table | Lignes | Description |
|-------|--------|-------------|
| `races` | 5 | Zébu Gobra, Ndama, Jersiaise, Charolaise, Métis local |
| `animaux` | 15 | TAG-001 à TAG-015, statuts variés (actif/vendu/mort) |
| `pesees` | 15 | Pesées janvier–mars 2026, agent Barro |
| `sante` | 10 | Actes vétérinaires Dr Diop & Dr Faye |
| `alimentation` | 5 | Foin, concentré, pâturage |
| **TOTAL** | **50** | **Données réalistes pour LLM** |

#### Cas limites couverts

- **TAG-015** : poids 45 kg → déclenche `trg_alerte_poids_faible`
- **TAG-003** : statut `vendu` → testé avec `trg_historique_statut`
- **TAG-010** : statut `mort` → cas limite pour les ventes bloquées

#### Problème rencontré et solution

```
# Première tentative :
ERROR 1062 (23000): Duplicate entry 'TAG-001' for key 'animaux.numero_tag'

# Cause : données déjà insérées lors des tests précédents
# Solution : remplacement de INSERT par INSERT IGNORE
```

#### Validation

```sql
SELECT COUNT(*) FROM races;        -- 5  ✅
SELECT COUNT(*) FROM animaux;      -- 15 ✅
SELECT COUNT(*) FROM pesees;       -- 15 ✅
SELECT COUNT(*) FROM sante;        -- 10 ✅
SELECT COUNT(*) FROM alimentation; --  5 ✅
```

---

### Étape 16 — Rédaction Rapport Automatisation {#étape-16}

**Branche** : `develop` (push direct)  
**Commit** : `docs: report section - automation and triggers`  
**Livrable** : `rapport/Rapport_BoviBot_V1_Etape_16.docx`

#### Contenu du rapport

Section complète couvrant :
- Les 3 triggers avec justification métier, code SQL et résultats de tests
- L'Event Scheduler MySQL avec les 2 events
- Le tableau récapitulatif de tous les tests
- Le Gold Dataset avec validation de l'injection

---

## Semaine 2 — Docker & Déploiement {#semaine-2}

### Étape D-01 — Containerisation Docker {#étape-d-01}

**Branche** : `dev-barro-s2`  
**Commits** :
- `feat: Dockerfile and docker-compose (MySQL + FastAPI + Nginx)`
- `feat: nginx reverse proxy eliminating CORS issues`

**Livrables** : `Dockerfile`, `docker-compose.yml`, `nginx.conf`, `.env.example`

#### Contexte

Création d'une infrastructure Docker complète avec 3 services :
`db` (MySQL 8.0), `backend` (FastAPI), `frontend` (Nginx).

#### Fichier 1 — `Dockerfile`

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8002
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8002"]
```

**Choix techniques** :
- `python:3.11-slim` : image légère, compatible avec toutes les dépendances
- `--no-cache-dir` : réduit la taille de l'image finale
- Port `8002` : port défini dans les specs du projet

#### Fichier 2 — `nginx.conf`

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index html/index.html;

    location / {
        try_files $uri $uri/ /html/index.html;
    }

    location /api/ {
        proxy_pass http://backend:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /health {
        proxy_pass http://backend:8002;
    }
}
```

**Avantage clé** : le `proxy_pass` élimine tous les problèmes CORS.
La variable `const API = ''` dans les fichiers JS frontend reste vide,
nginx route automatiquement les appels `/api/` vers le backend.

#### Fichier 3 — `docker-compose.yml`

```yaml
version: '3.8'

services:
  db:
    image: mysql:8.0
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./schema.sql:/docker-entrypoint-initdb.d/schema.sql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: .
    restart: always
    env_file: .env
    ports:
      - "8002:8002"
    depends_on:
      db:
        condition: service_healthy

  frontend:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
    volumes:
      - ./frontend:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend

volumes:
  mysql_data:
```

**Points importants** :
- `depends_on: condition: service_healthy` → le backend ne démarre que quand MySQL est prêt
- `mysql_data` volume persistant → les données survivent aux redémarrages
- `schema.sql` monté dans `docker-entrypoint-initdb.d/` → initialisation automatique de la BDD

#### Fichier 4 — `.env.example` mis à jour pour Docker

```env
DB_HOST=db
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=bovibot
LLM_API_KEY=
LLM_MODEL=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com/v1
```

> **Important** : `DB_HOST=db` (nom du service Docker) et non `localhost`

#### Test en local

```bash
cp .env.example .env
docker compose up --build
```

**Résultat** : Dashboard BoviBot accessible sur `http://localhost/` ✅

---

### Étape D-02 — README & Guide de Déploiement {#étape-d-02}

**Branche** : `dev-barro-s2`  
**Commits** :
- `docs: complete README with Docker setup and usage`
- `docs: VPS deployment guide`

**Livrables** : `README.md`, `docs/guide_deploiement.md`

#### README.md — Installation en 4 commandes

```bash
git clone https://github.com/MADENIYOU/bovibot.git
cd bovibot
cp .env.example .env   # Remplir les variables
docker compose up -d --build
# Accéder à : http://localhost/
```

#### Guide de déploiement VPS

Prérequis VPS recommandés :

| Élément | Minimum |
|---------|---------|
| OS | Ubuntu 22.04 LTS |
| RAM | 2 Go |
| CPU | 1 vCPU |
| Stockage | 20 Go SSD |
| Ports | 80, 443, 22 |

Procédure complète documentée dans `docs/guide_deploiement.md` :
- Installation Docker sur Ubuntu
- Clone du projet
- Configuration des variables d'environnement
- Lancement en production
- Commandes de diagnostic et mise à jour

---

### Étape D-03 — Pull Request vers develop {#étape-d-03}

**Action** : Pull Request de `dev-barro-s2` → `develop`  
**Commit de merge** : `merge: Paquet D - Docker containerization and deployment docs`

#### Vérification avant merge

```bash
docker compose up --build
# http://localhost/           → Dashboard ✅
# http://localhost/api/health → {"status":"ok"} ✅
```

#### Synchronisation avec Paquet C

Avant de créer la PR, synchronisation avec le travail de l'équipe :

```bash
git checkout develop
git pull origin develop
git checkout dev-barro-s2
git merge develop
git push origin dev-barro-s2
```

---

## Récapitulatif Git {#récapitulatif-git}

### Semaine 1 — Branche `dev-barro`

| Étape | Commit message | Livrable |
|-------|---------------|----------|
| 03 | `setup: local environment and environment variables template` | `.env.example` |
| 10 | `test: triggers and event scheduler validation report` | `tests/rapport_tests_triggers.md` |
| 11 | `test: verify daily event scheduler for calving alerts` | (inclus dans étape 10) |
| 12 | `data: 50 rows of real-world test data for LLM preparation` | `data/seed_data.sql` |
| 16 | `docs: report section - automation and triggers` | `rapport/Rapport_BoviBot_V1_Etape_16.docx` |

### Semaine 2 — Branche `dev-barro-s2`

| Étape | Commit message | Livrable |
|-------|---------------|----------|
| D-01 | `feat: Dockerfile and docker-compose (MySQL + FastAPI + Nginx)` | `Dockerfile`, `docker-compose.yml`, `nginx.conf` |
| D-01 | `feat: nginx reverse proxy eliminating CORS issues` | `nginx.conf` |
| D-02 | `docs: complete README with Docker setup and usage` | `README.md` |
| D-02 | `docs: VPS deployment guide` | `docs/guide_deploiement.md` |
| D-03 | `merge: Paquet D - Docker containerization and deployment docs` | PR mergée |

---

## Checklist finale {#checklist-finale}

### Semaine 1

| Point de contrôle | Status |
|-------------------|--------|
| MySQL 8.x installé et fonctionnel | ✅ |
| `.env.example` créé et pushé sur `dev-barro` | ✅ |
| `trg_alerte_poids_faible` testé et validé | ✅ |
| `trg_alerte_vaccination` testé et validé | ✅ |
| `trg_historique_statut` testé et validé | ✅ |
| `evt_alerte_velages` exécuté et validé | ✅ |
| `event_scheduler` activé (`SET GLOBAL ON`) | ✅ |
| `data/seed_data.sql` — 50 lignes injectées sans erreur | ✅ |
| Rapport automatisation rédigé et commité | ✅ |

### Semaine 2

| Point de contrôle | Status |
|-------------------|--------|
| Docker Desktop installé sur Windows | ✅ |
| `Dockerfile` créé et fonctionnel | ✅ |
| `docker-compose.yml` — 3 services opérationnels | ✅ |
| `nginx.conf` — reverse proxy sans CORS | ✅ |
| Dashboard accessible sur `http://localhost/` | ✅ |
| `README.md` mis à jour | ✅ |
| `docs/guide_deploiement.md` créé | ✅ |
| PR `dev-barro-s2` → `develop` mergée | ✅ |

---

*Rapport rédigé par **Barro** — Projet BoviBot — ESP/UCAD Licence 3 — 2026*
