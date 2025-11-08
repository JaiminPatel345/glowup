import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { logger } from '../config/logger';

const authService = new AuthService();

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    const response: ApiResponse = {
      success: false,
      error: 'Access token required'
    };
    res.status(401).json(response);
    return;
  }

  try {
    const payload = authService.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    logger.warn('Invalid token attempt', { token: token.substring(0, 10) + '...', error: error instanceof Error ? error.message : 'Unknown error' });
    const response: ApiResponse = {
      success: false,
      error: 'Invalid or expired token'
    };
    res.status(403).json(response);
    return;
  }
};

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const payload = authService.verifyAccessToken(token);
      req.user = payload;
    } catch (error) {
      // Token is invalid but we don't fail the request
      logger.debug('Optional auth failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  next();
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'Authentication required'
      };
      res.status(401).json(response);
      return;
    }

    if (!roles.includes(req.user.role)) {
      const response: ApiResponse = {
        success: false,
        error: 'Insufficient permissions'
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
};

export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'Authentication required'
      };
      res.status(401).json(response);
      return;
    }

    if (!req.user.permissions.includes(permission)) {
      const response: ApiResponse = {
        success: false,
        error: `Permission '${permission}' required`
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
};