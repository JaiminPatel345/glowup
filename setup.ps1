# GrowUp Mobile App - Windows PowerShell Setup Script
# This script sets up the complete development environment on Windows

param(
    [switch]$SkipPrerequisites = $false,
    [switch]$Verbose = $false
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Colors.Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

# Function to check if command exists
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Check prerequisites
function Test-Prerequisites {
    Write-Status "Checking prerequisites..."
    
    $missingTools = @()
    
    # Check Docker
    if (-not (Test-Command "docker")) {
        $missingTools += "Docker Desktop"
        Write-Error "Docker is not installed or not in PATH"
        Write-Host "Please install Docker Desktop from: https://docs.docker.com/desktop/windows/"
    }
    
    # Check Docker Compose
    if (-not (Test-Command "docker-compose") -and -not (docker compose version 2>$null)) {
        $missingTools += "Docker Compose"
        Write-Error "Docker Compose is not available"
    }
    
    # Check Node.js
    if (-not (Test-Command "node")) {
        $missingTools += "Node.js"
        Write-Error "Node.js is not installed"
        Write-Host "Please install Node.js from: https://nodejs.org/"
    }
    
    # Check Python
    if (-not (Test-Command "python") -and -not (Test-Command "python3")) {
        $missingTools += "Python 3"
        Write-Error "Python 3 is not installed"
        Write-Host "Please install Python 3 from: https://python.org/"
    }
    
    # Check Git
    if (-not (Test-Command "git")) {
        $missingTools += "Git"
        Write-Error "Git is not installed"
        Write-Host "Please install Git from: https://git-scm.com/"
    }
    
    if ($missingTools.Count -gt 0) {
        Write-Error "Missing required tools: $($missingTools -join ', ')"
        Write-Host "Please install the missing tools and run this script again."
        exit 1
    }
    
    Write-Success "All prerequisites are satisfied!"
}

# Create environment files
function New-EnvironmentFiles {
    Write-Status "Creating environment configuration files..."
    
    # Main environment file
    if (-not (Test-Path ".env")) {
        $envContent = @"
# GrowUp Development Environment Configuration

# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=growup
POSTGRES_USER=postgres
POSTGRES_PASSWORD=growup_dev_password
POSTGRES_MAX_CONNECTIONS=20

MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=growup
MONGODB_MAX_POOL_SIZE=10

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# API Configuration
API_PORT=3000
SKIN_SERVICE_PORT=8001
HAIR_SERVICE_PORT=8002
GATEWAY_PORT=80

# File Upload Configuration
MAX_FILE_SIZE=50MB
UPLOAD_PATH=./uploads

# AI Model Configuration
MODEL_CACHE_DIR=./models
GITHUB_MODEL_PRIORITY=true

# Development Settings
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_CORS=true

# External API Keys (add your keys here)
# HUGGINGFACE_API_KEY=your_key_here
# OPENAI_API_KEY=your_key_here
"@
        $envContent | Out-File -FilePath ".env" -Encoding UTF8
        Write-Success "Created .env file"
    }
    else {
        Write-Warning ".env file already exists, skipping creation"
    }
    
    # Service-specific environment files
    New-Item -ItemType Directory -Force -Path "services\auth-service" | Out-Null
    if (-not (Test-Path "services\auth-service\.env")) {
        $authEnvContent = @"
DATABASE_URL=postgresql://postgres:growup_dev_password@localhost:5432/growup
JWT_SECRET=your_jwt_secret_key_change_in_production
REDIS_URL=redis://localhost:6379
PORT=3001
NODE_ENV=development
"@
        $authEnvContent | Out-File -FilePath "services\auth-service\.env" -Encoding UTF8
        Write-Success "Created auth service .env file"
    }
    
    New-Item -ItemType Directory -Force -Path "services\skin-analysis-service" | Out-Null
    if (-not (Test-Path "services\skin-analysis-service\.env")) {
        $skinEnvContent = @"
MONGODB_URI=mongodb://localhost:27017/growup
MODEL_PATH=/app/models
PORT=8001
ENVIRONMENT=development
LOG_LEVEL=INFO
"@
        $skinEnvContent | Out-File -FilePath "services\skin-analysis-service\.env" -Encoding UTF8
        Write-Success "Created skin analysis service .env file"
    }
    
    New-Item -ItemType Directory -Force -Path "services\hair-tryOn-service" | Out-Null
    if (-not (Test-Path "services\hair-tryOn-service\.env")) {
        $hairEnvContent = @"
MONGODB_URI=mongodb://localhost:27017/growup
MODEL_PATH=/app/models
PORT=8002
ENVIRONMENT=development
LOG_LEVEL=INFO
WEBSOCKET_ENABLED=true
"@
        $hairEnvContent | Out-File -FilePath "services\hair-tryOn-service\.env" -Encoding UTF8
        Write-Success "Created hair try-on service .env file"
    }
}

# Pull AI models
function Initialize-AIModels {
    Write-Status "Setting up AI models directory..."
    
    New-Item -ItemType Directory -Force -Path "models" | Out-Null
    Set-Location "models"
    
    # Create placeholder files for AI models
    if (-not (Test-Path "skin_analysis_model.pkl")) {
        Write-Status "Creating placeholder for skin analysis model..."
        $skinModelContent = @"
# Skin Analysis Model Placeholder
# Replace this with actual model file
"@
        $skinModelContent | Out-File -FilePath "skin_analysis_model.pkl" -Encoding UTF8
        Write-Warning "Placeholder created for skin analysis model"
        Write-Status "To use actual models, download from:"
        Write-Host "  - Hugging Face: https://huggingface.co/models"
        Write-Host "  - GitHub releases of skin analysis models"
    }
    
    if (-not (Test-Path "hair_fastgan_model.pth")) {
        Write-Status "Creating placeholder for HairFastGAN model..."
        $hairModelContent = @"
# HairFastGAN Model Placeholder
# Replace this with actual model file
"@
        $hairModelContent | Out-File -FilePath "hair_fastgan_model.pth" -Encoding UTF8
        Write-Warning "Placeholder created for HairFastGAN model"
        Write-Status "To use actual models, download from:"
        Write-Host "  - Official HairFastGAN repository"
        Write-Host "  - Pre-trained model releases"
    }
    
    Set-Location ".."
    Write-Success "AI models directory prepared"
}

# Install dependencies
function Install-Dependencies {
    Write-Status "Installing project dependencies..."
    
    # Install root dependencies
    if (Test-Path "package.json") {
        yarn install
        Write-Success "Root dependencies installed"
    }
    
    # Install service dependencies (when they exist)
    Get-ChildItem -Path "services" -Directory | ForEach-Object {
        $packageJsonPath = Join-Path $_.FullName "package.json"
        if (Test-Path $packageJsonPath) {
            Write-Status "Installing dependencies for $($_.Name)"
            Set-Location $_.FullName
            yarn install
            Set-Location $PSScriptRoot
        }
    }
    
    # Install Python dependencies for AI services
    if (Test-Path "requirements.txt") {
        Write-Status "Installing Python dependencies..."
        $pythonCmd = if (Test-Command "python") { "python" } else { "python3" }
        & $pythonCmd -m pip install -r requirements.txt
        Write-Success "Python dependencies installed"
    }
}

# Setup Docker environment
function Initialize-Docker {
    Write-Status "Setting up Docker development environment..."
    
    # Stop any existing containers
    Write-Status "Stopping existing containers..."
    try {
        docker-compose down 2>$null
    }
    catch {
        # Ignore errors if no containers are running
    }
    
    # Build and start services
    Write-Status "Building and starting Docker services..."
    docker-compose up -d --build
    
    # Wait for databases to be ready
    Write-Status "Waiting for databases to be ready..."
    Start-Sleep -Seconds 10
    
    # Check if services are running
    $runningServices = docker-compose ps | Select-String "Up"
    if ($runningServices) {
        Write-Success "Docker services are running"
    }
    else {
        Write-Error "Some Docker services failed to start"
        docker-compose logs
        exit 1
    }
}

# Initialize databases
function Initialize-Databases {
    Write-Status "Initializing databases..."
    
    # Wait a bit more for databases to be fully ready
    Start-Sleep -Seconds 5
    
    # Run PostgreSQL migrations
    if (Test-Path "scripts\migrate-postgres.js") {
        Write-Status "Running PostgreSQL migrations..."
        node scripts\migrate-postgres.js
        Write-Success "PostgreSQL migrations completed"
    }
    
    # Initialize MongoDB
    if (Test-Path "scripts\init-mongodb.js") {
        Write-Status "Initializing MongoDB collections..."
        node scripts\init-mongodb.js
        Write-Success "MongoDB initialization completed"
    }
}

# Verify setup
function Test-Setup {
    Write-Status "Verifying setup..."
    
    # Check Docker services
    Write-Status "Checking Docker services..."
    docker-compose ps
    
    # Check database connections
    Write-Status "Testing database connections..."
    
    # Test PostgreSQL
    try {
        docker-compose exec -T postgres psql -U postgres -d growup -c "SELECT 1;" | Out-Null
        Write-Success "PostgreSQL connection: OK"
    }
    catch {
        Write-Error "PostgreSQL connection: FAILED"
    }
    
    # Test MongoDB
    try {
        docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" | Out-Null
        Write-Success "MongoDB connection: OK"
    }
    catch {
        Write-Error "MongoDB connection: FAILED"
    }
    
    Write-Success "Setup verification completed!"
}

# Display next steps
function Show-NextSteps {
    Write-Host ""
    Write-Host "🎉 Setup completed successfully!" -ForegroundColor Green
    Write-Host "================================"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Review the generated .env files and update API keys if needed"
    Write-Host "2. Replace AI model placeholders in .\models\ with actual model files"
    Write-Host "3. Start developing individual services"
    Write-Host ""
    Write-Host "Useful commands:"
    Write-Host "  docker-compose up -d          # Start all services"
    Write-Host "  docker-compose down           # Stop all services"
    Write-Host "  docker-compose logs [service] # View service logs"
    Write-Host "  yarn dev                      # Start development (when implemented)"
    Write-Host ""
    Write-Host "Services will be available at:"
    Write-Host "  - API Gateway: http://localhost"
    Write-Host "  - Auth Service: http://localhost:3001"
    Write-Host "  - Skin Analysis: http://localhost:8001"
    Write-Host "  - Hair Try-On: http://localhost:8002"
    Write-Host "  - PostgreSQL: localhost:5432"
    Write-Host "  - MongoDB: localhost:27017"
    Write-Host "  - Redis: localhost:6379"
    Write-Host ""
    Write-Host "For more information, see SETUP.md"
}

# Main execution
function Main {
    Write-Host "🚀 GrowUp Mobile App - Development Environment Setup" -ForegroundColor Blue
    Write-Host "==================================================="
    Write-Host ""
    
    try {
        if (-not $SkipPrerequisites) {
            Test-Prerequisites
        }
        
        New-EnvironmentFiles
        Initialize-AIModels
        Install-Dependencies
        Initialize-Docker
        Initialize-Databases
        Test-Setup
        Show-NextSteps
        
        Write-Success "GrowUp development environment is ready! 🚀"
    }
    catch {
        Write-Error "Setup failed: $($_.Exception.Message)"
        Write-Host "Stack trace:" -ForegroundColor Red
        Write-Host $_.ScriptStackTrace -ForegroundColor Red
        exit 1
    }
}

# Run main function
Main