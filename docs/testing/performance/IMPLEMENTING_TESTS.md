# Implementing Performance Tests Guide

## Overview
This guide provides detailed instructions and best practices for implementing new performance tests in the backend boilerplate project. It covers test structure, utility usage, and validation approaches.

## Table of Contents
1. [Test Structure](#test-structure)
2. [Test Categories](#test-categories)
3. [Test Implementation Guidelines](#test-implementation-guidelines)
4. [Working with Test Utilities](#working-with-test-utilities)
5. [Validation and Assertions](#validation-and-assertions)
6. [Common Patterns](#common-patterns)
7. [Troubleshooting Guide](#troubleshooting-guide)

## Test Structure

### Basic Test Template
```javascript
describe('Performance Test Suite', () => {
  let coordinator;
  let testUtils;

  beforeAll(async () => {
    coordinator = new MetricsCoordinator(config);
    await coordinator.startMonitoring();
  });

  afterAll(async () => {
    await coordinator.shutdown();
  });

  beforeEach(() => {
    testUtils = require('../performanceTestUtils');
  });

  afterEach(async () => {
    await coordinator.reset();
  });

  // Individual test cases
  it('should meet performance criteria under load', async () => {
    // Test implementation
  });
});
```

### Test Case Structure
```javascript
it('should [expected behavior]', async () => {
  // 1. Setup
  const initialMetrics = await coordinator.collectSystemSnapshot();
  
  // 2. Action
  await performanceTestUtils.generateLoad(1000, 'medium');
  
  // 3. Load Generation
  await Promise.all([
    // Multiple concurrent operations
  ]);
  
  // 4. Measurement
  const finalMetrics = await coordinator.collectSystemSnapshot();
  
  // 5. Analysis
  const analysis = coordinator.analyzeMetrics(initialMetrics, finalMetrics);
  
  // 6. Assertions
  expect(analysis.stability).toBeGreaterThan(0.7);
  expect(analysis.performance).toMeetCriteria();
});
```

## Test Categories

### 1. Load Tests
```javascript
describe('Load Testing', () => {
  it('should handle sustained load', async () => {
    const duration = 5000;
    const start = Date.now();
    
    while (Date.now() - start < duration) {
      await Promise.all([
        performanceTestUtils.generateLoad(100, 'medium'),
        performanceTestUtils.simulateDatabaseLoad(10)
      ]);
      
      await performanceTestUtils.sleep(100);
    }
    
    const metrics = await coordinator.getMetrics();
    expect(metrics.stability).toBeAcceptable();
  });
});
```

### 2. Stress Tests
```javascript
describe('Stress Testing', () => {
  it('should handle peak loads', async () => {
    // Generate excessive load
    await Promise.all([
      performanceTestUtils.generateLoad(2000, 'high'),
      performanceTestUtils.generateMemoryLoad(1000000),
      performanceTestUtils.simulateDatabaseLoad(100)
    ]);
    
    const metrics = await coordinator.getMetrics();
    expect(metrics.resourceUtilization).toBeBelowThreshold();
  });
});
```

### 3. Endurance Tests
```javascript
describe('Endurance Testing', () => {
  it('should maintain performance over time', async () => {
    const metrics = [];
    const duration = 30000; // 30 seconds
    const interval = 1000;  // 1 second
    
    for (let elapsed = 0; elapsed < duration; elapsed += interval) {
      await performanceTestUtils.generateLoad(300, 'medium');
      metrics.push(await coordinator.collectSystemSnapshot());
      await performanceTestUtils.sleep(interval);
    }
    
    const analysis = coordinator.analyzeMetricsTrend(metrics);
    expect(analysis.degradation).toBeLessThan(0.1);
  });
});
```

## Test Implementation Guidelines

### 1. Resource Management
```javascript
class TestResourceManager {
  constructor() {
    this.resources = new Set();
  }
  
  async allocate(resource) {
    this.resources.add(resource);
    await resource.initialize();
  }
  
  async cleanup() {
    await Promise.all(
      Array.from(this.resources).map(
        resource => resource.cleanup()
      )
    );
    this.resources.clear();
  }
}
```

### 2. Error Handling
```javascript
const handleTestError = async (error, coordinator) => {
  // Log error details
  console.error('Test error:', error);
  
  // Collect diagnostic information
  const diagnostics = await coordinator.collectDiagnostics();
  
  // Attempt recovery
  await coordinator.attemptRecovery();
  
  // Return error context
  return {
    error,
    diagnostics,
    recoveryAttempted: true
  };
};
```

### 3. Test Data Management
```javascript
class TestDataManager {
  async generateTestData(size) {
    return Array(size).fill().map((_, index) => ({
      id: index,
      data: `Test data ${index}`,
      timestamp: new Date()
    }));
  }
  
  async loadTestData(data) {
    // Implementation
  }
  
  async cleanupTestData() {
    // Implementation
  }
}
```

## Working with Test Utilities

### 1. Load Generation
```javascript
class LoadGenerator {
  async generateHttpLoad(config) {
    const requests = Array(config.count)
      .fill()
      .map(() => this.makeRequest(config));
      
    return Promise.all(requests);
  }
  
  async generateDatabaseLoad(config) {
    // Implementation
  }
  
  async generateComputeLoad(config) {
    // Implementation
  }
}
```

### 2. Metric Collection
```javascript
class MetricCollector {
  async collectMetrics(duration) {
    const metrics = [];
    const start = Date.now();
    
    while (Date.now() - start < duration) {
      metrics.push(await this.sampleMetrics());
      await this.wait(100);
    }
    
    return metrics;
  }
}
```

### 3. Analysis Utilities
```javascript
class MetricAnalyzer {
  analyzePerformance(metrics) {
    return {
      mean: this.calculateMean(metrics),
      percentiles: this.calculatePercentiles(metrics),
      stability: this.calculateStability(metrics)
    };
  }
}
```

## Validation and Assertions

### 1. Custom Matchers
```javascript
expect.extend({
  toMeetPerformanceCriteria(received, criteria) {
    const pass = this.validateMetrics(received, criteria);
    return {
      pass,
      message: () => pass
        ? 'Met performance criteria'
        : 'Failed to meet performance criteria'
    };
  }
});
```

### 2. Assertion Helpers
```javascript
const assertPerformance = {
  responseTime: (metrics, threshold) => {
    expect(metrics.mean).toBeLessThan(threshold);
    expect(metrics.p95).toBeLessThan(threshold * 1.5);
  },
  
  resourceUsage: (metrics, thresholds) => {
    expect(metrics.cpu).toBeLessThan(thresholds.cpu);
    expect(metrics.memory).toBeLessThan(thresholds.memory);
  }
};
```

### 3. Validation Rules
```javascript
const validationRules = {
  stability: (metrics) => ({
    pass: metrics.variance < 0.1,
    message: 'Stability check failed'
  }),
  
  performance: (metrics) => ({
    pass: metrics.responseTime < 100,
    message: 'Performance check failed'
  })
};
```

## Common Patterns

### 1. Load Test Pattern
```javascript
const loadTest = async (config) => {
  const results = {
    metrics: [],
    errors: []
  };
  
  try {
    // Setup
    await setupTest(config);
    
    // Execute load test
    await generateLoad(config);
    
    // Collect results
    results.metrics = await collectMetrics();
    
  } catch (error) {
    results.errors.push(error);
  }
  
  return results;
};
```

### 2. Stress Test Pattern
```javascript
const stressTest = async (config) => {
  let currentLoad = config.initialLoad;
  const results = [];
  
  while (currentLoad <= config.maxLoad) {
    const result = await runLoadTest(currentLoad);
    results.push(result);
    
    if (!meetsThresholds(result)) {
      break;
    }
    
    currentLoad += config.loadIncrement;
  }
  
  return {
    maxSupportedLoad: currentLoad - config.loadIncrement,
    results
  };
};
```

### 3. Endurance Test Pattern
```javascript
const enduranceTest = async (config) => {
  const startTime = Date.now();
  const results = {
    metrics: [],
    events: [],
    issues: []
  };
  
  while (Date.now() - startTime < config.duration) {
    // Generate consistent load
    await generateLoad(config.load);
    
    // Collect metrics
    const metrics = await collectMetrics();
    results.metrics.push(metrics);
    
    // Check for issues
    const issues = await checkForIssues(metrics);
    if (issues.length > 0) {
      results.issues.push(...issues);
    }
    
    await sleep(config.interval);
  }
  
  return {
    duration: Date.now() - startTime,
    results
  };
};
```

## Troubleshooting Guide

### 1. Common Issues and Solutions

#### Memory Leaks
```javascript
const detectMemoryLeak = async (test) => {
  const startMemory = process.memoryUsage().heapUsed;
  
  // Run test multiple times
  for (let i = 0; i < 10; i++) {
    await test();
    global.gc(); // Requires --expose-gc flag
  }
  
  const endMemory = process.memoryUsage().heapUsed;
  const leak = endMemory - startMemory;
  
  return {
    hasLeak: leak > 1000000, // 1MB threshold
    leakSize: leak,
    details: await getMemoryProfile()
  };
};
```

#### Test Timeouts
```javascript
const handleTestTimeout = async (testFn, timeout) => {
  return Promise.race([
    testFn(),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Test timed out after ${timeout}ms`));
      }, timeout);
    })
  ]).catch(async (error) => {
    // Collect diagnostic information
    const diagnostics = await collectDiagnostics();
    throw new Error(`Test failed: ${error.message}\nDiagnostics: ${JSON.stringify(diagnostics)}`);
  });
};
```

#### Resource Cleanup
```javascript
class ResourceCleanup {
  constructor() {
    this.cleanupTasks = [];
  }
  
  addCleanupTask(task) {
    this.cleanupTasks.push(task);
  }
  
  async cleanup() {
    const results = [];
    
    for (const task of this.cleanupTasks.reverse()) {
      try {
        await task();
        results.push({ success: true });
      } catch (error) {
        results.push({ success: false, error });
      }
    }
    
    return results;
  }
}
```

### 2. Debug Helpers

#### Performance Test Debugger
```javascript
class PerformanceDebugger {
  constructor() {
    this.snapshots = new Map();
    this.events = [];
  }

  takeSnapshot(label = 'default') {
    const snapshot = {
      timestamp: Date.now(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      resources: process.resourceUsage()
    };
    this.snapshots.set(label, snapshot);
    return snapshot;
  }

  compareBenchmarks(label1, label2) {
    const snapshot1 = this.snapshots.get(label1);
    const snapshot2 = this.snapshots.get(label2);
    
    return {
      duration: snapshot2.timestamp - snapshot1.timestamp,
      memoryDelta: {
        heapUsed: snapshot2.memory.heapUsed - snapshot1.memory.heapUsed,
        heapTotal: snapshot2.memory.heapTotal - snapshot1.memory.heapTotal
      },
      cpuDelta: {
        user: snapshot2.cpu.user - snapshot1.cpu.user,
        system: snapshot2.cpu.system - snapshot1.cpu.system
      }
    };
  }

  logEvent(event) {
    this.events.push({
      timestamp: Date.now(),
      ...event
    });
  }

  async generateDebugReport() {
    return {
      snapshots: Array.from(this.snapshots.entries()),
      events: this.events,
      analysis: await this.analyzePerformance(),
      recommendations: this.generateRecommendations()
    };
  }

  private async analyzePerformance() {
    // Implementation
  }

  private generateRecommendations() {
    // Implementation
  }
}
```

#### System Health Monitor
```javascript
class SystemHealthMonitor {
  constructor() {
    this.metrics = [];
    this.alerts = [];
  }

  startMonitoring(interval = 1000) {
    this.interval = setInterval(() => {
      this.collectMetrics();
    }, interval);
  }

  stopMonitoring() {
    clearInterval(this.interval);
  }

  async collectMetrics() {
    const metric = {
      timestamp: Date.now(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      resources: process.resourceUsage()
    };

    this.metrics.push(metric);
    await this.checkHealth(metric);
  }

  private async checkHealth(metric) {
    const issues = await this.detectIssues(metric);
    if (issues.length > 0) {
      this.alerts.push(...issues);
    }
  }

  async detectIssues(metric) {
    // Implementation
  }

  generateHealthReport() {
    return {
      metrics: this.metrics,
      alerts: this.alerts,
      summary: this.summarizeHealth()
    };
  }

  private summarizeHealth() {
    // Implementation
  }
}
```

## Additional Resources

### 1. Testing Templates
- Load Test Template
- Stress Test Template
- Endurance Test Template
- Performance Profile Template

### 2. Utility Functions Library
```javascript
### 2. Utility Functions Library (Continued)
```javascript
const performanceUtils = {
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  generateLoad: async (intensity, duration) => {
    const start = Date.now();
    while (Date.now() - start < duration) {
      // CPU-intensive operation
      Math.random() * Math.random();
    }
  },
  
  measureMemory: () => {
    const used = process.memoryUsage();
    return {
      heapTotal: used.heapTotal / 1024 / 1024,
      heapUsed: used.heapUsed / 1024 / 1024,
      external: used.external / 1024 / 1024,
      rss: used.rss / 1024 / 1024
    };
  },
  
  measureCpu: async (duration) => {
    const start = process.cpuUsage();
    await wait(duration);
    const end = process.cpuUsage(start);
    return {
      user: end.user / 1000000,  // Convert to seconds
      system: end.system / 1000000
    };
  },
  
  generateTestData: (size) => {
    return Array(size).fill().map((_, i) => ({
      id: i,
      name: `Test ${i}`,
      data: Buffer.alloc(1024).fill(1)  // 1KB of data
    }));
  },
  
  measureResponseTime: async (fn) => {
    const start = process.hrtime();
    await fn();
    const [seconds, nanoseconds] = process.hrtime(start);
    return seconds * 1000 + nanoseconds / 1000000;
  }
};
```

### 3. Configuration Examples

#### Test Configuration
```javascript
const testConfig = {
  load: {
    duration: 60000,        // 1 minute
    rampUp: 10000,         // 10 seconds
    concurrency: 10,
    requestsPerSecond: 50
  },
  
  thresholds: {
    responseTime: {
      p95: 200,            // 95th percentile < 200ms
      p99: 500             // 99th percentile < 500ms
    },
    memory: {
      maxHeapUsed: 512,    // Max 512MB heap usage
      maxRss: 1024         // Max 1GB RSS
    },
    cpu: {
      maxUtilization: 80   // Max 80% CPU utilization
    }
  },
  
  monitoring: {
    interval: 1000,        // Collect metrics every second
    retention: 3600,       // Keep 1 hour of metrics
    detailed: true         // Include detailed metrics
  }
};
```

#### Analysis Configuration
```javascript
const analysisConfig = {
  sampling: {
    interval: 100,         // Sample every 100ms
    duration: 60000        // Total sampling duration
  },
  
  aggregation: {
    window: 5000,          // 5-second aggregation window
    functions: ['avg', 'p95', 'max']
  },
  
  alerting: {
    thresholds: {
      critical: 0.95,      // Alert on 95% threshold violation
      warning: 0.80        // Warn on 80% threshold violation
    },
    cooldown: 300000       // 5-minute alert cooldown
  }
};
```

### 4. Reporting Templates

#### Performance Report Template
```javascript
const reportTemplate = {
  summary: {
    testName: string,
    duration: number,
    timestamp: Date,
    status: 'pass' | 'fail' | 'warn'
  },
  
  metrics: {
    responseTime: {
      mean: number,
      p50: number,
      p95: number,
      p99: number
    },
    throughput: {
      total: number,
      perSecond: number,
      successful: number,
      failed: number
    },
    resources: {
      memory: {
        min: number,
        max: number,
        average: number
      },
      cpu: {
        min: number,
        max: number,
        average: number
      }
    }
  },
  
  thresholds: {
    violated: string[],
    details: Map<string, {
      limit: number,
      actual: number,
      violation: boolean
    }>
  },
  
  analysis: {
    findings: string[],
    recommendations: string[],
    trends: {
      memory: 'stable' | 'increasing' | 'decreasing',
      cpu: 'stable' | 'increasing' | 'decreasing',
      responseTime: 'stable' | 'increasing' | 'decreasing'
    }
  }
};
```

#### Error Report Template
```javascript
const errorReportTemplate = {
  error: {
    type: string,
    message: string,
    stack: string,
    timestamp: Date
  },
  
  context: {
    testPhase: string,
    currentLoad: number,
    resourceUsage: {
      memory: object,
      cpu: object
    },
    lastMetrics: object
  },
  
  recovery: {
    attempted: boolean,
    successful: boolean,
    actions: string[],
    duration: number
  },
  
  impact: {
    severity: 'low' | 'medium' | 'high',
    affectedTests: string[],
    dataIntegrity: boolean
  }
};
```

### 5. Testing Lifecycle Hooks

#### Setup and Teardown
```javascript
const testLifecycle = {
  async globalSetup() {
    // Set up test environment
    await setupTestDatabase();
    await startMetricsCollection();
    await warmupApplication();
  },
  
  async globalTeardown() {
    // Clean up test environment
    await stopMetricsCollection();
    await cleanupTestData();
    await shutdownApplication();
  },
  
  async testSetup() {
    // Set up individual test
    await resetMetrics();
    await prepareTestData();
  },
  
  async testTeardown() {
    // Clean up individual test
    await cleanupTestData();
    await resetState();
  }
};
```

#### Metrics Collection Hooks
```javascript
const metricsHooks = {
  onMetricsCollected(metrics) {
    // Process collected metrics
    analyzeMetrics(metrics);
    storeMetrics(metrics);
    checkThresholds(metrics);
  },
  
  onThresholdViolated(violation) {
    // Handle threshold violation
    logViolation(violation);
    alertOnViolation(violation);
    adjustLoad(violation);
  },
  
  onTestCompleted(results) {
    // Process test results
    generateReport(results);
    storeResults(results);
    analyzePerformance(results);
  }
};
```

## Best Practices Summary

### 1. Test Implementation
- Always include setup and teardown logic
- Use appropriate load generation strategies
- Implement proper error handling
- Include comprehensive metric collection
- Add detailed assertions and validations

### 2. Resource Management
- Clean up resources after each test
- Monitor resource usage during tests
- Implement proper timeout handling
- Use appropriate test isolation
- Handle concurrent resource access

### 3. Error Handling
- Implement proper error recovery
- Include detailed error reporting
- Handle timeout scenarios
- Manage resource cleanup on errors
- Provide diagnostic information

### 4. Metric Collection
- Use appropriate collection intervals
- Implement efficient storage strategies
- Include relevant metrics only
- Handle collection errors gracefully
- Implement proper data aggregation

### 5. Analysis and Reporting
- Use appropriate statistical methods
- Include trend analysis
- Provide actionable insights
- Generate comprehensive reports
- Include visualization data

## Conclusion
This guide provides a comprehensive framework for implementing performance tests in the backend boilerplate project. Following these guidelines and patterns will ensure consistent, reliable, and maintainable performance tests that provide valuable insights into system behavior and performance characteristics.