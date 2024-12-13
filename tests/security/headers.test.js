const request = require('supertest');
const app = require('../../src/app');

describe('Security Headers', () => {
  let response;

  beforeAll(async () => {
    response = await request(app).get('/');
  });

  describe('Helmet Default Headers', () => {
    it('should set X-DNS-Prefetch-Control header', () => {
      expect(response.headers['x-dns-prefetch-control']).toBe('off');
    });

    it('should set X-Frame-Options header', () => {
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    it('should set Strict-Transport-Security header', () => {
      expect(response.headers['strict-transport-security'])
        .toBe('max-age=15552000; includeSubDomains');
    });

    it('should set X-Download-Options header', () => {
      expect(response.headers['x-download-options']).toBe('noopen');
    });

    it('should set X-Content-Type-Options header', () => {
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-XSS-Protection header', () => {
      expect(response.headers['x-xss-protection']).toBe('0');
    });

    it('should set Content-Security-Policy header', () => {
      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("font-src 'self' https: data:");
      expect(csp).toContain("form-action 'self'");
      expect(csp).toContain("frame-ancestors 'self'");
      expect(csp).toContain("img-src 'self' data: https:");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("script-src-attr 'none'");
      expect(csp).toContain("style-src 'self' https: 'unsafe-inline'");
      expect(csp).toContain("upgrade-insecure-requests");
    });
  });

  describe('Custom Security Headers', () => {
    it('should set Permissions-Policy header', () => {
      const permissions = response.headers['permissions-policy'];
      expect(permissions).toBeDefined();
      expect(permissions).toContain('geolocation=()');
      expect(permissions).toContain('camera=()');
      expect(permissions).toContain('microphone=()');
    });

    it('should set Referrer-Policy header', () => {
      expect(response.headers['referrer-policy']).toBe('no-referrer');
    });

    it('should not expose sensitive headers', () => {
      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('CORS Headers', () => {
    it('should set proper CORS headers for OPTIONS request', async () => {
      const corsResponse = await request(app)
        .options('/')
        .set('Origin', process.env.CORS_ORIGIN || 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(corsResponse.headers['access-control-allow-origin'])
        .toBe(process.env.CORS_ORIGIN || 'http://localhost:3000');
      expect(corsResponse.headers['access-control-allow-methods'])
        .toContain('GET');
      expect(corsResponse.headers['access-control-allow-headers'])
        .toBeDefined();
      expect(corsResponse.headers['access-control-max-age'])
        .toBeDefined();
    });

    it('should reject CORS requests from unauthorized origins', async () => {
      const corsResponse = await request(app)
        .get('/')
        .set('Origin', 'http://malicious-site.com');

      expect(corsResponse.headers['access-control-allow-origin'])
        .toBeUndefined();
    });
  });

  describe('Cookie Security', () => {
    let authResponse;

    beforeAll(async () => {
      // Assuming we have a login endpoint that sets cookies
      authResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
    });

    it('should set secure cookies with proper attributes', () => {
      const cookies = authResponse.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      cookies.forEach(cookie => {
        expect(cookie).toContain('Secure');
        expect(cookie).toContain('HttpOnly');
        expect(cookie).toContain('SameSite=Strict');
      });
    });

    it('should set appropriate cookie expiration', () => {
      const cookies = authResponse.headers['set-cookie'];
      cookies.forEach(cookie => {
        const maxAge = cookie.match(/Max-Age=(\d+)/);
        if (maxAge) {
          const age = parseInt(maxAge[1]);
          // Ensure cookies expire in a reasonable time (e.g., 24 hours or less)
          expect(age).toBeLessThanOrEqual(24 * 60 * 60);
        }
      });
    });
  });
});