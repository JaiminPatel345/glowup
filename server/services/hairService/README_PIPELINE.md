# Video Processing Pipeline with HairFastGAN

Complete video processing pipeline that captures video from webcam, processes it with HairFastGAN for hair style transfer, and enhances the output FPS using frame interpolation.

## 📁 Project Structure

```
hairService/
├── main.py                    # Main pipeline orchestrator
├── camera_capture.py          # Camera capture module
├── video_preprocessor.py      # Video preprocessing & frame extraction
├── hair_gan_processor.py      # HairFastGAN integration
├── fps_enhancer.py           # FPS enhancement with interpolation
├── config.py                 # Configuration settings
└── README_PIPELINE.md        # This file
```

## 🚀 Quick Start

### Run Complete Pipeline

Simply run the main script:

```python
python main.py
```

This will:
1. ✅ Open camera and record for 10 seconds (or until you press 'q')
2. ✅ Extract and compress frames at low FPS
3. ✅ Process frames with HairFastGAN (or fallback processor)
4. ✅ Enhance FPS using optical flow interpolation
5. ✅ Generate final high-FPS video

### Run Individual Modules

#### 1. Camera Capture Only

```python
from camera_capture import capture_video_simple

video_path = capture_video_simple(
    max_duration=10,
    output_path="my_video.mp4"
)
```

#### 2. Preprocess Existing Video

```python
from video_preprocessor import preprocess_video

info = preprocess_video(
    video_path="input.mp4",
    output_dir="frames",
    target_fps=5,
    resize_width=512
)
```

#### 3. Process Frames with HairGAN

```python
from hair_gan_processor import process_video_frames

process_video_frames(
    input_dir="frames",
    output_dir="processed_frames",
    reference_hair="reference_style.jpg"
)
```

#### 4. Enhance FPS

```python
from fps_enhancer import enhance_video_fps

results = enhance_video_fps(
    frames_dir="processed_frames",
    output_dir="enhanced_frames",
    multiplier=2,
    method='optical_flow',
    output_video="final.mp4",
    fps=30
)
```

## ⚙️ Configuration

Edit `config.py` to customize settings:

```python
from config import Config

# Camera settings
Config.CAMERA_MAX_DURATION = 10
Config.CAMERA_RESOLUTION = (640, 480)

# Preprocessing
Config.PREPROCESS_TARGET_FPS = 5
Config.PREPROCESS_RESIZE_WIDTH = 512

# FPS Enhancement
Config.FPS_MULTIPLIER = 2
Config.FPS_INTERPOLATION_METHOD = 'optical_flow'  # or 'linear', 'duplicate'
Config.OUTPUT_FPS = 30
```

### Pre-configured Options

```python
from config import FastProcessingConfig, HighQualityConfig
from main import run_pipeline

# Fast processing (lower quality)
run_pipeline(output_dir="output_fast", config_class=FastProcessingConfig)

# High quality (slower)
run_pipeline(output_dir="output_hq", config_class=HighQualityConfig)
```

## 🎯 Module Details

### 1. camera_capture.py

**Purpose:** Capture video from webcam with automatic 10-second limit

**Key Features:**
- Automatic timeout after max duration
- Manual stop with 'q' key
- Real-time recording timer display
- Configurable resolution and FPS

**Functions:**
```python
CameraCapture(max_duration, output_path)
capture_video_simple(max_duration, output_path)
```

### 2. video_preprocessor.py

**Purpose:** Extract and compress frames for efficient processing

**Key Features:**
- Extract frames at target FPS (reduces frame count)
- Resize frames to target dimensions
- JPEG compression for reduced size
- Maintains aspect ratio

**Functions:**
```python
VideoPreprocessor(target_fps, resize_width)
preprocess_video(video_path, output_dir, target_fps, resize_width)
```

### 3. hair_gan_processor.py

**Purpose:** Integrate with HairFastGAN for hair style transfer

**Key Features:**
- HairGANProcessor class for model integration
- SimpleHairProcessor as fallback
- Batch processing support
- Reference hair style transfer

**Functions:**
```python
HairGANProcessor(model_path, device)
SimpleHairProcessor.process_frames_directory(input_dir, output_dir)
process_video_frames(input_dir, output_dir, reference_hair)
```

**Note:** To use actual HairFastGAN:
1. Clone HairFastGAN repository: `git clone https://github.com/AIRI-Institute/HairFastGAN`
2. Install dependencies from their repo
3. Update `hair_gan_processor.py` with model loading code
4. Set `Config.HAIRGAN_MODEL_PATH` to your model checkpoint

### 4. fps_enhancer.py

**Purpose:** Increase video FPS using frame interpolation

**Key Features:**
- **Optical Flow**: High-quality interpolation using dense optical flow
- **Linear Blending**: Fast simple interpolation
- **Frame Duplication**: Fastest method, no interpolation
- Configurable FPS multiplier

**Functions:**
```python
FPSEnhancer(interpolation_method)
enhance_video_fps(frames_dir, output_dir, multiplier, method, output_video, fps)
```

**Methods:**
- `optical_flow`: Best quality, slower (recommended)
- `linear`: Good balance of speed and quality
- `duplicate`: Fastest, lowest quality

### 5. config.py

**Purpose:** Centralized configuration management

**Key Classes:**
- `Config`: Default configuration
- `FastProcessingConfig`: Optimized for speed
- `HighQualityConfig`: Optimized for quality

### 6. main.py

**Purpose:** Orchestrate complete pipeline

**Key Features:**
- Step-by-step execution with progress tracking
- Error handling and recovery
- Performance statistics
- Optional intermediate file cleanup

**Functions:**
```python
VideoPipeline(config).run(output_dir)
run_pipeline(output_dir, config_class)
run_pipeline_custom(**kwargs)
```

## 📊 Pipeline Flow

```
┌─────────────────┐
│  Camera Capture │  (10s max, 30fps, 640x480)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Preprocess     │  (Extract frames @ 5fps, resize to 512px)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  HairFastGAN    │  (Process each frame for hair transfer)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Enhance FPS    │  (Interpolate frames, 2x multiplier)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Final Video    │  (30fps smooth output)
└─────────────────┘
```

## 🔧 Customization Examples

### Example 1: Quick Test with 5-Second Capture

```python
from main import run_pipeline_custom

run_pipeline_custom(
    camera_max_duration=5,
    preprocess_target_fps=3,
    fps_multiplier=2
)
```

### Example 2: High-Quality 60fps Output

```python
from config import Config
from main import VideoPipeline

Config.PREPROCESS_TARGET_FPS = 10
Config.FPS_MULTIPLIER = 3
Config.OUTPUT_FPS = 60
Config.FPS_INTERPOLATION_METHOD = 'optical_flow'

pipeline = VideoPipeline(Config)
pipeline.run()
```

### Example 3: Process Existing Video (No Capture)

```python
from video_preprocessor import VideoPreprocessor
from hair_gan_processor import process_video_frames
from fps_enhancer import enhance_video_fps

# Preprocess
preprocessor = VideoPreprocessor(target_fps=5, resize_width=512)
info = preprocessor.extract_frames("existing_video.mp4", "frames")

# Process with HairGAN
process_video_frames("frames", "processed", reference_hair="style.jpg")

# Enhance FPS
enhance_video_fps("processed", "enhanced", multiplier=2, 
                  output_video="final.mp4", fps=30)
```

## 📋 Dependencies

```
opencv-python (cv2)
numpy
torch (for HairFastGAN)
PIL (Pillow)
```

## 🎛️ Key Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `CAMERA_MAX_DURATION` | 10 | Max recording time (seconds) |
| `PREPROCESS_TARGET_FPS` | 5 | FPS for processing (lower = faster) |
| `PREPROCESS_RESIZE_WIDTH` | 512 | Frame width for processing |
| `FPS_MULTIPLIER` | 2 | Output FPS multiplier |
| `FPS_INTERPOLATION_METHOD` | optical_flow | Interpolation method |
| `OUTPUT_FPS` | 30 | Final video FPS |

## 💡 Tips

1. **For faster processing**: Lower `PREPROCESS_TARGET_FPS` and `PREPROCESS_RESIZE_WIDTH`
2. **For better quality**: Use `optical_flow` interpolation and higher FPS settings
3. **Low memory**: Process frames in smaller batches
4. **GPU acceleration**: Ensure CUDA is available for HairFastGAN
5. **Storage**: Enable `CLEANUP_INTERMEDIATE` to save disk space

## 🔗 HairFastGAN Integration

This project is designed to work with [HairFastGAN](https://github.com/AIRI-Institute/HairFastGAN).

To integrate:
1. Clone their repository
2. Follow their installation instructions
3. Update `hair_gan_processor.py` with actual model loading
4. Set model path in `config.py`

## 📝 Output Files

```
output/
├── captured_video.mp4          # Original capture
├── preprocessed_frames/        # Low-FPS extracted frames
├── processed_frames/           # HairGAN processed frames
├── enhanced_frames/            # FPS-enhanced frames
└── final_output.mp4           # Final high-FPS video
```

## 🐛 Troubleshooting

**Camera not opening:**
- Check if camera is available: `ls /dev/video*`
- Try different camera index: `cv2.VideoCapture(1)`

**Low performance:**
- Reduce `PREPROCESS_TARGET_FPS`
- Lower `PREPROCESS_RESIZE_WIDTH`
- Use `linear` interpolation instead of `optical_flow`

**Out of memory:**
- Reduce batch size
- Lower resolution settings
- Enable frame cleanup

## 📄 License

Refer to HairFastGAN license for their model usage.

---

**Created for hair style transfer video processing pipeline**
