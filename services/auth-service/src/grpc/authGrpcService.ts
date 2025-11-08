import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { AuthService } from '../services/authService';
import { logger } from '../config/logger';

const correlationLogger = require('../../../../shared/logging/correlationLogger');

// Load proto definition
const PROTO_PATH = path.join(__dirname, '../../../../shared/grpc/protos/auth.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const authProto = grpc.loadPackageDefinition(packageDefinition).auth as any;

export class AuthGrpcService {
  private server: grpc.Server;
  private authService: AuthService;

  constructor() {
    this.server = new grpc.Server();
    this.authService = new AuthService();
    this.setupService();
  }

  private setupService() {
    this.server.addService(authProto.AuthService.service, {
      ValidateToken: this.validateToken.bind(this),
      GetUserInfo: this.getUserInfo.bind(this),
      RefreshToken: this.refreshToken.bind(this)
    });
  }

  private async validateToken(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) {
    const correlationId = this.getCorrelationId(call);
    const grpcLogger = correlationLogger.createServiceLogger(correlationId, 'auth-grpc');
    
    try {
      const { token } = call.request;
      
      correlationLogger.logGrpcCall(grpcLogger, 'auth', 'ValidateToken', 0, true);
      
      const payload = this.authService.verifyAccessToken(token);
      
      callback(null, {
        valid: true,
        user_id: payload.userId,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions,
        error_message: ''
      });
      
    } catch (error) {
      correlationLogger.logGrpcCall(grpcLogger, 'auth', 'ValidateToken', 0, false, error);
      
      callback(null, {
        valid: false,
        user_id: '',
        email: '',
        role: '',
        permissions: [],
        error_message: error.message
      });
    }
  }

  private async getUserInfo(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) {
    const correlationId = this.getCorrelationId(call);
    const grpcLogger = correlationLogger.createServiceLogger(correlationId, 'auth-grpc');
    
    try {
      const { user_id } = call.request;
      
      // This would typically call a user service or database
      // For now, we'll return a basic response
      const user = await this.authService.findUserById(user_id);
      
      if (!user) {
        callback(null, {
          user_id: '',
          email: '',
          first_name: '',
          last_name: '',
          profile_image_url: '',
          created_at: '',
          updated_at: '',
          error_message: 'User not found'
        });
        return;
      }

      correlationLogger.logGrpcCall(grpcLogger, 'auth', 'GetUserInfo', 0, true);
      
      callback(null, {
        user_id: user.id,
        email: user.email,
        first_name: user.firstName || '',
        last_name: user.lastName || '',
        profile_image_url: user.profileImageUrl || '',
        created_at: user.createdAt?.toISOString() || '',
        updated_at: user.updatedAt?.toISOString() || '',
        error_message: ''
      });
      
    } catch (error) {
      correlationLogger.logGrpcCall(grpcLogger, 'auth', 'GetUserInfo', 0, false, error);
      
      callback(null, {
        user_id: '',
        email: '',
        first_name: '',
        last_name: '',
        profile_image_url: '',
        created_at: '',
        updated_at: '',
        error_message: error.message
      });
    }
  }

  private async refreshToken(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) {
    const correlationId = this.getCorrelationId(call);
    const grpcLogger = correlationLogger.createServiceLogger(correlationId, 'auth-grpc');
    
    try {
      const { refresh_token } = call.request;
      
      const tokens = await this.authService.refreshAccessToken(refresh_token);
      
      correlationLogger.logGrpcCall(grpcLogger, 'auth', 'RefreshToken', 0, true);
      
      callback(null, {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        error_message: ''
      });
      
    } catch (error) {
      correlationLogger.logGrpcCall(grpcLogger, 'auth', 'RefreshToken', 0, false, error);
      
      callback(null, {
        access_token: '',
        refresh_token: '',
        error_message: error.message
      });
    }
  }

  private getCorrelationId(call: grpc.ServerUnaryCall<any, any>): string {
    const metadata = call.metadata;
    return metadata.get('correlation-id')?.[0]?.toString() || 'grpc-unknown';
  }

  public start(port: number = 50051): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.bindAsync(
        `0.0.0.0:${port}`,
        grpc.ServerCredentials.createInsecure(),
        (error, boundPort) => {
          if (error) {
            logger.error('Failed to start gRPC server:', error);
            reject(error);
            return;
          }

          this.server.start();
          logger.info(`Auth gRPC server started on port ${boundPort}`);
          resolve();
        }
      );
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.tryShutdown((error) => {
        if (error) {
          logger.error('Error shutting down gRPC server:', error);
        } else {
          logger.info('Auth gRPC server stopped');
        }
        resolve();
      });
    });
  }
}