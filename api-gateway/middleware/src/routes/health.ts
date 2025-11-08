import { Router, Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../config/logger';

const router = Router();

interface ServiceHealth {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  error?: string;
}

const services = [
  { name: 'auth-service', url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3000' },
  { name: 'user-service', url: process.env.USER_SERVICE_URL || 'http://user-service:3000' },
  { name: 'skin-service', url: process.env.SKIN_SERVICE_URL || 'http://skin-service:8000' },
  { name: 'hair-service', url: process.env.HAIR_SERVICE_URL || 'http://hair-service:8000' }
];

async function checkServiceHealth(service: { name: string; url: string }): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(`${service.url}/api/health`, {
      timeout: 5000,
      validateStatus: (status) => status < 500 // Accept 4xx as healthy
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      name: service.name,
      url: service.url,
      status: response.status < 400 ? 'healthy' : 'unhealthy',
      responseTime,
      error: response.status >= 400 ? `HTTP ${response.status}` : undefined
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      name: service.name,
      url: service.url,
      status: 'unhealthy',
      responseTime,
      error: error.message
    };
  }
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const healthChecks = await Promise.all(
      services.map(service => checkServiceHealth(service))
    );

    const allHealthy = healthChecks.every(check => check.status === 'healthy');
    const overallStatus = allHealthy ? 'healthy' : 'degraded';

    const response = {
      success: true,
      data: {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        service: 'api-gateway-middleware',
        version: process.env.npm_package_version || '1.0.0',
        services: healthChecks
      },
      message: `Gateway is ${overallStatus}`
    };

    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Health check failed:', error);
    
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'api-gateway-middleware',
        error: error.message
      }
    });
  }
});

router.get('/ready', (req: Request, res: Response) => {
  // Simple readiness check - just verify the gateway is running
  res.json({
    success: true,
    data: {
      status: 'ready',
      timestamp: new Date().toISOString(),
      service: 'api-gateway-middleware'
    },
    message: 'Gateway is ready'
  });
});

export { router as healthCheck };