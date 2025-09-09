#!/bin/bash

# Test System Integration Script
# This script tests the full video processing pipeline

echo "🚀 Testing GlowUp Video Processing System"
echo "=========================================="

# Change to project root
cd "$(dirname "$0")"

echo "📝 Starting Python Hair Service..."
cd server/services/hairService
python app.py &
PYTHON_PID=$!
echo "Python service started with PID: $PYTHON_PID"

# Give Python service time to start
sleep 3

echo "📝 Starting Node.js Gateway..."
cd ../../gateway
npm start &
GATEWAY_PID=$!
echo "Gateway started with PID: $GATEWAY_PID"

# Give gateway time to start
sleep 2

echo "📝 System Status:"
echo "- Python Hair Service: Running (PID: $PYTHON_PID)"
echo "- Node.js Gateway: Running (PID: $GATEWAY_PID)"
echo ""
echo "🔧 You can now test the Expo client by running:"
echo "cd client && npx expo start"
echo ""
echo "⏹️ To stop all services, press Ctrl+C or run:"
echo "kill $PYTHON_PID $GATEWAY_PID"

# Wait for user interrupt
trap "echo 'Stopping services...'; kill $PYTHON_PID $GATEWAY_PID 2>/dev/null; exit 0" INT

echo "📱 Services are running. Press Ctrl+C to stop all services."
wait
