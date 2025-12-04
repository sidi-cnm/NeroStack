#!/bin/bash

# Le serveur Ollama est déjà démarré et prêt (géré par l'entrypoint)
# Pas besoin d'attendre ici car l'entrypoint s'en charge

# Nom du modèle à vérifier et à télécharger
MODEL_NAME="tinyllama:1.1b-chat-v0.6-q4_1"

# Vérifie si le modèle est déjà présent
# La vérification est plus robuste en cherchant le nom du modèle exact
if ! ollama list | grep -q "$MODEL_NAME"; then
    echo "Le modèle $MODEL_NAME n'est pas trouvé. Téléchargement en cours..."
    # Téléchargement
    ollama pull $MODEL_NAME
    if [ $? -eq 0 ]; then
        echo "Téléchargement de $MODEL_NAME terminé avec succès."
    else
        echo "Échec du téléchargement de $MODEL_NAME. Veuillez vérifier la connexion réseau."
    fi
else
    echo "Le modèle $MODEL_NAME est déjà présent. Sauter le téléchargement."
fi

# Empêche le script de se terminer si vous souhaitez garder le conteneur actif après l'exécution.
# Cependant, dans une configuration Ollama normale, c'est le processus 'ollama serve' qui maintient le conteneur.
