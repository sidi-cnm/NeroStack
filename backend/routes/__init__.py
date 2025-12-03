"""
Routes de l'application
"""
from routes.auth import auth_bp
from routes.users import users_bp
from routes.documents import documents_bp
from routes.access import access_bp
from routes.ai import ai_bp
from routes.health import health_bp

__all__ = ['auth_bp', 'users_bp', 'documents_bp', 'access_bp', 'ai_bp', 'health_bp']

