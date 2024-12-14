const WebSocket = require('ws');
const logger = require('../services/LoggerService');
const { EventEmitter } = require('events');

/**
 * Constants for WebSocket management
 */
const CONSTANTS = {
    // Reconnection timing
    INITIAL_RECONNECT_DELAY: 1000,
    MAX_RECONNECT_DELAY: 30000,
    RECONNECT_MULTIPLIER: 1.5,
    
    // Heartbeat configuration
    HEARTBEAT_INTERVAL: 30000,
    HEARTBEAT_TIMEOUT: 5000,
    
    // Queue management
    MAX_QUEUE_SIZE: 1000,
    
    // Connection states
    STATES: {
        CONNECTING: 'CONNECTING',
        CONNECTED: 'CONNECTED',
        RECONNECTING: 'RECONNECTING',
        DISCONNECTED: 'DISCONNECTED',
        ERROR: 'ERROR'
    }
};

/**
 * Enhanced WebSocket connection management utility
 */
class WebSocketConnection extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = {
            autoReconnect: true,
            maxReconnectAttempts: 10,
            queueMessages: true,
            enableHeartbeat: true,
            heartbeatInterval: CONSTANTS.HEARTBEAT_INTERVAL,
            heartbeatTimeout: CONSTANTS.HEARTBEAT_TIMEOUT,
            ...options
        };

        this.state = CONSTANTS.STATES.DISCONNECTED;
        this.ws = null;
        this.messageQueue = [];
        this.reconnectAttempts = 0;
        this.reconnectTimeout = null;
        this.heartbeatInterval = null;
        this.heartbeatTimeout = null;
        this.currentReconnectDelay = CONSTANTS.INITIAL_RECONNECT_DELAY;
        this.lastHeartbeatResponse = null;
    }

    /**
     * Initialize WebSocket connection
     * @param {string} url - WebSocket server URL
     * @param {Object} protocols - WebSocket protocols
     * @returns {Promise} Connection promise
     */
    connect(url, protocols = []) {
        return new Promise((resolve, reject) => {
            try {
                this.state = CONSTANTS.STATES.CONNECTING;
                this.ws = new WebSocket(url, protocols);
                
                this.ws.on('open', () => {
                    this._handleConnection();
                    resolve(this.ws);
                });

                this.ws.on('message', (data) => this._handleMessage(data));
                this.ws.on('close', () => this._handleClose());
                this.ws.on('error', (error) => this._handleError(error));

                if (this.options.enableHeartbeat) {
                    this._startHeartbeat();
                }
            } catch (error) {
                this._handleError(error);
                reject(error);
            }
        });
    }

    /**
     * Send message through WebSocket
     * @param {*} data - Message data
     * @returns {Promise} Send promise
     */
    send(data) {
        return new Promise((resolve, reject) => {
            if (this.state === CONSTANTS.STATES.CONNECTED && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(data, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            } else if (this.options.queueMessages) {
                if (this.messageQueue.length >= CONSTANTS.MAX_QUEUE_SIZE) {
                    reject(new Error('Message queue full'));
                } else {
                    this.messageQueue.push(data);
                    logger.debug('Message queued for later delivery', {
                        queueSize: this.messageQueue.length
                    });
                    resolve();
                }
            } else {
                reject(new Error('WebSocket not connected'));
            }
        });
    }

    /**
     * Close WebSocket connection
     * @param {number} code - Close code
     * @param {string} reason - Close reason
     */
    close(code, reason) {
        this.options.autoReconnect = false;
        if (this.ws) {
            this.ws.close(code, reason);
        }
        this._cleanup();
    }

    /**
     * Get current connection state
     * @returns {string} Connection state
     */
    getState() {
        return this.state;
    }

    /**
     * Check if connection is active
     * @returns {boolean} Connection status
     */
    isConnected() {
        return this.state === CONSTANTS.STATES.CONNECTED;
    }

    /**
     * Get queued messages count
     * @returns {number} Queue size
     */
    getQueueSize() {
        return this.messageQueue.length;
    }

    /**
     * Clear message queue
     */
    clearQueue() {
        this.messageQueue = [];
    }

    /**
     * Handle successful connection
     * @private
     */
    _handleConnection() {
        this.state = CONSTANTS.STATES.CONNECTED;
        this.reconnectAttempts = 0;
        this.currentReconnectDelay = CONSTANTS.INITIAL_RECONNECT_DELAY;
        this.lastHeartbeatResponse = Date.now();

        logger.info('WebSocket connected successfully');
        this.emit('connected');

        // Process queued messages
        if (this.messageQueue.length > 0) {
            logger.debug(`Processing ${this.messageQueue.length} queued messages`);
            [...this.messageQueue].forEach(async (data) => {
                try {
                    await this.send(data);
                    this.messageQueue.shift(); // Remove sent message
                } catch (error) {
                    logger.error('Error sending queued message', {
                        error: error.message
                    });
                }
            });
        }
    }

    /**
     * Handle incoming messages
     * @private
     * @param {*} data - Message data
     */
    _handleMessage(data) {
        try {
            const message = JSON.parse(data);
            
            // Handle heartbeat response
            if (message.type === 'pong') {
                this.lastHeartbeatResponse = Date.now();
                return;
            }

            this.emit('message', message);
        } catch (error) {
            logger.error('Error processing WebSocket message', {
                error: error.message,
                data
            });
        }
    }

    /**
     * Handle connection close
     * @private
     */
    _handleClose() {
        this.state = CONSTANTS.STATES.DISCONNECTED;
        this._cleanup();

        logger.info('WebSocket connection closed');
        this.emit('disconnected');

        if (this.options.autoReconnect && this.reconnectAttempts < this.options.maxReconnectAttempts) {
            this._scheduleReconnect();
        }
    }

    /**
     * Handle connection error
     * @private
     * @param {Error} error - Error object
     */
    _handleError(error) {
        this.state = CONSTANTS.STATES.ERROR;
        logger.error('WebSocket error', {
            error: error.message,
            stack: error.stack
        });
        this.emit('error', error);
    }

    /**
     * Schedule reconnection attempt
     * @private
     */
    _scheduleReconnect() {
        this.state = CONSTANTS.STATES.RECONNECTING;
        this.reconnectAttempts++;

        const delay = Math.min(
            this.currentReconnectDelay * Math.pow(CONSTANTS.RECONNECT_MULTIPLIER, this.reconnectAttempts - 1),
            CONSTANTS.MAX_RECONNECT_DELAY
        );

        logger.info('Scheduling WebSocket reconnection', {
            attempt: this.reconnectAttempts,
            delay
        });

        this.reconnectTimeout = setTimeout(() => {
            this.connect(this.ws.url, this.ws.protocol)
                .catch(error => {
                    logger.error('Reconnection attempt failed', {
                        error: error.message,
                        attempt: this.reconnectAttempts
                    });
                });
        }, delay);
    }

    /**
     * Start heartbeat mechanism
     * @private
     */
    _startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.state === CONSTANTS.STATES.CONNECTED) {
                this.send(JSON.stringify({ type: 'ping' }))
                    .catch(error => {
                        logger.error('Error sending heartbeat', {
                            error: error.message
                        });
                    });

                this.heartbeatTimeout = setTimeout(() => {
                    const timeSinceLastResponse = Date.now() - this.lastHeartbeatResponse;
                    if (timeSinceLastResponse > this.options.heartbeatTimeout) {
                        logger.warn('Heartbeat timeout, closing connection', {
                            timeSinceLastResponse
                        });
                        this.ws.terminate();
                    }
                }, this.options.heartbeatTimeout);
            }
        }, this.options.heartbeatInterval);
    }

    /**
     * Clean up connection resources
     * @private
     */
    _cleanup() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }
}

/**
 * WebSocket connection pool for managing multiple connections
 */
class WebSocketPool {
    constructor(options = {}) {
        this.options = {
            maxConnections: 10,
            ...options
        };
        this.connections = new Map();
    }

    /**
     * Create new connection in pool
     * @param {string} id - Connection identifier
     * @param {string} url - WebSocket URL
     * @param {Object} options - Connection options
     * @returns {Promise<WebSocketConnection>} Connection instance
     */
    async createConnection(id, url, options = {}) {
        if (this.connections.size >= this.options.maxConnections) {
            throw new Error('Maximum connections limit reached');
        }

        const connection = new WebSocketConnection(options);
        await connection.connect(url);
        
        this.connections.set(id, connection);
        return connection;
    }

    /**
     * Get existing connection
     * @param {string} id - Connection identifier
     * @returns {WebSocketConnection} Connection instance
     */
    getConnection(id) {
        return this.connections.get(id);
    }

    /**
     * Remove connection from pool
     * @param {string} id - Connection identifier
     */
    removeConnection(id) {
        const connection = this.connections.get(id);
        if (connection) {
            connection.close();
            this.connections.delete(id);
        }
    }

    /**
     * Close all connections in pool
     */
    closeAll() {
        this.connections.forEach((connection, id) => {
            connection.close();
            this.connections.delete(id);
        });
    }

    /**
     * Get total number of connections
     * @returns {number} Connection count
     */
    getConnectionCount() {
        return this.connections.size;
    }

    /**
     * Get pool status
     * @returns {Object} Pool status
     */
    getStatus() {
        const status = {
            totalConnections: this.connections.size,
            connectionStates: {}
        };

        this.connections.forEach((connection) => {
            const state = connection.getState();
            status.connectionStates[state] = (status.connectionStates[state] || 0) + 1;
        });

        return status;
    }
}

module.exports = {
    WebSocketConnection,
    WebSocketPool,
    CONSTANTS
};