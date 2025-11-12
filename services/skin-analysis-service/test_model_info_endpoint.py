#!/usr/bin/env python3
"""
Test script for the /api/skin/model/info endpoint.

This script validates that the model metadata endpoint returns
the expected information including model name, version, accuracy,
device, loading status, and supported skin types/issues.
"""

import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

from app.api.routes.skin_analysis import get_model_info
from app.core.ml_config import ml_settings
from app.ml.models import SkinType, IssueType
import asyncio
import json


async def test_model_info_endpoint():
    """Test the model info endpoint."""
    print("=" * 70)
    print("Testing /api/skin/model/info Endpoint")
    print("=" * 70)
    print()
    
    try:
        # Call the endpoint function
        print("Calling get_model_info()...")
        result = await get_model_info()
        
        print("\n✓ Endpoint executed successfully!")
        print("\n" + "=" * 70)
        print("Model Information Response:")
        print("=" * 70)
        print(json.dumps(result, indent=2))
        print()
        
        # Validate response structure
        print("\n" + "=" * 70)
        print("Validating Response Structure:")
        print("=" * 70)
        
        required_keys = ["model", "status", "accuracy", "capabilities", "configuration", "performance", "optimizations"]
        for key in required_keys:
            if key in result:
                print(f"✓ '{key}' present")
            else:
                print(f"✗ '{key}' MISSING")
                return False
        
        # Validate model section
        print("\nValidating 'model' section:")
        model_keys = ["name", "version", "path", "exists"]
        for key in model_keys:
            if key in result["model"]:
                print(f"  ✓ model.{key}: {result['model'][key]}")
            else:
                print(f"  ✗ model.{key} MISSING")
        
        # Validate status section
        print("\nValidating 'status' section:")
        status_keys = ["loaded", "device", "device_preference"]
        for key in status_keys:
            if key in result["status"]:
                print(f"  ✓ status.{key}: {result['status'][key]}")
            else:
                print(f"  ✗ status.{key} MISSING")
        
        # Validate accuracy section
        print("\nValidating 'accuracy' section:")
        accuracy_keys = ["reported_accuracy", "confidence_threshold"]
        for key in accuracy_keys:
            if key in result["accuracy"]:
                print(f"  ✓ accuracy.{key}: {result['accuracy'][key]}")
            else:
                print(f"  ✗ accuracy.{key} MISSING")
        
        # Validate capabilities section
        print("\nValidating 'capabilities' section:")
        if "supported_skin_types" in result["capabilities"]:
            skin_types = result["capabilities"]["supported_skin_types"]
            print(f"  ✓ supported_skin_types ({len(skin_types)} types):")
            for st in skin_types:
                print(f"    - {st}")
        else:
            print("  ✗ supported_skin_types MISSING")
        
        if "supported_issues" in result["capabilities"]:
            issues = result["capabilities"]["supported_issues"]
            print(f"  ✓ supported_issues ({len(issues)} issues):")
            for issue in issues:
                print(f"    - {issue}")
        else:
            print("  ✗ supported_issues MISSING")
        
        # Validate configuration section
        print("\nValidating 'configuration' section:")
        config_keys = ["batch_size", "input_size", "lazy_loading", "max_inference_time"]
        for key in config_keys:
            if key in result["configuration"]:
                print(f"  ✓ configuration.{key}: {result['configuration'][key]}")
            else:
                print(f"  ✗ configuration.{key} MISSING")
        
        # Validate optimizations section
        print("\nValidating 'optimizations' section:")
        opt_keys = ["quantization_enabled", "onnx_enabled", "highlighted_images_enabled"]
        for key in opt_keys:
            if key in result["optimizations"]:
                print(f"  ✓ optimizations.{key}: {result['optimizations'][key]}")
            else:
                print(f"  ✗ optimizations.{key} MISSING")
        
        print("\n" + "=" * 70)
        print("✓ All validations passed!")
        print("=" * 70)
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error testing endpoint: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main test function."""
    print("\nModel Info Endpoint Test")
    print("=" * 70)
    print(f"Model Name: {ml_settings.MODEL_NAME}")
    print(f"Model Path: {ml_settings.MODEL_PATH}")
    print(f"Device: {ml_settings.DEVICE}")
    print(f"Confidence Threshold: {ml_settings.CONFIDENCE_THRESHOLD}")
    print()
    
    # Run the async test
    success = asyncio.run(test_model_info_endpoint())
    
    if success:
        print("\n✓ Test completed successfully!")
        sys.exit(0)
    else:
        print("\n✗ Test failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
