#!/usr/bin/env python3
"""
Script d'initialisation pour créer l'utilisateur admin de Mayan EDMS
À exécuter dans le conteneur Mayan au démarrage
"""
import os
import sys
import time

# Attendre que Django soit prêt
time.sleep(10)

# Configuration Django pour Mayan
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mayan.settings.production')

try:
    import django
    django.setup()
except Exception as e:
    print(f"Erreur lors de l'initialisation Django: {e}")
    sys.exit(1)

from django.contrib.auth import get_user_model

User = get_user_model()

username = 'admin'
password = 'admin'
email = 'admin@example.com'

try:
    admin = User.objects.filter(username=username).first()
    
    if admin:
        # L'utilisateur existe, réinitialiser le mot de passe
        admin.set_password(password)
        admin.is_superuser = True
        admin.is_staff = True
        admin.is_active = True
        admin.email = email
        admin.save()
        print(f"✅ Utilisateur '{username}' mis à jour")
    else:
        # Créer un nouvel utilisateur admin
        admin = User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
        print(f"✅ Utilisateur admin '{username}' créé")
    
    # Vérifier que le mot de passe fonctionne
    test_user = User.objects.get(username=username)
    if test_user.check_password(password):
        print(f"✅ Vérification: Le mot de passe fonctionne")
    else:
        print(f"❌ Erreur: Le mot de passe ne fonctionne pas")
    
    print(f"📋 Informations de connexion:")
    print(f"   Username: {username}")
    print(f"   Password: {password}")
    
except Exception as e:
    print(f"❌ Erreur: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

