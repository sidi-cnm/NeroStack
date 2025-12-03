"""
Modèles de données de l'application
"""
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from models.user import User
from models.temporary_access import TemporaryAccess
from models.document_analysis import DocumentAnalysis

__all__ = ['db', 'User', 'TemporaryAccess', 'DocumentAnalysis']

