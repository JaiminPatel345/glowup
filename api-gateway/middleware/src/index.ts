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

// Proxy configuration for microservices
const serviceProxies = {
  '/api/auth': {
    target: process.env.AUTH_SERVICE_URL || 'http://auth-service:3000',
    changeOrigin: true,
    timeout: 60000,
  },
  '/api/users': {
    target: process.env.USER_SERVICE_URL || 'http://user-service:3000',
    changeOrigin: true,
    timeout: 60000,
  },
  '/api/skin': {
    target: process.env.SKIN_SERVICE_URL || 'http://skin-service:8000',
    changeOrigin: true,
    timeout: 120000, // Extended timeout for AI processing
  },
  '/api/hair': {
    target: process.env.HAIR_SERVICE_URL || 'http://hair-service:8000',
    changeOrigin: true,
    timeout: 300000, // Extended timeout for video processing
  },
  '/ws/hair': {
    target: process.env.HAIR_SERVICE_URL || 'http://hair-service:8000',
    changeOrigin: true,
    ws: true, // Enable WebSocket proxying
  }
};

// Create proxy middleware for each service
Object.entries(serviceProxies).forEach(([path, config]) => {
  app.use(path, createProxyMiddleware({
    ...config,
    onError: (err, req, res) => {
      logger.error('Proxy error:', { path, error: err.message, url: req.url });
      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          error: 'Service Unavailable',
          message: 'The requested service is temporarily unavailable'
        });
      }
    },
    onProxyReq: (proxyReq, req, res) => {
      logger.debug('Proxying request:', { 
        path, 
        method: req.method, 
        url: req.url,
        target: config.target 
      });
    },
    onProxyRes: (proxyRes, req, res) => {
      logger.debug('Proxy response:', { 
        path, 
        statusCode: proxyRes.statusCode,
        url: req.url 
      });
    }
  }));
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
app.listen(PORT, () => {
  logger.info(`API Gateway Middleware started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;