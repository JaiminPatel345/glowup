import dotenv from 'dotenv';
import { Server } from 'http';
import app from './app';
import { logger } from './config/logger';
import { AuthGrpcService } from './grpc/authGrpcService';
import { query } from './config/database';

// Load environment variables
// In Docker: use .env.docker, locally: use .env.local
const envFile = process.env.NODE_ENV === 'production' ? '.env' : 
                process.env.DOCKER_ENV === 'true' ? '.env.docker' : '.env.local';
dotenv.config({ path: envFile });

const PORT = process.env.API_PORT || 3000;
const GRPC_PORT = process.env.GRPC_PORT || 50051;

let httpServer: Server;
let grpcService: AuthGrpcService;

// Database connection test
async function testDatabaseConnection() {
  try {
    await query('SELECT 1');
    logger.info('Database connection established successfully');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close HTTP server
    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer.close(() => {
          logger.info('HTTP server closed');
          resolve();
        });
      });
    }
    
    // Close gRPC server
    if (grpcService) {
      await grpcService.stop();
    }
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Start server
async function startServer() {
  try {
    // Test database connection
    await testDatabaseConnection();
    
    // Start HTTP server
    httpServer = app.listen(PORT, () => {
      logger.info(`Auth service HTTP server started on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
    });

    // Start gRPC server
    grpcService = new AuthGrpcService();
    await grpcService.start(Number(GRPC_PORT));
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return httpServer;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});