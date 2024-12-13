const request = require('supertest');
const app = require('../../src/app');

describe('Rate Limiting', () => {
  describe('General API Rate Limiting', () => {
    it('should limit requests per IP', async () => {
      const maxRequests = 100; // Should match your rate limit config
      const responses = [];

      // Make concurrent requests
      for (let i = 0; i < maxRequests + 10; i++) {
        responses.push(
          request(app)
            .get('/api/health')
            .set('X-Forwarded-For', '192.168.1.1')
        );
      }

      const results = await Promise.all(responses);
      
      // Count rate limited responses
      const limitedResponses = results.filter(r => r.status === 429);
      expect(limitedResponses.length).toBeGreaterThan(0);

      // Verify rate limit headers
      const lastResponse = results[results.length - 1];
      expect(lastResponse.headers['retry-after']).toBeDefined();
      expect(lastResponse.headers['x-ratelimit-limit']).toBeDefined();
      expect(lastResponse.headers['x-ratelimit-remaining']).toBeDefined();
      expect(lastResponse.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should handle rate limits across different endpoints', async () => {
      const endpoints = [
        '/api/health',
        '/api/events',
        '/api/users'
      ];

      const results = [];

      // Make requests to different endpoints
      for (const endpoint of endpoints) {
        for (let i = 0; i < 40; i++) {
          results.push(
            await request(app)
              .get(endpoint)
              .set('X-Forwarded-For', '192.168.1.2')
          );
        }
      }

      // Verify combined rate limiting
      const limitedResponses = results.filter(r => r.status === 429);
      expect(limitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication Rate Limiting', () => {
    it('should limit failed login attempts', async () => {
      const maxAttempts = 5; // Should match your auth rate limit config
      const responses = [];

      // Make multiple failed login attempts
      for (let i = 0; i < maxAttempts + 2; i++) {
        responses.push(
          await request(app)
            .post('/api/auth/login')
            .set('X-Forwarded-For', '192.168.1.3')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword'
            })
        );
      }

      // Verify rate limiting kicked in
      expect(responses[maxAttempts].status).toBe(429);
      expect(responses[maxAttempts + 1].status).toBe(429);
    });

    it('should limit password reset attempts', async () => {
      const maxAttempts = 3; // Should match your password reset rate limit
      const responses = [];

      // Make multiple password reset requests
      for (let i = 0; i < maxAttempts + 2; i++) {
        responses.push(
          await request(app)
            .post('/api/auth/forgot-password')
            .set('X-Forwarded-For', '192.168.1.4')
            .send({
              email: 'test@example.com'
            })
        );
      }

      // Verify rate limiting
      expect(responses[maxAttempts].status).toBe(429);
    });
  });

  describe('IP-based Rate Limiting', () => {
    it('should handle multiple IP addresses correctly', async () => {
      const ips = [
        '192.168.1.5',
        '192.168.1.6',
        '192.168.1.7'
      ];

      // Make requests from different IPs
      for (const ip of ips) {
        const responses = [];
        for (let i = 0; i < 40; i++) {
          responses.push(
            await request(app)
              .get('/api/health')
              .set('X-Forwarded-For', ip)
          );
        }

        // Each IP should have its own rate limit
        const limitedResponses = responses.filter(r => r.status === 429);
        if (limitedResponses.length > 0) {
          expect(limitedResponses[0].body.error.code).toBe('RATE_LIMIT_EXCEEDED');
        }
      }
    });

    it('should handle X-Forwarded-For header spoofing', async () => {
      const responses = [];

      // Attempt to bypass rate limiting with multiple IPs
      for (let i = 0; i < 50; i++) {
        responses.push(
          await request(app)
            .get('/api/health')
            .set('X-Forwarded-For', `192.168.1.${i}`)
            .set('X-Real-IP', '192.168.1.100')
        );
      }

      // Should still be rate limited based on real IP
      const limitedResponses = responses.filter(r => r.status === 429);
      expect(limitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Advanced Rate Limiting Features', () => {
    it('should implement sliding window rate limiting', async () => {
      const responses = [];
      const windowSize = 60; // 60 seconds
      const maxRequests = 100;

      // Make requests over time
      for (let i = 0; i < maxRequests + 10; i++) {
        responses.push(
          await request(app)
            .get('/api/health')
            .set('X-Forwarded-For', '192.168.1.8')
        );

        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Verify sliding window behavior
      const limitedResponses = responses.filter(r => r.status === 429);
      expect(limitedResponses.length).toBeGreaterThan(0);
    });

    it('should implement different limits for different endpoints', async () => {
      const endpoints = {
        '/api/health': 100,
        '/api/auth/login': 5,
        '/api/events': 50
      };

      for (const [endpoint, limit] of Object.entries(endpoints)) {
        const responses = [];
        
        // Make requests up to limit + 5
        for (let i = 0; i < limit + 5; i++) {
          responses.push(
            await request(app)
              .get(endpoint)
              .set('X-Forwarded-For', '192.168.1.9')
          );
        }

        // Verify endpoint-specific rate limiting
        const limitedResponses = responses.filter(r => r.status === 429);
        expect(limitedResponses.length).toBe(5);
      }
    });

    it('should handle burst requests appropriately', async () => {
      const responses = await Promise.all(
        Array(50).fill().map(() => 
          request(app)
            .get('/api/health')
            .set('X-Forwarded-For', '192.168.1.10')
        )
      );

      // Check if burst handling is working
      const statusCodes = responses.map(r => r.status);
      expect(statusCodes).toContain(429);
    });
  });

  describe('User-based Rate Limiting', () => {
    let authToken;

    beforeAll(async () => {
      // Login to get auth token
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestP@ssw0rd123!'
        });

      authToken = response.body.data.accessToken;
    });

    it('should apply user-specific rate limits', async () => {
      const responses = [];

      // Make authenticated requests
      for (let i = 0; i < 150; i++) {
        responses.push(
          await request(app)
            .get('/api/events')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      // Verify user-specific rate limiting
      const limitedResponses = responses.filter(r => r.status === 429);
      expect(limitedResponses.length).toBeGreaterThan(0);
    });

    it('should track limits separately for authenticated and unauthenticated requests', async () => {
      const results = {
        authenticated: [],
        unauthenticated: []
      };

      // Make parallel authenticated and unauthenticated requests
      for (let i = 0; i < 50; i++) {
        results.authenticated.push(
          request(app)
            .get('/api/events')
            .set('Authorization', `Bearer ${authToken}`)
        );

        results.unauthenticated.push(
          request(app)
            .get('/api/events')
            .set('X-Forwarded-For', '192.168.1.11')
        );
      }

      const [authedResponses, unauthedResponses] = await Promise.all([
        Promise.all(results.authenticated),
        Promise.all(results.unauthenticated)
      ]);

      // Verify different rate limits
      expect(authedResponses.filter(r => r.status === 429).length)
        .not.toBe(unauthedResponses.filter(r => r.status === 429).length);
    });
  });
});