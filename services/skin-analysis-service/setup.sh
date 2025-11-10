#!/bin/bash
# Skin Analysis ML Model Setup Script for Linux
# This script sets up the development environment for the skin analysis service

# Set non-interactive mode for Docker
export DEBIAN_FRONTEND=noninteractive
set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}[Step $1/$2]${NC} $3"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo "=========================================="
echo "  Skin Analysis ML Model Setup (Linux)"
echo "=========================================="
echo ""

# Step 1: Check Python version
print_step 1 8 "Checking Python installation..."

if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed"
    echo "Please install Python 3.8 or higher and try again"
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1 | grep -oP '\d+\.\d+' | head -1)
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)

print_success "Found Python $PYTHON_VERSION"

# Check if Python version is 3.8 or higher
if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
    print_error "Python 3.8 or higher is required (found $PYTHON_VERSION)"
    exit 1
fi

print_success "Python version check passed (3.8+ required)"
echo ""

# Step 2: Create virtual environment
print_step 2 8 "Setting up virtual environment..."

# Skip virtual environment in Docker
if [ -n "$DOCKER_BUILD" ] || [ -f "/.dockerenv" ]; then
    print_success "Running in Docker - skipping virtual environment"
else
    if [ -d "venv" ]; then
        print_warning "Virtual environment already exists"
        if [ -t 0 ]; then  # Check if interactive
            read -p "Do you want to recreate it? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                print_warning "Removing existing virtual environment..."
                rm -rf venv
                python3 -m venv venv
                print_success "Virtual environment recreated"
            else
                print_success "Using existing virtual environment"
            fi
        else
            print_success "Using existing virtual environment"
        fi
    else
        python3 -m venv venv
        print_success "Virtual environment created"
    fi

    # Activate virtual environment
    source venv/bin/activate
    print_success "Virtual environment activated"
fi
echo ""

# Step 3: Upgrade pip
print_step 3 8 "Upgrading pip..."
python -m pip install --upgrade pip --quiet
print_success "pip upgraded to latest version"
echo ""

# Step 4: Detect GPU and install PyTorch
print_step 4 8 "Detecting hardware and installing PyTorch..."

GPU_AVAILABLE=false
if command -v nvidia-smi &> /dev/null; then
    if nvidia-smi &> /dev/null; then
        GPU_AVAILABLE=true
        print_success "NVIDIA GPU detected"
        nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader | while read line; do
            echo "  GPU: $line"
        done
    else
        print_warning "nvidia-smi found but failed to query GPU"
    fi
else
    print_warning "nvidia-smi not found - no NVIDIA GPU detected"
fi

echo ""
if [ "$GPU_AVAILABLE" = true ]; then
    echo "Installing PyTorch with CUDA 11.8 support..."
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118 --quiet
    print_success "PyTorch with CUDA support installed"
else
    echo "Installing CPU-only PyTorch..."
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu --quiet
    print_success "PyTorch (CPU-only) installed"
fi
echo ""

# Step 5: Install dependencies
print_step 5 8 "Installing project dependencies..."

if [ ! -f "requirements.txt" ]; then
    print_error "requirements.txt not found"
    exit 1
fi

# Install dependencies excluding torch and torchvision (already installed)
grep -v "^torch" requirements.txt | grep -v "^torchvision" > /tmp/requirements_filtered.txt
pip install -r /tmp/requirements_filtered.txt --quiet
rm /tmp/requirements_filtered.txt

print_success "All dependencies installed"
echo ""

# Step 6: Create necessary directories
print_step 6 8 "Creating project directories..."

mkdir -p models
mkdir -p models/cache
mkdir -p scripts
mkdir -p uploads
mkdir -p app/ml

print_success "Project directories created"
echo ""

# Step 7: Download models
print_step 7 8 "Downloading ML models..."

if [ -f "scripts/download_models.py" ]; then
    echo "Running model download script..."
    source venv/bin/activate
    python scripts/download_models.py --model efficientnet_b0 --verify || {
        print_warning "Model download script failed or models already exist"
        echo "You can manually run: source venv/bin/activate && python scripts/download_models.py"
    }
else
    print_warning "Model download script not found at scripts/download_models.py"
    echo "Please ensure the model download script is implemented"
    echo "You can run it manually later: source venv/bin/activate && python scripts/download_models.py"
fi
echo ""

# Step 8: Run validation tests
print_step 8 8 "Running validation tests..."

if [ -f "scripts/validate_model.py" ]; then
    echo "Running model validation..."
    source venv/bin/activate
    python scripts/validate_model.py || {
        print_warning "Model validation failed"
        echo "This is expected if models haven't been downloaded yet"
    }
elif [ -f "validate_service.py" ]; then
    echo "Running service validation..."
    source venv/bin/activate
    python validate_service.py || {
        print_warning "Service validation encountered issues"
    }
else
    print_warning "Validation script not found"
    echo "Skipping validation - you can run tests manually with: pytest tests/"
fi
echo ""

# Final summary
echo "=========================================="
echo "          Setup Complete!"
echo "=========================================="
echo ""
print_success "Environment configured successfully"
echo ""
echo "System Information:"
echo "  Python Version: $PYTHON_VERSION"
echo "  GPU Available: $GPU_AVAILABLE"
echo "  Virtual Environment: $(pwd)/venv"
echo ""
echo "Next Steps:"
echo "  1. Activate the virtual environment:"
echo "     ${GREEN}source venv/bin/activate${NC}"
echo ""
echo "  2. Start the development server:"
echo "     ${GREEN}uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload${NC}"
echo ""
echo "  3. Run tests:"
echo "     ${GREEN}pytest tests/ -v${NC}"
echo ""
echo "  4. View API documentation:"
echo "     ${GREEN}http://localhost:8000/docs${NC}"
echo ""
echo "For troubleshooting, check the README.md file"
echo "=========================================="
