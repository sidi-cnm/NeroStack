# Ai-Locale - Documentation Technique

## Vue d'ensemble

Ai-Locale est une plateforme de gestion documentaire avec intelligence artificielle locale. Le projet utilise Docker Compose pour orchestrer tous les services nécessaires, permettant un démarrage en une seule commande.

## Architecture

Le projet est composé de 6 services principaux :

1. **PostgreSQL** (`db`) - Base de données partagée pour Mayan EDMS et le backend
2. **Mayan EDMS** (`mayan`) - Système de gestion documentaire
3. **Backend Flask** (`backend`) - API REST pour l'authentification et la gestion
4. **Client Next.js** (`client`) - Interface utilisateur web
5. **Ollama** (`ia_locale`) - Service d'IA locale pour l'analyse de documents
6. **Redis** (`redis`) - Cache et broker pour Celery (Mayan)

## Prérequis

- **Docker** (version 20.10 ou supérieure)
- **Docker Compose** (version 2.0 ou supérieure)
- **Git** (pour cloner le dépôt)
- **8 Go de RAM minimum** (recommandé : 16 Go pour l'IA locale)
- **20 Go d'espace disque libre** (pour les données et les modèles IA)

### Vérification des prérequis

```bash
docker --version
docker-compose --version
git --version
```

## Installation et démarrage

### 1. Cloner le dépôt

```bash
git clone <url-du-depot>
cd Ai-Locale
```

### 2. Configuration des variables d'environnement (optionnel)

Créez un fichier `.env` à la racine du projet pour personnaliser la configuration :

```bash
# Fichier .env (optionnel)
MAYAN_DB_PASSWORD=votre_mot_de_passe_secret
SECRET_KEY=votre_secret_key_flask
JWT_SECRET_KEY=votre_jwt_secret_key
OLLAMA_MODEL=llama3.2
```

> **Note** : Si le fichier `.env` n'existe pas, les valeurs par défaut seront utilisées (voir `docker-compose.yml`).

### 3. Lancement du projet

**Une seule commande suffit :**

```bash
docker-compose up -d --build
```

Cette commande :
- Construit les images Docker pour `backend` et `client`
- Télécharge les images nécessaires (PostgreSQL, Mayan, Ollama, Redis)
- Crée et démarre tous les conteneurs
- Configure automatiquement les bases de données
- Initialise l'utilisateur admin de Mayan
- Télécharge le modèle IA Ollama (première exécution uniquement)

### 4. Vérification du démarrage

Vérifiez que tous les services sont en cours d'exécution :

```bash
docker-compose ps
```

Vous devriez voir 6 services avec le statut `Up` :
- `mayan_db` (PostgreSQL)
- `mayan_edms` (Mayan EDMS)
- `nerostack_backend` (Backend Flask)
- `votre_client` (Client Next.js)
- `service_ia_locale` (Ollama)
- `mayan_redis` (Redis)

### 5. Consultation des logs

Pour suivre le démarrage et le fonctionnement des services :

```bash
# Tous les services
docker-compose logs -f

# Un service spécifique
docker-compose logs -f backend
docker-compose logs -f mayan
docker-compose logs -f ia_locale
```

## Accès aux services

Une fois les conteneurs démarrés, les services sont accessibles aux URLs suivantes :

| Service | URL | Identifiants |
|---------|-----|--------------|
| **Client Web** | http://localhost:3000 | - |
| **Backend API** | http://localhost:8080 | - |
| **Mayan EDMS** | http://localhost:8001 | `admin` / `admin` |

### Endpoints API principaux

- **Health Check** : `GET http://localhost:8080/api/health`
- **Authentification** : `POST http://localhost:8080/api/auth/login`
- **Documents** : `GET http://localhost:8080/api/documents`

## Initialisation automatique

Le projet inclut plusieurs scripts d'initialisation qui s'exécutent automatiquement au premier démarrage :

### Base de données

- **Script** : `backend/init-db.sh`
- **Action** : Crée la base de données `nerostack_db` et l'utilisateur associé
- **Exécution** : Automatique au démarrage de PostgreSQL (première fois uniquement)

### Mayan EDMS

- **Script** : `init_mayan.sh` + `mayan-entrypoint-wrapper.sh`
- **Action** : Crée l'utilisateur admin (`admin` / `admin`)
- **Exécution** : Automatique au démarrage de Mayan (première fois uniquement)

### Ollama (IA Locale)

- **Script** : `init.sh` + `ollama-entrypoint.sh`
- **Action** : Télécharge le modèle IA spécifié (`llama3.2` par défaut)
- **Exécution** : Automatique au démarrage d'Ollama (première fois uniquement)
- **Durée** : Peut prendre plusieurs minutes selon la connexion internet

## Commandes utiles

### Arrêter les services

```bash
docker-compose down
```

### Arrêter et supprimer les volumes (⚠️ supprime les données)

```bash
docker-compose down -v
```

### Redémarrer un service spécifique

```bash
docker-compose restart backend
docker-compose restart mayan
```

### Reconstruire un service après modification du code

```bash
docker-compose up -d --build backend
docker-compose up -d --build client
```

### Accéder à un conteneur

```bash
# Shell dans le conteneur backend
docker-compose exec backend bash

# Shell dans le conteneur Mayan
docker-compose exec mayan bash

# Accès à PostgreSQL
docker-compose exec db psql -U mayan -d mayan_db
```

### Vérifier l'état de santé des services

```bash
# Backend
curl http://localhost:8080/api/health

# Mayan
curl http://localhost:8001

# Ollama (depuis l'intérieur du réseau Docker)
docker-compose exec ia_locale ollama list
```

## Structure des données

Les données persistantes sont stockées dans le dossier `./data/` :

```
data/
├── db/              # Données PostgreSQL
├── mayan/           # Données Mayan EDMS
└── ollama/          # Modèles IA Ollama
```

> **Important** : Le dossier `data/` est créé automatiquement au premier démarrage. Pour repartir de zéro, supprimez ce dossier et relancez `docker-compose up`.

## Réseau Docker

Tous les services communiquent via un réseau privé Docker (`mayan_connect_network`) :

- **Isolation** : Les services ne sont pas accessibles depuis l'extérieur (sauf via les ports exposés)
- **Communication interne** : Les services utilisent les noms de conteneurs pour communiquer
  - Exemple : `http://mayan:8000` depuis le backend
  - Exemple : `http://service_ia_locale:11434` depuis le backend

## Ports exposés

| Port | Service | Description |
|------|---------|-------------|
| 3000 | Client | Interface web Next.js |
| 8080 | Backend | API Flask |
| 8001 | Mayan | Interface Mayan EDMS |

> **Note** : Ollama n'expose pas de port vers l'extérieur pour des raisons de sécurité. Il est uniquement accessible depuis le réseau interne Docker.

## Dépannage

### Les conteneurs ne démarrent pas

1. Vérifiez les logs : `docker-compose logs`
2. Vérifiez que les ports ne sont pas déjà utilisés :
   ```bash
   netstat -tulpn | grep -E '3000|8080|8001'
   ```
3. Vérifiez l'espace disque disponible : `df -h`

### Mayan ne démarre pas correctement

1. Vérifiez les logs : `docker-compose logs mayan`
2. Attendez 45-60 secondes (temps d'initialisation)
3. Vérifiez que PostgreSQL est prêt : `docker-compose exec db pg_isready`

### Le modèle IA n'est pas téléchargé

1. Vérifiez les logs Ollama : `docker-compose logs ia_locale`
2. Vérifiez la connexion internet
3. Téléchargez manuellement le modèle :
   ```bash
   docker-compose exec ia_locale ollama pull llama3.2
   ```

### Erreur de connexion à la base de données

1. Vérifiez que PostgreSQL est démarré : `docker-compose ps db`
2. Vérifiez les variables d'environnement dans `docker-compose.yml`
3. Vérifiez les logs PostgreSQL : `docker-compose logs db`

### Le client Next.js ne se compile pas

1. Vérifiez les logs : `docker-compose logs client`
2. Reconstruisez l'image : `docker-compose up -d --build client`
3. Vérifiez que `package.json` est valide

## Développement

### Mode développement avec hot-reload

Les volumes sont montés pour permettre le développement en temps réel :

- `./backend:/app` - Code backend monté dans le conteneur
- `./client:/app` - Code client monté dans le conteneur

Les modifications du code sont reflétées automatiquement (redémarrage nécessaire pour certains changements).

### Variables d'environnement de développement

Les variables par défaut sont configurées pour le développement :
- `FLASK_ENV=development`
- `NODE_ENV=production` (pour Next.js, optimisé pour la production même en dev)

## Production

Pour déployer en production :

1. **Sécurisez les mots de passe** : Modifiez toutes les valeurs par défaut dans `.env`
2. **Changez les secrets** : `SECRET_KEY`, `JWT_SECRET_KEY`, `MAYAN_DB_PASSWORD`
3. **Configurez CORS** : Modifiez `CORS_ORIGINS` dans `docker-compose.yml`
4. **Utilisez un reverse proxy** : Nginx ou Traefik pour HTTPS
5. **Sauvegardez les données** : Configurez des sauvegardes régulières du dossier `data/`

## Support

Pour toute question ou problème :
1. Consultez les logs : `docker-compose logs`
2. Vérifiez la documentation de chaque service
3. Ouvrez une issue sur le dépôt du projet

## Licence

[À compléter selon la licence du projet]

