const os = require('os');
const performanceTestUtils = require('./performanceTestUtils');
const CpuCollector = require('../../../src/metrics/collectors/cpu');

describe('CpuCollector', () => {
  let collector;

  beforeEach(() => {
    collector = new CpuCollector();
  });

  afterEach(() => {
    collector.reset();
  });

  describe('CPU usage measurement', () => {
    it('should capture CPU metrics', async () => {
      const metrics = await collector.captureMetrics();
      
      expect(metrics).toHaveProperty('system');
      expect(metrics).toHaveProperty('user');
      expect(metrics).toHaveProperty('total');
      
      expect(metrics.total).toBeGreaterThanOrEqual(0);
      expect(metrics.total).toBeLessThanOrEqual(100);
    });

    it('should detect CPU load increases', async () => {
      const initialMetrics = await collector.captureMetrics();
      
      // Generate CPU load
      await performanceTestUtils.generateLoad(1000, 'high');
      
      const newMetrics = await collector.captureMetrics();
      
      expect(newMetrics.total).toBeGreaterThan(initialMetrics.total);
    });
  });

  describe('CPU thresholds', () => {
    it('should detect threshold violations', async () => {
      collector.setThreshold(0); // Set threshold to 0 to ensure violation
      
      await performanceTestUtils.generateLoad(1000, 'high');
      
      const violation = await collector.checkThreshold();
      expect(violation).toBe(true);
    });

    it('should track threshold violations over time', async () => {
      collector.setThreshold(50);
      
      // Generate multiple load periods
      for (let i = 0; i < 3; i++) {
        await performanceTestUtils.generateLoad(500, 'high');
        await collector.captureMetrics();
      }

      const violations = collector.getThresholdViolations();
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe('CPU load patterns', () => {
    it('should detect sustained high CPU usage', async () => {
      // Generate sustained load
      for (let i = 0; i < 3; i++) {
        await performanceTestUtils.generateLoad(500, 'high');
        await collector.captureMetrics();
      }

      const pattern = collector.analyzeLoadPattern();
      expect(pattern.sustained).toBe(true);
    });

    it('should identify CPU spikes', async () => {
      // Generate spike pattern
      await collector.captureMetrics(); // baseline
      await performanceTestUtils.generateLoad(1000, 'high');
      await collector.captureMetrics(); // spike
      await performanceTestUtils.sleep(500);
      await collector.captureMetrics(); // recovery

      const pattern = collector.analyzeLoadPattern();
      expect(pattern.spikes).toBeGreaterThan(0);
    });
  });

  describe('multi-core metrics', () => {
    it('should collect per-core metrics', async () => {
      const metrics = await collector.capturePerCoreMetrics();
      const cpuCount = os.cpus().length;

      expect(metrics.length).toBe(cpuCount);
      metrics.forEach(coreMetrics => {
        expect(coreMetrics).toHaveProperty('user');
        expect(coreMetrics).toHaveProperty('system');
        expect(coreMetrics).toHaveProperty('idle');
      });
    });

    it('should detect uneven core utilization', async () => {
      const metrics = await collector.capturePerCoreMetrics();
      const analysis = collector.analyzeCoreParity(metrics);

      expect(analysis).toHaveProperty('balanced');
      expect(analysis).toHaveProperty('deviation');
      expect(analysis).toHaveProperty('recommendations');
    });
  });

  describe('historical analysis', () => {
    it('should maintain historical CPU metrics', async () => {
      const samples = 5;
      
      for (let i = 0; i < samples; i++) {
        await collector.captureMetrics();
        await performanceTestUtils.sleep(100);
      }

      const history = collector.getHistory();
      expect(history.length).toBe(samples);
      
      history.forEach(sample => {
        expect(sample).toHaveProperty('timestamp');
        expect(sample).toHaveProperty('metrics');
        expect(sample.metrics).toHaveProperty('total');
      });
    });

    it('should calculate moving averages', async () => {
      // Collect varied CPU metrics
      await collector.captureMetrics(); // baseline
      await performanceTestUtils.generateLoad(500, 'low');
      await collector.captureMetrics();
      await performanceTestUtils.generateLoad(500, 'high');
      await collector.captureMetrics();

      const movingAvg = collector.calculateMovingAverage(3);
      expect(movingAvg).toBeGreaterThan(0);
      expect(movingAvg).toBeLessThan(100);
    });
  });

  describe('resource optimization', () => {
    it('should suggest optimization strategies', async () => {
      // Generate varied load pattern
      await collector.captureMetrics();
      await performanceTestUtils.generateLoad(500, 'high');
      await collector.captureMetrics();
      await performanceTestUtils.sleep(500);
      await collector.captureMetrics();

      const strategies = collector.generateOptimizationStrategies();
      
      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBeGreaterThan(0);
      strategies.forEach(strategy => {
        expect(strategy).toHaveProperty('type');
        expect(strategy).toHaveProperty('recommendation');
        expect(strategy).toHaveProperty('priority');
      });
    });

    it('should identify idle periods', async () => {
      // Simulate some activity followed by idle period
      await performanceTestUtils.generateLoad(500, 'medium');
      await collector.captureMetrics();
      await performanceTestUtils.sleep(1000);
      await collector.captureMetrics();

      const idlePeriods = collector.findIdlePeriods();
      expect(idlePeriods.length).toBeGreaterThan(0);
      idlePeriods.forEach(period => {
        expect(period).toHaveProperty('start');
        expect(period).toHaveProperty('end');
        expect(period).toHaveProperty('duration');
      });
    });
  });
});