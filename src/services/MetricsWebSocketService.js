const { WebSocketPool, CONSTANTS } = require('../utils/websocket');
const RealTimeMetricsService = require('./RealTimeMetricsService');
const logger = require('./LoggerService');

class MetricsWebSocketService {
    constructor() {
        this.pool = new WebSocketPool({
            maxConnections: 1000 // Configurable max clients
        });
        this.subscriptions = new Map(); // Map client ID to metric subscription IDs
        this.clientMetadata = new Map(); // Store additional client information
    }

    /**
     * Initialize WebSocket server
     * @param {Object} server - HTTP/HTTPS server instance
     * @param {Object} options - Configuration options
     */
    initialize(server, options = {}) {
        const WebSocket = require('ws');
        this.wss = new WebSocket.Server({
            server,
            path: options.path || '/ws/metrics',
            ...options
        });

        this.wss.on('connection', this._handleConnection.bind(this));

        logger.info('Metrics WebSocket server initialized', {
            path: options.path || '/ws/metrics',
            maxConnections: this.pool.options.maxConnections
        });
    }

    /**
     * Handle new WebSocket connection
     * @private
     * @param {WebSocket} ws - WebSocket connection
     * @param {Object} request - HTTP request object
     */
    async _handleConnection(ws, request) {
        const clientId = this._generateClientId();
        
        try {
            // Create managed connection in pool
            const connection = await this.pool.createConnection(clientId, null, {
                autoReconnect: true,
                queueMessages: true,
                enableHeartbeat: true,
                existingSocket: ws // Pass existing socket to pool
            });

            // Store client metadata
            this.clientMetadata.set(clientId, {
                connectedAt: Date.now(),
                ip: request.socket.remoteAddress,
                userAgent: request.headers['user-agent'],
                lastActivity: Date.now()
            });

            // Send initial metrics snapshot
            const snapshot = RealTimeMetricsService.getMetricsSnapshot();
            connection.send(JSON.stringify({
                type: 'snapshot',
                data: snapshot
            }));

            // Subscribe to real-time metrics updates
            const subscriptionId = RealTimeMetricsService.subscribe((update) => {
                if (connection.isConnected()) {
                    connection.send(JSON.stringify({
                        type: 'update',
                        data: update
                    })).catch(error => {
                        logger.error('Error sending metric update', {
                            clientId,
                            error: error.message
                        });
                    });
                }
            });

            this.subscriptions.set(clientId, subscriptionId);

            // Set up connection event handlers
            connection.on('message', (message) => {
                this._handleClientMessage(clientId, message);
                this._updateClientActivity(clientId);
            });

            connection.on('error', (error) => {
                logger.error('WebSocket client error', {
                    clientId,
                    error: error.message
                });
            });

            connection.on('disconnected', () => {
                this._handleDisconnection(clientId);
            });

            logger.debug('New WebSocket client connected', {
                clientId,
                ...this.clientMetadata.get(clientId)
            });

        } catch (error) {
            logger.error('Error setting up client connection', {
                clientId,
                error: error.message
            });
            ws.terminate();
        }
    }

    /**
     * Handle client messages
     * @private
     * @param {string} clientId - Client identifier
     * @param {Object} message - Client message
     */
    _handleClientMessage(clientId, message) {
        const connection = this.pool.getConnection(clientId);
        if (!connection) return;

        try {
            const parsedMessage = JSON.parse(message);

            switch (parsedMessage.type) {
                case 'subscribe':
                    if (Array.isArray(parsedMessage.metrics)) {
                        this._updateClientSubscription(clientId, parsedMessage.metrics);
                    }
                    break;

                case 'getSnapshot':
                    const snapshot = RealTimeMetricsService.getMetricsSnapshot();
                    connection.send(JSON.stringify({
                        type: 'snapshot',
                        data: snapshot
                    }));
                    break;

                case 'getHistory':
                    const history = this._getMetricsHistory(
                        parsedMessage.metricType,
                        parsedMessage.duration
                    );
                    connection.send(JSON.stringify({
                        type: 'history',
                        data: history
                    }));
                    break;

                default:
                    logger.warn('Unknown WebSocket message type', {
                        clientId,
                        messageType: parsedMessage.type
                    });
            }
        } catch (error) {
            logger.error('Error handling WebSocket message', {
                clientId,
                error: error.message,
                message
            });
        }
    }

    /**
     * Handle client disconnection
     * @private
     * @param {string} clientId - Client identifier
     */
    _handleDisconnection(clientId) {
        // Clean up subscriptions
        const subscriptionId = this.subscriptions.get(clientId);
        if (subscriptionId) {
            RealTimeMetricsService.unsubscribe(subscriptionId);
            this.subscriptions.delete(clientId);
        }

        // Remove client metadata
        this.clientMetadata.delete(clientId);

        // Remove from connection pool
        this.pool.removeConnection(clientId);

        logger.debug('WebSocket client disconnected', { clientId });
    }

    /**
     * Update client's metric subscriptions
     * @private
     * @param {string} clientId - Client identifier
     * @param {Array<string>} metrics - Metric types to subscribe to
     */
    _updateClientSubscription(clientId, metrics) {
        const connection = this.pool.getConnection(clientId);
        if (!connection) return;

        // Remove existing subscription
        const oldSubscriptionId = this.subscriptions.get(clientId);
        if (oldSubscriptionId) {
            RealTimeMetricsService.unsubscribe(oldSubscriptionId);
        }

        // Create new filtered subscription
        const subscriptionId = RealTimeMetricsService.subscribe((update) => {
            if (connection.isConnected() && metrics.includes(update.type)) {
                connection.send(JSON.stringify({
                    type: 'update',
                    data: update
                })).catch(error => {
                    logger.error('Error sending metric update', {
                        clientId,
                        error: error.message
                    });
                });
            }
        });

        this.subscriptions.set(clientId, subscriptionId);

        logger.debug('Client subscription updated', {
            clientId,
            metrics
        });
    }

    /**
     * Get historical metrics data
     * @private
     * @param {string} metricType - Type of metric
     * @param {number} duration - Duration in milliseconds
     * @returns {Array} Historical metric data
     */
    _getMetricsHistory(metricType, duration) {
        const now = Date.now();
        const snapshot = RealTimeMetricsService.getMetricsSnapshot();
        
        if (metricType === 'events') {
            return snapshot.events.filter(event => 
                (now - event.timestamp) <= duration
            );
        }

        return snapshot[metricType] || [];
    }

    /**
     * Generate unique client identifier
     * @private
     * @returns {string} Client ID
     */
    _generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Update client's last activity timestamp
     * @private
     * @param {string} clientId - Client identifier
     */
    _updateClientActivity(clientId) {
        const metadata = this.clientMetadata.get(clientId);
        if (metadata) {
            metadata.lastActivity = Date.now();
            this.clientMetadata.set(clientId, metadata);
        }
    }

    /**
     * Broadcast message to all connected clients
     * @param {Object} message - Message to broadcast
     */
    broadcast(message) {
        const serializedMessage = JSON.stringify(message);
        
        this.pool.connections.forEach((connection, clientId) => {
            if (connection.isConnected()) {
                connection.send(serializedMessage).catch(error => {
                    logger.error('Error broadcasting to client', {
                        clientId,
                        error: error.message
                    });
                });
            }
        });
    }

    /**
     * Get current service status
     * @returns {Object} Service status
     */
    getStatus() {
        const poolStatus = this.pool.getStatus();
        
        return {
            ...poolStatus,
            subscriptions: this.subscriptions.size,
            clientsMetadata: {
                total: this.clientMetadata.size,
                active: Array.from(this.clientMetadata.values())
                    .filter(meta => Date.now() - meta.lastActivity < 60000).length
            }
        };
    }

    /**
     * Clean up inactive clients
     * @private
     */
    _cleanupInactiveClients() {
        const now = Date.now();
        const inactivityThreshold = 5 * 60 * 1000; // 5 minutes

        this.clientMetadata.forEach((metadata, clientId) => {
            if (now - metadata.lastActivity > inactivityThreshold) {
                logger.info('Cleaning up inactive client', { clientId });
                this._handleDisconnection(clientId);
            }
        });
    }

    /**
     * Close all connections and shutdown the server
     */
    shutdown() {
        // Clean up all client connections
        this.pool.closeAll();

        // Clear all maps
        this.subscriptions.clear();
        this.clientMetadata.clear();

        // Close the WebSocket server
        if (this.wss) {
            this.wss.close(() => {
                logger.info('Metrics WebSocket server shut down');
            });
            this.wss = null;
        }
    }
}

module.exports = new MetricsWebSocketService();