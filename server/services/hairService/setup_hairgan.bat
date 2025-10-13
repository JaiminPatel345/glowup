@echo off
setlocal enabledelayedexpansion

echo ================================================================
echo        HairFastGAN Integration Setup for Windows
echo ================================================================
echo.

REM Check if virtual environment is activated
if not defined VIRTUAL_ENV (
    echo [WARNING] Virtual environment not activated!
    echo.
    echo Please run:
    echo   .venv\Scripts\activate.bat
    echo.
    echo Then run this script again.
    pause
    exit /b 1
)

echo [OK] Virtual environment detected: %VIRTUAL_ENV%
echo.

REM Step 1: Clone HairFastGAN
echo ================================================================
echo Step 1: Cloning HairFastGAN Repository
echo ================================================================
echo.

if exist "HairFastGAN" (
    echo [WARNING] HairFastGAN directory already exists.
    set /p response="Do you want to re-clone? This will delete the existing directory. (y/N): "
    if /i "!response!"=="y" (
        echo Removing existing directory...
        rmdir /s /q HairFastGAN
        git clone https://github.com/AIRI-Institute/HairFastGAN.git
        if !errorlevel! equ 0 (
            echo [OK] Repository re-cloned successfully
        ) else (
            echo [ERROR] Failed to clone repository
            echo Try: git clone --depth 1 https://github.com/AIRI-Institute/HairFastGAN.git
            pause
            exit /b 1
        )
    ) else (
        echo Using existing directory
    )
) else (
    echo Cloning from GitHub...
    git clone https://github.com/AIRI-Institute/HairFastGAN.git
    if !errorlevel! equ 0 (
        echo [OK] Repository cloned successfully
    ) else (
        echo [ERROR] Failed to clone repository
        echo Make sure git is installed and you have internet connection
        pause
        exit /b 1
    )
)
echo.

REM Step 2: Install dependencies
echo ================================================================
echo Step 2: Installing HairFastGAN Dependencies
echo ================================================================
echo.

cd HairFastGAN

if exist "requirements.txt" (
    echo Installing from requirements.txt...
    pip install -r requirements.txt
)

echo Installing core dependencies...
echo.

echo Installing PyTorch and TorchVision...
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
if !errorlevel! neq 0 (
    echo [WARNING] CUDA version failed, trying CPU version...
    pip install torch torchvision
)

echo Installing other dependencies...
pip install ninja scipy scikit-image tqdm gdown

echo.
echo Installing face processing libraries...
pip install face-alignment

echo.
echo Installing dlib (this may take a while)...
pip install dlib
if !errorlevel! neq 0 (
    echo [WARNING] dlib standard installation failed
    echo Trying dlib-binary...
    pip install dlib-binary
    if !errorlevel! neq 0 (
        echo [WARNING] dlib installation failed. Face detection may not work.
        echo You may need to:
        echo   1. Install Visual Studio Build Tools
        echo   2. Install CMake
        echo   3. Try: pip install cmake
        echo   4. Then: pip install dlib
    )
)

cd ..
echo.
echo [OK] Dependencies installation complete
echo.

REM Step 3: Create model directory
echo ================================================================
echo Step 3: Setting Up Model Directories
echo ================================================================
echo.

if not exist "HairFastGAN\pretrained_models" mkdir HairFastGAN\pretrained_models
echo [OK] Model directory created: HairFastGAN\pretrained_models\
echo.

REM Step 4: Download models
echo ================================================================
echo Step 4: Downloading Pre-trained Models
echo ================================================================
echo.

cd HairFastGAN

if exist "download_models.py" (
    echo Found download_models.py - running...
    python download_models.py
    if !errorlevel! equ 0 (
        echo [OK] Models downloaded via script
    ) else (
        echo [WARNING] Download script failed
    )
) else (
    echo [WARNING] No automatic download script found.
    echo.
    echo ================================================================
    echo Manual Download Instructions
    echo ================================================================
    echo.
    echo Please download the following model files:
    echo.
    echo 1. Visit: https://github.com/AIRI-Institute/HairFastGAN
    echo 2. Check the README for model download links
    echo 3. Or check releases
    echo.
    echo Required files:
    echo   - e4e_ffhq_encode.pt (or similar encoder model)
    echo   - stylegan2-ffhq-config-f.pt (or similar StyleGAN model)
    echo   - shape_predictor_68_face_landmarks.dat (dlib face detector)
    echo   - FS_model.pt (face segmentation model)
    echo.
    echo Place them in: %CD%\pretrained_models\
    echo.
    echo ================================================================
    echo.
    
    set /p response="Press Enter after you've downloaded the models, or type 'skip' to skip: "
)

cd ..
echo.

REM Step 5: Verify installation
echo ================================================================
echo Step 5: Verifying Installation
echo ================================================================
echo.

python hairgan_setup.py

echo.
echo ================================================================
echo Setup Complete!
echo ================================================================
echo.
echo Next Steps:
echo.
echo 1. Verify the installation:
echo    python hairgan_setup.py
echo.
echo 2. Test the integration:
echo    python test_hairgan.py
echo.
echo 3. Run the complete pipeline:
echo    python main.py
echo.
echo 4. Or try examples:
echo    python examples.py
echo.
echo Documentation:
echo    - HAIRGAN_INTEGRATION.md - Full integration guide
echo    - README_PIPELINE.md - Pipeline usage
echo    - FLOWCHAR.md - Visual flowcharts
echo.
echo Tips:
echo    - If models are missing, check HAIRGAN_INTEGRATION.md
echo    - For GPU issues, see troubleshooting section
echo    - Use CPU if CUDA unavailable (slower but works)
echo.

pause
