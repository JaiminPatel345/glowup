const express = require('express');
const http = require('http');
const config = require('./config');
const { setupMiddleware } = require('./middleware');
const { createHealthRoutes, createApiRoutes } = require('./routes');
const ServiceManager = require('./services/ServiceManager');
const WebSocketHandler = require('./services/WebSocketHandler');
const SessionManager = require('./session-manager');
const GrpcClient = require('./grpc-client');
const { logger } = require('./utils/logger');

class GatewayServer {
  constructor(options = {}) {
    this.config = { ...config, ...options };
    
    // Initialize Express app and HTTP server
    this.app = express();
    this.server = http.createServer(this.app);
    
    // Initialize managers and services
    this.serviceManager = new ServiceManager();
    this.sessionManager = new SessionManager();
    this.websocketHandler = new WebSocketHandler(
      this.server, 
      this.sessionManager, 
      this.serviceManager
    );
    
    this.setupApplication();
    this.registerServices();
    this.setupGracefulShutdown();
  }

  setupApplication() {
    // Setup middleware
    setupMiddleware(this.app);
    
    // Setup routes
    this.app.use('/', createHealthRoutes(this.sessionManager));
    this.app.use('/api', createApiRoutes(this.sessionManager, this.serviceManager));
    
    // Setup WebSocket handler
    this.websocketHandler.initialize(this.config.websocket);
    
    logger.info('Application setup completed');
  }

  registerServices() {
    // Register video processing service
    this.serviceManager.registerService('videoProcessing', {
      host: this.config.grpc.host,
      port: this.config.grpc.port,
      clientPath: './grpc-client'
    });

    // Example: Register additional services here
    // this.serviceManager.registerService('audioProcessing', {
    //   host: 'localhost',
    //   port: 50052,
    //   clientPath: './audio-grpc-client'
    // });

    logger.info('Services registered');
  }

  async initializeServices() {
    try {
      // Initialize video processing service
      await this.serviceManager.initializeService('videoProcessing');
      
      // Initialize other services as needed
      
      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  setupGracefulShutdown() {
    const gracefulShutdown = async () => {
      logger.info('Starting graceful shutdown...');
      
      // Close WebSocket connections
      this.websocketHandler.close();
      
      // Stop all services
      await this.serviceManager.stopAllServices();
      
      // Close HTTP server
      this.server.close(() => {
        logger.info('Server shut down complete');
        process.exit(0);
      });
      
      // Force exit after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  }

  async start() {
    try {
      // Initialize services first
      await this.initializeServices();
      
      // Start HTTP server
      this.server.listen(this.config.server.port, this.config.server.host, () => {
        logger.info(`Gateway server running on ${this.config.server.host}:${this.config.server.port}`);
        logger.info(`Environment: ${this.config.server.env}`);
        logger.info(`WebSocket endpoint: ws://${this.config.server.host}:${this.config.server.port}`);
        logger.info(`Health check: http://${this.config.server.host}:${this.config.server.port}/health`);
        logger.info(`API endpoints: http://${this.config.server.host}:${this.config.server.port}/api`);
      });
      
      // Start health check monitoring
      this.startHealthCheckMonitoring();
      
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  startHealthCheckMonitoring() {
    // Check service health every 30 seconds
    setInterval(async () => {
      try {
        await this.serviceManager.healthCheckAllServices();
      } catch (error) {
        logger.error('Health check monitoring error:', error);
      }
    }, 30000);
  }

  // Helper methods for adding new services
  addService(name, config) {
    return this.serviceManager.registerService(name, config);
  }

  addMessageHandler(type, handler) {
    this.websocketHandler.registerMessageHandler(type, handler);
  }

  getService(name) {
    return this.serviceManager.getService(name);
  }

  getStats() {
    return {
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        connections: this.websocketHandler.getStats()
      },
      services: this.serviceManager.getAllServicesStatus(),
      sessions: {
        active: this.sessionManager.getActiveSessionsCount(),
        total: this.sessionManager.getAllSessions().length
      }
    };
  }
}

module.exports = GatewayServer;

// Start server if this file is run directly
if (require.main === module) {
  const server = new GatewayServer();
  server.start();
}
