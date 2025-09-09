require('dotenv').config();

const config = {
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '8080'),
    env: process.env.NODE_ENV || 'development'
  },
  
  grpc: {
    host: process.env.GRPC_HOST || 'localhost',
    port: parseInt(process.env.GRPC_PORT || '50051')
  },
  
  websocket: {
    perMessageDeflate: false,
    maxConnections: parseInt(process.env.MAX_CONNECTIONS || '100')
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  
  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100')
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

module.exports = config;
