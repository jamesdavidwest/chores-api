const v8 = require('v8');

class MemoryMetrics {
  constructor() {
    this.measurements = [];
    this.interval = null;
  }

  /**
   * Start collecting memory measurements
   * @param {number} interval - Collection interval in milliseconds
   */
  startCollecting(interval = 1000) {
    if (this.interval) {
      this.stopCollecting();
    }

    this.interval = setInterval(() => {
      const heapStats = v8.getHeapStatistics();
      const memoryUsage = process.memoryUsage();
      
      this.measurements.push({
        timestamp: Date.now(),
        heap: {
          total: heapStats.total_heap_size / 1024 / 1024, // MB
          used: heapStats.used_heap_size / 1024 / 1024,   // MB
          limit: heapStats.heap_size_limit / 1024 / 1024,  // MB
        },
        process: {
          rss: memoryUsage.rss / 1024 / 1024,            // MB
          heapTotal: memoryUsage.heapTotal / 1024 / 1024, // MB
          heapUsed: memoryUsage.heapUsed / 1024 / 1024,   // MB
          external: memoryUsage.external / 1024 / 1024,    // MB
        },
        v8: {
          physical: heapStats.total_physical_size / 1024 / 1024,    // MB
          available: heapStats.total_available_size / 1024 / 1024,  // MB
        },
      });
    }, interval);
  }

  /**
   * Stop collecting measurements
   */
  stopCollecting() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Calculate statistics for a specific metric
   * @param {string} metric - The metric to calculate stats for
   * @returns {Object} Statistics for the metric
   */
  calculateStats(metric) {
    const values = this.measurements.map(m => {
      const [category, subMetric] = metric.split('.');
      return m[category][subMetric];
    });

    return {
      current: values[values.length - 1] || 0,
      min: Math.min(...values),
      max: Math.max(...values),
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      measurements: values.length,
    };
  }

  /**
   * Get comprehensive memory statistics
   * @returns {Object} Memory statistics
   */
  getStats() {
    return {
      heap: {
        total: this.calculateStats('heap.total'),
        used: this.calculateStats('heap.used'),
        limit: this.calculateStats('heap.limit'),
      },
      process: {
        rss: this.calculateStats('process.rss'),
        heapTotal: this.calculateStats('process.heapTotal'),
        heapUsed: this.calculateStats('process.heapUsed'),
        external: this.calculateStats('process.external'),
      },
      v8: {
        physical: this.calculateStats('v8.physical'),
        available: this.calculateStats('v8.available'),
      },
      metadata: {
        measurementCount: this.measurements.length,
        startTime: this.measurements[0]?.timestamp,
        endTime: this.measurements[this.measurements.length - 1]?.timestamp,
      },
    };
  }

  /**
   * Reset all measurements
   */
  reset() {
    this.stopCollecting();
    this.measurements = [];
  }

  /**
   * Get memory leak indicators
   * @returns {Object} Memory leak analysis
   */
  getLeakIndicators() {
    if (this.measurements.length < 10) {
      return { hasLeakIndicators: false, message: 'Insufficient data' };
    }

    const heapUsed = this.measurements.map(m => m.process.heapUsed);
    const timeWindows = Math.floor(heapUsed.length / 10);
    const windowAverages = [];

    for (let i = 0; i < timeWindows; i++) {
      const start = i * 10;
      const window = heapUsed.slice(start, start + 10);
      windowAverages.push(window.reduce((a, b) => a + b, 0) / window.length);
    }

    const increasingTrend = windowAverages.every((avg, i) => {
      if (i === 0) return true;
      return avg > windowAverages[i - 1];
    });

    const growthRate = increasingTrend ? 
      (windowAverages[windowAverages.length - 1] - windowAverages[0]) / windowAverages[0] : 0;

    return {
      hasLeakIndicators: increasingTrend && growthRate > 0.1,
      growthRate: growthRate * 100, // as percentage
      message: increasingTrend && growthRate > 0.1 
        ? 'Potential memory leak detected'
        : 'No significant memory leak indicators',
    };
  }
}

module.exports = new MemoryMetrics();