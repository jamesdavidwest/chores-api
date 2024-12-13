#!/bin/bash

# Default values
TESTS="all"
ENVIRONMENT="test"
REPORT_DIR="reports/security"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -t|--tests)
      TESTS="$2"
      shift
      shift
      ;;
    -e|--environment)
      ENVIRONMENT="$2"
      shift
      shift
      ;;
    -r|--report-dir)
      REPORT_DIR="$2"
      shift
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Create reports directory if it doesn't exist
mkdir -p "$REPORT_DIR"

# Set test environment
export NODE_ENV="$ENVIRONMENT"

# Function to run tests and generate report
run_tests() {
  local test_type="$1"
  local test_file="tests/security/$test_type.test.js"
  local report_file="$REPORT_DIR/${test_type}_$(date +%Y%m%d_%H%M%S).xml"

  echo "Running $test_type security tests..."
  
  # Run tests with JUnit reporter
  jest "$test_file" \
    --config=jest.config.js \
    --reporters=default \
    --reporters=jest-junit \
    --testEnvironment=node \
    --forceExit \
    --detectOpenHandles \
    --coverage \
    --coverageDirectory="$REPORT_DIR/coverage" \
    --runInBand
  
  local test_exit_code=$?
  
  if [ $test_exit_code -ne 0 ]; then
    echo "❌ $test_type tests failed"
    exit $test_exit_code
  else
    echo "✅ $test_type tests passed"
  fi
}

# Run specific or all security tests
case $TESTS in
  "headers")
    run_tests "headers"
    ;;
  "auth")
    run_tests "auth"
    ;;
  "input")
    run_tests "input-validation"
    ;;
  "rate")
    run_tests "rate-limiting"
    ;;
  "all")
    run_tests "headers"
    run_tests "auth"
    run_tests "input-validation"
    run_tests "rate-limiting"
    ;;
  *)
    echo "Invalid test type. Choose from: headers, auth, input, rate, all"
    exit 1
    ;;
esac

# Generate summary report
echo "Generating security test summary..."
node -e "
const fs = require('fs');
const path = require('path');

const reports = fs.readdirSync('$REPORT_DIR')
  .filter(f => f.endsWith('.xml'))
  .map(f => {
    const content = fs.readFileSync(path.join('$REPORT_DIR', f), 'utf8');
    return { name: f, content };
  });

const summary = {
  timestamp: new Date().toISOString(),
  environment: '$ENVIRONMENT',
  results: reports.map(r => ({
    test: r.name.split('_')[0],
    passed: !r.content.includes('failures='),
    timestamp: r.name.split('_')[1].replace('.xml', '')
  }))
};

fs.writeFileSync(
  path.join('$REPORT_DIR', 'summary.json'),
  JSON.stringify(summary, null, 2)
);
"

echo "Security tests completed. Reports available in $REPORT_DIR"