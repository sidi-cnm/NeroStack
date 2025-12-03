#!/usr/bin/env python3
"""
Script d'initialisation de la base de données
Crée les tables et l'utilisateur admin par défaut
"""
import os
import sys

# Ajouter le répertoire courant au path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models import db
from models.user import User


def init_database():
    """Initialise la base de données avec les données de base"""
    app = create_app()
    
    with app.app_context():
        # Créer toutes les tables
        db.create_all()
        print("✅ Tables créées avec succès")
        
        # Créer l'utilisateur admin par défaut
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User.create_user(
                username='admin',
                email='admin@nerostack.local',
                password='admin123',
                first_name='Admin',
                last_name='NeroStack',
                role='admin'
            )
            print(f"✅ Administrateur créé: {admin.username}")
            print("   Email: admin@nerostack.local")
            print("   Mot de passe: admin123")
            print("   ⚠️  Changez ce mot de passe en production!")
        else:
            print(f"ℹ️  Administrateur existant: {admin.username}")
        
        # Créer un utilisateur de test
        test_user = User.query.filter_by(username='testuser').first()
        if not test_user:
            test_user = User.create_user(
                username='testuser',
                email='test@nerostack.local',
                password='test123',
                first_name='Test',
                last_name='User',
                role='user'
            )
            print(f"✅ Utilisateur test créé: {test_user.username}")
            print("   Email: test@nerostack.local")
            print("   Mot de passe: test123")
        else:
            print(f"ℹ️  Utilisateur test existant: {test_user.username}")
        
        print("\n✅ Initialisation terminée!")


if __name__ == '__main__':
    init_database()

