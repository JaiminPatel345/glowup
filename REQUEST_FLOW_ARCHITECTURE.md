# GrowUp Application Request Flow & Architecture

## Architecture Overview

```
┌─────────────────┐
│  Mobile App     │
│  (Port 19006)   │
└────────┬────────┘
         │
         │ HTTP Request
         ▼
┌─────────────────────────────────────────────────────────┐
│              API Gateway (Port 3000)                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │         NGINX (Port 80 internal)                  │  │
│  │  - SSL/TLS Termination                           │  │
│  │  - Load Balancing                                │  │
│  │  - Rate Limiting                                 │  │
│  │  - Static File Serving                           │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │                                    │
│                     │ Proxy to Middleware                │
│                     ▼                                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │    Node.js Middleware (Port 3001 internal)        │  │
│  │  - Authentication & Authorization                 │  │
│  │  - Request Validation                             │  │
│  │  - Circuit Breaker Pattern                        │  │
│  │  - Service Discovery                              │  │
│  │  - Correlation ID Tracking                        │  │
│  │  - Caching (Redis)                                │  │
│  └──────────────────┬────────────────────────────────┘  │
└─────────────────────┼────────────────────────────────────┘
                      │
         ┌────────────┴────────────┬──────────────┬──────────────┐
         │                         │              │              │
         ▼                         ▼              ▼              ▼
┌─────────────────┐   ┌─────────────────┐   ┌──────────┐   ┌──────────┐
│  Auth Service   │   │  User Service   │   │   Skin   │   │   Hair   │
│   (Port 3001)   │   │   (Port 3002)   │   │ Analysis │   │  Try-On  │
│                 │   │                 │   │  (3003)  │   │  (3004)  │
│  - JWT Auth     │   │  - Profiles     │   │          │   │          │
│  - Sessions     │   │  - Preferences  │   │  - AI    │   │  - AI    │
│  - PostgreSQL   │   │  - PostgreSQL   │   │  - ML    │   │  - ML    │
└─────────────────┘   └─────────────────┘   │ - Mongo  │   │ - Mongo  │
                                             └──────────┘   └──────────┘
         │                         │              │              │
         └────────────┬────────────┴──────────────┴──────────────┘
                      │
         ┌────────────┴────────────┬──────────────┐
         ▼                         ▼              ▼
┌─────────────────┐   ┌─────────────────┐   ┌──────────┐
│   PostgreSQL    │   │     MongoDB     │   │  Redis   │
│   (Port 5432)   │   │   (Port 27017)  │   │  (6379)  │
└─────────────────┘   └─────────────────┘   └──────────┘
```

## Request Flow Explained

### 1. Mobile App → API Gateway (Port 3000)

**Example Request:**
```javascript
// Mobile app makes request
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'pass123' })
})
```

**What Happens:**
- Request hits the API Gateway on port 3000
- Docker maps external port 3000 → internal port 80 (nginx)

---

### 2. NGINX Layer (Port 80 Internal)

**File:** `api-gateway/nginx.conf`

**NGINX Configuration:**
```nginx
upstream auth_service {
    server auth-service:3001;
}

location /api/auth {
    proxy_pass http://auth_service;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

**What NGINX Does:**
1. **SSL/TLS Termination** - Handles HTTPS
2. **Rate Limiting** - Prevents abuse
3. **Load Balancing** - Distributes traffic (if multiple instances)
4. **Static Files** - Serves uploaded images/videos
5. **Request Routing** - Routes to backend services

**NGINX Routes Directly to Backend Services:**
```
/api/auth/*        → auth-service:3001
/api/users/*       → user-service:3002
/api/v1/analyze    → skin-analysis-service:3003
/api/hair-tryOn/*  → hair-tryOn-service:3004
```

---

### 3. Backend Service Processing

**Example: Auth Service (Port 3001)**

```typescript
// services/auth-service/src/routes/auth.ts
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // 1. Validate credentials against PostgreSQL
  const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  
  // 2. Generate JWT token
  const token = jwt.sign({ userId: user.id }, JWT_SECRET);
  
  // 3. Store session in Redis
  await redis.set(`session:${token}`, user.id, 'EX', 3600);
  
  // 4. Return response
  res.json({ success: true, token, user });
});
```

**Response Flow:**
```
Backend Service → NGINX → Mobile App
```

---

## Service-to-Service Communication

### Direct Communication (NOT through API Gateway)

Services communicate **directly** with each other using internal Docker network:

**Example 1: User Service calls Auth Service**
```typescript
// services/user-service/src/middleware/auth.ts
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 
  `http://${process.env.AUTH_SERVICE_HOST}:${process.env.AUTH_SERVICE_PORT}`;

// Direct call to auth-service:3001
const response = await axios.get(`${AUTH_SERVICE_URL}/validate`, {
  headers: { Authorization: req.headers.authorization }
});
```

**Why Direct?**
- **Faster** - No extra hop through gateway
- **Lower Latency** - Internal Docker network is fast
- **No Rate Limiting** - Internal calls aren't rate-limited
- **Service Mesh** - Services are on same network

**Docker Network:**
```yaml
networks:
  growup-network:
    driver: bridge
```

All services are on `growup-network`, so they can reach each other by service name:
- `auth-service:3001`
- `user-service:3002`
- `skin-analysis-service:3003`
- `hair-tryOn-service:3004`

---

## Complete Request Flow Examples

### Example 1: User Login

```
1. Mobile App
   POST http://localhost:3000/api/auth/login
   
2. NGINX (Port 80)
   Receives request, applies rate limiting
   Routes to: http://auth-service:3001/api/auth/login
   
3. Auth Service (Port 3001)
   - Validates credentials in PostgreSQL
   - Generates JWT token
   - Stores session in Redis
   - Returns: { token, user }
   
4. NGINX
   Forwards response back
   
5. Mobile App
   Receives: { token, user }
   Stores token for future requests
```

---

### Example 2: Get User Profile (with Auth)

```
1. Mobile App
   GET http://localhost:3000/api/users/123
   Headers: { Authorization: "Bearer <token>" }
   
2. NGINX (Port 80)
   Routes to: http://user-service:3002/api/users/123
   
3. User Service (Port 3002)
   - Extracts token from header
   - Calls Auth Service DIRECTLY:
     GET http://auth-service:3001/api/auth/validate
     (NOT through gateway!)
   
4. Auth Service (Port 3001)
   - Validates token
   - Returns user info
   
5. User Service (Port 3002)
   - Fetches user profile from PostgreSQL
   - Returns profile data
   
6. NGINX → Mobile App
   Returns: { user profile data }
```

---

### Example 3: Skin Analysis (AI Processing)

```
1. Mobile App
   POST http://localhost:3000/api/v1/analyze
   Body: FormData with image file
   Headers: { Authorization: "Bearer <token>" }
   
2. NGINX (Port 80)
   - Applies upload rate limiting
   - Routes to: http://skin-analysis-service:3003/api/v1/analyze
   
3. Skin Analysis Service (Port 3003)
   - Validates token with Auth Service (direct call)
   - Processes image with AI model
   - Stores results in MongoDB
   - Returns: { skin_type, issues, analysis_id }
   
4. NGINX → Mobile App
   Returns analysis results
```

---

## Port Configuration Summary

### External Ports (Accessible from Host)
- **3000** - API Gateway (mapped to nginx:80 inside container)

### Internal Ports (Docker Network Only)
- **3001** - Auth Service
- **3002** - User Service
- **3003** - Skin Analysis Service
- **3004** - Hair Try-On Service
- **5432** - PostgreSQL
- **27017** - MongoDB
- **6379** - Redis

### Port Mapping in Docker
```yaml
api-gateway:
  ports:
    - "3000:80"  # External:Internal
```

This means:
- External requests to `localhost:3000` → nginx on port 80 inside container
- NGINX then routes to backend services on their internal ports

---

## Why This Architecture?

### 1. **Single Entry Point**
- All external traffic goes through port 3000
- Easy to secure and monitor

### 2. **Service Isolation**
- Backend services not exposed externally
- Only accessible through gateway or internal network

### 3. **Scalability**
- Can add multiple instances of any service
- NGINX load balances automatically

### 4. **Security**
- NGINX handles SSL/TLS
- Rate limiting prevents abuse
- Services validate tokens internally

### 5. **Performance**
- Internal service calls are fast (direct)
- Redis caching reduces database load
- Circuit breakers prevent cascade failures

---

## API Gateway Components

### NGINX (Port 80 Internal)
**Purpose:** Reverse proxy, load balancer, SSL termination

**Responsibilities:**
- Route requests to backend services
- Handle SSL/TLS certificates
- Rate limiting and DDoS protection
- Serve static files (uploads)
- WebSocket support for real-time features

### Node.js Middleware (Port 3001 Internal) - OPTIONAL
**Note:** Currently, NGINX routes directly to services. The middleware can be added for:

**Additional Features:**
- Advanced authentication logic
- Request/response transformation
- Circuit breaker pattern
- Service discovery
- Distributed tracing
- API versioning

**If Middleware is Used:**
```
Mobile App → NGINX:80 → Middleware:3001 → Backend Services
```

**Current Setup (Direct):**
```
Mobile App → NGINX:80 → Backend Services
```

---

## Health Checks

Each service exposes a health endpoint:

```bash
# Check all services
curl http://localhost:3000/health              # API Gateway
curl http://localhost:3001/api/health          # Auth Service
curl http://localhost:3002/api/v1/health       # User Service
curl http://localhost:3003/api/v1/health       # Skin Analysis
curl http://localhost:3004/api/hair-tryOn/health # Hair Try-On
```

Docker Compose uses these for health checks:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

---

## Environment Variables

### API Gateway
```bash
AUTH_SERVICE_HOST=auth-service
AUTH_SERVICE_PORT=3001
USER_SERVICE_HOST=user-service
USER_SERVICE_PORT=3002
SKIN_SERVICE_HOST=skin-analysis-service
SKIN_SERVICE_PORT=3003
HAIR_SERVICE_HOST=hair-tryOn-service
HAIR_SERVICE_PORT=3004
```

### Backend Services
```bash
# Auth Service
PORT=3001
AUTH_SERVICE_URL=http://auth-service:3001

# User Service
PORT=3002
AUTH_SERVICE_URL=http://auth-service:3001

# Skin Analysis
PORT=3003
AUTH_SERVICE_URL=http://auth-service:3001

# Hair Try-On
PORT=3004
AUTH_SERVICE_URL=http://auth-service:3001
```

---

## Key Takeaways

1. **External Traffic**: Always goes through API Gateway (port 3000)
2. **Internal Traffic**: Services call each other directly (no gateway)
3. **NGINX**: Routes requests to appropriate backend services
4. **Port Mapping**: Docker maps 3000 (external) → 80 (nginx internal)
5. **Service Discovery**: Services use Docker service names (e.g., `auth-service:3001`)
6. **Security**: Backend services not exposed externally, only through gateway
