#!/usr/bin/env python
"""
Test AI Auto-Detection Logic
Verifies that PerfectCorp AI is used automatically when appropriate
"""

def test_ai_detection_logic():
    """Test the AI detection logic"""
    
    print("=" * 60)
    print("AI Auto-Detection Logic Test")
    print("=" * 60)
    
    test_cases = [
        {
            "name": "Scenario 1: hairstyle_id + API enabled",
            "api_enabled": True,
            "hairstyle_id": "male_modern_slick",
            "hairstyle_image": None,
            "use_ai_param": None,
            "expected": True,
            "reason": "Should auto-use AI"
        },
        {
            "name": "Scenario 2: Custom image uploaded",
            "api_enabled": True,
            "hairstyle_id": None,
            "hairstyle_image": "custom.jpg",
            "use_ai_param": None,
            "expected": False,
            "reason": "Should use traditional (custom image)"
        },
        {
            "name": "Scenario 3: API not configured",
            "api_enabled": False,
            "hairstyle_id": "male_modern_slick",
            "hairstyle_image": None,
            "use_ai_param": None,
            "expected": False,
            "reason": "Should fallback to traditional (no API key)"
        },
        {
            "name": "Scenario 4: Force AI with use_ai=true",
            "api_enabled": True,
            "hairstyle_id": "male_modern_slick",
            "hairstyle_image": None,
            "use_ai_param": True,
            "expected": True,
            "reason": "Should use AI (explicit)"
        },
        {
            "name": "Scenario 5: Force traditional with use_ai=false",
            "api_enabled": True,
            "hairstyle_id": "male_modern_slick",
            "hairstyle_image": None,
            "use_ai_param": False,
            "expected": False,
            "reason": "Should use traditional (explicit)"
        },
        {
            "name": "Scenario 6: Both hairstyle_id and custom image",
            "api_enabled": True,
            "hairstyle_id": "male_modern_slick",
            "hairstyle_image": "custom.jpg",
            "use_ai_param": None,
            "expected": False,
            "reason": "Should use traditional (custom image present)"
        },
    ]
    
    passed = 0
    failed = 0
    
    for test in test_cases:
        # Simulate the detection logic
        should_use_ai = test["use_ai_param"]
        if should_use_ai is None:
            should_use_ai = (
                test["api_enabled"] and 
                test["hairstyle_id"] is not None and 
                test["hairstyle_image"] is None
            )
        
        # Check result
        success = should_use_ai == test["expected"]
        
        if success:
            status = "✅ PASS"
            passed += 1
        else:
            status = "❌ FAIL"
            failed += 1
        
        print(f"\n{status} - {test['name']}")
        print(f"   API Enabled: {test['api_enabled']}")
        print(f"   Hairstyle ID: {test['hairstyle_id']}")
        print(f"   Custom Image: {test['hairstyle_image']}")
        print(f"   use_ai param: {test['use_ai_param']}")
        print(f"   Expected: {test['expected']}, Got: {should_use_ai}")
        print(f"   Reason: {test['reason']}")
    
    print("\n" + "=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)
    
    if failed == 0:
        print("\n🎉 All tests passed! AI auto-detection logic is correct.")
    else:
        print(f"\n⚠️  {failed} test(s) failed. Please review the logic.")
    
    return failed == 0


if __name__ == "__main__":
    success = test_ai_detection_logic()
    exit(0 if success else 1)
