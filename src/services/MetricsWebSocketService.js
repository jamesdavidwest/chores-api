const WebSocket = require('ws');
const RealTimeMetricsService = require('./RealTimeMetricsService');
const logger = require('./LoggerService');

class MetricsWebSocketService {
    constructor() {
        this.wss = null;
        this.clients = new Map(); // Map client ID to WebSocket connection
        this.subscriptions = new Map(); // Map client ID to metric subscription IDs
    }

    /**
     * Initialize WebSocket server
     * @param {Object} server - HTTP/HTTPS server instance
     * @param {Object} options - Configuration options
     */
    initialize(server, options = {}) {
        this.wss = new WebSocket.Server({
            server,
            path: options.path || '/ws/metrics',
            ...options
        });

        this.wss.on('connection', this._handleConnection.bind(this));

        logger.info('Metrics WebSocket server initialized', {
            path: options.path || '/ws/metrics'
        });
    }

    /**
     * Handle new WebSocket connection
     * @private
     * @param {WebSocket} ws - WebSocket connection
     */
    _handleConnection(ws) {
        const clientId = Math.random().toString(36).substring(2);
        this.clients.set(clientId, ws);

        // Send initial metrics snapshot
        const snapshot = RealTimeMetricsService.getMetricsSnapshot();
        ws.send(JSON.stringify({
            type: 'snapshot',
            data: snapshot
        }));

        // Subscribe to real-time metrics updates
        const subscriptionId = RealTimeMetricsService.subscribe((update) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'update',
                    data: update
                }));
            }
        });

        this.subscriptions.set(clientId, subscriptionId);

        // Handle client messages
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                this._handleClientMessage(clientId, data);
            } catch (error) {
                logger.error('Error handling WebSocket message', {
                    clientId,
                    error: error.message
                });
            }
        });

        // Handle client disconnection
        ws.on('close', () => {
            this._handleDisconnection(clientId);
        });

        // Handle errors
        ws.on('error', (error) => {
            logger.error('WebSocket client error', {
                clientId,
                error: error.message
            });
            this._handleDisconnection(clientId);
        });

        logger.debug('New WebSocket client connected', { clientId });
    }

    /**
     * Handle client messages
     * @private
     * @param {string} clientId - Client identifier
     * @param {Object} message - Client message
     */
    _handleClientMessage(clientId, message) {
        const ws = this.clients.get(clientId);
        if (!ws) return;

        switch (message.type) {
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong' }));
                break;

            case 'subscribe':
                if (Array.isArray(message.metrics)) {
                    // Update client's subscription preferences
                    this._updateClientSubscription(clientId, message.metrics);
                }
                break;

            case 'getSnapshot':
                const snapshot = RealTimeMetricsService.getMetricsSnapshot();
                ws.send(JSON.stringify({
                    type: 'snapshot',
                    data: snapshot
                }));
                break;

            case 'getHistory':
                const history = this._getMetricsHistory(message.metricType, message.duration);
                ws.send(JSON.stringify({
                    type: 'history',
                    data: history
                }));
                break;

            default:
                logger.warn('Unknown WebSocket message type', {
                    clientId,
                    messageType: message.type
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

        // Remove client from active clients
        this.clients.delete(clientId);

        logger.debug('WebSocket client disconnected', { clientId });
    }

    /**
     * Update client's metric subscriptions
     * @private
     * @param {string} clientId - Client identifier
     * @param {Array<string>} metrics - Metric types to subscribe to
     */
    _updateClientSubscription(clientId, metrics) {
        const ws = this.clients.get(clientId);
        if (!ws) return;

        // Remove existing subscription
        const oldSubscriptionId = this.subscriptions.get(clientId);
        if (oldSubscriptionId) {
            RealTimeMetricsService.unsubscribe(oldSubscriptionId);
        }

        // Create new filtered subscription
        const subscriptionId = RealTimeMetricsService.subscribe((update) => {
            if (ws.readyState === WebSocket.OPEN && metrics.includes(update.type)) {
                ws.send(JSON.stringify({
                    type: 'update',
                    data: update
                }));
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
        
        // Filter events by time and type
        if (metricType === 'events') {
            return snapshot.events.filter(event => 
                (now - event.timestamp) <= duration
            );
        }

        // Return specific metric type history
        return snapshot[metricType] || [];
    }

    /**
     * Broadcast message to all connected clients
     * @param {Object} message - Message to broadcast
     */
    broadcast(message) {
        this.clients.forEach((ws, clientId) => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(JSON.stringify(message));
                } catch (error) {
                    logger.error('Error broadcasting to client', {
                        clientId,
                        error: error.message
                    });
                }
            }
        });
    }

    /**
     * Get current status of the WebSocket service
     * @returns {Object} Service status
     */
    getStatus() {
        return {
            isRunning: !!this.wss,
            connectedClients: this.clients.size,
            activeSubscriptions: this.subscriptions.size
        };
    }

    /**
     * Close all connections and shutdown the server
     */
    shutdown() {
        if (this.wss) {
            // Close all client connections
            this.clients.forEach((ws, clientId) => {
                try {
                    ws.close();
                } catch (error) {
                    logger.error('Error closing client connection', {
                        clientId,
                        error: error.message
                    });
                }
            });

            // Clear all maps
            this.clients.clear();
            this.subscriptions.clear();

            // Close the server
            this.wss.close(() => {
                logger.info('Metrics WebSocket server shut down');
            });

            this.wss = null;
        }
    }
}

module.exports = new MetricsWebSocketService();