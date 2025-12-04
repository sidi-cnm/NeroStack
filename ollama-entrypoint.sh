#!/bin/bash
set -e

echo "Starting Ollama server in background..."
# Start Ollama serve in the background
/bin/ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be fully ready and operational
echo "Waiting for Ollama to be ready..."
MAX_WAIT=60
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    # Try to use ollama list to check if the server is ready
    if /bin/ollama list > /dev/null 2>&1; then
        echo "Ollama is ready and operational!"
        break
    fi
    WAIT_COUNT=$((WAIT_COUNT + 1))
    if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
        echo "Warning: Ollama did not become ready in time, but continuing with model installation..."
    fi
    sleep 1
done

# Additional small delay to ensure Ollama is fully stable
sleep 2

# Run the initialization script to download the model (after Ollama is running)
if [ -f /usr/local/bin/init.sh ]; then
    echo "Running initialization script to download LLM model..."
    chmod +x /usr/local/bin/init.sh
    /usr/local/bin/init.sh || echo "Warning: Initialization script had issues, but continuing..."
else
    echo "Warning: init.sh not found at /usr/local/bin/init.sh"
fi

# Keep Ollama running in the foreground
echo "Ollama server is running. Model installation completed."
wait $OLLAMA_PID

