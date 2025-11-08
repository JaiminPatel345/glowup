import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error in API Gateway:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Don't send error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  const response = {
    success: false,
    error: 'Internal Server Error',
    message: isDevelopment ? error.message : 'Something went wrong',
    ...(isDevelopment && { stack: error.stack })
  };

  res.status(error.status || 500).json(response);
};