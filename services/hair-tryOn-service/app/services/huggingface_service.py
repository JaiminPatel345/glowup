"""Hugging Face integration that drives the hair try-on flow via Spaces."""

import asyncio
import base64
import logging
import tempfile
import os

import aiohttp
from PIL import Image
import io

logger = logging.getLogger(__name__)

try:
    from gradio_client import Client, handle_file
    from gradio_client.exceptions import AppError
    GRADIO_CLIENT_AVAILABLE = True
    logger.info("✅ gradio_client available")
except ImportError:
    GRADIO_CLIENT_AVAILABLE = False
    logger.warning("⚠️ gradio_client missing; run `pip install gradio-client`." )


class HuggingFaceHairService:
    """Wrapper around the HairFastGAN Space plus compatible fallbacks."""

    MODELS = {
        "hairfast": "AIRI-Institute/HairFastGAN",
        "barbershop": "ZllYang/barbershop",
        "styleganex": "PKUWilliamYang/StyleGANEX",
    }

    def __init__(self, api_key: str, model_name: str = "hairfast") -> None:
        self.api_key = api_key
        self.model_name = model_name
        self.model_id = self.MODELS.get(model_name, self.MODELS["hairfast"])
        self.api_url = f"https://{self.model_id.replace('/', '-')}.hf.space/api/predict"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        logger.info(
            "🤗 HuggingFaceHairService ready – primary model: %s", self.model_id
        )
    
    async def initialize(self):
        """Initialize and warm up the model"""
        try:
            logger.info("🔥 Checking Hugging Face Space availability")
            async with aiohttp.ClientSession() as session:
                health_url = f"https://{self.model_id.replace('/', '-')}.hf.space"
                async with session.get(
                    health_url,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as response:
                    logger.info("✅ Space reachable (status %s)", response.status)
        except Exception as e:
            logger.warning(f"⚠️  Could not verify Space accessibility: {e}")
            logger.info("Service will still attempt API calls")
    
    async def transfer_hairstyle(
        self,
        source_image: Image.Image,
        style_image: Image.Image,
        blend_ratio: float = 0.8
    ) -> Image.Image:
        """
        Transfer hairstyle using Hugging Face Gradio API
        
        Args:
            source_image: User's photo
            style_image: Hairstyle reference
            blend_ratio: Blend ratio (not used in API, kept for compatibility)
            
        Returns:
            Result image with transferred hairstyle
        """
        try:
            logger.info("🤗 Processing with model: %s", self.model_id)
            if "hairfast" in self.model_id.lower():
                result_image = await self._call_hairfast_gradio_api(source_image, style_image)
            else:
                # Fallback for other models
                result_image = await self._call_generic_api(source_image, style_image)

            logger.info("✅ Hugging Face processing completed")
            return result_image
            
        except Exception as e:
            logger.error(f"❌ Hugging Face API error: {e}")
            raise
    
    async def _call_hairfast_gradio_api(self, source_image: Image.Image, style_image: Image.Image) -> Image.Image:
        """Call HairFastGAN via Gradio Client - Priority 1"""
        logger.info("🚀 Using HairFastGAN Gradio Client (Priority 1)")

        if not GRADIO_CLIENT_AVAILABLE:
            raise RuntimeError("gradio_client missing – install via pip.")

        try:
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as source_file:
                source_image.save(source_file.name, format="PNG")
                source_path = source_file.name

            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as style_file:
                style_image.save(style_file.name, format="PNG")
                style_path = style_file.name

            try:
                logger.info("📡 Connecting to Gradio Space: %s", self.model_id)
                client = Client(self.model_id, hf_token=self.api_key)

                logger.info("🎨 Invoking /swap_hair endpoint")
                loop = asyncio.get_running_loop()
                result = await loop.run_in_executor(
                    None,
                    lambda: client.predict(
                        face=handle_file(source_path),
                        shape=handle_file(style_path),
                        color=handle_file(style_path),
                        blending="Article",
                        poisson_iters=0,
                        poisson_erosion=15,
                        api_name="/swap_hair",
                    ),
                )

                logger.info("✅ Gradio response type: %s", type(result))

                result_path = None
                if isinstance(result, (tuple, list)) and result:
                    result_path = result[0]
                elif isinstance(result, str):
                    result_path = result

                if not result_path:
                    raise RuntimeError(f"Unexpected response payload: {result}")

                result_image = Image.open(result_path)
                logger.info("✅ HairFastGAN processing successful")
                return result_image

            finally:
                for path in (source_path, style_path):
                    try:
                        os.unlink(path)
                    except FileNotFoundError:
                        pass

        except AppError as exc:
            # Bubble up a cleaner message when the upstream Space fails silently
            message = (
                "HairFastGAN Space returned an error without details. "
                "Please check https://huggingface.co/spaces/AIRI-Institute/HairFastGAN "
                "or duplicate the Space under your account (Client.duplicate) so you "
                "can inspect logs and ensure GPU resources are available."
            )
            logger.error(message)
            raise RuntimeError(message) from exc
        except Exception as exc:
            logger.exception("HairFastGAN call failed: %s", exc)
            raise

    async def _call_generic_api(
        self, source_image: Image.Image, style_image: Image.Image
    ) -> Image.Image:
        logger.warning("⚠️ Falling back to generic API pipeline")

        source_data_url = self._image_to_data_url(source_image)
        style_data_url = self._image_to_data_url(style_image)

        payload = {"data": [source_data_url, style_data_url]}

        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.api_url,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=120),
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise RuntimeError(
                        f"Generic API error {response.status}: {error_text}"
                    )

                result_data = await response.json()
                if "data" in result_data and result_data["data"]:
                    output = result_data["data"][0]
                    if isinstance(output, str) and output.startswith("data:image"):
                        img_b64 = output.split(",", 1)[1]
                        img_bytes = base64.b64decode(img_b64)
                        return Image.open(io.BytesIO(img_bytes))

                raise RuntimeError(f"Unexpected generic response: {result_data}")

    def _image_to_data_url(self, image: Image.Image) -> str:
        buffer = io.BytesIO()
        image = image.convert("RGB")
        max_size = 1024
        if max(image.size) > max_size:
            ratio = max_size / max(image.size)
            new_size = tuple(int(dim * ratio) for dim in image.size)
            image = image.resize(new_size, Image.LANCZOS)
        image.save(buffer, format="PNG")
        buffer.seek(0)
        return f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}"

    async def _call_hairfast_api(self, source_b64: str, style_b64: str) -> Image.Image:
        source_image = Image.open(io.BytesIO(base64.b64decode(source_b64)))
        style_image = Image.open(io.BytesIO(base64.b64decode(style_b64)))
        return await self._call_hairfast_gradio_api(source_image, style_image)

    def get_available_models(self) -> dict:
        return self.MODELS


class HuggingFaceService:
    """Main service wrapper for Hugging Face hair transfer"""
    
    def __init__(self, api_key: str, model_name: str = "hairfast"):
        self.hair_service = HuggingFaceHairService(api_key, model_name)
        self.initialized = False
    
    async def initialize(self):
        """Initialize the service"""
        try:
            await self.hair_service.initialize()
            self.initialized = True
            logger.info("✅ Hugging Face service initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Hugging Face service: {e}")
            raise
    
    async def process_image(
        self,
        source_image_data: bytes,
        style_image_data: bytes,
        blend_ratio: float = 0.8
    ) -> bytes:
        """
        Process hair try-on request using Hugging Face API
        
        Args:
            source_image_data: User's photo as bytes
            style_image_data: Hairstyle reference as bytes
            blend_ratio: Blending ratio
            
        Returns:
            Result image as bytes
        """
        if not self.initialized:
            raise RuntimeError("Service not initialized")
        
        try:
            # Load images
            source_image = Image.open(io.BytesIO(source_image_data))
            style_image = Image.open(io.BytesIO(style_image_data))
            
            # Process with Hugging Face
            result_image = await self.hair_service.transfer_hairstyle(
                source_image,
                style_image,
                blend_ratio
            )
            
            # Convert to bytes
            output_buffer = io.BytesIO()
            result_image.save(output_buffer, format='JPEG', quality=95)
            output_buffer.seek(0)
            
            return output_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"❌ Image processing failed: {e}")
            raise
    
    def get_device_info(self) -> dict:
        """Get service information"""
        return {
            "service": "huggingface",
            "model": self.hair_service.model_id,
            "api_enabled": True,
        }
