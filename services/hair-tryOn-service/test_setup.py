#!/usr/bin/env python3
"""
Quick test script to verify hair try-on service setup
"""

import sys
import os

def test_imports():
    """Test if all required packages are installed"""
    print("Testing package imports...")
    
    packages = [
        ("fastapi", "FastAPI"),
        ("uvicorn", "Uvicorn"),
        ("cv2", "OpenCV"),
        ("numpy", "NumPy"),
        ("PIL", "Pillow"),
        ("motor", "Motor (MongoDB)"),
        ("replicate", "Replicate API"),
        ("aiohttp", "aiohttp"),
    ]
    
    failed = []
    for package, name in packages:
        try:
            __import__(package)
            print(f"  ✓ {name}")
        except ImportError:
            print(f"  ✗ {name} - NOT INSTALLED")
            failed.append(name)
    
    if failed:
        print(f"\n❌ Missing packages: {', '.join(failed)}")
        print("Run: pip install -r requirements.txt")
        return False
    
    print("\n✅ All packages installed successfully")
    return True


def test_environment():
    """Test environment configuration"""
    print("\nTesting environment configuration...")
    
    # Try to load .env file
    try:
        from dotenv import load_dotenv
        load_dotenv()
        print("  ✓ .env file loaded")
    except ImportError:
        print("  ⚠ python-dotenv not installed (optional)")
    except Exception as e:
        print(f"  ⚠ Could not load .env: {e}")
    
    # Check critical environment variables
    replicate_token = os.getenv("REPLICATE_API_TOKEN")
    use_replicate = os.getenv("USE_REPLICATE_API", "true").lower() == "true"
    
    if use_replicate:
        if replicate_token and replicate_token != "your_replicate_api_token_here":
            print("  ✓ REPLICATE_API_TOKEN is set")
        else:
            print("  ⚠ REPLICATE_API_TOKEN not set or using default")
            print("    Get token from: https://replicate.com/account/api-tokens")
    else:
        print("  ℹ Using local model mode (USE_REPLICATE_API=false)")
    
    mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    print(f"  ℹ MongoDB URL: {mongodb_url}")
    
    return True


def test_directories():
    """Test if required directories exist"""
    print("\nTesting directories...")
    
    dirs = ["uploads", "temp", "models"]
    for dir_name in dirs:
        if os.path.exists(dir_name):
            print(f"  ✓ {dir_name}/ exists")
        else:
            os.makedirs(dir_name, exist_ok=True)
            print(f"  ✓ {dir_name}/ created")
    
    return True


def test_opencv():
    """Test OpenCV functionality"""
    print("\nTesting OpenCV...")
    
    try:
        import cv2
        import numpy as np
        
        # Test face detection
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        
        if face_cascade.empty():
            print("  ✗ Face cascade not loaded")
            return False
        
        print("  ✓ Face detection cascade loaded")
        
        # Test basic image operations
        test_img = np.zeros((100, 100, 3), dtype=np.uint8)
        resized = cv2.resize(test_img, (50, 50))
        print("  ✓ Image operations working")
        
        return True
        
    except Exception as e:
        print(f"  ✗ OpenCV test failed: {e}")
        return False


def test_replicate_api():
    """Test Replicate API connection"""
    print("\nTesting Replicate API...")
    
    try:
        import replicate
        
        token = os.getenv("REPLICATE_API_TOKEN")
        if not token or token == "your_replicate_api_token_here":
            print("  ⚠ Replicate API token not configured")
            print("    Service will use local mode")
            return True
        
        # Try to initialize client
        client = replicate.Client(api_token=token)
        print("  ✓ Replicate client initialized")
        print("  ℹ API connection will be tested on first use")
        
        return True
        
    except ImportError:
        print("  ✗ Replicate package not installed")
        print("    Run: pip install replicate")
        return False
    except Exception as e:
        print(f"  ⚠ Replicate API test warning: {e}")
        return True


def main():
    """Run all tests"""
    print("=" * 60)
    print("Hair Try-On Service Setup Test")
    print("=" * 60)
    print()
    
    results = []
    
    results.append(("Package Imports", test_imports()))
    results.append(("Environment", test_environment()))
    results.append(("Directories", test_directories()))
    results.append(("OpenCV", test_opencv()))
    results.append(("Replicate API", test_replicate_api()))
    
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    all_passed = True
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name:.<40} {status}")
        if not passed:
            all_passed = False
    
    print("=" * 60)
    
    if all_passed:
        print("\n🎉 All tests passed! Service is ready to run.")
        print("\nStart the service with:")
        print("  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        print("\nOr use Docker:")
        print("  docker-compose up hair-tryOn-service")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please fix the issues above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
