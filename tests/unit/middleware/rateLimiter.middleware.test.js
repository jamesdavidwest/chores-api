const rateLimiterMiddleware = require('../../../src/middleware/rateLimiter');
const AppError = require('../../../src/utils/AppError');

describe('Rate Limiter Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      ip: '127.0.0.1',
      path: '/api/test',
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('createRateLimiter', () => {
    it('should create rate limiter with default options', () => {
      const limiter = rateLimiterMiddleware.createRateLimiter();
      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should create rate limiter with custom options', () => {
      const limiter = rateLimiterMiddleware.createRateLimiter({
        windowMs: 1000,
        max: 5
      });
      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });
  });

  describe('rateLimiter middleware', () => {
    it('should allow requests within limit', async () => {
      const limiter = rateLimiterMiddleware.createRateLimiter({
        windowMs: 1000,
        max: 5
      });

      // Make multiple requests within limit
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => {
          limiter(mockReq, mockRes, () => {
            expect(mockRes.setHeader).toHaveBeenCalled();
            resolve();
          });
        });
      }
    });

    it('should block requests exceeding limit', async () => {
      const limiter = rateLimiterMiddleware.createRateLimiter({
        windowMs: 1000,
        max: 1
      });

      // First request should pass
      await new Promise((resolve) => {
        limiter(mockReq, mockRes, () => {
          expect(mockRes.setHeader).toHaveBeenCalled();
          resolve();
        });
      });

      // Second request should be blocked
      await new Promise((resolve) => {
        limiter(mockReq, mockRes, (error) => {
          expect(error).toBeInstanceOf(AppError);
          expect(error.statusCode).toBe(429);
          resolve();
        });
      });
    });

    it('should track requests by IP', async () => {
      const limiter = rateLimiterMiddleware.createRateLimiter({
        windowMs: 1000,
        max: 1
      });

      // Request from first IP
      await new Promise((resolve) => {
        limiter({ ...mockReq, ip: '1.1.1.1' }, mockRes, () => {
          expect(mockRes.setHeader).toHaveBeenCalled();
          resolve();
        });
      });

      // Request from second IP should pass
      await new Promise((resolve) => {
        limiter({ ...mockReq, ip: '2.2.2.2' }, mockRes, () => {
          expect(mockRes.setHeader).toHaveBeenCalled();
          resolve();
        });
      });
    });

    it('should respect custom key generator', async () => {
      const limiter = rateLimiterMiddleware.createRateLimiter({
        windowMs: 1000,
        max: 1,
        keyGenerator: (req) => req.headers['x-api-key']
      });

      mockReq.headers['x-api-key'] = 'test-key';

      // First request should pass
      await new Promise((resolve) => {
        limiter(mockReq, mockRes, () => {
          expect(mockRes.setHeader).toHaveBeenCalled();
          resolve();
        });
      });

      // Second request with same API key should be blocked
      await new Promise((resolve) => {
        limiter(mockReq, mockRes, (error) => {
          expect(error).toBeInstanceOf(AppError);
          expect(error.statusCode).toBe(429);
          resolve();
        });
      });
    });

    it('should handle skip function', async () => {
      const limiter = rateLimiterMiddleware.createRateLimiter({
        windowMs: 1000,
        max: 1,
        skip: (req) => req.path.includes('health')
      });

      mockReq.path = '/health';

      // Multiple health check requests should pass
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => {
          limiter(mockReq, mockRes, () => {
            expect(mockRes.setHeader).not.toHaveBeenCalled();
            resolve();
          });
        });
      }
    });

    it('should set proper headers', async () => {
      const limiter = rateLimiterMiddleware.createRateLimiter({
        windowMs: 1000,
        max: 5
      });

      await new Promise((resolve) => {
        limiter(mockReq, mockRes, () => {
          expect(mockRes.setHeader).toHaveBeenCalledWith(
            'X-RateLimit-Limit',
            5
          );
          expect(mockRes.setHeader).toHaveBeenCalledWith(
            'X-RateLimit-Remaining',
            expect.any(Number)
          );
          resolve();
        });
      });
    });
  });
});