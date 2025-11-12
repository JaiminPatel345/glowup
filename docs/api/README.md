# GrowUp API Documentation

This directory contains comprehensive API documentation for all GrowUp microservices.

## Services Overview

The GrowUp platform consists of the following microservices:

### 1. Authentication Service
- **Port**: 3001 (development)
- **Technology**: Node.js + TypeScript + Better-Auth
- **Database**: PostgreSQL
- **Documentation**: [auth-service-openapi.yaml](./auth-service-openapi.yaml)

**Key Features:**
- User registration and login
- JWT token management
- Password reset functionality
- Profile management

### 2. User Service
- **Port**: 3002 (development)
- **Technology**: Node.js + TypeScript + Prisma
- **Database**: PostgreSQL
- **Documentation**: [user-service-openapi.yaml](./user-service-openapi.yaml)

**Key Features:**
- User profile management
- User preferences and settings
- Profile image upload
- Admin user management

### 3. Skin Analysis Service
- **Port**: 3003 (development)
- **Technology**: FastAPI + Python
- **Database**: MongoDB
- **Documentation**: [skin-analysis-service-openapi.yaml](./skin-analysis-service-openapi.yaml)

**Key Features:**
- AI-powered skin analysis
- Skin issue detection and highlighting
- Product recommendations (ayurvedic/non-ayurvedic)
- Analysis history tracking

### 4. Hair Try-On Service
- **Port**: 3004 (development)
- **Technology**: FastAPI + Python + WebSockets
- **Database**: MongoDB
- **Documentation**: [hair-tryon-service-openapi.yaml](./hair-tryon-service-openapi.yaml)

**Key Features:**
- Video-based hair try-on processing
- Real-time WebSocket hair try-on
- Hair style and color application
- Processing history management

## API Gateway

All external API requests are routed through an NGINX-based API Gateway that provides:

- **Load balancing** across service instances
- **SSL termination** and security headers
- **Rate limiting** and request throttling
- **Authentication middleware** for protected endpoints
- **Request/response logging** and monitoring

### Gateway Routing (Development)

```
http://localhost:3000/auth/*    → Authentication Service (localhost:3001)
http://localhost:3000/user/*    → User Service (localhost:3002)
http://localhost:3000/skin/*    → Skin Analysis Service (localhost:3003)
http://localhost:3000/hair/*    → Hair Try-On Service (localhost:3004)
```

## Authentication

Most API endpoints require authentication using JWT tokens:

1. **Login** via `/auth/login` to get access and refresh tokens
2. **Include** access token in `Authorization: Bearer <token>` header
3. **Refresh** tokens using `/auth/refresh` when they expire

### Token Lifecycle

- **Access Token**: 1 hour expiration, used for API requests
- **Refresh Token**: 30 days expiration, used to get new access tokens
- **Session Management**: Handled by Better-Auth with PostgreSQL storage

## Error Handling

All services follow a consistent error response format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": "Additional error details (optional)"
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Invalid input data
- `AUTHENTICATION_ERROR`: Invalid or missing authentication
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server-side error

## Rate Limiting

API endpoints have the following rate limits:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| Registration | 3 requests | 1 hour |
| Password Reset | 3 requests | 1 hour |
| General API | 100 requests | 15 minutes |
| File Upload | 10 requests | 1 minute |

## File Upload Guidelines

### Image Files (Profile, Style, Color)
- **Formats**: JPEG, PNG
- **Max Size**: 10MB
- **Recommended**: 1024x1024 pixels or smaller

### Video Files (Hair Try-On)
- **Formats**: MP4, MOV, AVI
- **Max Duration**: 10 seconds
- **Max Size**: 50MB
- **Recommended**: 720p or 1080p resolution

## WebSocket Connections

The Hair Try-On service provides real-time processing via WebSocket:

### Connection URL (Development)
```
ws://localhost:8002/api/hair/realtime/{session_id}?user_id={user_id}
```

### Message Flow
1. **Connect** with session_id and user_id
2. **Send** style image (binary data)
3. **Stream** video frames (binary data)
4. **Receive** processed frames (binary data)

### Connection Management
- **Automatic reconnection** on disconnect
- **Frame dropping** for latency management
- **Quality adjustment** based on connection speed
- **Target latency**: <200ms per frame

## Development Setup

### Local Development URLs

```bash
# Authentication Service
http://localhost:3001/api/auth

# User Service  
http://localhost:3002/api/v1

# Skin Analysis Service
http://localhost:3003/api/skin

# Hair Try-On Service
http://localhost:3004/api/hair
```

### API Documentation Viewers

You can view the interactive API documentation using:

1. **Swagger UI**: Available at each service's `/docs` endpoint
2. **Redoc**: Available at each service's `/redoc` endpoint
3. **OpenAPI Files**: YAML files in this directory

### Testing the APIs

```bash
# Health checks
curl http://localhost:3001/api/health
curl http://localhost:3002/api/v1/health  
curl http://localhost:3003/health
curl http://localhost:3004/api/hair/health

# Authentication flow
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

## Development Considerations

### Security
- JWT tokens use development secrets (change for production)
- File uploads have basic validation
- CORS is configured for localhost origins
- Rate limiting is relaxed for development

### Performance
- Database connection pooling enabled
- Redis caching for session management
- Local file storage for uploads
- Single instance per service
- AI models loaded on startup

### Monitoring
- Health check endpoints for all services
- Console logging for development
- Basic error handling and validation
- Development-friendly error messages

## Support

For API support and questions:
- **Documentation Issues**: Create an issue in the project repository
- **Integration Help**: Contact the development team
- **Bug Reports**: Use the issue tracker with API logs
- **Feature Requests**: Submit via the product roadmap process

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- All core functionality implemented
- Production-ready with full documentation
- WebSocket support for real-time features
- Comprehensive error handling and validation