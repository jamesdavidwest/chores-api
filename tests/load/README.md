# Load Testing Suite

This directory contains the load testing infrastructure for the backend boilerplate project using k6.

## Prerequisites

1. Install k6:
   ```bash
   # Linux
   sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6

   # MacOS
   brew install k6

   # Windows
   choco install k6
   ```

## Directory Structure

```
tests/load/
├── config.js           # Load testing configuration
├── helpers.js          # Helper functions for tests
├── scenarios/          # Test scenarios
│   ├── auth.test.js    # Authentication flow tests
│   └── events.test.js  # Events system tests
└── README.md          # This file
```

## Available Test Scenarios

### Authentication Tests (auth.test.js)
Tests the authentication system including registration, login, and token refresh.

1. **Constant Load Test**
   ```bash
   npm run test:load:auth
   ```

2. **Ramp-up Test**
   ```bash
   npm run test:load:auth:ramp
   ```

3. **Stress Test**
   ```bash
   npm run test:load:auth:stress
   ```

4. **Spike Test**
   ```bash
   npm run test:load:auth:spike
   ```

### Events Tests (events.test.js)
Tests the events system with various operations and realistic usage patterns.

Features tested:
- Event creation (20% of operations)
- Event listing and filtering (40% of operations)
- Event details retrieval (20% of operations)
- Event updates (10% of operations)
- Event deletion (10% of operations)

1. **Constant Load Test**
   ```bash
   npm run test:load:events
   ```

2. **Ramp-up Test**
   ```bash
   npm run test:load:events:ramp
   ```

3. **Stress Test**
   ```bash
   npm run test:load:events:stress
   ```

4. **Spike Test**
   ```bash
   npm run test:load:events:spike
   ```

### Combined Tests
Run multiple test scenarios in sequence:

1. **All Scenarios (Constant Load)**
   ```bash
   npm run test:load:all
   ```

2. **All Scenarios (Stress Test)**
   ```bash
   npm run test:load:all:stress
   ```

## Running Tests

### Basic Usage

```bash
npm run test:load -- -f <test-file> -s <scenario>
```

### Parameters

- `-f, --file`: Test file to run (required)
- `-s, --scenario`: Test scenario to use (default: "constant")
- `-u, --url`: API URL to test against (default: "http://localhost:3000")

### Examples

1. Run events tests with constant load:
   ```bash
   npm run test:load:events
   ```

2. Run events tests with stress scenario:
   ```bash
   npm run test:load:events:stress
   ```

3. Run events tests against specific URL:
   ```bash
   npm run test:load -- -f events.test.js -s constant -u http://api.example.com
   ```

## Test Scenarios Explained

### 1. Constant Load Test
- Maintains 50 virtual users
- Runs for 5 minutes
- Good for baseline performance metrics

### 2. Ramp-up Test
- Starts with 0 users
- Ramps up to 50 users over 2 minutes
- Maintains 50 users for 5 minutes
- Ramps down over 2 minutes
- Good for testing scalability

### 3. Stress Test
- Starts with 0 users
- Ramps up to 100 users
- Maintains for 5 minutes
- Further increases to 200 users
- Maintains high load for 5 minutes
- Good for finding system limits

### 4. Spike Test
- Starts with 0 users
- Quickly ramps to 50 users
- Sudden spike to 200 users
- Returns to 50 users
- Tests system recovery

## Interpreting Results

### Key Metrics

1. Response Times
   - p95 < 500ms: 95% of requests complete within 500ms
   - p99 < 1000ms: 99% of requests complete within 1s

2. Error Rates
   - Error rate < 1%: Less than 1% of requests fail
   - Success rate > 99%: More than 99% of requests succeed

3. Throughput
   - Requests per second
   - Data transfer rates

### Events System Specific Metrics

1. Operation Success Rates
   - Create operations: < 1% error rate
   - Read operations: < 0.1% error rate
   - Update operations: < 1% error rate
   - Delete operations: < 1% error rate

2. Response Times by Operation
   - List events: p95 < 400ms
   - Create event: p95 < 600ms
   - Get event details: p95 < 300ms
   - Update event: p95 < 500ms
   - Delete event: p95 < 400ms

### Success Criteria

Tests are considered successful if:

1. Error rate is below 1%
2. 95th percentile response time is under 500ms
3. No system crashes or unhandled errors
4. All functional checks pass
5. Database performance remains stable
6. Memory usage stays within acceptable limits

## Best Practices

1. Always run tests against a test environment
2. Start with lower loads and gradually increase
3. Monitor server resources during tests
4. Clean up test data after runs
5. Use realistic scenarios and data
6. Monitor database performance
7. Check logs for errors and warnings
8. Review performance trends over time

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure the API server is running
   - Check the API_URL environment variable
   - Verify network connectivity

2. **Authentication Failures**
   - Verify the test user credentials
   - Check token generation in setup phase
   - Ensure auth service is functioning

3. **High Error Rates**
   - Check rate limiting configuration
   - Verify database connection pool settings
   - Monitor server resources
   - Check for database locks

4. **Slow Response Times**
   - Monitor database query performance
   - Check server CPU and memory usage
   - Verify network latency
   - Review caching configuration

## Maintenance

1. Regularly update test scenarios
2. Keep test data fresh and relevant
3. Review and adjust thresholds
4. Update documentation with new endpoints
5. Monitor and tune database indexes
6. Review and optimize queries
7. Update load patterns based on real usage