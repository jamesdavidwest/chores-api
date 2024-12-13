const os = require('os');

class CPUMetrics {
  constructor() {
    this.measurements = [];
    this.interval = null;
    this.previousCPU = null;
  }

  /**
   * Calculate CPU usage percentage
   * @returns {Object} CPU usage statistics
   */
  calculateCPUUsage() {
    const cpus = os.cpus();
    const currentCPU = {
      user: cpus.reduce((acc, cpu) => acc + cpu.times.user, 0),
      nice: cpus.reduce((acc, cpu) => acc + cpu.times.nice, 0),
      sys: cpus.reduce((acc, cpu) => acc + cpu.times.sys, 0),
      idle: cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0),
      irq: cpus.reduce((acc, cpu) => acc + cpu.times.irq, 0),
    };

    if (this.previousCPU) {
      const userDiff = currentCPU.user - this.previousCPU.user;
      const niceDiff = currentCPU.nice - this.previousCPU.nice;
      const sysDiff = currentCPU.sys - this.previousCPU.sys;
      const idleDiff = currentCPU.idle - this.previousCPU.idle;
      const irqDiff = currentCPU.irq - this.previousCPU.irq;
      const total = userDiff + niceDiff + sysDiff + idleDiff + irqDiff;

      const usage = {
        user: (userDiff / total) * 100,
        system: (sysDiff / total) * 100,
        idle: (idleDiff / total) * 100,
        total: ((total - idleDiff) / total) * 100,
        numCPUs: cpus.length,
        loadAverage: os.loadavg(),
      };

      this.previousCPU = currentCPU;
      return usage;
    }

    this.previousCPU = currentCPU;
    return {
      user: 0,
      system: 0,
      idle: 100,
      total: 0,
      numCPUs: cpus.length,
      loadAverage: os.loadavg(),
    };
  }

  /**
   * Start collecting CPU measurements
   * @param {number} interval - Collection interval in milliseconds
   */
  startCollecting(interval = 1000) {
    if (this.interval) {
      this.stopCollecting();
    }

    this.interval = setInterval(() => {
      const usage = this.calculateCPUUsage();
      this.measurements.push({
        timestamp: Date.now(),
        ...usage,
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
    const values = this.measurements.map(m => m[metric]);

    return {
      current: values[values.length - 1] || 0,
      min: Math.min(...values),
      max: Math.max(...values),
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      measurements: values.length,
    };
  }

  /**
   * Get comprehensive CPU statistics
   * @returns {Object} CPU statistics
   */
  getStats() {
    return {
      user: this.calculateStats('user'),
      system: this.calculateStats('system'),
      idle: this.calculateStats('idle'),
      total: this.calculateStats('total'),
      systemInfo: {
        numCPUs: os.cpus().length,
        architecture: os.arch(),
        platform: os.platform(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
      },
      loadAverages: {
        '1min': os.loadavg()[0],
        '5min': os.loadavg()[1],
        '15min': os.loadavg()[2],
      },
      metadata: {
        measurementCount: this.measurements.length,
        startTime: this.measurements[0]?.timestamp,
        endTime: this.measurements[this.measurements.length - 1]?.timestamp,
      },
    };
  }

  /**
   * Get high CPU usage intervals
   * @param {number} threshold - CPU usage threshold percentage
   * @returns {Array} Intervals of high CPU usage
   */
  getHighUsageIntervals(threshold = 80) {
    const intervals = [];
    let currentInterval = null;

    this.measurements.forEach((measurement) => {
      if (measurement.total > threshold) {
        if (!currentInterval) {
          currentInterval = {
            start: measurement.timestamp,
            maxUsage: measurement.total,
          };
        } else if (measurement.total > currentInterval.maxUsage) {
          currentInterval.maxUsage = measurement.total;
        }
      } else if (currentInterval) {
        currentInterval.end = measurement.timestamp;
        currentInterval.duration = currentInterval.end - currentInterval.start;
        intervals.push(currentInterval);
        currentInterval = null;
      }
    });

    // Handle case where high usage continues until the end
    if (currentInterval) {
      currentInterval.end = this.measurements[this.measurements.length - 1].timestamp;
      currentInterval.duration = currentInterval.end - currentInterval.start;
      intervals.push(currentInterval);
    }

    return intervals;
  }

  /**
   * Reset all measurements
   */
  reset() {
    this.stopCollecting();
    this.measurements = [];
    this.previousCPU = null;
  }
}

module.exports = new CPUMetrics();