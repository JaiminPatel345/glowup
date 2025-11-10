# Quick Architecture Guide - GrowUp App

## TL;DR - How Requests Flow

### External Requests (from Mobile App)
```
Mobile App → API Gateway (Port 3000) → NGINX → Backend Service → Database
```

### Internal Requests (Service-to-Service)
```
Service A → Service B (Direct, no gateway)
Example: User Service → Auth Service (to validate token)
```

---

## Port Configuration

| Component | Port | Access |
|-----------|------|--------|
| **API Gateway** | 3000 | External (Mobile App) |
| **Auth Service** | 3001 | Internal only |
| **User Service** | 3002 | Internal only |
| **Skin Analysis** | 3003 | Internal only |
| **Hair Try-On** | 3004 | Internal only |
| **PostgreSQL** | 5432 | Internal only |
| **MongoDB** | 27017 | Internal only |
| **Redis** | 6379 | Internal only |

---

## How API Gateway Works

### 1. NGINX Layer (Port 80 inside container)
**What it does:**
- Receives all external requests
- Routes based on URL path
- Applies rate limiting
- Handles SSL/TLS
- Serves static files

**Routing Rules:**
```nginx
/api/auth/*        → auth-service:3001
/api/users/*       → user-service:3002
/api/v1/analyze    → skin-analysis-service:3003
/api/hair-tryOn/*  → hair-tryOn-service:3004
```

### 2. No Middleware Layer (Currently)
The middleware code exists but NGINX routes **directly** to backend services for better performance.

---

## Service Communication

### Question: Does service-to-service go through gateway?
**Answer: NO! Services communicate directly.**

**Example:**
```typescript
// User Service needs to validate a token
// It calls Auth Service DIRECTLY (not through gateway)

const AUTH_SERVICE_URL = 'http://auth-service:3001';

const response = await axios.get(
  `${AUTH_SERVICE_URL}/api/auth/validate`,
  { headers: { Authorization: req.headers.authorization } }
);
```

**Why Direct?**
1. **Faster** - No extra network hop
2. **Lower latency** - Internal Docker network is fast
3. **No rate limiting** - Internal calls aren't rate-limited
4. **Simpler** - Less complexity

---

## Docker Networking

All services run on the same Docker network: `growup-network`

**Service Discovery:**
Services can reach each other using service names:
- `auth-service:3001`
- `user-service:3002`
- `postgres:5432`
- `redis:6379`

Docker's internal DNS resolves these names to container IPs.

---

## Example Request Flows

### 1. User Login
```
1. Mobile App
   POST http://localhost:3000/api/auth/login
   Body: { email, password }

2. NGINX (Port 80)
   Routes to: auth-service:3001

3. Auth Service
   - Validates credentials in PostgreSQL
   - Generates JWT token
   - Stores session in Redis
   - Returns: { token, user }

4. Mobile App
   Receives token and stores it
```

### 2. Get User Profile (with Auth)
```
1. Mobile App
   GET http://localhost:3000/api/users/123
   Headers: { Authorization: "Bearer <token>" }

2. NGINX
   Routes to: user-service:3002

3. User Service
   - Calls Auth Service DIRECTLY:
     GET http://auth-service:3001/api/auth/validate
   - Auth Service validates token
   - User Service fetches profile from PostgreSQL
   - Returns profile data

4. Mobile App
   Displays user profile
```

### 3. Skin Analysis
```
1. Mobile App
   POST http://localhost:3000/api/v1/analyze
   Body: FormData with image

2. NGINX
   Routes to: skin-analysis-service:3003

3. Skin Analysis Service
   - Validates token with Auth Service (direct)
   - Processes image with AI model
   - Stores results in MongoDB
   - Returns analysis results

4. Mobile App
   Displays skin analysis
```

---

## Key Architectural Decisions

### 1. Single Entry Point
- All external traffic goes through port 3000
- Easy to secure and monitor
- Centralized rate limiting

### 2. Direct Service Communication
- Services call each other directly
- No gateway overhead for internal calls
- Faster and more efficient

### 3. Service Isolation
- Backend services not exposed externally
- Only accessible through gateway or internal network
- Better security

### 4. Shared Infrastructure
- All services use same PostgreSQL, MongoDB, Redis
- Reduces resource usage
- Simplifies deployment

---

## Environment Variables

### For API Gateway
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

### For Backend Services
```bash
# Each service sets its own port
PORT=3001  # Auth Service
PORT=3002  # User Service
PORT=3003  # Skin Analysis
PORT=3004  # Hair Try-On

# Services reference each other directly
AUTH_SERVICE_URL=http://auth-service:3001
```

---

## Testing the Setup

### Check all services are running:
```bash
# API Gateway
curl http://localhost:3000/health

# Auth Service (internal, won't work from host)
docker exec growup-auth-service curl http://localhost:3001/api/health

# User Service
docker exec growup-user-service curl http://localhost:3002/api/v1/health

# Skin Analysis
docker exec growup-skin-analysis curl http://localhost:3003/api/v1/health

# Hair Try-On
docker exec growup-hair-tryOn curl http://localhost:3004/api/hair-tryOn/health
```

### Test through API Gateway:
```bash
# These work from your host machine
curl http://localhost:3000/api/auth/health
curl http://localhost:3000/api/users/health
curl http://localhost:3000/api/v1/health
curl http://localhost:3000/api/hair-tryOn/health
```

---

## Common Questions

### Q: Why can't I access backend services directly from my browser?
**A:** Backend services (ports 3001-3004) are not exposed to the host machine. They're only accessible:
1. Through the API Gateway (port 3000)
2. From other containers on the same Docker network

### Q: How does NGINX know where to route requests?
**A:** NGINX configuration (`api-gateway/nginx.conf`) defines upstream servers and location blocks that map URL paths to backend services.

### Q: Do I need the middleware?
**A:** Currently, no. NGINX routes directly to backend services. The middleware can be added later for advanced features like circuit breakers, distributed tracing, etc.

### Q: How do services authenticate with each other?
**A:** Services pass the JWT token from the original request when calling other services. The Auth Service validates tokens for all services.

### Q: What happens if a service is down?
**A:** NGINX will return a 502 Bad Gateway error. In production, you'd add:
- Multiple instances of each service
- Health checks
- Circuit breakers
- Fallback responses

---

## Files to Check

1. **docker-compose.yml** - Service definitions and ports
2. **api-gateway/nginx.conf** - NGINX routing configuration
3. **.env.example** - Environment variables for local dev
4. **.env.docker** - Environment variables for Docker
5. **PORT_CONFIGURATION.md** - Complete port reference
6. **REQUEST_FLOW_ARCHITECTURE.md** - Detailed architecture
7. **ARCHITECTURE_DIAGRAMS.md** - Visual diagrams

---

## Summary

- **External Access**: Mobile App → API Gateway (3000) → NGINX → Backend Services
- **Internal Access**: Service A → Service B (direct, no gateway)
- **Port Mapping**: Docker maps 3000 (external) → 80 (nginx internal)
- **Service Discovery**: Docker DNS resolves service names (e.g., `auth-service:3001`)
- **Security**: Backend services isolated, only accessible through gateway or internal network
