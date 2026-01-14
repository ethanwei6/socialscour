#!/bin/bash

# SocialScour Startup Script
# This script starts both backend and frontend services

set -e

echo "🚀 Starting SocialScour Enterprise Edition..."

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Warning: backend/.env file not found"
    echo "Please copy backend/.env.example to backend/.env and configure your API keys"
    exit 1
fi

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "❌ Port $1 is already in use"
        return 1
    fi
    return 0
}

# Check if ports are available
echo "🔍 Checking ports..."
check_port 8000 || exit 1
check_port 5173 || exit 1

# Start backend
echo "📡 Starting backend server..."
cd backend
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt >/dev/null 2>&1 &

echo "⏳ Installing backend dependencies..."
wait

echo "✅ Backend dependencies installed"
nohup uvicorn main:app --reload --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if ! curl -s http://localhost:8000/health >/dev/null; then
    echo "❌ Backend failed to start"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo "✅ Backend started successfully (PID: $BACKEND_PID)"

# Start frontend
echo "🎨 Starting frontend server..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install >/dev/null 2>&1
fi

echo "✅ Frontend dependencies installed"
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 10

# Check if frontend is running
if ! curl -s http://localhost:5173 >/dev/null; then
    echo "❌ Frontend failed to start"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

echo "✅ Frontend started successfully (PID: $FRONTEND_PID)"

# Create PID file
echo "$BACKEND_PID $FRONTEND_PID" > .pids

echo ""
echo "🎉 SocialScour is now running!"
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend: http://localhost:8000"
echo "📊 API Docs: http://localhost:8000/docs"
echo ""
echo "📋 To stop the services, run: ./stop.sh"
echo "📋 To check logs, run: ./logs.sh"
echo ""
echo "Happy analyzing! 🚀"