#!/bin/bash
# Script d'initialisation pour créer la base de données du backend NeroStack
# Ce script est exécuté automatiquement par PostgreSQL au premier démarrage

set -e

# Créer l'utilisateur et la base de données pour le backend
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Créer l'utilisateur pour le backend
    CREATE USER nerostack WITH PASSWORD 'nerostack_password';
    
    -- Créer la base de données
    CREATE DATABASE nerostack_db OWNER nerostack;
    
    -- Accorder les privilèges
    GRANT ALL PRIVILEGES ON DATABASE nerostack_db TO nerostack;
    
    -- Se connecter à la nouvelle base et configurer les permissions
    \c nerostack_db
    GRANT ALL ON SCHEMA public TO nerostack;
EOSQL

echo "✅ Base de données nerostack_db créée avec succès!"

