const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { validateFrame } = require('../utils/validation');

class WebSocketHandler {
  constructor(server, sessionManager, serviceManager) {
    this.server = server;
    this.sessionManager = sessionManager;
    this.serviceManager = serviceManager;
    this.wss = null;
    this.messageHandlers = new Map();
    this.setupMessageHandlers();
  }

  initialize(config = {}) {
    this.wss = new WebSocket.Server({ 
      server: this.server,
      perMessageDeflate: config.perMessageDeflate || false
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    logger.info('WebSocket handler initialized');
  }

  setupMessageHandlers() {
    this.messageHandlers.set('video_frame', this.handleVideoFrame.bind(this));
    this.messageHandlers.set('ping', this.handlePing.bind(this));
    this.messageHandlers.set('health_check', this.handleHealthCheck.bind(this));
  }

  registerMessageHandler(type, handler) {
    this.messageHandlers.set(type, handler);
    logger.info(`Message handler registered for type: ${type}`);
  }

  handleConnection(ws, req) {
    const sessionId = uuidv4();
    const clientIp = req.socket.remoteAddress;
    
    logger.info(`New WebSocket connection: ${sessionId} from ${clientIp}`);

    // Create session
    const session = this.sessionManager.createSession(sessionId, ws);
    
    // Setup service connections for this session
    this.setupSessionServices(session);

    // Handle incoming messages
    ws.on('message', async (data) => {
      try {
        await this.handleClientMessage(session, data);
      } catch (error) {
        logger.error(`Error handling client message for ${sessionId}:`, error);
        this.sendError(ws, 'PROCESSING_ERROR', error.message);
      }
    });

    // Handle connection close
    ws.on('close', (code, reason) => {
      logger.info(`WebSocket connection closed: ${sessionId} (${code}: ${reason})`);
      this.cleanupSession(session);
    });

    ws.on('error', (error) => {
      logger.error(`WebSocket error for ${sessionId}:`, error);
      this.cleanupSession(session);
    });

    // Send connection acknowledgment
    this.sendMessage(ws, 'connection_established', { 
      sessionId, 
      timestamp: Date.now(),
      availableServices: Array.from(this.serviceManager.services.keys())
    });
  }

  async setupSessionServices(session) {
    try {
      // Setup video processing service
      const videoService = this.serviceManager.getService('videoProcessing');
      if (videoService) {
        const grpcStream = videoService.createVideoStream(session.id);
        session.setGrpcStream(grpcStream);

        // Handle processed frames
        grpcStream.on('data', (processedFrame) => {
          if (session.ws.readyState === WebSocket.OPEN) {
            this.sendMessage(session.ws, 'processed_frame', {
              sessionId: processedFrame.session_id,
              frameData: processedFrame.frame_data,
              format: processedFrame.format,
              timestamp: processedFrame.timestamp,
              metadata: processedFrame.metadata
            });
          }
        });

        grpcStream.on('error', (error) => {
          logger.error(`gRPC stream error for session ${session.id}:`, error);
          this.sendError(session.ws, 'SERVICE_ERROR', 'Video processing service temporarily unavailable');
        });
      }
    } catch (error) {
      logger.error(`Failed to setup services for session ${session.id}:`, error);
    }
  }

  async handleClientMessage(session, data) {
    let message;
    try {
      message = JSON.parse(data);
    } catch (error) {
      throw new Error('Invalid JSON message');
    }

    const handler = this.messageHandlers.get(message.type);
    if (!handler) {
      throw new Error(`Unknown message type: ${message.type}`);
    }

    await handler(session, message.data, message);
  }

  async handleVideoFrame(session, frameData) {
    logger.debug(`Received video frame for session ${session.id}`);
    
    // Validate frame data
    const validation = validateFrame(frameData);
    if (!validation.valid) {
      logger.error(`Invalid frame for session ${session.id}: ${validation.error}`);
      throw new Error(`Invalid frame: ${validation.error}`);
    }

    // Update session stats
    session.updateStats();

    // Prepare frame for processing
    const processedFrame = {
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

    logger.debug(`Forwarding frame to video processing service for session ${session.id}`);
    
    // Send to video processing service
    if (session.grpcStream) {
      session.grpcStream.write(processedFrame);
    } else {
      throw new Error('Video processing service not available');
    }
  }

  async handlePing(session) {
    this.sendMessage(session.ws, 'pong', { timestamp: Date.now() });
  }

  async handleHealthCheck(session) {
    const health = await this.serviceManager.healthCheckAllServices();
    this.sendMessage(session.ws, 'health_response', {
      gateway: 'healthy',
      services: health,
      timestamp: Date.now()
    });
  }

  sendMessage(ws, type, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data, timestamp: Date.now() }));
    }
  }

  sendError(ws, code, message) {
    this.sendMessage(ws, 'error', { code, message });
  }

  cleanupSession(session) {
    this.sessionManager.removeSession(session.id);
    if (session.grpcStream) {
      session.grpcStream.end();
    }
  }

  broadcast(type, data) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendMessage(client, type, data);
      }
    });
  }

  getStats() {
    return {
      connections: this.wss.clients.size,
      activeSessions: this.sessionManager.getActiveSessionsCount()
    };
  }

  close() {
    if (this.wss) {
      this.wss.clients.forEach((ws) => {
        ws.close(1000, 'Server shutting down');
      });
      this.wss.close();
    }
  }
}

module.exports = WebSocketHandler;
