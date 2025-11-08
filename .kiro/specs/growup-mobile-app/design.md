# Design Document

## Overview

The GrowUp mobile application is designed as a microservices-based system that provides AI-powered beauty analysis through skin analysis and hair try-on features. The architecture follows a distributed approach with specialized services for different functionalities, ensuring scalability, maintainability, and performance optimization.

The system consists of a React Native mobile frontend communicating with multiple backend services through an API Gateway. The backend includes Node.js services for user management and business logic, FastAPI services for AI processing, and dual database systems (PostgreSQL for relational data, MongoDB for document storage).

## Architecture

### System Architecture Overview

```mermaid
graph TB
    subgraph "Mobile Client"
        RN[React Native App]
        Redux[Redux Store]
        API[API Layer]
    end
    
    subgraph "API Gateway"
        NGINX[NGINX Gateway]
        LB[Load Balancer]
    end
    
    subgraph "Microservices"
        AUTH[Auth Service<br/>Node.js + Better-Auth]
        USER[User Service<br/>Node.js + TS]
        SKIN[Skin Analysis Service<br/>FastAPI]
        HAIR[Hair Try-on Service<br/>FastAPI]
    end
    
    subgraph "Databases"
        PG[(PostgreSQL<br/>User Data)]
        MONGO[(MongoDB<br/>Analysis Data)]
    end
    
    subgraph "AI Models"
        SKIN_MODEL[Skin Analysis Model]
        HAIR_MODEL[HairFastGAN Model]
    end
    
    RN --> API
    API --> NGINX
    NGINX --> LB
    LB --> AUTH
    LB --> USER
    LB --> SKIN
    LB --> HAIR
    
    AUTH --> PG
    USER --> PG
    SKIN --> MONGO
    HAIR --> MONGO
    
    SKIN --> SKIN_MODEL
    HAIR --> HAIR_MODEL
```

### Service Communication Strategy

**Decision: REST + gRPC Hybrid Approach**

- **External Communication (Mobile ↔ Services)**: REST APIs with JSON
  - Rationale: Standard HTTP/JSON is mobile-friendly, well-supported, and easier to debug
  - WebSocket for real-time hair try-on streaming
  
- **Internal Communication (Service ↔ Service)**: gRPC
  - Rationale: Better performance, type safety, and efficient binary protocol for internal calls
  - Reduced latency for AI model inference coordination

### API Gateway Selection

**Decision: NGINX with custom Node.js middleware**

- **NGINX**: Primary reverse proxy and load balancer
  - High performance, battle-tested
  - SSL termination and static file serving
  - Rate limiting and basic security
  
- **Node.js Middleware**: Authentication and business logic
  - Better-Auth integration
  - Custom routing logic
  - Request/response transformation

## Components and Interfaces

### Mobile Application Architecture

```typescript
// Core API Client Interface
interface ApiClient {
  auth: AuthApi;
  skin: SkinAnalysisApi;
  hair: HairTryOnApi;
  user: UserApi;
}

// Skin Analysis API Interface
interface SkinAnalysisApi {
  analyzeImage(image: FormData): Promise<SkinAnalysisResult>;
  getProductRecommendations(issueId: string): Promise<ProductRecommendations>;
}

// Hair Try-On API Interface
interface HairTryOnApi {
  processVideo(video: FormData, styleImage: FormData, colorImage?: FormData): Promise<ProcessedVideo>;
  startRealTimeSession(styleImage: FormData): Promise<WebSocketConnection>;
}
```

### Mobile App Folder Structure

```
src/
├── api/                    # Centralized API layer
│   ├── client.ts          # Axios client configuration
│   ├── auth.ts            # Authentication API
│   ├── skin.ts            # Skin analysis API
│   ├── hair.ts            # Hair try-on API
│   └── types.ts           # API type definitions
├── components/            # Reusable UI components
│   ├── common/           # Generic components
│   ├── skin/             # Skin analysis components
│   └── hair/             # Hair try-on components
├── screens/              # Screen components
│   ├── auth/            # Authentication screens
│   ├── skin/            # Skin analysis screens
│   └── hair/            # Hair try-on screens
├── store/               # Redux store
│   ├── slices/          # Redux slices
│   └── middleware/      # Custom middleware
├── utils/               # Utility functions
├── constants/           # App constants
└── types/              # TypeScript type definitions
```

### Backend Services Architecture

#### Auth Service (Node.js + TypeScript)

```typescript
// Service Structure
auth-service/
├── src/
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth middleware
│   ├── models/         # Database models
│   ├── services/       # Business logic
│   ├── utils/          # Utilities
│   └── types/          # Type definitions
├── prisma/             # Database schema
└── docker/             # Docker configuration
```

#### AI Services (FastAPI)

```python
# Service Structure
skin-analysis-service/
├── app/
│   ├── api/            # API routes
│   ├── core/           # Configuration
│   ├── models/         # AI models
│   ├── services/       # Business logic
│   ├── schemas/        # Pydantic schemas
│   └── utils/          # Utilities
├── models/             # Pre-trained models
└── docker/             # Docker configuration
```

## Data Models

### PostgreSQL Schema (User Management)

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    profile_image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions (Better-Auth)
CREATE TABLE sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skin_type VARCHAR(50),
    hair_type VARCHAR(50),
    preferences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### MongoDB Schema (Analysis Data)

```typescript
// Skin Analysis Results
interface SkinAnalysisDocument {
  _id: ObjectId;
  userId: string;
  imageUrl: string;
  skinType: string;
  issues: Array<{
    id: string;
    name: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    causes: string[];
    highlightedImageUrl: string;
    confidence: number;
  }>;
  analysisMetadata: {
    modelVersion: string;
    processingTime: number;
    imageQuality: number;
  };
  createdAt: Date;
}

// Hair Try-On History
interface HairTryOnDocument {
  _id: ObjectId;
  userId: string;
  type: 'video' | 'realtime';
  originalMediaUrl: string;
  styleImageUrl: string;
  colorImageUrl?: string;
  resultMediaUrl: string;
  processingMetadata: {
    modelVersion: string;
    processingTime: number;
    framesProcessed: number;
  };
  createdAt: Date;
}

// Product Recommendations Cache
interface ProductRecommendationDocument {
  _id: ObjectId;
  issueId: string;
  products: Array<{
    id: string;
    name: string;
    brand: string;
    price: number;
    rating: number;
    imageUrl: string;
    isAyurvedic: boolean;
    ingredients: string[];
  }>;
  ayurvedicProducts: Array<ProductInfo>;
  lastUpdated: Date;
}
```

## AI Model Integration

### Skin Analysis Pipeline

```mermaid
sequenceDiagram
    participant Mobile
    participant API Gateway
    participant Skin Service
    participant AI Model
    participant MongoDB
    
    Mobile->>API Gateway: POST /api/skin/analyze
    API Gateway->>Skin Service: Forward request
    Skin Service->>AI Model: Process image
    AI Model-->>Skin Service: Analysis results
    Skin Service->>MongoDB: Store results
    Skin Service->>Skin Service: Generate highlighted image
    Skin Service-->>API Gateway: Return analysis
    API Gateway-->>Mobile: Skin analysis response
```

### Hair Try-On Pipeline

**Video Mode:**
```python
# Processing Pipeline
async def process_hair_video(video_file, style_image, color_image=None):
    # 1. Extract frames (50% sampling)
    frames = extract_frames(video_file, sample_rate=0.5)
    
    # 2. Process each frame with HairFastGAN
    processed_frames = []
    for frame in frames:
        result = await hair_model.apply_style(frame, style_image, color_image)
        processed_frames.append(result)
    
    # 3. Reconstruct video
    output_video = reconstruct_video(processed_frames, original_fps)
    return output_video
```

**Real-Time Mode:**
```python
# WebSocket handler for real-time processing
async def handle_realtime_hair_tryOn(websocket, style_image):
    while True:
        frame_data = await websocket.receive_bytes()
        frame = decode_frame(frame_data)
        
        # Fast inference (target <200ms)
        result_frame = await hair_model.apply_style_fast(frame, style_image)
        
        encoded_result = encode_frame(result_frame)
        await websocket.send_bytes(encoded_result)
```

## Error Handling

### Global Error Handling Strategy

```typescript
// Mobile App - Global Error Handler
class GlobalErrorHandler {
  static handle(error: ApiError, context: string) {
    // Log error
    Logger.error(`${context}: ${error.message}`, error);
    
    // Show user-friendly message
    switch (error.type) {
      case 'NETWORK_ERROR':
        Toast.show('Network connection issue. Please try again.');
        break;
      case 'AI_PROCESSING_ERROR':
        Toast.show('Processing failed. Please try with a different image.');
        break;
      case 'AUTH_ERROR':
        NavigationService.navigate('Login');
        break;
      default:
        Toast.show('Something went wrong. Please try again.');
    }
  }
}
```

### Service-Level Error Handling

```python
# FastAPI Error Handler
from fastapi import HTTPException
from fastapi.responses import JSONResponse

@app.exception_handler(AIProcessingError)
async def ai_processing_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "error": "AI_PROCESSING_ERROR",
            "message": "Failed to process image",
            "details": str(exc),
            "retry_possible": True
        }
    )
```

## Performance Optimization

### AI Model Optimization

1. **Model Selection Priority:**
   - GitHub pre-trained models (fastest deployment)
   - Free API services (Hugging Face, etc.)
   - Custom trained models (highest accuracy)

2. **Inference Optimization:**
   - Model quantization for mobile deployment
   - Batch processing for video frames
   - GPU acceleration where available
   - Result caching for common requests

3. **Image Processing:**
   - Client-side image compression before upload
   - Progressive image loading
   - Lazy loading for result galleries

### Database Optimization

```typescript
// MongoDB Indexing Strategy
db.skinAnalysis.createIndex({ "userId": 1, "createdAt": -1 });
db.hairTryOn.createIndex({ "userId": 1, "type": 1, "createdAt": -1 });
db.productRecommendations.createIndex({ "issueId": 1 });

// PostgreSQL Indexing
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

## Security Considerations

### Authentication & Authorization

```typescript
// JWT Token Structure
interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  permissions: string[];
  iat: number;
  exp: number;
}

// API Security Middleware
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Data Protection

1. **Image Security:**
   - Temporary storage for processing
   - Automatic cleanup after processing
   - Encrypted storage for user images
   - Signed URLs for image access

2. **API Security:**
   - Rate limiting per user/IP
   - Input validation and sanitization
   - CORS configuration
   - Request size limits

## Testing Strategy

### Mobile App Testing

```typescript
// Unit Testing with Jest
describe('SkinAnalysisApi', () => {
  it('should analyze image and return results', async () => {
    const mockImage = new FormData();
    const result = await skinApi.analyzeImage(mockImage);
    
    expect(result.skinType).toBeDefined();
    expect(result.issues).toBeInstanceOf(Array);
  });
});

// Integration Testing with Detox
describe('Skin Analysis Flow', () => {
  it('should complete full analysis workflow', async () => {
    await element(by.id('upload-button')).tap();
    await element(by.id('camera-capture')).tap();
    await waitFor(element(by.id('analysis-results'))).toBeVisible();
  });
});
```

### Backend Testing

```python
# FastAPI Testing
import pytest
from fastapi.testclient import TestClient

def test_skin_analysis_endpoint():
    with TestClient(app) as client:
        response = client.post(
            "/analyze",
            files={"image": ("test.jpg", image_data, "image/jpeg")}
        )
        assert response.status_code == 200
        assert "skinType" in response.json()
```

### AI Model Testing

```python
# Model Performance Testing
def test_skin_analysis_accuracy():
    test_images = load_test_dataset()
    results = []
    
    for image, expected in test_images:
        prediction = skin_model.analyze(image)
        accuracy = calculate_accuracy(prediction, expected)
        results.append(accuracy)
    
    assert np.mean(results) > 0.85  # 85% accuracy threshold
```

## Deployment and DevOps

### Docker Configuration

```yaml
# docker-compose.yml for development
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: growup
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  auth-service:
    build: ./services/auth-service
    ports:
      - "3001:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/growup
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  skin-service:
    build: ./services/skin-analysis-service
    ports:
      - "8001:8000"
    environment:
      - MONGODB_URL=mongodb://mongodb:27017/growup
    depends_on:
      - mongodb
    volumes:
      - ./models:/app/models

  hair-service:
    build: ./services/hair-tryOn-service
    ports:
      - "8002:8000"
    environment:
      - MONGODB_URL=mongodb://mongodb:27017/growup
    depends_on:
      - mongodb
    volumes:
      - ./models:/app/models

  api-gateway:
    build: ./api-gateway
    ports:
      - "80:80"
    depends_on:
      - auth-service
      - skin-service
      - hair-service

volumes:
  postgres_data:
  mongo_data:
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy GrowUp App
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          yarn test
          python -m pytest

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker images
        run: docker-compose build
      
      - name: Deploy to staging
        run: |
          docker-compose -f docker-compose.staging.yml up -d
```

This design provides a comprehensive architecture that addresses all the requirements while ensuring scalability, maintainability, and performance. The microservices approach allows for independent scaling and deployment of different components, while the dual database strategy optimizes for different data types and access patterns.