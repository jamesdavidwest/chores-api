const AlertNotificationService = require('../../../src/services/AlertNotificationService');
const RealTimeMetricsService = require('../../../src/services/RealTimeMetricsService');
const MetricsWebSocketService = require('../../../src/services/MetricsWebSocketService');
const logger = require('../../../src/services/LoggerService');

// Mock dependencies
jest.mock('../../../src/services/RealTimeMetricsService');
jest.mock('../../../src/services/MetricsWebSocketService');
jest.mock('../../../src/services/LoggerService');

describe('AlertNotificationService', () => {
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Reset service state
        AlertNotificationService.alerts.clear();
        AlertNotificationService.alertHistory = [];
        AlertNotificationService.alertConfigs.clear();
        AlertNotificationService.subscriptions = new Set();
    });

    describe('Alert Configuration Management', () => {
        test('should create new alert configuration', () => {
            const name = 'Test Alert';
            const config = {
                threshold: 90,
                type: 'cpu'
            };

            const configId = AlertNotificationService.createAlertConfig(name, config);
            
            expect(configId).toBeDefined();
            expect(AlertNotificationService.alertConfigs.size).toBe(1);
            
            const savedConfig = AlertNotificationService.getAlertConfig(configId);
            expect(savedConfig.name).toBe(name);
            expect(savedConfig.threshold).toBe(config.threshold);
            expect(savedConfig.enabled).toBe(true);
        });

        test('should update existing alert configuration', () => {
            const configId = AlertNotificationService.createAlertConfig('Test', { threshold: 90 });
            const updates = { threshold: 95, enabled: false };

            AlertNotificationService.updateAlertConfig(configId, updates);
            
            const updatedConfig = AlertNotificationService.getAlertConfig(configId);
            expect(updatedConfig.threshold).toBe(95);
            expect(updatedConfig.enabled).toBe(false);
        });

        test('should throw error when updating non-existent configuration', () => {
            expect(() => {
                AlertNotificationService.updateAlertConfig('nonexistent', {});
            }).toThrow('Alert configuration not found');
        });

        test('should delete alert configuration', () => {
            const configId = AlertNotificationService.createAlertConfig('Test', {});
            AlertNotificationService.deleteAlertConfig(configId);
            
            expect(AlertNotificationService.alertConfigs.has(configId)).toBe(false);
        });

        test('should get all alert configurations', () => {
            AlertNotificationService.createAlertConfig('Test1', {});
            AlertNotificationService.createAlertConfig('Test2', {});

            const configs = AlertNotificationService.getAllAlertConfigs();
            expect(configs.length).toBe(2);
        });
    });

    describe('Alert Subscription Management', () => {
        test('should handle alert subscriptions', () => {
            const callback = jest.fn();
            const subscriptionId = AlertNotificationService.subscribe(callback);

            expect(subscriptionId).toBeDefined();
            expect(AlertNotificationService.subscriptions.size).toBe(1);
        });

        test('should handle alert unsubscriptions', () => {
            const callback = jest.fn();
            const subscriptionId = AlertNotificationService.subscribe(callback);
            
            AlertNotificationService.unsubscribe(subscriptionId);
            expect(AlertNotificationService.subscriptions.size).toBe(0);
        });

        test('should notify subscribers of new alerts', () => {
            const callback = jest.fn();
            AlertNotificationService.subscribe(callback);

            AlertNotificationService._createAlert('TEST', 'Test alert', {}, 'warning');
            
            expect(callback).toHaveBeenCalled();
            expect(callback.mock.calls[0][0]).toHaveProperty('type', 'TEST');
        });

        test('should handle subscriber callback errors', () => {
            const errorCallback = jest.fn(() => {
                throw new Error('Callback error');
            });
            AlertNotificationService.subscribe(errorCallback);

            AlertNotificationService._createAlert('TEST', 'Test alert', {}, 'warning');
            
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('Alert State Management', () => {
        test('should create new alerts', () => {
            const alertId = AlertNotificationService._createAlert(
                'TEST',
                'Test alert',
                { value: 95 },
                'warning'
            );

            expect(alertId).toBeDefined();
            expect(AlertNotificationService.alerts.size).toBe(1);
            expect(MetricsWebSocketService.broadcast).toHaveBeenCalled();
        });

        test('should acknowledge alerts', () => {
            const alertId = AlertNotificationService._createAlert('TEST', 'Test', {}, 'warning');
            AlertNotificationService.acknowledgeAlert(alertId, 'testUser');

            const alert = AlertNotificationService.alerts.get(alertId);
            expect(alert.state).toBe('acknowledged');
            expect(alert.acknowledgedBy).toBe('testUser');
        });

        test('should resolve alerts', () => {
            const alertId = AlertNotificationService._createAlert('TEST', 'Test', {}, 'warning');
            AlertNotificationService.resolveAlert(alertId, 'testUser', 'Issue fixed');

            expect(AlertNotificationService.alerts.has(alertId)).toBe(false);
            expect(AlertNotificationService.alertHistory.length).toBe(1);
            expect(AlertNotificationService.alertHistory[0].resolution).toBe('Issue fixed');
        });

        test('should get active alerts', () => {
            AlertNotificationService._createAlert('TEST1', 'Test 1', {}, 'warning');
            AlertNotificationService._createAlert('TEST2', 'Test 2', {}, 'error');

            const activeAlerts = AlertNotificationService.getActiveAlerts();
            expect(activeAlerts.length).toBe(2);
        });

        test('should filter alert history', () => {
            // Create and resolve some alerts
            const alertId1 = AlertNotificationService._createAlert('TEST1', 'Test 1', {}, 'warning');
            const alertId2 = AlertNotificationService._createAlert('TEST2', 'Test 2', {}, 'error');
            
            AlertNotificationService.resolveAlert(alertId1, 'user1', 'Fixed 1');
            AlertNotificationService.resolveAlert(alertId2, 'user2', 'Fixed 2');

            // Test filtering
            const warningAlerts = AlertNotificationService.getAlertHistory({ severity: 'warning' });
            expect(warningAlerts.length).toBe(1);
            expect(warningAlerts[0].type).toBe('TEST1');
        });
    });

    describe('Metric Evaluation', () => {
        test('should evaluate system metrics', () => {
            const metrics = {
                cpu: {
                    usage: { user: 96 }  // Above critical threshold
                },
                memory: {
                    usagePercent: 86     // Above error threshold
                }
            };

            AlertNotificationService._evaluateSystemMetrics(metrics);

            const activeAlerts = AlertNotificationService.getActiveAlerts();
            expect(activeAlerts.length).toBe(2);
            expect(activeAlerts.some(alert => alert.type === 'CPU_CRITICAL')).toBe(true);
            expect(activeAlerts.some(alert => alert.type === 'MEMORY_ERROR')).toBe(true);
        });

        test('should evaluate application metrics', () => {
            const metrics = {
                errorRate: 0.21,           // Above critical threshold
                responseTime: {
                    average: 3500          // Above error threshold
                }
            };

            AlertNotificationService._evaluateApplicationMetrics(metrics);

            const activeAlerts = AlertNotificationService.getActiveAlerts();
            expect(activeAlerts.length).toBe(2);
            expect(activeAlerts.some(alert => alert.type === 'ERROR_RATE_CRITICAL')).toBe(true);
            expect(activeAlerts.some(alert => alert.type === 'RESPONSE_TIME_ERROR')).toBe(true);
        });

        test('should evaluate database metrics', () => {
            const metrics = {
                poolStatus: {
                    used: 90,
                    total: 100             // 90% usage - above error threshold
                },
                responseTime: {
                    average: 5500          // Above critical threshold
                }
            };

            AlertNotificationService._evaluateDatabaseMetrics(metrics);

            const activeAlerts = AlertNotificationService.getActiveAlerts();
            expect(activeAlerts.length).toBe(2);
            expect(activeAlerts.some(alert => alert.type === 'DB_POOL_ERROR')).toBe(true);
            expect(activeAlerts.some(alert => alert.type === 'DB_QUERY_TIME_CRITICAL')).toBe(true);
        });
    });

    describe('Service Status', () => {
        test('should report correct service status', () => {
            // Create some alerts in different states
            const alertId1 = AlertNotificationService._createAlert('TEST1', 'Test 1', {}, 'warning');
            const alertId2 = AlertNotificationService._createAlert('TEST2', 'Test 2', {}, 'critical');
            AlertNotificationService.acknowledgeAlert(alertId1, 'user1');

            const status = AlertNotificationService.getStatus();

            expect(status.activeAlerts).toBe(2);
            expect(status.severityCounts.warning).toBe(1);
            expect(status.severityCounts.critical).toBe(1);
            expect(status.stateCounts.active).toBe(1);
            expect(status.stateCounts.acknowledged).toBe(1);
        });
    });

    describe('Error Handling', () => {
        test('should handle metric update errors', () => {
            const badMetrics = {};  // Invalid metrics object
            
            AlertNotificationService._handleMetricUpdate({
                type: 'system',
                data: badMetrics
            });

            expect(logger.error).toHaveBeenCalled();
        });

        test('should handle invalid alert state transitions', () => {
            const alertId = AlertNotificationService._createAlert('TEST', 'Test', {}, 'warning');
            
            // Try to resolve a non-existent alert
            AlertNotificationService.resolveAlert('nonexistent', 'user', 'note');
            
            // Verify original alert is unchanged
            expect(AlertNotificationService.alerts.has(alertId)).toBe(true);
        });
    });

    describe('Integration with RealTimeMetricsService', () => {
        test('should handle metric updates from RealTimeMetricsService', () => {
            // Get the callback that was registered with RealTimeMetricsService
            const metricsCallback = RealTimeMetricsService.subscribe.mock.calls[0][0];
            
            // Simulate a metric update
            metricsCallback({
                type: 'system',
                data: {
                    cpu: {
                        usage: { user: 96 }  // Above critical threshold
                    }
                }
            });

            const activeAlerts = AlertNotificationService.getActiveAlerts();
            expect(activeAlerts.length).toBe(1);
            expect(activeAlerts[0].type).toBe('CPU_CRITICAL');
        });
    });

    describe('Integration with MetricsWebSocketService', () => {
        test('should broadcast alerts through WebSocket service', () => {
            AlertNotificationService._createAlert('TEST', 'Test alert', {}, 'warning');

            expect(MetricsWebSocketService.broadcast).toHaveBeenCalledWith({
                type: 'alert',
                data: expect.objectContaining({
                    type: 'TEST',
                    severity: 'warning'
                })
            });
        });
    });
});