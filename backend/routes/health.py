"""
Routes de santé et diagnostic
Pour le monitoring et le debugging
"""
from flask import Blueprint, jsonify, current_app
from services.mayan_service import MayanService
from services.ai_service import AIService
from models import db
import logging

logger = logging.getLogger(__name__)

health_bp = Blueprint('health', __name__, url_prefix='/api')


@health_bp.route('/health', methods=['GET'])
def health():
    """
    Point de santé basique.
    Utilisé par Docker pour les health checks.
    
    Returns:
        200: Service en ligne
    """
    return jsonify({
        'status': 'healthy',
        'service': 'nerostack-backend'
    }), 200


@health_bp.route('/health/detailed', methods=['GET'])
def health_detailed():
    """
    Point de santé détaillé.
    Vérifie tous les services connectés.
    
    Returns:
        200: Statut détaillé de tous les services
    """
    status = {
        'backend': {
            'status': 'healthy',
            'version': '1.0.0'
        },
        'database': {
            'status': 'unknown'
        },
        'mayan': {
            'status': 'unknown'
        },
        'ai': {
            'status': 'unknown'
        }
    }
    
    # Vérifier la base de données
    try:
        db.session.execute(db.text('SELECT 1'))
        status['database']['status'] = 'healthy'
    except Exception as e:
        status['database']['status'] = 'unhealthy'
        status['database']['error'] = str(e)
    
    # Vérifier Mayan
    try:
        mayan = MayanService()
        if mayan.check_connection():
            status['mayan']['status'] = 'healthy'
            status['mayan']['url'] = mayan.base_url
        else:
            status['mayan']['status'] = 'unhealthy'
            status['mayan']['error'] = 'Connection failed'
    except Exception as e:
        status['mayan']['status'] = 'unhealthy'
        status['mayan']['error'] = str(e)
    
    # Vérifier le service IA
    try:
        ai = AIService()
        if ai.check_connection():
            status['ai']['status'] = 'healthy'
            status['ai']['url'] = ai.base_url
            status['ai']['model'] = ai.model
            status['ai']['available_models'] = ai.list_models()
        else:
            status['ai']['status'] = 'unhealthy'
            status['ai']['error'] = 'Connection failed'
    except Exception as e:
        status['ai']['status'] = 'unhealthy'
        status['ai']['error'] = str(e)
    
    # Déterminer le statut global
    all_healthy = all(
        s.get('status') == 'healthy' 
        for s in status.values() 
        if isinstance(s, dict) and 'status' in s
    )
    
    overall_status = 'healthy' if all_healthy else 'degraded'
    
    return jsonify({
        'status': overall_status,
        'services': status
    }), 200 if all_healthy else 503


@health_bp.route('/info', methods=['GET'])
def info():
    """
    Informations sur l'API.
    
    Returns:
        200: Informations de l'API
    """
    return jsonify({
        'name': 'NeroStack Backend API',
        'version': '1.0.0',
        'description': 'Backend pour la gestion documentaire avec Mayan EDMS et IA locale',
        'endpoints': {
            'auth': '/api/auth',
            'users': '/api/users',
            'documents': '/api/documents',
            'access': '/api/access',
            'ai': '/api/ai',
            'health': '/api/health'
        },
        'documentation': '/api/docs'
    }), 200


@health_bp.route('/config', methods=['GET'])
def config_info():
    """
    Informations de configuration (sans données sensibles).
    Utile pour le debugging.
    
    Returns:
        200: Configuration publique
    """
    return jsonify({
        'debug': current_app.debug,
        'mayan_url': current_app.config.get('MAYAN_URL', 'not configured'),
        'ollama_url': current_app.config.get('OLLAMA_URL', 'not configured'),
        'ollama_model': current_app.config.get('OLLAMA_MODEL', 'not configured'),
        'cors_origins': current_app.config.get('CORS_ORIGINS', [])
    }), 200

