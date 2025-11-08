import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { loggingMiddleware } from './middleware/logging';
import { errorHandler } from './middleware/errorHandler';
import { healthCheck } from './routes/health';
import { logger } from './config/logger';

// Import shared utilities
const serviceRegistry = require('../../../shared/discovery/serviceRegistry');
const { circuitBreakerManager } = require('../../../shared/resilience/circuitBreaker');
const correlationLogger = require('../../../shared/logging/correlationLogger');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.GATEWAY_MIDDLEWARE_PORT || 3001;

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
app.use('/api/users', authMiddleware);
app.use('/api/skin', authMiddleware);
app.use('/api/hair', authMiddleware);

// Import resilient proxy
import { createResilientProxy, registerGateway, getCircuitBreakerStatus } from './middleware/resilientProxy';

// Resilient proxy configuration for microservices
const serviceProxies = [
  {
    path: '/api/auth',
    serviceName: 'auth-service',
    target: process.env.AUTH_SERVICE_URL || 'http://auth-service:3000',
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
    target: process.env.USER_SERVICE_URL || 'http://user-service:3000',
    changeOrigin: true,
    timeout: 60000,
    circuitBreakerOptions: {
      failureThreshold: 3,
      recoveryTimeout: 30000
    }
  },
  {
    path: '/api/skin',
    serviceName: 'skin-analysis-service',
    target: process.env.SKIN_SERVICE_URL || 'http://skin-analysis-service:8000',
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
    path: '/api/hair',
    serviceName: 'hair-tryon-service',
    target: process.env.HAIR_SERVICE_URL || 'http://hair-tryon-service:8000',
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
  target: process.env.HAIR_SERVICE_URL || 'http://hair-tryon-service:8000',
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
  
  // Register with service registry
  await registerGateway();
});

export default app;