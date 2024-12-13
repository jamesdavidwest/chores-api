const errorHandler = require('../../../src/middleware/errorHandler');
const AppError = require('../../../src/utils/AppError');

describe('Error Handler Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    // Store original NODE_ENV
    this.originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore original NODE_ENV
    process.env.NODE_ENV = this.originalEnv;
  });

  describe('handleError', () => {
    it('should handle AppError instances', () => {
      const error = new AppError(400, 'VALIDATION_ERROR', 'Invalid input');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input'
        }
      });
    });

    it('should handle validation errors', () => {
      const error = new Error('Validation error');
      error.name = 'ValidationError';
      error.details = [{ message: 'Field is required' }];

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.details
        }
      });
    });

    it('should handle database errors', () => {
      const error = new Error('Database error');
      error.code = 'SQLITE_CONSTRAINT';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Database operation failed'
        }
      });
    });

    it('should handle JWT errors', () => {
      const error = new Error('jwt expired');
      error.name = 'JsonWebTokenError';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token'
        }
      });
    });

    it('should handle unknown errors in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Some internal error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      });
    });

    it('should include error details in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Detailed error message');
      error.stack = 'Error stack trace';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Detailed error message',
          stack: 'Error stack trace'
        }
      });
    });

    it('should handle async errors', async () => {
      const asyncError = new AppError(503, 'SERVICE_UNAVAILABLE', 'Service temporarily unavailable');

      await errorHandler(asyncError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service temporarily unavailable'
        }
      });
    });

    it('should handle rate limit errors', () => {
      const error = new Error('Too many requests');
      error.status = 429;

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later'
        }
      });
    });

    it('should handle file upload errors', () => {
      const error = new Error('File too large');
      error.code = 'LIMIT_FILE_SIZE';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds limit'
        }
      });
    });
  });
});