@echo off
REM Skin Analysis ML Model Setup Script for Windows 11
REM This script sets up the development environment for the skin analysis service

setlocal enabledelayedexpansion

REM Color codes are not directly supported in batch, but we can use simple formatting
echo ==========================================
echo   Skin Analysis ML Model Setup (Windows)
echo ==========================================
echo.

REM Step 1: Check Python version
echo [Step 1/8] Checking Python installation...

where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8 or higher from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

REM Get Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i

REM Extract major and minor version
for /f "tokens=1,2 delims=." %%a in ("%PYTHON_VERSION%") do (
    set PYTHON_MAJOR=%%a
    set PYTHON_MINOR=%%b
)

echo [OK] Found Python %PYTHON_VERSION%

REM Check if Python version is 3.8 or higher
if %PYTHON_MAJOR% LSS 3 (
    echo [ERROR] Python 3.8 or higher is required (found %PYTHON_VERSION%^)
    pause
    exit /b 1
)
if %PYTHON_MAJOR% EQU 3 if %PYTHON_MINOR% LSS 8 (
    echo [ERROR] Python 3.8 or higher is required (found %PYTHON_VERSION%^)
    pause
    exit /b 1
)

echo [OK] Python version check passed (3.8+ required^)
echo.

REM Step 2: Create virtual environment
echo [Step 2/8] Setting up virtual environment...

if exist "venv" (
    echo [WARNING] Virtual environment already exists
    set /p RECREATE="Do you want to recreate it? (y/N): "
    if /i "!RECREATE!"=="y" (
        echo [WARNING] Removing existing virtual environment...
        rmdir /s /q venv
        python -m venv venv
        echo [OK] Virtual environment recreated
    ) else (
        echo [OK] Using existing virtual environment
    )
) else (
    python -m venv venv
    echo [OK] Virtual environment created
)

REM Activate virtual environment
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] Failed to activate virtual environment
    pause
    exit /b 1
)
echo [OK] Virtual environment activated
echo.

REM Step 3: Upgrade pip
echo [Step 3/8] Upgrading pip...
python -m pip install --upgrade pip --quiet
if errorlevel 1 (
    echo [WARNING] Failed to upgrade pip, continuing anyway...
) else (
    echo [OK] pip upgraded to latest version
)
echo.

REM Step 4: Detect GPU and install PyTorch
echo [Step 4/8] Detecting hardware and installing PyTorch...

set GPU_AVAILABLE=false
where nvidia-smi >nul 2>&1
if not errorlevel 1 (
    nvidia-smi >nul 2>&1
    if not errorlevel 1 (
        set GPU_AVAILABLE=true
        echo [OK] NVIDIA GPU detected
        echo.
        nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader
        echo.
    ) else (
        echo [WARNING] nvidia-smi found but failed to query GPU
    )
) else (
    echo [WARNING] nvidia-smi not found - no NVIDIA GPU detected
)

echo.
if "!GPU_AVAILABLE!"=="true" (
    echo Installing PyTorch with CUDA 11.8 support...
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118 --quiet
    if errorlevel 1 (
        echo [ERROR] Failed to install PyTorch with CUDA support
        echo Falling back to CPU-only version...
        pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu --quiet
    ) else (
        echo [OK] PyTorch with CUDA support installed
    )
) else (
    echo Installing CPU-only PyTorch...
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu --quiet
    if errorlevel 1 (
        echo [ERROR] Failed to install PyTorch
        pause
        exit /b 1
    )
    echo [OK] PyTorch (CPU-only^) installed
)
echo.

REM Step 5: Install dependencies
echo [Step 5/8] Installing project dependencies...

if not exist "requirements.txt" (
    echo [ERROR] requirements.txt not found
    pause
    exit /b 1
)

REM Install dependencies excluding torch and torchvision (already installed)
REM Create a temporary filtered requirements file
type nul > requirements_filtered.txt
for /f "usebackq delims=" %%a in ("requirements.txt") do (
    echo %%a | findstr /i /v "^torch" | findstr /i /v "^torchvision" >> requirements_filtered.txt
)

pip install -r requirements_filtered.txt --quiet
if errorlevel 1 (
    echo [WARNING] Some dependencies may have failed to install
    echo Please check the output above for errors
) else (
    echo [OK] All dependencies installed
)

del requirements_filtered.txt
echo.

REM Step 6: Create necessary directories
echo [Step 6/8] Creating project directories...

if not exist "models" mkdir models
if not exist "models\cache" mkdir models\cache
if not exist "scripts" mkdir scripts
if not exist "uploads" mkdir uploads
if not exist "app\ml" mkdir app\ml

echo [OK] Project directories created
echo.

REM Step 7: Download models
echo [Step 7/8] Downloading ML models...

if exist "scripts\download_models.py" (
    echo Running model download script...
    python scripts\download_models.py --model efficientnet_b0 --verify
    if errorlevel 1 (
        echo [WARNING] Model download script failed or models already exist
        echo You can manually run: python scripts\download_models.py
    )
) else (
    echo [WARNING] Model download script not found at scripts\download_models.py
    echo Please ensure the model download script is implemented
    echo You can run it manually later: python scripts\download_models.py
)
echo.

REM Step 8: Run validation tests
echo [Step 8/8] Running validation tests...

if exist "scripts\validate_model.py" (
    echo Running model validation...
    python scripts\validate_model.py
    if errorlevel 1 (
        echo [WARNING] Model validation failed
        echo This is expected if models haven't been downloaded yet
    )
) else if exist "validate_service.py" (
    echo Running service validation...
    python validate_service.py
    if errorlevel 1 (
        echo [WARNING] Service validation encountered issues
    )
) else (
    echo [WARNING] Validation script not found
    echo Skipping validation - you can run tests manually with: pytest tests/
)
echo.

REM Final summary
echo ==========================================
echo           Setup Complete!
echo ==========================================
echo.
echo [OK] Environment configured successfully
echo.
echo System Information:
echo   Python Version: %PYTHON_VERSION%
echo   GPU Available: !GPU_AVAILABLE!
echo   Virtual Environment: %CD%\venv
echo.
echo Next Steps:
echo   1. Activate the virtual environment:
echo      venv\Scripts\activate.bat
echo.
echo   2. Start the development server:
echo      uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
echo.
echo   3. Run tests:
echo      pytest tests/ -v
echo.
echo   4. View API documentation:
echo      http://localhost:3003/docs
echo.
echo For troubleshooting, check the README.md file
echo ==========================================
echo.
pause
