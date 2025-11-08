import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody, validateParams, validateQuery, validateFile } from '../../middleware/validation';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('validateBody', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().min(0),
    });

    it('should pass validation with valid data', () => {
      mockRequest.body = { name: 'John', age: 25 };

      const middleware = validateBody(testSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid data', () => {
      mockRequest.body = { name: '', age: -1 };

      const middleware = validateBody(testSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: expect.any(String),
          }),
          expect.objectContaining({
            field: 'age',
            message: expect.any(String),
          }),
        ]),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should transform valid data', () => {
      mockRequest.body = { name: 'John', age: '25' }; // age as string

      const transformSchema = z.object({
        name: z.string(),
        age: z.string().transform(Number),
      });

      const middleware = validateBody(transformSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.age).toBe(25); // Should be transformed to number
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle non-Zod errors', () => {
      const errorSchema = {
        parse: () => {
          throw new Error('Non-Zod error');
        },
      } as any;

      const middleware = validateBody(errorSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('validateParams', () => {
    const testSchema = z.object({
      id: z.string().uuid(),
    });

    it('should pass validation with valid params', () => {
      mockRequest.params = { id: '550e8400-e29b-41d4-a716-446655440000' };

      const middleware = validateParams(testSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid params', () => {
      mockRequest.params = { id: 'invalid-uuid' };

      const middleware = validateParams(testSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid parameters',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'id',
            message: expect.any(String),
          }),
        ]),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateQuery', () => {
    const testSchema = z.object({
      page: z.string().transform(Number).pipe(z.number().min(1)),
      limit: z.string().transform(Number).pipe(z.number().min(1).max(100)),
    });

    it('should pass validation with valid query params', () => {
      mockRequest.query = { page: '1', limit: '10' };

      const middleware = validateQuery(testSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.query.page).toBe(1);
      expect(mockRequest.query.limit).toBe(10);
    });

    it('should fail validation with invalid query params', () => {
      mockRequest.query = { page: '0', limit: '101' };

      const middleware = validateQuery(testSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid query parameters',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'page',
            message: expect.any(String),
          }),
          expect.objectContaining({
            field: 'limit',
            message: expect.any(String),
          }),
        ]),
      });
    });
  });

  describe('validateFile', () => {
    const testSchema = z.object({
      mimetype: z.string().refine(type => type.startsWith('image/')),
      size: z.number().max(5 * 1024 * 1024),
    });

    it('should pass validation with valid file', () => {
      mockRequest.file = {
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
      } as any;

      const middleware = validateFile(testSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should fail when no file is uploaded', () => {
      mockRequest.file = undefined;

      const middleware = validateFile(testSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'No file uploaded',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid file', () => {
      mockRequest.file = {
        mimetype: 'application/pdf',
        size: 6 * 1024 * 1024, // Too large
      } as any;

      const middleware = validateFile(testSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid file',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.any(String),
          }),
        ]),
      });
    });
  });

  describe('Error handling', () => {
    it('should handle nested field validation errors', () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(1),
          }),
        }),
      });

      mockRequest.body = {
        user: {
          profile: {
            name: '',
          },
        },
      };

      const middleware = validateBody(nestedSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'user.profile.name',
            message: expect.any(String),
          }),
        ]),
      });
    });

    it('should handle array field validation errors', () => {
      const arraySchema = z.object({
        tags: z.array(z.string().min(1)),
      });

      mockRequest.body = {
        tags: ['valid', '', 'also-valid'],
      };

      const middleware = validateBody(arraySchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'tags.1',
            message: expect.any(String),
          }),
        ]),
      });
    });
  });
});