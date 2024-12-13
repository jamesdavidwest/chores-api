const MetricsCoordinator = require('../../../../src/metrics/MetricsCoordinator');
const performanceTestUtils = require('../performanceTestUtils');
const DatabaseService = require('../../../../src/services/DatabaseService');

describe('MetricsCoordinator Integration', () => {
  let coordinator;
  let dbService;

  beforeEach(() => {
    dbService = DatabaseService.getInstance();
    coordinator = new MetricsCoordinator({
      database: dbService,
      config: {
        responseTime: {
          threshold: 100,
          historyLimit: 1000
        },
        memory: {
          heapUsedThreshold: 80,
          historyLimit: 100
        },
        cpu: {
          threshold: 70,
          sampleInterval: 1000
        },
        database: {
          slowQueryThreshold: 100,
          poolSize: 10
        }
      }
    });
  });

  afterEach(async () => {
    await coordinator.shutdown();
  });

  describe('system-wide monitoring', () => {
    it('should collect metrics from all collectors simultaneously', async () => {
      await coordinator.startMonitoring();
      
      // Generate mixed workload
      await Promise.all([
        performanceTestUtils.generateLoad(500, 'medium'),
        performanceTestUtils.simulateDatabaseLoad(10),
        performanceTestUtils.generateMemoryLoad(1000000)
      ]);

      const snapshot = await coordinator.collectSystemSnapshot();
      
      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('responseTime');
      expect(snapshot).toHaveProperty('memory');
      expect(snapshot).toHaveProperty('cpu');
      expect(snapshot).toHaveProperty('database');
      
      expect(snapshot.responseTime).toHaveProperty('mean');
      expect(snapshot.memory).toHaveProperty('heapUsed');
      expect(snapshot.cpu).toHaveProperty('total');
      expect(snapshot.database).toHaveProperty('queryStats');
    });

    it('should detect system-wide performance issues', async () => {
      await coordinator.startMonitoring();

      // Generate heavy load across all metrics
      await Promise.all([
        performanceTestUtils.generateLoad(1000, 'high'),
        performanceTestUtils.generateMemoryLoad(5000000),
        performanceTestUtils.simulateDatabaseLoad(50)
      ]);

      const analysis = await coordinator.analyzeSystemHealth();
      
      expect(analysis).toHaveProperty('status');
      expect(analysis).toHaveProperty('issues');
      expect(analysis).toHaveProperty('recommendations');
      
      expect(Array.isArray(analysis.issues)).toBe(true);
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });
  });

  describe('alert coordination', () => {
    it('should coordinate alerts across collectors', async () => {
      const alerts = [];
      coordinator.on('alert', alert => alerts.push(alert));

      await coordinator.startMonitoring();

      // Trigger multiple threshold violations
      await Promise.all([
        performanceTestUtils.generateLoad(1000, 'high'),
        performanceTestUtils.generateMemoryLoad(10000000)
      ]);

      // Allow time for alerts to be generated
      await performanceTestUtils.sleep(1000);

      expect(alerts.length).toBeGreaterThan(0);
      alerts.forEach(alert => {
        expect(alert).toHaveProperty('type');
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('timestamp');
      });
    });

    it('should deduplicate related alerts', async () => {
      const alerts = [];
      coordinator.on('alert', alert => alerts.push(alert));

      await coordinator.startMonitoring();

      // Trigger multiple similar issues
      for (let i = 0; i < 3; i++) {
        await performanceTestUtils.generateLoad(500, 'high');
        await performanceTestUtils.sleep(100);
      }

      const deduplicated = coordinator.getDeduplicatedAlerts();
      expect(deduplicated.length).toBeLessThan(alerts.length);
    });
  });

  describe('metric correlation', () => {
    it('should identify correlated performance issues', async () => {
      await coordinator.startMonitoring();

      // Generate related issues
      await performanceTestUtils.generateLoad(1000, 'high');
      await performanceTestUtils.simulateDatabaseLoad(20);

      const correlations = await coordinator.analyzeMetricCorrelations();
      
      expect(correlations).toHaveProperty('patterns');
      expect(correlations).toHaveProperty('relationships');
      expect(correlations.patterns.length).toBeGreaterThan(0);
    });

    it('should track cascading performance impacts', async () => {
      await coordinator.startMonitoring();

      // Simulate cascade: CPU -> Memory -> Database
      await performanceTestUtils.generateLoad(1000, 'high');
      await performanceTestUtils.sleep(100);
      await performanceTestUtils.generateMemoryLoad(5000000);
      await performanceTestUtils.sleep(100);
      await performanceTestUtils.simulateDatabaseLoad(30);

      const cascade = await coordinator.analyzeCascadingImpacts();
      
      expect(cascade).toHaveProperty('chain');
      expect(cascade).toHaveProperty('rootCause');
      expect(cascade).toHaveProperty('timeline');
    });
  });

  describe('reporting', () => {
    it('should generate comprehensive performance reports', async () => {
      await coordinator.startMonitoring();

      // Generate mixed workload
      await Promise.all([
        performanceTestUtils.generateLoad(500, 'medium'),
        performanceTestUtils.simulateDatabaseLoad(10),
        performanceTestUtils.generateMemoryLoad(1000000)
      ]);

      const report = await coordinator.generatePerformanceReport();
      
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('issues');
      expect(report).toHaveProperty('trends');
      expect(report).toHaveProperty('recommendations');
    });

    it('should maintain historical reporting data', async () => {
      await coordinator.startMonitoring();

      // Generate data over time
      for (let i = 0; i < 3; i++) {
        await performanceTestUtils.generateLoad(300, 'medium');
        await performanceTestUtils.sleep(500);
      }

      const history = await coordinator.getMetricsHistory();
      
      expect(history.length).toBeGreaterThan(0);
      history.forEach(entry => {
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('metrics');
        expect(entry).toHaveProperty('status');
      });
    });
  });

  describe('resource optimization', () => {
    it('should provide system-wide optimization recommendations', async () => {
      await coordinator.startMonitoring();

      // Generate various performance patterns
      await performanceTestUtils.generateLoad(500, 'high');
      await performanceTestUtils.sleep(200);
      await performanceTestUtils.simulateDatabaseLoad(20);
      await performanceTestUtils.sleep(200);
      await performanceTestUtils.generateMemoryLoad(3000000);

      const optimizations = await coordinator.generateOptimizationPlan();
      
      expect(optimizations).toHaveProperty('immediate');
      expect(optimizations).toHaveProperty('shortTerm');
      expect(optimizations).toHaveProperty('longTerm');
      
      expect(Array.isArray(optimizations.immediate)).toBe(true);
      expect(Array.isArray(optimizations.shortTerm)).toBe(true);
      expect(Array.isArray(optimizations.longTerm)).toBe(true);
    });

    it('should identify resource allocation improvements', async () => {
      await coordinator.startMonitoring();

      // Generate uneven resource usage
      await performanceTestUtils.generateLoad(1000, 'high');
      await performanceTestUtils.generateMemoryLoad(1000000);

      const recommendations = await coordinator.analyzeResourceAllocation();
      
      expect(recommendations).toHaveProperty('cpu');
      expect(recommendations).toHaveProperty('memory');
      expect(recommendations).toHaveProperty('database');
      expect(recommendations).toHaveProperty('priorities');
    });
  });

  describe('monitoring lifecycle', () => {
    it('should handle start/stop monitoring cycles', async () => {
      // Start monitoring
      await coordinator.startMonitoring();
      expect(coordinator.isMonitoring()).toBe(true);

      // Generate some load
      await performanceTestUtils.generateLoad(300, 'medium');

      // Stop monitoring
      await coordinator.stopMonitoring();
      expect(coordinator.isMonitoring()).toBe(false);

      // Verify metrics were collected during monitoring period
      const history = await coordinator.getMetricsHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should cleanup resources on shutdown', async () => {
      await coordinator.startMonitoring();
      
      // Generate some data
      await performanceTestUtils.generateLoad(300, 'medium');
      
      // Shutdown
      await coordinator.shutdown();
      
      // Verify cleanup
      expect(coordinator.isMonitoring()).toBe(false);
      expect(coordinator.hasActiveCollectors()).toBe(false);
    });
  });
});