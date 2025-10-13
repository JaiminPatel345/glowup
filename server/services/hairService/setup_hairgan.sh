#!/bin/bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎨 HairFastGAN Integration Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if virtual environment is activated
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "⚠️  Virtual environment not activated!"
    echo ""
    echo "Please run:"
    echo "  source .venv/bin/activate"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ Virtual environment detected: $VIRTUAL_ENV"
echo ""

# Step 1: Clone HairFastGAN
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📥 Step 1: Cloning HairFastGAN Repository"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -d "HairFastGAN" ]; then
    echo "⚠️  HairFastGAN directory already exists."
    read -p "   Do you want to re-clone? This will delete the existing directory. (y/N): " response
    if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
        echo "   Removing existing directory..."
        rm -rf HairFastGAN
        git clone https://github.com/AIRI-Institute/HairFastGAN.git
        echo "✅ Repository re-cloned"
    else
        echo "   Using existing directory"
    fi
else
    echo "Cloning from GitHub..."
    git clone https://github.com/AIRI-Institute/HairFastGAN.git
    echo "✅ Repository cloned successfully"
fi
echo ""

# Step 2: Install dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 2: Installing HairFastGAN Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd HairFastGAN

if [ -f "requirements.txt" ]; then
    echo "Installing from requirements.txt..."
    pip install -r requirements.txt
else
    echo "⚠️  No requirements.txt found."
    echo "Installing common dependencies..."
    
    # Core dependencies
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
    pip install ninja
    pip install scipy
    pip install scikit-image
    pip install tqdm
    pip install gdown
    
    # Face processing
    echo ""
    echo "Installing face processing libraries..."
    pip install face-alignment
    
    # dlib (with error handling)
    echo ""
    echo "Installing dlib (this may take a while)..."
    pip install dlib || {
        echo "⚠️  dlib installation failed. Trying alternative..."
        pip install dlib-binary || {
            echo "⚠️  Could not install dlib. Face detection may not work."
            echo "   For Ubuntu/Debian, install build dependencies:"
            echo "   sudo apt-get install build-essential cmake libopenblas-dev liblapack-dev"
        }
    }
fi

cd ..
echo ""
echo "✅ Dependencies installed"
echo ""

# Step 3: Create model directory
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 Step 3: Setting Up Model Directories"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

mkdir -p HairFastGAN/pretrained_models
echo "✅ Model directory created: HairFastGAN/pretrained_models/"
echo ""

# Step 4: Download models
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📥 Step 4: Downloading Pre-trained Models"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd HairFastGAN

# Check for download script
if [ -f "download_models.py" ]; then
    echo "Found download_models.py - running..."
    python download_models.py
    echo "✅ Models downloaded via script"
elif [ -f "scripts/download_models.sh" ]; then
    echo "Found download script - running..."
    bash scripts/download_models.sh
    echo "✅ Models downloaded via script"
else
    echo "⚠️  No automatic download script found."
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📖 Manual Download Instructions"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Please download the following model files:"
    echo ""
    echo "1. Visit: https://github.com/AIRI-Institute/HairFastGAN"
    echo "2. Check the README for model download links"
    echo "3. Or check releases: https://github.com/AIRI-Institute/HairFastGAN/releases"
    echo ""
    echo "Required files:"
    echo "  ✓ e4e_ffhq_encode.pt (or similar encoder model)"
    echo "  ✓ stylegan2-ffhq-config-f.pt (or similar StyleGAN model)"
    echo "  ✓ shape_predictor_68_face_landmarks.dat (dlib face detector)"
    echo "  ✓ FS_model.pt (face segmentation model)"
    echo ""
    echo "Place them in: $(pwd)/pretrained_models/"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    read -p "Press Enter after you've downloaded the models, or Ctrl+C to exit..."
fi

cd ..
echo ""

# Step 5: Verify installation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Step 5: Verifying Installation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

python hairgan_setup.py

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ HairFastGAN Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Next Steps:"
echo ""
echo "1. Verify the installation:"
echo "   python hairgan_setup.py"
echo ""
echo "2. Test the integration:"
echo "   python test_hairgan.py"
echo ""
echo "3. Run the complete pipeline:"
echo "   python main.py"
echo ""
echo "4. Or try examples:"
echo "   python examples.py"
echo ""
echo "📖 Documentation:"
echo "   - HAIRGAN_INTEGRATION.md - Full integration guide"
echo "   - README_PIPELINE.md - Pipeline usage"
echo "   - FLOWCHAR.md - Visual flowcharts"
echo ""
echo "💡 Tips:"
echo "   - If models are missing, check HAIRGAN_INTEGRATION.md"
echo "   - For GPU issues, see troubleshooting section"
echo "   - Use CPU if CUDA unavailable (slower but works)"
echo ""
