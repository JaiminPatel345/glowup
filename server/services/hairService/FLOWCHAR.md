# HairFastGAN Video Processing Pipeline

Complete documentation with visual Mermaid diagrams for the video processing pipeline with HairFastGAN and FPS enhancement.

---

## Table of Contents

1. [Complete Pipeline Overview](#complete-pipeline-overview)
2. [Step 1: Video Capture](#step-1-video-capture)
3. [Step 2: Preprocessing](#step-2-preprocessing)
4. [Step 3: HairGAN Processing](#step-3-hairgan-processing)
5. [Step 4: FPS Enhancement](#step-4-fps-enhancement)
6. [Data Flow & File Sizes](#data-flow--file-sizes)
7. [Decision Tree](#decision-tree)
8. [File Organization](#file-organization)
9. [Configuration Options](#configuration-options)
10. [Usage Patterns](#usage-patterns)

---

## Complete Pipeline Overview

```mermaid
graph LR
    A[📷 Webcam<br/>30fps] --> B[📹 Raw Video<br/>300 frames]
    B --> C[🔧 Preprocess<br/>5fps, 50 frames]
    C --> D[🎨 HairGAN<br/>Style Transfer]
    D --> E[⚡ FPS Enhance<br/>10fps, 100 frames]
    E --> F[🎬 Final Video<br/>30fps smooth]
    
    style A fill:#e1f5ff,stroke:#0288d1
    style B fill:#fff9c4,stroke:#f9a825
    style C fill:#f3e5f5,stroke:#7b1fa2
    style D fill:#fff3e0,stroke:#f57c00
    style E fill:#e8f5e9,stroke:#388e3c
    style F fill:#c8e6c9,stroke:#2e7d32
```

**Pipeline Summary:**
- **Input:** 10 seconds @ 30fps = 300 frames
- **After Preprocessing:** 50 frames @ 5fps (6x reduction)
- **After HairGAN:** 50 styled frames
- **After Enhancement:** 100 frames @ 10fps (2x interpolation)
- **Final Output:** Smooth 30fps video

---

## Step 1: Video Capture

```mermaid
graph TB
    Start([Start Capture]) --> Webcam[📷 Webcam Input]
    Webcam --> CaptureModule[camera_capture.py<br/>CameraCapture.capture_video]
    
    CaptureModule --> Settings{Configuration}
    Settings --> Duration[Max Duration: 10s]
    Settings --> Resolution[Resolution: 640x480]
    Settings --> FPS[Frame Rate: 30 FPS]
    Settings --> Format[Format: MP4]
    Settings --> Control[Manual Stop: Press 'q']
    
    Duration --> Process[Recording...]
    Resolution --> Process
    FPS --> Process
    Format --> Process
    Control --> Process
    
    Process --> Output[📹 captured_video.mp4<br/>~300 frames<br/>Size: 5-10 MB]
    Output --> Next([To Preprocessing])
    
    style Webcam fill:#e1f5ff,stroke:#0288d1
    style CaptureModule fill:#bbdefb,stroke:#1976d2
    style Output fill:#fff9c4,stroke:#f9a825
    style Settings fill:#e3f2fd,stroke:#42a5f5
```

**Key Features:**
- Real-time webcam capture
- Configurable duration (default: 10 seconds)
- Standard HD resolution
- Standard video FPS
- Manual stop capability

**Code Location:** `camera_capture.py`

**Main Function:** `CameraCapture.capture_video()`

---

## Step 2: Preprocessing

```mermaid
graph TB
    Input[📹 captured_video.mp4<br/>300 frames @ 30fps] --> Preprocessor[video_preprocessor.py<br/>VideoPreprocessor.extract_frames]
    
    Preprocessor --> FPSReduce{FPS Reduction<br/>6x}
    FPSReduce --> TargetFPS[Target: 5 FPS<br/>Extract every 6th frame]
    
    Preprocessor --> Resize{Resize Frames}
    Resize --> Width[Width: 512px<br/>Maintain aspect ratio]
    
    Preprocessor --> Quality{JPEG Compression}
    Quality --> JPEGQual[Quality: 95]
    
    TargetFPS --> Process[Frame Extraction<br/>& Processing]
    Width --> Process
    JPEGQual --> Process
    
    Process --> Frames[📂 preprocessed_frames/<br/>├─ frame_00000.jpg<br/>├─ frame_00001.jpg<br/>├─ ...<br/>└─ frame_00049.jpg]
    
    Frames --> Stats[~50 frames @ 5fps<br/>Size: 2-3 MB total]
    Stats --> Next([To HairGAN Processing])
    
    style Input fill:#fff9c4,stroke:#f9a825
    style Preprocessor fill:#f3e5f5,stroke:#7b1fa2
    style Frames fill:#fce4ec,stroke:#c2185b
    style Process fill:#f8bbd0,stroke:#880e4f
```

**Processing Steps:**
1. **FPS Reduction:** 30fps → 5fps (extract every 6th frame)
2. **Resize:** Scale to 512px width (maintain aspect ratio)
3. **Compression:** Save as JPEG with quality 95
4. **Output:** ~50 frames ready for processing

**Benefits:**
- Reduces processing time by 6x
- Maintains visual quality
- Reduces storage requirements
- Optimizes for HairGAN processing

**Code Location:** `video_preprocessor.py`

**Main Function:** `VideoPreprocessor.extract_frames()`

---

## Step 3: HairGAN Processing

```mermaid
graph TB
    Input[📂 preprocessed_frames/<br/>50 frames] --> Processor[hair_gan_processor.py<br/>HairGANProcessor.process_frames_batch]
    
    Processor --> Loop{For Each Frame}
    
    Loop --> Step1[1. Face Detection<br/>Locate facial landmarks]
    Step1 --> Step2[2. Hair Segmentation<br/>Isolate hair region]
    Step2 --> Step3[3. Style Transfer<br/>Apply HairFastGAN model]
    Step3 --> Step4[4. Blend Result<br/>Merge with original]
    
    Step4 --> Check{More Frames?}
    Check -->|Yes| Loop
    Check -->|No| Output
    
    Processor --> Options[Processing Options]
    Options --> Reference[Reference Style Image<br/>optional]
    Options --> Batch[Batch Processing]
    Options --> GPU[GPU Acceleration<br/>if available]
    
    Reference --> Output
    Batch --> Output
    GPU --> Output
    
    Output[📂 processed_frames/<br/>├─ frame_00000.jpg STYLED<br/>├─ frame_00001.jpg STYLED<br/>├─ ...<br/>└─ frame_00049.jpg STYLED]
    
    Output --> Stats[~50 styled frames<br/>Size: 3-4 MB total]
    Stats --> Next([To FPS Enhancement])
    
    style Input fill:#fce4ec,stroke:#c2185b
    style Processor fill:#fff3e0,stroke:#f57c00
    style Loop fill:#ffe0b2,stroke:#e64a19
    style Output fill:#fff8e1,stroke:#ffa000
```

**HairGAN Pipeline:**
1. **Face Detection:** Identify facial features and landmarks
2. **Hair Segmentation:** Isolate the hair region from the face
3. **Style Transfer:** Apply HairFastGAN model transformation
4. **Blending:** Seamlessly merge styled hair with original frame

**Features:**
- Batch processing for efficiency
- GPU acceleration support
- Optional reference style image
- Preserves facial features
- Natural blending

**Code Location:** `hair_gan_processor.py`

**Main Functions:** 
- `HairGANProcessor.load_model()`
- `HairGANProcessor.process_frame()`
- `HairGANProcessor.process_frames_batch()`

---

## Step 4: FPS Enhancement

```mermaid
graph TB
    Input[📂 processed_frames/<br/>50 frames @ 5fps] --> Enhancer[fps_enhancer.py<br/>FPSEnhancer.enhance_fps]
    
    Enhancer --> Config{Configuration}
    Config --> Multiplier[FPS Multiplier: 2x<br/>5fps → 10fps]
    Config --> Method{Interpolation Method}
    
    Method --> Optical[optical_flow<br/>Best Quality]
    Method --> Linear[linear<br/>Balanced]
    Method --> Duplicate[duplicate<br/>Fastest]
    
    Multiplier --> Process[Frame Interpolation]
    Optical --> Process
    Linear --> Process
    Duplicate --> Process
    
    Process --> Loop{For Each Frame Pair}
    Loop --> Flow[Calculate Optical Flow]
    Flow --> Generate[Generate Intermediate Frames]
    Generate --> Smooth[Apply Smoothing]
    Smooth --> Check{More Pairs?}
    Check -->|Yes| Loop
    Check -->|No| Enhanced
    
    Enhanced[📂 enhanced_frames/<br/>├─ enhanced_frame_00000.jpg<br/>├─ enhanced_frame_00001.jpg INTERPOLATED<br/>├─ enhanced_frame_00002.jpg<br/>├─ ...<br/>└─ enhanced_frame_00099.jpg]
    
    Enhanced --> Stats[~100 frames @ 10fps<br/>Size: 6-8 MB]
    Stats --> Compile[FPSEnhancer.create_smooth_video]
    
    Compile --> VideoConfig[Output FPS: 30<br/>Codec: MP4V]
    VideoConfig --> Final[🎬 final_output.mp4<br/>Smooth 30fps<br/>Size: 5-8 MB]
    
    Final --> Complete([Pipeline Complete!])
    
    style Input fill:#fff8e1,stroke:#ffa000
    style Enhancer fill:#e8f5e9,stroke:#388e3c
    style Process fill:#c8e6c9,stroke:#2e7d32
    style Enhanced fill:#dcedc8,stroke:#689f38
    style Final fill:#aed581,stroke:#558b2f
```

**Enhancement Process:**
1. **Frame Interpolation:** Generate intermediate frames between existing frames
2. **Optical Flow:** Calculate motion vectors for smooth transitions
3. **2x Multiplier:** Double the frame count (50 → 100 frames)
4. **Video Compilation:** Create final 30fps video

**Interpolation Methods:**
- **optical_flow:** Best quality, motion-aware interpolation
- **linear:** Balanced performance and quality
- **duplicate:** Fastest, simple frame duplication

**Code Location:** `fps_enhancer.py`

**Main Functions:**
- `FPSEnhancer.enhance_fps()`
- `FPSEnhancer.interpolate_frames_optical_flow()`
- `FPSEnhancer.create_smooth_video()`

---

## Data Flow & File Sizes

```mermaid
graph LR
    A[captured_video.mp4<br/>5-10 MB<br/>300 frames @ 640x480] -->|Compression| B[preprocessed_frames/<br/>2-3 MB<br/>50 frames @ 512x384]
    B -->|Processing| C[processed_frames/<br/>3-4 MB<br/>50 frames @ 512x384]
    C -->|Interpolation| D[enhanced_frames/<br/>6-8 MB<br/>100 frames @ 512x384]
    D -->|Compilation| E[final_output.mp4<br/>5-8 MB<br/>100 frames @ 30fps]
    
    style A fill:#ffcdd2,stroke:#c62828
    style B fill:#f8bbd0,stroke:#880e4f
    style C fill:#e1bee7,stroke:#6a1b9a
    style D fill:#c5cae9,stroke:#3949ab
    style E fill:#b2dfdb,stroke:#00695c
```

**Storage Requirements:**
- **Peak Usage:** ~25-35 MB (all intermediate files)
- **Final Output:** 5-8 MB
- **Cleanup Option:** Remove intermediate frames to save space

---

## Decision Tree

```mermaid
graph TD
    Start([Start]) --> Q1{Need to capture<br/>new video?}
    
    Q1 -->|Yes| Capture[Use camera_capture.py<br/>Capture from webcam]
    Q1 -->|No| Q2{Have existing<br/>video file?}
    
    Q2 -->|Yes| Preprocess[Use video_preprocessor.py<br/>Extract frames]
    Q2 -->|No| Error[Error: No input source]
    
    Capture --> Preprocess
    
    Preprocess --> Q3{Need HairGAN<br/>processing?}
    
    Q3 -->|Yes| HairGAN[Use hair_gan_processor.py<br/>Apply style transfer]
    Q3 -->|No| Q4
    
    HairGAN --> Q4{Need higher FPS?}
    
    Q4 -->|Yes| Enhance[Use fps_enhancer.py<br/>Interpolate frames]
    Q4 -->|No| Create[Create video from frames]
    
    Enhance --> Done([Complete])
    Create --> Done
    
    style Start fill:#e8f5e9,stroke:#388e3c
    style Capture fill:#e1f5ff,stroke:#0288d1
    style Preprocess fill:#f3e5f5,stroke:#7b1fa2
    style HairGAN fill:#fff3e0,stroke:#f57c00
    style Enhance fill:#e8f5e9,stroke:#388e3c
    style Done fill:#c8e6c9,stroke:#2e7d32
    style Error fill:#ffcdd2,stroke:#c62828
```

---

## File Organization

```mermaid
graph TB
    Root[hairService/]
    
    Root --> Main[📄 main.py<br/>Complete pipeline]
    Root --> Examples[📄 examples.py<br/>Interactive menu]
    Root --> Config[📄 config.py<br/>Configuration]
    
    Root --> Step1[📄 camera_capture.py<br/>Step 1: Capture]
    Root --> Step2[📄 video_preprocessor.py<br/>Step 2: Preprocess]
    Root --> Step3[📄 hair_gan_processor.py<br/>Step 3: HairGAN]
    Root --> Step4[📄 fps_enhancer.py<br/>Step 4: Enhance]
    
    Root --> Utils[📄 video_utils.py<br/>Utility functions]
    Root --> Quick[📄 quick_reference.py<br/>Code snippets]
    
    Root --> Docs1[📄 README_PIPELINE.md<br/>Documentation]
    Root --> Docs2[📄 SUMMARY.py<br/>Project summary]
    Root --> Docs3[📄 FLOWCHART.py<br/>This flowchart]
    
    Root --> Output[📁 output/]
    Output --> Out1[captured_video.mp4]
    Output --> Out2[📁 preprocessed_frames/]
    Output --> Out3[📁 processed_frames/]
    Output --> Out4[📁 enhanced_frames/]
    Output --> Out5[final_output.mp4]
    
    style Root fill:#e3f2fd,stroke:#1976d2
    style Main fill:#c8e6c9,stroke:#388e3c
    style Output fill:#fff9c4,stroke:#f9a825
```

---

## Configuration Options

### Performance Profiles

| Parameter | Fast | Default | High Quality |
|-----------|------|---------|--------------|
| **Capture Time** | 5s | 10s | 10s |
| **Preprocess FPS** | 3 | 5 | 10 |
| **Resize Width** | 256px | 512px | 1024px |
| **FPS Multiplier** | 2x | 2x | 3x |
| **Interpolation** | linear | optical_flow | optical_flow |
| **Output FPS** | 24 | 30 | 60 |
| **Processing Time** | ~15s | ~48s | ~120s |

### Timing Breakdown

```mermaid
gantt
    title Processing Time Breakdown (Default Settings)
    dateFormat X
    axisFormat %s
    
    section Pipeline
    Step 1 Capture (User Time)    :done, 0, 10
    Step 2 Preprocess              :active, 10, 13
    Step 3 HairGAN Processing      :active, 13, 38
    Step 4 FPS Enhancement         :active, 38, 48
```

**Estimated Times:**
- **Step 1:** 10s (user interaction)
- **Step 2:** ~3s (frame extraction)
- **Step 3:** ~25s (model dependent)
- **Step 4:** ~10s (interpolation)
- **Total:** ~48s

*Note: Times vary based on hardware, resolution, and settings*

---

## Usage Patterns

### Pattern 1: Complete Pipeline (Easiest)

```python
python main.py
```

Runs the entire pipeline with default settings.

### Pattern 2: Interactive Menu

```python
python examples.py
```

Provides an interactive menu to run different parts of the pipeline.

### Pattern 3: Custom Configuration

```python
from main import run_pipeline_custom

run_pipeline_custom(
    camera_max_duration=5,
    fps_multiplier=3,
    resize_width=1024
)
```

### Pattern 4: Step-by-Step Execution

```python
from camera_capture import capture_video_simple
from video_preprocessor import preprocess_video
from hair_gan_processor import process_video_frames
from fps_enhancer import enhance_video_fps

# Step 1: Capture
capture_video_simple(10, "video.mp4")

# Step 2: Preprocess
preprocess_video("video.mp4", "frames")

# Step 3: HairGAN
process_video_frames("frames", "processed")

# Step 4: Enhance
enhance_video_fps("processed", "enhanced", output_video="final.mp4")
```

### Pattern 5: Skip Capture (Use Existing Video)

```python
from video_preprocessor import preprocess_video
from hair_gan_processor import process_video_frames
from fps_enhancer import enhance_video_fps

preprocess_video("my_video.mp4", "frames")
process_video_frames("frames", "processed")
enhance_video_fps("processed", "enhanced", output_video="final.mp4")
```

---

## Integration Points

### HairFastGAN Integration

```python
# File: hair_gan_processor.py
class HairGANProcessor:
    def load_model(self):
        # TODO: Add HairFastGAN model loading code here
        pass
    
    def process_frame(self, frame):
        # TODO: Add HairFastGAN inference code here
        pass
```

### Custom Preprocessing

```python
# File: video_preprocessor.py
class VideoPreprocessor:
    def extract_frames(self):
        # Modify frame extraction logic here
        pass
```

### Custom Interpolation

```python
# File: fps_enhancer.py
class FPSEnhancer:
    def interpolate_frames_custom(self):
        # Add custom interpolation method here
        pass
```

---

## Quick Start Guide

### 1. Install Dependencies

```bash
pip install opencv-python numpy
```

### 2. Run Complete Pipeline

```bash
python main.py
```

### 3. Check Output

```bash
ls output/final_output.mp4
```

---

## Troubleshooting

### Common Issues

**Camera not detected:**
```python
# Check available cameras
import cv2
cap = cv2.VideoCapture(0)  # Try different indices: 0, 1, 2
```

**Out of memory:**
- Reduce `resize_width` in preprocessing
- Lower `fps_multiplier` in enhancement
- Process fewer frames at once

**Slow processing:**
- Use "Fast" configuration profile
- Reduce video duration
- Use `duplicate` interpolation method

---

## Performance Tips

1. **GPU Acceleration:** Install CUDA-enabled OpenCV for faster processing
2. **Batch Processing:** Process multiple videos in sequence
3. **Optimize Settings:** Balance quality vs speed based on your needs
4. **Clean Up:** Remove intermediate frames after processing

---

## License & Credits

This pipeline combines multiple technologies:
- OpenCV for video processing
- HairFastGAN for style transfer
- Optical flow for frame interpolation

---

**Last Updated:** October 2025  
**Version:** 1.0.0