# PerfectCorp AI Auto-Detection

## Summary

The hair try-on service now **automatically uses PerfectCorp AI** when appropriate, eliminating the need to manually set `use_ai=true`.

## Changes Made (November 12, 2025)

### 1. Auto-Detection Logic

The `/api/hair/process` endpoint now automatically detects whether to use PerfectCorp AI based on:

```python
should_use_ai = (
    perfectcorp_service.api_enabled and     # API key is configured
    hairstyle_id is not None and            # Using a template ID (not custom image)
    hairstyle_image is None                 # No custom image uploaded
)
```

### 2. Processing Behavior

| Scenario | Processing Method |
|----------|------------------|
| `hairstyle_id` provided + API key configured | ✅ **PerfectCorp AI** (automatic) |
| Custom `hairstyle_image` uploaded | 🔄 Traditional HairFastGAN |
| `use_ai=true` (explicit) | ✅ **PerfectCorp AI** (forced) |
| `use_ai=false` (explicit) | 🔄 Traditional HairFastGAN (forced) |
| No API key configured | 🔄 Traditional HairFastGAN (fallback) |

### 3. Updated Parameter

**Before:**
```python
use_ai: bool = Form(False, ...)  # Default was False
```

**After:**
```python
use_ai: Optional[bool] = Form(None, ...)  # Default is None (auto-detect)
```

## Usage Examples

### Automatic AI Usage (Recommended)
```bash
# Just provide hairstyle_id - AI is used automatically if API key is set
curl -X POST "http://localhost:8003/api/hair/process" \
  -F "user_photo=@user.jpg" \
  -F "hairstyle_id=male_modern_slick_back" \
  -F "user_id=user123"
```
**Result**: Uses PerfectCorp AI automatically ✅

### Custom Image (Traditional Processing)
```bash
# Upload custom hairstyle image - uses HairFastGAN
curl -X POST "http://localhost:8003/api/hair/process" \
  -F "user_photo=@user.jpg" \
  -F "hairstyle_image=@custom_style.jpg" \
  -F "user_id=user123"
```
**Result**: Uses HairFastGAN/HuggingFace 🔄

### Force Traditional Processing
```bash
# Explicitly disable AI even with hairstyle_id
curl -X POST "http://localhost:8003/api/hair/process" \
  -F "user_photo=@user.jpg" \
  -F "hairstyle_id=male_modern_slick_back" \
  -F "user_id=user123" \
  -F "use_ai=false"
```
**Result**: Downloads static image and uses HairFastGAN 🔄

## Benefits

1. **✅ No Configuration Needed**: Works automatically when API key is set
2. **✅ Better User Experience**: Uses AI by default for better results
3. **✅ Backward Compatible**: Still supports traditional processing
4. **✅ Flexible**: Can force either method if needed
5. **✅ Graceful Fallback**: Falls back to traditional if API fails

## Log Messages

You'll see these log messages indicating which method is being used:

### PerfectCorp AI
```
🔍 Auto-detected use_ai: True (API enabled: True, has hairstyle_id: True, no custom image: True)
   - Final decision - Use AI: True
🤖 Using PerfectCorp AI Hairstyle Generator
✅ PerfectCorp AI processing completed successfully
```

### Traditional Processing
```
🔍 Auto-detected use_ai: False (API enabled: True, has hairstyle_id: False, no custom image: False)
   - Final decision - Use AI: False
🎨 Using traditional hair processing (HairFastGAN/HuggingFace)
```

## Migration Guide

### If You Were Using `use_ai=true` Explicitly

**Before:**
```bash
curl ... -F "use_ai=true"
```

**After (Recommended):**
```bash
# Just remove use_ai parameter - it's automatic now!
curl ...
```

**After (Still Works):**
```bash
# You can still use use_ai=true if you want
curl ... -F "use_ai=true"
```

### If You Were Using Traditional Processing

**No changes needed** - traditional processing still works:
- Upload custom `hairstyle_image` → automatic traditional processing
- Set `use_ai=false` → forced traditional processing

## Error Handling

### API Key Not Configured
```json
{
  "detail": "PerfectCorp AI is not configured. Please set PERFECTCORP_API_KEY in environment variables."
}
```
**Status Code**: 503 Service Unavailable

### Missing hairstyle_id with use_ai=true
```json
{
  "detail": "hairstyle_id is required when using PerfectCorp AI (use_ai=true)"
}
```
**Status Code**: 400 Bad Request

## Testing

Test the auto-detection with your current request:

```bash
# Your previous request that was using HuggingFace
curl -X POST "http://localhost:8003/api/hair/process" \
  -F "user_photo=@/path/to/user.jpg" \
  -F "hairstyle_id=male_modern_slick_back" \
  -F "user_id=test_user_123"

# Now it will automatically use PerfectCorp AI! ✅
```

## Notes

- **Static data unchanged**: The `/api/hair/hairstyles` endpoint still returns static data
- **AI templates available**: Use `/api/hair/templates` for AI-specific templates
- **Performance**: PerfectCorp AI typically processes faster than HairFastGAN
- **Quality**: AI generally produces better results with more realistic hair blending
