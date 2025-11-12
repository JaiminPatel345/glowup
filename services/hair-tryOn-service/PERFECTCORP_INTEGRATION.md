# PerfectCorp AI Hairstyle Generator Integration

## Overview

This service integrates PerfectCorp's AI Hairstyle Generator API for advanced hair try-on capabilities while maintaining backward compatibility with static hairstyle data and traditional processing methods (HairFastGAN/HuggingFace).

## Features

### 1. **Static Hairstyle Data (Default)**
- Local JSON file with pre-defined hairstyles
- Fast response times
- No API key required
- Used for listing default hairstyles

### 2. **PerfectCorp AI Hairstyle Generator (Optional)**
- Real-time AI-powered hairstyle generation
- High-quality, natural-looking results
- Requires PerfectCorp API key
- Uses V2 API endpoints

### 3. **Traditional Processing (Fallback)**
- HairFastGAN model
- HuggingFace API integration
- Works with custom hairstyle images

## Configuration

### Environment Variables

Add to `.env.local` or `.env`:

```bash
# PerfectCorp API Configuration
PERFECTCORP_API_KEY=your_api_key_here
PERFECTCORP_API_URL=https://yce-api-01.perfectcorp.com/s2s/v2.0
HAIRSTYLE_CACHE_TTL=86400
```

### Getting API Key

1. Go to https://yce.perfectcorp.com/api-console/en/api-keys/
2. Create a new API Key
3. Copy the API Key (this is your `PERFECTCORP_API_KEY`)
4. Store the Secret Key securely (needed for V1 API, but V2 uses API key directly)

## API Endpoints

### 1. List Static Hairstyles

**Endpoint:** `GET /api/hair/hairstyles`

Returns hairstyles from local static JSON file.

**Parameters:**
- `page_size` (int, optional): Number of results per page (default: 20)
- `starting_token` (string, optional): Pagination token
- `force_refresh` (bool, optional): Force reload static data
- `fetch_all` (bool, optional): Return all hairstyles at once

**Response:**
```json
{
  "success": true,
  "count": 150,
  "hairstyles": [
    {
      "id": "style_001",
      "preview_image_url": "https://...",
      "style_name": "Long Wavy",
      "category": "Female",
      "gender": "female"
    }
  ],
  "next_token": null
}
```

### 2. List API Templates

**Endpoint:** `GET /api/hair/templates`

Returns templates from PerfectCorp API (if enabled) or static data.

**Parameters:**
- `page_size` (int, optional): Number of results per page (default: 20)
- `starting_token` (string, optional): Pagination token

**Response:**
```json
{
  "success": true,
  "count": 20,
  "templates": [
    {
      "id": "template_123",
      "preview_url": "https://...",
      "name": "Curly Bob",
      "category": "Women"
    }
  ],
  "next_token": "next_page_token"
}
```

### 3. Process Hair Try-On

**Endpoint:** `POST /api/hair/process`

Apply hairstyle to user photo using different methods.

**Form Data Parameters:**
- `user_photo` (file, required): User's photo (JPG/PNG)
- `hairstyle_image` (file, optional): Custom hairstyle image
- `hairstyle_id` (string, optional): Template/style ID
- `user_id` (string, required): User identifier
- `use_ai` (bool, optional): Use PerfectCorp AI API (default: false)

**Processing Methods:**

#### Option 1: PerfectCorp AI (Recommended)
```bash
curl -X POST "http://localhost:3004/api/hair/process" \
  -F "user_photo=@user.jpg" \
  -F "hairstyle_id=template_123" \
  -F "user_id=user_456" \
  -F "use_ai=true"
```

#### Option 2: Traditional with Static Hairstyle
```bash
curl -X POST "http://localhost:3004/api/hair/process" \
  -F "user_photo=@user.jpg" \
  -F "hairstyle_id=style_001" \
  -F "user_id=user_456"
```

#### Option 3: Custom Hairstyle Image
```bash
curl -X POST "http://localhost:3004/api/hair/process" \
  -F "user_photo=@user.jpg" \
  -F "hairstyle_image=@custom_style.jpg" \
  -F "user_id=user_456"
```

**Response:**
Returns processed image as JPEG with headers:
- `X-Result-ID`: Unique result identifier
- `X-Processing-Time`: Processing duration

## Architecture

### Service Flow

```
┌─────────────────────────────────────────────────────┐
│                    Client Request                    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              FastAPI Route Handler                   │
│              (hair_tryOn_v2.py)                     │
└──────────────────────┬──────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           ▼                       ▼
┌──────────────────────┐  ┌──────────────────────┐
│  PerfectCorpService  │  │ HairProcessingService│
│  (perfectcorp_       │  │ (HairFastGAN/        │
│   service.py)        │  │  HuggingFace)        │
└──────────────────────┘  └──────────────────────┘
           │                       │
           ▼                       ▼
┌──────────────────────┐  ┌──────────────────────┐
│   Static JSON Data   │  │   AI Models/APIs     │
│   + PerfectCorp API  │  │                      │
└──────────────────────┘  └──────────────────────┘
```

### PerfectCorp Integration Flow

```
1. Upload User Photo
   ├─→ POST /file/hair-style
   └─→ Returns: file_id and upload_url
   
2. Upload File to Storage
   ├─→ PUT {upload_url}
   └─→ Upload image bytes
   
3. Submit Hairstyle Task
   ├─→ POST /task/hair-style
   └─→ Payload: {src_file_id, template_id}
   
4. Poll Task Status
   ├─→ GET /task/hair-style/{task_id}
   └─→ Check status: pending → running → success
   
5. Download Result
   ├─→ GET {result_url}
   └─→ Returns: Processed image
```

## Code Structure

```
services/hair-tryOn-service/
├── app/
│   ├── api/
│   │   └── routes/
│   │       └── hair_tryOn_v2.py      # API endpoints
│   ├── services/
│   │   ├── perfectcorp_service.py    # PerfectCorp integration
│   │   ├── huggingface_service.py    # HuggingFace fallback
│   │   └── hairfastgan_service.py    # Local model
│   └── data/
│       └── hairstyles.json           # Static hairstyle data
└── PERFECTCORP_INTEGRATION.md        # This file
```

## Error Handling

### PerfectCorp API Errors

The service handles various error scenarios:

1. **API Key Missing**
   - Falls back to static data for listings
   - Returns error for AI processing

2. **Upload Failed**
   - Logs detailed error
   - Returns 500 with message

3. **Task Failed**
   - Extracts error code and message
   - Provides user-friendly feedback

4. **Timeout**
   - Max 60 polling attempts (2-second intervals)
   - Returns timeout error after ~2 minutes

### Common Error Codes

From PerfectCorp API:
- `error_no_shoulder`: Shoulders not visible
- `error_large_face_angle`: Face angle too large
- `error_insufficient_landmarks`: Cannot detect face/body landmarks
- `error_hair_too_short`: Input hair too short
- `error_face_pose`: Face pose unsupported

## Image Requirements

For best results with PerfectCorp AI:

### User Photo
- **Format:** JPG, JPEG
- **Size:** < 10MB
- **Dimensions:** Long side ≤ 1024px
- **Face Width:** ≥ 128px
- **Face Pose:**
  - Pitch: -10° to +10°
  - Yaw: -45° to +45°
  - Roll: -15° to +15°
- **Requirements:**
  - Single face only
  - Full face visible
  - Shoulders visible

## Testing

### Test with Static Data
```bash
# List hairstyles
curl "http://localhost:3004/api/hair/hairstyles?fetch_all=true"

# Process with static hairstyle
curl -X POST "http://localhost:3004/api/hair/process" \
  -F "user_photo=@test_user.jpg" \
  -F "hairstyle_id=style_001" \
  -F "user_id=test_user"
```

### Test with PerfectCorp AI
```bash
# List API templates
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:3004/api/hair/templates"

# Process with AI
curl -X POST "http://localhost:3004/api/hair/process" \
  -F "user_photo=@test_user.jpg" \
  -F "hairstyle_id=template_123" \
  -F "user_id=test_user" \
  -F "use_ai=true"
```

## Performance Considerations

### Static Data Mode
- **Response Time:** < 100ms
- **Throughput:** High (local JSON)
- **Cost:** Free

### AI API Mode
- **Response Time:** 10-30 seconds
- **Throughput:** Limited by API quota
- **Cost:** Per API call (check PerfectCorp pricing)

### Traditional Processing
- **Response Time:** 20-60 seconds
- **Throughput:** Depends on GPU availability
- **Cost:** Compute resources

## Migration Guide

### From Static-Only to AI-Enabled

1. **Obtain API Key**
   ```bash
   # Visit: https://yce.perfectcorp.com/api-console/
   ```

2. **Update Environment**
   ```bash
   echo "PERFECTCORP_API_KEY=your_key" >> .env.local
   ```

3. **Restart Service**
   ```bash
   docker-compose restart hair-tryOn-service
   ```

4. **Update Client Code**
   ```javascript
   // Add use_ai parameter
   formData.append('use_ai', 'true');
   ```

## Troubleshooting

### API Key Not Working
```bash
# Check API key is set
echo $PERFECTCORP_API_KEY

# Test API connectivity
curl -H "Authorization: Bearer $PERFECTCORP_API_KEY" \
  "https://yce-api-01.perfectcorp.com/s2s/v2.0/task/template/hair-style?page_size=1"
```

### Static Data Not Loading
```bash
# Check file exists
ls -la services/hair-tryOn-service/app/data/hairstyles.json

# Check service logs
docker-compose logs hair-tryOn-service | grep "hairstyles"
```

### Processing Fails
1. Check image meets requirements
2. Verify API quota not exceeded
3. Check service logs for detailed errors

## Resources

- [PerfectCorp API Documentation](https://yce.perfectcorp.com/document/index.html)
- [API Console](https://yce.perfectcorp.com/api-console/)
- [Hair Style Showcase](https://yce.perfectcorp.com/ai-hairstyle-generator)

## Support

For issues or questions:
1. Check service logs: `docker-compose logs hair-tryOn-service`
2. Review this documentation
3. Contact PerfectCorp support for API-specific issues
