# Hugging Face Integration Setup

## Overview
The hair-tryOn service now supports using Hugging Face Inference API for hair style transfer instead of the local dummy model.

## Setup Steps

### 1. Get Hugging Face API Key

1. Go to [Hugging Face](https://huggingface.co/)
2. Sign up or log in
3. Go to Settings → Access Tokens
4. Create a new token with "Read" access
5. Copy your API key

### 2. Update Environment Variables

Edit `.env.local` and add your Hugging Face API key:

```bash
# Hugging Face Configuration
HUGGINGFACE_API_KEY=hf_your_actual_api_key_here
USE_HUGGINGFACE_API=true
```

### 3. Available Models

The service supports multiple models:

- **barbershop** (Default, Recommended) - HairCLIP-based model for hair transfer
  - Model: `ZllYang/barbershop`
  - Best quality results
  
- **styleganex** - StyleGANEX for hair editing
  - Model: `PKUWilliamYang/StyleGANEX`
  - Good for various editing tasks
  
- **hairfast** - HairFastGAN if available
  - Model: `AIRI-Institute/HairFastGAN`
  - Fast inference

To change the model, edit `hair_tryOn_v2.py`:

```python
hair_processing_service = HuggingFaceService(
    api_key=settings.huggingface_api_key,
    model_name="barbershop"  # Change to "styleganex" or "hairfast"
)
```

### 4. Restart the Service

After updating the .env file:

```bash
# If running in terminal, press Ctrl+C and restart
cd /home/jaimin/My/Dev/Projects/App/glowup/services/hair-tryOn-service
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 3004 --reload
```

Or simply save a Python file to trigger auto-reload if using `--reload` flag.

## How It Works

1. **Configuration Check**: On startup, the service checks if `USE_HUGGINGFACE_API=true` and `HUGGINGFACE_API_KEY` is set
2. **Service Selection**: 
   - If Hugging Face is enabled → Uses `HuggingFaceService`
   - Otherwise → Falls back to local `HairFastGANService` (dummy model)
3. **API Call**: When processing an image, it sends the source and style images to Hugging Face's Inference API
4. **Result**: Returns the processed image with the hairstyle transferred

## Benefits of Hugging Face API

✅ **No local model needed** - No need to download large model files  
✅ **Better quality** - Professional-grade hair transfer models  
✅ **Automatic updates** - Models are maintained by Hugging Face  
✅ **GPU acceleration** - Runs on Hugging Face's infrastructure  
✅ **Multiple models** - Easy to switch between different models  

## Limitations

⚠️ **API Rate Limits** - Free tier has limited requests per hour  
⚠️ **Cold Start** - First request may take 30-60 seconds (model loading)  
⚠️ **Internet Required** - Needs active internet connection  
⚠️ **Cost** - Heavy usage may require paid plan  

## Troubleshooting

### "Model is loading" error
- First request may take time as the model loads
- Wait 30-60 seconds and try again
- The model stays warm for a while after first use

### API Key Error
- Verify your API key is correct
- Check you have "Read" permissions
- Ensure no extra spaces in the .env file

### Service Not Using Hugging Face
- Check `USE_HUGGINGFACE_API=true` in .env
- Verify API key is set
- Check logs for initialization messages

## Testing

Test the health endpoint:
```bash
curl http://localhost:3004/api/hair/health
```

Should return:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "device": {
    "service": "huggingface",
    "model": "ZllYang/barbershop",
    "api_enabled": true
  }
}
```

## Logs to Look For

Successful initialization:
```
🤗 Using Hugging Face API for hair processing
🤗 Initialized Hugging Face service with model: ZllYang/barbershop
✅ Hugging Face service initialized successfully
```

Processing request:
```
🤗 Processing with Hugging Face model: ZllYang/barbershop
✅ Hugging Face processing completed
```
