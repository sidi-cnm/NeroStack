#!/bin/bash

# Chemin du fichier de configuration à l'intérieur du conteneur
CONFIG_FILE="/var/lib/mayan/config.yml"


echo "Démarrage du script d'initialisation de Mayan : Mise à jour de Celery vers Redis..."

if [ -f "$CONFIG_FILE" ]; then
    echo "Fichier de configuration trouvé. Remplacement des valeurs Celery..."

    # 1. Remplacer 'CELERY_BROKER_URL: memory://' par la valeur Redis
    # Note : On utilise '|' comme délimiteur dans sed car le chemin contient des '/'
    sed -i 's|CELERY_BROKER_URL: memory://|CELERY_BROKER_URL: redis://redis:6379/0|g' "$CONFIG_FILE"

    # 2. Remplacer 'CELERY_RESULT_BACKEND: null' par la valeur Redis
    sed -i 's|CELERY_RESULT_BACKEND: null|CELERY_RESULT_BACKEND: redis://redis:6379/1|g' "$CONFIG_FILE"
    
    echo "✅ Entrées Celery mises à jour dans le fichier de configuration monté."
else
    echo "Avertissement : Fichier de configuration non trouvé. Vérifiez le montage du volume."
fi

# Exécuter la commande de démarrage originale de Mayan pour lancer Mayan EDMS
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/mayan-edms.conf