#!/bin/bash

# Hair Try-On Service Setup Script for Linux/macOS
# This script sets up the hair try-on service with all dependencies

set -e

echo "=========================================="
echo "Hair Try-On Service Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed${NC}"
    echo "Please install Python 3.11 or higher"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo -e "${GREEN}✓ Python $PYTHON_VERSION found${NC}"

# Navigate to hair-tryOn-service directory
cd "$(dirname "$0")/../services/hair-tryOn-service" || exit 1

echo ""
echo "Step 1: Creating virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "${YELLOW}Virtual environment already exists${NC}"
fi

# Activate virtual environment
source venv/bin/activate

echo ""
echo "Step 2: Upgrading pip..."
pip install --upgrade pip setuptools wheel

echo ""
echo "Step 3: Installing Python dependencies..."
pip install -r requirements.txt

echo ""
echo "Step 4: Installing additional dependencies for hair try-on..."
pip install replicate requests aiohttp

echo ""
echo "Step 5: Creating necessary directories..."
mkdir -p models uploads temp

echo ""
echo "Step 6: Setting up environment variables..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please edit .env file and add your REPLICATE_API_TOKEN${NC}"
    echo -e "${YELLOW}  Get your free API token from: https://replicate.com/account/api-tokens${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

echo ""
echo "Step 7: Validating installation..."
python3 -c "import fastapi, cv2, numpy, PIL, replicate; print('All packages imported successfully')" && \
    echo -e "${GREEN}✓ All dependencies installed correctly${NC}" || \
    echo -e "${RED}✗ Some dependencies failed to install${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Get a free Replicate API token from: https://replicate.com/account/api-tokens"
echo "2. Add it to services/hair-tryOn-service/.env as REPLICATE_API_TOKEN=your_token_here"
echo "3. Start the service with: cd services/hair-tryOn-service && source venv/bin/activate && uvicorn app.main:app --reload"
echo ""
echo "Or use Docker Compose: docker-compose up hair-tryOn-service"
echo ""
