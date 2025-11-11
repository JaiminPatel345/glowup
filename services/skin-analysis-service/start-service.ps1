# Quick start script for Hair Try-On service (PowerShell)

Write-Host "Starting Hair Try-On Service..." -ForegroundColor Green

# Check if virtual environment exists
if (-not (Test-Path "venv")) {
    Write-Host "Error: Virtual environment not found. Please run setup-hairfastgan.ps1 first." -ForegroundColor Red
    exit 1
}

# Activate virtual environment
& ".\venv\Scripts\Activate.ps1"

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "Please edit .env and add your PERFECTCORP_API_KEY" -ForegroundColor Yellow
}

# Start service
Write-Host "Starting uvicorn server on http://localhost:3003" -ForegroundColor Green
Write-Host "API documentation: http://localhost:3003/docs" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
