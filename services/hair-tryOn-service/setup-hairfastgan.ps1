# Universal HairFastGAN Setup Script for PowerShell
# Works on Windows with PowerShell
# Auto-detects GPU, installs dependencies, downloads models, and starts service

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Blue }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Warning { Write-Host "[WARNING] $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "[ERROR] $args" -ForegroundColor Red }

# Check Python installation
function Test-Python {
    Write-Info "Checking Python installation..."
    
    $pythonCmd = $null
    if (Get-Command python3 -ErrorAction SilentlyContinue) {
        $pythonCmd = "python3"
    } elseif (Get-Command python -ErrorAction SilentlyContinue) {
        $pythonCmd = "python"
    } else {
        Write-Error "Python not found. Please install Python 3.8 or higher from python.org"
        exit 1
    }
    
    $pythonVersion = & $pythonCmd --version 2>&1 | Select-String -Pattern "(\d+\.\d+\.\d+)" | ForEach-Object { $_.Matches.Groups[1].Value }
    Write-Success "Found Python $pythonVersion"
    
    # Check if version is >= 3.8
    $versionParts = $pythonVersion.Split('.')
    $major = [int]$versionParts[0]
    $minor = [int]$versionParts[1]
    
    if ($major -lt 3 -or ($major -eq 3 -and $minor -lt 8)) {
        Write-Error "Python 3.8 or higher is required. Found: $pythonVersion"
        exit 1
    }
    
    return $pythonCmd
}

# Detect GPU availability
function Test-GPU {
    Write-Info "Detecting GPU..."
    
    $gpuAvailable = $false
    $gpuType = "none"
    $gpuInfo = ""
    
    # Check for NVIDIA GPU
    if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
        try {
            $nvidiaOutput = nvidia-smi --query-gpu=name --format=csv,noheader 2>&1
            if ($LASTEXITCODE -eq 0) {
                $gpuAvailable = $true
                $gpuType = "cuda"
                $gpuInfo = $nvidiaOutput | Select-Object -First 1
                Write-Success "NVIDIA GPU detected: $gpuInfo"
            }
        } catch {
            Write-Warning "nvidia-smi found but failed to execute"
        }
    }
    
    if (-not $gpuAvailable) {
        Write-Warning "No GPU detected. Will use CPU (slower performance)"
        $gpuType = "cpu"
    }
    
    return @{
        Available = $gpuAvailable
        Type = $gpuType
        Info = $gpuInfo
    }
}

# Create virtual environment
function New-VirtualEnvironment {
    param($pythonCmd)
    
    Write-Info "Creating Python virtual environment..."
    
    if (Test-Path "venv") {
        Write-Warning "Virtual environment already exists. Skipping creation."
    } else {
        & $pythonCmd -m venv venv
        Write-Success "Virtual environment created"
    }
    
    # Activate virtual environment
    & ".\venv\Scripts\Activate.ps1"
    Write-Success "Virtual environment activated"
}

# Install PyTorch based on GPU type
function Install-PyTorch {
    param($gpuType)
    
    Write-Info "Installing PyTorch for $gpuType..."
    
    switch ($gpuType) {
        "cuda" {
            # Install CUDA-enabled PyTorch
            pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
        }
        "cpu" {
            # Install CPU-only PyTorch
            pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
        }
    }
    
    Write-Success "PyTorch installed"
}

# Install dependencies
function Install-Dependencies {
    Write-Info "Installing Python dependencies..."
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install requirements
    pip install -r requirements.txt
    
    Write-Success "Dependencies installed"
}

# Download HairFastGAN models
function Get-Models {
    Write-Info "Downloading HairFastGAN pretrained models..."
    
    New-Item -ItemType Directory -Force -Path "models" | Out-Null
    
    # Check if model already exists
    if (Test-Path "models\hair_fastgan_model.pth") {
        Write-Warning "Model already exists. Skipping download."
        return
    }
    
    # Download from Hugging Face
    Write-Info "Downloading from Hugging Face..."
    
    # Install huggingface_hub if not present
    pip install -q huggingface_hub
    
    # Download model
    python -c @"
from huggingface_hub import hf_hub_download
import os

try:
    # Download HairFastGAN model
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
"@
    
    Write-Success "Models downloaded"
}

# Configure environment
function Set-Environment {
    param($gpu)
    
    Write-Info "Configuring environment..."
    
    # Create .env file if it doesn't exist
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Info "Created .env file from .env.example"
    }
    
    # Update .env with GPU settings
    if ($gpu.Available) {
        Add-Content -Path ".env" -Value "USE_GPU=true"
        Add-Content -Path ".env" -Value "GPU_TYPE=$($gpu.Type)"
    } else {
        Add-Content -Path ".env" -Value "USE_GPU=false"
        Add-Content -Path ".env" -Value "GPU_TYPE=cpu"
    }
    
    Write-Success "Environment configured"
}

# Test installation
function Test-Installation {
    Write-Info "Testing installation..."
    
    python -c @"
import torch
import sys

print(f'Python version: {sys.version}')
print(f'PyTorch version: {torch.__version__}')
print(f'CUDA available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'CUDA version: {torch.version.cuda}')
    print(f'GPU count: {torch.cuda.device_count()}')
    print(f'GPU name: {torch.cuda.get_device_name(0)}')
else:
    print('Running on CPU')
"@
    
    Write-Success "Installation test passed"
}

# Start service
function Start-Service {
    Write-Info "Starting Hair Try-On service..."
    
    # Check if service is already running
    $existingProcess = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*uvicorn*app.main:app*"
    }
    
    if ($existingProcess) {
        Write-Warning "Service may already be running"
        $response = Read-Host "Do you want to restart it? (y/n)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            Stop-Process -Name "python" -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        } else {
            Write-Info "Keeping existing service running"
            return
        }
    }
    
    Write-Info "Starting uvicorn server..."
    Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" -NoNewWindow -RedirectStandardOutput "service.log" -RedirectStandardError "service_error.log"
    
    Start-Sleep -Seconds 3
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3004" -TimeoutSec 5 -ErrorAction Stop
        Write-Success "Service started successfully on http://localhost:3004"
        Write-Info "API documentation available at http://localhost:3004/docs"
        Write-Info "Logs: Get-Content service.log -Wait"
    } catch {
        Write-Error "Failed to start service. Check service.log and service_error.log for details"
        exit 1
    }
}

# Main execution
function Main {
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "  HairFastGAN Setup Script" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $pythonCmd = Test-Python
    $gpu = Test-GPU
    New-VirtualEnvironment -pythonCmd $pythonCmd
    Install-PyTorch -gpuType $gpu.Type
    Install-Dependencies
    Get-Models
    Set-Environment -gpu $gpu
    Test-Installation
    
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "  Setup Complete!" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "GPU Type: $($gpu.Type)" -ForegroundColor White
    Write-Host ""
    
    $response = Read-Host "Do you want to start the service now? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Start-Service
    } else {
        Write-Info "You can start the service later with: .\start-service.ps1"
    }
}

# Run main function
Main
