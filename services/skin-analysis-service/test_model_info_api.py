#!/usr/bin/env python3
"""
Integration test for the /api/skin/model/info endpoint using FastAPI TestClient.

This script tests the endpoint through the FastAPI application to ensure
it works correctly in the actual API context.
"""

import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

from fastapi.testclient import TestClient
from app.main import app
import json


def test_model_info_api():
    """Test the model info endpoint through the FastAPI app."""
    print("=" * 70)
    print("Testing /api/skin/model/info API Endpoint")
    print("=" * 70)
    print()
    
    # Create test client
    client = TestClient(app)
    
    try:
        # Make GET request to the endpoint
        print("Making GET request to /api/skin/model/info...")
        response = client.get("/api/skin/model/info")
        
        print(f"\n✓ Response Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"✗ Expected status code 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        # Parse JSON response
        data = response.json()
        
        print("\n" + "=" * 70)
        print("Response Data:")
        print("=" * 70)
        print(json.dumps(data, indent=2))
        print()
        
        # Validate response structure
        print("\n" + "=" * 70)
        print("Validation Results:")
        print("=" * 70)
        
        required_sections = ["model", "status", "accuracy", "capabilities", "configuration"]
        all_valid = True
        
        for section in required_sections:
            if section in data:
                print(f"✓ Section '{section}' present")
            else:
                print(f"✗ Section '{section}' MISSING")
                all_valid = False
        
        # Validate specific fields
        print("\nValidating specific fields:")
        
        # Model name
        if data.get("model", {}).get("name"):
            print(f"  ✓ Model name: {data['model']['name']}")
        else:
            print("  ✗ Model name missing")
            all_valid = False
        
        # Model version
        if data.get("model", {}).get("version"):
            print(f"  ✓ Model version: {data['model']['version']}")
        else:
            print("  ✗ Model version missing")
            all_valid = False
        
        # Accuracy
        if data.get("accuracy", {}).get("reported_accuracy"):
            print(f"  ✓ Accuracy: {data['accuracy']['reported_accuracy']}")
        else:
            print("  ✗ Accuracy missing")
            all_valid = False
        
        # Device
        if data.get("status", {}).get("device"):
            print(f"  ✓ Device: {data['status']['device']}")
        else:
            print("  ✗ Device missing")
            all_valid = False
        
        # Loading status
        if "loaded" in data.get("status", {}):
            print(f"  ✓ Loading status: {data['status']['loaded']}")
        else:
            print("  ✗ Loading status missing")
            all_valid = False
        
        # Supported skin types
        skin_types = data.get("capabilities", {}).get("supported_skin_types", [])
        if skin_types:
            print(f"  ✓ Supported skin types: {len(skin_types)} types")
            for st in skin_types:
                print(f"    - {st}")
        else:
            print("  ✗ Supported skin types missing")
            all_valid = False
        
        # Supported issues
        issues = data.get("capabilities", {}).get("supported_issues", [])
        if issues:
            print(f"  ✓ Supported issues: {len(issues)} issues")
            for issue in issues:
                print(f"    - {issue}")
        else:
            print("  ✗ Supported issues missing")
            all_valid = False
        
        print("\n" + "=" * 70)
        if all_valid:
            print("✓ All validations passed!")
        else:
            print("✗ Some validations failed!")
        print("=" * 70)
        
        return all_valid
        
    except Exception as e:
        print(f"\n✗ Error testing API endpoint: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main test function."""
    print("\nModel Info API Integration Test")
    print("=" * 70)
    print("Testing the endpoint through FastAPI TestClient")
    print()
    
    success = test_model_info_api()
    
    if success:
        print("\n✓ API integration test completed successfully!")
        sys.exit(0)
    else:
        print("\n✗ API integration test failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
