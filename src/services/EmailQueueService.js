const { v4: uuidv4 } = require('uuid');
const LoggerService = require('./LoggerService');

class EmailQueueService {
    constructor() {
        this.queue = new Map();
        this.processing = new Map();
        this.retryDelays = [1000, 5000, 15000, 30000, 60000]; // Retry delays in ms
        this.rateLimitWindow = 60000; // 1 minute
        this.rateLimitCount = 100; // Max emails per minute
        this.sendCount = 0;
        this.lastResetTime = Date.now();
    }

    /**
     * Add email to queue
     * @param {Object} emailData Email data object
     * @returns {string} Queue ID
     */
    async queueEmail(emailData) {
        const queueId = uuidv4();
        const queueEntry = {
            id: queueId,
            data: emailData,
            status: 'queued',
            attempts: 0,
            maxAttempts: 5,
            createdAt: Date.now(),
            nextAttempt: Date.now(),
            error: null
        };

        this.queue.set(queueId, queueEntry);
        LoggerService.debug('Email queued', { queueId, to: emailData.to });
        return queueId;
    }

    /**
     * Check if rate limit is exceeded
     * @returns {boolean}
     */
    isRateLimitExceeded() {
        const now = Date.now();
        if (now - this.lastResetTime > this.rateLimitWindow) {
            this.sendCount = 0;
            this.lastResetTime = now;
        }
        return this.sendCount >= this.rateLimitCount;
    }

    /**
     * Process queued emails
     * @returns {Promise<void>}
     */
    async processQueue() {
        for (const [queueId, entry] of this.queue.entries()) {
            if (entry.nextAttempt > Date.now()) continue;
            if (this.isRateLimitExceeded()) {
                LoggerService.warn('Email rate limit exceeded, pausing queue processing');
                break;
            }

            try {
                this.processing.set(queueId, entry);
                this.queue.delete(queueId);

                // Increment send count for rate limiting
                this.sendCount++;

                // Process email (implementation in MailerService)
                await this.processEmail(entry);

                this.processing.delete(queueId);
                LoggerService.info('Email sent successfully', { queueId, to: entry.data.to });
            } catch (error) {
                await this.handleProcessingError(entry, error);
            }
        }
    }

    /**
     * Handle processing errors
     * @private
     */
    async handleProcessingError(entry, error) {
        entry.attempts++;
        entry.error = error.message;

        if (entry.attempts < entry.maxAttempts) {
            const delay = this.retryDelays[Math.min(entry.attempts - 1, this.retryDelays.length - 1)];
            entry.nextAttempt = Date.now() + delay;
            entry.status = 'retry';
            this.queue.set(entry.id, entry);

            LoggerService.warn('Email sending failed, scheduled retry', {
                queueId: entry.id,
                attempt: entry.attempts,
                nextRetry: new Date(entry.nextAttempt).toISOString()
            });
        } else {
            entry.status = 'failed';
            LoggerService.error('Email sending failed permanently', {
                queueId: entry.id,
                error: entry.error,
                attempts: entry.attempts
            });
        }
    }

    /**
     * Get queue statistics
     * @returns {Object}
     */
    getStats() {
        return {
            queued: this.queue.size,
            processing: this.processing.size,
            sendCount: this.sendCount,
            rateLimitWindow: this.rateLimitWindow,
            rateLimitCount: this.rateLimitCount
        };
    }

    /**
     * Get status of specific email
     * @param {string} queueId Queue ID
     * @returns {Object|null}
     */
    getEmailStatus(queueId) {
        return this.queue.get(queueId) || this.processing.get(queueId) || null;
    }

    /**
     * Clear the queue
     */
    clearQueue() {
        this.queue.clear();
        this.processing.clear();
        this.sendCount = 0;
        LoggerService.info('Email queue cleared');
    }
}

module.exports = new EmailQueueService();