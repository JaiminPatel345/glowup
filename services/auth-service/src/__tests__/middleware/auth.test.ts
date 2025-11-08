import { Request, Response, NextFunction } from 'express';
import { authenticateToken, optionalAuth, requireRole, requirePermission } from '../../middleware/auth';
import { AuthService } from '../../services/authService';
import { AuthenticatedRequest, JWTPayload } from '../../types';

// Mock AuthService
jest.mock('../../services/authService');
const MockedAuthService = AuthService as jest.MockedClass<typeof AuthService>;

describe('Auth Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock auth service instance
    mockAuthService = new MockedAuthService() as jest.Mocked<AuthService>;
    MockedAuthService.mockImplementation(() => mockAuthService);
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', () => {
      const mockPayload: JWTPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
        permissions: ['read:profile'],
        iat: Date.now(),
        exp: Date.now() + 3600
      };

      mockReq.headers = {
        authorization: 'Bearer valid-token'
      };

      mockAuthService.verifyAccessToken.mockReturnValue(mockPayload);

      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(mockReq.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when no token provided', () => {
      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 for invalid token', () => {
      mockReq.headers = {
        authorization: 'Bearer invalid-token'
      };

      mockAuthService.verifyAccessToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle malformed authorization header', () => {
      mockReq.headers = {
        authorization: 'InvalidFormat'
      };

      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required'
      });
    });
  });

  describe('optionalAuth', () => {
    it('should set user when valid token provided', () => {
      const mockPayload: JWTPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
        permissions: ['read:profile'],
        iat: Date.now(),
        exp: Date.now() + 3600
      };

      mockReq.headers = {
        authorization: 'Bearer valid-token'
      };

      mockAuthService.verifyAccessToken.mockReturnValue(mockPayload);

      optionalAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without user when no token provided', () => {
      optionalAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without user when invalid token provided', () => {
      mockReq.headers = {
        authorization: 'Bearer invalid-token'
      };

      mockAuthService.verifyAccessToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      optionalAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow access for user with required role', () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'admin',
        permissions: [],
        iat: Date.now(),
        exp: Date.now() + 3600
      };

      const middleware = requireRole(['admin', 'user']);
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access for user without required role', () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
        permissions: [],
        iat: Date.now(),
        exp: Date.now() + 3600
      };

      const middleware = requireRole(['admin']);
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user not authenticated', () => {
      const middleware = requireRole(['admin']);
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
    });
  });

  describe('requirePermission', () => {
    it('should allow access for user with required permission', () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
        permissions: ['read:profile', 'write:profile'],
        iat: Date.now(),
        exp: Date.now() + 3600
      };

      const middleware = requirePermission('read:profile');
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access for user without required permission', () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
        permissions: ['read:profile'],
        iat: Date.now(),
        exp: Date.now() + 3600
      };

      const middleware = requirePermission('admin:users');
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Permission 'admin:users' required"
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user not authenticated', () => {
      const middleware = requirePermission('read:profile');
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
    });
  });
});