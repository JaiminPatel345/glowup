import dotenv from 'dotenv';
import app from './app';
import { DatabaseConnection } from './config/database';
import { logger } from './config/logger';
import fs from 'fs';
import path from 'path';

// Load environment variables
// In Docker: use .env.docker, locally: use .env.local
const envFile = process.env.NODE_ENV === 'production' ? '.env' : 
                process.env.DOCKER_ENV === 'true' ? '.env.docker' : '.env.local';
dotenv.config({ path: envFile });

const PORT = process.env.PORT || 3002;

// Create necessary directories
const createDirectories = () => {
  const directories = [
    'logs',
    process.env.UPLOAD_PATH || './uploads',
    path.join(process.env.UPLOAD_PATH || './uploads', 'profiles'),
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  });
};

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    await DatabaseConnection.disconnect();
    logger.info('Database disconnected successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    // Create necessary directories
    createDirectories();

    // Connect to database
    await DatabaseConnection.connect();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`User service is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/api/v1/health`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export default startServer;