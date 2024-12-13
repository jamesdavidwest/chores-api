const { performance } = require('perf_hooks');

class ResponseTimeMetrics {
  constructor() {
    this.measurements = new Map();
    this.inProgress = new Map();
  }

  /**
   * Start timing a request
   * @param {string} endpoint - The API endpoint being called
   * @param {string} requestId - Unique identifier for the request
   */
  startTiming(endpoint, requestId) {
    this.inProgress.set(requestId, {
      endpoint,
      startTime: performance.now(),
    });
  }

  /**
   * End timing a request and record the measurement
   * @param {string} requestId - Unique identifier for the request
   */
  endTiming(requestId) {
    const request = this.inProgress.get(requestId);
    if (!request) return;

    const { endpoint, startTime } = request;
    const duration = performance.now() - startTime;

    if (!this.measurements.has(endpoint)) {
      this.measurements.set(endpoint, []);
    }

    this.measurements.get(endpoint).push(duration);
    this.inProgress.delete(requestId);
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
   * Get statistics for a specific endpoint
   * @param {string} endpoint - The API endpoint
   * @returns {Object} Statistics for the endpoint
   */
  getEndpointStats(endpoint) {
    const measurements = this.measurements.get(endpoint) || [];
    
    if (measurements.length === 0) {
      return {
        count: 0,
        min: 0,
        max: 0,
        mean: 0,
        median: 0,
        p95: 0,
        p99: 0,
      };
    }

    return {
      count: measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      mean: measurements.reduce((a, b) => a + b, 0) / measurements.length,
      median: this.calculatePercentile(measurements, 50),
      p95: this.calculatePercentile(measurements, 95),
      p99: this.calculatePercentile(measurements, 99),
    };
  }

  /**
   * Get statistics for all endpoints
   * @returns {Object} Statistics for all endpoints
   */
  getAllStats() {
    const stats = {};
    for (const [endpoint, _] of this.measurements) {
      stats[endpoint] = this.getEndpointStats(endpoint);
    }
    return stats;
  }

  /**
   * Reset all measurements
   */
  reset() {
    this.measurements.clear();
    this.inProgress.clear();
  }
}

module.exports = new ResponseTimeMetrics();