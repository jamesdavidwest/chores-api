const EventEmitter = require("events");
const logger = require("./LoggerService");
const RealTimeMetricsService = require("./RealTimeMetricsService");
const MetricsWebSocketService = require("./MetricsWebSocketService");

/**
 * Alert severity levels
 */
const SEVERITY = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical",
};

/**
 * Alert states
 */
const ALERT_STATE = {
  ACTIVE: "active",
  ACKNOWLEDGED: "acknowledged",
  RESOLVED: "resolved",
};

class AlertNotificationService extends EventEmitter {
  constructor() {
    super();
    this.alerts = new Map(); // Active alerts
    this.alertHistory = []; // Historical alerts
    this.alertConfigs = new Map(); // Alert configurations
    this.subscriptions = new Set(); // Alert subscriptions

    // Default thresholds
    this.defaultConfig = {
      system: {
        cpu: {
          warning: 70,
          error: 85,
          critical: 95,
        },
        memory: {
          warning: 75,
          error: 85,
          critical: 95,
        },
      },
      application: {
        errorRate: {
          warning: 0.05,
          error: 0.1,
          critical: 0.2,
        },
        responseTime: {
          warning: 1000, // 1 second
          error: 3000, // 3 seconds
          critical: 5000, // 5 seconds
        },
      },
      database: {
        connectionPool: {
          warning: 70,
          error: 85,
          critical: 95,
        },
        queryTime: {
          warning: 1000,
          error: 3000,
          critical: 5000,
        },
      },
    };

    // Initialize with default configuration
    this.initialize();
  }

  /**
   * Initialize alert service
   */
  initialize() {
    // Subscribe to metric updates
    RealTimeMetricsService.subscribe(this._handleMetricUpdate.bind(this));

    // Load saved configurations if any
    this._loadSavedConfigurations();

    logger.info("Alert Notification Service initialized");
  }

  /**
   * Create new alert configuration
   * @param {string} name - Alert name
   * @param {Object} config - Alert configuration
   * @returns {string} Alert configuration ID
   */
  createAlertConfig(name, config) {
    const configId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const alertConfig = {
      id: configId,
      name,
      ...config,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      enabled: true,
    };

    this.alertConfigs.set(configId, alertConfig);
    logger.info("Alert configuration created", { configId, name });
    return configId;
  }

  /**
   * Update existing alert configuration
   * @param {string} configId - Alert configuration ID
   * @param {Object} updates - Configuration updates
   */
  updateAlertConfig(configId, updates) {
    const config = this.alertConfigs.get(configId);
    if (!config) {
      throw new Error(`Alert configuration not found: ${configId}`);
    }

    const updatedConfig = {
      ...config,
      ...updates,
      updatedAt: Date.now(),
    };

    this.alertConfigs.set(configId, updatedConfig);
    logger.info("Alert configuration updated", { configId });
  }

  /**
   * Delete alert configuration
   * @param {string} configId - Alert configuration ID
   */
  deleteAlertConfig(configId) {
    if (this.alertConfigs.delete(configId)) {
      logger.info("Alert configuration deleted", { configId });
    }
  }

  /**
   * Get alert configuration
   * @param {string} configId - Alert configuration ID
   * @returns {Object} Alert configuration
   */
  getAlertConfig(configId) {
    return this.alertConfigs.get(configId);
  }

  /**
   * Get all alert configurations
   * @returns {Array} Alert configurations
   */
  getAllAlertConfigs() {
    return Array.from(this.alertConfigs.values());
  }

  /**
   * Subscribe to alerts
   * @param {Function} callback - Callback function for alert notifications
   * @returns {string} Subscription ID
   */
  subscribe(callback) {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.subscriptions.add({ id: subscriptionId, callback });
    return subscriptionId;
  }

  /**
   * Unsubscribe from alerts
   * @param {string} subscriptionId - Subscription ID
   */
  unsubscribe(subscriptionId) {
    this.subscriptions = new Set(
      Array.from(this.subscriptions).filter((sub) => sub.id !== subscriptionId)
    );
  }

  /**
   * Get active alerts
   * @returns {Array} Active alerts
   */
  getActiveAlerts() {
    return Array.from(this.alerts.values()).filter(
      (alert) => alert.state === ALERT_STATE.ACTIVE
    );
  }

  /**
   * Get alert history
   * @param {Object} filters - History filters
   * @returns {Array} Alert history
   */
  getAlertHistory(filters = {}) {
    let history = [...this.alertHistory];

    if (filters.severity) {
      history = history.filter((alert) => alert.severity === filters.severity);
    }

    if (filters.state) {
      history = history.filter((alert) => alert.state === filters.state);
    }

    if (filters.startTime) {
      history = history.filter((alert) => alert.timestamp >= filters.startTime);
    }

    if (filters.endTime) {
      history = history.filter((alert) => alert.timestamp <= filters.endTime);
    }

    return history;
  }

  /**
   * Acknowledge alert
   * @param {string} alertId - Alert ID
   * @param {string} acknowledgedBy - User who acknowledged
   */
  acknowledgeAlert(alertId, acknowledgedBy) {
    const alert = this.alerts.get(alertId);
    if (alert && alert.state === ALERT_STATE.ACTIVE) {
      alert.state = ALERT_STATE.ACKNOWLEDGED;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = Date.now();

      this.alerts.set(alertId, alert);
      this._notifySubscribers(alert);
      logger.info("Alert acknowledged", { alertId, acknowledgedBy });
    }
  }

  /**
   * Resolve alert
   * @param {string} alertId - Alert ID
   * @param {string} resolvedBy - User who resolved
   * @param {string} resolution - Resolution notes
   */
  resolveAlert(alertId, resolvedBy, resolution) {
    const alert = this.alerts.get(alertId);
    if (alert && alert.state !== ALERT_STATE.RESOLVED) {
      alert.state = ALERT_STATE.RESOLVED;
      alert.resolvedBy = resolvedBy;
      alert.resolvedAt = Date.now();
      alert.resolution = resolution;

      // Move to history
      this.alertHistory.unshift(alert);
      this.alerts.delete(alertId);

      this._notifySubscribers(alert);
      logger.info("Alert resolved", { alertId, resolvedBy });
    }
  }

  /**
   * Handle metric updates
   * @private
   * @param {Object} update - Metric update
   */
  _handleMetricUpdate(update) {
    try {
      const { type, data } = update;

      switch (type) {
        case "system":
          this._evaluateSystemMetrics(data);
          break;
        case "application":
          this._evaluateApplicationMetrics(data);
          break;
        case "database":
          this._evaluateDatabaseMetrics(data);
          break;
      }
    } catch (error) {
      logger.error("Error handling metric update", {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Evaluate system metrics
   * @private
   * @param {Object} metrics - System metrics
   */
  _evaluateSystemMetrics(metrics) {
    const config = this.defaultConfig.system;

    // CPU Usage
    if (metrics.cpu && metrics.cpu.usage) {
      const cpuUsage = metrics.cpu.usage.user;
      if (cpuUsage >= config.cpu.critical) {
        this._createAlert(
          "CPU_CRITICAL",
          "CPU usage critical",
          {
            value: cpuUsage,
            threshold: config.cpu.critical,
          },
          SEVERITY.CRITICAL
        );
      } else if (cpuUsage >= config.cpu.error) {
        this._createAlert(
          "CPU_ERROR",
          "CPU usage high",
          {
            value: cpuUsage,
            threshold: config.cpu.error,
          },
          SEVERITY.ERROR
        );
      } else if (cpuUsage >= config.cpu.warning) {
        this._createAlert(
          "CPU_WARNING",
          "CPU usage elevated",
          {
            value: cpuUsage,
            threshold: config.cpu.warning,
          },
          SEVERITY.WARNING
        );
      }
    }

    // Memory Usage
    if (metrics.memory && metrics.memory.usagePercent) {
      const memoryUsage = metrics.memory.usagePercent;
      if (memoryUsage >= config.memory.critical) {
        this._createAlert(
          "MEMORY_CRITICAL",
          "Memory usage critical",
          {
            value: memoryUsage,
            threshold: config.memory.critical,
          },
          SEVERITY.CRITICAL
        );
      } else if (memoryUsage >= config.memory.error) {
        this._createAlert(
          "MEMORY_ERROR",
          "Memory usage high",
          {
            value: memoryUsage,
            threshold: config.memory.error,
          },
          SEVERITY.ERROR
        );
      } else if (memoryUsage >= config.memory.warning) {
        this._createAlert(
          "MEMORY_WARNING",
          "Memory usage elevated",
          {
            value: memoryUsage,
            threshold: config.memory.warning,
          },
          SEVERITY.WARNING
        );
      }
    }
  }

  /**
   * Evaluate application metrics
   * @private
   * @param {Object} metrics - Application metrics
   */
  _evaluateApplicationMetrics(metrics) {
    const config = this.defaultConfig.application;

    // Error Rate
    if (metrics.errorRate) {
      if (metrics.errorRate >= config.errorRate.critical) {
        this._createAlert(
          "ERROR_RATE_CRITICAL",
          "Error rate critical",
          {
            value: metrics.errorRate,
            threshold: config.errorRate.critical,
          },
          SEVERITY.CRITICAL
        );
      } else if (metrics.errorRate >= config.errorRate.error) {
        this._createAlert(
          "ERROR_RATE_ERROR",
          "Error rate high",
          {
            value: metrics.errorRate,
            threshold: config.errorRate.error,
          },
          SEVERITY.ERROR
        );
      } else if (metrics.errorRate >= config.errorRate.warning) {
        this._createAlert(
          "ERROR_RATE_WARNING",
          "Error rate elevated",
          {
            value: metrics.errorRate,
            threshold: config.errorRate.warning,
          },
          SEVERITY.WARNING
        );
      }
    }

    // Response Time
    if (metrics.responseTime && metrics.responseTime.average) {
      const avgResponseTime = metrics.responseTime.average;
      if (avgResponseTime >= config.responseTime.critical) {
        this._createAlert(
          "RESPONSE_TIME_CRITICAL",
          "Response time critical",
          {
            value: avgResponseTime,
            threshold: config.responseTime.critical,
          },
          SEVERITY.CRITICAL
        );
      } else if (avgResponseTime >= config.responseTime.error) {
        this._createAlert(
          "RESPONSE_TIME_ERROR",
          "Response time high",
          {
            value: avgResponseTime,
            threshold: config.responseTime.error,
          },
          SEVERITY.ERROR
        );
      } else if (avgResponseTime >= config.responseTime.warning) {
        this._createAlert(
          "RESPONSE_TIME_WARNING",
          "Response time elevated",
          {
            value: avgResponseTime,
            threshold: config.responseTime.warning,
          },
          SEVERITY.WARNING
        );
      }
    }
  }

  /**
   * Evaluate database metrics
   * @private
   * @param {Object} metrics - Database metrics
   */
  _evaluateDatabaseMetrics(metrics) {
    const config = this.defaultConfig.database;

    // Connection Pool
    if (metrics.poolStatus) {
      const poolUsage =
        (metrics.poolStatus.used / metrics.poolStatus.total) * 100;
      if (poolUsage >= config.connectionPool.critical) {
        this._createAlert(
          "DB_POOL_CRITICAL",
          "Database connection pool usage critical",
          {
            value: poolUsage,
            threshold: config.connectionPool.critical,
          },
          SEVERITY.CRITICAL
        );
      } else if (poolUsage >= config.connectionPool.error) {
        this._createAlert(
          "DB_POOL_ERROR",
          "Database connection pool usage high",
          {
            value: poolUsage,
            threshold: config.connectionPool.error,
          },
          SEVERITY.ERROR
        );
      } else if (poolUsage >= config.connectionPool.warning) {
        this._createAlert(
          "DB_POOL_WARNING",
          "Database connection pool usage elevated",
          {
            value: poolUsage,
            threshold: config.connectionPool.warning,
          },
          SEVERITY.WARNING
        );
      }
    }

    // Query Time
    if (metrics.responseTime && metrics.responseTime.average) {
      const avgQueryTime = metrics.responseTime.average;
      if (avgQueryTime >= config.queryTime.critical) {
        this._createAlert(
          "DB_QUERY_TIME_CRITICAL",
          "Database query time critical",
          {
            value: avgQueryTime,
            threshold: config.queryTime.critical,
          },
          SEVERITY.CRITICAL
        );
      } else if (avgQueryTime >= config.queryTime.error) {
        this._createAlert(
          "DB_QUERY_TIME_ERROR",
          "Database query time high",
          {
            value: avgQueryTime,
            threshold: config.queryTime.error,
          },
          SEVERITY.ERROR
        );
      } else if (avgQueryTime >= config.queryTime.warning) {
        this._createAlert(
          "DB_QUERY_TIME_WARNING",
          "Database query time elevated",
          {
            value: avgQueryTime,
            threshold: config.queryTime.warning,
          },
          SEVERITY.WARNING
        );
      }
    }
  }

  /**
   * Create new alert
   * @private
   * @param {string} type - Alert type
   * @param {string} message - Alert message
   * @param {Object} data - Alert data
   * @param {string} severity - Alert severity
   */
  _createAlert(type, message, data, severity) {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const alert = {
      id: alertId,
      type,
      message,
      data,
      severity,
      timestamp: Date.now(),
      state: ALERT_STATE.ACTIVE,
    };

    this.alerts.set(alertId, alert);
    this._notifySubscribers(alert);

    // Broadcast to WebSocket clients
    MetricsWebSocketService.broadcast({
      type: "alert",
      data: alert,
    });

    logger.info("Alert created", {
      alertId,
      type,
      severity,
      message,
    });

    return alertId;
  }

  /**
   * Notify alert subscribers
   * @private
   * @param {Object} alert - Alert object
   */
  _notifySubscribers(alert) {
    this.subscriptions.forEach(({ callback }) => {
      try {
        callback(alert);
      } catch (error) {
        logger.error("Error in alert subscriber callback", {
          error: error.message,
          alertId: alert.id,
        });
      }
    });

    // Emit event for external listeners
    this.emit("alert", alert);
  }

  /**
   * Load saved alert configurations
   * @private
   */
  _loadSavedConfigurations() {
    try {
      // TODO: Implement persistent storage loading
      // For now, use default configurations
      this.alertConfigs = new Map();
    } catch (error) {
      logger.error("Error loading alert configurations", {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      activeAlerts: this.alerts.size,
      historicalAlerts: this.alertHistory.length,
      configurations: this.alertConfigs.size,
      subscribers: this.subscriptions.size,
      severityCounts: this._getSeverityCounts(),
      stateCounts: this._getStateCounts(),
    };
  }

  /**
   * Get alert counts by severity
   * @private
   * @returns {Object} Severity counts
   */
  _getSeverityCounts() {
    const counts = {
      [SEVERITY.INFO]: 0,
      [SEVERITY.WARNING]: 0,
      [SEVERITY.ERROR]: 0,
      [SEVERITY.CRITICAL]: 0,
    };

    this.alerts.forEach((alert) => {
      counts[alert.severity]++;
    });

    return counts;
  }

  /**
   * Get alert counts by state
   * @private
   * @returns {Object} State counts
   */
  _getStateCounts() {
    const counts = {
      [ALERT_STATE.ACTIVE]: 0,
      [ALERT_STATE.ACKNOWLEDGED]: 0,
      [ALERT_STATE.RESOLVED]: 0,
    };

    this.alerts.forEach((alert) => {
      counts[alert.state]++;
    });

    return counts;
  }
}

module.exports = new AlertNotificationService();
