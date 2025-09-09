const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const GrpcClient = require('./grpc-client');
const SessionManager = require('./session-manager');
const { logger } = require('./utils/logger');
const { validateFrame } = require('./utils/validation');

class GatewayServer {
  constructor(options = {}) {
    this.host = options.host || process.env.HOST || '0.0.0.0';
    this.port = options.port || process.env.PORT || 8080;
    this.grpcPort = options.grpcPort || process.env.GRPC_PORT || 50051;
    this.grpcHost = options.grpcHost || process.env.GRPC_HOST || 'localhost';
    
    // Initialize Express app
    this.app = express();
    this.server = http.createServer(this.app);
    
    // Initialize WebSocket server
    this.wss = new WebSocket.Server({ 
      server: this.server,
      perMessageDeflate: false // Disable compression for real-time performance
    });
    
    // Initialize managers
    this.sessionManager = new SessionManager();
    this.grpcClient = new GrpcClient(this.grpcHost, this.grpcPort);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupGracefulShutdown();
  }

  setupMiddleware() {
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: Date.now(),
        sessions: this.sessionManager.getActiveSessionsCount()
      });
    });

    // WebSocket endpoint info
    this.app.get('/ws-info', (req, res) => {
      res.json({
        endpoint: `ws://${this.host}:${this.port}`,
        protocol: 'video-processing-v1',
        maxFrameSize: '10MB'
      });
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const sessionId = uuidv4();
      logger.info(`New WebSocket connection: ${sessionId}`);

      // Setup session
      const session = this.sessionManager.createSession(sessionId, ws);
      
      // Setup gRPC stream for this session
      const grpcStream = this.grpcClient.createVideoStream(sessionId);
      session.setGrpcStream(grpcStream);

      // Handle incoming messages from client
      ws.on('message', async (data) => {
        try {
          await this.handleClientMessage(session, data);
        } catch (error) {
          logger.error(`Error handling client message: ${error.message}`);
          this.sendError(ws, 'PROCESSING_ERROR', error.message);
        }
      });

      // Handle gRPC stream responses
      grpcStream.on('data', (processedFrame) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'processed_frame',
            data: {
              sessionId: processedFrame.session_id,
              frameData: processedFrame.frame_data,
              format: processedFrame.format,
              timestamp: processedFrame.timestamp,
              metadata: processedFrame.metadata
            }
          }));
        }
      });

      grpcStream.on('error', (error) => {
        logger.error(`gRPC stream error for session ${sessionId}: ${error.message}`);
        this.sendError(ws, 'GRPC_ERROR', 'Service temporarily unavailable');
      });

      // Handle connection close
      ws.on('close', () => {
        logger.info(`WebSocket connection closed: ${sessionId}`);
        this.sessionManager.removeSession(sessionId);
        grpcStream.end();
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for session ${sessionId}: ${error.message}`);
        this.sessionManager.removeSession(sessionId);
        grpcStream.end();
      });

      // Send connection acknowledgment
      ws.send(JSON.stringify({
        type: 'connection_established',
        data: { sessionId, timestamp: Date.now() }
      }));
    });
  }

  async handleClientMessage(session, data) {
    let message;
    try {
      message = JSON.parse(data);
    } catch (error) {
      throw new Error('Invalid JSON message');
    }

    switch (message.type) {
      case 'video_frame':
        await this.handleVideoFrame(session, message.data);
        break;
      case 'ping':
        this.handlePing(session);
        break;
      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  }

  async handleVideoFrame(session, frameData) {
    logger.info(`Received video frame for session ${session.id}`);
    
    // Validate frame data
    const validation = validateFrame(frameData);
    if (!validation.valid) {
      logger.error(`Invalid frame for session ${session.id}: ${validation.error}`);
      throw new Error(`Invalid frame: ${validation.error}`);
    }

    // Update session stats
    session.updateStats();

    // Prepare gRPC message
    const grpcFrame = {
      session_id: session.id,
      frame_data: frameData.frameData,
      format: frameData.format || 'jpeg',
      timestamp: frameData.timestamp || Date.now(),
      width: frameData.width || 0,
      height: frameData.height || 0,
      metadata: {
        camera_facing: frameData.cameraFacing || 'back',
        quality: frameData.quality || 0.8,
        extra: frameData.metadata || {}
      }
    };

    logger.info(`Forwarding frame to gRPC service for session ${session.id}`);
    
    // Send to gRPC service
    session.grpcStream.write(grpcFrame);
  }

  handlePing(session) {
    session.ws.send(JSON.stringify({
      type: 'pong',
      data: { timestamp: Date.now() }
    }));
  }

  sendError(ws, code, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        data: { code, message, timestamp: Date.now() }
      }));
    }
  }

  setupGracefulShutdown() {
    const gracefulShutdown = () => {
      logger.info('Starting graceful shutdown...');
      
      this.wss.clients.forEach((ws) => {
        ws.close(1000, 'Server shutting down');
      });
      
      this.grpcClient.close();
      
      this.server.close(() => {
        logger.info('Server shut down complete');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  }

  async start() {
    try {
      // Initialize gRPC client
      await this.grpcClient.initialize();
      
      // Start HTTP server - bind to configured host
      this.server.listen(this.port, this.host, () => {
        logger.info(`Gateway server running on ${this.host}:${this.port}`);
        logger.info(`WebSocket endpoint: ws://${this.host}:${this.port}`);
        logger.info(`Health check: http://${this.host}:${this.port}/health`);
      });
    } catch (error) {
      logger.error(`Failed to start server: ${error.message}`);
      process.exit(1);
    }
  }
}

module.exports = GatewayServer;

// Start server if this file is run directly
if (require.main === module) {
  const server = new GatewayServer();
  server.start();
}
