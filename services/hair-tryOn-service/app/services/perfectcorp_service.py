"""
PerfectCorp Service - Static Hairstyles Data

Provides hairstyles from local static JSON file
"""

import aiohttp
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import json
from pathlib import Path


logger = logging.getLogger(__name__)


class PerfectCorpService:
    """Service for managing hairstyles using static data"""
    
    def __init__(self, api_key: str = "", api_url: str = "", cache_ttl: int = 86400):
        """
        Initialize service with static data
        
        Args:
            api_key: Not used (kept for backward compatibility)
            api_url: Not used (kept for backward compatibility)
            cache_ttl: Not used (kept for backward compatibility)
        """
        print("🔵 PerfectCorpService.__init__ called!")  # Debug print
        self.static_data_path = Path(__file__).parent.parent / "data" / "hairstyles.json"
        print(f"🔵 Static data path: {self.static_data_path}")  # Debug print
        self.hairstyles: List[Dict] = []
        print(f"🔵 About to load static data...")  # Debug print
        self._load_static_data()
        print(f"🔵 After _load_static_data, hairstyles count: {len(self.hairstyles)}")  # Debug print
    
    def _load_static_data(self) -> None:
        """Load hairstyles from static JSON file"""
        try:
            print(f"🔵 _load_static_data() called!")  # Debug print
            logger.info(f"📂 Loading static hairstyles from: {self.static_data_path}")
            
            if not self.static_data_path.exists():
                print(f"❌ File NOT found: {self.static_data_path}")  # Debug print
                logger.error(f"❌ Static data file not found: {self.static_data_path}")
                self.hairstyles = []
                return
            
            print(f"✅ File found, opening...")  # Debug print
            with open(self.static_data_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            print(f"✅ JSON loaded, data keys: {data.keys()}")  # Debug print
            
            # Extract hairstyles array from the JSON structure
            hairstyles_data = data.get('hairstyles', [])
            print(f"✅ Hairstyles array length: {len(hairstyles_data)}")  # Debug print
            
            # Transform the data to match expected format
            self.hairstyles = []
            for item in hairstyles_data:
                hairstyle = {
                    'id': item.get('id', ''),
                    'preview_image_url': item.get('thumb', ''),  # Map 'thumb' to 'preview_image_url'
                    'style_name': item.get('title', ''),  # Map 'title' to 'style_name'
                    'category': item.get('category_name', ''),  # Map 'category_name' to 'category'
                    'gender': item.get('category_name', 'unisex').lower()  # Use category_name as gender
                }
                self.hairstyles.append(hairstyle)
            
            print(f"✅ Successfully transformed {len(self.hairstyles)} hairstyles")  # Debug print
            logger.info(f"✅ Successfully loaded {len(self.hairstyles)} hairstyles from static file")
            
            # Log gender breakdown
            if self.hairstyles:
                male_count = sum(1 for h in self.hairstyles if h.get('gender', '').lower() == 'male')
                female_count = sum(1 for h in self.hairstyles if h.get('gender', '').lower() == 'female')
                other_count = len(self.hairstyles) - male_count - female_count
                print(f"📊 Gender breakdown - Male: {male_count}, Female: {female_count}, Other: {other_count}")
                logger.info(f"📊 Gender breakdown - Male: {male_count}, Female: {female_count}, Other: {other_count}")
                
                # Sample male and female hairstyles
                male_samples = [h['id'] for h in self.hairstyles if h.get('gender', '').lower() == 'male'][:3]
                female_samples = [h['id'] for h in self.hairstyles if h.get('gender', '').lower() == 'female'][:3]
                print(f"📋 Sample Male IDs: {male_samples}")
                print(f"📋 Sample Female IDs: {female_samples}")
                logger.info(f"📋 Sample Male IDs: {male_samples}")
                logger.info(f"📋 Sample Female IDs: {female_samples}")
            
        except Exception as e:
            print(f"❌ EXCEPTION in _load_static_data: {str(e)}")  # Debug print
            logger.error(f"❌ Error loading static data: {str(e)}")
            import traceback
            print(traceback.format_exc())  # Debug print
            logger.error(f"Traceback: {traceback.format_exc()}")
            self.hairstyles = []
    
    async def fetch_hairstyles(
        self,
        page: int = 1,
        page_size: int = 20,
        gender: Optional[str] = None,
        starting_token: Optional[str] = None,
        force_refresh: bool = False
    ) -> Dict:
        """
        Fetch hairstyles from static data with pagination
        
        Args:
            page: Page number (1-indexed)
            page_size: Number of items per page
            gender: Filter by gender ('male', 'female', or None for all)
            starting_token: Not used (kept for backward compatibility)
            force_refresh: Not used (kept for backward compatibility)
        
        Returns:
            Dictionary with pagination info and hairstyles
        """
        try:
            print(f"🔵 fetch_hairstyles() called - Total hairstyles in memory: {len(self.hairstyles)}")  # Debug print
            logger.info(f"📄 Fetching hairstyles - Page: {page}, Size: {page_size}, Gender: {gender}")
            
            # Filter by gender if specified
            filtered_styles = self.hairstyles
            if gender:
                filtered_styles = [h for h in self.hairstyles if h.get('gender', 'unisex').lower() == gender.lower()]
                print(f"🔵 Gender filter applied: '{gender}' -> {len(filtered_styles)} hairstyles")
            else:
                print(f"🔵 No gender filter - returning all {len(filtered_styles)} hairstyles")
            
            print(f"🔵 After gender filter: {len(filtered_styles)} hairstyles")  # Debug print
            
            # Calculate pagination
            total = len(filtered_styles)
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            
            print(f"🔵 Pagination: start={start_idx}, end={end_idx}, total={total}")  # Debug print
            
            # Get page data
            page_data = filtered_styles[start_idx:end_idx]
            
            print(f"🔵 Page data count: {len(page_data)}")  # Debug print
            
            result = {
                'data': page_data,
                'pagination': {
                    'current_page': page,
                    'page_size': page_size,
                    'total': total,
                    'total_pages': (total + page_size - 1) // page_size
                }
            }
            
            print(f"🔵 Result structure: {list(result.keys())}")  # Debug print
            logger.info(f"✅ Returning {len(page_data)} hairstyles (Total: {total})")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error fetching hairstyles: {str(e)}")
            return {
                'data': [],
                'pagination': {
                    'current_page': page,
                    'page_size': page_size,
                    'total': 0,
                    'total_pages': 0
                }
            }
    
    def get_hairstyle_by_id(self, hairstyle_id: str) -> Optional[Dict]:
        """
        Get a specific hairstyle by ID from static data
        
        Args:
            hairstyle_id: The hairstyle ID to look up
        
        Returns:
            Hairstyle dictionary if found, None otherwise
        """
        try:
            logger.info(f"🔍 Looking up hairstyle ID: {hairstyle_id}")
            
            for hairstyle in self.hairstyles:
                if hairstyle.get('id') == hairstyle_id:
                    logger.info(f"✅ Found hairstyle: {hairstyle.get('title', 'Unknown')}")
                    return hairstyle
            
            logger.warning(f"❌ Hairstyle not found for ID: {hairstyle_id}")
            logger.info(f"📋 Total hairstyles available: {len(self.hairstyles)}")
            
            # Log a few sample IDs to help debugging
            if self.hairstyles:
                sample_ids = [h['id'] for h in self.hairstyles[:10]]
                logger.info(f"📋 Sample available IDs: {sample_ids}")
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error looking up hairstyle: {str(e)}")
            return None
    
    async def download_hairstyle_image(self, hairstyle: Dict) -> Optional[bytes]:
        """
        Download hairstyle image from URL
        
        Args:
            hairstyle: Hairstyle dictionary containing thumbnail URL
        
        Returns:
            Image bytes if successful, None otherwise
        """
        try:
            thumbnail_url = hairstyle.get('thumbnail')
            if not thumbnail_url:
                logger.error("❌ No thumbnail URL in hairstyle data")
                return None
            
            logger.info(f"📥 Downloading hairstyle image: {hairstyle.get('title', 'Unknown')}")
            logger.info(f"🔗 URL: {thumbnail_url}")
            
            async with aiohttp.ClientSession() as session:
                async with session.get(thumbnail_url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                    if response.status == 200:
                        image_data = await response.read()
                        logger.info(f"✅ Downloaded {len(image_data)} bytes")
                        return image_data
                    else:
                        logger.error(f"❌ Failed to download image: HTTP {response.status}")
                        return None
                        
        except Exception as e:
            logger.error(f"❌ Error downloading hairstyle image: {str(e)}")
            return None
    
    def clear_cache(self) -> None:
        """Reload static data"""
        logger.info("🔄 Reloading static hairstyle data")
        self._load_static_data()
