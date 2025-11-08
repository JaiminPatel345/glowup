const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const logger = require('../../configs/logger');

class GRPCClient {
  constructor() {
    this.clients = {};
    this.protoPath = path.join(__dirname, '../protos');
  }

  /**
   * Load and create gRPC client for a service
   * @param {string} serviceName - Name of the service (auth, skin_analysis, hair_tryon)
   * @param {string} serviceUrl - gRPC service URL (host:port)
   * @returns {Object} - gRPC client instance
   */
  async createClient(serviceName, serviceUrl) {
    try {
      if (this.clients[serviceName]) {
        return this.clients[serviceName];
      }

      const protoFile = path.join(this.protoPath, `${serviceName}.proto`);
      
      // Load proto definition
      const packageDefinition = protoLoader.loadSync(protoFile, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
      });

      const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
      
      // Get service constructor based on service name
      let ServiceConstructor;
      switch (serviceName) {
        case 'auth':
          ServiceConstructor = protoDescriptor.auth.AuthService;
          break;
        case 'skin_analysis':
          ServiceConstructor = protoDescriptor.skin_analysis.SkinAnalysisService;
          break;
        case 'hair_tryon':
          ServiceConstructor = protoDescriptor.hair_tryon.HairTryOnService;
          break;
        default:
          throw new Error(`Unknown service: ${serviceName}`);
      }

      // Create client with credentials
      const client = new ServiceConstructor(
        serviceUrl,
        grpc.credentials.createInsecure(), // Use SSL in production
        {
          'grpc.keepalive_time_ms': 30000,
          'grpc.keepalive_timeout_ms': 5000,
          'grpc.keepalive_permit_without_calls': true,
          'grpc.http2.max_pings_without_data': 0,
          'grpc.http2.min_time_between_pings_ms': 10000,
          'grpc.http2.min_ping_interval_without_data_ms': 300000
        }
      );

      // Wait for client to be ready
      await this.waitForReady(client);
      
      this.clients[serviceName] = client;
      logger.info(`gRPC client created for ${serviceName} at ${serviceUrl}`);
      
      return client;
    } catch (error) {
      logger.error(`Failed to create gRPC client for ${serviceName}:`, error);
      throw error;
    }
  }

  /**
   * Wait for gRPC client to be ready
   * @param {Object} client - gRPC client instance
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForReady(client, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeout;
      client.waitForReady(deadline, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Make gRPC call with error handling and retries
   * @param {Object} client - gRPC client instance
   * @param {string} method - Method name to call
   * @param {Object} request - Request data
   * @param {Object} options - Call options
   * @returns {Promise} - Response promise
   */
  async makeCall(client, method, request, options = {}) {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + (options.timeout || 30000);
      const metadata = new grpc.Metadata();
      
      // Add correlation ID if available
      if (options.correlationId) {
        metadata.add('correlation-id', options.correlationId);
      }

      // Add authentication if available
      if (options.token) {
        metadata.add('authorization', `Bearer ${options.token}`);
      }

      client[method](request, metadata, { deadline }, (error, response) => {
        if (error) {
          logger.error(`gRPC call ${method} failed:`, {
            error: error.message,
            code: error.code,
            details: error.details
          });
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Auth service methods
   */
  async validateToken(token, correlationId) {
    try {
      const client = await this.createClient('auth', process.env.AUTH_GRPC_URL || 'localhost:50051');
      return await this.makeCall(client, 'ValidateToken', { token }, { correlationId });
    } catch (error) {
      logger.error('Failed to validate token via gRPC:', error);
      throw error;
    }
  }

  async getUserInfo(userId, correlationId) {
    try {
      const client = await this.createClient('auth', process.env.AUTH_GRPC_URL || 'localhost:50051');
      return await this.makeCall(client, 'GetUserInfo', { user_id: userId }, { correlationId });
    } catch (error) {
      logger.error('Failed to get user info via gRPC:', error);
      throw error;
    }
  }

  /**
   * Skin analysis service methods
   */
  async analyzeSkin(userId, imageUrl, imageData, correlationId) {
    try {
      const client = await this.createClient('skin_analysis', process.env.SKIN_GRPC_URL || 'localhost:50052');
      return await this.makeCall(client, 'AnalyzeSkin', {
        user_id: userId,
        image_url: imageUrl,
        image_data: imageData
      }, { correlationId });
    } catch (error) {
      logger.error('Failed to analyze skin via gRPC:', error);
      throw error;
    }
  }

  async getSkinAnalysisById(analysisId, correlationId) {
    try {
      const client = await this.createClient('skin_analysis', process.env.SKIN_GRPC_URL || 'localhost:50052');
      return await this.makeCall(client, 'GetAnalysisById', {
        analysis_id: analysisId
      }, { correlationId });
    } catch (error) {
      logger.error('Failed to get skin analysis via gRPC:', error);
      throw error;
    }
  }

  /**
   * Hair try-on service methods
   */
  async processHairVideo(userId, videoUrl, videoData, styleImageUrl, styleImageData, colorImageUrl, colorImageData, correlationId) {
    try {
      const client = await this.createClient('hair_tryon', process.env.HAIR_GRPC_URL || 'localhost:50053');
      return await this.makeCall(client, 'ProcessVideo', {
        user_id: userId,
        video_url: videoUrl,
        video_data: videoData,
        style_image_url: styleImageUrl,
        style_image_data: styleImageData,
        color_image_url: colorImageUrl,
        color_image_data: colorImageData
      }, { correlationId, timeout: 120000 }); // 2 minutes for video processing
    } catch (error) {
      logger.error('Failed to process hair video via gRPC:', error);
      throw error;
    }
  }

  async getHairProcessingStatus(processingId, correlationId) {
    try {
      const client = await this.createClient('hair_tryon', process.env.HAIR_GRPC_URL || 'localhost:50053');
      return await this.makeCall(client, 'GetProcessingStatus', {
        processing_id: processingId
      }, { correlationId });
    } catch (error) {
      logger.error('Failed to get hair processing status via gRPC:', error);
      throw error;
    }
  }

  /**
   * Health check for all services
   */
  async healthCheck() {
    const services = ['auth', 'skin_analysis', 'hair_tryon'];
    const results = {};

    for (const service of services) {
      try {
        const client = this.clients[service];
        if (client) {
          await this.waitForReady(client, 5000);
          results[service] = { status: 'healthy' };
        } else {
          results[service] = { status: 'not_connected' };
        }
      } catch (error) {
        results[service] = { 
          status: 'unhealthy', 
          error: error.message 
        };
      }
    }

    return results;
  }

  /**
   * Close all gRPC connections
   */
  async closeAll() {
    for (const [serviceName, client] of Object.entries(this.clients)) {
      try {
        client.close();
        logger.info(`Closed gRPC client for ${serviceName}`);
      } catch (error) {
        logger.error(`Failed to close gRPC client for ${serviceName}:`, error);
      }
    }
    this.clients = {};
  }
}

// Singleton instance
const grpcClient = new GRPCClient();

module.exports = grpcClient;