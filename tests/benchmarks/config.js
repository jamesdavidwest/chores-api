/**
 * Performance Benchmarking Configuration
 */

module.exports = {
  // General settings
  settings: {
    runDuration: 300000, // 5 minutes in milliseconds
    warmupDuration: 30000, // 30 seconds warmup
    samplingInterval: 1000, // 1 second between measurements
  },

  // Response time thresholds (in milliseconds)
  responseTime: {
    endpoints: {
      // Authentication endpoints
      '/api/auth/login': { p95: 200, p99: 500 },
      '/api/auth/refresh': { p95: 150, p99: 300 },
      
      // Event endpoints
      '/api/events': { p95: 300, p99: 600 },
      '/api/events/:id': { p95: 200, p99: 400 },
      
      // Instance endpoints
      '/api/instances': { p95: 300, p99: 600 },
      '/api/instances/:id': { p95: 200, p99: 400 },
    },
    global: {
      median: 100,
      p95: 300,
      p99: 600,
    },
  },

  // Memory usage thresholds (in MB)
  memory: {
    heapTotal: 500,
    heapUsed: 400,
    external: 50,
    rss: 800,
  },

  // CPU utilization thresholds (percentage)
  cpu: {
    user: 70,
    system: 30,
    combined: 80,
  },

  // Database performance thresholds
  database: {
    queryTime: {
      select: { p95: 100, p99: 200 },
      insert: { p95: 150, p99: 300 },
      update: { p95: 150, p99: 300 },
      delete: { p95: 100, p99: 200 },
    },
    connections: {
      max: 100,
      active: 80,
      idle: 20,
    },
    pooling: {
      acquireTimeout: 1000,
      idleTimeout: 10000,
    },
  },

  // Cache performance thresholds
  cache: {
    hitRate: 0.8, // 80% hit rate
    missRate: 0.2,
    latency: {
      p95: 50,  // 50ms
      p99: 100,
    },
  },

  // Network thresholds
  network: {
    latency: {
      internal: { p95: 50, p99: 100 },
      external: { p95: 200, p99: 400 },
    },
    throughput: {
      inbound: 100 * 1024 * 1024,  // 100 MB/s
      outbound: 100 * 1024 * 1024, // 100 MB/s
    },
  },
};