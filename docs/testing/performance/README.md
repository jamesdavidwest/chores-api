# Performance Testing Documentation

## Overview
This documentation covers the comprehensive performance testing infrastructure implemented for the backend boilerplate project. The testing system is designed to monitor, analyze, and validate system performance across multiple dimensions including response time, CPU usage, memory utilization, and database performance.

## Table of Contents
1. [Test Infrastructure](#test-infrastructure)
2. [Running Tests](#running-tests)
3. [Test Categories](#test-categories)
4. [Test Utilities](#test-utilities)
5. [Configuration](#configuration)
6. [Adding New Tests](#adding-new-tests)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Test Infrastructure

### Directory Structure
```
tests/
└── __tests__/
    └── performance/
        ├── unit/
        │   ├── responseTime.test.js
        │   ├── memory.test.js
        │   ├── cpu.test.js
        │   └── database.test.js
        ├── integration/
        │   ├── metricsCoordinator.test.js
        │   └── performanceMiddleware.test.js
        ├── e2e/
        │   └── performanceMonitoring.test.js
        └── performanceTestUtils.js
```

### Key Components
- **Metric Collectors**: Individual components for collecting specific performance metrics
- **Metrics Coordinator**: Central system for coordinating all metric collection
- **Performance Middleware**: Express middleware for request monitoring
- **Test Utilities**: Shared utilities for generating test loads and scenarios

## Running Tests

### Prerequisites
- Node.js 18 or higher
- Local instance of test database
- Sufficient system resources for load testing

### Commands
```bash
# Run all performance tests
npm run test:performance

# Run specific test categories
npm run test:performance:unit
npm run test:performance:integration
npm run test:performance:e2e

# Run with detailed metrics
npm run test:performance -- --verbose

# Run with specific test pattern
npm run test:performance -- --testNamePattern="should handle sustained load"
```

## Test Categories

### Unit Tests
1. **Response Time Tests** (`responseTime.test.js`)
   - Request timing measurements
   - Statistical calculations
   - Threshold monitoring

2. **Memory Tests** (`memory.test.js`)
   - Heap usage monitoring
   - Memory leak detection
   - Garbage collection impact

3. **CPU Tests** (`cpu.test.js`)
   - CPU utilization tracking
   - Core usage distribution
   - Load pattern analysis

4. **Database Tests** (`database.test.js`)
   - Query performance monitoring
   - Connection pool management
   - Transaction tracking

### Integration Tests
1. **Metrics Coordinator Tests** (`metricsCoordinator.test.js`)
   - Multi-metric coordination
   - Alert system integration
   - Reporting functionality

2. **Performance Middleware Tests** (`performanceMiddleware.test.js`)
   - Request/Response monitoring
   - Resource impact tracking
   - Error handling

### E2E Tests
1. **System Tests** (`performanceMonitoring.test.js`)
   - Full system load testing
   - Real-world scenarios
   - Recovery testing
   - Optimization validation

## Test Utilities

### Performance Test Utilities
```javascript
// Example usage of test utilities
const performanceTestUtils = require('./performanceTestUtils');

// Generate CPU load
await performanceTestUtils.generateLoad(1000, 'high');

// Generate memory load
const memLoad = performanceTestUtils.generateMemoryLoad(5000000);

// Simulate database operations
await performanceTestUtils.simulateDatabaseLoad(50);

// Helper for controlled delays
await performanceTestUtils.sleep(1000);
```

## Configuration

### Test Environment Variables
```env
# Test configuration
TEST_PORT=3001
TEST_DB_TYPE=sqlite
TEST_DB_PATH=:memory:

# Performance thresholds
RESPONSE_TIME_THRESHOLD=100
MEMORY_THRESHOLD=80
CPU_THRESHOLD=70
DB_SLOW_QUERY_THRESHOLD=100

# Test parameters
LOAD_TEST_DURATION=5000
CONCURRENT_USERS=50
```

### Metrics Configuration
```javascript
const metricsConfig = {
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
};
```

## Adding New Tests

### Test Template
```javascript
describe('New Performance Test', () => {
  let coordinator;
  
  beforeEach(() => {
    coordinator = new MetricsCoordinator(config);
  });

  afterEach(async () => {
    await coordinator.shutdown();
  });

  it('should test new functionality', async () => {
    // Setup
    await coordinator.startMonitoring();

    // Generate test load
    await performanceTestUtils.generateLoad(500, 'medium');

    // Validate results
    const metrics = await coordinator.collectSystemSnapshot();
    expect(metrics.someValue).toBeGreaterThan(0);
  });
});
```

### Guidelines for New Tests
1. Always clean up resources in `afterEach` or `afterAll`
2. Use appropriate test utilities for load generation
3. Include both positive and negative test cases
4. Add proper error handling
5. Document test purpose and expectations

## Best Practices

### Performance Test Writing
1. **Isolation**: Each test should run independently
2. **Resource Management**: Clean up resources after tests
3. **Realistic Scenarios**: Model tests after real-world usage
4. **Metric Validation**: Include comprehensive assertions
5. **Error Scenarios**: Test system behavior under failure

### Load Generation
1. Start with smaller loads and gradually increase
2. Use appropriate delays between operations
3. Monitor system resources during test execution
4. Consider test environment limitations
5. Use realistic data volumes

### Assertion Guidelines
1. Use appropriate thresholds for different environments
2. Include tolerance ranges for timing-based tests
3. Validate multiple metrics where appropriate
4. Check for both positive and negative conditions
5. Include trending and pattern analysis

## Troubleshooting

### Common Issues
1. **Resource Exhaustion**
   - Symptom: Tests fail under load
   - Solution: Adjust load parameters or increase resources

2. **Timing Inconsistencies**
   - Symptom: Intermittent test failures
   - Solution: Add appropriate tolerances and retries

3. **Memory Leaks**
   - Symptom: Increasing memory usage across tests
   - Solution: Verify cleanup in afterEach blocks

### Debug Process
1. Enable verbose logging with `DEBUG=performance:*`
2. Check system resources during test execution
3. Review test isolation and cleanup
4. Validate test environment configuration
5. Check for resource contention