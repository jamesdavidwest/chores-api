/**
 * Comprehensive Benchmark Suite Manager
 * Manages and coordinates different types of benchmarks, handles results,
 * and provides regression detection.
 */

const path = require('path');
const fs = require('fs').promises;
const config = require('./config');
const MetricsCollector = require('./collectors/MetricsCollector');
const MetricsReporter = require('./reporters/MetricsReporter');

class BenchmarkSuiteManager {
  constructor(options = {}) {
    this.config = {
      ...config,
      ...options
    };
    
    this.benchmarks = new Map();
    this.baselineResults = null;
    this.currentResults = null;
    this.regressionThreshold = options.regressionThreshold || 0.1; // 10% threshold
  }

  /**
   * Register a benchmark scenario
   */
  registerBenchmark(name, scenario) {
    if (this.benchmarks.has(name)) {
      throw new Error(`Benchmark "${name}" already registered`);
    }
    
    this.benchmarks.set(name, {
      name,
      scenario,
      results: [],
      baseline: null
    });
  }

  /**
   * Run a specific benchmark
   */
  async runBenchmark(name) {
    const benchmark = this.benchmarks.get(name);
    if (!benchmark) {
      throw new Error(`Benchmark "${name}" not found`);
    }

    // Reset metrics collector
    MetricsCollector.reset();
    MetricsCollector.startCollecting({
      duration: this.config.settings.runDuration,
      interval: this.config.settings.samplingInterval,
      warmup: this.config.settings.warmupDuration
    });

    console.log(`Running benchmark: ${name}`);
    console.log('Warmup phase...');
    
    // Run warmup
    await new Promise(resolve => setTimeout(resolve, this.config.settings.warmupDuration));
    
    console.log('Starting measurement phase...');
    
    try {
      // Run the actual benchmark
      await benchmark.scenario();
      
      // Collect results
      const results = MetricsCollector.getReport();
      benchmark.results.push(results);
      
      // Generate reports
      await this.generateReports(name, results);
      
      // Check for regressions if we have a baseline
      if (benchmark.baseline) {
        const regressions = this.detectRegressions(benchmark.baseline, results);
        if (regressions.length > 0) {
          await this.reportRegressions(name, regressions);
        }
      }

      return results;
    } finally {
      MetricsCollector.stopCollecting();
    }
  }

  /**
   * Run all registered benchmarks
   */
  async runAll() {
    const results = new Map();
    
    for (const [name] of this.benchmarks) {
      results.set(name, await this.runBenchmark(name));
    }
    
    return results;
  }

  /**
   * Set baseline results for regression detection
   */
  async setBaseline(name, results) {
    const benchmark = this.benchmarks.get(name);
    if (!benchmark) {
      throw new Error(`Benchmark "${name}" not found`);
    }

    benchmark.baseline = results;
    
    // Save baseline to disk for future comparisons
    await this.saveBaseline(name, results);
  }

  /**
   * Save baseline results to disk
   */
  async saveBaseline(name, results) {
    const baselinePath = path.join(__dirname, 'baselines', `${name}.json`);
    await fs.mkdir(path.dirname(baselinePath), { recursive: true });
    await fs.writeFile(baselinePath, JSON.stringify(results, null, 2));
  }

  /**
   * Load baseline results from disk
   */
  async loadBaseline(name) {
    const baselinePath = path.join(__dirname, 'baselines', `${name}.json`);
    try {
      const data = await fs.readFile(baselinePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Detect performance regressions
   */
  detectRegressions(baseline, current) {
    const regressions = [];

    // Helper function to check metric regression
    const checkRegression = (metricName, baselineValue, currentValue) => {
      const threshold = baselineValue * (1 + this.regressionThreshold);
      if (currentValue > threshold) {
        regressions.push({
          metric: metricName,
          baseline: baselineValue,
          current: currentValue,
          increase: ((currentValue - baselineValue) / baselineValue) * 100
        });
      }
    };

    // Check response times
    for (const [endpoint, times] of Object.entries(current.responseTime)) {
      const baselineTimes = baseline.responseTime[endpoint];
      if (baselineTimes) {
        checkRegression(`Response Time (${endpoint}) P95`, baselineTimes.p95, times.p95);
        checkRegression(`Response Time (${endpoint}) P99`, baselineTimes.p99, times.p99);
      }
    }

    // Check memory metrics
    for (const [key, value] of Object.entries(current.memory)) {
      checkRegression(`Memory ${key}`, baseline.memory[key], value);
    }

    // Check CPU metrics
    for (const [key, value] of Object.entries(current.cpu)) {
      checkRegression(`CPU ${key}`, baseline.cpu[key], value);
    }

    // Check database metrics
    for (const [queryType, metrics] of Object.entries(current.database.queryTime)) {
      const baselineMetrics = baseline.database.queryTime[queryType];
      if (baselineMetrics) {
        checkRegression(`DB ${queryType} P95`, baselineMetrics.p95, metrics.p95);
        checkRegression(`DB ${queryType} P99`, baselineMetrics.p99, metrics.p99);
      }
    }

    return regressions;
  }

  /**
   * Report performance regressions
   */
  async reportRegressions(benchmarkName, regressions) {
    const report = {
      benchmark: benchmarkName,
      timestamp: new Date().toISOString(),
      regressions: regressions,
      summary: `Found ${regressions.length} performance regressions`
    };

    // Generate regression report
    await MetricsReporter.generateReport(report, {
      filename: `regression_${benchmarkName}_${Date.now()}`,
      format: 'txt'
    });

    // If we're in CI environment, fail the build
    if (process.env.CI) {
      throw new Error(`Performance regression detected in benchmark "${benchmarkName}"`);
    }
  }

  /**
   * Get historical results for a benchmark
   */
  async getHistory(name) {
    const benchmark = this.benchmarks.get(name);
    if (!benchmark) {
      throw new Error(`Benchmark "${name}" not found`);
    }

    return {
      name,
      baseline: benchmark.baseline,
      results: benchmark.results
    };
  }
}

module.exports = BenchmarkSuiteManager;