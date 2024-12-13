const jwt = require('jsonwebtoken');
const jwtService = require('../../../src/services/JWTService');
const { AppError } = require('../../../src/utils/AppError');

// Mock jwt module
jest.mock('jsonwebtoken');

describe('JWTService', () => {
  const mockPayload = {
    userId: '123',
    instanceId: '456',
    roles: ['user']
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const mockToken = 'mock.access.token';
      jwt.sign.mockReturnValue(mockToken);

      const token = jwtService.generateAccessToken(mockPayload);

      expect(token).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        { ...mockPayload, type: 'access' },
        jwtService.accessTokenSecret,
        { expiresIn: jwtService.accessTokenExpiry }
      );
    });

    it('should throw AppError when token generation fails', () => {
      jwt.sign.mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      expect(() => jwtService.generateAccessToken(mockPayload))
        .toThrow(AppError);
      expect(() => jwtService.generateAccessToken(mockPayload))
        .toThrow('Failed to generate access token');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const mockToken = 'mock.refresh.token';
      jwt.sign.mockReturnValue(mockToken);

      const token = jwtService.generateRefreshToken(mockPayload);

      expect(token).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        { ...mockPayload, type: 'refresh' },
        jwtService.refreshTokenSecret,
        { expiresIn: jwtService.refreshTokenExpiry }
      );
    });

    it('should throw AppError when token generation fails', () => {
      jwt.sign.mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      expect(() => jwtService.generateRefreshToken(mockPayload))
        .toThrow(AppError);
      expect(() => jwtService.generateRefreshToken(mockPayload))
        .toThrow('Failed to generate refresh token');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid access token', () => {
      const mockDecoded = { ...mockPayload, type: 'access' };
      jwt.verify.mockReturnValue(mockDecoded);

      const decoded = jwtService.verifyToken('valid.token', 'access');

      expect(decoded).toEqual(mockDecoded);
      expect(jwt.verify).toHaveBeenCalledWith('valid.token', jwtService.accessTokenSecret);
    });

    it('should verify a valid refresh token', () => {
      const mockDecoded = { ...mockPayload, type: 'refresh' };
      jwt.verify.mockReturnValue(mockDecoded);

      const decoded = jwtService.verifyToken('valid.token', 'refresh');

      expect(decoded).toEqual(mockDecoded);
      expect(jwt.verify).toHaveBeenCalledWith('valid.token', jwtService.refreshTokenSecret);
    });

    it('should throw AppError when token type mismatches', () => {
      jwt.verify.mockReturnValue({ ...mockPayload, type: 'refresh' });

      expect(() => jwtService.verifyToken('valid.token', 'access'))
        .toThrow(AppError);
      expect(() => jwtService.verifyToken('valid.token', 'access'))
        .toThrow('Invalid token type. Expected access token.');
    });

    it('should throw AppError when token is expired', () => {
      jwt.verify.mockImplementation(() => {
        const error = new Error('TokenExpiredError');
        error.name = 'TokenExpiredError';
        throw error;
      });

      expect(() => jwtService.verifyToken('expired.token', 'access'))
        .toThrow(AppError);
      expect(() => jwtService.verifyToken('expired.token', 'access'))
        .toThrow('access token has expired');
    });

    it('should throw AppError for invalid token', () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => jwtService.verifyToken('invalid.token', 'access'))
        .toThrow(AppError);
      expect(() => jwtService.verifyToken('invalid.token', 'access'))
        .toThrow('Invalid access token');
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const mockAccessToken = 'mock.access.token';
      const mockRefreshToken = 'mock.refresh.token';
      
      jwt.sign
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const tokens = jwtService.generateTokenPair(mockPayload);

      expect(tokens).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken
      });
      expect(jwt.sign).toHaveBeenCalledTimes(2);
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new token pair from valid refresh token', () => {
      const mockDecoded = { 
        ...mockPayload, 
        type: 'refresh'
      };
      const mockNewAccessToken = 'new.access.token';
      const mockNewRefreshToken = 'new.refresh.token';

      jwt.verify.mockReturnValue(mockDecoded);
      jwt.sign
        .mockReturnValueOnce(mockNewAccessToken)
        .mockReturnValueOnce(mockNewRefreshToken);

      const tokens = jwtService.refreshAccessToken('valid.refresh.token');

      expect(tokens).toEqual({
        accessToken: mockNewAccessToken,
        refreshToken: mockNewRefreshToken
      });
      expect(jwt.verify).toHaveBeenCalledWith('valid.refresh.token', jwtService.refreshTokenSecret);
    });

    it('should throw AppError when refresh token is invalid', () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => jwtService.refreshAccessToken('invalid.refresh.token'))
        .toThrow(AppError);
      expect(() => jwtService.refreshAccessToken('invalid.refresh.token'))
        .toThrow('Invalid refresh token');
    });
  });
});
