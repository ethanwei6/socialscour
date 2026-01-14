#!/bin/bash

# SocialScour Logs Script
# This script shows logs from both backend and frontend services

echo "📋 SocialScour Logs"
echo "=================="

echo ""
echo "🔧 Backend Logs (backend/backend.log):"
echo "----------------------------------------"
if [ -f "backend/backend.log" ]; then
    tail -n 50 backend/backend.log
else
    echo "No backend log file found"
fi

echo ""
echo "🎨 Frontend Logs (frontend/frontend.log):"
echo "-----------------------------------------"
if [ -f "frontend/frontend.log" ]; then
    tail -n 50 frontend/frontend.log
else
    echo "No frontend log file found"
fi

echo ""
echo "💡 To follow logs in real-time, use:"
echo "   tail -f backend/backend.log"
echo "   tail -f frontend/frontend.log"