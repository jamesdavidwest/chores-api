# Performance Benchmarking System

## Overview
This directory contains a comprehensive performance benchmarking system for the backend boilerplate. It provides tools for measuring, collecting, and analyzing various performance metrics including response times, memory usage, CPU utilization, and database performance.

## Structure
```
benchmarks/
├── config.js               # Configuration settings
├── metrics/               # Individual metric collectors
│   ├── responseTime.js    # API response time tracking
│   ├── memory.js         # Memory usage monitoring
│   ├── cpu.js           # CPU utilization tracking
│   └── database.js      # Database performance metrics
├── collectors/           # Metric aggregation
│   └── MetricsCollector.js # Central metrics coordinator
├── reporters/            # Report generation
│   └── MetricsReporter.js # Report formatting and output
└── runBenchmark.js      # Example usage and utilities
```

## Features

### 1. Response Time Metrics
- Endpoint-specific timing
- Percentile calculations (p50, p95, p99)
- Request count tracking
- Success rate monitoring

### 2. Memory Metrics
- Heap usage monitoring
- Memory leak detection
- Garbage collection impact analysis
- Resource utilization tracking

### 3. CPU Metrics
- CPU usage by type (user, system, total)
- Load average monitoring
- High usage interval detection
- Multi-core utilization

### 4. Database Metrics
- Query timing and analysis
- Connection pool monitoring
- Transaction performance
- Slow query detection

## Usage

### Basic Benchmark Run
```javascript
const { runBenchmark } = require('./runBenchmark');

runBenchmark()
  .then(() => console.log('Benchmark completed'))
  .catch(console.error);
```

### Middleware Integration
```javascript
const { performanceMiddleware } = require('./runBenchmark');

app.use(performanceMiddleware());
```

### Database Query Wrapping
```javascript
const { wrapDatabaseQuery } = require('./runBenchmark');

const query = wrapDatabaseQuery(
  database.query,
  'select',
  'SELECT * FROM users'
);
```

### Test Suite Integration
```javascript
const { benchmarkTestSuite } = require('./runBenchmark');

describe('API Performance Tests', () => {
  const suite = benchmarkTestSuite();
  
  beforeAll(suite.beforeAll);
  afterAll(suite.afterAll);
  beforeEach(suite.beforeEach);
  afterEach(suite.afterEach);
  
  // Your test cases here
});
```

## Configuration

### Response Time Thresholds
```javascript
responseTime: {
  endpoints: {
    '/api/auth/login': { p95: 200, p99: 500 },
    '/api/events': { p95: 300, p99: 600 }
  },
  global: {
    median: 100,
    p95: 300,
    p99: 600
  }
}
```

### Memory Thresholds
```javascript
memory: {
  heapTotal: 500,  // MB
  heapUsed: 400,   // MB
  external: 50,    // MB
  rss: 800         // MB
}
```

### CPU Thresholds
```javascript
cpu: {
  user: 70,      // percentage
  system: 30,    // percentage
  combined: 80   // percentage
}
```

## Reports

### Report Formats
1. Text Report
   - Human-readable format
   - Detailed metrics breakdown
   - Threshold violation alerts

2. JSON Report
   - Machine-readable format
   - Complete raw data
   - Suitable for further processing

3. HTML Report
   - Visual representation
   - Interactive charts
   - Filterable tables

### Report Location
Reports are saved in the `/reports/performance/` directory with timestamps:
- `performance_report_2024-01-09T12-00-00Z.txt`
- `performance_report_2024-01-09T12-00-00Z.json`
- `performance_report_2024-01-09T12-00-00Z.html`

## Best Practices

1. **Baseline Establishment**
   - Run benchmarks on a clean system
   - Document baseline metrics
   - Compare future results against baseline

2. **Regular Testing**
   - Schedule periodic benchmark runs
   - Monitor trends over time
   - Set up alerts for degradation

3. **Environment Considerations**
   - Use production-like environment
   - Minimize external interference
   - Account for warm-up periods

4. **Data Management**
   - Regular cleanup of old reports
   - Backup important benchmark data
   - Version control configuration changes

## Troubleshooting

### Common Issues
1. High Memory Usage
   - Check for memory leaks
   - Review garbage collection patterns
   - Monitor external service impact

2. CPU Spikes
   - Identify resource-intensive operations
   - Check for infinite loops
   - Monitor background tasks

3. Slow Database Queries
   - Review query plans
   - Check index usage
   - Monitor connection pool

## Future Enhancements
1. Real-time monitoring dashboard
2. Automated performance regression detection
3. Advanced anomaly detection
4. Integration with APM tools
5. Custom metric collection support