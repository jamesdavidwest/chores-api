const MetricsCollector = require('../../tests/benchmarks/collectors/MetricsCollector');
const { v4: uuidv4 } = require('uuid');
const logger = require('../services/LoggerService');

/**
 * Performance monitoring middleware
 * Tracks request/response metrics and integrates with the metrics collection system
 */
function performanceMonitor() {
  // Start metrics collection if not already running
  if (!MetricsCollector.getStatus().isCollecting) {
    MetricsCollector.startCollecting();
    logger.info('Performance metrics collection started');
  }

  return (req, res, next) => {
    // Generate unique request ID if not exists
    const requestId = req.id || uuidv4();
    req.id = requestId;

    // Get normalized route path (replace params with :param)
    const route = req.route?.path || req.path;
    const normalizedPath = route.replace(/\/[^\/]+/g, '/:param');
    const endpoint = `${req.method} ${normalizedPath}`;

    // Start timing the request
    MetricsCollector.trackRequest(endpoint, requestId);

    // Track response
    const startTime = process.hrtime();

    // Capture response metrics
    res.on('finish', () => {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds

      MetricsCollector.completeRequest(requestId);

      // Log slow requests
      if (duration > process.env.SLOW_REQUEST_THRESHOLD || 1000) {
        logger.warn('Slow request detected', {
          requestId,
          endpoint,
          duration,
          method: req.method,
          path: req.path,
          status: res.statusCode,
        });
      }

      // Log request metrics
      logger.debug('Request completed', {
        requestId,
        endpoint,
        duration,
        method: req.method,
        path: req.path,
        status: res.statusCode,
      });
    });

    // Monitor event loop lag
    const lagCheck = setInterval(() => {
      const start = Date.now();
      setImmediate(() => {
        const duration = Date.now() - start;
        if (duration > 100) { // More than 100ms lag
          logger.warn('Event loop lag detected', {
            requestId,
            endpoint,
            lag: duration,
          });
        }
      });
    }, 500);

    // Clear interval when response is sent
    res.on('finish', () => clearInterval(lagCheck));

    next();
  };
}

module.exports = performanceMonitor;