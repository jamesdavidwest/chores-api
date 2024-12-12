const rateLimit = require('express-rate-limit');
const { AppError } = require('../utils/AppError');

// Create different rate limiters for different purposes
const createRateLimiter = (options = {}) => {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000, // Default: 15 minutes
        max: options.max || 100, // Default: 100 requests per windowMs
        message: {
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests, please try again later.'
            }
        },
        // Optional: use Redis or another store for distributed systems
        // store: new RedisStore({
        //     redis: redisClient
        // }),
        ...options
    });
};

// General API rate limiter
const apiLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// More strict limiter for authentication routes
const authLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit each IP to 5 failed authentication attempts per hour
    skipSuccessfulRequests: true // don't count successful requests
});

// Even stricter limiter for sensitive operations
const sensitiveOpLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3 // limit each IP to 3 requests per hour
});

module.exports = {
    apiLimiter,
    authLimiter,
    sensitiveOpLimiter,
    createRateLimiter
};