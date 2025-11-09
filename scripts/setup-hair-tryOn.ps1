# Hair Try-On Service Setup Script for Windows
# This script sets up the hair try-on service with all dependencies

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Hair Try-On Service Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ $pythonVersion found" -ForegroundColor Green
} catch {
    Write-Host "Error: Python 3 is not installed" -ForegroundColor Red
    Write-Host "Please install Python 3.11 or higher from https://www.python.org/downloads/"
    exit 1
}

# Navigate to hair-tryOn-service directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$servicePath = Join-Path (Split-Path -Parent $scriptPath) "services\hair-tryOn-service"
Set-Location $servicePath

Write-Host ""
Write-Host "Step 1: Creating virtual environment..." -ForegroundColor Yellow
if (-not (Test-Path "venv")) {
    python -m venv venv
    Write-Host "✓ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "Virtual environment already exists" -ForegroundColor Yellow
}

# Activate virtual environment
& ".\venv\Scripts\Activate.ps1"

Write-Host ""
Write-Host "Step 2: Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip setuptools wheel

Write-Host ""
Write-Host "Step 3: Installing Python dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

Write-Host ""
Write-Host "Step 4: Installing additional dependencies for hair try-on..." -ForegroundColor Yellow
pip install replicate requests aiohttp

Write-Host ""
Write-Host "Step 5: Creating necessary directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "models" | Out-Null
New-Item -ItemType Directory -Force -Path "uploads" | Out-Null
New-Item -ItemType Directory -Force -Path "temp" | Out-Null

Write-Host ""
Write-Host "Step 6: Setting up environment variables..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "⚠ Please edit .env file and add your REPLICATE_API_TOKEN" -ForegroundColor Yellow
    Write-Host "  Get your free API token from: https://replicate.com/account/api-tokens" -ForegroundColor Yellow
} else {
    Write-Host "✓ .env file already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 7: Validating installation..." -ForegroundColor Yellow
try {
    python -c "import fastapi, cv2, numpy, PIL, replicate; print('All packages imported successfully')"
    Write-Host "✓ All dependencies installed correctly" -ForegroundColor Green
} catch {
    Write-Host "✗ Some dependencies failed to install" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Get a free Replicate API token from: https://replicate.com/account/api-tokens"
Write-Host "2. Add it to services\hair-tryOn-service\.env as REPLICATE_API_TOKEN=your_token_here"
Write-Host "3. Start the service with: cd services\hair-tryOn-service; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload"
Write-Host ""
Write-Host "Or use Docker Compose: docker-compose up hair-tryOn-service"
Write-Host ""
