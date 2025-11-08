import dotenv from 'dotenv';
import app from './app';
import { logger } from './config/logger';
import { query } from './config/database';

// Load environment variables
dotenv.config();

const PORT = process.env.API_PORT || 3000;

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
function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connections
    // Note: pg pool will close automatically when the process exits
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

// Start server
async function startServer() {
  try {
    // Test database connection
    await testDatabaseConnection();
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Auth service started on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
const server = startServer();

export default server;