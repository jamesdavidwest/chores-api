const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/AppError');
const { config } = require('../config/auth');

class JWTService {
  constructor() {
    // These should be set in your environment variables
    this.accessTokenSecret = process.env.JWT_SECRET || config.jwt.secret;
    this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || config.jwt.refreshSecret;
    this.accessTokenExpiry = process.env.JWT_EXPIRY || '1h';
    this.refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || '7d';
  }

  generateAccessToken(payload) {
    try {
      return jwt.sign(
        { ...payload, type: 'access' },
        this.accessTokenSecret,
        { expiresIn: this.accessTokenExpiry }
      );
    } catch (error) {
      throw new AppError(500, 'AUTH001', 'Failed to generate access token', error);
    }
  }

  generateRefreshToken(payload) {
    try {
      return jwt.sign(
        { ...payload, type: 'refresh' },
        this.refreshTokenSecret,
        { expiresIn: this.refreshTokenExpiry }
      );
    } catch (error) {
      throw new AppError(500, 'AUTH002', 'Failed to generate refresh token', error);
    }
  }

  verifyToken(token, type) {
    try {
      const secret = type === 'access' ? this.accessTokenSecret : this.refreshTokenSecret;
      const decoded = jwt.verify(token, secret);
      
      if (decoded.type !== type) {
        throw new AppError(401, 'AUTH003', `Invalid token type. Expected ${type} token.`);
      }
      
      return decoded;
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      if (error.name === 'TokenExpiredError') {
        throw new AppError(401, 'AUTH004', `${type} token has expired`);
      }
      
      throw new AppError(401, 'AUTH005', `Invalid ${type} token`, error);
    }
  }

  generateTokenPair(payload) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }

  refreshAccessToken(refreshToken) {
    const decoded = this.verifyToken(refreshToken, 'refresh');
    const { userId, instanceId, roles } = decoded;
    
    return this.generateTokenPair({ userId, instanceId, roles });
  }
}

const jwtService = new JWTService();
module.exports = jwtService;