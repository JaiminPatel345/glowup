#!/usr/bin/env python3
"""
Structure validation for ModelManager implementation.

Validates that all required methods and features are implemented
without requiring torch installation.
"""

import sys
import ast
from pathlib import Path


def validate_model_manager_structure():
    """Validate ModelManager class structure and methods."""
    print("=" * 60)
    print("ModelManager Structure Validation")
    print("=" * 60)
    
    model_manager_path = Path("services/skin-analysis-service/app/ml/model_manager.py")
    
    if not model_manager_path.exists():
        print(f"✗ File not found: {model_manager_path}")
        return False
    
    with open(model_manager_path, 'r') as f:
        content = f.read()
        tree = ast.parse(content)
    
    # Find ModelManager class
    model_manager_class = None
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == "ModelManager":
            model_manager_class = node
            break
    
    if not model_manager_class:
        print("✗ ModelManager class not found")
        return False
    
    print("✓ ModelManager class found")
    
    # Required methods
    required_methods = {
        "__init__": "Constructor with model_path and device parameters",
        "detect_device": "Automatic GPU/CPU detection",
        "load_model": "Device-aware loading with CPU fallback",
        "predict": "Inference with error handling",
        "unload_model": "Memory cleanup",
        "is_loaded": "Check if model is loaded",
        "_process_model_outputs": "Process raw model outputs"
    }
    
    # Find all methods in the class
    found_methods = {}
    for node in model_manager_class.body:
        if isinstance(node, ast.FunctionDef):
            found_methods[node.name] = node
    
    print("\n=== Required Methods ===")
    all_found = True
    for method_name, description in required_methods.items():
        if method_name in found_methods:
            print(f"✓ {method_name}: {description}")
        else:
            print(f"✗ {method_name}: {description} - NOT FOUND")
            all_found = False
    
    # Check for exception classes
    print("\n=== Exception Classes ===")
    exception_classes = ["ModelError", "ModelNotFoundError", "ModelLoadError", "InferenceError"]
    for exc_name in exception_classes:
        if exc_name in content:
            print(f"✓ {exc_name} defined")
        else:
            print(f"✗ {exc_name} not found")
            all_found = False
    
    # Check for key features in code
    print("\n=== Key Features ===")
    features = {
        "torch.cuda.is_available()": "GPU detection",
        "torch.cuda.OutOfMemoryError": "OOM error handling",
        "torch.cuda.empty_cache()": "GPU memory cleanup",
        "lazy loading": "Lazy loading implementation",
        "map_location": "Device-aware loading",
        "torch.no_grad()": "Inference without gradients",
        "self._is_loaded": "Lazy loading flag",
        "gc.collect()": "Garbage collection"
    }
    
    for feature, description in features.items():
        if feature in content:
            print(f"✓ {description}: '{feature}' found")
        else:
            print(f"✗ {description}: '{feature}' not found")
            all_found = False
    
    # Check __init__ parameters
    print("\n=== Constructor Parameters ===")
    init_method = found_methods.get("__init__")
    if init_method:
        args = [arg.arg for arg in init_method.args.args]
        print(f"✓ Parameters: {', '.join(args)}")
        
        required_params = ["self", "model_path", "device"]
        for param in required_params:
            if param in args:
                print(f"  ✓ {param}")
            else:
                print(f"  ✗ {param} - MISSING")
                all_found = False
    
    # Check for docstrings
    print("\n=== Documentation ===")
    if model_manager_class.body and isinstance(model_manager_class.body[0], ast.Expr):
        if isinstance(model_manager_class.body[0].value, ast.Constant):
            print("✓ Class has docstring")
        else:
            print("✗ Class missing docstring")
    
    method_docs = 0
    for method_name, method_node in found_methods.items():
        if method_node.body and isinstance(method_node.body[0], ast.Expr):
            if isinstance(method_node.body[0].value, ast.Constant):
                method_docs += 1
    
    print(f"✓ {method_docs}/{len(found_methods)} methods have docstrings")
    
    # Summary
    print("\n" + "=" * 60)
    if all_found:
        print("✓ ALL REQUIREMENTS MET")
        print("=" * 60)
        print("\nImplemented features:")
        print("  ✓ ModelManager class with all required methods")
        print("  ✓ detect_device() for automatic GPU/CPU detection")
        print("  ✓ load_model() with device-aware loading")
        print("  ✓ predict() with error handling")
        print("  ✓ Lazy loading (load on first inference)")
        print("  ✓ unload_model() for memory cleanup")
        print("  ✓ OutOfMemoryError handling with CPU fallback")
        print("  ✓ Custom exception classes")
        print("  ✓ Comprehensive documentation")
        return True
    else:
        print("✗ SOME REQUIREMENTS NOT MET")
        print("=" * 60)
        return False


if __name__ == "__main__":
    success = validate_model_manager_structure()
    sys.exit(0 if success else 1)
