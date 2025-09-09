const express = require('express');
const config = require('../config');
const { logger } = require('../utils/logger');

const router = express.Router();

const createHealthRoutes = (sessionManager) => {
  // Health check endpoint
  router.get('/health', (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: Date.now(),
      uptime: process.uptime(),
      sessions: sessionManager.getActiveSessionsCount(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.server.env
    };
    
    res.json(health);
  });

  // Detailed status endpoint
  router.get('/status', (req, res) => {
    const status = {
      server: {
        host: config.server.host,
        port: config.server.port,
        uptime: process.uptime()
      },
      websocket: {
        endpoint: `ws://${config.server.host}:${config.server.port}`,
        activeSessions: sessionManager.getActiveSessionsCount(),
        maxConnections: config.websocket.maxConnections
      },
      grpc: {
        host: config.grpc.host,
        port: config.grpc.port
      },
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      }
    };
    
    res.json(status);
  });

  // WebSocket endpoint info
  router.get('/ws-info', (req, res) => {
    res.json({
      endpoint: `ws://${config.server.host}:${config.server.port}`,
      protocol: 'video-processing-v1',
      maxFrameSize: '10MB',
      supportedFormats: ['jpeg', 'png'],
      features: ['face-anonymization', 'real-time-processing']
    });
  });

  return router;
};

const createApiRoutes = (sessionManager, grpcClient) => {
  const apiRouter = express.Router();

  // Sessions endpoint
  apiRouter.get('/sessions', (req, res) => {
    res.json({
      activeSessions: sessionManager.getActiveSessionsCount(),
      sessions: sessionManager.getAllSessions().map(session => ({
        id: session.id,
        connectedAt: session.connectedAt,
        frameCount: session.frameCount,
        lastActivity: session.lastActivity
      }))
    });
  });

  // Force disconnect a session
  apiRouter.delete('/sessions/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const success = sessionManager.removeSession(sessionId);
    
    if (success) {
      res.json({ message: 'Session disconnected', sessionId });
    } else {
      res.status(404).json({ error: 'Session not found', sessionId });
    }
  });

  // gRPC service health check
  apiRouter.get('/grpc/health', async (req, res) => {
    try {
      const health = await grpcClient.healthCheck();
      res.json({ grpc: health });
    } catch (error) {
      res.status(503).json({ 
        error: 'gRPC service unavailable', 
        message: error.message 
      });
    }
  });

  return apiRouter;
};

module.exports = { createHealthRoutes, createApiRoutes };
