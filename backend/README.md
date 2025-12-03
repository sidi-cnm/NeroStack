# NeroStack Backend API

Backend Flask pour la gestion documentaire avec Mayan EDMS et IA locale (Ollama).

## 🚀 Fonctionnalités

- **Authentification JWT** : Inscription, connexion, tokens refresh
- **Gestion des utilisateurs** : CRUD complet (admin)
- **Accès temporaires** : Fenêtres d'accès définies par l'admin
- **Intégration Mayan EDMS** : Proxy vers l'API documentaire
- **Analyse IA** : Résumés et mots-clés via Ollama (Privacy first)

## 📁 Structure du projet

```
backend/
├── app.py              # Application Flask principale
├── config.py           # Configuration
├── requirements.txt    # Dépendances Python
├── dockerfile          # Image Docker
├── init_db.py         # Script d'initialisation
├── models/
│   ├── user.py              # Modèle utilisateur
│   ├── temporary_access.py  # Modèle accès temporaire
│   └── document_analysis.py # Modèle analyse IA
├── routes/
│   ├── auth.py        # Routes authentification
│   ├── users.py       # Routes utilisateurs (admin)
│   ├── documents.py   # Routes documents
│   ├── access.py      # Routes accès temporaires
│   ├── ai.py          # Routes analyse IA
│   └── health.py      # Routes santé/diagnostic
└── services/
    ├── mayan_service.py  # Client API Mayan
    └── ai_service.py     # Client Ollama
```

## 🔧 Installation

### Avec Docker (recommandé)

```bash
# Depuis la racine du projet
docker-compose up -d
```

### En local (développement)

```bash
cd backend
pip install -r requirements.txt
python init_db.py
python app.py
```

## 📡 API Endpoints

### Authentification (`/api/auth`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/register` | Inscription |
| POST | `/login` | Connexion |
| POST | `/logout` | Déconnexion |
| POST | `/refresh` | Rafraîchir le token |
| GET | `/me` | Infos utilisateur connecté |
| POST | `/change-password` | Changer mot de passe |
| GET | `/mayan-token` | Obtenir le token Mayan (SSO) |

### Utilisateurs (`/api/users`) - Admin only

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Lister les utilisateurs |
| POST | `/` | Créer un utilisateur |
| GET | `/<id>` | Détails utilisateur |
| PUT | `/<id>` | Modifier utilisateur |
| DELETE | `/<id>` | Supprimer utilisateur |
| POST | `/<id>/activate` | Activer compte |
| POST | `/<id>/deactivate` | Désactiver compte |
| POST | `/<id>/reset-password` | Reset mot de passe |

### Documents (`/api/documents`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Lister les documents |
| GET | `/<id>` | Détails document |
| GET | `/<id>/content` | Contenu OCR |
| GET | `/search?q=...` | Recherche full-text |
| POST | `/upload` | Upload document |
| GET | `/cabinets` | Lister les cabinets |
| GET | `/types` | Types de documents |

### Accès Temporaires (`/api/access`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Lister tous les accès (admin) |
| POST | `/` | Créer un accès (admin) |
| GET | `/<id>` | Détails accès |
| PUT | `/<id>` | Modifier accès |
| DELETE | `/<id>` | Supprimer accès |
| POST | `/<id>/revoke` | Révoquer accès |
| GET | `/my-accesses` | Mes accès |
| GET | `/check/<doc_id>` | Vérifier accès document |
| GET | `/dashboard` | Tableau de bord |

### Analyse IA (`/api/ai`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/analyze/<doc_id>` | Analyse complète |
| POST | `/summary/<doc_id>` | Résumé seul |
| POST | `/keywords/<doc_id>` | Mots-clés seuls |
| POST | `/ask/<doc_id>` | Poser une question |
| GET | `/history` | Historique analyses |
| GET | `/status` | Statut service IA |
| GET | `/models` | Modèles disponibles |

### Santé (`/api`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/health` | Health check simple |
| GET | `/health/detailed` | Health check détaillé |
| GET | `/info` | Infos API |

## 🔐 Authentification

Toutes les routes (sauf `/health`, `/login`, `/register`) nécessitent un token JWT.

```bash
# Header HTTP
Authorization: Bearer <votre_token>
```

## 📝 Exemples d'utilisation

### Connexion

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

### Créer un accès temporaire

```bash
curl -X POST http://localhost:8080/api/access \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 2,
    "document_id": null,
    "start_date": "2024-12-01T00:00:00",
    "end_date": "2024-12-03T23:59:59",
    "access_type": "read",
    "reason": "Révision annuelle"
  }'
```

### Analyser un document avec l'IA

```bash
curl -X POST http://localhost:8080/api/ai/analyze/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"language": "fr"}'
```

## ⚙️ Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `FLASK_ENV` | Environnement | `development` |
| `SECRET_KEY` | Clé secrète Flask | - |
| `JWT_SECRET_KEY` | Clé JWT | - |
| `DATABASE_URL` | URL base de données | `sqlite:///nerostack.db` |
| `MAYAN_URL` | URL Mayan EDMS | `http://mayan:8000` |
| `MAYAN_ADMIN_USER` | Admin Mayan | `admin` |
| `MAYAN_ADMIN_PASSWORD` | Password Mayan | `admin` |
| `OLLAMA_URL` | URL Ollama | `http://service_ia_locale:11434` |
| `OLLAMA_MODEL` | Modèle IA | `llama3.2` |
| `CORS_ORIGINS` | Origines CORS | `http://localhost:3000` |

## 🤖 Configuration Ollama

Pour utiliser l'analyse IA, téléchargez d'abord un modèle :

```bash
# Dans le conteneur Ollama
docker exec -it service_ia_locale ollama pull llama3.2

# Ou un modèle plus léger
docker exec -it service_ia_locale ollama pull phi
```

## 👤 Comptes par défaut

| Username | Password | Rôle |
|----------|----------|------|
| `admin` | `admin123` | Admin |
| `testuser` | `test123` | User |

⚠️ **Changez ces mots de passe en production !**

## 📄 Licence

MIT

