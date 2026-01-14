#!/bin/bash

# SocialScour Stop Script
# This script stops both backend and frontend services

set -e

echo "🛑 Stopping SocialScour services..."

# Read PIDs from file
if [ -f ".pids" ]; then
    PIDS=$(cat .pids)
    for PID in $PIDS; do
        if kill -0 $PID 2>/dev/null; then
            echo "🛑 Stopping process $PID..."
            kill $PID 2>/dev/null || true
        fi
    done
    rm .pids
    echo "✅ All services stopped"
else
    echo "ℹ️  No PID file found, attempting to stop processes on ports 8000 and 5173..."
    
    # Find and kill processes on backend port
    BACKEND_PID=$(lsof -ti :8000)
    if [ ! -z "$BACKEND_PID" ]; then
        echo "🛑 Stopping backend process $BACKEND_PID..."
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    # Find and kill processes on frontend port
    FRONTEND_PID=$(lsof -ti :5173)
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "🛑 Stopping frontend process $FRONTEND_PID..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    echo "✅ Services stopped"
fi

echo ""
echo "📋 To start services again, run: ./start.sh"