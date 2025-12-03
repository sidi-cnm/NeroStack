"""
NeroStack Backend - Application Flask principale
Gestion de l'authentification, des accès temporaires et intégration IA
"""
import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

from config import config
from models import db

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_app(config_name: str = None) -> Flask:
    """
    Factory pour créer l'application Flask.
    
    Args:
        config_name: Nom de la configuration (development, production, testing)
    
    Returns:
        Application Flask configurée
    """
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialiser les extensions
    db.init_app(app)
    
    # JWT
    jwt = JWTManager(app)
    
    # Migrations
    Migrate(app, db)
    
    # CORS
    CORS(app, origins=app.config.get('CORS_ORIGINS', ['*']))
    
    # Callbacks JWT
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            'error': 'Token expiré',
            'message': 'Veuillez vous reconnecter'
        }), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({
            'error': 'Token invalide',
            'message': str(error)
        }), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({
            'error': 'Token manquant',
            'message': 'Authentification requise'
        }), 401
    
    # Enregistrer les blueprints
    from routes.auth import auth_bp
    from routes.users import users_bp
    from routes.documents import documents_bp
    from routes.access import access_bp
    from routes.ai import ai_bp
    from routes.health import health_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(access_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(health_bp)
    
    # Route racine
    @app.route('/')
    def index():
        return jsonify({
            'name': 'NeroStack Backend API',
            'version': '1.0.0',
            'status': 'running',
            'endpoints': {
                'auth': '/api/auth',
                'users': '/api/users',
                'documents': '/api/documents',
                'access': '/api/access',
                'ai': '/api/ai',
                'health': '/api/health'
            }
        })
    
    # Gestionnaire d'erreurs global
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Non trouvé',
            'message': 'La ressource demandée n\'existe pas'
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Erreur interne: {error}")
        return jsonify({
            'error': 'Erreur interne',
            'message': 'Une erreur inattendue s\'est produite'
        }), 500
    
    # Créer les tables si elles n'existent pas
    with app.app_context():
        db.create_all()
        
        # Créer un admin par défaut si aucun n'existe
        from models.user import User
        if not User.query.filter_by(role='admin').first():
            try:
                admin = User.create_user(
                    username='admin',
                    email='admin@nerostack.local',
                    password='admin123',
                    first_name='Admin',
                    last_name='NeroStack',
                    role='admin'
                )
                logger.info(f"Admin par défaut créé: {admin.username}")
            except Exception as e:
                logger.warning(f"Impossible de créer l'admin par défaut: {e}")
    
    logger.info(f"Application démarrée en mode {config_name}")
    
    return app


# Point d'entrée pour gunicorn
app = create_app()


if __name__ == '__main__':
    # Développement local
    app.run(
        host='0.0.0.0',
        port=8080,
        debug=True
    )

