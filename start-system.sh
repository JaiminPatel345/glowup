#!/bin/bash

# GlowUp System Startup Script
# This script starts all services in the correct order

echo "🚀 Starting GlowUp Real-time Video Processing System"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    else
        return 0
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}Waiting for $service_name to start on port $port...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${GREEN}✓ $service_name is ready on port $port${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}✗ $service_name failed to start on port $port${NC}"
    return 1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    exit 1
fi

# Check if Python is installed
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python is not installed${NC}"
    exit 1
fi

# Check if yarn is installed
if ! command -v yarn &> /dev/null; then
    echo -e "${RED}✗ Yarn is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites are met${NC}"

# Check if required ports are available
echo "🔍 Checking port availability..."

if ! check_port 50051; then
    echo -e "${RED}✗ Port 50051 (gRPC) is already in use${NC}"
    exit 1
fi

if ! check_port 8080; then
    echo -e "${RED}✗ Port 8080 (Gateway) is already in use${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Required ports are available${NC}"

# Start services
echo "🎬 Starting services..."

# 1. Start Hair Service (Python gRPC)
echo -e "${YELLOW}1. Starting Hair Processing Service...${NC}"
cd server/services/hairService
python app.py &
HAIR_SERVICE_PID=$!
cd ../../..

# Wait for hair service to be ready
if ! wait_for_service 50051 "Hair Service"; then
    echo -e "${RED}Failed to start Hair Service${NC}"
    kill $HAIR_SERVICE_PID 2>/dev/null
    exit 1
fi

# 2. Start Gateway (Node.js WebSocket + gRPC client)
echo -e "${YELLOW}2. Starting Gateway Service...${NC}"
cd server/gateway
yarn dev &
GATEWAY_PID=$!
cd ../..

# Wait for gateway to be ready
if ! wait_for_service 8080 "Gateway Service"; then
    echo -e "${RED}Failed to start Gateway Service${NC}"
    kill $HAIR_SERVICE_PID $GATEWAY_PID 2>/dev/null
    exit 1
fi

# Display system status
echo ""
echo "🎉 GlowUp System is now running!"
echo "================================"
echo -e "${GREEN}✓ Hair Service:${NC} Running on port 50051 (gRPC)"
echo -e "${GREEN}✓ Gateway Service:${NC} Running on port 8080 (WebSocket)"
echo ""
echo "📱 Client Setup:"
echo "   Navigate to the client directory and run:"
echo "   cd client && npx expo start"
echo ""
echo "🔗 Endpoints:"
echo "   Gateway Health: http://localhost:8080/health"
echo "   WebSocket: ws://localhost:8080"
echo ""
echo "📊 Monitoring:"
echo "   Gateway logs: Check the gateway terminal"
echo "   Hair service logs: Check the hair service terminal"
echo ""
echo "🛑 To stop all services:"
echo "   Press Ctrl+C or run: kill $HAIR_SERVICE_PID $GATEWAY_PID"

# Store PIDs for cleanup
echo "$HAIR_SERVICE_PID $GATEWAY_PID" > .pids

# Set up signal handlers for cleanup
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down services...${NC}"
    
    if [ -f .pids ]; then
        PIDS=$(cat .pids)
        for pid in $PIDS; do
            if kill -0 $pid 2>/dev/null; then
                kill $pid
                echo -e "${GREEN}✓ Stopped process $pid${NC}"
            fi
        done
        rm .pids
    fi
    
    echo -e "${GREEN}✓ All services stopped${NC}"
    exit 0
}

# Handle Ctrl+C and other termination signals
trap cleanup SIGINT SIGTERM

# Keep script running
echo "Press Ctrl+C to stop all services..."
wait
