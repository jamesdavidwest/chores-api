const jwtService = require('../services/JWTService');
const { AppError } = require('../utils/AppError');
const { config } = require('../config/auth');

const extractToken = (req) => {
  const authHeader = req.headers[config.tokens.accessTokenHeader.toLowerCase()];
  if (!authHeader) {
    throw new AppError(401, 'AUTH006', 'No authorization header found');
  }

  const [bearer, token] = authHeader.split(' ');
  if (bearer !== config.tokens.bearerPrefix || !token) {
    throw new AppError(401, 'AUTH007', 'Invalid authorization header format');
  }

  return token;
};

const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    const decoded = jwtService.verifyToken(token, 'access');

    // Add user info to request object
    req.user = {
      userId: decoded.userId,
      instanceId: decoded.instanceId,
      roles: decoded.roles || [],
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Optional authentication - doesn't throw error if no token present
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers[config.tokens.accessTokenHeader.toLowerCase()];
    if (!authHeader) {
      return next();
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== config.tokens.bearerPrefix || !token) {
      return next();
    }

    const decoded = jwtService.verifyToken(token, 'access');
    req.user = {
      userId: decoded.userId,
      instanceId: decoded.instanceId,
      roles: decoded.roles || [],
    };

    next();
  } catch (error) {
    // If token is invalid, proceed without user info
    next();
  }
};

// Role-based authentication middleware factory
const requireRoles = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError(401, 'AUTH008', 'Authentication required');
    }

    const hasRequiredRole = roles.some((role) => req.user.roles.includes(role));
    if (!hasRequiredRole) {
      throw new AppError(403, 'AUTH009', 'Insufficient permissions');
    }

    next();
  };
};

// Instance-based authentication middleware
const requireInstance = (req, res, next) => {
  if (!req.user?.instanceId) {
    throw new AppError(401, 'AUTH010', 'Instance access required');
  }
  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  requireRoles,
  requireInstance,
};
