# 🚀 HairService Setup Guide - New Laptop Installation

Complete step-by-step guide to set up the Video Processing Pipeline on a new laptop.

---

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ Python 3.8 or higher
- ✅ Git (optional, for cloning)
- ✅ Webcam (built-in or USB)
- ✅ 2-4 GB free disk space
- ✅ Internet connection (for installing packages)

---

## 🎯 Quick Setup (Copy-Paste Method)

### For Linux/Mac:

```bash
# Navigate to project location
cd ~/My/Dev/Projects/App/glowup/server/services/hairService

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install opencv-python opencv-contrib-python numpy Pillow torch torchvision

# Test the setup
python main.py
```

### For Windows:

```powershell
# Navigate to project location
cd C:\Users\YourName\Projects\hairService

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install opencv-python opencv-contrib-python numpy Pillow torch torchvision

# Test the setup
python main.py
```

---

## 📖 Detailed Step-by-Step Instructions

### Step 1: Get the Project Files

**Option A: Clone from Git**
```bash
cd ~/My/Dev/Projects/App/glowup/server/services/
git clone <your-repo-url> hairService
cd hairService
```

**Option B: Copy from USB/Another Location**
```bash
cp -r /path/to/hairService ~/My/Dev/Projects/App/glowup/server/services/
cd ~/My/Dev/Projects/App/glowup/server/services/hairService
```

**Option C: Already have the files?**
```bash
# Just navigate to the directory
cd ~/My/Dev/Projects/App/glowup/server/services/hairService
```

### Step 2: Verify Python Installation

```bash
# Check Python version (should be 3.8+)
python3 --version

# OR try
python --version

# If neither works, install Python:
# Ubuntu/Debian: sudo apt install python3 python3-pip python3-venv
# macOS: brew install python3
# Windows: Download from python.org
```

### Step 3: Create Virtual Environment

```bash
# Create virtual environment named .venv
python3 -m venv .venv

# On some systems, you might need:
python -m venv .venv
```

**What this does:**
- Creates an isolated Python environment
- Keeps packages separate from system Python
- Prevents version conflicts

### Step 4: Activate Virtual Environment

**Linux/Mac:**
```bash
source .venv/bin/activate
```

**Windows Command Prompt:**
```cmd
.venv\Scripts\activate.bat
```

**Windows PowerShell:**
```powershell
.venv\Scripts\Activate.ps1
```

**How to know it's activated?**
You'll see `(.venv)` at the start of your terminal prompt:
```
(.venv) user@laptop:~/hairService$
```

### Step 5: Upgrade pip

```bash
pip install --upgrade pip
```

**Why?** Ensures you have the latest package installer.

### Step 6: Install Required Packages

**Method 1: From requirements file (Recommended)**
```bash
pip install -r requirements_pipeline.txt
```

**Method 2: Install individually**
```bash
# Core packages
pip install opencv-python>=4.5.0
pip install opencv-contrib-python>=4.5.0
pip install numpy>=1.19.0
pip install Pillow>=8.0.0

# Deep learning (for HairFastGAN)
pip install torch>=1.9.0
pip install torchvision>=0.10.0
```

**Method 3: Minimal installation (no PyTorch)**
```bash
# If you don't need HairFastGAN model
pip install opencv-python opencv-contrib-python numpy Pillow
```

### Step 7: Verify Installation

```bash
# Check OpenCV
python -c "import cv2; print(f'OpenCV: {cv2.__version__}')"

# Check NumPy
python -c "import numpy; print(f'NumPy: {numpy.__version__}')"

# Check Pillow
python -c "from PIL import Image; print('Pillow: OK')"

# Check Torch (if installed)
python -c "import torch; print(f'PyTorch: {torch.__version__}')"

# Check if CUDA is available (GPU support)
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"
```

### Step 8: Test Camera Access

```bash
# Check if camera is available
python -c "from video_utils import verify_camera_available; verify_camera_available()"

# List available cameras
python -c "from video_utils import list_available_cameras; list_available_cameras()"
```

### Step 9: Run Your First Test

**Quick 5-second test:**
```bash
python -c "from main import run_pipeline_custom; run_pipeline_custom(camera_max_duration=5)"
```

**Full pipeline with interactive examples:**
```bash
python examples.py
```

**Complete pipeline (10 seconds):**
```bash
python main.py
```

### Step 10: Check Output

```bash
# List generated files
ls -lh output/

# View video info
python -c "from video_utils import print_video_info; print_video_info('output/final_output.mp4')"

# Play the video (Linux)
vlc output/final_output.mp4

# OR
xdg-open output/final_output.mp4
```

---

## 🛠️ Automated Setup Scripts

### Linux/Mac Setup Script

Save as `setup.sh`:

```bash
#!/bin/bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 HairService Video Processing Pipeline Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Python
echo "🔍 Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.8+"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
echo "✅ Found: $PYTHON_VERSION"
echo ""

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv .venv
echo "✅ Virtual environment created"
echo ""

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source .venv/bin/activate
echo "✅ Virtual environment activated"
echo ""

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip > /dev/null 2>&1
echo "✅ pip upgraded"
echo ""

# Install dependencies
echo "📥 Installing dependencies..."
echo "   This may take 2-5 minutes..."
pip install opencv-python>=4.5.0 > /dev/null 2>&1
echo "   ✓ opencv-python"
pip install opencv-contrib-python>=4.5.0 > /dev/null 2>&1
echo "   ✓ opencv-contrib-python"
pip install numpy>=1.19.0 > /dev/null 2>&1
echo "   ✓ numpy"
pip install Pillow>=8.0.0 > /dev/null 2>&1
echo "   ✓ Pillow"

# Optional: PyTorch
read -p "📦 Install PyTorch for HairFastGAN? (y/n, default: n): " install_torch
if [ "$install_torch" = "y" ] || [ "$install_torch" = "Y" ]; then
    echo "   Installing PyTorch (this may take a while)..."
    pip install torch>=1.9.0 torchvision>=0.10.0 > /dev/null 2>&1
    echo "   ✓ torch"
    echo "   ✓ torchvision"
fi
echo "✅ All dependencies installed"
echo ""

# Verify installation
echo "🔍 Verifying installation..."
python -c "import cv2; print(f'   ✓ OpenCV {cv2.__version__}')"
python -c "import numpy; print(f'   ✓ NumPy {numpy.__version__}')"
python -c "from PIL import Image; print('   ✓ Pillow OK')"
if [ "$install_torch" = "y" ] || [ "$install_torch" = "Y" ]; then
    python -c "import torch; print(f'   ✓ PyTorch {torch.__version__}')" 2>/dev/null || echo "   ⚠ PyTorch installation needs verification"
fi
echo ""

# Check camera
echo "📷 Checking camera access..."
python -c "
import cv2
cap = cv2.VideoCapture(0)
if cap.isOpened():
    print('   ✅ Camera detected and accessible')
    cap.release()
else:
    print('   ⚠️  Camera not detected (you can still process existing videos)')
" 2>/dev/null || echo "   ⚠️  Unable to check camera"
echo ""

# Create output directory
echo "📁 Creating output directory..."
mkdir -p output
echo "✅ Output directory ready"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Next Steps:"
echo ""
echo "1. Keep virtual environment activated (already done)"
echo "   To activate later, run: source .venv/bin/activate"
echo ""
echo "2. Run the pipeline:"
echo "   python main.py              # Complete pipeline"
echo "   python examples.py          # Interactive examples"
echo ""
echo "3. To deactivate when done:"
echo "   deactivate"
echo ""
echo "📖 For more help, see:"
echo "   - README_PIPELINE.md"
echo "   - FLOWCHAR.md"
echo "   - quick_reference.py"
echo ""
```

**Run it:**
```bash
chmod +x setup.sh
./setup.sh
```

### Windows PowerShell Setup Script

Save as `setup.ps1`:

```powershell
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 HairService Video Processing Pipeline Setup" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "🔍 Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version
    Write-Host "✅ Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python 3.8+" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Create virtual environment
Write-Host "📦 Creating virtual environment..." -ForegroundColor Yellow
python -m venv .venv
Write-Host "✅ Virtual environment created" -ForegroundColor Green
Write-Host ""

# Activate virtual environment
Write-Host "🔌 Activating virtual environment..." -ForegroundColor Yellow
.\.venv\Scripts\Activate.ps1
Write-Host "✅ Virtual environment activated" -ForegroundColor Green
Write-Host ""

# Upgrade pip
Write-Host "⬆️  Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip | Out-Null
Write-Host "✅ pip upgraded" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "📥 Installing dependencies..." -ForegroundColor Yellow
Write-Host "   This may take 2-5 minutes..." -ForegroundColor Gray

pip install opencv-python>=4.5.0 | Out-Null
Write-Host "   ✓ opencv-python" -ForegroundColor Green

pip install opencv-contrib-python>=4.5.0 | Out-Null
Write-Host "   ✓ opencv-contrib-python" -ForegroundColor Green

pip install numpy>=1.19.0 | Out-Null
Write-Host "   ✓ numpy" -ForegroundColor Green

pip install Pillow>=8.0.0 | Out-Null
Write-Host "   ✓ Pillow" -ForegroundColor Green

# Optional: PyTorch
$installTorch = Read-Host "📦 Install PyTorch for HairFastGAN? (y/n, default: n)"
if ($installTorch -eq "y" -or $installTorch -eq "Y") {
    Write-Host "   Installing PyTorch (this may take a while)..." -ForegroundColor Gray
    pip install torch>=1.9.0 torchvision>=0.10.0 | Out-Null
    Write-Host "   ✓ torch" -ForegroundColor Green
    Write-Host "   ✓ torchvision" -ForegroundColor Green
}

Write-Host "✅ All dependencies installed" -ForegroundColor Green
Write-Host ""

# Verify installation
Write-Host "🔍 Verifying installation..." -ForegroundColor Yellow
python -c "import cv2; print(f'   ✓ OpenCV {cv2.__version__}')"
python -c "import numpy; print(f'   ✓ NumPy {numpy.__version__}')"
python -c "from PIL import Image; print('   ✓ Pillow OK')"
Write-Host ""

# Create output directory
Write-Host "📁 Creating output directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "output" | Out-Null
Write-Host "✅ Output directory ready" -ForegroundColor Green
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Virtual environment is already activated"
Write-Host "   To activate later, run: .venv\Scripts\Activate.ps1"
Write-Host ""
Write-Host "2. Run the pipeline:" -ForegroundColor Yellow
Write-Host "   python main.py              # Complete pipeline"
Write-Host "   python examples.py          # Interactive examples"
Write-Host ""
Write-Host "3. To deactivate when done:" -ForegroundColor Yellow
Write-Host "   deactivate"
Write-Host ""
```

**Run it:**
```powershell
# Allow script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run setup
.\setup.ps1
```

---

## 🔧 Troubleshooting Common Issues

### Issue 1: Python Command Not Found

**Problem:**
```bash
python: command not found
```

**Solutions:**
```bash
# Try python3
python3 --version

# Install Python (Ubuntu/Debian)
sudo apt update
sudo apt install python3 python3-pip python3-venv

# Install Python (macOS with Homebrew)
brew install python3

# Windows: Download from python.org
```

### Issue 2: Virtual Environment Won't Activate

**Problem:**
```bash
bash: .venv/bin/activate: No such file or directory
```

**Solution:**
```bash
# Make sure you created it first
python3 -m venv .venv

# Then activate
source .venv/bin/activate
```

### Issue 3: pip Installation Fails

**Problem:**
```bash
ERROR: Could not install packages...
```

**Solutions:**
```bash
# Upgrade pip
pip install --upgrade pip

# Install with --user flag
pip install --user opencv-python

# Use a specific index
pip install --index-url https://pypi.org/simple opencv-python

# Check internet connection
ping pypi.org
```

### Issue 4: OpenCV Import Error

**Problem:**
```python
ImportError: libGL.so.1: cannot open shared object file
```

**Solution (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install libgl1-mesa-glx libglib2.0-0
```

**Solution (CentOS/RHEL):**
```bash
sudo yum install mesa-libGL glib2
```

### Issue 5: Camera Permission Denied

**Problem:**
```bash
VIDEOIO ERROR: V4L: can't open camera by index
```

**Solutions:**

**Linux:**
```bash
# Check camera devices
ls -l /dev/video*

# Add user to video group
sudo usermod -a -G video $USER

# Logout and login, or run:
newgrp video

# Test camera
python -c "import cv2; cap = cv2.VideoCapture(0); print('OK' if cap.isOpened() else 'FAIL'); cap.release()"
```

**Windows:**
- Check camera privacy settings
- Allow app access to camera in Windows Settings

**macOS:**
- Grant Terminal/Python camera access in System Preferences > Security & Privacy

### Issue 6: Out of Memory

**Problem:**
```bash
MemoryError: Unable to allocate...
```

**Solutions:**
```python
# Use Fast configuration
from config import FastProcessingConfig
from main import run_pipeline
run_pipeline(config_class=FastProcessingConfig)

# Or reduce settings manually
from main import run_pipeline_custom
run_pipeline_custom(
    preprocess_resize_width=256,  # Smaller frames
    preprocess_target_fps=3,      # Fewer frames
    fps_multiplier=2              # Less interpolation
)
```

### Issue 7: Torch/CUDA Not Available

**Problem:**
```python
torch.cuda.is_available() returns False
```

**Solutions:**
```bash
# Check CUDA installation
nvidia-smi

# Install CUDA-enabled PyTorch (Linux/Windows with NVIDIA GPU)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# For CPU-only (no GPU)
pip install torch torchvision torchaudio

# Verify
python -c "import torch; print(f'CUDA: {torch.cuda.is_available()}')"
```

---

## 🔄 Daily Usage Workflow

### Starting Your Work Session

```bash
# 1. Navigate to project
cd ~/My/Dev/Projects/App/glowup/server/services/hairService

# 2. Activate environment
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows

# 3. Confirm activation - you should see (.venv)
# (.venv) user@laptop:~/hairService$
```

### Running the Pipeline

```bash
# Quick test (5 seconds)
python -c "from main import run_pipeline_custom; run_pipeline_custom(camera_max_duration=5)"

# Full pipeline
python main.py

# Interactive examples
python examples.py
```

### Ending Your Work Session

```bash
# Deactivate virtual environment
deactivate

# Now (.venv) should be gone from your prompt
```

---

## 💾 Backup & Version Control

### Files to Include in Git

```bash
# Add these to git
git add *.py *.md *.txt
git add FLOWCHAR.md README_PIPELINE.md
git commit -m "Add video processing pipeline"
```

### Files to Ignore (.gitignore)

```gitignore
# Virtual environment
.venv/
venv/
env/

# Python cache
__pycache__/
*.pyc
*.pyo
*.pyd

# Output files
output/
*.mp4
*.avi

# Temporary frames
*_frames/
frames/
processed/
enhanced/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

---

## 📊 Performance Optimization

### For Faster Processing

```python
from config import Config

# Adjust these settings
Config.PREPROCESS_TARGET_FPS = 3          # Lower = faster
Config.PREPROCESS_RESIZE_WIDTH = 256     # Smaller = faster
Config.FPS_MULTIPLIER = 2                # Lower = faster
Config.FPS_INTERPOLATION_METHOD = 'linear'  # Faster than optical_flow
```

### For Better Quality

```python
from config import Config

# Adjust these settings
Config.PREPROCESS_TARGET_FPS = 10        # Higher = more frames
Config.PREPROCESS_RESIZE_WIDTH = 1024   # Larger = better quality
Config.FPS_MULTIPLIER = 3                # More interpolation
Config.FPS_INTERPOLATION_METHOD = 'optical_flow'  # Best quality
Config.OUTPUT_FPS = 60                   # Smoother output
```

---

## 📞 Getting Help

### Documentation Files

1. **SETUP_GUIDE.md** (this file) - Installation & setup
2. **README_PIPELINE.md** - Complete usage documentation
3. **FLOWCHAR.md** - Visual pipeline diagrams
4. **quick_reference.py** - Code snippets
5. **examples.py** - Interactive examples

### Verification Commands

```bash
# Check Python version
python --version

# Check installed packages
pip list

# Check OpenCV
python -c "import cv2; print(cv2.__version__)"

# Check camera
python -c "from video_utils import verify_camera_available; verify_camera_available()"

# Get video info
python -c "from video_utils import print_video_info; print_video_info('output/final_output.mp4')"
```

---

## ✅ Final Checklist

Before you start using the pipeline, make sure:

- [ ] Python 3.8+ is installed
- [ ] Virtual environment is created (`.venv` folder exists)
- [ ] Virtual environment is activated (see `(.venv)` in prompt)
- [ ] All packages are installed (`pip list` shows opencv, numpy, etc.)
- [ ] Camera is accessible (run camera test)
- [ ] Can import modules (`python -c "import cv2"` works)
- [ ] Output directory exists
- [ ] No error messages when running `python examples.py`

---

**Setup Version:** 1.0  
**Last Updated:** October 2025  
**Compatible With:** Python 3.8+, Linux/Mac/Windows
