\# Guide de Déploiement VPS — BoviBot



\## Prérequis VPS



| Élément | Minimum recommandé |

|---------|-------------------|

| OS | Ubuntu 22.04 LTS |

| RAM | 2 Go minimum |

| CPU | 1 vCPU |

| Stockage | 20 Go SSD |

| Ports à ouvrir | 80, 443, 22 |



\## 1. Connexion au VPS



ssh user@IP\_DU\_VPS



\## 2. Installation de Docker sur le VPS



sudo apt update \&\& sudo apt upgrade -y

sudo apt install docker.io docker-compose-plugin -y

sudo systemctl enable docker

sudo usermod -aG docker $USER



\## 3. Cloner le projet



git clone https://github.com/MADENIYOU/bovibot.git

cd bovibot



\## 4. Configurer les variables d'environnement



cp .env.example .env

nano .env

\# Remplir DB\_PASSWORD et LLM\_API\_KEY



\## 5. Lancer en production



docker compose up -d --build



\# Vérifier que tout tourne

docker compose ps



\# Accéder à l'application

\# http://IP\_DU\_VPS/



\## 6. Gestion des variables en production



Ne jamais commiter le fichier .env sur Git.

Utiliser des secrets Docker ou des variables d'environnement système

pour les déploiements sensibles.



\## 7. Mise à jour de l'application



git pull origin develop

docker compose up -d --build



\## 8. Commandes de diagnostic



\# Logs en temps réel

docker compose logs -f backend



\# Statut des conteneurs

docker compose ps



\# Entrer dans le conteneur backend

docker compose exec backend bash



\# Vérifier la base de données

docker compose exec db mysql -u root -p bovibot

