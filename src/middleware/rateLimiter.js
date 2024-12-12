const rateLimit = require("express-rate-limit");
const { ErrorTypes } = require("../utils/errorTypes");
const AppError = require("../utils/AppError");

// Create different rate limiters for different purposes
const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // Default: 15 minutes
    max: options.max || 100, // Default: 100 requests per windowMs
    handler: (req, res) => {
      const error = new AppError(
        ErrorTypes.RATE_LIMIT_EXCEEDED,
        "RateLimiter",
        "handler",
        {
          ip: req.ip,
          endpoint: req.originalUrl,
          window: options.windowMs / 1000 / 60 + " minutes",
          limit: options.max,
        }
      );

      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    },
    // Optional: use Redis or another store for distributed systems
    // store: new RedisStore({
    //     redis: redisClient
    // }),
    ...options,
  });
};

// General API rate limiter
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

// More strict limiter for authentication routes
const authLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 failed authentication attempts per hour
  skipSuccessfulRequests: true, // don't count successful requests
});

// Even stricter limiter for sensitive operations
const sensitiveOpLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 requests per hour
});

module.exports = {
  apiLimiter,
  authLimiter,
  sensitiveOpLimiter,
  createRateLimiter,
};
