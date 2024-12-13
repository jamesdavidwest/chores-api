const { performance } = require('perf_hooks');

class DatabaseMetrics {
  constructor() {
    this.queryMeasurements = new Map();
    this.connectionStats = {
      total: 0,
      active: 0,
      idle: 0,
      acquired: new Map(),
      released: new Map(),
    };
    this.poolStats = {
      acquireTime: [],
      idleTime: new Map(),
    };
  }

  /**
   * Start timing a database query
   * @param {string} queryId - Unique identifier for the query
   * @param {string} type - Type of query (select, insert, update, delete)
   * @param {string} query - The SQL query being executed
   */
  startQuery(queryId, type, query) {
    this.queryMeasurements.set(queryId, {
      type,
      query,
      startTime: performance.now(),
    });
  }

  /**
   * End timing a database query
   * @param {string} queryId - Unique identifier for the query
   * @param {boolean} success - Whether the query was successful
   * @param {number} rowCount - Number of rows affected/returned
   */
  endQuery(queryId, success = true, rowCount = 0) {
    const query = this.queryMeasurements.get(queryId);
    if (!query) return;

    const duration = performance.now() - query.startTime;
    const { type } = query;

    if (!this.queryMeasurements.has(type)) {
      this.queryMeasurements.set(type, []);
    }

    this.queryMeasurements.get(type).push({
      duration,
      success,
      rowCount,
      query: query.query,
      timestamp: Date.now(),
    });

    this.queryMeasurements.delete(queryId);
  }

  /**
   * Track connection acquisition
   * @param {string} connectionId - Unique identifier for the connection
   */
  acquireConnection(connectionId) {
    this.connectionStats.active++;
    this.connectionStats.total = Math.max(
      this.connectionStats.total,
      this.connectionStats.active
    );
    this.connectionStats.acquired.set(connectionId, performance.now());
  }

  /**
   * Track connection release
   * @param {string} connectionId - Unique identifier for the connection
   */
  releaseConnection(connectionId) {
    const acquireTime = this.connectionStats.acquired.get(connectionId);
    if (acquireTime) {
      const duration = performance.now() - acquireTime;
      this.poolStats.acquireTime.push(duration);
      this.connectionStats.acquired.delete(connectionId);
    }

    this.connectionStats.active--;
    this.connectionStats.idle++;
    this.connectionStats.released.set(connectionId, performance.now());
  }

  /**
   * Calculate percentile value from an array of measurements
   * @param {number[]} values - Array of measurements
   * @param {number} percentile - Percentile to calculate (0-100)
   * @returns {number} The calculated percentile value
   */
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Get statistics for a specific query type
   * @param {string} type - The query type
   * @returns {Object} Statistics for the query type
   */
  getQueryTypeStats(type) {
    const measurements = this.queryMeasurements.get(type) || [];
    const durations = measurements.map(m => m.duration);
    
    return {
      count: measurements.length,
      successRate: measurements.filter(m => m.success).length / measurements.length,
      duration: {
        min: Math.min(...durations),
        max: Math.max(...durations),
        mean: durations.reduce((a, b) => a + b, 0) / durations.length,
        median: this.calculatePercentile(durations, 50),
        p95: this.calculatePercentile(durations, 95),
        p99: this.calculatePercentile(durations, 99),
      },
      rowCounts: {
        total: measurements.reduce((acc, m) => acc + m.rowCount, 0),
        average: measurements.reduce((acc, m) => acc + m.rowCount, 0) / measurements.length,
      },
    };
  }

  /**
   * Get comprehensive database statistics
   * @returns {Object} Database statistics
   */
  getStats() {
    return {
      queries: {
        select: this.getQueryTypeStats('select'),
        insert: this.getQueryTypeStats('insert'),
        update: this.getQueryTypeStats('update'),
        delete: this.getQueryTypeStats('delete'),
      },
      connections: {
        total: this.connectionStats.total,
        active: this.connectionStats.active,
        idle: this.connectionStats.idle,
        utilization: this.connectionStats.active / this.connectionStats.total,
      },
      pooling: {
        acquireTime: {
          average: this.poolStats.acquireTime.reduce((a, b) => a + b, 0) / 
                  this.poolStats.acquireTime.length,
          p95: this.calculatePercentile(this.poolStats.acquireTime, 95),
          p99: this.calculatePercentile(this.poolStats.acquireTime, 99),
        },
      },
      slowQueries: this.getSlowQueries(),
    };
  }

  /**
   * Get slow queries (above 95th percentile)
   * @returns {Array} Slow queries with their details
   */
  getSlowQueries() {
    const slowQueries = [];
    
    for (const [type, measurements] of Object.entries(this.queryMeasurements)) {
      const durations = measurements.map(m => m.duration);
      const p95 = this.calculatePercentile(durations, 95);
      
      const slow = measurements
        .filter(m => m.duration > p95)
        .map(m => ({
          type,
          duration: m.duration,
          query: m.query,
          timestamp: m.timestamp,
          rowCount: m.rowCount,
        }));
      
      slowQueries.push(...slow);
    }

    return slowQueries.sort((a, b) => b.duration - a.duration);
  }

  /**
   * Reset all measurements
   */
  reset() {
    this.queryMeasurements.clear();
    this.connectionStats = {
      total: 0,
      active: 0,
      idle: 0,
      acquired: new Map(),
      released: new Map(),
    };
    this.poolStats = {
      acquireTime: [],
      idleTime: new Map(),
    };
  }
}

module.exports = new DatabaseMetrics();