#!/bin/bash
# Start the Hair Try-On service

# Activate virtual environment and start service
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 3004 --reload
