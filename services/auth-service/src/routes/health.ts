import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../config/logger';
import { ApiResponse } from '../types';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await query('SELECT 1');
    
    const response: ApiResponse = {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        version: process.env.npm_package_version || '1.0.0'
      },
      message: 'Service is healthy'
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Health check failed:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Service unhealthy',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        error: error.message
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
        error: error.message
      }
    };

    res.status(503).json(response);
  }
});

export default router;