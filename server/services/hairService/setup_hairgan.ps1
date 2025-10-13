Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎨 HairFastGAN Integration Setup for Windows" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check if virtual environment is activated
if ($env:VIRTUAL_ENV -eq $null) {
    Write-Host "⚠️  Virtual environment not activated!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please run:" -ForegroundColor Yellow
    Write-Host "  .venv\Scripts\Activate.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this script again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "If you get execution policy error, run:" -ForegroundColor Yellow
    Write-Host "  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor White
    exit 1
}

Write-Host "✅ Virtual environment detected: $env:VIRTUAL_ENV" -ForegroundColor Green
Write-Host ""

# Step 1: Clone HairFastGAN
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📥 Step 1: Cloning HairFastGAN Repository" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "HairFastGAN") {
    Write-Host "⚠️  HairFastGAN directory already exists." -ForegroundColor Yellow
    $response = Read-Host "   Do you want to re-clone? This will delete the existing directory. (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "   Removing existing directory..." -ForegroundColor Gray
        Remove-Item -Recurse -Force HairFastGAN
        git clone https://github.com/AIRI-Institute/HairFastGAN.git
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Repository re-cloned successfully" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to clone repository" -ForegroundColor Red
            Write-Host "   Try: git clone --depth 1 https://github.com/AIRI-Institute/HairFastGAN.git" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "   Using existing directory" -ForegroundColor Gray
    }
} else {
    Write-Host "Cloning from GitHub..." -ForegroundColor Gray
    git clone https://github.com/AIRI-Institute/HairFastGAN.git
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Repository cloned successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to clone repository" -ForegroundColor Red
        Write-Host "   Make sure git is installed and you have internet connection" -ForegroundColor Yellow
        exit 1
    }
}
Write-Host ""

# Step 2: Install dependencies
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📦 Step 2: Installing HairFastGAN Dependencies" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Push-Location HairFastGAN

if (Test-Path "requirements.txt") {
    Write-Host "Installing from requirements.txt..." -ForegroundColor Gray
    pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Some packages failed to install, continuing with manual installation..." -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  No requirements.txt found." -ForegroundColor Yellow
}

Write-Host "Installing core dependencies..." -ForegroundColor Gray

# Core dependencies
Write-Host "   Installing PyTorch and TorchVision..." -ForegroundColor Gray
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ⚠️  CUDA version failed, trying CPU version..." -ForegroundColor Yellow
    pip install torch torchvision
}

Write-Host "   Installing other dependencies..." -ForegroundColor Gray
pip install ninja
pip install scipy
pip install scikit-image
pip install tqdm
pip install gdown

# Face processing
Write-Host ""
Write-Host "Installing face processing libraries..." -ForegroundColor Gray
pip install face-alignment

# dlib (special handling for Windows)
Write-Host ""
Write-Host "Installing dlib (this may take a while)..." -ForegroundColor Gray
pip install dlib
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ⚠️  dlib standard installation failed" -ForegroundColor Yellow
    Write-Host "   Trying dlib-binary..." -ForegroundColor Gray
    pip install dlib-binary
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ⚠️  dlib installation failed. Face detection may not work." -ForegroundColor Yellow
        Write-Host "   You may need to:" -ForegroundColor Yellow
        Write-Host "   1. Install Visual Studio Build Tools" -ForegroundColor White
        Write-Host "   2. Install CMake" -ForegroundColor White
        Write-Host "   3. Try: pip install cmake" -ForegroundColor White
        Write-Host "   4. Then: pip install dlib" -ForegroundColor White
    }
}

Pop-Location
Write-Host ""
Write-Host "✅ Dependencies installation complete" -ForegroundColor Green
Write-Host ""

# Step 3: Create model directory
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📁 Step 3: Setting Up Model Directories" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

New-Item -ItemType Directory -Force -Path "HairFastGAN\pretrained_models" | Out-Null
Write-Host "✅ Model directory created: HairFastGAN\pretrained_models\" -ForegroundColor Green
Write-Host ""

# Step 4: Download models
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📥 Step 4: Downloading Pre-trained Models" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Push-Location HairFastGAN

# Check for download script
if (Test-Path "download_models.py") {
    Write-Host "Found download_models.py - running..." -ForegroundColor Gray
    python download_models.py
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Models downloaded via script" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Download script failed" -ForegroundColor Yellow
    }
} elseif (Test-Path "scripts\download_models.ps1") {
    Write-Host "Found download PowerShell script - running..." -ForegroundColor Gray
    & "scripts\download_models.ps1"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Models downloaded via script" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Download script failed" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  No automatic download script found." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "📖 Manual Download Instructions" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Please download the following model files:" -ForegroundColor White
    Write-Host ""
    Write-Host "1. Visit: https://github.com/AIRI-Institute/HairFastGAN" -ForegroundColor White
    Write-Host "2. Check the README for model download links" -ForegroundColor White
    Write-Host "3. Or check releases: https://github.com/AIRI-Institute/HairFastGAN/releases" -ForegroundColor White
    Write-Host ""
    Write-Host "Required files:" -ForegroundColor Yellow
    Write-Host "  ✓ e4e_ffhq_encode.pt (or similar encoder model)" -ForegroundColor White
    Write-Host "  ✓ stylegan2-ffhq-config-f.pt (or similar StyleGAN model)" -ForegroundColor White
    Write-Host "  ✓ shape_predictor_68_face_landmarks.dat (dlib face detector)" -ForegroundColor White
    Write-Host "  ✓ FS_model.pt (face segmentation model)" -ForegroundColor White
    Write-Host ""
    $currentPath = Get-Location
    Write-Host "Place them in: $currentPath\pretrained_models\" -ForegroundColor White
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    
    $response = Read-Host "Press Enter after you've downloaded the models, or type 'skip' to skip"
    if ($response -ne "skip") {
        Write-Host "Continuing..." -ForegroundColor Gray
    }
}

Pop-Location
Write-Host ""

# Step 5: Verify installation
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🔍 Step 5: Verifying Installation" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

python hairgan_setup.py

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ HairFastGAN Setup Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Verify the installation:" -ForegroundColor White
Write-Host "   python hairgan_setup.py" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Test the integration:" -ForegroundColor White
Write-Host "   python test_hairgan.py" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Run the complete pipeline:" -ForegroundColor White
Write-Host "   python main.py" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Or try examples:" -ForegroundColor White
Write-Host "   python examples.py" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 Documentation:" -ForegroundColor Yellow
Write-Host "   - HAIRGAN_INTEGRATION.md - Full integration guide" -ForegroundColor White
Write-Host "   - README_PIPELINE.md - Pipeline usage" -ForegroundColor White
Write-Host "   - FLOWCHAR.md - Visual flowcharts" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "   - If models are missing, check HAIRGAN_INTEGRATION.md" -ForegroundColor White
Write-Host "   - For GPU issues, see troubleshooting section" -ForegroundColor White
Write-Host "   - Use CPU if CUDA unavailable (slower but works)" -ForegroundColor White
Write-Host ""
