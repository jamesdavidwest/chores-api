const WebSocket = require('ws');
const MetricsWebSocketService = require('../../../src/services/MetricsWebSocketService');
const RealTimeMetricsService = require('../../../src/services/RealTimeMetricsService');
const { WebSocketPool } = require('../../../src/utils/websocket');

// Mock dependencies
jest.mock('../../../src/services/RealTimeMetricsService');
jest.mock('../../../src/services/LoggerService');

describe('MetricsWebSocketService', () => {
    let server;
    const TEST_PORT = 8081;
    const TEST_URL = `ws://localhost:${TEST_PORT}`;
    let wsClient;

    beforeAll((done) => {
        server = new WebSocket.Server({ port: TEST_PORT }, done);
    });

    afterAll((done) => {
        server.close(done);
    });

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock RealTimeMetricsService methods
        RealTimeMetricsService.getMetricsSnapshot.mockReturnValue({
            system: { cpu: 50, memory: 70 },
            application: { requests: 100 },
            events: []
        });
        RealTimeMetricsService.subscribe.mockReturnValue('mock-subscription-id');
    });

    afterEach(() => {
        if (wsClient && wsClient.readyState === WebSocket.OPEN) {
            wsClient.close();
        }
        MetricsWebSocketService.shutdown();
    });

    describe('Initialization', () => {
        test('should initialize WebSocket server correctly', () => {
            MetricsWebSocketService.initialize(server);
            expect(MetricsWebSocketService.wss).toBeDefined();
        });

        test('should accept custom path configuration', () => {
            const customPath = '/custom/ws/path';
            MetricsWebSocketService.initialize(server, { path: customPath });
            expect(MetricsWebSocketService.wss.options.path).toBe(customPath);
        });

        test('should initialize with default configuration when no options provided', () => {
            MetricsWebSocketService.initialize(server);
            expect(MetricsWebSocketService.wss.options.path).toBe('/ws/metrics');
        });
    });

    describe('Connection Management', () => {
        test('should handle new client connections', (done) => {
            MetricsWebSocketService.initialize(server);
            wsClient = new WebSocket(`${TEST_URL}/ws/metrics`);

            wsClient.on('open', () => {
                expect(MetricsWebSocketService.pool.getConnectionCount()).toBe(1);
                done();
            });
        });

        test('should send initial metrics snapshot on connection', (done) => {
            MetricsWebSocketService.initialize(server);
            wsClient = new WebSocket(`${TEST_URL}/ws/metrics`);

            wsClient.on('message', (data) => {
                const message = JSON.parse(data);
                expect(message.type).toBe('snapshot');
                expect(message.data).toBeDefined();
                done();
            });
        });

        test('should handle client disconnection', (done) => {
            MetricsWebSocketService.initialize(server);
            wsClient = new WebSocket(`${TEST_URL}/ws/metrics`);

            wsClient.on('open', () => {
                wsClient.close();
                setTimeout(() => {
                    expect(MetricsWebSocketService.pool.getConnectionCount()).toBe(0);
                    done();
                }, 100);
            });
        });

        test('should clean up resources on client disconnection', (done) => {
            MetricsWebSocketService.initialize(server);
            wsClient = new WebSocket(`${TEST_URL}/ws/metrics`);

            wsClient.on('open', () => {
                const clientId = Object.keys(MetricsWebSocketService.pool.connections)[0];
                wsClient.close();
                
                setTimeout(() => {
                    expect(MetricsWebSocketService.subscriptions.has(clientId)).toBe(false);
                    expect(MetricsWebSocketService.clientMetadata.has(clientId)).toBe(false);
                    done();
                }, 100);
            });
        });
    });

    describe('Message Handling', () => {
        beforeEach((done) => {
            MetricsWebSocketService.initialize(server);
            wsClient = new WebSocket(`${TEST_URL}/ws/metrics`);
            wsClient.on('open', done);
        });

        test('should handle subscribe messages', (done) => {
            const subscribeMessage = {
                type: 'subscribe',
                metrics: ['system', 'application']
            };

            wsClient.send(JSON.stringify(subscribeMessage));

            setTimeout(() => {
                expect(RealTimeMetricsService.subscribe).toHaveBeenCalled();
                done();
            }, 100);
        });

        test('should handle getSnapshot messages', (done) => {
            const snapshotMessage = {
                type: 'getSnapshot'
            };

            wsClient.on('message', (data) => {
                const message = JSON.parse(data);
                if (message.type === 'snapshot') {
                    expect(message.data).toBeDefined();
                    expect(RealTimeMetricsService.getMetricsSnapshot).toHaveBeenCalled();
                    done();
                }
            });

            wsClient.send(JSON.stringify(snapshotMessage));
        });

        test('should handle getHistory messages', (done) => {
            const historyMessage = {
                type: 'getHistory',
                metricType: 'events',
                duration: 3600000
            };

            wsClient.on('message', (data) => {
                const message = JSON.parse(data);
                if (message.type === 'history') {
                    expect(message.data).toBeDefined();
                    expect(Array.isArray(message.data)).toBe(true);
                    done();
                }
            });

            wsClient.send(JSON.stringify(historyMessage));
        });

        test('should handle invalid messages gracefully', (done) => {
            const invalidMessage = 'invalid-json';

            wsClient.send(invalidMessage);

            // Wait for error handling
            setTimeout(() => {
                // Verify client is still connected
                expect(wsClient.readyState).toBe(WebSocket.OPEN);
                done();
            }, 100);
        });
    });

    describe('Subscription Management', () => {
        test('should update client subscriptions', (done) => {
            MetricsWebSocketService.initialize(server);
            wsClient = new WebSocket(`${TEST_URL}/ws/metrics`);

            wsClient.on('open', () => {
                const subscribeMessage = {
                    type: 'subscribe',
                    metrics: ['system']
                };

                wsClient.send(JSON.stringify(subscribeMessage));

                setTimeout(() => {
                    const clientId = Object.keys(MetricsWebSocketService.pool.connections)[0];
                    expect(MetricsWebSocketService.subscriptions.has(clientId)).toBe(true);
                    done();
                }, 100);
            });
        });

        test('should handle subscription updates', (done) => {
            MetricsWebSocketService.initialize(server);
            wsClient = new WebSocket(`${TEST_URL}/ws/metrics`);

            wsClient.on('open', () => {
                // First subscription
                wsClient.send(JSON.stringify({
                    type: 'subscribe',
                    metrics: ['system']
                }));

                // Update subscription
                setTimeout(() => {
                    wsClient.send(JSON.stringify({
                        type: 'subscribe',
                        metrics: ['system', 'application']
                    }));

                    setTimeout(() => {
                        expect(RealTimeMetricsService.subscribe).toHaveBeenCalledTimes(3); // Initial + 2 updates
                        done();
                    }, 100);
                }, 100);
            });
        });
    });

    describe('Broadcasting', () => {
        test('should broadcast messages to all connected clients', (done) => {
            MetricsWebSocketService.initialize(server);
            const clients = [];
            const messageCount = {
                client1: 0,
                client2: 0
            };

            // Create two clients
            const client1 = new WebSocket(`${TEST_URL}/ws/metrics`);
            const client2 = new WebSocket(`${TEST_URL}/ws/metrics`);
            clients.push(client1, client2);

            client1.on('message', () => {
                messageCount.client1++;
                checkCompletion();
            });

            client2.on('message', () => {
                messageCount.client2++;
                checkCompletion();
            });

            // Wait for both clients to connect
            let connectedClients = 0;
            [client1, client2].forEach(client => {
                client.on('open', () => {
                    connectedClients++;
                    if (connectedClients === 2) {
                        // Broadcast a message
                        MetricsWebSocketService.broadcast({
                            type: 'test',
                            data: 'broadcast message'
                        });
                    }
                });
            });

            function checkCompletion() {
                // Check if both clients received the broadcast
                if (messageCount.client1 >= 1 && messageCount.client2 >= 1) {
                    clients.forEach(client => client.close());
                    done();
                }
            }
        });
    });

    describe('Status Reporting', () => {
        test('should report correct service status', (done) => {
            MetricsWebSocketService.initialize(server);
            wsClient = new WebSocket(`${TEST_URL}/ws/metrics`);

            wsClient.on('open', () => {
                const status = MetricsWebSocketService.getStatus();
                
                expect(status.totalConnections).toBe(1);
                expect(status.subscriptions).toBeDefined();
                expect(status.clientsMetadata).toBeDefined();
                expect(status.clientsMetadata.total).toBe(1);
                
                done();
            });
        });
    });

    describe('Cleanup and Shutdown', () => {
        test('should clean up inactive clients', (done) => {
            MetricsWebSocketService.initialize(server);
            wsClient = new WebSocket(`${TEST_URL}/ws/metrics`);

            wsClient.on('open', () => {
                const clientId = Object.keys(MetricsWebSocketService.pool.connections)[0];
                const metadata = MetricsWebSocketService.clientMetadata.get(clientId);
                
                // Set last activity to old timestamp
                metadata.lastActivity = Date.now() - (6 * 60 * 1000); // 6 minutes ago
                MetricsWebSocketService.clientMetadata.set(clientId, metadata);

                // Trigger cleanup
                MetricsWebSocketService._cleanupInactiveClients();

                setTimeout(() => {
                    expect(MetricsWebSocketService.pool.getConnectionCount()).toBe(0);
                    done();
                }, 100);
            });
        });

        test('should perform complete shutdown', (done) => {
            MetricsWebSocketService.initialize(server);
            wsClient = new WebSocket(`${TEST_URL}/ws/metrics`);

            wsClient.on('open', () => {
                MetricsWebSocketService.shutdown();

                setTimeout(() => {
                    expect(MetricsWebSocketService.pool.getConnectionCount()).toBe(0);
                    expect(MetricsWebSocketService.subscriptions.size).toBe(0);
                    expect(MetricsWebSocketService.clientMetadata.size).toBe(0);
                    expect(MetricsWebSocketService.wss).toBeNull();
                    done();
                }, 100);
            });
        });
    });
});