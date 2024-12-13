const responseTimeMetrics = require('../metrics/responseTime');
const memoryMetrics = require('../metrics/memory');
const cpuMetrics = require('../metrics/cpu');
const databaseMetrics = require('../metrics/database');
const config = require('../config');

class MetricsCollector {
  constructor() {
    this.isCollecting = false;
    this.startTime = null;
    this.config = config;
    this.collectors = {
      responseTime: responseTimeMetrics,
      memory: memoryMetrics,
      cpu: cpuMetrics,
      database: databaseMetrics,
    };
  }

  /**
   * Start collecting all metrics
   * @param {Object} options - Collection options
   */
  startCollecting(options = {}) {
    if (this.isCollecting) {
      throw new Error('Metrics collection is already in progress');
    }

    const defaultOptions = {
      duration: this.config.settings.runDuration,
      interval: this.config.settings.samplingInterval,
      warmup: this.config.settings.warmupDuration,
    };

    const settings = { ...defaultOptions, ...options };

    // Start collection for each metric type
    this.collectors.memory.startCollecting(settings.interval);
    this.collectors.cpu.startCollecting(settings.interval);

    this.isCollecting = true;
    this.startTime = Date.now();

    // Set up automatic collection stop
    setTimeout(() => {
      this.stopCollecting();
    }, settings.duration + settings.warmup);

    // Log start of collection
    console.log('Started metrics collection:', {
      startTime: new Date(this.startTime).toISOString(),
      settings,
    });
  }

  /**
   * Stop collecting all metrics
   */
  stopCollecting() {
    if (!this.isCollecting) {
      return;
    }

    // Stop individual collectors
    this.collectors.memory.stopCollecting();
    this.collectors.cpu.stopCollecting();

    this.isCollecting = false;
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    console.log('Stopped metrics collection:', {
      duration: `${duration}ms`,
      endTime: new Date(endTime).toISOString(),
    });
  }

  /**
   * Get comprehensive metrics report
   * @returns {Object} Aggregated metrics data
   */
  getReport() {
    const report = {
      metadata: {
        timestamp: Date.now(),
        duration: this.startTime ? Date.now() - this.startTime : 0,
        isCollecting: this.isCollecting,
      },
      metrics: {
        responseTime: this.collectors.responseTime.getAllStats(),
        memory: this.collectors.memory.getStats(),
        cpu: this.collectors.cpu.getStats(),
        database: this.collectors.database.getStats(),
      },
      analysis: {
        memoryLeaks: this.collectors.memory.getLeakIndicators(),
        cpuHotspots: this.collectors.cpu.getHighUsageIntervals(),
        slowQueries: this.collectors.database.getSlowQueries(),
      },
      thresholdViolations: this.checkThresholdViolations(),
    };

    return report;
  }

  /**
   * Check for threshold violations across all metrics
   * @returns {Object} Threshold violation report
   */
  checkThresholdViolations() {
    const violations = {
      responseTime: [],
      memory: [],
      cpu: [],
      database: [],
    };

    // Check response time thresholds
    const responseTimeStats = this.collectors.responseTime.getAllStats();
    for (const [endpoint, stats] of Object.entries(responseTimeStats)) {
      const threshold = this.config.responseTime.endpoints[endpoint] || 
                       this.config.responseTime.global;
      
      if (stats.p95 > threshold.p95) {
        violations.responseTime.push({
          endpoint,
          metric: 'p95',
          threshold: threshold.p95,
          actual: stats.p95,
        });
      }
    }

    // Check memory thresholds
    const memoryStats = this.collectors.memory.getStats();
    if (memoryStats.process.heapUsed.current > this.config.memory.heapUsed) {
      violations.memory.push({
        metric: 'heapUsed',
        threshold: this.config.memory.heapUsed,
        actual: memoryStats.process.heapUsed.current,
      });
    }

    // Check CPU thresholds
    const cpuStats = this.collectors.cpu.getStats();
    if (cpuStats.total.current > this.config.cpu.combined) {
      violations.cpu.push({
        metric: 'totalUsage',
        threshold: this.config.cpu.combined,
        actual: cpuStats.total.current,
      });
    }

    // Check database thresholds
    const dbStats = this.collectors.database.getStats();
    Object.entries(dbStats.queries).forEach(([type, stats]) => {
      const threshold = this.config.database.queryTime[type];
      if (stats.duration.p95 > threshold.p95) {
        violations.database.push({
          queryType: type,
          metric: 'p95',
          threshold: threshold.p95,
          actual: stats.duration.p95,
        });
      }
    });

    return violations;
  }

  /**
   * Track a specific API request
   * @param {string} endpoint - The API endpoint
   * @param {string} requestId - Unique request identifier
   */
  trackRequest(endpoint, requestId) {
    if (!this.isCollecting) return;
    this.collectors.responseTime.startTiming(endpoint, requestId);
  }

  /**
   * Complete tracking of an API request
   * @param {string} requestId - Unique request identifier
   */
  completeRequest(requestId) {
    if (!this.isCollecting) return;
    this.collectors.responseTime.endTiming(requestId);
  }

  /**
   * Track a database query
   * @param {string} queryId - Unique query identifier
   * @param {string} type - Query type (select, insert, update, delete)
   * @param {string} query - The SQL query
   */
  trackDatabaseQuery(queryId, type, query) {
    if (!this.isCollecting) return;
    this.collectors.database.startQuery(queryId, type, query);
  }

  /**
   * Complete tracking of a database query
   * @param {string} queryId - Unique query identifier
   * @param {boolean} success - Whether the query was successful
   * @param {number} rowCount - Number of rows affected/returned
   */
  completeDatabaseQuery(queryId, success = true, rowCount = 0) {
    if (!this.isCollecting) return;
    this.collectors.database.endQuery(queryId, success, rowCount);
  }

  /**
   * Reset all metrics collectors
   */
  reset() {
    this.stopCollecting();
    this.startTime = null;
    Object.values(this.collectors).forEach(collector => collector.reset());
  }

  /**
   * Get the current collection status
   * @returns {Object} Collection status information
   */
  getStatus() {
    return {
      isCollecting: this.isCollecting,
      startTime: this.startTime,
      duration: this.startTime ? Date.now() - this.startTime : 0,
      collectorStatus: {
        responseTime: !!this.collectors.responseTime.measurements.size,
        memory: !!this.collectors.memory.measurements.length,
        cpu: !!this.collectors.cpu.measurements.length,
        database: !!this.collectors.database.queryMeasurements.size,
      },
    };
  }
}

module.exports = new MetricsCollector();