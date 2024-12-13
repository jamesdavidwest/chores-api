const performanceTestUtils = require('./performanceTestUtils');
const MemoryCollector = require('../../../src/metrics/collectors/memory');

describe('MemoryCollector', () => {
  let collector;

  beforeEach(() => {
    collector = new MemoryCollector();
  });

  afterEach(() => {
    collector.reset();
  });

  describe('memory measurement', () => {
    it('should capture current memory usage', () => {
      const snapshot = collector.captureSnapshot();
      
      expect(snapshot).toHaveProperty('heapUsed');
      expect(snapshot).toHaveProperty('heapTotal');
      expect(snapshot).toHaveProperty('external');
      expect(snapshot).toHaveProperty('arrayBuffers');
      
      expect(snapshot.heapUsed).toBeGreaterThan(0);
      expect(snapshot.heapTotal).toBeGreaterThan(snapshot.heapUsed);
    });

    it('should detect memory increases', () => {
      const initialSnapshot = collector.captureSnapshot();
      
      // Generate memory load
      const memoryLoad = performanceTestUtils.generateMemoryLoad(1000000);
      
      const newSnapshot = collector.captureSnapshot();
      
      expect(newSnapshot.heapUsed).toBeGreaterThan(initialSnapshot.heapUsed);
      
      // Keep reference to prevent garbage collection during test
      expect(memoryLoad.length).toBe(1000000);
    });
  });

  describe('memory thresholds', () => {
    it('should detect heap usage threshold violations', () => {
      const threshold = process.memoryUsage().heapUsed + 1000000;
      collector.setHeapUsedThreshold(threshold);
      
      // Generate memory load
      const memoryLoad = performanceTestUtils.generateMemoryLoad(2000000);
      
      const isThresholdExceeded = collector.checkThresholds();
      
      expect(isThresholdExceeded).toBe(true);
      
      // Keep reference to prevent garbage collection during test
      expect(memoryLoad.length).toBe(2000000);
    });

    it('should handle multiple thresholds', () => {
      const currentMemory = process.memoryUsage();
      
      collector.setThresholds({
        heapUsed: currentMemory.heapUsed + 1000000,
        heapTotal: currentMemory.heapTotal + 2000000,
        external: currentMemory.external + 500000
      });

      const violations = collector.checkAllThresholds();
      
      expect(violations).toHaveProperty('heapUsed');
      expect(violations).toHaveProperty('heapTotal');
      expect(violations).toHaveProperty('external');
    });
  });

  describe('memory history', () => {
    it('should maintain history of measurements', async () => {
      const measurements = 5;
      
      for (let i = 0; i < measurements; i++) {
        collector.captureSnapshot();
        await performanceTestUtils.sleep(100);
      }

      const history = collector.getHistory();
      expect(history.length).toBe(measurements);
      
      history.forEach(snapshot => {
        expect(snapshot).toHaveProperty('timestamp');
        expect(snapshot).toHaveProperty('metrics');
        expect(snapshot.metrics).toHaveProperty('heapUsed');
      });
    });

    it('should calculate memory growth rate', async () => {
      const initialSnapshot = collector.captureSnapshot();
      
      // Generate increasing memory load
      const loads = [];
      for (let i = 0; i < 3; i++) {
        loads.push(performanceTestUtils.generateMemoryLoad(1000000 * (i + 1)));
        collector.captureSnapshot();
        await performanceTestUtils.sleep(100);
      }

      const growthRate = collector.calculateGrowthRate();
      
      expect(growthRate).toBeGreaterThan(0);
      
      // Keep reference to prevent garbage collection during test
      expect(loads.length).toBe(3);
    });
  });

  describe('memory leak detection', () => {
    it('should detect potential memory leaks', async () => {
      const loads = [];
      
      // Simulate a memory leak with continuously growing arrays
      for (let i = 0; i < 5; i++) {
        loads.push(performanceTestUtils.generateMemoryLoad(1000000 * (i + 1)));
        collector.captureSnapshot();
        await performanceTestUtils.sleep(100);
      }

      const leakDetected = collector.detectPotentialLeak();
      
      expect(leakDetected).toBe(true);
      
      // Keep reference to prevent garbage collection during test
      expect(loads.length).toBe(5);
    });

    it('should handle normal memory fluctuations', async () => {
      // Simulate normal memory usage patterns
      for (let i = 0; i < 5; i++) {
        const load = performanceTestUtils.generateMemoryLoad(1000000);
        collector.captureSnapshot();
        await performanceTestUtils.sleep(100);
        // Let the load be garbage collected
        expect(load.length).toBe(1000000);
      }

      const leakDetected = collector.detectPotentialLeak();
      
      expect(leakDetected).toBe(false);
    });
  });
});