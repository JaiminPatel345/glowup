import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../config/logger';
import { ApiResponse, AuthenticatedRequest } from '../types';

// Import shared utilities
const redisCache = require('../../../../shared/cache/redis');
const { circuitBreakerManager } = require('../../../../shared/resilience/circuitBreaker');
const correlationLogger = require('../../../../shared/logging/correlationLogger');

const router = Router();

router.get('/health', async (req: AuthenticatedRequest, res: Response) => {
  const correlationId = req.correlationId || 'health-check';
  const healthLogger = correlationLogger.createServiceLogger(correlationId, 'auth-service');
  
  const healthChecks = {
    database: { status: 'unknown', message: '', responseTime: 0 },
    redis: { status: 'unknown', message: '', responseTime: 0 },
    circuitBreakers: { status: 'unknown', message: '', details: {} }
  };

  let overallStatus = 'healthy';
  let statusCode = 200;

  try {
    // Check database connection
    const dbStart = Date.now();
    try {
      await query('SELECT 1');
      healthChecks.database = {
        status: 'healthy',
        message: 'Database connection successful',
        responseTime: Date.now() - dbStart
      };
      correlationLogger.logHealthCheck(healthLogger, 'database', 'healthy', {
        responseTime: healthChecks.database.responseTime
      });
    } catch (dbError) {
      healthChecks.database = {
        status: 'unhealthy',
        message: dbError instanceof Error ? dbError.message : 'Database connection failed',
        responseTime: Date.now() - dbStart
      };
      overallStatus = 'unhealthy';
      correlationLogger.logHealthCheck(healthLogger, 'database', 'unhealthy', {
        error: dbError instanceof Error ? dbError.message : 'Database connection failed'
      });
    }

    // Check Redis connection
    const redisStart = Date.now();
    try {
      const redisHealth = await redisCache.healthCheck();
      healthChecks.redis = {
        status: redisHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
        message: redisHealth.message,
        responseTime: Date.now() - redisStart
      };
      
      if (redisHealth.status !== 'healthy') {
        overallStatus = 'degraded'; // Redis is not critical, so degraded instead of unhealthy
      }
      
      correlationLogger.logHealthCheck(healthLogger, 'redis', redisHealth.status, {
        responseTime: healthChecks.redis.responseTime
      });
    } catch (redisError) {
      healthChecks.redis = {
        status: 'unhealthy',
        message: redisError instanceof Error ? redisError.message : 'Redis connection failed',
        responseTime: Date.now() - redisStart
      };
      overallStatus = 'degraded';
      correlationLogger.logHealthCheck(healthLogger, 'redis', 'unhealthy', {
        error: redisError instanceof Error ? redisError.message : 'Redis connection failed'
      });
    }

    // Check circuit breakers
    try {
      const circuitBreakerHealth = circuitBreakerManager.healthCheck();
      healthChecks.circuitBreakers = {
        status: circuitBreakerHealth.healthy ? 'healthy' : 'degraded',
        message: circuitBreakerHealth.healthy ? 'All circuit breakers healthy' : 'Some circuit breakers open',
        details: circuitBreakerHealth.breakers
      };
      
      if (!circuitBreakerHealth.healthy && overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    } catch (cbError) {
      healthChecks.circuitBreakers = {
        status: 'unknown',
        message: cbError instanceof Error ? cbError.message : 'Circuit breaker failed',
        details: {}
      };
    }

    // Determine final status code
    if (overallStatus === 'unhealthy') {
      statusCode = 503;
    } else if (overallStatus === 'degraded') {
      statusCode = 200; // Still accepting requests but with warnings
    }

    const response: ApiResponse = {
      success: overallStatus !== 'unhealthy',
      data: {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        checks: healthChecks
      },
      message: `Service is ${overallStatus}`
    };

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Health check failed:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Health check failed',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        error: error instanceof Error ? error.message : 'Health check failed',
        checks: healthChecks
      }
    };

    res.status(503).json(response);
  }
});

router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if service is ready to accept requests
    await query('SELECT 1');
    
    const response: ApiResponse = {
      success: true,
      data: {
        status: 'ready',
        timestamp: new Date().toISOString(),
        service: 'auth-service'
      },
      message: 'Service is ready'
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Readiness check failed:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Service not ready',
      data: {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        error: error instanceof Error ? error.message : 'Health check failed'
      }
    };

    res.status(503).json(response);
  }
});

export default router;