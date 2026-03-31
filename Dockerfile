# Image de base légère pour Python
FROM python:3.11-slim

# Évite la création de fichiers .pyc et active le mode non bufferisé pour les logs
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Répertoire de travail
WORKDIR /app

# Installation des dépendances système nécessaires pour mysql-connector
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Installation des dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copie du code source
COPY . .

# Exposition du port utilisé par FastAPI
EXPOSE 8002

# Commande de lancement (FastAPI sur port 8002 par défaut dans votre projet)
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8002"]
