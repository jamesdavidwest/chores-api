const { performance } = require('perf_hooks');
const performanceTestUtils = require('./performanceTestUtils');
const ResponseTimeCollector = require('../../../src/metrics/collectors/responseTime');

describe('ResponseTimeCollector', () => {
  let collector;

  beforeEach(() => {
    collector = new ResponseTimeCollector();
  });

  afterEach(() => {
    collector.reset();
  });

  describe('measurement accuracy', () => {
    it('should accurately measure response times', async () => {
      const delay = 100;
      const start = performance.now();
      
      await performanceTestUtils.sleep(delay);
      const end = performance.now();
      
      const duration = end - start;
      expect(duration).toBeGreaterThanOrEqual(delay);
      expect(duration).toBeLessThan(delay + 50); // Allow 50ms buffer for system variations
    });

    it('should handle multiple concurrent measurements', async () => {
      const measurements = await Promise.all([
        collector.measure(() => performanceTestUtils.sleep(50)),
        collector.measure(() => performanceTestUtils.sleep(100)),
        collector.measure(() => performanceTestUtils.sleep(150))
      ]);

      measurements.forEach((duration, index) => {
        const expectedDelay = (index + 1) * 50;
        expect(duration).toBeGreaterThanOrEqual(expectedDelay);
        expect(duration).toBeLessThan(expectedDelay + 50);
      });
    });
  });

  describe('statistics calculation', () => {
    it('should calculate accurate statistics', async () => {
      // Add known response times
      const times = [100, 150, 200, 250, 300];
      times.forEach(time => collector.addMeasurement(time));

      const stats = collector.getStatistics();
      
      expect(stats.mean).toBe(200);
      expect(stats.median).toBe(200);
      expect(stats.p95).toBe(300);
      expect(stats.p99).toBe(300);
      expect(stats.count).toBe(5);
    });

    it('should handle empty measurements', () => {
      const stats = collector.getStatistics();
      
      expect(stats.mean).toBe(0);
      expect(stats.median).toBe(0);
      expect(stats.p95).toBe(0);
      expect(stats.p99).toBe(0);
      expect(stats.count).toBe(0);
    });
  });

  describe('threshold monitoring', () => {
    it('should detect slow responses', async () => {
      collector.setThreshold(100);
      
      const measurement = await collector.measure(
        () => performanceTestUtils.sleep(150)
      );

      expect(measurement).toBeGreaterThan(100);
      expect(collector.getSlowResponses()).toBe(1);
    });

    it('should track normal responses', async () => {
      collector.setThreshold(200);
      
      await collector.measure(() => performanceTestUtils.sleep(50));
      
      expect(collector.getSlowResponses()).toBe(0);
    });
  });

  describe('data retention', () => {
    it('should maintain history within limits', () => {
      const historyLimit = 1000;
      collector.setHistoryLimit(historyLimit);

      // Add more measurements than the limit
      for (let i = 0; i < historyLimit + 100; i++) {
        collector.addMeasurement(100);
      }

      const stats = collector.getStatistics();
      expect(stats.count).toBe(historyLimit);
    });

    it('should clear history on reset', () => {
      collector.addMeasurement(100);
      collector.reset();

      const stats = collector.getStatistics();
      expect(stats.count).toBe(0);
    });
  });
});