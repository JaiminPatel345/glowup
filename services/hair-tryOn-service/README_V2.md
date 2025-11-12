# Hair Try-On Service v2.0

AI-powered hair style try-on service with **local HairFastGAN inference** and **PerfectCorp API integration**.

## 🎯 Features

- ✅ **Local HairFastGAN Inference** - No external API dependencies for processing
- ✅ **GPU Auto-Detection** - Automatically uses CUDA, ROCm, MPS, or CPU
- ✅ **Default Hairstyles** - Fetch from PerfectCorp API with caching
- ✅ **Custom Hairstyle Upload** - Users can upload their own hairstyle images
- ✅ **Single Image Processing** - Fast, single-image inference (no video/real-time)
- ✅ **Cross-Platform** - Works on Linux, macOS, and Windows
- ✅ **One-Command Setup** - Universal setup script for all platforms

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- (Optional) NVIDIA GPU with CUDA for faster processing
- PerfectCorp API key

### Installation

#### Linux / macOS / Git Bash (Windows)

```bash
cd services/hair-tryOn-service
chmod +x setup-hairfastgan.sh
./setup-hairfastgan.sh
```

#### Windows PowerShell

```powershell
cd services\hair-tryOn-service
.\setup-hairfastgan.ps1
```

The setup script will:
1. ✅ Detect your OS and Python version
2. ✅ Detect GPU availability (CUDA/ROCm/MPS/CPU)
3. ✅ Create Python virtual environment
4. ✅ Install PyTorch with appropriate backend
5. ✅ Install all dependencies
6. ✅ Download HairFastGAN pretrained models
7. ✅ Configure environment variables
8. ✅ Test the installation
9. ✅ Optionally start the service

### Configuration

Create a `.env` file (or copy from `.env.example`):

```bash
# Database
MONGODB_URL=mongodb://localhost:27017
MONGODB_DATABASE=growup

# Service
DEBUG=false
SERVICE_VERSION=2.0.0

# File Upload
MAX_IMAGE_SIZE=10000000
UPLOAD_DIR=/app/uploads
TEMP_DIR=/app/temp

# AI Model
MODEL_PATH=/app/models
HAIR_MODEL_NAME=hair_fastgan_model.pth
USE_GPU=true
GPU_TYPE=cuda

# PerfectCorp API
PERFECTCORP_API_KEY=your_api_key_here
PERFECTCORP_API_URL=https://yce-api-01.perfectcorp.com/s2s/v2.0
HAIRSTYLE_CACHE_TTL=86400

# Performance
IMAGE_MAX_SIZE=1024
LOG_LEVEL=INFO
```

### Manual Start

```bash
# Activate virtual environment
source venv/bin/activate  # Linux/macOS
# or
.\venv\Scripts\Activate.ps1  # Windows

# Start service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## 📡 API Endpoints

### Get Default Hairstyles

```bash
GET /api/hair/hairstyles?page_size=20&force_refresh=false
```

**Response:**
```json
{
  "success": true,
  "count": 20,
  "hairstyles": [
    {
      "id": "13045969587275114",
      "preview_image_url": "https://...",
      "style_name": "Long Wavy Hair",
      "category": "long",
      "description": "Beautiful long wavy hairstyle",
      "tags": ["long", "wavy", "feminine"]
    }
  ]
}
```

### Get Hairstyle by ID

```bash
GET /api/hair/hairstyles/{hairstyle_id}
```

### Process Hair Try-On (Default Hairstyle)

```bash
POST /api/hair/process
Content-Type: multipart/form-data

user_photo: <file>
hairstyle_id: "13045969587275114"
user_id: "user123"
blend_ratio: 0.8
```

### Process Hair Try-On (Custom Hairstyle)

```bash
POST /api/hair/process
Content-Type: multipart/form-data

user_photo: <file>
hairstyle_image: <file>
user_id: "user123"
blend_ratio: 0.8
```

**Response:** JPEG image with hairstyle applied

### Get User History

```bash
GET /api/hair/history/{user_id}?limit=10&skip=0
```

### Delete Result

```bash
DELETE /api/hair/result/{result_id}?user_id=user123
```

### Health Check

```bash
GET /api/hair/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "hair-tryOn-service",
  "version": "2.0.0",
  "model_loaded": true,
  "device": {
    "device": "cuda:0",
    "cuda_available": true,
    "cuda_device_count": 1,
    "cuda_device_name": "NVIDIA GeForce RTX 3080"
  },
  "timestamp": "2025-01-10T12:00:00"
}
```

## 🔧 Usage Examples

### Python

```python
import requests

# Get default hairstyles
response = requests.get("http://localhost:3004/api/hair/hairstyles")
hairstyles = response.json()["hairstyles"]

# Process with default hairstyle
with open("user_photo.jpg", "rb") as f:
    files = {"user_photo": f}
    data = {
        "hairstyle_id": hairstyles[0]["id"],
        "user_id": "user123",
        "blend_ratio": 0.8
    }
    response = requests.post(
        "http://localhost:3004/api/hair/process",
        files=files,
        data=data
    )
    
    # Save result
    with open("result.jpg", "wb") as out:
        out.write(response.content)
```

### cURL

```bash
# Get hairstyles
curl http://localhost:3004/api/hair/hairstyles

# Process with custom hairstyle
curl -X POST http://localhost:3004/api/hair/process \
  -F "user_photo=@user_photo.jpg" \
  -F "hairstyle_image=@hairstyle.jpg" \
  -F "user_id=user123" \
  -F "blend_ratio=0.8" \
  --output result.jpg
```

## 🏗️ Architecture

```
services/hair-tryOn-service/
├── app/
│   ├── api/
│   │   └── routes/
│   │       └── hair_tryOn_v2.py      # API endpoints
│   ├── core/
│   │   ├── config.py                  # Configuration
│   │   └── database.py                # MongoDB connection
│   ├── services/
│   │   ├── hairfastgan_service.py     # Local HairFastGAN inference
│   │   ├── perfectcorp_service.py     # PerfectCorp API integration
│   │   └── database_service.py        # Database operations
│   └── main.py                        # FastAPI application
├── models/
│   └── hair_fastgan_model.pth         # HairFastGAN model
├── setup-hairfastgan.sh               # Bash setup script
├── setup-hairfastgan.ps1              # PowerShell setup script
├── requirements.txt                   # Python dependencies
├── .env.example                       # Environment template
└── README_V2.md                       # This file
```

## 🎨 How It Works

1. **Hairstyle Selection**
   - User selects from default hairstyles (PerfectCorp API)
   - OR uploads custom hairstyle image

2. **Image Upload**
   - User uploads their photo

3. **Local Processing**
   - HairFastGAN model runs locally (GPU/CPU)
   - No external API calls for inference
   - Fast, single-image processing

4. **Result**
   - Processed image returned immediately
   - Saved to database for history

## 🔒 Security

- API key stored securely in `.env`
- User authentication via `user_id`
- File size limits enforced
- Input validation on all endpoints

## 📊 Performance

- **GPU (CUDA)**: ~1-2 seconds per image
- **CPU**: ~5-10 seconds per image
- **Cache**: Hairstyles cached for 24 hours
- **Image Size**: Automatically resized to 1024px max

## 🐳 Docker Support

```bash
# Build image
docker build -t hair-tryOn-service .

# Run container
docker run -d \
  -p 8000:3004 \
  -e MONGODB_URL=mongodb://host.docker.internal:27017 \
  -e PERFECTCORP_API_KEY=your_key \
  -v ./models:/app/models \
  -v ./uploads:/app/uploads \
  --gpus all \
  hair-tryOn-service
```

## 🧪 Testing

```bash
# Run tests
pytest tests/ -v

# With coverage
pytest tests/ --cov=app --cov-report=html
```

## 🔍 Troubleshooting

### Model Not Found

```bash
# Download model manually
mkdir -p models
# Place hair_fastgan_model.pth in models/
```

### GPU Not Detected

```bash
# Check CUDA
nvidia-smi

# Check PyTorch CUDA
python -c "import torch; print(torch.cuda.is_available())"
```

### API Key Issues

```bash
# Verify API key in .env
cat .env | grep PERFECTCORP_API_KEY

# Test API manually
curl -H "Authorization: Bearer YOUR_KEY" \
  "https://yce-api-01.perfectcorp.com/s2s/v2.0/task/template/hair-style?page_size=1"
```

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `MONGODB_DATABASE` | Database name | `growup` |
| `MODEL_PATH` | Path to models directory | `/app/models` |
| `HAIR_MODEL_NAME` | Model filename | `hair_fastgan_model.pth` |
| `USE_GPU` | Enable GPU acceleration | `true` |
| `GPU_TYPE` | GPU type (cuda/rocm/mps/cpu) | `cuda` |
| `PERFECTCORP_API_KEY` | PerfectCorp API key | Required |
| `PERFECTCORP_API_URL` | PerfectCorp API base URL | `https://yce-api-01.perfectcorp.com/s2s/v2.0` |
| `HAIRSTYLE_CACHE_TTL` | Cache TTL in seconds | `86400` (24h) |
| `MAX_IMAGE_SIZE` | Max upload size in bytes | `10000000` (10MB) |
| `IMAGE_MAX_SIZE` | Max processing size in pixels | `1024` |

## 🆕 Changes from v1.0

- ❌ Removed Replicate API dependency
- ❌ Removed video processing
- ❌ Removed real-time WebSocket streaming
- ✅ Added local HairFastGAN inference
- ✅ Added PerfectCorp API integration
- ✅ Added universal setup script
- ✅ Added GPU auto-detection
- ✅ Simplified to single-image processing

## 📄 License

Part of the GrowUp application suite.

## 🤝 Support

For issues or questions:
- Check logs: `tail -f service.log`
- API docs: http://localhost:3004/docs
- Health check: http://localhost:3004/api/hair/health
