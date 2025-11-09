#!/usr/bin/env python3
"""
Test script to verify Hair Try-On service installation
"""

import sys
import os

def test_imports():
    """Test if all required packages are installed"""
    print("Testing package imports...")
    
    packages = [
        ('torch', 'PyTorch'),
        ('torchvision', 'TorchVision'),
        ('PIL', 'Pillow'),
        ('cv2', 'OpenCV'),
        ('numpy', 'NumPy'),
        ('fastapi', 'FastAPI'),
        ('uvicorn', 'Uvicorn'),
        ('aiohttp', 'aiohttp'),
        ('motor', 'Motor'),
    ]
    
    failed = []
    for package, name in packages:
        try:
            __import__(package)
            print(f"  ✓ {name}")
        except ImportError:
            print(f"  ✗ {name} - NOT FOUND")
            failed.append(name)
    
    if failed:
        print(f"\n❌ Missing packages: {', '.join(failed)}")
        return False
    
    print("\n✅ All packages installed successfully")
    return True


def test_pytorch():
    """Test PyTorch installation and GPU availability"""
    print("\nTesting PyTorch...")
    
    try:
        import torch
        
        print(f"  PyTorch version: {torch.__version__}")
        print(f"  CUDA available: {torch.cuda.is_available()}")
        
        if torch.cuda.is_available():
            print(f"  CUDA version: {torch.version.cuda}")
            print(f"  GPU count: {torch.cuda.device_count()}")
            print(f"  GPU name: {torch.cuda.get_device_name(0)}")
            print("\n✅ GPU acceleration available")
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            print("  MPS (Apple Silicon) available: True")
            print("\n✅ Apple Silicon GPU available")
        else:
            print("\n⚠️  No GPU detected - will use CPU (slower)")
        
        return True
        
    except Exception as e:
        print(f"\n❌ PyTorch test failed: {e}")
        return False


def test_model_file():
    """Test if model file exists"""
    print("\nTesting model file...")
    
    model_path = "models/hair_fastgan_model.pth"
    
    if os.path.exists(model_path):
        size_mb = os.path.getsize(model_path) / (1024 * 1024)
        print(f"  Model file found: {model_path}")
        print(f"  Size: {size_mb:.2f} MB")
        print("\n✅ Model file exists")
        return True
    else:
        print(f"  Model file not found: {model_path}")
        print("\n⚠️  Model file missing - please download HairFastGAN model")
        return False


def test_env_file():
    """Test if .env file exists and has required variables"""
    print("\nTesting environment configuration...")
    
    if not os.path.exists('.env'):
        print("  .env file not found")
        print("\n⚠️  Please create .env file from .env.example")
        return False
    
    with open('.env', 'r') as f:
        content = f.read()
    
    required_vars = [
        'MONGODB_URL',
        'PERFECTCORP_API_KEY',
        'MODEL_PATH',
    ]
    
    missing = []
    for var in required_vars:
        if var not in content:
            missing.append(var)
        else:
            # Check if it has a value
            for line in content.split('\n'):
                if line.startswith(var):
                    if '=' in line:
                        value = line.split('=', 1)[1].strip()
                        if value and not value.startswith('your_'):
                            print(f"  ✓ {var} configured")
                        else:
                            print(f"  ⚠️  {var} needs a value")
                    break
    
    if missing:
        print(f"\n⚠️  Missing variables: {', '.join(missing)}")
        return False
    
    print("\n✅ Environment configured")
    return True


def test_directories():
    """Test if required directories exist"""
    print("\nTesting directories...")
    
    dirs = ['models', 'uploads', 'temp']
    
    for dir_name in dirs:
        if os.path.exists(dir_name):
            print(f"  ✓ {dir_name}/")
        else:
            print(f"  Creating {dir_name}/")
            os.makedirs(dir_name, exist_ok=True)
    
    print("\n✅ All directories ready")
    return True


def main():
    """Run all tests"""
    print("=" * 60)
    print("Hair Try-On Service Installation Test")
    print("=" * 60)
    
    tests = [
        ("Package Imports", test_imports),
        ("PyTorch & GPU", test_pytorch),
        ("Model File", test_model_file),
        ("Environment", test_env_file),
        ("Directories", test_directories),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ {name} test failed with error: {e}")
            results.append((name, False))
    
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    all_passed = all(result for _, result in results)
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 All tests passed! Service is ready to start.")
        print("\nNext steps:")
        print("1. Ensure PERFECTCORP_API_KEY is set in .env")
        print("2. Download HairFastGAN model if not present")
        print("3. Start service: ./start-service.sh")
    else:
        print("⚠️  Some tests failed. Please fix the issues above.")
        print("\nCommon fixes:")
        print("1. Run setup script: ./setup-hairfastgan.sh")
        print("2. Create .env from .env.example")
        print("3. Add your PERFECTCORP_API_KEY to .env")
        print("4. Download HairFastGAN model to models/")
    print("=" * 60)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
