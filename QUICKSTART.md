# Hair Try-On Service - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Get Your API Key

1. Visit [PerfectCorp API](https://www.perfectcorp.com/business/api)
2. Sign up and get your API key
3. Keep it handy for Step 3

### Step 2: Run Setup Script

**Linux / macOS / Git Bash:**
```bash
cd services/hair-tryOn-service
./setup-hairfastgan.sh
```

**Windows PowerShell:**
```powershell
cd services\hair-tryOn-service
.\setup-hairfastgan.ps1
```

The script will:
- ✅ Check Python installation
- ✅ Detect your GPU (or use CPU)
- ✅ Install all dependencies
- ✅ Download models
- ✅ Configure environment
- ✅ Start the service

### Step 3: Add API Key

Edit `.env` file:
```bash
PERFECTCORP_API_KEY=your_actual_api_key_here
```

### Step 4: Test It

```bash
# Check health
curl http://localhost:8000/api/hair-tryOn/health

# Get hairstyles
curl http://localhost:8000/api/hair-tryOn/hairstyles

# Try it out
curl -X POST http://localhost:8000/api/hair-tryOn/process \
  -F "user_photo=@your_photo.jpg" \
  -F "hairstyle_id=13045969587275114" \
  -F "user_id=test_user" \
  --output result.jpg
```

### Step 5: Use Mobile App

```bash
cd mobile-app/GrowUpApp
yarn install
yarn start
```

## 📱 Mobile App Usage

1. **Upload Your Photo**
   - Take a photo or choose from gallery

2. **Select Hairstyle**
   - Choose from 20+ default styles
   - OR upload your own custom hairstyle

3. **Adjust Blend**
   - Set intensity from 50% to 100%

4. **Try It On**
   - Tap "Try On Hairstyle"
   - Wait 1-10 seconds
   - View result

5. **Save**
   - Save to gallery if you like it

## 🎯 What You Get

- ✅ Local AI processing (no external APIs for inference)
- ✅ GPU acceleration (if available)
- ✅ 20+ default hairstyles
- ✅ Custom hairstyle upload
- ✅ Fast processing (1-10 seconds)
- ✅ Clean mobile UI
- ✅ History tracking

## 🔧 Requirements

- Python 3.8+
- (Optional) NVIDIA GPU with CUDA
- PerfectCorp API key
- 2GB+ disk space for models

## 📊 Performance

| Device | Speed |
|--------|-------|
| GPU (CUDA) | 1-2 sec |
| Apple Silicon | 2-3 sec |
| CPU | 5-10 sec |

## 🆘 Need Help?

- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/hair-tryOn/health
- **Full Docs**: See `HAIR_TRYON_UPDATE.md`
- **Service Docs**: See `services/hair-tryOn-service/README_V2.md`

## 🎉 That's It!

You're ready to use the Hair Try-On service. Enjoy!
