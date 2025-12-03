"""
Configuration de l'application Flask
"""
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Configuration de base"""
    
    # Clé secrète pour les sessions et JWT
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    
    # Configuration JWT
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION = ['headers', 'cookies']
    JWT_COOKIE_SECURE = os.getenv('JWT_COOKIE_SECURE', 'False').lower() == 'true'
    JWT_COOKIE_CSRF_PROTECT = True
    
    # Configuration Base de données PostgreSQL
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL', 
        'postgresql://nerostack:nerostack_password@db:5432/nerostack_db'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Configuration Mayan EDMS
    MAYAN_URL = os.getenv('MAYAN_URL', 'http://mayan:8000')
    MAYAN_ADMIN_USER = os.getenv('MAYAN_ADMIN_USER', 'admin')
    MAYAN_ADMIN_PASSWORD = os.getenv('MAYAN_ADMIN_PASSWORD', 'admin')
    
    # Configuration Ollama (IA Locale)
    OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://service_ia_locale:11434')
    OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llama3.2')
    
    # Configuration CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://votre_client:3000').split(',')
    
    # Rate Limiting
    RATELIMIT_STORAGE_URL = os.getenv('REDIS_URL', 'memory://')
    RATELIMIT_DEFAULT = "200 per day"
    RATELIMIT_HEADERS_ENABLED = True


class DevelopmentConfig(Config):
    """Configuration de développement"""
    DEBUG = True
    JWT_COOKIE_SECURE = False


class ProductionConfig(Config):
    """Configuration de production"""
    DEBUG = False
    JWT_COOKIE_SECURE = True


class TestingConfig(Config):
    """Configuration de test"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'TEST_DATABASE_URL',
        'postgresql://nerostack:nerostack_password@db:5432/nerostack_test_db'
    )


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

