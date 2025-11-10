import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { logger } from '../config/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    // First, try to verify token locally (faster)
    try {
      const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';
      const payload = jwt.verify(token, jwtSecret) as any;
      
      req.user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions || []
      };

      logger.debug('Token verified locally', { userId: payload.userId });
      return next();
    } catch (jwtError) {
      const error = jwtError as Error;
      logger.debug('Local JWT verification failed, trying auth service', { error: error.message });
    }

    // If local verification fails, validate with auth service
    try {
      const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
      const response = await axios.get(`${authServiceUrl}/api/auth/validate`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 5000
      });

      if (response.data.success && response.data.data.valid) {
        req.user = {
          userId: response.data.data.userId,
          email: response.data.data.email,
          role: response.data.data.role,
          permissions: response.data.data.permissions || []
        };

        logger.debug('Token verified by auth service', { userId: response.data.data.userId });
        return next();
      } else {
        throw new Error('Invalid token response from auth service');
      }
    } catch (authServiceError) {
      const error = authServiceError as Error;
      logger.warn('Auth service validation failed', { 
        error: error.message,
        token: token.substring(0, 10) + '...'
      });

      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Authentication service error'
    });
  }
};

export const optionalAuthMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // No token provided, continue without authentication
  }

  try {
    // Try to verify token locally
    const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';
    const payload = jwt.verify(token, jwtSecret) as any;
    
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions || []
    };

    logger.debug('Optional auth: token verified', { userId: payload.userId });
  } catch (error) {
    const err = error as Error;
    logger.debug('Optional auth: token verification failed', { error: err.message });
    // Continue without setting user
  }

  next();
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    return next();
  };
};

export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: `Permission '${permission}' required`
      });
    }

    return next();
  };
};