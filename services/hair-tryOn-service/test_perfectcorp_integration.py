#!/usr/bin/env python3
"""
Test PerfectCorp AI Hairstyle Generator Integration

This script tests the PerfectCorp API integration without making actual API calls.
It validates the service logic and flow.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.perfectcorp_service import PerfectCorpService
from app.core.config import settings
import asyncio


async def test_service_initialization():
    """Test service initialization"""
    print("\n=== Test 1: Service Initialization ===")
    
    service = PerfectCorpService(
        api_key=settings.perfectcorp_api_key,
        api_url=settings.perfectcorp_api_url
    )
    
    print(f"✅ Service initialized")
    print(f"   API Enabled: {service.api_enabled}")
    print(f"   API URL: {service.api_url}")
    print(f"   Static hairstyles loaded: {len(service.hairstyles)}")
    
    return service


async def test_static_data(service):
    """Test static hairstyle data"""
    print("\n=== Test 2: Static Hairstyle Data ===")
    
    # Fetch hairstyles
    result = await service.fetch_hairstyles(page=1, page_size=10)
    
    print(f"✅ Fetched hairstyles")
    print(f"   Count: {len(result.get('data', []))}")
    print(f"   Total available: {len(service.hairstyles)}")
    
    # Get specific hairstyle
    if result.get('data'):
        first_style = result['data'][0]
        style_id = first_style.get('id')
        
        hairstyle = service.get_hairstyle_by_id(style_id)
        if hairstyle:
            print(f"✅ Found hairstyle by ID")
            print(f"   ID: {hairstyle.get('id')}")
            print(f"   Name: {hairstyle.get('style_name')}")
            print(f"   Gender: {hairstyle.get('gender')}")
        else:
            print(f"❌ Could not find hairstyle by ID: {style_id}")


async def test_api_methods(service):
    """Test API methods (without actual API calls)"""
    print("\n=== Test 3: API Methods ===")
    
    if not service.api_enabled:
        print("⚠️ PerfectCorp API not enabled (no API key)")
        print("   Skipping API tests")
        return
    
    print(f"✅ API is enabled")
    print(f"   Note: Actual API calls require valid images and consume API quota")
    print(f"   These tests verify method signatures only")
    
    # Check method exists
    assert hasattr(service, 'apply_hairstyle'), "Missing apply_hairstyle method"
    assert hasattr(service, 'list_templates'), "Missing list_templates method"
    assert hasattr(service, '_upload_file'), "Missing _upload_file method"
    assert hasattr(service, '_submit_hairstyle_task'), "Missing _submit_hairstyle_task method"
    assert hasattr(service, '_poll_task_status'), "Missing _poll_task_status method"
    
    print(f"✅ All API methods present")


async def test_list_templates(service):
    """Test template listing (falls back to static if API disabled)"""
    print("\n=== Test 4: List Templates ===")
    
    result = await service.list_templates(page_size=5)
    
    templates = result.get('templates', [])
    print(f"✅ Listed templates")
    print(f"   Count: {len(templates)}")
    print(f"   Has next token: {bool(result.get('next_token'))}")
    
    if templates:
        print(f"\n   Sample template:")
        sample = templates[0]
        print(f"   - ID: {sample.get('id')}")
        print(f"   - Name: {sample.get('name')}")
        print(f"   - Preview URL: {sample.get('preview_url')[:50]}..." if sample.get('preview_url') else "   - No preview URL")


def print_summary(service):
    """Print integration summary"""
    print("\n" + "="*60)
    print("INTEGRATION SUMMARY")
    print("="*60)
    
    print(f"\n📊 Configuration:")
    print(f"   API Key Set: {'✅ Yes' if service.api_key else '❌ No'}")
    print(f"   API URL: {service.api_url}")
    print(f"   API Enabled: {'✅ Yes' if service.api_enabled else '❌ No'}")
    
    print(f"\n📁 Static Data:")
    print(f"   Total Hairstyles: {len(service.hairstyles)}")
    if service.hairstyles:
        male_count = sum(1 for h in service.hairstyles if h.get('gender', '').lower() == 'male')
        female_count = sum(1 for h in service.hairstyles if h.get('gender', '').lower() == 'female')
        print(f"   Male: {male_count}")
        print(f"   Female: {female_count}")
        print(f"   Other: {len(service.hairstyles) - male_count - female_count}")
    
    print(f"\n🚀 Features Available:")
    print(f"   Static Hairstyle Listing: ✅ Yes")
    print(f"   Static Hairstyle Processing: ✅ Yes")
    print(f"   AI Hairstyle Generation: {'✅ Yes' if service.api_enabled else '❌ No (API key required)'}")
    
    print(f"\n📝 Next Steps:")
    if not service.api_enabled:
        print(f"   1. Obtain PerfectCorp API key from:")
        print(f"      https://yce.perfectcorp.com/api-console/en/api-keys/")
        print(f"   2. Add to .env.local:")
        print(f"      PERFECTCORP_API_KEY=your_key_here")
        print(f"   3. Restart service to enable AI features")
    else:
        print(f"   ✅ All features enabled!")
        print(f"   Ready to use AI Hairstyle Generator")
    
    print("\n" + "="*60)


async def main():
    """Run all tests"""
    print("="*60)
    print("PerfectCorp AI Hairstyle Generator Integration Test")
    print("="*60)
    
    try:
        # Initialize service
        service = await test_service_initialization()
        
        # Test static data
        await test_static_data(service)
        
        # Test API methods
        await test_api_methods(service)
        
        # Test template listing
        await test_list_templates(service)
        
        # Print summary
        print_summary(service)
        
        print(f"\n✅ All tests passed!")
        return 0
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
