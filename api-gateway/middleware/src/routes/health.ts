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

const buildServiceUrl = (
  urlEnv: string,
  hostEnv: string,
  portEnv: string,
  defaultHost: string,
  defaultPort: string
) => {
  const fullUrl = process.env[urlEnv];
  if (fullUrl) {
    return fullUrl;
  }

  const host = process.env[hostEnv] || defaultHost;
  const port = process.env[portEnv] || defaultPort;
  return `http://${host}:${port}`;
};

const services = [
  {
    name: 'auth-service',
    url: buildServiceUrl('AUTH_SERVICE_URL', 'AUTH_SERVICE_HOST', 'AUTH_SERVICE_PORT', 'auth-service', '3001')
  },
  {
    name: 'user-service',
    url: buildServiceUrl('USER_SERVICE_URL', 'USER_SERVICE_HOST', 'USER_SERVICE_PORT', 'user-service', '3002')
  },
  {
    name: 'skin-service',
    url: buildServiceUrl('SKIN_SERVICE_URL', 'SKIN_SERVICE_HOST', 'SKIN_SERVICE_PORT', 'skin-analysis-service', '3003')
  },
  {
    name: 'hair-service',
    url: buildServiceUrl('HAIR_SERVICE_URL', 'HAIR_SERVICE_HOST', 'HAIR_SERVICE_PORT', 'hair-tryOn-service', '3004')
  }
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
    const err = error as Error;
    
    return {
      name: service.name,
      url: service.url,
      status: 'unhealthy',
      responseTime,
      error: err.message
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
    const err = error as Error;
    logger.error('Health check failed:', error);
    
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'api-gateway-middleware',
        error: err.message
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