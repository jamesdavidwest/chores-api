const validationMiddleware = require('../../../src/middleware/validation');
const AppError = require('../../../src/utils/AppError');
const Joi = require('joi');

describe('Validation Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('validateBody', () => {
    const schema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().integer().min(0)
    });

    it('should pass valid request body', () => {
      mockReq.body = {
        name: 'Test User',
        age: 25
      };

      validationMiddleware.validateBody(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject invalid request body', () => {
      mockReq.body = {
        name: '',
        age: -1
      };

      validationMiddleware.validateBody(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AppError)
      );
    });

    it('should handle missing required fields', () => {
      mockReq.body = {
        age: 25
      };

      validationMiddleware.validateBody(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AppError)
      );
    });
  });

  describe('validateQuery', () => {
    const schema = Joi.object({
      page: Joi.number().integer().min(1),
      limit: Joi.number().integer().min(1).max(100),
      sort: Joi.string().valid('asc', 'desc')
    });

    it('should pass valid query parameters', () => {
      mockReq.query = {
        page: 1,
        limit: 10,
        sort: 'asc'
      };

      validationMiddleware.validateQuery(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject invalid query parameters', () => {
      mockReq.query = {
        page: 0,
        limit: 1000,
        sort: 'invalid'
      };

      validationMiddleware.validateQuery(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AppError)
      );
    });

    it('should apply default values', () => {
      const schemaWithDefaults = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10)
      });

      mockReq.query = {};

      validationMiddleware.validateQuery(schemaWithDefaults)(mockReq, mockRes, mockNext);

      expect(mockReq.query).toEqual({
        page: 1,
        limit: 10
      });
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validateParams', () => {
    const schema = Joi.object({
      id: Joi.string().uuid().required()
    });

    it('should pass valid parameters', () => {
      mockReq.params = {
        id: '123e4567-e89b-12d3-a456-426614174000'
      };

      validationMiddleware.validateParams(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject invalid parameters', () => {
      mockReq.params = {
        id: 'invalid-uuid'
      };

      validationMiddleware.validateParams(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AppError)
      );
    });
  });

  describe('validateFile', () => {
    const schema = Joi.object({
      mimetype: Joi.string().valid('image/jpeg', 'image/png').required(),
      size: Joi.number().max(5 * 1024 * 1024) // 5MB
    });

    it('should pass valid file', () => {
      mockReq.file = {
        mimetype: 'image/jpeg',
        size: 1024 * 1024 // 1MB
      };

      validationMiddleware.validateFile(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject invalid file type', () => {
      mockReq.file = {
        mimetype: 'text/plain',
        size: 1024
      };

      validationMiddleware.validateFile(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AppError)
      );
    });

    it('should reject file exceeding size limit', () => {
      mockReq.file = {
        mimetype: 'image/jpeg',
        size: 10 * 1024 * 1024 // 10MB
      };

      validationMiddleware.validateFile(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AppError)
      );
    });
  });
});