#!/usr/bin/env python3
"""
Example usage of the Hair Try-On Service API
"""

import requests
import json
import time
import base64
from pathlib import Path

# Service URL
BASE_URL = "http://localhost:8000"

def test_health():
    """Test if service is running"""
    print("Testing service health...")
    response = requests.get(f"{BASE_URL}/api/hair-tryOn/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")
    return response.status_code == 200


def upload_video(video_path: str, user_id: str = "test_user"):
    """Upload a video for processing"""
    print(f"Uploading video: {video_path}")
    
    with open(video_path, 'rb') as f:
        files = {'video': f}
        data = {'user_id': user_id}
        
        response = requests.post(
            f"{BASE_URL}/api/hair-tryOn/upload-video",
            files=files,
            data=data
        )
    
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {json.dumps(result, indent=2)}\n")
    
    return result.get('upload_id')


def process_video(upload_id: str, style_image_path: str, user_id: str = "test_user", 
                  color_image_path: str = None):
    """Process uploaded video with hair style"""
    print(f"Processing video with style: {style_image_path}")
    
    files = {'style_image': open(style_image_path, 'rb')}
    data = {
        'upload_id': upload_id,
        'user_id': user_id
    }
    
    if color_image_path:
        files['color_image'] = open(color_image_path, 'rb')
    
    response = requests.post(
        f"{BASE_URL}/api/hair-tryOn/process-video",
        files=files,
        data=data
    )
    
    # Close file handles
    for f in files.values():
        f.close()
    
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {json.dumps(result, indent=2)}\n")
    
    return result.get('result_id')


def get_result(result_id: str, user_id: str = "test_user", max_wait: int = 60):
    """Get processing result (with polling)"""
    print(f"Checking result: {result_id}")
    
    start_time = time.time()
    while time.time() - start_time < max_wait:
        response = requests.get(
            f"{BASE_URL}/api/hair-tryOn/result/{result_id}",
            params={'user_id': user_id}
        )
        
        result = response.json()
        status = result.get('status')
        
        print(f"Status: {status}")
        
        if status == 'completed':
            print(f"✅ Processing completed!")
            print(f"Video URL: {result.get('video_url')}")
            print(f"Processing time: {result.get('processing_time')}s\n")
            return result
        elif status == 'failed':
            print(f"❌ Processing failed: {result.get('error')}\n")
            return result
        
        print("⏳ Still processing... waiting 5 seconds")
        time.sleep(5)
    
    print("⏱️ Timeout waiting for result\n")
    return None


def get_history(user_id: str = "test_user"):
    """Get user's processing history"""
    print(f"Getting history for user: {user_id}")
    
    response = requests.get(f"{BASE_URL}/api/hair-tryOn/history/{user_id}")
    
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {json.dumps(result, indent=2)}\n")
    
    return result


def example_image_processing():
    """Example: Process a single image (simulated as 1-frame video)"""
    print("=" * 60)
    print("Example: Image Processing")
    print("=" * 60 + "\n")
    
    # Note: You'll need to provide actual image files
    source_image = "path/to/your/photo.jpg"
    style_image = "path/to/hairstyle.jpg"
    
    print("This example requires actual image files.")
    print(f"1. Place your photo at: {source_image}")
    print(f"2. Place hairstyle reference at: {style_image}")
    print("3. Run this script again\n")


def example_websocket():
    """Example: Real-time WebSocket processing"""
    print("=" * 60)
    print("Example: WebSocket Real-Time Processing")
    print("=" * 60 + "\n")
    
    print("WebSocket example (requires websockets library):")
    print("""
import asyncio
import websockets
import json
import base64

async def realtime_hair_tryOn():
    uri = "ws://localhost:8000/api/hair-tryOn/realtime/session123?user_id=test_user"
    
    async with websockets.connect(uri) as websocket:
        # Set style image
        with open("hairstyle.jpg", "rb") as f:
            style_data = base64.b64encode(f.read()).decode()
        
        await websocket.send(json.dumps({
            "type": "set_style_image",
            "data": {"image_data": style_data}
        }))
        
        # Process frames
        with open("frame.jpg", "rb") as f:
            frame_data = base64.b64encode(f.read()).decode()
        
        await websocket.send(json.dumps({
            "type": "process_frame",
            "data": {
                "frame_id": "frame_001",
                "frame_data": frame_data
            }
        }))
        
        # Receive result
        response = await websocket.recv()
        result = json.loads(response)
        print(f"Received: {result['type']}")

asyncio.run(realtime_hair_tryOn())
    """)


def main():
    """Main example flow"""
    print("=" * 60)
    print("Hair Try-On Service - Example Usage")
    print("=" * 60 + "\n")
    
    # Test service health
    if not test_health():
        print("❌ Service is not running!")
        print("Start it with: uvicorn app.main:app --reload")
        return
    
    print("✅ Service is running!\n")
    
    # Show examples
    print("Available examples:")
    print("1. Video processing (requires video file)")
    print("2. Image processing (requires image files)")
    print("3. WebSocket real-time (requires websockets library)")
    print("4. Get processing history")
    print()
    
    # Example: Get history
    print("Example: Getting processing history...")
    get_history()
    
    # Show how to use other features
    print("\nTo process a video:")
    print("1. upload_id = upload_video('path/to/video.mp4')")
    print("2. result_id = process_video(upload_id, 'path/to/hairstyle.jpg')")
    print("3. result = get_result(result_id)")
    print()
    
    print("For more examples, see SETUP_GUIDE.md")


if __name__ == "__main__":
    main()
