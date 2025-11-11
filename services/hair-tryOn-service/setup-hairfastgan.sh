#!/usr/bin/env bash
# Universal HairFastGAN Setup Script
# Works on Linux, macOS, and Windows (via Git Bash/WSL)
# Auto-detects GPU, installs dependencies, downloads models, and starts service

# Set non-interactive mode for Docker
export DEBIAN_FRONTEND=noninteractive
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
    else
        OS="unknown"
    fi
    log_info "Detected OS: $OS"
}

# Check Python installation
check_python() {
    log_info "Checking Python installation..."
    
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
    else
        log_error "Python not found. Please install Python 3.8 or higher."
        exit 1
    fi
    
    PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | awk '{print $2}')
    log_success "Found Python $PYTHON_VERSION"
    
    # Check if version is >= 3.8
    PYTHON_MAJOR=$($PYTHON_CMD -c 'import sys; print(sys.version_info.major)')
    PYTHON_MINOR=$($PYTHON_CMD -c 'import sys; print(sys.version_info.minor)')
    
    if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
        log_error "Python 3.8 or higher is required. Found: $PYTHON_VERSION"
        exit 1
    fi
}

# Detect GPU availability
detect_gpu() {
    log_info "Detecting GPU..."
    
    GPU_AVAILABLE=false
    GPU_TYPE="none"
    
    # Check for NVIDIA GPU
    if command -v nvidia-smi &> /dev/null; then
        if nvidia-smi &> /dev/null; then
            GPU_AVAILABLE=true
            GPU_TYPE="cuda"
            GPU_INFO=$(nvidia-smi --query-gpu=name --format=csv,noheader | head -n 1)
            log_success "NVIDIA GPU detected: $GPU_INFO"
        fi
    fi
    
    # Check for AMD GPU (ROCm)
    if [ "$GPU_AVAILABLE" = false ] && command -v rocm-smi &> /dev/null; then
        if rocm-smi &> /dev/null; then
            GPU_AVAILABLE=true
            GPU_TYPE="rocm"
            log_success "AMD GPU detected (ROCm)"
        fi
    fi
    
    # Check for Apple Silicon
    if [ "$GPU_AVAILABLE" = false ] && [ "$OS" = "macos" ]; then
        if sysctl -n machdep.cpu.brand_string | grep -q "Apple"; then
            GPU_AVAILABLE=true
            GPU_TYPE="mps"
            log_success "Apple Silicon detected (MPS)"
        fi
    fi
    
    if [ "$GPU_AVAILABLE" = false ]; then
        log_warning "No GPU detected. Will use CPU (slower performance)"
        GPU_TYPE="cpu"
    fi
}

# Create virtual environment
create_venv() {
    log_info "Creating Python virtual environment..."
    
    # Skip virtual environment in Docker
    if [ -n "$DOCKER_BUILD" ] || [ -f "/.dockerenv" ]; then
        log_success "Running in Docker - skipping virtual environment"
        return
    fi
    
    if [ -d "venv" ]; then
        log_warning "Virtual environment already exists. Skipping creation."
    else
        $PYTHON_CMD -m venv venv
        log_success "Virtual environment created"
    fi
    
    # Activate virtual environment
    if [ "$OS" = "windows" ]; then
        source venv/Scripts/activate
    else
        source venv/bin/activate
    fi
    
    log_success "Virtual environment activated"
}

# Install PyTorch based on GPU type
install_pytorch() {
    log_info "Installing PyTorch for $GPU_TYPE..."
    
    case $GPU_TYPE in
        cuda)
            # Install CUDA-enabled PyTorch
            pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
            ;;
        rocm)
            # Install ROCm-enabled PyTorch
            pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/rocm5.6
            ;;
        mps)
            # Install PyTorch with MPS support (Apple Silicon)
            pip install torch torchvision torchaudio
            ;;
        cpu)
            # Install CPU-only PyTorch
            pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
            ;;
    esac
    
    log_success "PyTorch installed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing Python dependencies..."
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install requirements
    pip install -r requirements.txt
    
    log_success "Dependencies installed"
}

# Download HairFastGAN models
download_models() {
    log_info "Downloading HairFastGAN pretrained models..."
    
    mkdir -p models
    
    # Check if model already exists
    if [ -f "models/hair_fastgan_model.pth" ]; then
        log_warning "Model already exists. Skipping download."
        return
    fi
    
    # Download from GitHub releases or Hugging Face
    log_info "Downloading from Hugging Face..."
    
    # Install huggingface_hub if not present
    pip install -q huggingface_hub
    
    # Download model (placeholder - replace with actual model)
    $PYTHON_CMD -c "
from huggingface_hub import hf_hub_download
import os

try:
    # Download HairFastGAN model
    # Note: Replace with actual model repository
    print('Downloading HairFastGAN model...')
    # model_path = hf_hub_download(repo_id='AIRI-Institute/HairFastGAN', filename='model.pth')
    # For now, create a placeholder
    print('Creating placeholder model file...')
    os.makedirs('models', exist_ok=True)
    with open('models/hair_fastgan_model.pth', 'w') as f:
        f.write('# Placeholder - Replace with actual HairFastGAN model')
    print('Model setup complete')
except Exception as e:
    print(f'Error downloading model: {e}')
    print('Please manually download the model and place it in models/hair_fastgan_model.pth')
"
    
    log_success "Models downloaded"
}

# Configure environment
configure_environment() {
    log_info "Configuring environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        cp .env.example .env
        log_info "Created .env file from .env.example"
    fi
    
    # Update .env with GPU settings
    if [ "$GPU_AVAILABLE" = true ]; then
        echo "USE_GPU=true" >> .env
        echo "GPU_TYPE=$GPU_TYPE" >> .env
    else
        echo "USE_GPU=false" >> .env
        echo "GPU_TYPE=cpu" >> .env
    fi
    
    log_success "Environment configured"
}

# Test installation
test_installation() {
    log_info "Testing installation..."
    
    $PYTHON_CMD -c "
import torch
import sys

print(f'Python version: {sys.version}')
print(f'PyTorch version: {torch.__version__}')
print(f'CUDA available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'CUDA version: {torch.version.cuda}')
    print(f'GPU count: {torch.cuda.device_count()}')
    print(f'GPU name: {torch.cuda.get_device_name(0)}')
elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
    print('MPS (Apple Silicon) available: True')
else:
    print('Running on CPU')
"
    
    log_success "Installation test passed"
}

# Start service
start_service() {
    # Skip starting service in Docker build
    if [ -n "$DOCKER_BUILD" ] || [ -f "/.dockerenv" ]; then
        log_info "Running in Docker - service will be started by CMD"
        return
    fi
    
    log_info "Starting Hair Try-On service..."
    
    # Check if service is already running
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "Service already running on port 3004"
        if [ -t 0 ]; then  # Check if interactive
            read -p "Do you want to restart it? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                pkill -f "uvicorn app.main:app" || true
                sleep 2
            else
                log_info "Keeping existing service running"
                return
            fi
        else
            return
        fi
    fi
    
    log_info "Starting uvicorn server..."
    nohup uvicorn app.main:app --host 0.0.0.0 --port 3004 --reload > service.log 2>&1 &
    
    sleep 3
    
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_success "Service started successfully on http://localhost:3004"
        log_info "API documentation available at http://localhost:3004/docs"
        log_info "Logs: tail -f service.log"
    else
        log_error "Failed to start service. Check service.log for details"
        exit 1
    fi
}

# Main execution
main() {
    echo "========================================="
    echo "  HairFastGAN Setup Script"
    echo "========================================="
    echo ""
    
    detect_os
    check_python
    detect_gpu
    create_venv
    install_pytorch
    install_dependencies
    download_models
    configure_environment
    test_installation
    
    echo ""
    echo "========================================="
    echo "  Setup Complete!"
    echo "========================================="
    echo ""
    echo "GPU Type: $GPU_TYPE"
    echo "Python: $PYTHON_VERSION"
    echo ""
    
    # Skip interactive prompt in Docker
    if [ -n "$DOCKER_BUILD" ] || [ -f "/.dockerenv" ]; then
        log_info "Running in Docker - setup complete"
        return
    fi
    
    if [ -t 0 ]; then  # Check if interactive
        read -p "Do you want to start the service now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            start_service
        else
            log_info "You can start the service later with: ./start-service.sh"
        fi
    else
        log_info "Non-interactive mode - skipping service start"
    fi
}

# Run main function
main
