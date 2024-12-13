const { performance } = require('perf_hooks');

const performanceTestUtils = {
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  generateLoad: async (duration = 1000, intensity = 'medium') => {
    const start = performance.now();
    const loads = {
      low: 100000,
      medium: 500000,
      high: 1000000
    };
    const iterations = loads[intensity] || loads.medium;
    
    while (performance.now() - start < duration) {
      // Generate CPU load
      for (let i = 0; i < iterations; i++) {
        Math.random() * Math.random();
      }
      await performanceTestUtils.sleep(10);
    }
  },

  generateMemoryLoad: (size = 1000000) => {
    const arr = new Array(size).fill(0);
    return arr; // Return to prevent garbage collection during test
  },

  mockMetricsData: {
    responseTime: {
      mean: 150,
      median: 130,
      p95: 250,
      p99: 300,
      count: 1000
    },
    memory: {
      heapUsed: 50000000,
      heapTotal: 100000000,
      external: 1000000,
      arrayBuffers: 500000
    },
    cpu: {
      usage: 45.5,
      system: 15.2,
      user: 30.3
    },
    database: {
      queryCount: 500,
      averageQueryTime: 20,
      slowQueries: 5
    }
  },

  async simulateDatabaseLoad(queryCount = 100) {
    const results = [];
    for (let i = 0; i < queryCount; i++) {
      results.push({
        query: `SELECT * FROM test_table WHERE id = ${i}`,
        duration: Math.random() * 100
      });
    }
    return results;
  }
};

module.exports = performanceTestUtils;