import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Create different rate limiters for different types of requests
export const rateLimitMiddleware = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use IP address as the key, but could be enhanced to use user ID for authenticated requests
    return req.ip || 'unknown';
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  onLimitReached: (req: Request, res: Response) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
  }
});

// Specific rate limiter for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts',
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Rate limiter for file upload endpoints
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 uploads per minute
  message: {
    success: false,
    error: 'Too many upload attempts',
    message: 'Too many upload attempts from this IP, please try again after 1 minute.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});