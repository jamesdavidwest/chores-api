const request = require('supertest');
const express = require('express');
const performanceMiddleware = require('../../../../src/middleware/performanceMonitor');
const MetricsCoordinator = require('../../../../src/metrics/MetricsCoordinator');
const performanceTestUtils = require('../performanceTestUtils');

describe('Performance Monitoring Middleware Integration', () => {
  let app;
  let coordinator;
  let server;

  beforeEach(() => {
    app = express();
    coordinator = new MetricsCoordinator({
      config: {
        responseTime: {
          threshold: 100,
          historyLimit: 1000
        }
      }
    });

    // Apply performance monitoring middleware
    app.use(performanceMiddleware(coordinator));

    // Test routes
    app.get('/fast', (req, res) => {
      res.json({ status: 'success' });
    });

    app.get('/slow', async (req, res) => {
      await performanceTestUtils.sleep(200);
      res.json({ status: 'success' });
    });

    app.get('/cpu-intensive', async (req, res) => {
      await performanceTestUtils.generateLoad(500, 'high');
      res.json({ status: 'success' });
    });

    app.get('/memory-intensive', (req, res) => {
      const load = performanceTestUtils.generateMemoryLoad(5000000);
      res.json({ status: 'success', size: load.length });
    });

    app.get('/error', (req, res) => {
      throw new Error('Test error');
    });

    server = app.listen(0);
  });

  afterEach(() => {
    server.close();
  });

  describe('request monitoring', () => {
    it('should track response times for all routes', async () => {
      await coordinator.startMonitoring();

      // Make multiple requests
      await Promise.all([
        request(app).get('/fast'),
        request(app).get('/slow'),
        request(app).get('/cpu-intensive')
      ]);

      const metrics = await coordinator.getResponseTimeMetrics();
      
      expect(metrics).toHaveProperty('count');
      expect(metrics.count).toBe(3);
      expect(metrics).toHaveProperty('mean');
      expect(metrics).toHaveProperty('p95');
    });

    it('should identify slow endpoints', async () => {
      await coordinator.startMonitoring();

      // Make requests to slow endpoint
      await Promise.all([
        request(app).get('/slow'),
        request(app).get('/slow'),
        request(app).get('/slow')
      ]);

      const analysis = await coordinator.analyzeEndpointPerformance();
      const slowEndpoints = analysis.filter(ep => ep.path === '/slow');
      
      expect(slowEndpoints.length).toBe(1);
      expect(slowEndpoints[0].avgResponseTime).toBeGreaterThan(100);
    });
  });

  describe('resource impact tracking', () => {
    it('should track CPU usage per endpoint', async () => {
      await coordinator.startMonitoring();

      // Make CPU-intensive requests
      await Promise.all([
        request(app).get('/cpu-intensive'),
        request(app).get('/cpu-intensive')
      ]);

      const resourceMetrics = await coordinator.getResourceMetrics();
      
      expect(resourceMetrics).toHaveProperty('cpu');
      expect(resourceMetrics.cpu).toHaveProperty('byEndpoint');
      expect(resourceMetrics.cpu.byEndpoint['/cpu-intensive']).toBeDefined();
    });

    it('should track memory impact per endpoint', async () => {
      await coordinator.startMonitoring();

      // Make memory-intensive requests
      await Promise.all([
        request(app).get('/memory-intensive'),
        request(app).get('/memory-intensive')
      ]);

      const resourceMetrics = await coordinator.getResourceMetrics();
      
      expect(resourceMetrics).toHaveProperty('memory');
      expect(resourceMetrics.memory).toHaveProperty('byEndpoint');
      expect(resourceMetrics.memory.byEndpoint['/memory-intensive']).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should track error rates per endpoint', async () => {
      await coordinator.startMonitoring();

      // Generate some errors
      await Promise.all([
        request(app).get('/error').expect(500),
        request(app).get('/error').expect(500),
        request(app).get('/fast').expect(200)
      ]);

      const errorMetrics = await coordinator.getErrorMetrics();
      
      expect(errorMetrics).toHaveProperty('byEndpoint');
      expect(errorMetrics.byEndpoint['/error']).toBeDefined();
      expect(errorMetrics.byEndpoint['/error'].count).toBe(2);
    });

    it('should correlate errors with performance metrics', async () => {
      await coordinator.startMonitoring();

      // Generate mixed success/error requests
      await Promise.all([
        request(app).get('/error').expect(500),
        request(app).get('/slow'),
        request(app).get('/error').expect(500),
        request(app).get('/fast')
      ]);

      const analysis = await coordinator.analyzeErrorImpact();
      
      expect(analysis).toHaveProperty('errorRates');
      expect(analysis).toHaveProperty('performanceCorrelation');
      expect(analysis.errorRates['/error']).toBeGreaterThan(0);
    });
  });

  describe('real-time monitoring', () => {
    it('should provide real-time metrics updates', async () => {
      const metrics = [];
      coordinator.on('metrics', update => metrics.push(update));

      await coordinator.startMonitoring();

      // Generate traffic
      await Promise.all([
        request(app).get('/fast'),
        request(app).get('/slow'),
        request(app).get('/cpu-intensive')
      ]);

      await performanceTestUtils.sleep(1000); // Allow time for updates

      expect(metrics.length).toBeGreaterThan(0);
      metrics.forEach(update => {
        expect(update).toHaveProperty('timestamp');
        expect(update).toHaveProperty('metrics');
      });
    });

    it('should detect performance anomalies in real-time', async () => {
      const anomalies = [];
      coordinator.on('anomaly', anomaly => anomalies.push(anomaly));

      await coordinator.startMonitoring();

      // Generate normal traffic
      await request(app).get('/fast');
      await request(app).get('/fast');

      // Generate anomalous traffic
      await request(app).get('/cpu-intensive');
      await request(app).get('/memory-intensive');
      await request(app).get('/slow');

      await performanceTestUtils.sleep(1000); // Allow time for detection

      expect(anomalies.length).toBeGreaterThan(0);
      anomalies.forEach(anomaly => {
        expect(anomaly).toHaveProperty('type');
        expect(anomaly).toHaveProperty('threshold');
        expect(anomaly).toHaveProperty('value');
        expect(anomaly).toHaveProperty('timestamp');
      });
    });
  });

  describe('concurrent request handling', () => {
    it('should handle concurrent requests accurately', async () => {
      await coordinator.startMonitoring();

      // Generate concurrent requests
      const concurrentRequests = Array(10).fill().map(() => 
        request(app).get('/fast')
      );

      await Promise.all(concurrentRequests);

      const metrics = await coordinator.getResponseTimeMetrics();
      expect(metrics.count).toBe(10);
      expect(metrics.concurrent.max).toBeGreaterThan(1);
    });

    it('should track concurrent resource usage correctly', async () => {
      await coordinator.startMonitoring();

      // Generate concurrent intensive requests
      const concurrentRequests = Array(5).fill().map(() => 
        request(app).get('/cpu-intensive')
      );

      await Promise.all(concurrentRequests);

      const resourceMetrics = await coordinator.getResourceMetrics();
      expect(resourceMetrics.cpu.concurrent.max).toBeGreaterThan(0);
      expect(resourceMetrics.memory.concurrent.max).toBeGreaterThan(0);
    });
  });

  describe('middleware performance impact', () => {
    it('should have minimal impact on response times', async () => {
      // Measure response time without middleware
      app = express();
      app.get('/test', (req, res) => res.json({ status: 'success' }));
      
      const baselineStart = Date.now();
      await request(app).get('/test');
      const baselineDuration = Date.now() - baselineStart;

      // Measure with middleware
      app.use(performanceMiddleware(coordinator));
      
      const withMiddlewareStart = Date.now();
      await request(app).get('/test');
      const withMiddlewareDuration = Date.now() - withMiddlewareStart;

      // Middleware overhead should be minimal
      expect(withMiddlewareDuration - baselineDuration).toBeLessThan(5);
    });

    it('should not affect request success rate', async () => {
      let successCount = 0;
      const totalRequests = 50;

      // Make multiple rapid requests
      const requests = Array(totalRequests).fill().map(() => 
        request(app)
          .get('/fast')
          .then(response => {
            if (response.status === 200) successCount++;
          })
      );

      await Promise.all(requests);

      expect(successCount).toBe(totalRequests);
    });
  });
});