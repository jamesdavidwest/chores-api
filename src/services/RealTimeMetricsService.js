const EventEmitter = require('events');
const os = require('os');
const MetricsCollector = require('../../tests/benchmarks/collectors/MetricsCollector');
const logger = require('./LoggerService');

class RealTimeMetricsService extends EventEmitter {
    constructor() {
        super();
        this.intervals = {
            system: null,
            application: null,
            database: null
        };
        this.metrics = {
            system: {},
            application: {},
            database: {},
            events: []
        };
        this.subscribers = new Set();
        this.config = {
            systemInterval: 5000,      // 5 seconds
            applicationInterval: 1000,  // 1 second
            databaseInterval: 10000,   // 10 seconds
            retentionPeriod: 3600000,  // 1 hour
            maxEventsStored: 1000
        };
    }

    /**
     * Start collecting real-time metrics
     */
    startCollecting() {
        // System metrics collection (CPU, Memory, etc.)
        this.intervals.system = setInterval(() => {
            this._collectSystemMetrics();
        }, this.config.systemInterval);

        // Application metrics collection (Request rates, Response times, etc.)
        this.intervals.application = setInterval(() => {
            this._collectApplicationMetrics();
        }, this.config.applicationInterval);

        // Database metrics collection
        this.intervals.database = setInterval(() => {
            this._collectDatabaseMetrics();
        }, this.config.databaseInterval);

        logger.info('Real-time metrics collection started', {
            intervals: {
                system: this.config.systemInterval,
                application: this.config.applicationInterval,
                database: this.config.databaseInterval
            }
        });
    }

    /**
     * Stop collecting metrics
     */
    stopCollecting() {
        Object.values(this.intervals).forEach(interval => {
            if (interval) clearInterval(interval);
        });
        this.intervals = { system: null, application: null, database: null };
        logger.info('Real-time metrics collection stopped');
    }

    /**
     * Subscribe to real-time metrics updates
     * @param {Function} callback - Function to call with updated metrics
     * @returns {string} Subscription ID
     */
    subscribe(callback) {
        const id = Math.random().toString(36).substring(2);
        this.subscribers.add({ id, callback });
        return id;
    }

    /**
     * Unsubscribe from real-time metrics updates
     * @param {string} id - Subscription ID
     */
    unsubscribe(id) {
        this.subscribers = new Set(
            Array.from(this.subscribers).filter(sub => sub.id !== id)
        );
    }

    /**
     * Get current metrics snapshot
     * @returns {Object} Current metrics
     */
    getMetricsSnapshot() {
        return {
            timestamp: Date.now(),
            ...this.metrics
        };
    }

    /**
     * Record a significant event
     * @param {string} type - Event type
     * @param {Object} data - Event data
     */
    recordEvent(type, data) {
        const event = {
            timestamp: Date.now(),
            type,
            ...data
        };

        this.metrics.events.unshift(event);
        
        // Maintain max events limit
        if (this.metrics.events.length > this.config.maxEventsStored) {
            this.metrics.events = this.metrics.events.slice(0, this.config.maxEventsStored);
        }

        // Emit event for real-time updates
        this.emit('event', event);
    }

    /**
     * Collect system metrics
     * @private
     */
    async _collectSystemMetrics() {
        try {
            const cpus = os.cpus();
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const loadAvg = os.loadavg();

            const systemMetrics = {
                timestamp: Date.now(),
                cpu: {
                    load: loadAvg,
                    usage: process.cpuUsage(),
                    count: cpus.length
                },
                memory: {
                    total: totalMem,
                    free: freeMem,
                    used: totalMem - freeMem,
                    usagePercent: ((totalMem - freeMem) / totalMem) * 100
                },
                uptime: os.uptime(),
                processMemory: process.memoryUsage()
            };

            this.metrics.system = systemMetrics;
            this._notifySubscribers('system', systemMetrics);

            // Check for concerning patterns
            this._analyzeSystemMetrics(systemMetrics);
        } catch (error) {
            logger.error('Error collecting system metrics', {
                error: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * Collect application metrics
     * @private
     */
    async _collectApplicationMetrics() {
        try {
            const currentMetrics = MetricsCollector.getReport();
            
            const applicationMetrics = {
                timestamp: Date.now(),
                requests: {
                    total: currentMetrics.totalRequests,
                    active: currentMetrics.activeRequests,
                    errored: currentMetrics.erroredRequests
                },
                responseTime: {
                    average: currentMetrics.averageResponseTime,
                    percentiles: currentMetrics.responseTimePercentiles
                },
                errorRate: currentMetrics.errorRate,
                throughput: currentMetrics.requestsPerSecond
            };

            this.metrics.application = applicationMetrics;
            this._notifySubscribers('application', applicationMetrics);

            // Analyze for issues
            this._analyzeApplicationMetrics(applicationMetrics);
        } catch (error) {
            logger.error('Error collecting application metrics', {
                error: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * Collect database metrics
     * @private
     */
    async _collectDatabaseMetrics() {
        try {
            const currentMetrics = MetricsCollector.getDatabaseMetrics();
            
            const databaseMetrics = {
                timestamp: Date.now(),
                queries: {
                    total: currentMetrics.totalQueries,
                    active: currentMetrics.activeQueries,
                    errored: currentMetrics.erroredQueries
                },
                responseTime: {
                    average: currentMetrics.averageQueryTime,
                    percentiles: currentMetrics.queryTimePercentiles
                },
                poolStatus: currentMetrics.poolStatus,
                slowQueries: currentMetrics.slowQueries
            };

            this.metrics.database = databaseMetrics;
            this._notifySubscribers('database', databaseMetrics);

            // Analyze database performance
            this._analyzeDatabaseMetrics(databaseMetrics);
        } catch (error) {
            logger.error('Error collecting database metrics', {
                error: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * Analyze system metrics for issues
     * @private
     * @param {Object} metrics - System metrics
     */
    _analyzeSystemMetrics(metrics) {
        // CPU Usage Check
        if (metrics.cpu.load[0] > 0.8 * metrics.cpu.count) {
            this.recordEvent('HIGH_CPU_LOAD', {
                load: metrics.cpu.load[0],
                threshold: 0.8 * metrics.cpu.count
            });
        }

        // Memory Usage Check
        if (metrics.memory.usagePercent > 85) {
            this.recordEvent('HIGH_MEMORY_USAGE', {
                usage: metrics.memory.usagePercent,
                threshold: 85
            });
        }
    }

    /**
     * Analyze application metrics for issues
     * @private
     * @param {Object} metrics - Application metrics
     */
    _analyzeApplicationMetrics(metrics) {
        // Error Rate Check
        if (metrics.errorRate > 0.05) { // 5% error rate threshold
            this.recordEvent('HIGH_ERROR_RATE', {
                rate: metrics.errorRate,
                threshold: 0.05
            });
        }

        // Response Time Check
        if (metrics.responseTime.average > 1000) { // 1 second threshold
            this.recordEvent('HIGH_RESPONSE_TIME', {
                responseTime: metrics.responseTime.average,
                threshold: 1000
            });
        }
    }

    /**
     * Analyze database metrics for issues
     * @private
     * @param {Object} metrics - Database metrics
     */
    _analyzeDatabaseMetrics(metrics) {
        // Slow Queries Check
        if (metrics.slowQueries.length > 0) {
            this.recordEvent('SLOW_QUERIES_DETECTED', {
                count: metrics.slowQueries.length,
                queries: metrics.slowQueries
            });
        }

        // Connection Pool Check
        if (metrics.poolStatus.pending > 0) {
            this.recordEvent('DATABASE_POOL_PENDING', {
                pending: metrics.poolStatus.pending,
                total: metrics.poolStatus.total
            });
        }
    }

    /**
     * Notify subscribers of metric updates
     * @private
     * @param {string} type - Metric type
     * @param {Object} data - Metric data
     */
    _notifySubscribers(type, data) {
        const update = {
            type,
            timestamp: Date.now(),
            data
        };

        this.subscribers.forEach(({ callback }) => {
            try {
                callback(update);
            } catch (error) {
                logger.error('Error in metrics subscriber callback', {
                    error: error.message,
                    type
                });
            }
        });
    }

    /**
     * Update service configuration
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = {
            ...this.config,
            ...newConfig
        };

        // Restart collection if intervals changed
        if (
            this.intervals.system ||
            this.intervals.application ||
            this.intervals.database
        ) {
            this.stopCollecting();
            this.startCollecting();
        }

        logger.info('Real-time metrics configuration updated', this.config);
    }
}

module.exports = new RealTimeMetricsService();