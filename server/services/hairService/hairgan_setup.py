"""
HairFastGAN Setup Helper
Manages paths and model verification for HairFastGAN integration
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

# Alternative model names (HairFastGAN might use different names)
ALTERNATIVE_NAMES = {
    'encoder': ['encoder.pt', 'e4e_encoder.pt', 'restyle_encoder.pt'],
    'stylegan': ['stylegan2.pt', 'generator.pt'],
    'face_landmark': ['shape_predictor.dat'],
    'face_seg': ['face_segmentation.pt', 'seg_model.pt'],
}


def check_models(verbose=True):
    """
    Check if all required models are downloaded
    
    Args:
        verbose: Print detailed information
        
    Returns:
        bool: True if all models found, False otherwise
    """
    missing = []
    found = []
    
    for name, path in MODEL_PATHS.items():
        if path.exists():
            found.append((name, path))
        else:
            # Check for alternative names
            alt_found = False
            if name in ALTERNATIVE_NAMES:
                for alt_name in ALTERNATIVE_NAMES[name]:
                    alt_path = MODEL_DIR / alt_name
                    if alt_path.exists():
                        found.append((name, alt_path))
                        MODEL_PATHS[name] = alt_path  # Update to found path
                        alt_found = True
                        break
            
            if not alt_found:
                missing.append((name, path))
    
    if verbose:
        if found:
            print("✅ Found models:")
            for name, path in found:
                size_mb = path.stat().st_size / (1024 * 1024)
                print(f"   {name:15} {path.name} ({size_mb:.1f} MB)")
        
        if missing:
            print("\n⚠️  Missing models:")
            for name, path in missing:
                print(f"   {name:15} {path}")
            print("\n📥 Download from:")
            print("   https://github.com/AIRI-Institute/HairFastGAN")
            print("   or check their releases/README for download links")
    
    return len(missing) == 0


def check_hairgan_repo():
    """Check if HairFastGAN repository is cloned"""
    if not HAIRGAN_DIR.exists():
        print("❌ HairFastGAN directory not found!")
        print("\n📥 Please clone the repository:")
        print("   git clone https://github.com/AIRI-Institute/HairFastGAN.git")
        print("\nOr run:")
        print("   ./setup_hairgan.sh")
        return False
    
    print(f"✅ HairFastGAN directory found: {HAIRGAN_DIR}")
    return True


def check_dependencies():
    """Check if required dependencies are installed"""
    required = {
        'torch': 'PyTorch',
        'torchvision': 'TorchVision',
        'cv2': 'OpenCV',
        'numpy': 'NumPy',
        'PIL': 'Pillow',
    }
    
    optional = {
        'dlib': 'dlib (face detection)',
        'face_alignment': 'face-alignment',
    }
    
    missing = []
    
    print("🔍 Checking dependencies:")
    print("\nRequired:")
    for module, name in required.items():
        try:
            if module == 'cv2':
                import cv2
            elif module == 'PIL':
                from PIL import Image
            else:
                __import__(module)
            print(f"   ✅ {name}")
        except ImportError:
            print(f"   ❌ {name}")
            missing.append(module)
    
    print("\nOptional:")
    for module, name in optional.items():
        try:
            __import__(module)
            print(f"   ✅ {name}")
        except ImportError:
            print(f"   ⚠️  {name} (not installed)")
    
    if missing:
        print(f"\n❌ Missing required packages: {', '.join(missing)}")
        print("\nInstall with:")
        print(f"   pip install {' '.join(missing)}")
        return False
    
    return True


def get_device():
    """Get the best available device (CUDA or CPU)"""
    try:
        import torch
        if torch.cuda.is_available():
            device = 'cuda'
            gpu_name = torch.cuda.get_device_name(0)
            print(f"✅ CUDA available: {gpu_name}")
        else:
            device = 'cpu'
            print("⚠️  CUDA not available, using CPU")
        return device
    except ImportError:
        print("❌ PyTorch not installed")
        return None


def full_check():
    """Run all checks"""
    print("="*60)
    print("HairFastGAN Integration - System Check")
    print("="*60)
    print()
    
    checks = []
    
    # Check repository
    print("📁 Repository Check:")
    checks.append(check_hairgan_repo())
    print()
    
    # Check dependencies
    checks.append(check_dependencies())
    print()
    
    # Check device
    print("🖥️  Device Check:")
    device = get_device()
    checks.append(device is not None)
    print()
    
    # Check models
    print("📦 Model Check:")
    checks.append(check_models(verbose=True))
    print()
    
    # Summary
    print("="*60)
    if all(checks):
        print("✅ All checks passed! HairFastGAN is ready to use.")
    else:
        print("⚠️  Some checks failed. Please fix the issues above.")
    print("="*60)
    
    return all(checks)


if __name__ == "__main__":
    full_check()
