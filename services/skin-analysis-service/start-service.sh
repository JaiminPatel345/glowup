#!/usr/bin/env bash
# Quick start script for Hair Try-On service

set -e

echo "Starting Hair Try-On Service..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Error: Virtual environment not found. make first."
    exit 1
fi

# Activate virtual environment
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "Please edit .env and add your PERFECTCORP_API_KEY"
fi

# Start service
echo "Starting uvicorn server on http://localhost:3003"
echo "API documentation: http://localhost:3003/docs"
echo "Press Ctrl+C to stop"
echo ""

uvicorn app.main:app --host 0.0.0.0 --port 3003 --reload
