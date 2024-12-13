const authMiddleware = require('../../../src/middleware/auth');
const JWTService = require('../../../src/services/JWTService');
const AppError = require('../../../src/utils/AppError');
const TestUtils = require('../../utils/testUtils');

describe('Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
      cookies: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {}
    };
    mockNext = jest.fn();
  });

  describe('authenticate', () => {
    it('should authenticate valid JWT token in Authorization header', async () => {
      const mockUser = TestUtils.generateMockUser();
      const token = await JWTService.generateToken({ userId: mockUser.id });
      mockReq.headers.authorization = `Bearer ${token}`;

      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.id).toBe(mockUser.id);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should authenticate valid JWT token in cookie', async () => {
      const mockUser = TestUtils.generateMockUser();
      const token = await JWTService.generateToken({ userId: mockUser.id });
      mockReq.cookies.token = token;

      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject missing token', async () => {
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AppError)
      );
    });

    it('should reject invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid.token.here';

      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AppError)
      );
    });

    it('should reject expired token', async () => {
      const expiredToken = await JWTService.generateToken(
        { userId: 'test-user' },
        { expiresIn: '0s' }
      );
      mockReq.headers.authorization = `Bearer ${expiredToken}`;

      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AppError)
      );
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'test-user',
        roles: ['USER']
      };
    });

    it('should allow access for user with required role', async () => {
      const middleware = authMiddleware.requireRole('USER');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access for user without required role', async () => {
      const middleware = authMiddleware.requireRole('ADMIN');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AppError)
      );
    });

    it('should handle multiple roles', async () => {
      mockReq.user.roles = ['USER', 'EDITOR'];
      const middleware = authMiddleware.requireRole(['ADMIN', 'EDITOR']);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('requirePermission', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'test-user',
        permissions: ['read:events']
      };
    });

    it('should allow access with required permission', async () => {
      const middleware = authMiddleware.requirePermission('read:events');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access without required permission', async () => {
      const middleware = authMiddleware.requirePermission('write:events');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AppError)
      );
    });

    it('should handle multiple permissions', async () => {
      mockReq.user.permissions = ['read:events', 'write:comments'];
      const middleware = authMiddleware.requirePermission(['read:events', 'delete:events']);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle permissions with wildcards', async () => {
      mockReq.user.permissions = ['events:*'];
      const middleware = authMiddleware.requirePermission('events:read');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('refreshToken', () => {
    it('should refresh valid refresh token', async () => {
      const mockUser = TestUtils.generateMockUser();
      const refreshToken = await JWTService.generateRefreshToken({ userId: mockUser.id });
      mockReq.cookies.refreshToken = refreshToken;

      await authMiddleware.refreshToken(mockReq, mockRes, mockNext);

      expect(mockRes.locals.newAccessToken).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid refresh token', async () => {
      mockReq.cookies.refreshToken = 'invalid.refresh.token';

      await authMiddleware.refreshToken(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AppError)
      );
    });
  });
});