# 🚀 Quick Start - HairFastGAN Integration

Complete guide to get HairFastGAN working in 5 minutes!

---

## ⚡ Super Quick Setup (Copy-Paste)

### Linux/Mac:

```bash
# Make sure you're in the project directory and venv is activated
cd ~/My/Dev/Projects/App/glowup/server/services/hairService
source .venv/bin/activate

# Run the automated setup script
chmod +x setup_hairgan.sh
./setup_hairgan.sh

# Test the installation
python test_hairgan.py
```

### Windows PowerShell:

```powershell
# Navigate to project directory and activate venv
cd C:\path\to\hairService
.venv\Scripts\Activate.ps1

# If you get execution policy error, run this first:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run the setup script
.\setup_hairgan.ps1

# Test the installation
python test_hairgan.py
```

### Windows Command Prompt:

```cmd
# Navigate to project directory and activate venv
cd C:\path\to\hairService
.venv\Scripts\activate.bat

# Run the setup script
setup_hairgan.bat

# Test the installation
python test_hairgan.py
```

That's it! The script will:
1. ✅ Clone HairFastGAN from GitHub
2. ✅ Install all dependencies
3. ✅ Set up directories
4. ✅ Guide you through model download
5. ✅ Verify installation

---

## 📋 Manual Step-by-Step (If script fails)

### Step 1: Clone Repository (30 seconds)

```bash
cd ~/My/Dev/Projects/App/glowup/server/services/hairService
git clone https://github.com/AIRI-Institute/HairFastGAN.git
```

### Step 2: Install Dependencies (2-3 minutes)

```bash
# Core dependencies
pip install torch torchvision
pip install ninja scipy scikit-image tqdm gdown
pip install face-alignment

# Try to install dlib
pip install dlib

# If dlib fails on Ubuntu/Debian:
sudo apt-get install build-essential cmake libopenblas-dev liblapack-dev
pip install dlib
```

### Step 3: Download Models (Manual)

1. Visit: https://github.com/AIRI-Institute/HairFastGAN
2. Check their README or Releases for model download links
3. Download these files:
   - `e4e_ffhq_encode.pt` or similar encoder
   - `stylegan2-ffhq-config-f.pt` or similar StyleGAN
   - `shape_predictor_68_face_landmarks.dat` (dlib)
   - Face segmentation model

4. Place them in: `HairFastGAN/pretrained_models/`

### Step 4: Verify Installation

```bash
python hairgan_setup.py
python test_hairgan.py
```

---

## 🎯 What Each File Does

| File | Purpose |
|------|---------|
| `setup_hairgan.sh` | Automated setup script |
| `hairgan_setup.py` | Path configuration & verification |
| `test_hairgan.py` | Test suite |
| `HAIRGAN_INTEGRATION.md` | Complete documentation |

---

## ✅ Verification Checklist

After running setup, verify:

```bash
# Check if HairFastGAN folder exists
ls -la HairFastGAN/

# Check if models are downloaded
ls -lh HairFastGAN/pretrained_models/

# Run system check
python hairgan_setup.py

# Run full test suite
python test_hairgan.py
```

**Expected output:**
```
✅ HairFastGAN directory found
✅ All dependencies installed
✅ CUDA available (or CPU mode)
✅ All model files found
```

---

## 🎮 Usage After Setup

### Run Complete Pipeline

```bash
python main.py
```

### Run Interactive Examples

```bash
python examples.py
```

### Use HairGAN Directly

```python
from hair_gan_processor import HairGANProcessor

processor = HairGANProcessor(device='cuda')
processor.load_model()
processor.process_frames_batch('input_frames/', 'output_frames/')
```

---

## 🐛 Common Issues & Quick Fixes

### Issue 1: Git Clone Fails

**Problem:** `fatal: unable to access 'https://github.com/...'`

**Fix:**
```bash
# Try with depth 1
git clone --depth 1 https://github.com/AIRI-Institute/HairFastGAN.git

# Or download ZIP and extract
wget https://github.com/AIRI-Institute/HairFastGAN/archive/refs/heads/main.zip
unzip main.zip
mv HairFastGAN-main HairFastGAN
```

### Issue 2: dlib Won't Install

**Problem:** `ERROR: Could not build wheels for dlib`

**Fix (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install build-essential cmake
sudo apt-get install libopenblas-dev liblapack-dev
pip install dlib
```

**Fix (macOS):**
```bash
brew install cmake
brew install openblas
pip install dlib
```

**Fix (Windows or if above fails):**
```bash
pip install dlib-binary
```

### Issue 3: CUDA Out of Memory

**Problem:** `RuntimeError: CUDA out of memory`

**Fix:**
```python
# Edit config.py
HAIRGAN_DEVICE = 'cpu'  # Use CPU instead
HAIRGAN_BATCH_SIZE = 1  # Reduce batch size
```

### Issue 4: Models Not Found

**Problem:** `⚠️  Missing model files`

**Fix:**
1. Check HairFastGAN README for download links
2. Look in their Releases: https://github.com/AIRI-Institute/HairFastGAN/releases
3. Check their Google Drive or other hosting
4. Follow their specific download instructions

### Issue 5: Import Errors

**Problem:** `ImportError: cannot import name '...'`

**Fix:**
```bash
# Reinstall dependencies
pip uninstall torch torchvision
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# Verify
python -c "import torch; print(torch.__version__)"
```

---

## 📊 Expected Directory Structure

After successful setup:

```
hairService/
├── HairFastGAN/                         ← Cloned repo
│   ├── models/
│   ├── utils/
│   ├── inference.py
│   ├── requirements.txt
│   └── pretrained_models/               ← Models here
│       ├── e4e_ffhq_encode.pt          (~300 MB)
│       ├── stylegan2-ffhq-config-f.pt   (~500 MB)
│       ├── shape_predictor_68_face_landmarks.dat (~100 MB)
│       └── FS_model.pt                  (~50 MB)
├── hairgan_setup.py                     ← Setup helper
├── test_hairgan.py                      ← Test suite
├── setup_hairgan.sh                     ← Setup script
├── hair_gan_processor.py                ← Processor
├── main.py
└── ...
```

---

## 💡 Pro Tips

1. **GPU vs CPU:**
   - GPU: 10-20x faster, needs CUDA
   - CPU: Slower but works everywhere
   - Check GPU: `python -c "import torch; print(torch.cuda.is_available())"`

2. **Model Download:**
   - Models are large (300-500 MB each)
   - Use stable internet connection
   - Total size: ~1-2 GB

3. **First Run:**
   - First run downloads additional data
   - May take 5-10 minutes
   - Subsequent runs are faster

4. **Testing:**
   - Test with short videos first (5 seconds)
   - Verify output quality
   - Then process longer videos

---

## 🔗 Important Links

- **HairFastGAN GitHub:** https://github.com/AIRI-Institute/HairFastGAN
- **Issues:** https://github.com/AIRI-Institute/HairFastGAN/issues
- **Paper:** Check repo for research paper link
- **Our Integration Guide:** `HAIRGAN_INTEGRATION.md`
- **Pipeline Docs:** `README_PIPELINE.md`

---

## 📞 Need Help?

### Check These Files:
1. `HAIRGAN_INTEGRATION.md` - Detailed integration guide
2. `SETUP_GUIDE.md` - General setup help
3. `README_PIPELINE.md` - Pipeline usage
4. `FLOWCHAR.md` - Visual diagrams

### Run Diagnostics:
```bash
python hairgan_setup.py      # Check system
python test_hairgan.py        # Run tests
python -c "import torch; print(torch.cuda.is_available())"  # Check CUDA
```

### Commands Reference:
```bash
# Setup
./setup_hairgan.sh                    # Automated setup
python hairgan_setup.py               # Manual check
python test_hairgan.py                # Run tests

# Usage
python main.py                        # Full pipeline
python examples.py                    # Interactive examples
python -c "from hairgan_setup import full_check; full_check()"  # Quick check
```

---

## ⏱️ Time Estimates

| Step | Time | Notes |
|------|------|-------|
| Clone repo | 30s | Depends on internet speed |
| Install deps | 2-5 min | First time only |
| Download models | 5-15 min | ~1-2 GB total |
| First run | 5-10 min | Downloads additional data |
| Subsequent runs | < 1 min | Much faster |

**Total first-time setup:** 15-30 minutes  
**After setup, process 10s video:** 1-2 minutes (GPU) or 5-10 minutes (CPU)

---

## ✅ Success Indicators

You know it's working when:

✅ `python hairgan_setup.py` shows all green checkmarks  
✅ `python test_hairgan.py` passes all tests  
✅ No import errors  
✅ Models found in `HairFastGAN/pretrained_models/`  
✅ `python main.py` runs without errors  
✅ Output video in `output/final_output.mp4` has hair style changes  

---

**Quick Start Version:** 1.0  
**Last Updated:** October 2025  
**Estimated Setup Time:** 15-30 minutes
