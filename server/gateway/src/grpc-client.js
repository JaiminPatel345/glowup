const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { logger } = require('./utils/logger');

class GrpcClient {
  constructor(host = 'localhost', port = 50051) {
    this.host = host;
    this.port = port;
    this.client = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      // Load proto file
      const protoPath = path.join(__dirname, '../../proto/video_processing.proto');
      const packageDefinition = protoLoader.loadSync(protoPath, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
      });

      const videoProcessingProto = grpc.loadPackageDefinition(packageDefinition).video_processing;

      // Create client
      this.client = new videoProcessingProto.VideoProcessingService(
        `${this.host}:${this.port}`,
        grpc.credentials.createInsecure(),
        {
          'grpc.keepalive_time_ms': 30000,
          'grpc.keepalive_timeout_ms': 5000,
          'grpc.keepalive_permit_without_calls': true,
          'grpc.http2.max_pings_without_data': 0,
          'grpc.http2.min_time_between_pings_ms': 10000,
          'grpc.http2.min_ping_interval_without_data_ms': 300000
        }
      );

      // Test connection
      await this.healthCheck();
      this.isConnected = true;
      logger.info(`gRPC client connected to ${this.host}:${this.port}`);
    } catch (error) {
      logger.error(`Failed to initialize gRPC client: ${error.message}`);
      throw error;
    }
  }

  createVideoStream(sessionId) {
    if (!this.isConnected || !this.client) {
      throw new Error('gRPC client not connected');
    }

    const stream = this.client.ProcessVideoStream();
    
    stream.on('error', (error) => {
      logger.error(`gRPC stream error for session ${sessionId}: ${error.message}`);
    });

    stream.on('end', () => {
      logger.info(`gRPC stream ended for session ${sessionId}`);
    });

    return stream;
  }

  async healthCheck() {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('gRPC client not initialized'));
        return;
      }

      this.client.HealthCheck(
        { service: 'VideoProcessingService' },
        (error, response) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  close() {
    if (this.client) {
      this.client.close();
      this.isConnected = false;
      logger.info('gRPC client closed');
    }
  }
}

module.exports = GrpcClient;
