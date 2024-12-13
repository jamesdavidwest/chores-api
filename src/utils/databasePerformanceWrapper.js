const MetricsCollector = require('../../tests/benchmarks/collectors/MetricsCollector');
const logger = require('../services/LoggerService');
const { v4: uuidv4 } = require('uuid');

/**
 * Wraps database methods to collect performance metrics
 * @param {Object} dbInstance - Database instance to wrap
 * @returns {Object} Wrapped database instance
 */
function wrapDatabase(dbInstance) {
  const wrapped = {};
  const SLOW_QUERY_THRESHOLD = process.env.SLOW_QUERY_THRESHOLD || 100;

  /**
   * Wraps a database method with performance monitoring
   * @param {Function} method - Database method to wrap
   * @param {string} methodName - Name of the method
   * @returns {Function} Wrapped method
   */
  function wrapMethod(method, methodName) {
    return async function (...args) {
      const queryId = uuidv4();
      const queryType = methodName.toLowerCase();
      const query = args[0]; // Assuming first argument is the query string
      
      MetricsCollector.trackDatabaseQuery(queryId, queryType, query);
      const startTime = process.hrtime();

      try {
        const result = await method.apply(this, args);
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds

        // Determine row count based on result type
        const rowCount = Array.isArray(result) ? result.length : 
                        (result.rowCount || result.changes || 0);

        MetricsCollector.completeDatabaseQuery(queryId, true, rowCount);

        // Log slow queries
        if (duration > SLOW_QUERY_THRESHOLD) {
          logger.warn('Slow query detected', {
            queryId,
            type: queryType,
            duration,
            query: typeof query === 'string' ? query : 'Complex Query Object',
            rowCount,
          });
        }

        // Log query metrics
        logger.debug('Query completed', {
          queryId,
          type: queryType,
          duration,
          rowCount,
        });

        return result;
      } catch (error) {
        MetricsCollector.completeDatabaseQuery(queryId, false, 0);
        
        logger.error('Query error', {
          queryId,
          type: queryType,
          error: error.message,
          query: typeof query === 'string' ? query : 'Complex Query Object',
        });

        throw error;
      }
    };
  }

  // Wrap common database methods
  const methodsToWrap = [
    'query',
    'insert',
    'update',
    'delete',
    'select',
    'transaction',
  ];

  methodsToWrap.forEach(method => {
    if (typeof dbInstance[method] === 'function') {
      wrapped[method] = wrapMethod(dbInstance[method], method);
    }
  });

  // Special handling for transactions
  if (typeof dbInstance.transaction === 'function') {
    wrapped.transaction = async function (...args) {
      const transactionId = uuidv4();
      const startTime = process.hrtime();

      logger.debug('Transaction started', { transactionId });

      try {
        const result = await dbInstance.transaction.apply(this, args);
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const duration = seconds * 1000 + nanoseconds / 1000000;

        logger.debug('Transaction completed', {
          transactionId,
          duration,
        });

        return result;
      } catch (error) {
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const duration = seconds * 1000 + nanoseconds / 1000000;

        logger.error('Transaction error', {
          transactionId,
          duration,
          error: error.message,
        });

        throw error;
      }
    };
  }

  // Handle connection pool metrics if available
  if (dbInstance.pool) {
    // Monitor pool status periodically
    setInterval(() => {
      const poolStats = {
        total: dbInstance.pool.size,
        active: dbInstance.pool.acquired,
        idle: dbInstance.pool.available,
        pending: dbInstance.pool.pending,
      };

      if (poolStats.pending > 0) {
        logger.warn('Database pool has pending connections', poolStats);
      }

      logger.debug('Pool status', poolStats);
    }, 60000); // Check every minute
  }

  return wrapped;
}

module.exports = wrapDatabase;