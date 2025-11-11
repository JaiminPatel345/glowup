#!/bin/bash

# GrowUp Mobile App - Linux/macOS Setup Script
# This script sets up the complete development environment

set -e  # Exit on any error

echo "🚀 GrowUp Mobile App - Development Environment Setup"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Docker
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command_exists docker compose && ! docker compose version >/dev/null 2>&1; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        echo "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    # Check Node.js
    if ! command_exists node; then
        print_warning "Node.js is not installed. Installing via package manager..."
        if command_exists apt-get; then
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command_exists brew; then
            brew install node
        else
            print_error "Please install Node.js manually: https://nodejs.org/"
            exit 1
        fi
    fi
    
    # Check Python
    if ! command_exists python3; then
        print_warning "Python 3 is not installed. Installing via package manager..."
        if command_exists apt-get; then
            sudo apt-get update
            sudo apt-get install -y python3 python3-pip
        elif command_exists brew; then
            brew install python
        else
            print_error "Please install Python 3 manually: https://python.org/"
            exit 1
        fi
    fi
    
    # Check Git
    if ! command_exists git; then
        print_error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    print_success "All prerequisites are satisfied!"
}

# Create environment files
create_env_files() {
    print_status "Creating environment configuration files..."
    
    # Main environment file
    if [ ! -f .env ]; then
        cat > .env << EOF
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
SKIN_SERVICE_PORT=3003
HAIR_SERVICE_PORT=3004
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
EOF
        print_success "Created .env file"
    else
        print_warning ".env file already exists, skipping creation"
    fi
    
    # Service-specific environment files
    mkdir -p services/auth-service
    if [ ! -f services/auth-service/.env ]; then
        cat > services/auth-service/.env << EOF
DATABASE_URL=postgresql://postgres:growup_dev_password@localhost:5432/growup
JWT_SECRET=your_jwt_secret_key_change_in_production
REDIS_URL=redis://localhost:6379
PORT=3001
NODE_ENV=development
EOF
        print_success "Created auth service .env file"
    fi
    
    mkdir -p services/skin-analysis-service
    if [ ! -f services/skin-analysis-service/.env ]; then
        cat > services/skin-analysis-service/.env << EOF
MONGODB_URI=mongodb://localhost:27017/growup
MODEL_PATH=/app/models
PORT=3003
ENVIRONMENT=development
LOG_LEVEL=INFO
EOF
        print_success "Created skin analysis service .env file"
    fi
    
    mkdir -p services/hair-tryOn-service
    if [ ! -f services/hair-tryOn-service/.env ]; then
        cat > services/hair-tryOn-service/.env << EOF
MONGODB_URI=mongodb://localhost:27017/growup
MODEL_PATH=/app/models
PORT=3004
ENVIRONMENT=development
LOG_LEVEL=INFO
WEBSOCKET_ENABLED=true
EOF
        print_success "Created hair try-on service .env file"
    fi
}

# Pull AI models from GitHub
pull_ai_models() {
    print_status "Setting up AI models directory..."
    
    mkdir -p models
    cd models
    
    # Create placeholder files for AI models
    if [ ! -f skin_analysis_model.pkl ]; then
        print_status "Creating placeholder for skin analysis model..."
        echo "# Skin Analysis Model Placeholder" > skin_analysis_model.pkl
        echo "# Replace this with actual model file" >> skin_analysis_model.pkl
        print_warning "Placeholder created for skin analysis model"
        print_status "To use actual models, download from:"
        echo "  - Hugging Face: https://huggingface.co/models"
        echo "  - GitHub releases of skin analysis models"
    fi
    
    if [ ! -f hair_fastgan_model.pth ]; then
        print_status "Creating placeholder for HairFastGAN model..."
        echo "# HairFastGAN Model Placeholder" > hair_fastgan_model.pth
        echo "# Replace this with actual model file" >> hair_fastgan_model.pth
        print_warning "Placeholder created for HairFastGAN model"
        print_status "To use actual models, download from:"
        echo "  - Official HairFastGAN repository"
        echo "  - Pre-trained model releases"
    fi
    
    cd ..
    print_success "AI models directory prepared"
}

# Install dependencies
install_dependencies() {
    print_status "Installing project dependencies..."
    
    # Install root dependencies
    if [ -f package.json ]; then
        yarn install
        print_success "Root dependencies installed"
    fi
    
    # Install service dependencies (when they exist)
    for service_dir in services/*/; do
        if [ -f "${service_dir}package.json" ]; then
            print_status "Installing dependencies for $(basename "$service_dir")"
            cd "$service_dir"
            yarn install
            cd - > /dev/null
        fi
    done
    
    # Install Python dependencies for AI services
    if [ -f requirements.txt ]; then
        print_status "Installing Python dependencies..."
        pip3 install -r requirements.txt
        print_success "Python dependencies installed"
    fi
}

# Setup Docker environment
setup_docker() {
    print_status "Setting up Docker development environment..."
    
    # Stop any existing containers
    print_status "Stopping existing containers..."
    docker compose down 2>/dev/null || true
    
    # Build and start services
    print_status "Building and starting Docker services..."
    docker compose up -d --build
    
    # Wait for databases to be ready
    print_status "Waiting for databases to be ready..."
    sleep 10
    
    # Check if services are running
    if docker compose ps | grep -q "Up"; then
        print_success "Docker services are running"
    else
        print_error "Some Docker services failed to start"
        docker compose logs
        exit 1
    fi
}

# Initialize databases
initialize_databases() {
    print_status "Initializing databases..."
    
    # Wait a bit more for databases to be fully ready
    sleep 5
    
    # Run PostgreSQL migrations
    if [ -f scripts/migrate-postgres.js ]; then
        print_status "Running PostgreSQL migrations..."
        node scripts/migrate-postgres.js
        print_success "PostgreSQL migrations completed"
    fi
    
    # Initialize MongoDB
    if [ -f scripts/init-mongodb.js ]; then
        print_status "Initializing MongoDB collections..."
        node scripts/init-mongodb.js
        print_success "MongoDB initialization completed"
    fi
}

# Verify setup
verify_setup() {
    print_status "Verifying setup..."
    
    # Check Docker services
    print_status "Checking Docker services..."
    docker compose ps
    
    # Check database connections
    print_status "Testing database connections..."
    
    # Test PostgreSQL
    if docker compose exec -T postgres psql -U postgres -d growup -c "SELECT 1;" >/dev/null 2>&1; then
        print_success "PostgreSQL connection: OK"
    else
        print_error "PostgreSQL connection: FAILED"
    fi
    
    # Test MongoDB
    if docker compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        print_success "MongoDB connection: OK"
    else
        print_error "MongoDB connection: FAILED"
    fi
    
    print_success "Setup verification completed!"
}

# Display next steps
show_next_steps() {
    echo ""
    echo "🎉 Setup completed successfully!"
    echo "================================"
    echo ""
    echo "Next steps:"
    echo "1. Review the generated .env files and update API keys if needed"
    echo "2. Replace AI model placeholders in ./models/ with actual model files"
    echo "3. Start developing individual services"
    echo ""
    echo "Useful commands:"
    echo "  docker compose up -d          # Start all services"
    echo "  docker compose down           # Stop all services"
    echo "  docker compose logs [service] # View service logs"
    echo "  yarn dev                      # Start development (when implemented)"
    echo ""
    echo "Services will be available at:"
    echo "  - API Gateway: http://localhost"
    echo "  - Auth Service: http://localhost:3001"
    echo "  - Skin Analysis: http://localhost:3003"
    echo "  - Hair Try-On: http://localhost:3004"
    echo "  - PostgreSQL: localhost:5432"
    echo "  - MongoDB: localhost:27017"
    echo "  - Redis: localhost:6379"
    echo ""
    echo "For more information, see SETUP.md"
}

# Main execution
main() {
    echo "Starting setup process..."
    
    check_prerequisites
    create_env_files
    pull_ai_models
    install_dependencies
    setup_docker
    initialize_databases
    verify_setup
    show_next_steps
    
    print_success "GrowUp development environment is ready! 🚀"
}

# Run main function
main "$@"
