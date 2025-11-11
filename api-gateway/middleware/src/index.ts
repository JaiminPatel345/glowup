import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { loggingMiddleware } from './middleware/logging';
import { errorHandler } from './middleware/errorHandler';
import { healthCheck } from './routes/health';
import { logger } from './config/logger';

// Resolve shared utilities location explicitly to avoid module resolution issues in dev containers.
const sharedBasePath = path.resolve(process.cwd(), '../shared');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceRegistry = require(path.join(sharedBasePath, 'discovery/serviceRegistry.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { circuitBreakerManager } = require(path.join(sharedBasePath, 'resilience/circuitBreaker.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const correlationLogger = require(path.join(sharedBasePath, 'logging/correlationLogger.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const redisCache = require(path.join(sharedBasePath, 'cache/redis.js'));

// Load environment variables
// In Docker: use .env.docker, locally: use .env.local
const envFile = process.env.NODE_ENV === 'production' ? '.env' : 
                process.env.DOCKER_ENV === 'true' ? '.env.docker' : '.env.local';
dotenv.config({ path: envFile });

// Initialize Redis connection
async function initializeRedis() {
  try {
    const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`;
    await redisCache.connect(redisUrl);
    logger.info('Redis cache connected successfully');
  } catch (error) {
    logger.warn('Failed to connect to Redis cache, continuing without cache:', error);
  }
}

const app = express();
const PORT = process.env.GATEWAY_MIDDLEWARE_PORT || 3005;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:19006'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Correlation ID middleware
app.use(correlationLogger.middleware());

// Logging middleware
app.use(loggingMiddleware);

// Rate limiting
app.use(rateLimitMiddleware);

// Health check
app.use('/health', healthCheck);

// Authentication middleware for protected routes
// Auth routes are public (login, register, etc.)
// All other routes require authentication
app.use('/api/users', authMiddleware);
app.use('/api/v1', authMiddleware);  // Skin analysis routes
app.use('/api/skin', authMiddleware);
app.use('/api/hair-tryOn', authMiddleware);
app.use('/api/hair', authMiddleware);

// Import resilient proxy
import { createResilientProxy, registerGateway, getCircuitBreakerStatus } from './middleware/resilientProxy';

// Helper function to build service URL from environment variables
const buildServiceUrl = (hostEnv: string, portEnv: string, defaultHost: string, defaultPort: string): string => {
  const host = process.env[hostEnv] || defaultHost;
  const port = process.env[portEnv] || defaultPort;
  return `http://${host}:${port}`;
};

// Resilient proxy configuration for microservices
const serviceProxies = [
  {
    path: '/api/auth',
    serviceName: 'auth-service',
    target: process.env.AUTH_SERVICE_URL || buildServiceUrl('AUTH_SERVICE_HOST', 'AUTH_SERVICE_PORT', 'auth-service', '3001'),
    changeOrigin: true,
    timeout: 60000,
    circuitBreakerOptions: {
      failureThreshold: 3,
      recoveryTimeout: 30000
    }
  },
  {
    path: '/api/users',
    serviceName: 'user-service',
    target: process.env.USER_SERVICE_URL || buildServiceUrl('USER_SERVICE_HOST', 'USER_SERVICE_PORT', 'user-service', '3002'),
    changeOrigin: true,
    timeout: 60000,
    circuitBreakerOptions: {
      failureThreshold: 3,
      recoveryTimeout: 30000
    }
  },
  {
    path: '/api/v1',
    serviceName: 'skin-analysis-service',
    target: process.env.SKIN_SERVICE_URL || buildServiceUrl('SKIN_SERVICE_HOST', 'SKIN_SERVICE_PORT', 'skin-analysis-service', '3003'),
    changeOrigin: true,
    timeout: 120000, // Extended timeout for AI processing
    circuitBreakerOptions: {
      failureThreshold: 5,
      recoveryTimeout: 60000
    },
    fallbackResponse: {
      message: 'Skin analysis service is temporarily unavailable. Please try again later.'
    }
  },
  {
    path: '/api/skin',
    serviceName: 'skin-analysis-service',
    target: process.env.SKIN_SERVICE_URL || buildServiceUrl('SKIN_SERVICE_HOST', 'SKIN_SERVICE_PORT', 'skin-analysis-service', '3003'),
    changeOrigin: true,
    timeout: 120000, // Extended timeout for AI processing
    circuitBreakerOptions: {
      failureThreshold: 5,
      recoveryTimeout: 60000
    },
    fallbackResponse: {
      message: 'Skin analysis service is temporarily unavailable. Please try again later.'
    }
  },
  {
    path: '/api/hair-tryOn',
    serviceName: 'hair-tryon-service',
    target: process.env.HAIR_SERVICE_URL || buildServiceUrl('HAIR_SERVICE_HOST', 'HAIR_SERVICE_PORT', 'hair-tryOn-service', '3004'),
    changeOrigin: true,
    timeout: 300000, // Extended timeout for video processing
    circuitBreakerOptions: {
      failureThreshold: 5,
      recoveryTimeout: 60000
    },
    fallbackResponse: {
      message: 'Hair try-on service is temporarily unavailable. Please try again later.'
    }
  },
  {
    path: '/api/hair',
    serviceName: 'hair-tryon-service',
    target: process.env.HAIR_SERVICE_URL || buildServiceUrl('HAIR_SERVICE_HOST', 'HAIR_SERVICE_PORT', 'hair-tryOn-service', '3004'),
    changeOrigin: true,
    timeout: 300000, // Extended timeout for video processing
    circuitBreakerOptions: {
      failureThreshold: 5,
      recoveryTimeout: 60000
    },
    fallbackResponse: {
      message: 'Hair try-on service is temporarily unavailable. Please try again later.'
    }
  }
];

// Create resilient proxy middleware for each service
serviceProxies.forEach(({ path, ...config }) => {
  app.use(path, createResilientProxy(config));
});

// WebSocket proxy for hair service (separate handling)
app.use('/ws/hair', createProxyMiddleware({
  target: process.env.HAIR_SERVICE_URL || buildServiceUrl('HAIR_SERVICE_HOST', 'HAIR_SERVICE_PORT', 'hair-tryOn-service', '3004'),
  changeOrigin: true,
  ws: true,
  onError: (err, req, res) => {
    logger.error('WebSocket proxy error:', { error: err.message, url: req.url });
  }
}));

// Circuit breaker status endpoint
app.get('/circuit-breakers', (req, res) => {
  const status = getCircuitBreakerStatus();
  res.json({
    success: true,
    data: status,
    timestamp: new Date().toISOString()
  });
});

// Default route
app.get('/', (req, res) => {
  res.json({
    service: 'GrowUp API Gateway Middleware',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
  logger.info(`API Gateway Middleware started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Note: Middleware is available but NGINX routes directly to services for better performance`);
  
  // Initialize Redis
  await initializeRedis();
  
  // Register with service registry
  await registerGateway();
});

export default app;