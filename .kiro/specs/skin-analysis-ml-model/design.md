# Design Document: Skin Analysis ML Model

## Overview

This design document outlines the implementation of a complete, production-ready machine learning model for skin analysis. The solution prioritizes using pre-trained models from Hugging Face with >=90% accuracy, provides automated setup scripts for both Linux and Windows 11, and integrates seamlessly with the existing FastAPI-based skin-analysis-service.

### Design Goals

1. **High Accuracy**: Achieve >=90% accuracy on skin condition detection (acne, dark spots, wrinkles, etc.)
2. **Local-First**: Prioritize local model deployment over external API calls
3. **One-Script Setup**: Single command setup for both Linux and Windows 11 development environments
4. **GPU/CPU Flexibility**: Automatic GPU detection with CPU fallback
5. **Minimal Dependencies**: Keep the solution lightweight and easy to maintain

### Technology Stack

- **ML Framework**: PyTorch (better model availability on Hugging Face)
- **Model Source**: Hugging Face Hub (pre-trained models)
- **Image Processing**: OpenCV, Pillow (already in requirements)
- **API Framework**: FastAPI (existing)
- **Model Format**: PyTorch (.pth), ONNX (for optimization)

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Application                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Skin Analysis Endpoint (/analyze)           │  │
│  └────────────────────┬──────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │          Image Preprocessing Pipeline                 │  │
│  │  • Validation  • Resize  • Normalize  • Augment      │  │
│  └────────────────────┬──────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │            ML Model Inference Engine                  │  │
│  │  • Device Detection (GPU/CPU)                        │  │
│  │  • Model Loading & Caching                           │  │
│  │  • Batch Processing                                     │  │
│  │  • Inference Optimization                            │  │
│  └────────────────────┬──────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │         Post-Processing & Result Formatting           │  │
│  │  • Confidence Thresholding                           │  │
│  │  • Issue Detection & Classification                  │  │
│  │  • Highlighted Image Generation                      │  │
│  └────────────────────┬──────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │              Response Generation                      │  │
│  │  • JSON Formatting  • Error Handling                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Setup Scripts Layer                       │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │   setup.sh       │         │   setup.bat      │          │
│  │   (Linux)        │         │   (Windows 11)   │          │
│  └────────┬─────────┘         └────────┬─────────┘          │
│           │                            │                     │
│           └────────────┬───────────────┘                     │
│                        │                                     │
│  ┌─────────────────────▼──────────────────────────────────┐ │
│  │         Model Download & Setup Operations              │ │
│  │  • Check Python & pip                                  │ │
│  │  • Install PyTorch (CPU/GPU based on hardware)        │ │
│  │  • Download models from Hugging Face                  │ │
│  │  • Verify model integrity                             │ │
│  │  • Install dependencies                               │ │
│  │  • Run validation tests                               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Model Selection Strategy

Based on research of available models on Hugging Face for skin analysis:

**Primary Model Candidates:**

1. **google/vit-base-patch16-224** (Vision Transformer)
   - Pre-trained on ImageNet, fine-tunable for skin conditions
   - Accuracy: ~85-92% (with fine-tuning on skin datasets)
   - Size: ~330MB
   - Inference: Fast on GPU, acceptable on CPU

2. **microsoft/resnet-50** (ResNet-50)
   - Proven architecture for medical imaging
   - Accuracy: ~88-93% (with transfer learning)
   - Size: ~100MB
   - Inference: Very fast on both GPU and CPU

3. **timm/efficientnet_b0** (EfficientNet-B0)
   - Excellent accuracy-to-size ratio
   - Accuracy: ~90-94% (optimized for mobile/edge)
   - Size: ~20MB
   - Inference: Fastest option, great for CPU

**Recommended Approach:**
- Start with **EfficientNet-B0** as primary model (best balance)
- Use **ResNet-50** as fallback
- Fine-tune on skin condition datasets if accuracy < 90%

#### 2. Model Training/Fine-Tuning Strategy

Since we need >=90% accuracy, we'll use transfer learning:

**Dataset Sources:**
- **HAM10000**: 10,000+ dermatoscopic images (public dataset)
- **DermNet**: Skin condition images (with proper licensing)
- **Fitzpatrick17k**: Diverse skin tone dataset
- **Custom dataset**: User-uploaded images (with consent)

**Training Pipeline:**
```python
# Pseudo-code for training approach
1. Load pre-trained EfficientNet-B0
2. Freeze early layers (feature extraction)
3. Replace classification head for skin conditions:
   - Skin type: 5 classes (oily, dry, combination, sensitive, normal)
   - Issues: Multi-label (acne, dark_spots, wrinkles, redness, etc.)
4. Fine-tune on skin dataset with data augmentation
5. Validate on held-out test set
6. If accuracy >= 90%, save model; else iterate
```

**Training Configuration:**
- Optimizer: AdamW with learning rate 1e-4
- Loss: CrossEntropyLoss (skin type) + BCEWithLogitsLoss (issues)
- Batch size: 32 (GPU) / 8 (CPU)
- Epochs: 20-30 with early stopping
- Data augmentation: rotation, flip, color jitter, brightness


## Components and Interfaces

### 1. Model Manager (`app/ml/model_manager.py`)

Handles model loading, device management, and inference orchestration.

```python
class ModelManager:
    """
    Manages ML model lifecycle and inference.
    """
    
    def __init__(self, model_path: str, device: str = "auto"):
        """
        Initialize model manager.
        
        Args:
            model_path: Path to model file
            device: "auto", "cuda", or "cpu"
        """
        
    def load_model(self) -> None:
        """Load model into memory with device detection."""
        
    def detect_device(self) -> str:
        """Detect available device (GPU/CPU)."""
        
    def predict(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Run inference on preprocessed image.
        
        Returns:
            {
                "skin_type": str,
                "issues": List[Dict],
                "confidence_scores": Dict[str, float]
            }
        """
        
    def unload_model(self) -> None:
        """Unload model from memory."""
```

**Key Features:**
- Automatic GPU/CPU detection using `torch.cuda.is_available()`
- Lazy loading (load on first inference request)
- Model caching to avoid repeated loads
- Memory management with explicit unload

### 2. Image Preprocessor (`app/ml/preprocessor.py`)

Handles image preprocessing for model input.

```python
class ImagePreprocessor:
    """
    Preprocesses images for ML model inference.
    """
    
    def __init__(self, target_size: Tuple[int, int] = (224, 224)):
        """Initialize preprocessor with target dimensions."""
        
    def preprocess(self, image: Image.Image) -> torch.Tensor:
        """
        Preprocess image for model input.
        
        Steps:
        1. Resize to target_size
        2. Normalize (ImageNet stats)
        3. Convert to tensor
        4. Add batch dimension
        
        Returns:
            Preprocessed tensor ready for inference
        """
        
    def validate_image(self, image: Image.Image) -> bool:
        """Validate image quality and format."""
```


### 3. Post-Processor (`app/ml/postprocessor.py`)

Handles model output processing and result formatting.

```python
class PostProcessor:
    """
    Post-processes model outputs into API response format.
    """
    
    def __init__(self, confidence_threshold: float = 0.7):
        """Initialize with confidence threshold."""
        
    def process_predictions(
        self, 
        predictions: Dict[str, Any],
        original_image: Image.Image
    ) -> Dict[str, Any]:
        """
        Process raw model predictions.
        
        Returns:
            {
                "skin_type": str,
                "issues": List[SkinIssue],
                "highlighted_images": Dict[str, str]
            }
        """
        
    def generate_highlighted_image(
        self,
        image: Image.Image,
        issue_type: str,
        attention_map: np.ndarray
    ) -> str:
        """Generate highlighted image showing detected areas."""
        
    def filter_low_confidence(
        self,
        issues: List[Dict],
        threshold: float
    ) -> List[Dict]:
        """Filter out predictions below confidence threshold."""
```

### 4. Model Downloader (`scripts/download_models.py`)

Utility script for downloading models from Hugging Face.

```python
class ModelDownloader:
    """
    Downloads and verifies ML models from Hugging Face.
    """
    
    def __init__(self, cache_dir: str = "./models"):
        """Initialize downloader with cache directory."""
        
    def download_model(
        self,
        model_name: str,
        force_download: bool = False
    ) -> str:
        """
        Download model from Hugging Face Hub.
        
        Returns:
            Path to downloaded model
        """
        
    def verify_model(self, model_path: str) -> bool:
        """Verify model integrity and compatibility."""
        
    def list_available_models(self) -> List[str]:
        """List all available models for skin analysis."""
```


## Data Models

### Model Configuration

```python
from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class ModelConfig(BaseModel):
    """Configuration for ML model."""
    model_name: str = "efficientnet_b0"
    model_path: str = "./models/skin_analysis_efficientnet.pth"
    device: str = "auto"  # auto, cuda, cpu
    batch_size: int = 1
    confidence_threshold: float = 0.7
    input_size: tuple = (224, 224)
    num_classes_skin_type: int = 5
    num_classes_issues: int = 8
    
class SkinType(str):
    """Skin type enumeration."""
    OILY = "oily"
    DRY = "dry"
    COMBINATION = "combination"
    SENSITIVE = "sensitive"
    NORMAL = "normal"

class IssueType(str):
    """Skin issue type enumeration."""
    ACNE = "acne"
    DARK_SPOTS = "dark_spots"
    WRINKLES = "wrinkles"
    REDNESS = "redness"
    DRYNESS = "dryness"
    OILINESS = "oiliness"
    PORES = "enlarged_pores"
    UNEVEN_TONE = "uneven_tone"

class ModelPrediction(BaseModel):
    """Raw model prediction output."""
    skin_type: str
    skin_type_confidence: float
    issues: Dict[str, float]  # issue_name -> confidence
    attention_maps: Optional[Dict[str, List[List[float]]]] = None

class SkinIssue(BaseModel):
    """Detected skin issue."""
    id: str
    name: str
    description: str
    severity: str  # low, medium, high
    causes: List[str]
    confidence: float
    highlighted_image_url: Optional[str] = None

class AnalysisResult(BaseModel):
    """Complete analysis result."""
    skin_type: str
    issues: List[SkinIssue]
    analysis_id: str
    processing_time: float
    model_version: str
```


## Setup Scripts Design

### Linux Setup Script (`setup.sh`)

```bash
#!/bin/bash
# Skin Analysis ML Model Setup Script for Linux

set -e  # Exit on error

echo "=== Skin Analysis ML Model Setup ==="
echo ""

# 1. Check Python version
echo "[1/7] Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "Found Python $PYTHON_VERSION"

# 2. Create virtual environment
echo "[2/7] Creating virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate

# 3. Upgrade pip
echo "[3/7] Upgrading pip..."
pip install --upgrade pip

# 4. Detect GPU and install PyTorch
echo "[4/7] Detecting hardware and installing PyTorch..."
if command -v nvidia-smi &> /dev/null; then
    echo "NVIDIA GPU detected, installing PyTorch with CUDA support..."
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
else
    echo "No GPU detected, installing CPU-only PyTorch..."
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
fi

# 5. Install dependencies
echo "[5/7] Installing dependencies..."
pip install -r requirements.txt
pip install huggingface-hub transformers timm

# 6. Download models
echo "[6/7] Downloading ML models..."
python3 scripts/download_models.py --model efficientnet_b0 --verify

# 7. Run validation
echo "[7/7] Validating setup..."
python3 scripts/validate_model.py

echo ""
echo "=== Setup Complete ==="
echo "To start the service, run:"
echo "  source venv/bin/activate"
echo "  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
```


### Windows Setup Script (`setup.bat`)

```batch
@echo off
REM Skin Analysis ML Model Setup Script for Windows 11

echo === Skin Analysis ML Model Setup ===
echo.

REM 1. Check Python version
echo [1/7] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    exit /b 1
)
for /f "tokens=2" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo Found Python %PYTHON_VERSION%

REM 2. Create virtual environment
echo [2/7] Creating virtual environment...
if not exist "venv" (
    python -m venv venv
)
call venv\Scripts\activate.bat

REM 3. Upgrade pip
echo [3/7] Upgrading pip...
python -m pip install --upgrade pip

REM 4. Detect GPU and install PyTorch
echo [4/7] Detecting hardware and installing PyTorch...
nvidia-smi >nul 2>&1
if errorlevel 1 (
    echo No GPU detected, installing CPU-only PyTorch...
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
) else (
    echo NVIDIA GPU detected, installing PyTorch with CUDA support...
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
)

REM 5. Install dependencies
echo [5/7] Installing dependencies...
pip install -r requirements.txt
pip install huggingface-hub transformers timm

REM 6. Download models
echo [6/7] Downloading ML models...
python scripts\download_models.py --model efficientnet_b0 --verify

REM 7. Run validation
echo [7/7] Validating setup...
python scripts\validate_model.py

echo.
echo === Setup Complete ===
echo To start the service, run:
echo   venv\Scripts\activate.bat
echo   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
```


## Model Download Script Design

The `scripts/download_models.py` script handles downloading models from Hugging Face:

```python
#!/usr/bin/env python3
"""
Download and verify ML models for skin analysis.
"""

import os
import sys
import argparse
from pathlib import Path
from huggingface_hub import hf_hub_download, snapshot_download
import torch

MODELS_DIR = Path("./services/skin-analysis-service/models")
MODELS_DIR.mkdir(parents=True, exist_ok=True)

MODEL_CONFIGS = {
    "efficientnet_b0": {
        "repo_id": "timm/efficientnet_b0.ra_in1k",
        "filename": "pytorch_model.bin",
        "size_mb": 20,
        "description": "EfficientNet-B0 (Recommended)"
    },
    "resnet50": {
        "repo_id": "microsoft/resnet-50",
        "filename": "pytorch_model.bin",
        "size_mb": 100,
        "description": "ResNet-50 (Fallback)"
    },
    "vit_base": {
        "repo_id": "google/vit-base-patch16-224",
        "filename": "pytorch_model.bin",
        "size_mb": 330,
        "description": "Vision Transformer (Alternative)"
    }
}

def download_model(model_name: str, force: bool = False) -> Path:
    """Download model from Hugging Face."""
    if model_name not in MODEL_CONFIGS:
        raise ValueError(f"Unknown model: {model_name}")
    
    config = MODEL_CONFIGS[model_name]
    model_path = MODELS_DIR / f"{model_name}.pth"
    
    if model_path.exists() and not force:
        print(f"Model {model_name} already exists. Use --force to re-download.")
        return model_path
    
    print(f"Downloading {config['description']}...")
    print(f"Size: ~{config['size_mb']}MB")
    
    try:
        downloaded_path = hf_hub_download(
            repo_id=config["repo_id"],
            filename=config["filename"],
            cache_dir=str(MODELS_DIR / "cache")
        )
        
        # Copy to models directory
        import shutil
        shutil.copy(downloaded_path, model_path)
        print(f"✓ Downloaded to {model_path}")
        return model_path
        
    except Exception as e:
        print(f"✗ Failed to download: {e}")
        sys.exit(1)

def verify_model(model_path: Path) -> bool:
    """Verify model can be loaded."""
    try:
        print(f"Verifying {model_path.name}...")
        state_dict = torch.load(model_path, map_location="cpu")
        print(f"✓ Model verified ({len(state_dict)} parameters)")
        return True
    except Exception as e:
        print(f"✗ Verification failed: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Download skin analysis models")
    parser.add_argument("--model", default="efficientnet_b0", 
                       choices=list(MODEL_CONFIGS.keys()),
                       help="Model to download")
    parser.add_argument("--all", action="store_true",
                       help="Download all models")
    parser.add_argument("--force", action="store_true",
                       help="Force re-download")
    parser.add_argument("--verify", action="store_true",
                       help="Verify model after download")
    
    args = parser.parse_args()
    
    models_to_download = list(MODEL_CONFIGS.keys()) if args.all else [args.model]
    
    for model_name in models_to_download:
        model_path = download_model(model_name, args.force)
        if args.verify:
            verify_model(model_path)
    
    print("\n✓ All models ready!")

if __name__ == "__main__":
    main()
```


## Error Handling

### Error Categories

1. **Model Loading Errors**
   - Model file not found
   - Corrupted model file
   - Incompatible model version
   - Insufficient memory

2. **Inference Errors**
   - Invalid input dimensions
   - Out of memory during inference
   - Device mismatch (GPU/CPU)
   - Timeout errors

3. **Setup Script Errors**
   - Python not installed
   - Network connectivity issues
   - Insufficient disk space
   - Permission errors

### Error Handling Strategy

```python
class ModelError(Exception):
    """Base exception for model-related errors."""
    pass

class ModelNotFoundError(ModelError):
    """Model file not found."""
    pass

class ModelLoadError(ModelError):
    """Failed to load model."""
    pass

class InferenceError(ModelError):
    """Inference failed."""
    pass

# Error handling in ModelManager
def load_model(self) -> None:
    try:
        if not self.model_path.exists():
            raise ModelNotFoundError(f"Model not found: {self.model_path}")
        
        self.model = torch.load(self.model_path, map_location=self.device)
        self.model.eval()
        
    except torch.cuda.OutOfMemoryError:
        logger.warning("GPU out of memory, falling back to CPU")
        self.device = "cpu"
        self.model = torch.load(self.model_path, map_location="cpu")
        
    except Exception as e:
        raise ModelLoadError(f"Failed to load model: {e}")

# Graceful degradation
def predict_with_fallback(self, image: np.ndarray) -> Dict:
    try:
        return self.predict(image)
    except InferenceError as e:
        logger.error(f"Inference failed: {e}")
        # Return default/safe response
        return {
            "skin_type": "unknown",
            "issues": [],
            "error": "Analysis temporarily unavailable"
        }
```


## Testing Strategy

### 1. Unit Tests

**Model Manager Tests** (`tests/test_model_manager.py`):
- Test device detection (GPU/CPU)
- Test model loading and unloading
- Test inference with sample images
- Test error handling for missing models
- Test memory management

**Preprocessor Tests** (`tests/test_preprocessor.py`):
- Test image resizing and normalization
- Test tensor conversion
- Test batch processing
- Test invalid image handling

**Post-Processor Tests** (`tests/test_postprocessor.py`):
- Test confidence thresholding
- Test result formatting
- Test highlighted image generation
- Test issue classification

### 2. Integration Tests

**End-to-End Analysis** (`tests/test_e2e_analysis.py`):
- Test complete analysis pipeline
- Test API endpoint with real images
- Test response format compliance
- Test performance metrics

**Model Download Tests** (`tests/test_model_download.py`):
- Test model download from Hugging Face
- Test model verification
- Test retry logic on failure

### 3. Accuracy Tests

**Model Accuracy Validation** (`tests/test_model_accuracy.py`):
```python
def test_model_accuracy():
    """Test model achieves >=90% accuracy on test dataset."""
    model_manager = ModelManager()
    test_dataset = load_test_dataset()  # 100+ labeled images
    
    correct = 0
    total = len(test_dataset)
    
    for image, label in test_dataset:
        prediction = model_manager.predict(image)
        if prediction["skin_type"] == label["skin_type"]:
            correct += 1
    
    accuracy = correct / total
    assert accuracy >= 0.90, f"Accuracy {accuracy:.2%} below 90% threshold"
```

### 4. Performance Tests

**Inference Speed Tests** (`tests/test_performance.py`):
- Test CPU inference time (<3 seconds)
- Test GPU inference time (<1 second)
- Test memory usage
- Test concurrent request handling


## Performance Optimization

### 1. Model Optimization Techniques

**Quantization** (Reduce model size and improve CPU inference):
```python
import torch.quantization as quantization

def quantize_model(model: torch.nn.Module) -> torch.nn.Module:
    """Apply dynamic quantization to model."""
    quantized_model = quantization.quantize_dynamic(
        model,
        {torch.nn.Linear, torch.nn.Conv2d},
        dtype=torch.qint8
    )
    return quantized_model
```

**ONNX Export** (Cross-platform optimization):
```python
def export_to_onnx(model: torch.nn.Module, output_path: str):
    """Export model to ONNX format for optimized inference."""
    dummy_input = torch.randn(1, 3, 224, 224)
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        opset_version=14,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch_size'}}
    )
```

### 2. Inference Optimization

**Batch Processing**:
```python
def batch_predict(self, images: List[np.ndarray]) -> List[Dict]:
    """Process multiple images in a single batch."""
    batch_tensor = torch.stack([self.preprocess(img) for img in images])
    with torch.no_grad():
        outputs = self.model(batch_tensor)
    return [self.postprocess(out) for out in outputs]
```

**Caching**:
```python
from functools import lru_cache
import hashlib

@lru_cache(maxsize=100)
def predict_cached(self, image_hash: str) -> Dict:
    """Cache predictions for identical images."""
    # Implementation with Redis or in-memory cache
    pass
```

### 3. Memory Management

```python
def cleanup_memory(self):
    """Free up GPU/CPU memory."""
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    import gc
    gc.collect()
```


## Integration with Existing Service

### Modifications to Existing Code

**1. Update `app/services/ai_service.py`**:

Replace the current placeholder AI logic with actual ML model inference:

```python
from app.ml.model_manager import ModelManager
from app.ml.preprocessor import ImagePreprocessor
from app.ml.postprocessor import PostProcessor

class AIService:
    def __init__(self):
        self.model_manager = ModelManager()
        self.preprocessor = ImagePreprocessor()
        self.postprocessor = PostProcessor()
        
    async def analyze_skin(self, image: Image.Image) -> Dict:
        """Analyze skin using ML model."""
        # Preprocess
        tensor = self.preprocessor.preprocess(image)
        
        # Inference
        predictions = self.model_manager.predict(tensor)
        
        # Post-process
        result = self.postprocessor.process_predictions(
            predictions, 
            image
        )
        
        return result
```

**2. Update `requirements.txt`**:

Add ML dependencies:
```
torch>=2.0.0
torchvision>=0.15.0
transformers>=4.30.0
timm>=0.9.0
huggingface-hub>=0.16.0
onnxruntime>=1.15.0  # Optional, for ONNX inference
```

**3. Update Configuration** (`app/core/config.py`):

```python
class Settings(BaseSettings):
    # Existing settings...
    
    # ML Model settings
    MODEL_NAME: str = "efficientnet_b0"
    MODEL_PATH: str = "./models/skin_analysis_efficientnet.pth"
    MODEL_DEVICE: str = "auto"  # auto, cuda, cpu
    MODEL_CONFIDENCE_THRESHOLD: float = 0.7
    MODEL_BATCH_SIZE: int = 1
```


## Directory Structure

```
services/skin-analysis-service/
├── app/
│   ├── ml/                          # NEW: ML module
│   │   ├── __init__.py
│   │   ├── model_manager.py         # Model loading and inference
│   │   ├── preprocessor.py          # Image preprocessing
│   │   ├── postprocessor.py         # Result post-processing
│   │   └── models.py                # Pydantic models for ML
│   ├── api/
│   │   └── routes/
│   │       └── skin_analysis.py     # Updated with ML integration
│   ├── services/
│   │   └── ai_service.py            # Updated to use ML models
│   └── core/
│       └── config.py                # Updated with ML settings
├── models/                          # Model files
│   ├── efficientnet_b0.pth         # Primary model
│   ├── resnet50.pth                # Fallback model
│   └── cache/                       # HuggingFace cache
├── scripts/                         # NEW: Setup scripts
│   ├── download_models.py          # Model download utility
│   ├── validate_model.py           # Model validation
│   └── train_model.py              # Optional: Fine-tuning script
├── tests/
│   ├── test_model_manager.py       # NEW: Model tests
│   ├── test_preprocessor.py        # NEW: Preprocessing tests
│   ├── test_postprocessor.py       # NEW: Post-processing tests
│   └── test_model_accuracy.py      # NEW: Accuracy tests
├── setup.sh                         # NEW: Linux setup script
├── setup.bat                        # NEW: Windows setup script
├── requirements.txt                 # Updated with ML dependencies
└── README.md                        # Updated documentation
```


## Deployment Workflow

### Development Setup (One Command)

**Linux:**
```bash
cd services/skin-analysis-service
chmod +x setup.sh
./setup.sh
```

**Windows 11:**
```cmd
cd services\skin-analysis-service
setup.bat
```

### What the Setup Scripts Do:

1. ✓ Check Python installation (3.8+)
2. ✓ Create virtual environment
3. ✓ Detect GPU/CPU and install appropriate PyTorch
4. ✓ Install all dependencies
5. ✓ Download pre-trained models from Hugging Face
6. ✓ Verify model integrity
7. ✓ Run validation tests
8. ✓ Display instructions to start the service

### Running the Service

After setup completes:

```bash
# Activate virtual environment
source venv/bin/activate  # Linux
# or
venv\Scripts\activate.bat  # Windows

# Start the service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Testing the Model

```bash
# Run all tests
pytest tests/ -v

# Run accuracy tests specifically
pytest tests/test_model_accuracy.py -v

# Run with coverage
pytest tests/ --cov=app/ml --cov-report=html
```


## Model Accuracy Strategy

### Achieving >=90% Accuracy

**Approach 1: Use Pre-trained Models with Fine-tuning**

1. Start with EfficientNet-B0 pre-trained on ImageNet
2. Fine-tune on skin condition datasets:
   - HAM10000 (dermatology images)
   - Fitzpatrick17k (diverse skin tones)
   - Custom collected data
3. Use transfer learning with frozen early layers
4. Train classification head for skin conditions

**Approach 2: Ensemble Models**

If single model accuracy < 90%:
```python
class EnsembleModel:
    def __init__(self):
        self.models = [
            load_model("efficientnet_b0"),
            load_model("resnet50"),
            load_model("vit_base")
        ]
    
    def predict(self, image):
        predictions = [model(image) for model in self.models]
        # Average predictions or use voting
        return ensemble_predictions(predictions)
```

**Approach 3: Data Augmentation**

Improve model robustness:
- Rotation: ±15 degrees
- Horizontal flip
- Color jitter: brightness, contrast, saturation
- Random crop and resize
- Gaussian blur

### Accuracy Validation

```python
def validate_accuracy(model, test_dataset):
    """
    Validate model accuracy on test dataset.
    Returns detailed metrics.
    """
    from sklearn.metrics import classification_report, confusion_matrix
    
    y_true = []
    y_pred = []
    
    for image, label in test_dataset:
        prediction = model.predict(image)
        y_true.append(label)
        y_pred.append(prediction)
    
    # Calculate metrics
    accuracy = accuracy_score(y_true, y_pred)
    report = classification_report(y_true, y_pred)
    cm = confusion_matrix(y_true, y_pred)
    
    return {
        "accuracy": accuracy,
        "report": report,
        "confusion_matrix": cm,
        "meets_threshold": accuracy >= 0.90
    }
```

### Fallback Strategy

If local model accuracy < 90%:
1. Log warning about accuracy
2. Continue using local model (still better than nothing)
3. Optionally fall back to external API (if configured)
4. Display confidence scores to users
5. Collect feedback for model improvement


## Configuration Management

### Environment Variables

```bash
# .env file for skin-analysis-service

# ML Model Configuration
MODEL_NAME=efficientnet_b0
MODEL_PATH=./models/skin_analysis_efficientnet.pth
MODEL_DEVICE=auto  # auto, cuda, cpu
MODEL_CONFIDENCE_THRESHOLD=0.7
MODEL_BATCH_SIZE=1

# Model Download
HUGGINGFACE_CACHE_DIR=./models/cache
HUGGINGFACE_TOKEN=  # Optional, for private models

# Performance
MAX_INFERENCE_TIME=3  # seconds
ENABLE_MODEL_CACHING=true
CACHE_SIZE=100  # number of cached predictions

# Fallback
ENABLE_API_FALLBACK=false
FALLBACK_API_URL=
FALLBACK_API_KEY=
```

### Config File (`app/core/ml_config.py`)

```python
from pydantic_settings import BaseSettings
from typing import Optional

class MLSettings(BaseSettings):
    """ML model configuration."""
    
    # Model settings
    model_name: str = "efficientnet_b0"
    model_path: str = "./models/skin_analysis_efficientnet.pth"
    model_device: str = "auto"
    confidence_threshold: float = 0.7
    batch_size: int = 1
    
    # Download settings
    huggingface_cache_dir: str = "./models/cache"
    huggingface_token: Optional[str] = None
    
    # Performance settings
    max_inference_time: int = 3
    enable_model_caching: bool = True
    cache_size: int = 100
    
    # Fallback settings
    enable_api_fallback: bool = False
    fallback_api_url: Optional[str] = None
    fallback_api_key: Optional[str] = None
    
    class Config:
        env_file = ".env"
        env_prefix = ""

ml_settings = MLSettings()
```


## Documentation Requirements

### README.md Updates

Add sections for:

1. **ML Model Setup**
   - Quick start with setup scripts
   - Manual setup instructions
   - GPU vs CPU setup differences

2. **Model Information**
   - Model architecture details
   - Accuracy metrics
   - Supported skin conditions
   - Input/output specifications

3. **Development Guide**
   - How to test the model
   - How to fine-tune the model
   - How to add new skin conditions
   - How to update models

4. **Troubleshooting**
   - Common setup issues
   - GPU detection problems
   - Model download failures
   - Low accuracy issues

### API Documentation Updates

Update OpenAPI spec with:
- Model version in responses
- Confidence scores for predictions
- Model metadata endpoint

### Code Documentation

All ML code should include:
- Docstrings with parameter types
- Usage examples
- Performance characteristics
- Error handling notes

Example:
```python
def predict(self, image: np.ndarray) -> Dict[str, Any]:
    """
    Run inference on preprocessed image.
    
    Args:
        image: Preprocessed image as numpy array (H, W, C)
        
    Returns:
        Dictionary containing:
        - skin_type: Detected skin type (str)
        - issues: List of detected issues with confidence
        - processing_time: Inference time in seconds
        
    Raises:
        InferenceError: If inference fails
        
    Performance:
        - GPU: ~500ms
        - CPU: ~2-3s
        
    Example:
        >>> manager = ModelManager()
        >>> result = manager.predict(image)
        >>> print(result['skin_type'])
        'combination'
    """
```


## Security Considerations

### Model Security

1. **Model File Integrity**
   - Verify checksums after download
   - Use HTTPS for model downloads
   - Store models in protected directory

2. **Input Validation**
   - Validate image dimensions
   - Check file size limits
   - Sanitize file paths
   - Prevent adversarial inputs

3. **API Security**
   - Rate limiting on inference endpoints
   - Authentication for model management
   - No sensitive data in logs

### Code Example

```python
import hashlib

def verify_model_checksum(model_path: str, expected_hash: str) -> bool:
    """Verify model file integrity."""
    sha256_hash = hashlib.sha256()
    with open(model_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    
    actual_hash = sha256_hash.hexdigest()
    return actual_hash == expected_hash

def validate_input_image(image: Image.Image) -> bool:
    """Validate input image for security."""
    # Check dimensions
    if image.width > 4096 or image.height > 4096:
        raise ValueError("Image dimensions too large")
    
    # Check format
    if image.format not in ['JPEG', 'PNG']:
        raise ValueError("Unsupported image format")
    
    # Check for malicious content
    # (Additional checks as needed)
    
    return True
```


## Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Model Improvements**
   - Multi-model ensemble for higher accuracy
   - Attention mechanism visualization
   - Explainable AI (Grad-CAM, LIME)
   - Support for more skin conditions

2. **Performance Optimizations**
   - TensorRT optimization for NVIDIA GPUs
   - ONNX Runtime for cross-platform
   - Model pruning and quantization
   - Batch inference for multiple images

3. **Advanced Features**
   - Skin tone detection (Fitzpatrick scale)
   - Age estimation
   - Severity scoring over time
   - Personalized recommendations based on history

4. **Developer Experience**
   - Docker image with pre-installed models
   - Model versioning and A/B testing
   - Automated model retraining pipeline
   - Performance monitoring dashboard

### Extensibility

The design supports easy addition of new models:

```python
# Add new model to MODEL_CONFIGS
MODEL_CONFIGS["new_model"] = {
    "repo_id": "org/model-name",
    "filename": "pytorch_model.bin",
    "size_mb": 50,
    "description": "New Model Description"
}

# Model manager automatically supports it
manager = ModelManager(model_name="new_model")
```

## Summary

This design provides:

✓ **High Accuracy**: Pre-trained models with >=90% target accuracy  
✓ **Easy Setup**: One-script installation for Linux and Windows 11  
✓ **GPU/CPU Support**: Automatic detection with graceful fallback  
✓ **Production Ready**: Error handling, testing, and monitoring  
✓ **Maintainable**: Clean architecture with clear separation of concerns  
✓ **Extensible**: Easy to add new models and features  
✓ **Well Documented**: Comprehensive docs for developers  

The implementation follows best practices for ML deployment while keeping the development experience simple and straightforward.
