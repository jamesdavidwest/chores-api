const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const MetricsWebSocketService = require('../../../src/services/MetricsWebSocketService');
const RealTimeMetricsService = require('../../../src/services/RealTimeMetricsService');

describe('MetricsWebSocketService Integration', () => {
    let server;
    let app;
    const TEST_PORT = 8082;
    const TEST_URL = `ws://localhost:${TEST_PORT}`;
    let clients = [];

    beforeAll((done) => {
        app = express();
        server = http.createServer(app);
        
        // Start metrics collection
        RealTimeMetricsService.startCollecting();
        
        // Initialize WebSocket service
        MetricsWebSocketService.initialize(server);
        
        server.listen(TEST_PORT, done);
    });

    afterAll((done) => {
        RealTimeMetricsService.stopCollecting();
        MetricsWebSocketService.shutdown();
        server.close(done);
    });

    afterEach(() => {
        // Close all test clients
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.close();
            }
        });
        clients = [];
    });

    describe('Real-time Metrics Flow', () => {
        test('should receive real-time metric updates', (done) => {
            const client = new WebSocket(`${TEST_URL}/ws/metrics`);
            clients.push(client);

            const receivedMessages = {
                snapshot: false,
                update: false
            };

            client.on('message', (data) => {
                const message = JSON.parse(data);
                
                if (message.type === 'snapshot') {
                    receivedMessages.snapshot = true;
                    expect(message.data).toHaveProperty('system');
                    expect(message.data).toHaveProperty('application');
                }

                if (message.type === 'update') {
                    receivedMessages.update = true;
                    expect(message.data).toBeDefined();
                }

                if (receivedMessages.snapshot && receivedMessages.update) {
                    done();
                }
            });
        }, 10000); // Longer timeout for metrics collection

        test('should handle selective metric subscriptions', (done) => {
            const client = new WebSocket(`${TEST_URL}/ws/metrics`);
            clients.push(client);

            const receivedMetrics = new Set();

            client.on('open', () => {
                // Subscribe only to system metrics
                client.send(JSON.stringify({
                    type: 'subscribe',
                    metrics: ['system']
                }));
            });

            client.on('message', (data) => {
                const message = JSON.parse(data);
                
                if (message.type === 'update') {
                    receivedMetrics.add(message.data.type);
                    
                    // Ensure we only receive system metrics
                    expect(message.data.type).toBe('system');
                    expect(receivedMetrics.size).toBe(1);
                    done();
                }
            });
        }, 10000);
    });

    describe('Multi-Client Scenarios', () => {
        test('should handle multiple concurrent clients', (done) => {
            const clientCount = 3;
            const connectedClients = new Set();
            const receivedSnapshots = new Set();

            for (let i = 0; i < clientCount; i++) {
                const client = new WebSocket(`${TEST_URL}/ws/metrics`);
                clients.push(client);

                client.on('open', () => {
                    connectedClients.add(client);
                    if (connectedClients.size === clientCount) {
                        expect(MetricsWebSocketService.getStatus().totalConnections).toBe(clientCount);
                    }
                });

                client.on('message', (data) => {
                    const message = JSON.parse(data);
                    if (message.type === 'snapshot') {
                        receivedSnapshots.add(client);
                        if (receivedSnapshots.size === clientCount) {
                            done();
                        }
                    }
                });
            }
        });

        test('should maintain independent subscriptions', (done) => {
            const systemClient = new WebSocket(`${TEST_URL}/ws/metrics`);
            const applicationClient = new WebSocket(`${TEST_URL}/ws/metrics`);
            clients.push(systemClient, applicationClient);

            const receivedMetrics = {
                system: new Set(),
                application: new Set()
            };

            systemClient.on('open', () => {
                systemClient.send(JSON.stringify({
                    type: 'subscribe',
                    metrics: ['system']
                }));
            });

            applicationClient.on('open', () => {
                applicationClient.send(JSON.stringify({
                    type: 'subscribe',
                    metrics: ['application']
                }));
            });

            systemClient.on('message', (data) => {
                const message = JSON.parse(data);
                if (message.type === 'update') {
                    receivedMetrics.system.add(message.data.type);
                    expect(message.data.type).toBe('system');
                }
                checkCompletion();
            });

            applicationClient.on('message', (data) => {
                const message = JSON.parse(data);
                if (message.type === 'update') {
                    receivedMetrics.application.add(message.data.type);
                    expect(message.data.type).toBe('application');
                }
                checkCompletion();
            });

            function checkCompletion() {
                if (receivedMetrics.system.size > 0 && receivedMetrics.application.size > 0) {
                    done();
                }
            }
        }, 10000);
    });

    describe('Error Handling and Recovery', () => {
        test('should handle client disconnection and cleanup', (done) => {
            const client = new WebSocket(`${TEST_URL}/ws/metrics`);
            clients.push(client);

            client.on('open', () => {
                const initialConnections = MetricsWebSocketService.getStatus().totalConnections;
                client.close();

                setTimeout(() => {
                    const currentConnections = MetricsWebSocketService.getStatus().totalConnections;
                    expect(currentConnections).toBe(initialConnections - 1);
                    done();
                }, 1000);
            });
        });

        test('should handle reconnection with subscription restoration', (done) => {
            const client = new WebSocket(`${TEST_URL}/ws/metrics`);
            clients.push(client);
            let originalSubscription = null;

            client.on('open', () => {
                // Subscribe to metrics
                client.send(JSON.stringify({
                    type: 'subscribe',
                    metrics: ['system', 'application']
                }));

                // Store original subscription
                setTimeout(() => {
                    const status = MetricsWebSocketService.getStatus();
                    originalSubscription = Array.from(MetricsWebSocketService.subscriptions.values())[0];
                    
                    // Force disconnect
                    client.close();

                    // Reconnect
                    setTimeout(() => {
                        const newClient = new WebSocket(`${TEST_URL}/ws/metrics`);
                        clients.push(newClient);

                        newClient.on('open', () => {
                            newClient.send(JSON.stringify({
                                type: 'subscribe',
                                metrics: ['system', 'application']
                            }));

                            // Verify new subscription
                            setTimeout(() => {
                                const newStatus = MetricsWebSocketService.getStatus();
                                expect(newStatus.subscriptions).toBe(1);
                                const newSubscription = Array.from(MetricsWebSocketService.subscriptions.values())[0];
                                expect(newSubscription).not.toBe(originalSubscription);
                                done();
                            }, 500);
                        });
                    }, 500);
                }, 500);
            });
        }, 15000);

        test('should maintain service stability under rapid connect/disconnect', (done) => {
            const connectionAttempts = 10;
            const connections = [];
            let completedOperations = 0;

            function attemptConnection(index) {
                const client = new WebSocket(`${TEST_URL}/ws/metrics`);
                connections.push(client);

                client.on('open', () => {
                    // Close immediately
                    setTimeout(() => {
                        client.close();
                        completedOperations++;
                        
                        if (completedOperations === connectionAttempts) {
                            // Verify service stability
                            setTimeout(() => {
                                const status = MetricsWebSocketService.getStatus();
                                expect(status.totalConnections).toBe(0);
                                expect(MetricsWebSocketService.pool.getConnectionCount()).toBe(0);
                                done();
                            }, 1000);
                        }
                    }, Math.random() * 100);
                });
            }

            // Initiate rapid connections
            for (let i = 0; i < connectionAttempts; i++) {
                setTimeout(() => attemptConnection(i), Math.random() * 100);
            }
        }, 20000);
    });

    describe('Performance and Load', () => {
        test('should handle message bursts', (done) => {
            const client = new WebSocket(`${TEST_URL}/ws/metrics`);
            clients.push(client);
            const messageCount = 50;
            let sentCount = 0;
            let receivedCount = 0;

            client.on('open', () => {
                // Send burst of messages
                for (let i = 0; i < messageCount; i++) {
                    client.send(JSON.stringify({
                        type: 'getSnapshot'
                    }));
                    sentCount++;
                }
            });

            client.on('message', (data) => {
                receivedCount++;
                if (receivedCount === messageCount) {
                    expect(sentCount).toBe(messageCount);
                    done();
                }
            });
        }, 10000);

        test('should maintain performance under load', (done) => {
            const clientCount = 10;
            const messageCount = 10;
            let connectedClients = 0;
            let totalReceived = 0;
            const expectedTotal = clientCount * messageCount;

            for (let i = 0; i < clientCount; i++) {
                const client = new WebSocket(`${TEST_URL}/ws/metrics`);
                clients.push(client);

                client.on('open', () => {
                    connectedClients++;
                    if (connectedClients === clientCount) {
                        // All clients connected, start sending messages
                        clients.forEach(client => {
                            for (let j = 0; j < messageCount; j++) {
                                client.send(JSON.stringify({
                                    type: 'getSnapshot'
                                }));
                            }
                        });
                    }
                });

                client.on('message', () => {
                    totalReceived++;
                    if (totalReceived === expectedTotal) {
                        const status = MetricsWebSocketService.getStatus();
                        expect(status.totalConnections).toBe(clientCount);
                        done();
                    }
                });
            }
        }, 30000);
    });
});