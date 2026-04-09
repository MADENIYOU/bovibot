\# BoviBot — Gestion d'Élevage Bovin avec IA et PL/SQL



Application web de gestion de troupeau bovin intégrant un assistant LLM

(Text-to-SQL) et des éléments PL/SQL avancés (procédures, triggers, events).



\## Prérequis



\- Docker Desktop installé et lancé

\- Clé API OpenAI (gpt-4o-mini)

\- Git



\## Installation en 4 commandes



git clone https://github.com/MADENIYOU/bovibot.git

cd bovibot

cp .env.example .env   # Remplir les variables

docker compose up -d --build



Accéder à : http://localhost/



\## Variables d'environnement



Copier .env.example en .env et remplir :



\- DB\_PASSWORD : mot de passe MySQL

\- LLM\_API\_KEY : clé API OpenAI (sk-...)

\- LLM\_MODEL : gpt-4o-mini (par défaut)



\## Commandes utiles



\# Voir les logs

docker compose logs -f



\# Arrêter l'application

docker compose down



\# Reset complet des données

docker compose down -v

docker compose up -d --build



\# Redémarrer après mise à jour

git pull origin develop

docker compose up -d --build

