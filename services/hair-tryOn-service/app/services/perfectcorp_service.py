"""
PerfectCorp API Integration Service
Fetches default hairstyles from PerfectCorp API
"""

import aiohttp
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import json
from pathlib import Path

logger = logging.getLogger(__name__)


class PerfectCorpService:
    """Service for fetching hairstyles from PerfectCorp API"""
    
    def __init__(
        self,
        api_key: str,
        api_url: str = "https://yce-api-01.perfectcorp.com/s2s/v2.0",
        cache_ttl: int = 86400  # 24 hours
    ):
        self.api_key = api_key
        self.api_url = api_url
        self.cache_ttl = cache_ttl
        self.cache_file = Path("temp/hairstyles_cache.json")
        self.cache_file.parent.mkdir(parents=True, exist_ok=True)
        self._cache = None
        self._cache_timestamp = None
    
    def _is_cache_valid(self) -> bool:
        """Check if cache is still valid"""
        if self._cache is None or self._cache_timestamp is None:
            return False
        
        age = datetime.now() - self._cache_timestamp
        return age.total_seconds() < self.cache_ttl
    
    def _load_cache_from_file(self) -> bool:
        """Load cache from file"""
        try:
            if not self.cache_file.exists():
                return False
            
            with open(self.cache_file, 'r') as f:
                data = json.load(f)
            
            timestamp = datetime.fromisoformat(data['timestamp'])
            age = datetime.now() - timestamp
            
            if age.total_seconds() < self.cache_ttl:
                self._cache = data['hairstyles']
                self._cache_timestamp = timestamp
                logger.info(f"Loaded {len(self._cache)} hairstyles from cache file")
                return True
            
            return False
            
        except Exception as e:
            logger.warning(f"Failed to load cache from file: {e}")
            return False
    
    def _save_cache_to_file(self):
        """Save cache to file"""
        try:
            data = {
                'timestamp': self._cache_timestamp.isoformat(),
                'hairstyles': self._cache
            }
            
            with open(self.cache_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            logger.info(f"Saved {len(self._cache)} hairstyles to cache file")
            
        except Exception as e:
            logger.warning(f"Failed to save cache to file: {e}")
    
    async def fetch_hairstyles(
        self,
        page_size: int = 20,
        starting_token: Optional[str] = None,
        force_refresh: bool = False
    ) -> List[Dict]:
        """
        Fetch hairstyles from PerfectCorp API
        
        Args:
            page_size: Number of hairstyles to fetch
            starting_token: Pagination token
            force_refresh: Force refresh cache
            
        Returns:
            List of hairstyle dictionaries
        """
        # Check cache first
        if not force_refresh:
            if self._is_cache_valid():
                logger.info("Returning hairstyles from memory cache")
                return self._cache
            
            if self._load_cache_from_file():
                return self._cache
        
        # Fetch from API
        try:
            logger.info("Fetching hairstyles from PerfectCorp API...")
            
            url = f"{self.api_url}/task/template/hair-style"
            params = {
                "page_size": page_size
            }
            
            # Add starting_token only if provided and not empty
            if starting_token:
                params["starting_token"] = starting_token
            
            # PerfectCorp v2 API uses Authorization: Bearer <API_KEY>
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, headers=headers) as response:
                    response_text = await response.text()
                    
                    if response.status != 200:
                        logger.error(f"API request failed: {response.status} - {response_text}")
                        raise Exception(f"API request failed with status {response.status}: {response_text}")
                    
                    try:
                        data = json.loads(response_text)
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse JSON response: {e}")
                        logger.error(f"Response text: {response_text}")
                        raise
            
           # Parse response
            hairstyles = self._parse_hairstyles(data)
             
            # Update cache
            self._cache = hairstyles
            self._cache_timestamp = datetime.now()
            self._save_cache_to_file()
            
            logger.info(f"Fetched {len(hairstyles)} hairstyles from API")
            return hairstyles
            
        except Exception as e:
            logger.error(f"Failed to fetch hairstyles: {e}")
            
            # Return cached data if available
            if self._cache:
                logger.warning("Returning stale cache due to API error")
                return self._cache
            
            raise
    
    def _parse_hairstyles(self, api_response: Dict) -> List[Dict]:
        """
        Parse API response and extract hairstyle information
        
        Args:
            api_response: Raw API response
            
        Returns:
            List of parsed hairstyle dictionaries
        """
        hairstyles = []
        
        try:
            # Log the response structure for debugging
            logger.debug(f"API Response structure: {json.dumps(api_response, indent=2)[:500]}")
            
            # PerfectCorp API response structure:
            # {
            #   "status": 200,
            #   "data": {
            #     "templates": [
            #       {"id": "...", "thumb": "...", "title": "...", "category_name": "..."}
            #     ],
            #     "next_token": "..."
            #   }
            # }
            data = api_response.get('data', {})
            templates = data.get('templates', [])
            
            if not templates:
                logger.warning("No templates found in API response")
                logger.debug(f"Full response: {api_response}")
            
            logger.info(f"Found {len(templates)} templates in response")
            
            for template in templates:
                hairstyle = {
                    'id': str(template.get('id', '')),
                    'preview_image_url': template.get('thumb', ''),
                    'style_name': template.get('title', 'Unnamed Style'),
                    'category': template.get('category_name', 'default'),
                    'description': template.get('description', ''),
                    'tags': []
                }
                
                logger.debug(f"Parsed hairstyle: {hairstyle}")
                
                # Only add if we have required fields
                if hairstyle['id'] and hairstyle['preview_image_url']:
                    hairstyles.append(hairstyle)
                else:
                    logger.warning(f"Skipping template with missing fields: {template}")
            
            return hairstyles
            
        except Exception as e:
            logger.error(f"Failed to parse hairstyles: {e}")
            logger.error(f"API response: {api_response}")
            raise
    
    async def get_hairstyle_by_id(self, hairstyle_id: str) -> Optional[Dict]:
        """
        Get a specific hairstyle by ID
        
        Args:
            hairstyle_id: Hairstyle ID
            
        Returns:
            Hairstyle dictionary or None
        """
        hairstyles = await self.fetch_hairstyles()
        
        for hairstyle in hairstyles:
            if hairstyle['id'] == hairstyle_id:
                return hairstyle
        
        return None
    
    async def download_hairstyle_image(self, image_url: str) -> bytes:
        """
        Download hairstyle image from URL
        
        Args:
            image_url: Image URL
            
        Returns:
            Image data as bytes
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(image_url) as response:
                    if response.status != 200:
                        raise Exception(f"Failed to download image: {response.status}")
                    
                    return await response.read()
                    
        except Exception as e:
            logger.error(f"Failed to download hairstyle image: {e}")
            raise
    
    def clear_cache(self):
        """Clear the cache"""
        self._cache = None
        self._cache_timestamp = None
        
        if self.cache_file.exists():
            self.cache_file.unlink()
        
        logger.info("Cache cleared")
