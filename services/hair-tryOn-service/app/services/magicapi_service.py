import aiohttp
import logging
import json
import asyncio
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class MagicAPIService:
    """
    Service for MagicAPI Hair V2
    """
    
    def __init__(self, api_key: str, api_url: str = "https://prod.api.market/api/v1/magicapi/hair-v2"):
        self.api_key = api_key
        self.api_url = api_url
        self.headers = {
            "x-magicapi-key": self.api_key,
            "Content-Type": "application/json"
        }

    async def _upload_to_temp_storage(self, image_data: bytes) -> Optional[str]:
        """
        Upload image to temporary storage (tmpfiles.org) to get a public URL
        """
        try:
            url = "https://tmpfiles.org/api/v1/upload"
            data = aiohttp.FormData()
            data.add_field('file', image_data, filename='image.jpg', content_type='image/jpeg')
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, data=data) as response:
                    if response.status == 200:
                        result = await response.json()
                        if result.get("status") == "success":
                            # Convert to direct download link
                            # From: https://tmpfiles.org/12345/image.jpg
                            # To:   https://tmpfiles.org/dl/12345/image.jpg
                            page_url = result.get("data", {}).get("url")
                            if page_url:
                                direct_url = page_url.replace("tmpfiles.org/", "tmpfiles.org/dl/")
                                if direct_url.startswith("http://"):
                                    direct_url = direct_url.replace("http://", "https://")
                                return direct_url
            
            logger.error(f"Tmpfiles upload failed: {response.status}")
            return None
        except Exception as e:
            logger.error(f"Failed to upload to temp storage: {e}")
            return None

    async def generate_hairstyle(self, image_data: bytes, prompt: str) -> Optional[str]:
        """
        Generate hairstyle using MagicAPI V2
        """
        try:
            # 1. Upload image to get public URL
            image_url = await self._upload_to_temp_storage(image_data)
            if not image_url:
                logger.error("Failed to get public URL for image")
                return None
            
            logger.info(f"Image uploaded to temp storage: {image_url}")

            # 2. Submit job
            # Payload structure for V2:
            # { "input": { "image": "...", "hairstyle": "...", "haircolor": "...", "hairproperty": "..." } }
            
            # Extract color from prompt if possible, otherwise default
            hair_color = "natural"
            hair_style = prompt
            
            payload = {
                "input": {
                    "image": image_url,
                    "hairstyle": hair_style,
                    "haircolor": hair_color,
                    "hairproperty": "natural"
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_url}/run",
                    headers=self.headers,
                    json=payload
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"MagicAPI error: {error_text}")
                        return None
                    
                    data = await response.json()
                    request_id = data.get("id")
                    
                    if not request_id:
                        logger.error("No request_id received from MagicAPI")
                        return None
                        
                    logger.info(f"MagicAPI job submitted. Request ID: {request_id}")

                    # 3. Poll for result
                    # Poll for up to 300 seconds (5 minutes)
                    for i in range(150):
                        await asyncio.sleep(2)
                        
                        async with session.get(
                            f"{self.api_url}/status/{request_id}",
                            headers=self.headers
                        ) as status_response:
                            if status_response.status == 200:
                                status_data = await status_response.json()
                                status = status_data.get("status")
                                
                                if i % 5 == 0:  # Log every 10 seconds
                                    logger.info(f"MagicAPI job status: {status}")
                                
                                if status == "COMPLETED":
                                    result_url = status_data.get("output", {}).get("image_url")
                                    if result_url:
                                        logger.info(f"MagicAPI job completed. Result URL: {result_url}")
                                        return result_url
                                
                                if status == "FAILED":
                                    logger.error(f"MagicAPI job failed: {status_data}")
                                    return None
                            else:
                                logger.error(f"Status check failed: {status_response.status}")
            
            return None

        except Exception as e:
            logger.error(f"Error in generate_hairstyle: {e}")
            return None
