#!/usr/bin/env python3
"""
Quick demo of the ML integration with AI Service.

This script demonstrates the complete integration working end-to-end.
"""

import sys
import asyncio
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from PIL import Image
import numpy as np


async def main():
    print("=" * 70)
    print("ML Integration Demo - AI Service")
    print("=" * 70)
    
    # Import AI Service
    from app.services.ai_service import AIService
    
    # Create test image
    print("\n1. Creating test image...")
    img_array = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    img = Image.fromarray(img_array)
    test_path = "demo_test_image.jpg"
    img.save(test_path)
    print(f"   ✓ Created: {test_path}")
    
    # Initialize service
    print("\n2. Initializing AI Service...")
    service = AIService()
    print(f"   ✓ ML Enabled: {service.ml_enabled}")
    print(f"   ✓ Model Version: {service.model_version}")
    
    # Get model info
    print("\n3. Model Information:")
    model_info = service.get_model_info()
    print(f"   - ML Enabled: {model_info['ml_enabled']}")
    print(f"   - Model Sources: {model_info['model_sources']}")
    if model_info['ml_config']:
        print(f"   - Device: {model_info['ml_config']['device']}")
        print(f"   - Confidence Threshold: {model_info['ml_config']['confidence_threshold']}")
        print(f"   - Lazy Loading: {model_info['ml_config']['lazy_loading']}")
    
    # Run analysis
    print("\n4. Running skin analysis...")
    result = await service.analyze_skin_image(test_path)
    
    print(f"\n5. Analysis Results:")
    print(f"   - Skin Type: {result['skin_type']}")
    print(f"   - Issues Detected: {len(result['issues'])}")
    print(f"   - Processing Time: {result['processing_time']:.3f}s")
    print(f"   - Model Source: {result['model_source']}")
    
    if result['issues']:
        print(f"\n   Detected Issues:")
        for issue in result['issues']:
            print(f"   • {issue['name']}: {issue['confidence']:.3f} ({issue['severity']})")
    
    # Show timing breakdown if available
    if 'timing_breakdown' in result:
        timing = result['timing_breakdown']
        print(f"\n6. Timing Breakdown:")
        print(f"   - Preprocessing: {timing['preprocessing']:.3f}s")
        print(f"   - Inference: {timing['inference']:.3f}s")
        print(f"   - Postprocessing: {timing['postprocessing']:.3f}s")
        print(f"   - Total: {timing['total']:.3f}s")
    
    # Cleanup
    import os
    if os.path.exists(test_path):
        os.remove(test_path)
        print(f"\n7. Cleanup: Removed {test_path}")
    
    print("\n" + "=" * 70)
    print("✓ Demo completed successfully!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
