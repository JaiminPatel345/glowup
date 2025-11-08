#!/usr/bin/env python3
"""
Validation script for Skin Analysis Service
Checks code structure and basic functionality without requiring external dependencies
"""

import os
import sys
import ast
import importlib.util


def check_file_exists(filepath, description):
    """Check if a file exists"""
    if os.path.exists(filepath):
        print(f"✅ {description}: {filepath}")
        return True
    else:
        print(f"❌ {description}: {filepath} - NOT FOUND")
        return False


def check_python_syntax(filepath):
    """Check if Python file has valid syntax"""
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        ast.parse(content)
        return True
    except SyntaxError as e:
        print(f"❌ Syntax error in {filepath}: {e}")
        return False
    except Exception as e:
        print(f"❌ Error reading {filepath}: {e}")
        return False


def validate_service_structure():
    """Validate the service directory structure"""
    print("Validating Skin Analysis Service Structure...")
    print("=" * 60)
    
    success = True
    
    # Core files
    core_files = [
        ("app/__init__.py", "App package init"),
        ("app/main.py", "FastAPI main application"),
        ("app/core/config.py", "Configuration module"),
        ("app/core/database.py", "Database connection module"),
        ("requirements.txt", "Python dependencies"),
        ("Dockerfile", "Docker configuration"),
        (".env", "Environment variables"),
    ]
    
    for filepath, description in core_files:
        if not check_file_exists(filepath, description):
            success = False
    
    # Model files
    model_files = [
        ("app/models/__init__.py", "Models package init"),
        ("app/models/skin_analysis.py", "Skin analysis models"),
    ]
    
    for filepath, description in model_files:
        if not check_file_exists(filepath, description):
            success = False
    
    # Service files
    service_files = [
        ("app/services/__init__.py", "Services package init"),
        ("app/services/ai_service.py", "AI service"),
        ("app/services/image_service.py", "Image service"),
        ("app/services/skin_analysis_service.py", "Skin analysis service"),
        ("app/services/product_service.py", "Product service"),
    ]
    
    for filepath, description in service_files:
        if not check_file_exists(filepath, description):
            success = False
    
    # API files
    api_files = [
        ("app/api/__init__.py", "API package init"),
        ("app/api/routes/__init__.py", "Routes package init"),
        ("app/api/routes/health.py", "Health check routes"),
        ("app/api/routes/skin_analysis.py", "Skin analysis routes"),
    ]
    
    for filepath, description in api_files:
        if not check_file_exists(filepath, description):
            success = False
    
    # Test files
    test_files = [
        ("tests/__init__.py", "Tests package init"),
        ("tests/conftest.py", "Test configuration"),
        ("tests/test_image_service.py", "Image service tests"),
        ("tests/test_ai_service.py", "AI service tests"),
        ("tests/test_product_service.py", "Product service tests"),
        ("tests/test_skin_analysis_service.py", "Skin analysis service tests"),
        ("tests/test_api_integration.py", "API integration tests"),
        ("tests/test_performance.py", "Performance tests"),
        ("pytest.ini", "Pytest configuration"),
        ("run_tests.py", "Test runner script"),
    ]
    
    for filepath, description in test_files:
        if not check_file_exists(filepath, description):
            success = False
    
    return success


def validate_python_syntax():
    """Validate Python syntax in all Python files"""
    print("\nValidating Python Syntax...")
    print("=" * 60)
    
    success = True
    python_files = []
    
    # Find all Python files
    for root, dirs, files in os.walk("."):
        # Skip __pycache__ directories
        dirs[:] = [d for d in dirs if d != "__pycache__"]
        
        for file in files:
            if file.endswith(".py"):
                filepath = os.path.join(root, file)
                python_files.append(filepath)
    
    for filepath in python_files:
        if check_python_syntax(filepath):
            print(f"✅ Syntax OK: {filepath}")
        else:
            success = False
    
    return success


def check_key_functionality():
    """Check if key classes and functions are defined"""
    print("\nValidating Key Functionality...")
    print("=" * 60)
    
    success = True
    
    # Check main FastAPI app
    try:
        with open("app/main.py", 'r') as f:
            content = f.read()
        
        if "FastAPI" in content and "app = FastAPI" in content:
            print("✅ FastAPI app defined")
        else:
            print("❌ FastAPI app not properly defined")
            success = False
    except Exception as e:
        print(f"❌ Error checking main.py: {e}")
        success = False
    
    # Check AI Service class
    try:
        with open("app/services/ai_service.py", 'r') as f:
            content = f.read()
        
        if "class AIService" in content and "analyze_skin_image" in content:
            print("✅ AIService class with analyze_skin_image method")
        else:
            print("❌ AIService class or analyze_skin_image method missing")
            success = False
    except Exception as e:
        print(f"❌ Error checking ai_service.py: {e}")
        success = False
    
    # Check Image Service class
    try:
        with open("app/services/image_service.py", 'r') as f:
            content = f.read()
        
        if "class ImageService" in content and "validate_image" in content:
            print("✅ ImageService class with validate_image method")
        else:
            print("❌ ImageService class or validate_image method missing")
            success = False
    except Exception as e:
        print(f"❌ Error checking image_service.py: {e}")
        success = False
    
    # Check Product Service class
    try:
        with open("app/services/product_service.py", 'r') as f:
            content = f.read()
        
        if "class ProductService" in content and "get_recommendations" in content:
            print("✅ ProductService class with get_recommendations method")
        else:
            print("❌ ProductService class or get_recommendations method missing")
            success = False
    except Exception as e:
        print(f"❌ Error checking product_service.py: {e}")
        success = False
    
    return success


def main():
    """Main validation function"""
    print("Skin Analysis Service Validation")
    print("=" * 60)
    
    # Change to service directory
    service_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(service_dir)
    
    # Run validations
    structure_ok = validate_service_structure()
    syntax_ok = validate_python_syntax()
    functionality_ok = check_key_functionality()
    
    # Summary
    print("\n" + "=" * 60)
    print("VALIDATION SUMMARY")
    print("=" * 60)
    
    if structure_ok:
        print("✅ Service structure validation: PASSED")
    else:
        print("❌ Service structure validation: FAILED")
    
    if syntax_ok:
        print("✅ Python syntax validation: PASSED")
    else:
        print("❌ Python syntax validation: FAILED")
    
    if functionality_ok:
        print("✅ Key functionality validation: PASSED")
    else:
        print("❌ Key functionality validation: FAILED")
    
    overall_success = structure_ok and syntax_ok and functionality_ok
    
    if overall_success:
        print("\n🎉 All validations PASSED! Service is ready for testing.")
    else:
        print("\n⚠️  Some validations FAILED. Please check the issues above.")
    
    return 0 if overall_success else 1


if __name__ == "__main__":
    sys.exit(main())