#!/bin/bash
# Wrapper pour l'entrypoint Mayan qui exécute le script d'initialisation

# Exécuter le script d'initialisation en arrière-plan avec bash directement
bash /usr/local/bin/init_mayan_admin.sh &

# Exécuter l'entrypoint original de Mayan
exec /usr/local/bin/entrypoint.sh run_all

