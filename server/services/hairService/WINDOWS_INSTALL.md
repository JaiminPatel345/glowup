# 🪟 Windows Installation Guide - HairFastGAN Integration

Complete guide for Windows users to set up the HairFastGAN video processing pipeline.

---

## 📋 Prerequisites for Windows

Before starting, ensure you have:
- ✅ **Python 3.8+** installed (download from [python.org](https://www.python.org/downloads/))
- ✅ **Git for Windows** installed (download from [git-scm.com](https://git-scm.com/download/win))
- ✅ **Visual Studio Build Tools** (optional, for dlib)
- ✅ **Webcam** (built-in or USB)
- ✅ **4-8 GB free disk space**
- ✅ **Internet connection**

---

## 🚀 Quick Start (PowerShell)

### Step 1: Open PowerShell as Administrator

Press `Win + X`, select "Windows PowerShell (Admin)" or "Terminal (Admin)"

### Step 2: Navigate to Project

```powershell
cd C:\Users\YourName\Projects\hairService
# OR wherever you placed the project
```

### Step 3: Create and Activate Virtual Environment

```powershell
# Create virtual environment
python -m venv .venv

# Activate it
.venv\Scripts\Activate.ps1
```

**If you get execution policy error:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Step 4: Run Setup Script

```powershell
.\setup_hairgan.ps1
```

### Step 5: Verify Installation

```powershell
python test_hairgan.py
```

---

## 🚀 Quick Start (Command Prompt)

### Step 1: Open Command Prompt

Press `Win + R`, type `cmd`, press Enter

### Step 2: Navigate to Project

```cmd
cd C:\Users\YourName\Projects\hairService
```

### Step 3: Create and Activate Virtual Environment

```cmd
# Create virtual environment
python -m venv .venv

# Activate it
.venv\Scripts\activate.bat
```

### Step 4: Run Setup Script

```cmd
setup_hairgan.bat
```

### Step 5: Verify Installation

```cmd
python test_hairgan.py
```

---

## 📦 What You Need to Install

### 1. Python (Required)

**Download:** https://www.python.org/downloads/

**During installation:**
- ✅ Check "Add Python to PATH"
- ✅ Check "Install pip"
- ✅ Install for all users (recommended)

**Verify:**
```powershell
python --version
# Should show: Python 3.x.x
```

### 2. Git for Windows (Required)

**Download:** https://git-scm.com/download/win

**During installation:**
- Use default settings
- Select "Git from the command line and also from 3rd-party software"

**Verify:**
```powershell
git --version
# Should show: git version 2.x.x
```

### 3. Visual Studio Build Tools (Optional, for dlib)

**Download:** https://visualstudio.microsoft.com/visual-cpp-build-tools/

**Install:**
- Select "Desktop development with C++"
- Include "C++ CMake tools for Windows"

**Alternative:** Use pre-built dlib wheel
```powershell
pip install dlib-binary
```

---

## 🛠️ Manual Installation (If Scripts Fail)

### Step 1: Clone HairFastGAN

```powershell
git clone https://github.com/AIRI-Institute/HairFastGAN.git
```

### Step 2: Install Dependencies

```powershell
# Install PyTorch (CUDA version - for NVIDIA GPUs)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# OR CPU-only version
pip install torch torchvision

# Install other dependencies
pip install ninja scipy scikit-image tqdm gdown face-alignment

# Install dlib (try these in order)
pip install dlib
# If that fails:
pip install dlib-binary
# If that fails:
pip install cmake
pip install dlib
```

### Step 3: Create Model Directory

```powershell
New-Item -ItemType Directory -Force -Path "HairFastGAN\pretrained_models"
```

### Step 4: Download Models

Visit: https://github.com/AIRI-Institute/HairFastGAN

Check their README or Releases for model download links.

Download these files:
- `e4e_ffhq_encode.pt` (~300 MB)
- `stylegan2-ffhq-config-f.pt` (~500 MB)
- `shape_predictor_68_face_landmarks.dat` (~100 MB)
- `FS_model.pt` (~50 MB)

Place in: `HairFastGAN\pretrained_models\`

### Step 5: Verify

```powershell
python hairgan_setup.py
python test_hairgan.py
```

---

## 🐛 Windows-Specific Troubleshooting

### Issue 1: "python is not recognized"

**Problem:** Python not in PATH

**Fix:**
1. Find Python installation (usually `C:\Users\YourName\AppData\Local\Programs\Python\Python3xx`)
2. Add to PATH:
   - Press `Win + X`, select "System"
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "System variables", find "Path", click "Edit"
   - Click "New", add Python directory
   - Click "New", add Python Scripts directory
   - Click OK, restart terminal

**OR reinstall Python and check "Add to PATH"**

### Issue 2: Execution Policy Error (PowerShell)

**Problem:** 
```
.\setup_hairgan.ps1 : File cannot be loaded because running scripts is disabled
```

**Fix:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue 3: dlib Installation Fails

**Problem:**
```
ERROR: Could not build wheels for dlib
```

**Fix Option 1 - Use pre-built binary:**
```powershell
pip install dlib-binary
```

**Fix Option 2 - Install Build Tools:**
1. Download Visual Studio Build Tools
2. Install "Desktop development with C++"
3. Restart terminal
4. Try again: `pip install dlib`

**Fix Option 3 - Download pre-built wheel:**
1. Visit: https://github.com/sachadee/Dlib
2. Download appropriate `.whl` file for your Python version
3. Install: `pip install path\to\dlib-xxx.whl`

### Issue 4: Git Clone Fails

**Problem:** 
```
fatal: unable to access 'https://github.com/...'
```

**Fix Option 1 - Check internet connection**

**Fix Option 2 - Use shallow clone:**
```powershell
git clone --depth 1 https://github.com/AIRI-Institute/HairFastGAN.git
```

**Fix Option 3 - Download ZIP:**
1. Visit: https://github.com/AIRI-Institute/HairFastGAN
2. Click "Code" → "Download ZIP"
3. Extract to project folder
4. Rename folder to `HairFastGAN`

### Issue 5: CUDA Out of Memory

**Problem:**
```
RuntimeError: CUDA out of memory
```

**Fix - Use CPU mode:**

Edit `config.py`:
```python
HAIRGAN_DEVICE = 'cpu'
```

### Issue 6: Camera Not Detected

**Problem:** Camera not found

**Fix:**
1. Check Windows Privacy Settings:
   - Settings → Privacy & Security → Camera
   - Allow apps to access camera
   - Allow desktop apps to access camera
2. Check Device Manager:
   - Press `Win + X`, select "Device Manager"
   - Expand "Cameras" or "Imaging devices"
   - Ensure camera is enabled

### Issue 7: Virtual Environment Issues

**Problem:** Can't activate venv

**Fix:**
```powershell
# Remove old venv
Remove-Item -Recurse -Force .venv

# Create fresh venv
python -m venv .venv

# Activate
.venv\Scripts\Activate.ps1
```

---

## 💻 Windows-Specific Tips

### 1. Using PowerShell vs Command Prompt

**PowerShell (Recommended):**
- More powerful
- Better script support
- Modern Windows default

**Command Prompt:**
- Traditional Windows shell
- Works with `.bat` files
- Simpler for basic tasks

### 2. Path Separators

Windows uses backslashes (`\`):
```powershell
C:\Users\Name\Projects\hairService
```

In Python, use forward slashes or escaped backslashes:
```python
"C:/Users/Name/Projects/hairService"
# OR
"C:\\Users\\Name\\Projects\\hairService"
```

### 3. GPU Support on Windows

**Check if you have NVIDIA GPU:**
```powershell
nvidia-smi
```

**Install CUDA-enabled PyTorch:**
```powershell
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

**Verify CUDA:**
```powershell
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"
```

### 4. Antivirus Considerations

Some antivirus software may block:
- Python script execution
- Git operations
- Model downloads

**Temporary fix:** Add project folder to antivirus exceptions

---

## 📊 Expected File Structure (Windows)

```
C:\Users\YourName\Projects\hairService\
├── HairFastGAN\
│   ├── models\
│   ├── utils\
│   ├── inference.py
│   └── pretrained_models\
│       ├── e4e_ffhq_encode.pt
│       ├── stylegan2-ffhq-config-f.pt
│       ├── shape_predictor_68_face_landmarks.dat
│       └── FS_model.pt
├── .venv\
│   ├── Scripts\
│   │   ├── activate.bat
│   │   ├── Activate.ps1
│   │   └── python.exe
│   └── Lib\
├── hairgan_setup.py
├── test_hairgan.py
├── setup_hairgan.ps1       ← PowerShell script
├── setup_hairgan.bat       ← Batch script
└── main.py
```

---

## 🎮 Daily Usage (Windows)

### PowerShell:

```powershell
# Navigate to project
cd C:\Users\YourName\Projects\hairService

# Activate venv
.venv\Scripts\Activate.ps1

# Run pipeline
python main.py

# Deactivate when done
deactivate
```

### Command Prompt:

```cmd
# Navigate to project
cd C:\Users\YourName\Projects\hairService

# Activate venv
.venv\Scripts\activate.bat

# Run pipeline
python main.py

# Deactivate when done
deactivate
```

---

## ⚙️ System Requirements (Windows)

### Minimum:
- **OS:** Windows 10 64-bit (version 1809 or later)
- **CPU:** Intel Core i5 or AMD Ryzen 5
- **RAM:** 8 GB
- **Storage:** 5 GB free space
- **GPU:** Optional (CPU mode works)

### Recommended:
- **OS:** Windows 11 64-bit
- **CPU:** Intel Core i7 or AMD Ryzen 7
- **RAM:** 16 GB
- **Storage:** 10 GB free space
- **GPU:** NVIDIA GPU with 4+ GB VRAM (CUDA support)

---

## 🔗 Useful Windows Commands

```powershell
# Check Python version
python --version

# Check pip version
pip --version

# List installed packages
pip list

# Check CUDA availability
python -c "import torch; print(torch.cuda.is_available())"

# Check OpenCV
python -c "import cv2; print(cv2.__version__)"

# View video info
python -c "from video_utils import print_video_info; print_video_info('output/final_output.mp4')"

# Open output directory
explorer output

# Open video in default player
start output\final_output.mp4
```

---

## 📚 Additional Resources

### Downloads:
- **Python:** https://www.python.org/downloads/
- **Git:** https://git-scm.com/download/win
- **VS Build Tools:** https://visualstudio.microsoft.com/downloads/
- **CUDA Toolkit:** https://developer.nvidia.com/cuda-downloads

### Documentation:
- `QUICKSTART_HAIRGAN.md` - Quick 5-minute guide
- `HAIRGAN_INTEGRATION.md` - Complete integration guide
- `SETUP_GUIDE.md` - General setup guide
- `README_PIPELINE.md` - Pipeline usage guide

### Video Tutorials:
Check YouTube for "Python virtual environment Windows" tutorials

---

## ✅ Windows Installation Checklist

Before running the pipeline:

- [ ] Python 3.8+ installed and in PATH
- [ ] Git for Windows installed
- [ ] Virtual environment created
- [ ] Virtual environment activated (see prompt: `(.venv)`)
- [ ] HairFastGAN repository cloned
- [ ] Dependencies installed
- [ ] Pre-trained models downloaded
- [ ] `python hairgan_setup.py` shows all ✅
- [ ] `python test_hairgan.py` passes
- [ ] Camera accessible (if using capture)

---

**Windows Guide Version:** 1.0  
**Last Updated:** October 2025  
**Compatible With:** Windows 10/11, Python 3.8+
