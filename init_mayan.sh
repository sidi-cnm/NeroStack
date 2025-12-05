#!/bin/bash
# Script d'initialisation pour Mayan - Crée l'utilisateur admin
# Ce script s'exécute automatiquement au démarrage de Mayan

echo "🔧 Initialisation de Mayan - Création de l'utilisateur admin..."

# Attendre que Mayan soit complètement prêt (migrations, etc.)
echo "⏳ Attente que Mayan soit prêt..."
sleep 45

# Vérifier que Django est accessible
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if python3 -c "import django; django.setup()" 2>/dev/null; then
        echo "✅ Django est prêt"
        break
    fi
    attempt=$((attempt + 1))
    sleep 2
done

# Exécuter le script Python pour créer l'utilisateur admin
cd /opt/mayan-edms && python3 << 'PYTHON_EOF'
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mayan.settings.production')

try:
    django.setup()
except Exception as e:
    print(f"Erreur Django setup: {e}")
    sys.exit(1)

from django.contrib.auth import get_user_model
User = get_user_model()

username = 'admin'
password = 'admin'
email = 'admin@example.com'

try:
    admin = User.objects.filter(username=username).first()

    if admin:
        admin.set_password(password)
        admin.is_superuser = True
        admin.is_staff = True
        admin.is_active = True
        admin.email = email
        admin.save()
        print('✅ Admin password reset')
    else:
        admin = User.objects.create_superuser(username, email, password)
        print('✅ Admin user created')

    test = User.objects.get(username=username)
    if test.check_password(password):
        print('✅ Password verification: OK')
    print(f'Username: {username}, Password: {password}')

except Exception as e:
    print(f'❌ Erreur: {e}')
    import traceback
    traceback.print_exc()
    sys.exit(1)
PYTHON_EOF

echo "✅ Initialisation terminée"

