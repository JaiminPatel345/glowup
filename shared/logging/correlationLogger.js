const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

/**
 * Correlation ID middleware and logging utilities
 */
class CorrelationLogger {
  constructor() {
    this.correlationIdHeader = 'x-correlation-id';
    this.logger = this.createLogger();
  }

  /**
   * Create Winston logger with correlation ID support
   */
  createLogger() {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, correlationId, service, ...meta }) => {
        const logEntry = {
          timestamp,
          level,
          message,
          correlationId: correlationId || 'unknown',
          service: service || process.env.SERVICE_NAME || 'unknown',
          ...meta
        };
        return JSON.stringify(logEntry);
      })
    );

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: {
        service: process.env.SERVICE_NAME || 'growup-service'
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error'
        }),
        new winston.transports.File({
          filename: 'logs/combined.log'
        })
      ]
    });
  }

  /**
   * Express middleware to add correlation ID to requests
   */
  middleware() {
    return (req, res, next) => {
      // Get correlation ID from header or generate new one
      const correlationId = req.headers[this.correlationIdHeader] || uuidv4();
      
      // Add to request object
      req.correlationId = correlationId;
      
      // Add to response headers
      res.setHeader(this.correlationIdHeader, correlationId);
      
      // Create request-scoped logger
      req.logger = this.createRequestLogger(correlationId, {
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress
      });

      // Log incoming request
      req.logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        headers: this.sanitizeHeaders(req.headers),
        query: req.query
      });

      // Log response when finished
      const originalSend = res.send;
      res.send = function(data) {
        req.logger.info('Outgoing response', {
          statusCode: res.statusCode,
          responseTime: Date.now() - req.startTime
        });
        originalSend.call(this, data);
      };

      req.startTime = Date.now();
      next();
    };
  }

  /**
   * Create request-scoped logger with correlation ID
   */
  createRequestLogger(correlationId, requestMeta = {}) {
    return this.logger.child({
      correlationId,
      ...requestMeta
    });
  }

  /**
   * Create service-scoped logger with correlation ID
   */
  createServiceLogger(correlationId, serviceName) {
    return this.logger.child({
      correlationId,
      service: serviceName
    });
  }

  /**
   * Log database operations
   */
  logDatabaseOperation(logger, operation, table, duration, success = true, error = null) {
    const logData = {
      operation,
      table,
      duration: `${duration}ms`,
      success
    };

    if (error) {
      logData.error = error.message;
      logData.stack = error.stack;
    }

    if (success) {
      logger.info('Database operation completed', logData);
    } else {
      logger.error('Database operation failed', logData);
    }
  }

  /**
   * Log API calls to external services
   */
  logExternalApiCall(logger, service, endpoint, method, duration, statusCode, success = true, error = null) {
    const logData = {
      externalService: service,
      endpoint,
      method,
      duration: `${duration}ms`,
      statusCode,
      success
    };

    if (error) {
      logData.error = error.message;
    }

    if (success) {
      logger.info('External API call completed', logData);
    } else {
      logger.error('External API call failed', logData);
    }
  }

  /**
   * Log gRPC calls
   */
  logGrpcCall(logger, service, method, duration, success = true, error = null) {
    const logData = {
      grpcService: service,
      method,
      duration: `${duration}ms`,
      success
    };

    if (error) {
      logData.error = error.message;
      logData.grpcCode = error.code;
    }

    if (success) {
      logger.info('gRPC call completed', logData);
    } else {
      logger.error('gRPC call failed', logData);
    }
  }

  /**
   * Log AI model inference
   */
  logAiInference(logger, modelName, inputType, duration, success = true, error = null, metadata = {}) {
    const logData = {
      aiModel: modelName,
      inputType,
      duration: `${duration}ms`,
      success,
      ...metadata
    };

    if (error) {
      logData.error = error.message;
    }

    if (success) {
      logger.info('AI inference completed', logData);
    } else {
      logger.error('AI inference failed', logData);
    }
  }

  /**
   * Log cache operations
   */
  logCacheOperation(logger, operation, key, hit = null, duration = null) {
    const logData = {
      cacheOperation: operation,
      key: this.sanitizeKey(key)
    };

    if (hit !== null) {
      logData.cacheHit = hit;
    }

    if (duration !== null) {
      logData.duration = `${duration}ms`;
    }

    logger.debug('Cache operation', logData);
  }

  /**
   * Log security events
   */
  logSecurityEvent(logger, event, severity = 'medium', details = {}) {
    logger.warn('Security event', {
      securityEvent: event,
      severity,
      ...details
    });
  }

  /**
   * Log performance metrics
   */
  logPerformanceMetric(logger, metric, value, unit = 'ms', tags = {}) {
    logger.info('Performance metric', {
      metric,
      value,
      unit,
      tags
    });
  }

  /**
   * Sanitize headers for logging (remove sensitive data)
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize cache keys for logging
   */
  sanitizeKey(key) {
    // Remove potentially sensitive data from cache keys
    return key.replace(/user:\d+/g, 'user:[ID]')
              .replace(/session:[a-f0-9-]+/g, 'session:[TOKEN]')
              .replace(/token:[a-f0-9]+/g, 'token:[HASH]');
  }

  /**
   * Create error logger with context
   */
  logError(logger, error, context = {}) {
    logger.error('Application error', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      ...context
    });
  }

  /**
   * Create audit logger for important business events
   */
  logAuditEvent(logger, event, userId, details = {}) {
    logger.info('Audit event', {
      auditEvent: event,
      userId,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  /**
   * Health check logging
   */
  logHealthCheck(logger, service, status, details = {}) {
    const logLevel = status === 'healthy' ? 'info' : 'warn';
    logger[logLevel]('Health check', {
      healthCheck: service,
      status,
      ...details
    });
  }
}

// Singleton instance
const correlationLogger = new CorrelationLogger();

module.exports = correlationLogger;