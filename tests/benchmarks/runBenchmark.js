const MetricsCollector = require('./collectors/MetricsCollector');
const MetricsReporter = require('./reporters/MetricsReporter');

async function runBenchmark() {
  try {
    // Start collecting metrics
    MetricsCollector.startCollecting({
      duration: 5 * 60 * 1000, // 5 minutes
      interval: 1000,          // 1 second sampling
      warmup: 30 * 1000       // 30 seconds warmup
    });

    console.log('Benchmark started. Running for 5 minutes...');

    // Example of tracking a specific request
    const requestId = 'test-request-1';
    MetricsCollector.trackRequest('/api/events', requestId);
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    MetricsCollector.completeRequest(requestId);

    // Example of tracking a database query
    const queryId = 'test-query-1';
    MetricsCollector.trackDatabaseQuery(
      queryId,
      'select',
      'SELECT * FROM events WHERE status = ?'
    );
    
    // Simulate query execution time
    await new Promise(resolve => setTimeout(resolve, 50));
    
    MetricsCollector.completeDatabaseQuery(queryId, true, 10);

    // Wait for collection to complete
    await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));

    // Get the metrics report
    const report = MetricsCollector.getReport();

    // Generate reports in different formats
    await MetricsReporter.generateReport(report, { format: 'txt' });
    await MetricsReporter.generateReport(report, { format: 'json' });
    await MetricsReporter.generateReport(report, { format: 'html' });

    // Stop collecting
    MetricsCollector.stopCollecting();
    
    console.log('Benchmark completed. Reports generated in /reports/performance/');
  } catch (error) {
    console.error('Error running benchmark:', error);
    MetricsCollector.stopCollecting();
  }
}

// Add middleware usage example
function performanceMiddleware() {
  return (req, res, next) => {
    const requestId = req.id || Math.random().toString(36).substring(7);
    const endpoint = `${req.method} ${req.route.path}`;

    // Start tracking the request
    MetricsCollector.trackRequest(endpoint, requestId);

    // Track response
    const end = res.end;
    res.end = function(...args) {
      // Complete the request tracking
      MetricsCollector.completeRequest(requestId);
      end.apply(res, args);
    };

    next();
  };
}

// Add database query wrapper example
function wrapDatabaseQuery(query, type, queryString) {
  return async (...args) => {
    const queryId = Math.random().toString(36).substring(7);
    
    MetricsCollector.trackDatabaseQuery(queryId, type, queryString);
    
    try {
      const result = await query(...args);
      const rowCount = Array.isArray(result) ? result.length : 
                      (result.rowCount || 0);
      
      MetricsCollector.completeDatabaseQuery(queryId, true, rowCount);
      return result;
    } catch (error) {
      MetricsCollector.completeDatabaseQuery(queryId, false, 0);
      throw error;
    }
  };
}

// Example usage of database wrapper
const wrappedQuery = wrapDatabaseQuery(
  async () => { /* actual database query */ },
  'select',
  'SELECT * FROM users WHERE id = ?'
);

// Add test suite example
function benchmarkTestSuite() {
  return {
    async beforeAll() {
      MetricsCollector.reset();
      MetricsCollector.startCollecting();
    },

    async afterAll() {
      MetricsCollector.stopCollecting();
      const report = MetricsCollector.getReport();
      await MetricsReporter.generateReport(report, {
        filename: 'test_suite_performance',
        format: 'txt'
      });
    },

    async beforeEach() {
      // Reset any per-test metrics if needed
    },

    async afterEach() {
      // Collect per-test metrics if needed
    }
  };
}

// Export all utilities
module.exports = {
  runBenchmark,
  performanceMiddleware,
  wrapDatabaseQuery,
  benchmarkTestSuite
};