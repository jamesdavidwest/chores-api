const fs = require('fs').promises;
const path = require('path');

class MetricsReporter {
  /**
   * Format metrics data into a readable report
   * @param {Object} metricsData - Raw metrics data
   * @returns {string} Formatted report
   */
  formatReport(metricsData) {
    const { metadata, metrics, analysis, thresholdViolations } = metricsData;
    const timestamp = new Date(metadata.timestamp).toISOString();

    let report = `Performance Metrics Report
Generated: ${timestamp}
Duration: ${metadata.duration}ms
Collection Status: ${metadata.isCollecting ? 'Active' : 'Completed'}

=== Response Time Metrics ===\n`;

    // Format Response Time Metrics
    Object.entries(metrics.responseTime).forEach(([endpoint, stats]) => {
      report += `\nEndpoint: ${endpoint}
  Requests: ${stats.count}
  Response Times (ms):
    Median: ${stats.median.toFixed(2)}
    95th percentile: ${stats.p95.toFixed(2)}
    99th percentile: ${stats.p99.toFixed(2)}
    Min: ${stats.min.toFixed(2)}
    Max: ${stats.max.toFixed(2)}\n`;
    });

    // Format Memory Metrics
    report += '\n=== Memory Metrics ===\n';
    const memoryStats = metrics.memory.process;
    report += `\nHeap Usage:
  Total: ${memoryStats.heapTotal.current.toFixed(2)} MB
  Used: ${memoryStats.heapUsed.current.toFixed(2)} MB
  External: ${memoryStats.external.current.toFixed(2)} MB
Memory Leak Analysis:
  ${analysis.memoryLeaks.message}
  Growth Rate: ${analysis.memoryLeaks.growthRate.toFixed(2)}%\n`;

    // Format CPU Metrics
    report += '\n=== CPU Metrics ===\n';
    const cpuStats = metrics.cpu;
    report += `\nCPU Usage:
  User: ${cpuStats.user.current.toFixed(2)}%
  System: ${cpuStats.system.current.toFixed(2)}%
  Total: ${cpuStats.total.current.toFixed(2)}%
Load Averages:
  1min: ${cpuStats.loadAverages['1min'].toFixed(2)}
  5min: ${cpuStats.loadAverages['5min'].toFixed(2)}
  15min: ${cpuStats.loadAverages['15min'].toFixed(2)}\n`;

    // Format Database Metrics
    report += '\n=== Database Metrics ===\n';
    const dbStats = metrics.database.queries;
    Object.entries(dbStats).forEach(([type, stats]) => {
      report += `\n${type.toUpperCase()} Queries:
  Count: ${stats.count}
  Success Rate: ${(stats.successRate * 100).toFixed(2)}%
  Duration (ms):
    Median: ${stats.duration.median.toFixed(2)}
    95th percentile: ${stats.duration.p95.toFixed(2)}
    99th percentile: ${stats.duration.p99.toFixed(2)}\n`;
    });

    // Format Threshold Violations
    report += '\n=== Threshold Violations ===\n';
    let violationsFound = false;
    Object.entries(thresholdViolations).forEach(([category, violations]) => {
      if (violations.length > 0) {
        violationsFound = true;
        report += `\n${category}:\n`;
        violations.forEach(v => {
          report += `  - ${v.metric}: ${v.actual.toFixed(2)} (Threshold: ${v.threshold})\n`;
        });
      }
    });
    if (!violationsFound) {
      report += 'No threshold violations detected.\n';
    }

    return report;
  }

  /**
   * Generate HTML report
   * @param {Object} metricsData - Raw metrics data
   * @returns {string} HTML report
   */
  generateHtmlReport(metricsData) {
    // Implementation of HTML report generation
    // This would format the data into an HTML template with charts and tables
    return `<!DOCTYPE html>
<html>
<head>
    <title>Performance Metrics Report</title>
    <style>
        /* Add your CSS styles here */
    </style>
</head>
<body>
    <h1>Performance Metrics Report</h1>
    <!-- Add formatted metrics data here -->
</body>
</html>`;
  }

  /**
   * Generate JSON report
   * @param {Object} metricsData - Raw metrics data
   * @returns {string} JSON report
   */
  generateJsonReport(metricsData) {
    return JSON.stringify(metricsData, null, 2);
  }

  /**
   * Save report to file
   * @param {string} report - Formatted report
   * @param {string} filename - Output filename
   * @param {string} format - Report format (txt, html, json)
   */
  async saveReport(report, filename, format = 'txt') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(process.cwd(), 'reports', 'performance');
    
    try {
      await fs.mkdir(outputDir, { recursive: true });
      const fullPath = path.join(outputDir, `${filename}_${timestamp}.${format}`);
      await fs.writeFile(fullPath, report);
      console.log(`Report saved to: ${fullPath}`);
    } catch (error) {
      console.error('Error saving report:', error);
      throw error;
    }
  }

  /**
   * Generate a complete report in specified format
   * @param {Object} metricsData - Raw metrics data
   * @param {Object} options - Report options
   */
  async generateReport(metricsData, options = {}) {
    const {
      format = 'txt',
      filename = 'performance_report',
      save = true
    } = options;

    let report;
    switch (format.toLowerCase()) {
      case 'html':
        report = this.generateHtmlReport(metricsData);
        break;
      case 'json':
        report = this.generateJsonReport(metricsData);
        break;
      default:
        report = this.formatReport(metricsData);
    }

    if (save) {
      await this.saveReport(report, filename, format);
    }

    return report;
  }
}

module.exports = new MetricsReporter();