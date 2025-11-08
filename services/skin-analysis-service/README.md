# Skin Analysis Service

A FastAPI-based microservice for AI-powered skin analysis and product recommendations.

## Features

- **AI-Powered Skin Analysis**: Analyzes uploaded images to detect skin type and issues
- **Image Processing**: Validates, preprocesses, and optimizes images for analysis
- **Issue Highlighting**: Creates highlighted images showing detected problem areas
- **Product Recommendations**: Provides personalized product suggestions with ayurvedic/non-ayurvedic filtering
- **Caching System**: Implements intelligent caching for improved performance
- **Comprehensive Testing**: Unit, integration, and performance tests included

## Architecture

### Core Components

1. **AI Service** (`app/services/ai_service.py`)
   - Implements priority-based model selection (GitHub models → free APIs → custom models)
   - Performs skin type detection and issue identification
   - Creates highlighted images using segmentation techniques

2. **Image Service** (`app/services/image_service.py`)
   - Handles image upload validation and preprocessing
   - Implements quality scoring and optimization
   - Manages temporary file cleanup

3. **Product Service** (`app/services/product_service.py`)
   - Manages product recommendations with caching
   - Supports filtering by ayurvedic/non-ayurvedic categories
   - Provides search and trending product functionality

4. **Skin Analysis Service** (`app/services/skin_analysis_service.py`)
   - Orchestrates the complete analysis workflow
   - Manages database operations for analysis results
   - Handles user history and result retrieval

## API Endpoints

### Analysis Endpoints

- `POST /api/v1/analyze` - Analyze skin image
- `GET /api/v1/analysis/{analysis_id}` - Get analysis result by ID
- `GET /api/v1/user/{user_id}/history` - Get user analysis history

### Product Endpoints

- `GET /api/v1/recommendations/{issue_id}` - Get product recommendations
- `GET /api/v1/products/search` - Search products
- `GET /api/v1/products/trending` - Get trending products
- `GET /api/v1/products/{product_id}` - Get product details

### Utility Endpoints

- `GET /health/` - Basic health check
- `GET /health/detailed` - Detailed health check with database status
- `GET /api/v1/stats` - Service statistics

## Installation & Setup

### Prerequisites

- Python 3.11+
- MongoDB
- Docker (optional)

### Local Development

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:7
   
   # Or use existing MongoDB instance
   ```

4. **Run the Service**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

### Docker Deployment

1. **Build Image**
   ```bash
   docker build -t skin-analysis-service .
   ```

2. **Run Container**
   ```bash
   docker run -d -p 8000:8000 \
     -e MONGODB_URL=mongodb://host.docker.internal:27017 \
     -e DATABASE_NAME=growup \
     skin-analysis-service
   ```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URL` | MongoDB connection URL | `mongodb://localhost:27017` |
| `DATABASE_NAME` | Database name | `growup` |
| `MAX_FILE_SIZE` | Maximum upload file size (bytes) | `10485760` (10MB) |
| `UPLOAD_DIR` | Directory for temporary uploads | `/app/uploads` |
| `MODELS_DIR` | Directory for AI models | `/app/models` |
| `MAX_ANALYSIS_TIME` | Maximum analysis time (seconds) | `5` |

### Model Configuration

The service supports multiple AI model sources with automatic fallback:

1. **GitHub/HuggingFace Models** (Priority 1)
   - Uses free HuggingFace inference API
   - Fastest deployment, good accuracy

2. **Free API Services** (Priority 2)
   - Fallback to other free APIs
   - Moderate accuracy and speed

3. **Custom Models** (Priority 3)
   - Local model files in `MODELS_DIR`
   - Highest accuracy, requires model files

## Testing

### Run All Tests
```bash
python3 run_tests.py --all --verbose
```

### Run Specific Test Types
```bash
# Unit tests only
python3 run_tests.py --unit

# Integration tests only
python3 run_tests.py --integration

# Performance tests only
python3 run_tests.py --performance

# With coverage report
python3 run_tests.py --all --coverage
```

### Validate Service Structure
```bash
python3 validate_service.py
```

## Performance Requirements

The service is designed to meet strict performance requirements:

- **Analysis Time**: ≤ 5 seconds per image (as per requirement 8.2)
- **Image Processing**: ≤ 1 second for preprocessing
- **Database Operations**: ≤ 0.5 seconds for queries
- **Memory Usage**: Reasonable memory footprint with cleanup

## Database Schema

### Collections

1. **skin_analysis** - Analysis results
   ```javascript
   {
     userId: String,
     imageUrl: String,
     skinType: String,
     issues: [SkinIssue],
     analysisMetadata: AnalysisMetadata,
     createdAt: Date
   }
   ```

2. **products** - Product database
   ```javascript
   {
     id: String,
     name: String,
     brand: String,
     price: Number,
     rating: Number,
     isAyurvedic: Boolean,
     ingredients: [String],
     issueTypes: [String]
   }
   ```

3. **product_recommendations** - Cached recommendations
   ```javascript
   {
     issueId: String,
     products: [ProductInfo],
     lastUpdated: Date
   }
   ```

## API Usage Examples

### Analyze Skin Image

```bash
curl -X POST "http://localhost:8000/api/v1/analyze" \
  -H "Content-Type: multipart/form-data" \
  -F "image=@face_image.jpg" \
  -F "user_id=user123"
```

Response:
```json
{
  "skin_type": "combination",
  "issues": [
    {
      "id": "acne_hf_001",
      "name": "Acne",
      "description": "Active acne breakouts detected",
      "severity": "medium",
      "causes": ["Excess oil production", "Clogged pores"],
      "confidence": 0.87,
      "highlighted_image_url": "/uploads/highlighted_acne_image.jpg"
    }
  ],
  "analysis_id": "507f1f77bcf86cd799439011"
}
```

### Get Product Recommendations

```bash
curl "http://localhost:8000/api/v1/recommendations/acne_hf_001?category=ayurvedic"
```

Response:
```json
{
  "issue_id": "acne_hf_001",
  "all_products": [...],
  "ayurvedic_products": [
    {
      "id": "acne_001",
      "name": "Neem Face Wash",
      "brand": "Himalaya",
      "price": 150.0,
      "rating": 4.2,
      "is_ayurvedic": true,
      "ingredients": ["Neem", "Turmeric", "Aloe Vera"]
    }
  ],
  "non_ayurvedic_products": [...]
}
```

## Error Handling

The service implements comprehensive error handling:

- **400 Bad Request**: Invalid image format or corrupted data
- **413 Payload Too Large**: File size exceeds limit
- **415 Unsupported Media Type**: Invalid file type
- **422 Unprocessable Entity**: Validation errors
- **500 Internal Server Error**: Processing failures with detailed logging

## Monitoring & Logging

- Structured logging with correlation IDs
- Performance metrics tracking
- Health check endpoints for monitoring
- Service statistics endpoint

## Security Considerations

- File type validation and sanitization
- File size limits to prevent DoS
- Temporary file cleanup
- Input validation on all endpoints
- No sensitive data in logs

## Contributing

1. Follow the existing code structure
2. Add tests for new functionality
3. Ensure all tests pass
4. Update documentation as needed
5. Validate service structure with `validate_service.py`

## License

This service is part of the GrowUp mobile application project.