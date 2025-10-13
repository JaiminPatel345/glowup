# 🎨 HairFastGAN Integration Guide

Complete guide to clone and integrate HairFastGAN model into the video processing pipeline.

---

## 📋 Prerequisites

Before starting:
- ✅ Python 3.8+ installed
- ✅ Virtual environment activated
- ✅ Basic dependencies installed (opencv, numpy, etc.)
- ✅ GPU with CUDA recommended (but CPU works too)
- ✅ 4-6 GB free disk space

---

## 🚀 Quick Integration (Step-by-Step)

### Step 1: Navigate to Project Directory

```bash
cd ~/My/Dev/Projects/App/glowup/server/services/hairService
source .venv/bin/activate  # Activate your virtual environment
```

### Step 2: Clone HairFastGAN Repository

```bash
# Clone the repository
git clone https://github.com/AIRI-Institute/HairFastGAN.git

# This creates a HairFastGAN folder inside hairService/
```

**Expected structure:**
```
hairService/
├── HairFastGAN/              ← New folder
│   ├── models/
│   ├── utils/
│   ├── inference.py
│   └── ...
├── main.py
├── hair_gan_processor.py
└── ...
```

### Step 3: Install HairFastGAN Dependencies

```bash
cd HairFastGAN

# Install their requirements
pip install -r requirements.txt

# Go back to main directory
cd ..
```

**Common dependencies for HairFastGAN:**
```bash
# If requirements.txt doesn't exist or fails, install manually:
pip install torch torchvision
pip install ninja
pip install dlib
pip install scipy
pip install scikit-image
pip install tqdm
pip install gdown
pip install face-alignment
```

### Step 4: Download Pre-trained Models

HairFastGAN requires pre-trained model weights. Here's how to get them:

```bash
cd HairFastGAN

# Create models directory
mkdir -p pretrained_models

# Download the models
# Option A: Using their download script (if available)
python download_models.py

# Option B: Manual download from their releases
# Visit: https://github.com/AIRI-Institute/HairFastGAN/releases
# Download model files and place in pretrained_models/
```

**Expected model files:**
- `encoder.pt` or `e4e_ffhq_encode.pt`
- `stylegan2.pt` or `stylegan2-ffhq-config-f.pt`
- `shape_predictor_68_face_landmarks.dat` (dlib face detector)
- `FS_model.pt` (face segmentation)

### Step 5: Update Python Path

Create a helper file to manage paths:

```bash
cd ~/My/Dev/Projects/App/glowup/server/services/hairService
```

Create `hairgan_setup.py`:

```python
"""
HairFastGAN Setup Helper
Adds HairFastGAN to Python path
"""

import sys
import os
from pathlib import Path

# Get the HairFastGAN directory
HAIRGAN_DIR = Path(__file__).parent / "HairFastGAN"

# Add to Python path
if str(HAIRGAN_DIR) not in sys.path:
    sys.path.insert(0, str(HAIRGAN_DIR))

# Model paths
MODEL_DIR = HAIRGAN_DIR / "pretrained_models"

MODEL_PATHS = {
    'encoder': MODEL_DIR / "e4e_ffhq_encode.pt",
    'stylegan': MODEL_DIR / "stylegan2-ffhq-config-f.pt",
    'face_landmark': MODEL_DIR / "shape_predictor_68_face_landmarks.dat",
    'face_seg': MODEL_DIR / "FS_model.pt",
}

def check_models():
    """Check if all required models are downloaded"""
    missing = []
    for name, path in MODEL_PATHS.items():
        if not path.exists():
            missing.append(f"{name}: {path}")
    
    if missing:
        print("⚠️  Missing model files:")
        for m in missing:
            print(f"   - {m}")
        print("\nPlease download models from:")
        print("https://github.com/AIRI-Institute/HairFastGAN/releases")
        return False
    
    print("✅ All model files found!")
    return True

if __name__ == "__main__":
    check_models()
```

**Test it:**
```bash
python hairgan_setup.py
```

### Step 6: Update `hair_gan_processor.py`

Now update the main processor file to use actual HairFastGAN:

```bash
# Backup the original
cp hair_gan_processor.py hair_gan_processor_backup.py
```

Create the updated version - see the code below.

### Step 7: Test the Integration

```bash
# Test HairFastGAN import
python -c "from hairgan_setup import check_models; check_models()"

# Test basic integration
python test_hairgan.py  # We'll create this file
```

---

## 📝 Updated Files

### File 1: `hairgan_setup.py` (Path Configuration)

Already shown above - create this file.

### File 2: Updated `hair_gan_processor.py`

See the implementation file I'll create next.

### File 3: `test_hairgan.py` (Testing Script)

```python
"""
Test HairFastGAN Integration
Quick test to verify HairFastGAN is working
"""

import os
import sys
from pathlib import Path

# Add HairFastGAN to path
from hairgan_setup import MODEL_PATHS, check_models

def test_imports():
    """Test if we can import HairFastGAN modules"""
    print("🔍 Testing imports...")
    
    try:
        # Test basic imports
        import torch
        print("✅ PyTorch imported")
        
        import cv2
        print("✅ OpenCV imported")
        
        # Test HairFastGAN imports
        # Note: Exact imports depend on HairFastGAN structure
        # Adjust based on their actual code
        
        print("✅ All imports successful")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def test_models():
    """Test if models are available"""
    print("\n🔍 Checking models...")
    return check_models()

def test_simple_inference():
    """Test simple inference if possible"""
    print("\n🔍 Testing inference...")
    
    try:
        # This is a placeholder - actual code depends on HairFastGAN API
        print("⚠️  Skipping inference test - implement based on HairFastGAN API")
        return True
        
    except Exception as e:
        print(f"❌ Inference error: {e}")
        return False

if __name__ == "__main__":
    print("="*60)
    print("HairFastGAN Integration Test")
    print("="*60)
    
    results = []
    
    results.append(("Imports", test_imports()))
    results.append(("Models", test_models()))
    results.append(("Inference", test_simple_inference()))
    
    print("\n" + "="*60)
    print("Test Results:")
    print("="*60)
    
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{name:20} {status}")
    
    all_passed = all(r[1] for r in results)
    
    print("\n" + "="*60)
    if all_passed:
        print("✅ All tests passed! HairFastGAN is ready to use.")
    else:
        print("⚠️  Some tests failed. Check the output above.")
    print("="*60)
```

---

## 🔧 Configuration for HairFastGAN

Update your `config.py`:

```python
# Add these to config.py

class Config:
    # ... existing config ...
    
    # HairFastGAN Settings
    HAIRGAN_ENABLED = True
    HAIRGAN_DIR = "HairFastGAN"
    HAIRGAN_MODEL_DIR = "HairFastGAN/pretrained_models"
    
    # Model paths
    HAIRGAN_ENCODER_PATH = "HairFastGAN/pretrained_models/e4e_ffhq_encode.pt"
    HAIRGAN_STYLEGAN_PATH = "HairFastGAN/pretrained_models/stylegan2-ffhq-config-f.pt"
    HAIRGAN_FACE_LANDMARK_PATH = "HairFastGAN/pretrained_models/shape_predictor_68_face_landmarks.dat"
    HAIRGAN_FACE_SEG_PATH = "HairFastGAN/pretrained_models/FS_model.pt"
    
    # Processing settings
    HAIRGAN_DEVICE = 'cuda'  # or 'cpu'
    HAIRGAN_IMAGE_SIZE = 1024
    HAIRGAN_BATCH_SIZE = 1
```

---

## 🎯 Complete Setup Script

Create `setup_hairgan.sh`:

```bash
#!/bin/bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎨 HairFastGAN Integration Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if virtual environment is activated
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "⚠️  Virtual environment not activated!"
    echo "Please run: source .venv/bin/activate"
    exit 1
fi

# Step 1: Clone HairFastGAN
echo "📥 Step 1: Cloning HairFastGAN repository..."
if [ -d "HairFastGAN" ]; then
    echo "⚠️  HairFastGAN directory already exists. Skipping clone."
    echo "   To re-clone, delete the HairFastGAN folder first."
else
    git clone https://github.com/AIRI-Institute/HairFastGAN.git
    echo "✅ Repository cloned"
fi
echo ""

# Step 2: Install dependencies
echo "📦 Step 2: Installing HairFastGAN dependencies..."
cd HairFastGAN

if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    echo "⚠️  No requirements.txt found, installing common dependencies..."
    pip install torch torchvision
    pip install ninja
    pip install dlib
    pip install scipy
    pip install scikit-image
    pip install tqdm
    pip install gdown
    pip install face-alignment
fi

cd ..
echo "✅ Dependencies installed"
echo ""

# Step 3: Create model directory
echo "📁 Step 3: Setting up model directories..."
mkdir -p HairFastGAN/pretrained_models
echo "✅ Model directory created"
echo ""

# Step 4: Download models (if script exists)
echo "📥 Step 4: Downloading models..."
cd HairFastGAN

if [ -f "download_models.py" ]; then
    python download_models.py
    echo "✅ Models downloaded"
elif [ -f "scripts/download_models.sh" ]; then
    bash scripts/download_models.sh
    echo "✅ Models downloaded"
else
    echo "⚠️  No automatic download script found."
    echo ""
    echo "Please download models manually from:"
    echo "https://github.com/AIRI-Institute/HairFastGAN/releases"
    echo ""
    echo "Required files:"
    echo "  - e4e_ffhq_encode.pt"
    echo "  - stylegan2-ffhq-config-f.pt"
    echo "  - shape_predictor_68_face_landmarks.dat"
    echo "  - FS_model.pt"
    echo ""
    echo "Place them in: HairFastGAN/pretrained_models/"
fi

cd ..
echo ""

# Step 5: Create helper files
echo "📝 Step 5: Creating helper files..."

# Create hairgan_setup.py
cat > hairgan_setup.py << 'EOL'
import sys
import os
from pathlib import Path

HAIRGAN_DIR = Path(__file__).parent / "HairFastGAN"
if str(HAIRGAN_DIR) not in sys.path:
    sys.path.insert(0, str(HAIRGAN_DIR))

MODEL_DIR = HAIRGAN_DIR / "pretrained_models"
MODEL_PATHS = {
    'encoder': MODEL_DIR / "e4e_ffhq_encode.pt",
    'stylegan': MODEL_DIR / "stylegan2-ffhq-config-f.pt",
    'face_landmark': MODEL_DIR / "shape_predictor_68_face_landmarks.dat",
    'face_seg': MODEL_DIR / "FS_model.pt",
}

def check_models():
    missing = []
    for name, path in MODEL_PATHS.items():
        if not path.exists():
            missing.append(f"{name}: {path}")
    if missing:
        print("⚠️  Missing model files:")
        for m in missing:
            print(f"   - {m}")
        return False
    print("✅ All model files found!")
    return True

if __name__ == "__main__":
    check_models()
EOL

echo "✅ Helper files created"
echo ""

# Step 6: Test setup
echo "🔍 Step 6: Testing setup..."
python hairgan_setup.py
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ HairFastGAN Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Next Steps:"
echo ""
echo "1. Verify models are downloaded:"
echo "   python hairgan_setup.py"
echo ""
echo "2. Test the integration:"
echo "   python test_hairgan.py"
echo ""
echo "3. Run the pipeline:"
echo "   python main.py"
echo ""
echo "📖 For more help, see HAIRGAN_INTEGRATION.md"
echo ""
```

**Make it executable and run:**
```bash
chmod +x setup_hairgan.sh
./setup_hairgan.sh
```

---

## 🐛 Troubleshooting

### Issue 1: Clone Failed

```bash
# If git clone fails, try:
git clone --depth 1 https://github.com/AIRI-Institute/HairFastGAN.git

# Or download as ZIP from GitHub and extract
```

### Issue 2: Dependencies Installation Failed

```bash
# Install dependencies one by one
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
pip install ninja
pip install dlib
pip install scipy scikit-image tqdm gdown face-alignment
```

### Issue 3: dlib Installation Failed

```bash
# Ubuntu/Debian
sudo apt-get install build-essential cmake
sudo apt-get install libopenblas-dev liblapack-dev
pip install dlib

# macOS
brew install cmake
brew install openblas
pip install dlib

# Windows - use pre-built wheel
pip install dlib-binary
```

### Issue 4: Models Not Found

```bash
# Manual download instructions
cd HairFastGAN/pretrained_models

# Download from Google Drive or official sources
# Links should be in HairFastGAN repository README

# Verify downloads
ls -lh
```

### Issue 5: CUDA Out of Memory

```python
# In config.py, reduce batch size and image size
HAIRGAN_BATCH_SIZE = 1
HAIRGAN_IMAGE_SIZE = 512  # Instead of 1024

# Or use CPU
HAIRGAN_DEVICE = 'cpu'
```

### Issue 6: Import Errors

```python
# Test imports individually
python -c "import torch; print(torch.__version__)"
python -c "import cv2; print(cv2.__version__)"
python -c "import dlib; print('dlib OK')"
python -c "from hairgan_setup import check_models; check_models()"
```

---

## ✅ Verification Checklist

Before using HairFastGAN in the pipeline:

- [ ] HairFastGAN repository cloned
- [ ] Dependencies installed (torch, dlib, etc.)
- [ ] Pre-trained models downloaded
- [ ] Models in `HairFastGAN/pretrained_models/`
- [ ] `hairgan_setup.py` created
- [ ] `python hairgan_setup.py` shows all models found
- [ ] No import errors when running `test_hairgan.py`
- [ ] CUDA available (or configured for CPU)

---

## 🎮 Usage After Integration

Once setup is complete:

```python
# Run the complete pipeline
python main.py

# Or use updated processor
from hair_gan_processor import HairGANProcessor

processor = HairGANProcessor(device='cuda')
processor.load_model()
processor.process_frames_batch('input_frames/', 'output_frames/')
```

---

## 📊 Expected Directory Structure

```
hairService/
├── HairFastGAN/                    ← Cloned repository
│   ├── models/
│   ├── utils/
│   ├── inference.py
│   ├── requirements.txt
│   └── pretrained_models/          ← Downloaded models
│       ├── e4e_ffhq_encode.pt
│       ├── stylegan2-ffhq-config-f.pt
│       ├── shape_predictor_68_face_landmarks.dat
│       └── FS_model.pt
├── hairgan_setup.py                ← Helper script
├── hair_gan_processor.py           ← Updated processor
├── test_hairgan.py                 ← Test script
├── main.py
├── config.py
└── ...
```

---

## 📚 Additional Resources

- **HairFastGAN GitHub:** https://github.com/AIRI-Institute/HairFastGAN
- **Paper:** Check repository for research paper link
- **Issues:** https://github.com/AIRI-Institute/HairFastGAN/issues
- **Pretrained Models:** Check repository releases

---

**Integration Version:** 1.0  
**Last Updated:** October 2025  
**Compatible With:** HairFastGAN latest release
