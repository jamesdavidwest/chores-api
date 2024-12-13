/**
 * CI/CD Performance Benchmark Runner
 * 
 * This script is designed to be run in CI/CD environments to:
 * 1. Run all benchmarks
 * 2. Compare against baselines
 * 3. Fail the build if significant regressions are detected
 * 4. Generate and store performance reports
 */

const path = require('path');
const fs = require('fs').promises;
const { manager: apiManager, runEndpointBenchmarks } = require('./scenarios/api-endpoints.benchmark');
const { manager: dbManager, runDatabaseBenchmarks } = require('./scenarios/database.benchmark');

// Configuration for CI environment
const CI_CONFIG = {
  // Maximum allowed regression percentage before failing the build
  maxRegressionThreshold: process.env.CI_MAX_REGRESSION_THRESHOLD || 0.1, // 10%
  
  // Directory to store benchmark results
  resultsDir: process.env.CI_BENCHMARK_RESULTS_DIR || 'benchmark-results',
  
  // Whether to fail the build on regression
  failOnRegression: process.env.CI_FAIL_ON_REGRESSION !== 'false',
  
  // Minimum improvement percentage to be considered significant
  minImprovementThreshold: process.env.CI_MIN_IMPROVEMENT_THRESHOLD || 0.05, // 5%
};

/**
 * Ensures the results directory exists
 */
async function ensureResultsDirectory() {
  const resultsPath = path.join(__dirname, CI_CONFIG.resultsDir);
  await fs.mkdir(resultsPath, { recursive: true });
  return resultsPath;
}

/**
 * Saves benchmark results to file
 */
async function saveResults(results, type) {
  const resultsPath = await ensureResultsDirectory();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(resultsPath, `${type}-${timestamp}.json`);
  
  await fs.writeFile(
    filename,
    JSON.stringify(results, null, 2)
  );
  
  return filename;
}

/**
 * Analyzes results for significant changes
 */
function analyzeResults(baseline, current) {
  const changes = {
    regressions: [],
    improvements: []
  };

  function compareMetrics(baselineValue, currentValue, metricName) {
    const changePercent = (currentValue - baselineValue) / baselineValue;
    
    if (changePercent > CI_CONFIG.maxRegressionThreshold) {
      changes.regressions.push({
        metric: metricName,
        baseline: baselineValue,
        current: currentValue,
        change: changePercent * 100
      });
    } else if (changePercent < -CI_CONFIG.minImprovementThreshold) {
      changes.improvements.push({
        metric: metricName,
        baseline: baselineValue,
        current: currentValue,
        change: changePercent * 100
      });
    }
  }

  // Compare response times
  if (baseline.responseTime && current.responseTime) {
    Object.keys(current.responseTime).forEach(endpoint => {
      if (baseline.responseTime[endpoint]) {
        compareMetrics(
          baseline.responseTime[endpoint].p95,
          current.responseTime[endpoint].p95,
          `Response Time P95 (${endpoint})`
        );
        compareMetrics(
          baseline.responseTime[endpoint].p99,
          current.responseTime[endpoint].p99,
          `Response Time P99 (${endpoint})`
        );
      }
    });
  }

  // Compare database metrics
  if (baseline.database && current.database) {
    Object.keys(current.database.queryTime).forEach(queryType => {
      if (baseline.database.queryTime[queryType]) {
        compareMetrics(
          baseline.database.queryTime[queryType].p95,
          current.database.queryTime[queryType].p95,
          `DB ${queryType} P95`
        );
      }
    });
  }

  return changes;
}

/**
 * Generates a markdown report of the benchmark results
 */
async function generateMarkdownReport(changes, resultsPath) {
  const lines = [
    '# Performance Benchmark Results',
    `\nRun at: ${new Date().toISOString()}`,
    '\n## Performance Changes',
  ];

  if (changes.regressions.length > 0) {
    lines.push('\n### 🔴 Regressions');
    changes.regressions.forEach(reg => {
      lines.push(`- ${reg.metric}: ${reg.change.toFixed(2)}% slower (${reg.baseline.toFixed(2)} → ${reg.current.toFixed(2)})`);
    });
  }

  if (changes.improvements.length > 0) {
    lines.push('\n### 🟢 Improvements');
    changes.improvements.forEach(imp => {
      lines.push(`- ${imp.metric}: ${Math.abs(imp.change).toFixed(2)}% faster (${imp.baseline.toFixed(2)} → ${imp.current.toFixed(2)})`);
    });
  }

  if (changes.regressions.length === 0 && changes.improvements.length === 0) {
    lines.push('\n✅ No significant performance changes detected');
  }

  const reportPath = path.join(resultsPath, 'benchmark-report.md');
  await fs.writeFile(reportPath, lines.join('\n'));
  return reportPath;
}

/**
 * Main CI benchmark runner
 */
async function runCIBenchmarks() {
  try {
    console.log('Starting CI performance benchmarks...');

    // Run API benchmarks
    console.log('\nRunning API benchmarks...');
    const apiResults = await runEndpointBenchmarks();
    await saveResults(apiResults, 'api');

    // Run Database benchmarks
    console.log('\nRunning Database benchmarks...');
    const dbResults = await runDatabaseBenchmarks();
    await saveResults(dbResults, 'database');

    // Analyze results
    console.log('\nAnalyzing results...');
    const apiChanges = analyzeResults(
      Array.from(apiResults.values())[0],
      Array.from(apiResults.values())[apiResults.size - 1]
    );
    
    const dbChanges = analyzeResults(
      Array.from(dbResults.values())[0],
      Array.from(dbResults.values())[dbResults.size - 1]
    );

    // Generate reports
    const resultsPath = await ensureResultsDirectory();
    const reportPath = await generateMarkdownReport(
      {
        regressions: [...apiChanges.regressions, ...dbChanges.regressions],
        improvements: [...apiChanges.improvements, ...dbChanges.improvements]
      },
      resultsPath
    );

    console.log(`\nBenchmark report generated at: ${reportPath}`);

    // Check for failures
    const hasRegressions = apiChanges.regressions.length > 0 || dbChanges.regressions.length > 0;
    
    if (hasRegressions && CI_CONFIG.failOnRegression) {
      console.error('\n❌ Performance regressions detected. CI check failed.');
      process.exit(1);
    } else {
      console.log('\n✅ Performance benchmark checks passed.');
    }
  } catch (error) {
    console.error('Error running CI benchmarks:', error);
    process.exit(1);
  }
}

// If running directly (not imported as module)
if (require.main === module) {
  runCIBenchmarks();
}

module.exports = {
  runCIBenchmarks,
  analyzeResults,
  generateMarkdownReport,
  CI_CONFIG
};