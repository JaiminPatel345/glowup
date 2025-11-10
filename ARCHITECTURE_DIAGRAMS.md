# GrowUp Architecture - Visual Diagrams

## 1. High-Level Request Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MOBILE APP                                   │
│                    (React Native / Expo)                             │
│                                                                       │
│  API Client: http://localhost:3000/api                              │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS Request
                            │ (Port 3000)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY CONTAINER                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    NGINX (Port 80)                           │   │
│  │  ┌────────────────────────────────────────────────────┐     │   │
│  │  │  Reverse Proxy & Load Balancer                     │     │   │
│  │  │  - SSL/TLS Termination                             │     │   │
│  │  │  - Rate Limiting (10 req/s auth, 20 req/s API)    │     │   │
│  │  │  - Request Routing                                 │     │   │
│  │  │  - Static File Serving                             │     │   │
│  │  │  - WebSocket Support                               │     │   │
│  │  └────────────────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                            │                                         │
│                            │ Routes based on path                    │
│                            ▼                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              ROUTING LOGIC                                   │   │
│  │                                                              │   │
│  │  /api/auth/*        → auth-service:3001                     │   │
│  │  /api/users/*       → user-service:3002                     │   │
│  │  /api/v1/analyze    → skin-analysis-service:3003            │   │
│  │  /api/hair-tryOn/*  → hair-tryOn-service:3004               │   │
│  │  /ws/hair           → hair-tryOn-service:3004 (WebSocket)   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└───────────┬─────────────┬─────────────┬─────────────┬──────────────┘
            │             │             │             │
            │             │             │             │
            ▼             ▼             ▼             ▼
┌───────────────┐ ┌───────────────┐ ┌───────────┐ ┌───────────┐
│ Auth Service  │ │ User Service  │ │   Skin    │ │   Hair    │
│  Port 3001    │ │  Port 3002    │ │ Analysis  │ │  Try-On   │
│               │ │               │ │ Port 3003 │ │ Port 3004 │
│ Node.js +     │ │ Node.js +     │ │           │ │           │
│ TypeScript    │ │ TypeScript    │ │ FastAPI + │ │ FastAPI + │
│               │ │               │ │ Python    │ │ Python    │
└───────┬───────┘ └───────┬───────┘ └─────┬─────┘ └─────┬─────┘
        │                 │               │             │
        │                 │               │             │
        ▼                 ▼               ▼             ▼
┌───────────────┐ ┌───────────────┐ ┌─────────────────────────┐
│  PostgreSQL   │ │  PostgreSQL   │ │       MongoDB           │
│  Port 5432    │ │  Port 5432    │ │      Port 27017         │
│               │ │               │ │                         │
│ - Users       │ │ - Profiles    │ │ - Analysis Results      │
│ - Auth        │ │ - Preferences │ │ - Product Catalog       │
│ - Sessions    │ │               │ │ - Hair Try-On History   │
└───────────────┘ └───────────────┘ └─────────────────────────┘
        │                 │               │             │
        └─────────────────┴───────────────┴─────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │     Redis     │
                  │   Port 6379   │
                  │               │
                  │ - Caching     │
                  │ - Sessions    │
                  │ - Rate Limit  │
                  └───────────────┘
```

---

## 2. Detailed Request Flow: User Login

```
Step 1: Mobile App Initiates Login
┌─────────────────────────────────────────────────────────────┐
│ Mobile App                                                   │
│                                                              │
│ fetch('http://localhost:3000/api/auth/login', {            │
│   method: 'POST',                                           │
│   body: JSON.stringify({                                    │
│     email: 'user@example.com',                             │
│     password: 'SecurePass123!'                             │
│   })                                                        │
│ })                                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ POST /api/auth/login
                       │ Host: localhost:3000
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: NGINX Receives Request (Port 80)                    │
│                                                              │
│ 1. Check rate limit (10 req/s for /api/auth/*)             │
│ 2. Match location: /api/auth/*                             │
│ 3. Apply upstream: auth_service                            │
│ 4. Proxy to: http://auth-service:3001/api/auth/login      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Proxied Request
                       │ X-Real-IP: 172.20.0.5
                       │ X-Forwarded-For: 172.20.0.5
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Auth Service Processes (Port 3001)                  │
│                                                              │
│ router.post('/api/auth/login', async (req, res) => {       │
│   const { email, password } = req.body;                    │
│                                                              │
│   // Query PostgreSQL                                       │
│   const user = await db.query(                             │
│     'SELECT * FROM users WHERE email = $1',                │
│     [email]                                                 │
│   );                                                        │
│                                                              │
│   // Verify password                                        │
│   const valid = await bcrypt.compare(                      │
│     password,                                               │
│     user.password_hash                                      │
│   );                                                        │
│                                                              │
│   if (!valid) {                                            │
│     return res.status(401).json({                          │
│       error: 'Invalid credentials'                         │
│     });                                                     │
│   }                                                         │
│                                                              │
│   // Generate JWT                                           │
│   const token = jwt.sign(                                  │
│     { userId: user.id, email: user.email },               │
│     JWT_SECRET,                                             │
│     { expiresIn: '7d' }                                    │
│   );                                                        │
│                                                              │
│   // Store session in Redis                                │
│   await redis.setex(                                       │
│     `session:${token}`,                                    │
│     604800, // 7 days                                      │
│     JSON.stringify({ userId: user.id })                   │
│   );                                                        │
│                                                              │
│   // Return response                                        │
│   res.json({                                               │
│     success: true,                                         │
│     token,                                                  │
│     user: {                                                │
│       id: user.id,                                         │
│       email: user.email,                                   │
│       firstName: user.first_name,                          │
│       lastName: user.last_name                             │
│     }                                                       │
│   });                                                       │
│ });                                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Response
                       │ { success: true, token: "eyJ...", user: {...} }
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: NGINX Forwards Response                             │
│                                                              │
│ - Adds CORS headers                                         │
│ - Logs request (response time, status)                     │
│ - Returns to client                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP 200 OK
                       │ { success: true, token: "eyJ...", user: {...} }
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Mobile App Receives Response                        │
│                                                              │
│ .then(response => response.json())                          │
│ .then(data => {                                             │
│   // Store token                                            │
│   AsyncStorage.setItem('authToken', data.token);           │
│                                                              │
│   // Update app state                                       │
│   setUser(data.user);                                      │
│   setIsAuthenticated(true);                                │
│                                                              │
│   // Navigate to home                                       │
│   navigation.navigate('Home');                             │
│ })                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Service-to-Service Communication (Direct)

```
Example: User Service needs to validate token with Auth Service

┌─────────────────────────────────────────────────────────────┐
│ Mobile App                                                   │
│                                                              │
│ GET http://localhost:3000/api/users/123                    │
│ Authorization: Bearer eyJhbGc...                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ NGINX → User Service (Port 3002)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ User Service (Port 3002)                                     │
│                                                              │
│ router.get('/api/users/:id', async (req, res) => {         │
│   const token = req.headers.authorization?.split(' ')[1];  │
│                                                              │
│   // DIRECT CALL to Auth Service (NOT through gateway!)    │
│   const authResponse = await axios.get(                    │
│     'http://auth-service:3001/api/auth/validate',         │
│     { headers: { Authorization: `Bearer ${token}` } }      │
│   );                                                        │
│                                                              │
│   if (!authResponse.data.valid) {                          │
│     return res.status(401).json({                          │
│       error: 'Unauthorized'                                │
│     });                                                     │
│   }                                                         │
│                                                              │
│   // Fetch user data                                        │
│   const user = await db.query(                             │
│     'SELECT * FROM users WHERE id = $1',                   │
│     [req.params.id]                                         │
│   );                                                        │
│                                                              │
│   res.json({ success: true, user });                       │
│ });                                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Direct Internal Call
                       │ (Docker Network: growup-network)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Auth Service (Port 3001)                                     │
│                                                              │
│ router.get('/api/auth/validate', async (req, res) => {     │
│   const token = req.headers.authorization?.split(' ')[1];  │
│                                                              │
│   try {                                                     │
│     // Verify JWT                                           │
│     const decoded = jwt.verify(token, JWT_SECRET);         │
│                                                              │
│     // Check Redis session                                  │
│     const session = await redis.get(`session:${token}`);   │
│                                                              │
│     if (!session) {                                        │
│       return res.status(401).json({                        │
│         valid: false,                                      │
│         error: 'Session expired'                           │
│       });                                                   │
│     }                                                       │
│                                                              │
│     res.json({                                             │
│       valid: true,                                         │
│       userId: decoded.userId,                              │
│       email: decoded.email                                 │
│     });                                                     │
│   } catch (error) {                                        │
│     res.status(401).json({                                 │
│       valid: false,                                        │
│       error: 'Invalid token'                               │
│     });                                                     │
│   }                                                         │
│ });                                                         │
└─────────────────────────────────────────────────────────────┘

KEY POINTS:
1. User Service calls Auth Service DIRECTLY
2. Uses internal Docker network (growup-network)
3. Does NOT go through API Gateway
4. Faster and more efficient
5. No rate limiting on internal calls
```

---

## 4. Docker Network Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Host (Your Computer)                   │
│                                                                   │
│  Port Mapping: localhost:3000 → api-gateway:80                  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         Docker Network: growup-network (172.20.0.0/16)    │  │
│  │                                                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │ api-gateway  │  │ auth-service │  │ user-service │   │  │
│  │  │ 172.20.0.2   │  │ 172.20.0.3   │  │ 172.20.0.4   │   │  │
│  │  │ Port: 80     │  │ Port: 3001   │  │ Port: 3002   │   │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │  │
│  │         │                 │                 │            │  │
│  │         └─────────────────┴─────────────────┘            │  │
│  │                           │                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │ skin-service │  │ hair-service │  │  postgres    │   │  │
│  │  │ 172.20.0.5   │  │ 172.20.0.6   │  │ 172.20.0.7   │   │  │
│  │  │ Port: 3003   │  │ Port: 3004   │  │ Port: 5432   │   │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │  │
│  │         │                 │                 │            │  │
│  │         └─────────────────┴─────────────────┘            │  │
│  │                           │                               │  │
│  │  ┌──────────────┐  ┌──────────────┐                      │  │
│  │  │   mongodb    │  │    redis     │                      │  │
│  │  │ 172.20.0.8   │  │ 172.20.0.9   │                      │  │
│  │  │ Port: 27017  │  │ Port: 6379   │                      │  │
│  │  └──────────────┘  └──────────────┘                      │  │
│  │                                                            │  │
│  │  All services can reach each other by name:               │  │
│  │  - auth-service:3001                                      │  │
│  │  - user-service:3002                                      │  │
│  │  - postgres:5432                                          │  │
│  │  - redis:6379                                             │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. API Gateway Internal Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              API Gateway Container                               │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    NGINX (Port 80)                          │ │
│  │                                                             │ │
│  │  Configuration: /etc/nginx/nginx.conf                      │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │  Upstream Definitions                                 │ │ │
│  │  │                                                        │ │ │
│  │  │  upstream auth_service {                              │ │ │
│  │  │    server auth-service:3001;                          │ │ │
│  │  │  }                                                     │ │ │
│  │  │                                                        │ │ │
│  │  │  upstream user_service {                              │ │ │
│  │  │    server user-service:3002;                          │ │ │
│  │  │  }                                                     │ │ │
│  │  │                                                        │ │ │
│  │  │  upstream skin_service {                              │ │ │
│  │  │    server skin-analysis-service:3003;                 │ │ │
│  │  │  }                                                     │ │ │
│  │  │                                                        │ │ │
│  │  │  upstream hair_service {                              │ │ │
│  │  │    server hair-tryOn-service:3004;                    │ │ │
│  │  │  }                                                     │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │  Location Blocks (Routing Rules)                      │ │ │
│  │  │                                                        │ │ │
│  │  │  location /api/auth {                                 │ │ │
│  │  │    proxy_pass http://auth_service;                    │ │ │
│  │  │    limit_req zone=auth burst=10;                      │ │ │
│  │  │  }                                                     │ │ │
│  │  │                                                        │ │ │
│  │  │  location /api/users {                                │ │ │
│  │  │    proxy_pass http://user_service;                    │ │ │
│  │  │    limit_req zone=api burst=20;                       │ │ │
│  │  │  }                                                     │ │ │
│  │  │                                                        │ │ │
│  │  │  location /api/v1/analyze {                           │ │ │
│  │  │    proxy_pass http://skin_service;                    │ │ │
│  │  │    limit_req zone=upload burst=5;                     │ │ │
│  │  │    client_max_body_size 50m;                          │ │ │
│  │  │  }                                                     │ │ │
│  │  │                                                        │ │ │
│  │  │  location /api/hair-tryOn {                           │ │ │
│  │  │    proxy_pass http://hair_service;                    │ │ │
│  │  │    limit_req zone=upload burst=5;                     │ │ │
│  │  │    client_max_body_size 50m;                          │ │ │
│  │  │  }                                                     │ │ │
│  │  │                                                        │ │ │
│  │  │  location /ws/hair {                                  │ │ │
│  │  │    proxy_pass http://hair_service;                    │ │ │
│  │  │    proxy_http_version 1.1;                            │ │ │
│  │  │    proxy_set_header Upgrade $http_upgrade;            │ │ │
│  │  │    proxy_set_header Connection "upgrade";             │ │ │
│  │  │  }                                                     │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Logs: /var/log/nginx/                                           │
│  - access.log: All requests                                      │
│  - error.log: Errors and warnings                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Complete Data Flow: Skin Analysis

```
1. User takes photo in mobile app
   ↓
2. Mobile app uploads image
   POST http://localhost:3000/api/v1/analyze
   Content-Type: multipart/form-data
   Authorization: Bearer <token>
   Body: { image: <file>, user_id: "123" }
   ↓
3. NGINX (Port 80)
   - Checks rate limit (5 uploads/min)
   - Routes to skin-analysis-service:3003
   ↓
4. Skin Analysis Service (Port 3003)
   a. Validates token with Auth Service
      GET http://auth-service:3001/api/auth/validate
      (Direct internal call)
   ↓
   b. Auth Service validates and returns user info
   ↓
   c. Skin Analysis processes image
      - Load AI model
      - Detect face
      - Analyze skin type
      - Identify issues (acne, wrinkles, etc.)
      - Generate confidence scores
   ↓
   d. Store results in MongoDB
      {
        user_id: "123",
        analysis_id: "abc-def-ghi",
        skin_type: "combination",
        issues: [
          { name: "acne", severity: "medium", confidence: 0.87 }
        ],
        timestamp: "2024-01-15T10:30:00Z"
      }
   ↓
   e. Return response
      {
        success: true,
        skin_type: "combination",
        issues: [...],
        analysis_id: "abc-def-ghi"
      }
   ↓
5. NGINX forwards response to mobile app
   ↓
6. Mobile app displays results
   - Shows skin type
   - Highlights problem areas
   - Suggests products
```

This architecture provides:
- **Scalability**: Can add more instances of any service
- **Security**: Backend services not exposed externally
- **Performance**: Internal calls are fast, caching reduces load
- **Reliability**: Circuit breakers prevent cascade failures
- **Monitoring**: Centralized logging and health checks
