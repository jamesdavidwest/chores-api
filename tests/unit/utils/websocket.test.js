const WebSocket = require('ws');
const { WebSocketConnection, WebSocketPool, CONSTANTS } = require('../../../src/utils/websocket');

// Mock WebSocket server for testing
let wss;
const TEST_PORT = 8080;
const TEST_URL = `ws://localhost:${TEST_PORT}`;

// Create WebSocket server before tests
beforeAll((done) => {
    wss = new WebSocket.Server({ port: TEST_PORT }, done);
});

// Close WebSocket server after tests
afterAll((done) => {
    wss.close(done);
});

describe('WebSocketConnection', () => {
    let connection;

    beforeEach(() => {
        connection = new WebSocketConnection({
            autoReconnect: true,
            maxReconnectAttempts: 3,
            queueMessages: true,
            enableHeartbeat: true,
            heartbeatInterval: 100,
            heartbeatTimeout: 50
        });
    });

    afterEach(async () => {
        if (connection) {
            connection.close();
        }
    });

    describe('Connection Management', () => {
        test('should connect successfully', async () => {
            const connectPromise = connection.connect(TEST_URL);
            
            await expect(connectPromise).resolves.toBeDefined();
            expect(connection.getState()).toBe(CONSTANTS.STATES.CONNECTED);
        });

        test('should handle connection errors', async () => {
            const badUrl = 'ws://invalid-url:9999';
            const connectPromise = connection.connect(badUrl);
            
            await expect(connectPromise).rejects.toThrow();
            expect(connection.getState()).toBe(CONSTANTS.STATES.ERROR);
        });

        test('should attempt reconnection on disconnect', async () => {
            await connection.connect(TEST_URL);
            const originalWs = connection.ws;
            
            // Force disconnect
            originalWs.close();
            
            // Wait for reconnection attempt
            await new Promise(resolve => setTimeout(resolve, CONSTANTS.INITIAL_RECONNECT_DELAY * 2));
            
            expect(connection.reconnectAttempts).toBeGreaterThan(0);
        });

        test('should respect max reconnection attempts', async () => {
            connection = new WebSocketConnection({
                autoReconnect: true,
                maxReconnectAttempts: 1
            });

            await connection.connect(TEST_URL);
            connection.ws.close();

            // Wait for reconnection attempts to complete
            await new Promise(resolve => setTimeout(resolve, CONSTANTS.INITIAL_RECONNECT_DELAY * 3));

            expect(connection.reconnectAttempts).toBeLessThanOrEqual(1);
        });
    });

    describe('Message Handling', () => {
        test('should send messages when connected', async () => {
            await connection.connect(TEST_URL);
            const message = JSON.stringify({ type: 'test', data: 'hello' });

            await expect(connection.send(message)).resolves.toBeUndefined();
        });

        test('should queue messages when disconnected', async () => {
            connection = new WebSocketConnection({
                queueMessages: true
            });

            const message = JSON.stringify({ type: 'test', data: 'hello' });
            await connection.send(message);

            expect(connection.getQueueSize()).toBe(1);
        });

        test('should respect max queue size', async () => {
            connection = new WebSocketConnection({
                queueMessages: true
            });

            const message = JSON.stringify({ type: 'test', data: 'hello' });
            const promises = [];

            // Try to queue more messages than allowed
            for (let i = 0; i <= CONSTANTS.MAX_QUEUE_SIZE + 1; i++) {
                promises.push(connection.send(message));
            }

            await expect(Promise.all(promises)).rejects.toThrow('Message queue full');
        });

        test('should process queued messages on reconnection', async () => {
            await connection.connect(TEST_URL);
            
            // Queue some messages while connected
            const messages = ['message1', 'message2', 'message3'];
            for (const msg of messages) {
                await connection.send(msg);
            }

            // Force disconnect and reconnect
            connection.ws.close();
            await new Promise(resolve => setTimeout(resolve, CONSTANTS.INITIAL_RECONNECT_DELAY * 2));

            // Verify queue is processed
            expect(connection.getQueueSize()).toBe(0);
        });
    });

    describe('Heartbeat Mechanism', () => {
        test('should send heartbeat messages', async () => {
            connection = new WebSocketConnection({
                enableHeartbeat: true,
                heartbeatInterval: 100
            });

            await connection.connect(TEST_URL);
            
            // Wait for heartbeat
            await new Promise(resolve => setTimeout(resolve, 150));
            
            expect(connection.lastHeartbeatResponse).toBeDefined();
        });

        test('should handle heartbeat timeouts', async () => {
            connection = new WebSocketConnection({
                enableHeartbeat: true,
                heartbeatInterval: 100,
                heartbeatTimeout: 50
            });

            await connection.connect(TEST_URL);
            
            // Simulate no heartbeat response
            connection.lastHeartbeatResponse = Date.now() - 1000;
            
            // Wait for timeout check
            await new Promise(resolve => setTimeout(resolve, 200));
            
            expect(connection.getState()).not.toBe(CONSTANTS.STATES.CONNECTED);
        });
    });

    describe('State Management', () => {
        test('should track connection states correctly', async () => {
            const states = [];
            connection.on('connected', () => states.push('connected'));
            connection.on('disconnected', () => states.push('disconnected'));

            await connection.connect(TEST_URL);
            connection.ws.close();

            // Wait for state changes
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(states).toContain('connected');
            expect(states).toContain('disconnected');
        });

        test('should clean up resources on close', async () => {
            await connection.connect(TEST_URL);
            connection.close();

            expect(connection.heartbeatInterval).toBeNull();
            expect(connection.heartbeatTimeout).toBeNull();
            expect(connection.reconnectTimeout).toBeNull();
        });

        test('should handle state transitions', async () => {
            await connection.connect(TEST_URL);
            expect(connection.getState()).toBe(CONSTANTS.STATES.CONNECTED);

            connection.ws.close();
            await new Promise(resolve => setTimeout(resolve, 50));
            expect(connection.getState()).toBe(CONSTANTS.STATES.RECONNECTING);
        });

        test('should emit error events', (done) => {
            connection.on('error', (error) => {
                expect(error).toBeDefined();
                done();
            });

            connection.connect('ws://invalid:9999');
        });
    });
});

describe('WebSocketPool', () => {
    let pool;

    beforeEach(() => {
        pool = new WebSocketPool({
            maxConnections: 3
        });
    });

    afterEach(() => {
        pool.closeAll();
    });

    describe('Pool Management', () => {
        test('should create new connections', async () => {
            const connection = await pool.createConnection('test1', TEST_URL);
            
            expect(connection).toBeDefined();
            expect(pool.getConnectionCount()).toBe(1);
        });

        test('should respect max connections limit', async () => {
            await pool.createConnection('test1', TEST_URL);
            await pool.createConnection('test2', TEST_URL);
            await pool.createConnection('test3', TEST_URL);

            await expect(pool.createConnection('test4', TEST_URL))
                .rejects.toThrow('Maximum connections limit reached');
        });

        test('should remove connections', async () => {
            await pool.createConnection('test1', TEST_URL);
            pool.removeConnection('test1');

            expect(pool.getConnectionCount()).toBe(0);
        });

        test('should close all connections', async () => {
            await pool.createConnection('test1', TEST_URL);
            await pool.createConnection('test2', TEST_URL);
            
            pool.closeAll();

            expect(pool.getConnectionCount()).toBe(0);
        });

        test('should handle duplicate connection IDs', async () => {
            await pool.createConnection('test1', TEST_URL);
            await expect(pool.createConnection('test1', TEST_URL))
                .rejects.toThrow();
        });

        test('should ignore removing non-existent connections', () => {
            expect(() => pool.removeConnection('nonexistent')).not.toThrow();
        });
    });

    describe('Connection Retrieval', () => {
        test('should get existing connection', async () => {
            await pool.createConnection('test1', TEST_URL);
            const connection = pool.getConnection('test1');

            expect(connection).toBeDefined();
            expect(connection instanceof WebSocketConnection).toBe(true);
        });

        test('should return undefined for non-existent connection', () => {
            const connection = pool.getConnection('nonexistent');
            expect(connection).toBeUndefined();
        });

        test('should maintain connection independence', async () => {
            const conn1 = await pool.createConnection('test1', TEST_URL);
            const conn2 = await pool.createConnection('test2', TEST_URL);

            conn1.close();
            expect(conn2.isConnected()).toBe(true);
        });
    });

    describe('Pool Status', () => {
        test('should report correct pool status', async () => {
            await pool.createConnection('test1', TEST_URL);
            await pool.createConnection('test2', TEST_URL);

            const status = pool.getStatus();

            expect(status.totalConnections).toBe(2);
            expect(status.connectionStates).toBeDefined();
        });

        test('should track connection states in status', async () => {
            const conn1 = await pool.createConnection('test1', TEST_URL);
            await pool.createConnection('test2', TEST_URL);

            // Force one connection to disconnect
            conn1.close();

            const status = pool.getStatus();
            expect(status.connectionStates[CONSTANTS.STATES.DISCONNECTED]).toBe(1);
            expect(status.connectionStates[CONSTANTS.STATES.CONNECTED]).toBe(1);
        });

        test('should handle multiple state transitions', async () => {
            const conn = await pool.createConnection('test1', TEST_URL);
            const states = [];

            conn.on('connected', () => states.push('connected'));
            conn.on('disconnected', () => states.push('disconnected'));
            conn.on('error', () => states.push('error'));

            conn.close();
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(states.length).toBeGreaterThan(1);
        });
    });

    describe('Error Handling', () => {
        test('should handle connection failures gracefully', async () => {
            await expect(pool.createConnection('test1', 'ws://invalid:9999'))
                .rejects.toThrow();
            expect(pool.getConnectionCount()).toBe(0);
        });

        test('should cleanup failed connections', async () => {
            try {
                await pool.createConnection('test1', 'ws://invalid:9999');
            } catch (e) {
                // Expected error
            }

            expect(pool.getConnection('test1')).toBeUndefined();
        });

        test('should maintain pool integrity after errors', async () => {
            try {
                await pool.createConnection('test1', 'ws://invalid:9999');
            } catch (e) {
                // Expected error
            }

            const connection = await pool.createConnection('test2', TEST_URL);
            expect(connection).toBeDefined();
            expect(pool.getConnectionCount()).toBe(1);
        });
    });
});