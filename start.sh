#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=================================================="
echo "   Starting Toxic Cybercafe Admin (Game + AI)   "
echo "=================================================="

# Function to stop background processes on Ctrl+C or termination
cleanup() {
    echo ""
    echo "=================================================="
    echo "   Shutting down services...                      "
    echo "=================================================="
    
    if [ -n "$BACKEND_PID" ]; then
        echo "Stopping Backend (PID: $BACKEND_PID)..."
        kill "$BACKEND_PID" 2>/dev/null
    fi
    
    if [ -n "$FRONTEND_PID" ]; then
        echo "Stopping Frontend (PID: $FRONTEND_PID)..."
        kill "$FRONTEND_PID" 2>/dev/null
    fi
    
    echo "Shutdown complete. Goodbye!"
    exit 0
}

# Trap SIGINT (Ctrl+C), SIGTERM, and EXIT to ensure clean shutdown
trap cleanup SIGINT SIGTERM EXIT

# 1. Start Backend in the background
echo "-> Launching Backend..."
cd "$SCRIPT_DIR/backend"
if [ -f "run.sh" ]; then
    chmod +x run.sh
    ./run.sh &
    BACKEND_PID=$!
    echo "✓ Backend started (PID: $BACKEND_PID)"
else
    echo "❌ Error: backend/run.sh not found!"
    exit 1
fi

# 2. Start Frontend in the background
echo "-> Launching Frontend..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "✓ Frontend started (PID: $FRONTEND_PID)"

echo "=================================================="
echo " Both services are running. Press Ctrl+C to stop. "
echo "=================================================="
echo ""

# Keep script running to show logs and catch Ctrl+C
wait
