const request = require('supertest');
const app = require('../../../../src/app');
const MetricsCoordinator = require('../../../../src/metrics/MetricsCoordinator');
const DatabaseService = require('../../../../src/services/DatabaseService');
const LoggerService = require('../../../../src/services/LoggerService');
const performanceTestUtils = require('../performanceTestUtils');

describe('Performance Monitoring System E2E', () => {
  let coordinator;
  let dbService;
  let logger;

  beforeAll(async () => {
    // Initialize services
    dbService = DatabaseService.getInstance();
    logger = LoggerService.getInstance();
    
    coordinator = new MetricsCoordinator({
      database: dbService,
      logger,
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

    await coordinator.startMonitoring();
  });

  afterAll(async () => {
    await coordinator.shutdown();
    await dbService.disconnect();
  });

  describe('System Load Tests', () => {
    it('should handle sustained load while maintaining performance', async () => {
      const metrics = {
        start: await coordinator.collectSystemSnapshot(),
        intermediate: [],
        end: null
      };

      // Generate sustained load
      const loadDuration = 5000;
      const loadStart = Date.now();

      while (Date.now() - loadStart < loadDuration) {
        await Promise.all([
          request(app).get('/api/users').expect(200),
          request(app).get('/api/events').expect(200),
          performanceTestUtils.generateLoad(100, 'medium')
        ]);

        metrics.intermediate.push(await coordinator.collectSystemSnapshot());
        await performanceTestUtils.sleep(100);
      }

      metrics.end = await coordinator.collectSystemSnapshot();

      // Analyze performance stability
      const analysis = await coordinator.analyzePerformanceStability(metrics);
      
      expect(analysis.stability).toBeGreaterThan(0.7); // 70% stability threshold
      expect(analysis.degradation).toBeLessThan(0.2); // Max 20% degradation
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Real-World Scenario Tests', () => {
    it('should handle mixed workload patterns', async () => {
      const workloads = [
        // Authentication surge
        async () => {
          await Promise.all(Array(20).fill().map(() => 
            request(app).post('/api/auth/login').send({
              email: 'test@example.com',
              password: 'password123'
            })
          ));
        },
        // Data processing
        async () => {
          await Promise.all(Array(5).fill().map(() =>
            request(app).post('/api/events/bulk').send([
              { title: 'Event 1', description: 'Test event 1' },
              { title: 'Event 2', description: 'Test event 2' }
            ])
          ));
        },
        // Read operations
        async () => {
          await Promise.all(Array(50).fill().map(() =>
            request(app).get('/api/events')
          ));
        }
      ];

      const results = {
        metrics: [],
        errors: [],
        alerts: []
      };

      // Register metric collection
      coordinator.on('metrics', metric => results.metrics.push(metric));
      coordinator.on('error', error => results.errors.push(error));
      coordinator.on('alert', alert => results.alerts.push(alert));

      // Execute workloads
      for (const workload of workloads) {
        await workload();
        await performanceTestUtils.sleep(500);
      }

      const analysis = await coordinator.analyzeWorkloadImpact(results);
      
      expect(analysis.serviceLevel).toBeGreaterThan(0.95); // 95% SLA
      expect(analysis.resourceUtilization).toBeLessThan(0.8); // Max 80% utilization
      expect(analysis.errorRate).toBeLessThan(0.01); // Max 1% error rate
    });

    it('should maintain data consistency under load', async () => {
      // Start transaction monitoring
      const transactionMonitor = coordinator.getTransactionMonitor();
      
      // Create test data
      const testData = Array(100).fill().map((_, i) => ({
        title: `Test Event ${i}`,
        description: `Description for test event ${i}`,
        date: new Date(),
        type: i % 2 === 0 ? 'type1' : 'type2'
      }));

      // Perform concurrent operations
      const operations = testData.map(async (event, index) => {
        if (index % 3 === 0) {
          // Create
          return request(app)
            .post('/api/events')
            .send(event);
        } else if (index % 3 === 1) {
          // Update
          return request(app)
            .put(`/api/events/${index}`)
            .send({ ...event, title: `Updated ${event.title}` });
        } else {
          // Read
          return request(app)
            .get(`/api/events/${index}`);
        }
      });

      await Promise.all(operations);

      const consistencyCheck = await transactionMonitor.validateDataConsistency();
      expect(consistencyCheck.consistent).toBe(true);
      expect(consistencyCheck.anomalies).toHaveLength(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle and recover from cascade failures', async () => {
      const errorHandler = coordinator.getErrorHandler();
      const cascade = {
        events: [],
        recoveries: []
      };

      coordinator.on('cascadeFailure', event => cascade.events.push(event));
      coordinator.on('recovery', event => cascade.recoveries.push(event));

      // Trigger cascade scenario
      await Promise.all([
        // Memory pressure
        performanceTestUtils.generateMemoryLoad(100000000),
        // CPU spike
        performanceTestUtils.generateLoad(2000, 'high'),
        // Database load
        performanceTestUtils.simulateDatabaseLoad(100),
        // Application requests
        Promise.all(Array(100).fill().map(() => 
          request(app).get('/api/events')
        ))
      ]);

      // Allow time for recovery
      await performanceTestUtils.sleep(5000);

      const analysis = errorHandler.analyzeCascadeScenario(cascade);
      
      expect(analysis.containment).toBe('successful');
      expect(analysis.recoveryTime).toBeLessThan(10000);
      expect(analysis.serviceRestoration).toBe('complete');
    });
  });

  describe('Performance Optimization', () => {
    it('should suggest and validate optimization strategies', async () => {
      // Generate baseline metrics
      const baseline = await coordinator.collectSystemSnapshot();
      
      // Generate load to identify optimization opportunities
      await Promise.all([
        performanceTestUtils.generateLoad(1000, 'medium'),
        performanceTestUtils.simulateDatabaseLoad(30),
        request(app).get('/api/events').query({ limit: 1000 })
      ]);

      const optimization = await coordinator.generateOptimizationStrategies();
      
      expect(optimization.strategies.length).toBeGreaterThan(0);
      expect(optimization.estimated_impact).toBeGreaterThan(0);
      
      // Validate optimization suggestions
      optimization.strategies.forEach(strategy => {
        expect(strategy).toHaveProperty('type');
        expect(strategy).toHaveProperty('impact');
        expect(strategy).toHaveProperty('implementation_complexity');
        expect(strategy).toHaveProperty('priority');
      });
    });
  });
});