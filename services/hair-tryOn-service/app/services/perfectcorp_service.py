"""
PerfectCorp Service - AI Hairstyle Generator Integration

Provides:
1. Static hairstyles list from local JSON file
2. AI Hairstyle Generator API integration for real-time try-on
"""

import aiohttp
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import json
from pathlib import Path
import asyncio
import time
import base64
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend


logger = logging.getLogger(__name__)


class PerfectCorpService:
    """
    Service for managing hairstyles
    
    Features:
    - List default hairstyles from static JSON (for backward compatibility)
    - AI Hairstyle Generator integration for real-time try-on processing
    """
    
    def __init__(self, api_key: str = "", secret_key: str = "", api_url: str = "", cache_ttl: int = 86400):
        """
        Initialize service
        
        Args:
            api_key: PerfectCorp API Key (Client ID)
            secret_key: PerfectCorp Secret Key (Client Secret)
            api_url: PerfectCorp API base URL
            cache_ttl: Cache TTL (not used in static mode)
        """
        print("🔵 PerfectCorpService.__init__ called!")  # Debug print
        
        # API Configuration
        self.api_key = api_key
        self.secret_key = secret_key
        self.api_url = api_url or "https://yce-api-01.makeupar.com/s2s/v2.0"
        self.auth_url = self.api_url.replace("/v2.0", "/v1.0") + "/client/auth"
        self.api_enabled = bool(api_key)
        
        # Token management
        self.access_token = None
        self.token_expiry = datetime.min
        
        # Static data configuration
        self.static_data_path = Path(__file__).parent.parent / "data" / "hairstyles.json"
        print(f"🔵 Static data path: {self.static_data_path}")  # Debug print
        self.hairstyles: List[Dict] = []
        print(f"🔵 About to load static data...")  # Debug print
        self._load_static_data()
        print(f"🔵 After _load_static_data, hairstyles count: {len(self.hairstyles)}")  # Debug print
        
        if self.api_enabled:
            logger.info(f"✅ PerfectCorp API enabled with base URL: {self.api_url}")
        else:
            logger.warning("⚠️ PerfectCorp API key not provided - AI hairstyle generation disabled")
    
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
                    logger.info(f"✅ Found hairstyle: {hairstyle.get('style_name', 'Unknown')}")
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

    async def _get_access_token(self) -> Optional[str]:
        """
        Get valid access token.
        If secret_key is present, authenticates to get token.
        Otherwise, returns api_key (assuming it's a V2 key).
        """
        # If no secret key, assume api_key is the token (V2 direct key)
        if not self.secret_key:
            return self.api_key
            
        # Check if current token is valid (with 5 min buffer)
        if self.access_token and datetime.utcnow() < self.token_expiry - timedelta(minutes=5):
            return self.access_token
            
        try:
            logger.info("🔐 Authenticating with PerfectCorp to get Access Token...")
            
            id_token = self._generate_id_token()
            if not id_token:
                logger.error("❌ Failed to generate ID token")
                return None
                
            async with aiohttp.ClientSession() as session:
                payload = {
                    "client_id": self.api_key,
                    "id_token": id_token
                }
                
                async with session.post(self.auth_url, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        # Response format: {"status": 200, "result": {"access_token": "..."}}
                        result = data.get("result", {})
                        self.access_token = result.get("access_token")
                        
                        # Default expiry 1 hour if not provided
                        expires_in = result.get("expires_in", 3600)
                        self.token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
                        
                        logger.info("✅ Authentication successful")
                        return self.access_token
                    else:
                        error_text = await response.text()
                        logger.error(f"❌ Authentication failed: {response.status} - {error_text}")
                        return None
        except Exception as e:
            logger.error(f"❌ Error during authentication: {str(e)}")
            return None

    def _generate_id_token(self) -> Optional[str]:
        """Generate encrypted ID token using RSA Public Key (Secret Key)"""
        try:
            # Debug logs
            logger.info(f"🔑 Generating ID Token for Client ID: {self.api_key[:5]}...")
            logger.info(f"🔑 Secret Key present: {bool(self.secret_key)}")
            if self.secret_key:
                logger.info(f"🔑 Secret Key start: {self.secret_key[:10]}...")

            # 1. Prepare data
            timestamp = int(time.time() * 1000)
            data = f"client_id={self.api_key}&timestamp={timestamp}".encode('utf-8')
            logger.info(f"📝 Data to encrypt: {data}")

            # 2. Load Public Key
            key_str = self.secret_key
            if not key_str.startswith("-----BEGIN PUBLIC KEY-----"):
                key_str = f"-----BEGIN PUBLIC KEY-----\n{key_str}\n-----END PUBLIC KEY-----"
                
            public_key = serialization.load_pem_public_key(
                key_str.encode('utf-8'),
                backend=default_backend()
            )

            # 3. Encrypt (PKCS1v15 padding)
            encrypted = public_key.encrypt(
                data,
                padding.PKCS1v15()
            )

            # 4. Base64 Encode
            return base64.b64encode(encrypted).decode('utf-8')
        except Exception as e:
            logger.error(f"❌ Encryption error: {e}")
            return None
    
    # ============================================================================
    # AI Hairstyle Generator V2 API Integration
    # ============================================================================
    
    async def apply_hairstyle(
        self,
        user_image_bytes: bytes,
        template_id: str
    ) -> Optional[bytes]:
        """
        Apply hairstyle to user image using PerfectCorp AI Hairstyle Generator
        
        Args:
            user_image_bytes: User's photo as bytes
            template_id: Template ID from hairstyle list
            
        Returns:
            Processed image bytes if successful, None otherwise
        """
        if not self.api_enabled:
            logger.error("❌ PerfectCorp API key not configured")
            return None
        
        try:
            logger.info(f"🎨 Starting AI hairstyle generation with template: {template_id}")
            
            # Step 1: Upload file
            file_id = await self._upload_file(user_image_bytes)
            if not file_id:
                logger.error("❌ Failed to upload file")
                return None
            
            logger.info(f"✅ File uploaded successfully: {file_id}")
            
            # Step 2: Submit hairstyle task
            task_id = await self._submit_hairstyle_task(file_id, template_id)
            if not task_id:
                logger.error("❌ Failed to submit hairstyle task")
                return None
            
            logger.info(f"✅ Task submitted successfully: {task_id}")
            
            # Step 3: Poll for result
            result_url = await self._poll_task_status(task_id)
            if not result_url:
                logger.error("❌ Failed to get task result")
                return None
            
            logger.info(f"✅ Task completed, downloading result from: {result_url}")
            
            # Step 4: Download result image
            result_bytes = await self._download_result_image(result_url)
            if result_bytes:
                logger.info(f"✅ Result downloaded: {len(result_bytes)} bytes")
            
            return result_bytes
            
        except Exception as e:
            logger.error(f"❌ Error in apply_hairstyle: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return None
    
    async def _upload_file(self, image_bytes: bytes) -> Optional[str]:
        """
        Upload image file to PerfectCorp
        
        Returns:
            file_id if successful
        """
        try:
            async with aiohttp.ClientSession() as session:
                # Step 1: Request upload URL
                token = await self._get_access_token()
                if not token:
                    return None
                    
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "files": [
                        {
                            "file_name": "user_photo.jpg",
                            "content_type": "image/jpeg",
                            "file_size": len(image_bytes)
                        }
                    ]
                }
                
                logger.info(f"📤 Requesting upload URL from: {self.api_url}/file/hair-style")
                
                async with session.post(
                    f"{self.api_url}/file/hair-style",
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"❌ Failed to get upload URL: {response.status} - {error_text}")
                        return None
                    
                    data = await response.json()
                    logger.info(f"✅ Upload URL response: {data}")
                    
                    file_info = data.get("data", {}).get("files", [{}])[0]
                    file_id = file_info.get("file_id")
                    
                    # Extract upload URL and headers from 'requests' list
                    requests_list = file_info.get("requests", [])
                    upload_url = None
                    upload_headers = {}
                    
                    if requests_list:
                        upload_req = requests_list[0]
                        upload_url = upload_req.get("url")
                        upload_headers = upload_req.get("headers", {})
                    
                    if not upload_url or not file_id:
                        logger.error("❌ Missing upload URL or file_id in response")
                        return None
                
                # Step 2: Upload file to S3/storage URL
                logger.info(f"📤 Uploading file to: {upload_url}")
                
                async with session.put(
                    upload_url,
                    data=image_bytes,
                    headers=upload_headers,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as upload_response:
                    if upload_response.status not in [200, 201, 204]:
                        error_text = await upload_response.text()
                        logger.error(f"❌ Failed to upload file: {upload_response.status} - {error_text}")
                        return None
                    
                    logger.info(f"✅ File uploaded successfully")
                    return file_id
                    
        except Exception as e:
            logger.error(f"❌ Error uploading file: {str(e)}")
            return None
    
    async def _submit_hairstyle_task(self, file_id: str, template_id: str) -> Optional[str]:
        """
        Submit hairstyle generation task
        
        Returns:
            task_id if successful
        """
        try:
            async with aiohttp.ClientSession() as session:
                token = await self._get_access_token()
                if not token:
                    return None
                    
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "src_file_id": file_id,
                    "template_id": template_id
                }
                
                logger.info(f"🚀 Submitting hairstyle task: {self.api_url}/task/hair-style")
                logger.info(f"   Payload: {payload}")
                
                async with session.post(
                    f"{self.api_url}/task/hair-style",
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"❌ Failed to submit task: {response.status} - {error_text}")
                        return None
                    
                    data = await response.json()
                    logger.info(f"✅ Task submission response: {data}")
                    
                    task_id = data.get("data", {}).get("task_id")
                    if not task_id:
                        logger.error("❌ Missing task_id in response")
                        return None
                    
                    return task_id
                    
        except Exception as e:
            logger.error(f"❌ Error submitting task: {str(e)}")
            return None
    
    async def _poll_task_status(
        self,
        task_id: str,
        max_attempts: int = 60,
        poll_interval: float = 2.0
    ) -> Optional[str]:
        """
        Poll task status until completion
        
        Returns:
            Result image URL if successful
        """
        try:
            async with aiohttp.ClientSession() as session:
                token = await self._get_access_token()
                if not token:
                    return None
                    
                headers = {
                    "Authorization": f"Bearer {token}"
                }
                
                for attempt in range(max_attempts):
                    logger.info(f"🔄 Polling task status (attempt {attempt + 1}/{max_attempts})")
                    
                    async with session.get(
                        f"{self.api_url}/task/hair-style/{task_id}",
                        headers=headers,
                        timeout=aiohttp.ClientTimeout(total=30)
                    ) as response:
                        if response.status != 200:
                            error_text = await response.text()
                            logger.error(f"❌ Failed to check status: {response.status} - {error_text}")
                            return None
                        
                        data = await response.json()
                        task_data = data.get("data", {})
                        status = task_data.get("task_status")
                        
                        logger.info(f"   Status: {status}")
                        
                        if status == "success":
                            logger.info(f"✅ Task success data: {task_data}")
                            
                            # Extract result URL - check 'results' (plural) and 'result' (singular)
                            results = task_data.get("results") or task_data.get("result") or {}
                            result_url = results.get("result_url") or results.get("url")
                            
                            if not result_url:
                                logger.error("❌ Missing result_url in success response")
                                return None
                            
                            logger.info(f"✅ Task completed successfully")
                            return result_url
                        
                        elif status == "error":
                            error = task_data.get("error")
                            error_message = task_data.get("error_message")
                            logger.error(f"❌ Task failed with error: {error} - {error_message}")
                            return None
                        
                        elif status in ["running", "pending"]:
                            # Wait and retry
                            await asyncio.sleep(poll_interval)
                            continue
                        
                        else:
                            logger.error(f"❌ Unknown status: {status}")
                            return None
                
                logger.error("❌ Task polling timeout")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error polling task: {str(e)}")
            return None
    
    async def _download_result_image(self, url: str) -> Optional[bytes]:
        """Download result image from URL"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    if response.status == 200:
                        return await response.read()
                    else:
                        logger.error(f"❌ Failed to download result: HTTP {response.status}")
                        return None
        except Exception as e:
            logger.error(f"❌ Error downloading result: {str(e)}")
            return None
    
    async def list_templates(
        self,
        page_size: int = 20,
        starting_token: Optional[str] = None
    ) -> Dict:
        """
        List available hairstyle templates from API
        
        Args:
            page_size: Number of templates per page
            starting_token: Pagination token
            
        Returns:
            Dictionary with templates and next_token
        """
        if not self.api_enabled:
            logger.warning("⚠️ PerfectCorp API not enabled, returning static data")
            # Return static hairstyles as templates
            start_idx = 0
            if starting_token:
                try:
                    start_idx = int(starting_token)
                except:
                    start_idx = 0
            
            end_idx = start_idx + page_size
            page_data = self.hairstyles[start_idx:end_idx]
            
            # Transform to template format
            templates = [
                {
                    "id": h.get("id"),
                    "preview_url": h.get("preview_image_url"),
                    "name": h.get("style_name"),
                    "category": h.get("category")
                }
                for h in page_data
            ]
            
            return {
                "templates": templates,
                "next_token": str(end_idx) if end_idx < len(self.hairstyles) else None
            }
        
        try:
            async with aiohttp.ClientSession() as session:
                token = await self._get_access_token()
                if not token:
                    return {"templates": [], "next_token": None}
                    
                headers = {
                    "Authorization": f"Bearer {token}"
                }
                
                params = {
                    "page_size": page_size
                }
                if starting_token:
                    params["starting_token"] = starting_token
                
                async with session.get(
                    f"{self.api_url}/task/template/hair-style",
                    headers=headers,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("data", {})
                    else:
                        error_text = await response.text()
                        logger.error(f"❌ Failed to list templates: {response.status} - {error_text}")
                        return {"templates": [], "next_token": None}
                        
        except Exception as e:
            logger.error(f"❌ Error listing templates: {str(e)}")
            return {"templates": [], "next_token": None}
