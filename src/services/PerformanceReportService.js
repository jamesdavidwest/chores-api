const MetricsCollector = require('../../tests/benchmarks/collectors/MetricsCollector');
const MetricsReporter = require('../../tests/benchmarks/reporters/MetricsReporter');
const logger = require('./LoggerService');
const path = require('path');
const fs = require('fs').promises;

class PerformanceReportService {
  constructor() {
    this.reportSchedule = null;
    this.reportConfig = {
      interval: process.env.PERFORMANCE_REPORT_INTERVAL || 24 * 60 * 60 * 1000, // 24 hours
      formats: ['txt', 'json', 'html'],
      retentionDays: process.env.PERFORMANCE_REPORT_RETENTION || 30,
      alertThresholds: {
        errorRate: 0.05,           // 5% error rate
        slowRequestRate: 0.10,     // 10% slow requests
        memoryUsagePercent: 85,    // 85% memory usage
        cpuUsagePercent: 80,       // 80% CPU usage
      }
    };
  }

  /**
   * Start automated report generation
   */
  startAutomatedReporting() {
    if (this.reportSchedule) {
      this.stopAutomatedReporting();
    }

    this.reportSchedule = setInterval(
      () => this.generateScheduledReport(),
      this.reportConfig.interval
    );

    logger.info('Automated performance reporting started', {
      interval: this.reportConfig.interval,
      formats: this.reportConfig.formats,
      retention: this.reportConfig.retentionDays
    });
  }

  /**
   * Stop automated report generation
   */
  stopAutomatedReporting() {
    if (this.reportSchedule) {
      clearInterval(this.reportSchedule);
      this.reportSchedule = null;
      logger.info('Automated performance reporting stopped');
    }
  }

  /**
   * Generate a scheduled performance report
   */
  async generateScheduledReport() {
    try {
      const metrics = MetricsCollector.getReport();
      const timestamp = new Date().toISOString();

      // Generate reports in all configured formats
      for (const format of this.reportConfig.formats) {
        await MetricsReporter.generateReport(metrics, {
          format,
          filename: `performance_report_${timestamp}`,
          save: true
        });
      }

      // Analyze for concerning patterns
      await this.analyzeMetrics(metrics);

      // Clean up old reports
      await this.cleanupOldReports();

      logger.info('Scheduled performance report generated', {
        timestamp,
        formats: this.reportConfig.formats
      });
    } catch (error) {
      logger.error('Error generating scheduled performance report', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Analyze metrics for concerning patterns
   * @param {Object} metrics - Collected metrics data
   */
  async analyzeMetrics(metrics) {
    const alerts = [];

    // Check error rates
    const totalRequests = Object.values(metrics.metrics.responseTime)
      .reduce((sum, endpoint) => sum + endpoint.count, 0);
    const errorCount = Object.values(metrics.thresholdViolations)
      .flat()
      .length;
    const errorRate = errorCount / totalRequests;

    if (errorRate > this.reportConfig.alertThresholds.errorRate) {
      alerts.push({
        type: 'ERROR_RATE',
        message: `High error rate detected: ${(errorRate * 100).toFixed(2)}%`,
        details: metrics.thresholdViolations
      });
    }

    // Check memory usage
    const memoryStats = metrics.metrics.memory.process;
    const memoryUsagePercent = (memoryStats.heapUsed.current / memoryStats.heapTotal.current) * 100;

    if (memoryUsagePercent > this.reportConfig.alertThresholds.memoryUsagePercent) {
      alerts.push({
        type: 'MEMORY_USAGE',
        message: `High memory usage detected: ${memoryUsagePercent.toFixed(2)}%`,
        details: memoryStats
      });
    }

    // Check CPU usage
    const cpuStats = metrics.metrics.cpu;
    if (cpuStats.total.current > this.reportConfig.alertThresholds.cpuUsagePercent) {
      alerts.push({
        type: 'CPU_USAGE',
        message: `High CPU usage detected: ${cpuStats.total.current.toFixed(2)}%`,
        details: cpuStats
      });
    }

    // Check database performance
    const dbStats = metrics.metrics.database;
    const slowQueries = metrics.analysis.slowQueries;
    if (slowQueries.length > 0) {
      alerts.push({
        type: 'SLOW_QUERIES',
        message: `${slowQueries.length} slow queries detected`,
        details: slowQueries
      });
    }

    // Log alerts if any
    if (alerts.length > 0) {
      logger.warn('Performance concerns detected', { alerts });
      
      // Could integrate with external monitoring systems here
      await this.notifyAlerts(alerts);
    }
  }

  /**
   * Notify relevant parties about performance alerts
   * @param {Array} alerts - List of performance alerts
   */
  async notifyAlerts(alerts) {
    // This could be extended to send notifications via email, Slack, etc.
    try {
      // Create alerts log file
      const alertsDir = path.join(process.cwd(), 'reports', 'alerts');
      await fs.mkdir(alertsDir, { recursive: true });

      const alertsFile = path.join(alertsDir, 
        `alerts_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      );

      await fs.writeFile(
        alertsFile,
        JSON.stringify({ timestamp: new Date(), alerts }, null, 2)
      );

      logger.info('Performance alerts logged', { 
        alertCount: alerts.length,
        alertsFile 
      });
    } catch (error) {
      logger.error('Error logging performance alerts', {
        error: error.message,
        alerts
      });
    }
  }

  /**
   * Clean up old performance reports
   */
  async cleanupOldReports() {
    try {
      const reportsDir = path.join(process.cwd(), 'reports', 'performance');
      const files = await fs.readdir(reportsDir);
      const now = new Date();

      for (const file of files) {
        const filePath = path.join(reportsDir, file);
        const stats = await fs.stat(filePath);
        const daysOld = (now - stats.mtime) / (1000 * 60 * 60 * 24);

        if (daysOld > this.reportConfig.retentionDays) {
          await fs.unlink(filePath);
          logger.debug('Cleaned up old performance report', { file });
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old performance reports', {
        error: error.message
      });
    }
  }

  /**
   * Generate an on-demand performance report
   * @param {Object} options - Report generation options
   */
  async generateOnDemandReport(options = {}) {
    try {
      const metrics = MetricsCollector.getReport();
      
      const report = await MetricsReporter.generateReport(metrics, {
        format: options.format || 'json',
        filename: `on_demand_report_${new Date().toISOString()}`,
        save: options.save !== false
      });

      await this.analyzeMetrics(metrics);

      return report;
    } catch (error) {
      logger.error('Error generating on-demand performance report', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Get performance report configuration
   */
  getConfig() {
    return {
      ...this.reportConfig,
      isReportingActive: !!this.reportSchedule
    };
  }

  /**
   * Update performance report configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.reportConfig = {
      ...this.reportConfig,
      ...newConfig
    };

    // Restart reporting if interval changed
    if (this.reportSchedule) {
      this.startAutomatedReporting();
    }

    logger.info('Performance report configuration updated', this.reportConfig);
  }
}

module.exports = new PerformanceReportService();