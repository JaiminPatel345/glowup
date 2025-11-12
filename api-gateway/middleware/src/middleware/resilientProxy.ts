import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import path from 'path';
import { logger } from '../config/logger';

const sharedBasePath = path.resolve(process.cwd(), '../shared');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceRegistry = require(path.join(sharedBasePath, 'discovery/serviceRegistry.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { circuitBreakerManager } = require(path.join(sharedBasePath, 'resilience/circuitBreaker.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const correlationLogger = require(path.join(sharedBasePath, 'logging/correlationLogger.js'));

interface ResilientProxyOptions extends Options {
  serviceName: string;
  fallbackResponse?: any;
  circuitBreakerOptions?: {
    failureThreshold?: number;
    recoveryTimeout?: number;
    expectedErrors?: string[];
  };
}

/**
 * Create a resilient proxy middleware with circuit breaker and service discovery
 */
export function createResilientProxy(options: ResilientProxyOptions) {
  const {
    serviceName,
    fallbackResponse,
    circuitBreakerOptions = {},
    ...proxyOptions
  } = options;

  const disableCircuitBreaker = process.env.DISABLE_CIRCUIT_BREAKER === 'true' || process.env.NODE_ENV !== 'production';

  // Configure circuit breaker
  const circuitBreaker = circuitBreakerManager.getBreaker(serviceName, {
    failureThreshold: circuitBreakerOptions.failureThreshold || 5,
    recoveryTimeout: circuitBreakerOptions.recoveryTimeout || 60000,
    expectedErrors: circuitBreakerOptions.expectedErrors || ['ECONNREFUSED', 'ETIMEDOUT'],
    ...circuitBreakerOptions
  });

  // Dynamic target resolution using service discovery
  const dynamicTarget = async (req: Request): Promise<string> => {
    try {
      const serviceInstance = await serviceRegistry.getServiceInstance(serviceName);
      
      if (serviceInstance) {
        const protocol = serviceInstance.protocol || 'http';
        return `${protocol}://${serviceInstance.host}:${serviceInstance.port}`;
      }
      
      // Fallback to static configuration
      return proxyOptions.target as string;
    } catch (error) {
      logger.warn(`Service discovery failed for ${serviceName}, using fallback target`);
      return proxyOptions.target as string;
    }
  };

  // Create the base proxy middleware
  const baseProxy = createProxyMiddleware({
    ...proxyOptions,
    router: async (req) => {
      return await dynamicTarget(req);
    },
    onError: (err, req, res) => {
      const correlationId = (req as any).correlationId || 'unknown';
      const proxyLogger = correlationLogger.createServiceLogger(correlationId, 'api-gateway');
      
      // Log detailed error
      logger.error(`❌ Proxy error for ${serviceName}`, {
        method: req.method,
        url: req.url,
        error: err.message,
        code: (err as any).code,
        stack: err.stack,
        correlationId
      });
      
      correlationLogger.logError(proxyLogger, err, {
        serviceName,
        url: req.url,
        method: req.method
      });

      if (!res.headersSent) {
        // Check if we have a fallback response
        if (fallbackResponse) {
          res.status(503).json({
            success: false,
            error: 'Service Unavailable',
            message: 'Service is temporarily unavailable, using fallback response',
            data: fallbackResponse
          });
        } else {
          res.status(502).json({
            success: false,
            error: 'Service Unavailable',
            message: `The ${serviceName} service is temporarily unavailable`
          });
        }
      }
    },
    onProxyReq: (proxyReq, req, res) => {
      const correlationId = (req as any).correlationId || 'unknown';
      const proxyLogger = correlationLogger.createServiceLogger(correlationId, 'api-gateway');
      
      // Add correlation ID to proxied request
      proxyReq.setHeader('x-correlation-id', correlationId);
      
      // Log the proxy request
      logger.info(`🔄 Proxying to ${serviceName}`, {
        method: req.method,
        originalUrl: req.url,
        targetUrl: proxyReq.path,
        contentType: req.headers['content-type'],
        hasBody: !!req.body,
        correlationId
      });
      
      correlationLogger.logExternalApiCall(
        proxyLogger,
        serviceName,
        req.url || '',
        req.method || 'GET',
        0,
        0,
        true
      );

      // When body parsers run before the proxy, the original request stream is consumed.
      // Re-serialize known body types so the upstream service receives the payload.
      const method = req.method?.toUpperCase();
      if (!method || ['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        return;
      }

      if (!req.body || (typeof req.body === 'object' && Object.keys(req.body).length === 0)) {
        return;
      }

      const contentType = proxyReq.getHeader('Content-Type');
      let bodyBuffer: Buffer | null = null;

      if (Buffer.isBuffer(req.body)) {
        bodyBuffer = req.body;
      } else if (typeof req.body === 'string') {
        bodyBuffer = Buffer.from(req.body);
      } else if (contentType && contentType.toString().includes('application/json')) {
        bodyBuffer = Buffer.from(JSON.stringify(req.body));
      } else if (contentType && contentType.toString().includes('application/x-www-form-urlencoded')) {
        const formData = new URLSearchParams();
        Object.entries(req.body as Record<string, unknown>).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((item) => formData.append(key, String(item)));
          } else if (value !== undefined && value !== null) {
            formData.append(key, String(value));
          }
        });
        bodyBuffer = Buffer.from(formData.toString());
      }

      if (bodyBuffer) {
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyBuffer));
        proxyReq.write(bodyBuffer);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      const correlationId = (req as any).correlationId || 'unknown';
      const proxyLogger = correlationLogger.createServiceLogger(correlationId, 'api-gateway');
      
      const duration = Date.now() - ((req as any).startTime || Date.now());
      const statusCode = proxyRes.statusCode || 500;
      const success = statusCode < 400;
      
      // Log the proxy response
      logger.info(`✅ Proxy response from ${serviceName}`, {
        method: req.method,
        url: req.url,
        statusCode,
        duration: `${duration}ms`,
        success,
        correlationId
      });
      
      correlationLogger.logExternalApiCall(
        proxyLogger,
        serviceName,
        req.url || '',
        req.method || 'GET',
        duration,
        statusCode,
        success
      );
    }
  });

  // Wrap with circuit breaker
  return async (req: Request, res: Response, next: NextFunction) => {
    if (disableCircuitBreaker) {
      return baseProxy(req, res, next);
    }

    const correlationId = (req as any).correlationId || 'unknown';
    const proxyLogger = correlationLogger.createServiceLogger(correlationId, 'api-gateway');
    
    try {
      // Execute through circuit breaker
      await circuitBreaker.execute(async () => {
        return new Promise<void>((resolve, reject) => {
          // Add start time for duration calculation
          (req as any).startTime = Date.now();
          
          const cleanup = () => {
            res.removeListener('finish', onFinish);
            res.removeListener('close', onClose);
            res.removeListener('error', onError);
          };

          const onFinish = () => {
            cleanup();
            resolve();
          };

          const onClose = () => {
            cleanup();
            resolve();
          };

          const onError = (err: Error) => {
            cleanup();
            reject(err);
          };

          res.once('finish', onFinish);
          res.once('close', onClose);
          res.once('error', onError);

          // Call the base proxy
          baseProxy(req, res, (error) => {
            cleanup();
            if (error) {
              reject(error);
            } else if (!res.writableEnded) {
              resolve();
            }
          });
        });
      });
    } catch (error) {
      // Circuit breaker is open or service failed
      if ((error as any).circuitBreakerOpen) {
        correlationLogger.logSecurityEvent(proxyLogger, 'circuit_breaker_open', 'medium', {
          serviceName,
          url: req.url,
          method: req.method
        });

        if (fallbackResponse) {
          res.status(503).json({
            success: false,
            error: 'Service Circuit Breaker Open',
            message: `${serviceName} service is temporarily unavailable (circuit breaker open)`,
            data: fallbackResponse
          });
        } else {
          res.status(503).json({
            success: false,
            error: 'Service Circuit Breaker Open',
            message: `${serviceName} service is temporarily unavailable (circuit breaker open)`
          });
        }
      } else {
        // Other errors
        correlationLogger.logError(proxyLogger, error as Error, {
          serviceName,
          url: req.url,
          method: req.method
        });

        if (!res.headersSent) {
          res.status(502).json({
            success: false,
            error: 'Service Error',
            message: `Failed to communicate with ${serviceName} service`
          });
        }
      }
    }
  };
}

/**
 * Middleware to register API Gateway with service registry
 */
export async function registerGateway() {
  try {
    const gatewayInfo = {
      name: 'api-gateway',
      version: process.env.npm_package_version || '1.0.0',
      host: process.env.GATEWAY_HOST || 'localhost',
      port: parseInt(process.env.PORT || '80'),
      protocol: 'http',
      endpoints: [
        '/health',
        '/api/auth/*',
        '/api/users/*',
        '/api/skin/*',
        '/api/hair/*'
      ],
      metadata: {
        type: 'api-gateway',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    await serviceRegistry.registerService(gatewayInfo);
    
    // Start heartbeat
    serviceRegistry.startHeartbeat(
      gatewayInfo.name,
      gatewayInfo.host,
      gatewayInfo.port,
      async () => {
        // Simple health check
        return { status: 'healthy' };
      }
    );

    logger.info('API Gateway registered with service registry');
  } catch (error) {
    logger.error('Failed to register API Gateway:', error);
  }
}

/**
 * Get circuit breaker status for all services
 */
export function getCircuitBreakerStatus() {
  return circuitBreakerManager.getAllStatus();
}