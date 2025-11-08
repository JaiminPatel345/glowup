#!/usr/bin/env python3
"""
Validation script for Hair Try-On Service
Checks if all components are properly set up and configured
"""

import os
import sys
import importlib.util
from pathlib import Path
import asyncio

def check_file_exists(file_path, description):
    """Check if a file exists"""
    if os.path.exists(file_path):
        print(f"✅ {description}: {file_path}")
        return True
    else:
        print(f"❌ {description}: {file_path} (NOT FOUND)")
        return False

def check_directory_exists(dir_path, description):
    """Check if a directory exists"""
    if os.path.isdir(dir_path):
        print(f"✅ {description}: {dir_path}")
        return True
    else:
        print(f"❌ {description}: {dir_path} (NOT FOUND)")
        return False

def check_python_import(module_name, description):
    """Check if a Python module can be imported"""
    try:
        importlib.import_module(module_name)
        print(f"✅ {description}: {module_name}")
        return True
    except ImportError as e:
        print(f"❌ {description}: {module_name} (IMPORT ERROR: {e})")
        return False

def check_requirements():
    """Check if all required dependencies are available"""
    print("\n" + "="*60)
    print("CHECKING PYTHON DEPENDENCIES")
    print("="*60)
    
    required_packages = [
        ("fastapi", "FastAPI Framework"),
        ("uvicorn", "ASGI Server"),
        ("motor", "MongoDB Async Driver"),
        ("pymongo", "MongoDB Driver"),
        ("cv2", "OpenCV"),
        ("numpy", "NumPy"),
        ("PIL", "Pillow"),
        ("websockets", "WebSocket Support"),
        ("aiofiles", "Async File Operations"),
        ("pydantic", "Data Validation"),
        ("pytest", "Testing Framework"),
    ]
    
    results = []
    for package, description in required_packages:
        success = check_python_import(package, description)
        results.append(success)
    
    return all(results)

def check_file_structure():
    """Check if all required files and directories exist"""
    print("\n" + "="*60)
    print("CHECKING FILE STRUCTURE")
    print("="*60)
    
    service_root = Path(__file__).parent
    
    required_files = [
        ("requirements.txt", "Python Dependencies"),
        ("Dockerfile", "Docker Configuration"),
        ("pytest.ini", "Pytest Configuration"),
        ("app/__init__.py", "App Package"),
        ("app/main.py", "Main Application"),
        ("app/core/config.py", "Configuration"),
        ("app/core/database.py", "Database Configuration"),
        ("app/models/hair_tryOn.py", "Data Models"),
        ("app/services/video_service.py", "Video Service"),
        ("app/services/ai_service.py", "AI Service"),
        ("app/services/websocket_service.py", "WebSocket Service"),
        ("app/services/database_service.py", "Database Service"),
        ("app/api/routes/hair_tryOn.py", "API Routes"),
    ]
    
    required_dirs = [
        ("app", "Application Directory"),
        ("app/core", "Core Module"),
        ("app/models", "Models Module"),
        ("app/services", "Services Module"),
        ("app/api", "API Module"),
        ("app/api/routes", "API Routes Module"),
        ("tests", "Tests Directory"),
    ]
    
    results = []
    
    # Check directories
    for dir_path, description in required_dirs:
        full_path = service_root / dir_path
        success = check_directory_exists(full_path, description)
        results.append(success)
    
    # Check files
    for file_path, description in required_files:
        full_path = service_root / file_path
        success = check_file_exists(full_path, description)
        results.append(success)
    
    return all(results)

def check_test_files():
    """Check if all test files exist"""
    print("\n" + "="*60)
    print("CHECKING TEST FILES")
    print("="*60)
    
    service_root = Path(__file__).parent
    
    test_files = [
        ("tests/__init__.py", "Tests Package"),
        ("tests/conftest.py", "Test Configuration"),
        ("tests/test_video_service.py", "Video Service Tests"),
        ("tests/test_ai_service.py", "AI Service Tests"),
        ("tests/test_websocket_service.py", "WebSocket Service Tests"),
        ("tests/test_database_service.py", "Database Service Tests"),
        ("tests/test_api_integration.py", "API Integration Tests"),
        ("tests/test_performance.py", "Performance Tests"),
        ("run_tests.py", "Test Runner"),
    ]
    
    results = []
    for file_path, description in test_files:
        full_path = service_root / file_path
        success = check_file_exists(full_path, description)
        results.append(success)
    
    return all(results)

async def check_service_imports():
    """Check if service modules can be imported without errors"""
    print("\n" + "="*60)
    print("CHECKING SERVICE IMPORTS")
    print("="*60)
    
    service_modules = [
        ("app.core.config", "Configuration Module"),
        ("app.core.database", "Database Module"),
        ("app.models.hair_tryOn", "Hair Try-On Models"),
        ("app.services.video_service", "Video Service"),
        ("app.services.ai_service", "AI Service"),
        ("app.services.websocket_service", "WebSocket Service"),
        ("app.services.database_service", "Database Service"),
        ("app.api.routes.hair_tryOn", "API Routes"),
        ("app.main", "Main Application"),
    ]
    
    results = []
    for module_name, description in service_modules:
        success = check_python_import(module_name, description)
        results.append(success)
    
    return all(results)

def check_configuration():
    """Check service configuration"""
    print("\n" + "="*60)
    print("CHECKING CONFIGURATION")
    print("="*60)
    
    try:
        from app.core.config import settings
        
        config_checks = [
            (hasattr(settings, 'mongodb_url'), "MongoDB URL configured"),
            (hasattr(settings, 'service_name'), "Service name configured"),
            (hasattr(settings, 'max_video_size'), "Max video size configured"),
            (hasattr(settings, 'target_latency_ms'), "Target latency configured"),
            (hasattr(settings, 'websocket_max_connections'), "WebSocket max connections configured"),
        ]
        
        results = []
        for check, description in config_checks:
            if check:
                print(f"✅ {description}")
                results.append(True)
            else:
                print(f"❌ {description}")
                results.append(False)
        
        return all(results)
        
    except Exception as e:
        print(f"❌ Configuration import failed: {e}")
        return False

def main():
    """Main validation function"""
    print("Hair Try-On Service Validation")
    print("=" * 60)
    
    # Change to service directory
    service_dir = Path(__file__).parent
    os.chdir(service_dir)
    
    # Add service directory to Python path
    sys.path.insert(0, str(service_dir))
    
    validation_results = []
    
    # Run all validation checks
    validation_results.append(check_file_structure())
    validation_results.append(check_test_files())
    validation_results.append(check_requirements())
    validation_results.append(asyncio.run(check_service_imports()))
    validation_results.append(check_configuration())
    
    # Print summary
    print("\n" + "="*60)
    print("VALIDATION SUMMARY")
    print("="*60)
    
    checks = [
        "File Structure",
        "Test Files",
        "Python Dependencies",
        "Service Imports",
        "Configuration"
    ]
    
    total_checks = len(validation_results)
    passed_checks = sum(validation_results)
    failed_checks = total_checks - passed_checks
    
    for i, (check_name, result) in enumerate(zip(checks, validation_results)):
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{check_name:<25} {status}")
    
    print("-" * 60)
    print(f"Total: {total_checks}, Passed: {passed_checks}, Failed: {failed_checks}")
    
    if failed_checks > 0:
        print(f"\n❌ {failed_checks} validation checks failed!")
        print("Please fix the issues above before running the service.")
        return 1
    else:
        print(f"\n✅ All {passed_checks} validation checks passed!")
        print("The Hair Try-On Service is properly configured and ready to run.")
        
        print("\nNext steps:")
        print("1. Install dependencies: pip install -r requirements.txt")
        print("2. Set up environment variables (see .env.example)")
        print("3. Start MongoDB database")
        print("4. Run tests: python run_tests.py")
        print("5. Start service: uvicorn app.main:app --reload")
        
        return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)