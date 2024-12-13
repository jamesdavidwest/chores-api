const { v4: uuidv4 } = require('uuid');
const LoggerService = require('./LoggerService');

/**
 * CacheService provides a flexible caching layer with:
 * - Multiple storage strategies (memory, Redis-ready)
 * - Cache invalidation
 * - Statistics tracking
 * - Distributed coordination support
 * - Performance monitoring
 */
class CacheService {
    constructor() {
        this.cache = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            invalidations: 0
        };
        this.locks = new Map();
        this.monitors = new Map();
        this.defaultTTL = 3600; // 1 hour in seconds
    }

    /**
     * Get a value from cache
     * @param {string} key - Cache key
     * @returns {Promise<{value: any, metadata: object}|null>}
     */
    async get(key) {
        const start = process.hrtime();
        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            this._recordMetric(key, 'miss', process.hrtime(start));
            return null;
        }

        if (this._isExpired(entry)) {
            this.stats.misses++;
            await this.delete(key);
            this._recordMetric(key, 'miss', process.hrtime(start));
            return null;
        }

        this.stats.hits++;
        this._recordMetric(key, 'hit', process.hrtime(start));
        return {
            value: entry.value,
            metadata: {
                createdAt: entry.createdAt,
                expiresAt: entry.expiresAt,
                accessCount: ++entry.accessCount
            }
        };
    }

    /**
     * Set a value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {object} options - Cache options
     * @returns {Promise<void>}
     */
    async set(key, value, options = {}) {
        const start = process.hrtime();
        const ttl = options.ttl || this.defaultTTL;

        const entry = {
            value,
            createdAt: Date.now(),
            expiresAt: Date.now() + (ttl * 1000),
            accessCount: 0,
            updateCount: 0,
            id: uuidv4()
        };

        this.cache.set(key, entry);
        this.stats.sets++;
        this._recordMetric(key, 'set', process.hrtime(start));

        LoggerService.debug('Cache entry set', {
            key,
            ttl,
            entryId: entry.id
        });
    }

    /**
     * Delete a value from cache
     * @param {string} key - Cache key
     * @returns {Promise<boolean>}
     */
    async delete(key) {
        const start = process.hrtime();
        const deleted = this.cache.delete(key);
        
        if (deleted) {
            this.stats.deletes++;
            this._recordMetric(key, 'delete', process.hrtime(start));
            
            LoggerService.debug('Cache entry deleted', { key });
        }
        
        return deleted;
    }

    /**
     * Clear all entries from cache
     * @returns {Promise<void>}
     */
    async clear() {
        const start = process.hrtime();
        this.cache.clear();
        this.stats.invalidations++;
        this._recordMetric('all', 'clear', process.hrtime(start));
        
        LoggerService.info('Cache cleared');
    }

    /**
     * Get cache statistics
     * @returns {object}
     */
    getStats() {
        const totalOperations = this.stats.hits + this.stats.misses;
        const hitRate = totalOperations > 0 
            ? (this.stats.hits / totalOperations) * 100 
            : 0;

        return {
            ...this.stats,
            hitRate: hitRate.toFixed(2) + '%',
            size: this.cache.size,
            monitors: this.monitors.size
        };
    }

    /**
     * Acquire a distributed lock
     * @param {string} key - Lock key
     * @param {number} ttl - Lock TTL in seconds
     * @returns {Promise<string|null>} Lock token if successful
     */
    async acquireLock(key, ttl = 30) {
        const lockKey = `lock:${key}`;
        const token = uuidv4();
        const now = Date.now();

        const existingLock = this.locks.get(lockKey);
        if (existingLock && existingLock.expiresAt > now) {
            return null;
        }

        this.locks.set(lockKey, {
            token,
            expiresAt: now + (ttl * 1000)
        });

        return token;
    }

    /**
     * Release a distributed lock
     * @param {string} key - Lock key
     * @param {string} token - Lock token
     * @returns {Promise<boolean>}
     */
    async releaseLock(key, token) {
        const lockKey = `lock:${key}`;
        const lock = this.locks.get(lockKey);

        if (!lock || lock.token !== token) {
            return false;
        }

        this.locks.delete(lockKey);
        return true;
    }

    /**
     * Monitor cache performance for a key pattern
     * @param {string} pattern - Key pattern to monitor
     * @param {function} callback - Callback for threshold violations
     * @returns {string} Monitor ID
     */
    monitorPerformance(pattern, callback) {
        const monitorId = uuidv4();
        this.monitors.set(monitorId, {
            pattern: new RegExp(pattern),
            callback,
            metrics: {
                operations: 0,
                totalDuration: 0,
                maxDuration: 0,
                violations: 0
            }
        });
        return monitorId;
    }

    /**
     * Stop monitoring cache performance
     * @param {string} monitorId - Monitor ID to remove
     */
    stopMonitoring(monitorId) {
        this.monitors.delete(monitorId);
    }

    /**
     * Check if a cache entry is expired
     * @private
     */
    _isExpired(entry) {
        return entry.expiresAt <= Date.now();
    }

    /**
     * Record metric for monitoring
     * @private
     */
    _recordMetric(key, operation, duration) {
        const [seconds, nanoseconds] = duration;
        const durationMs = (seconds * 1000) + (nanoseconds / 1e6);

        this.monitors.forEach((monitor, monitorId) => {
            if (monitor.pattern.test(key)) {
                monitor.metrics.operations++;
                monitor.metrics.totalDuration += durationMs;
                monitor.metrics.maxDuration = Math.max(
                    monitor.metrics.maxDuration,
                    durationMs
                );

                // Alert on slow operations (>100ms)
                if (durationMs > 100) {
                    monitor.metrics.violations++;
                    monitor.callback({
                        key,
                        operation,
                        duration: durationMs,
                        metrics: monitor.metrics
                    });
                }
            }
        });
    }
}

// Export singleton instance
module.exports = new CacheService();