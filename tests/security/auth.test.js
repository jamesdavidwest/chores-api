const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = require('../../src/app');
const { generateRandomString } = require('../utils/testUtils');

describe('Authentication Security', () => {
  describe('Password Security', () => {
    it('should reject weak passwords', async () => {
      const weakPasswords = [
        'password',
        '12345678',
        'qwerty123',
        'letmein',
        'admin123'
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test${Date.now()}@example.com`,
            password,
            firstName: 'Test',
            lastName: 'User'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should store passwords with strong hashing', async () => {
      const password = 'StrongP@ssw0rd123!';
      const email = `test${Date.now()}@example.com`;

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password,
          firstName: 'Test',
          lastName: 'User'
        });

      expect(response.status).toBe(201);

      // Get user from database and verify password hash
      const user = await getUserByEmail(email);
      expect(user.password).not.toBe(password);
      expect(user.password).toMatch(/^\$2[abxy]\$\d+\$/); // bcrypt hash pattern
    });

    it('should prevent password reuse', async () => {
      const email = `test${Date.now()}@example.com`;
      const oldPassword = 'OldP@ssw0rd123!';
      const newPassword = 'NewP@ssw0rd123!';

      // Register user
      await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: oldPassword,
          firstName: 'Test',
          lastName: 'User'
        });

      // Login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email, password: oldPassword });

      const token = loginRes.body.data.accessToken;

      // Try to update password to the same one
      const samePasswordRes = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: oldPassword,
          newPassword: oldPassword
        });

      expect(samePasswordRes.status).toBe(400);

      // Update to new password
      const newPasswordRes = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: oldPassword,
          newPassword: newPassword
        });

      expect(newPasswordRes.status).toBe(200);
    });
  });

  describe('Brute Force Protection', () => {
    it('should limit failed login attempts', async () => {
      const email = `test${Date.now()}@example.com`;
      const password = 'TestP@ssw0rd123!';

      // Register user
      await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password,
          firstName: 'Test',
          lastName: 'User'
        });

      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email,
            password: 'wrongpassword'
          });
      }

      // Next attempt should be blocked
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(429);
    });

    it('should implement exponential backoff for failed attempts', async () => {
      const email = `test${Date.now()}@example.com`;
      const password = 'TestP@ssw0rd123!';

      // Register user
      await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password,
          firstName: 'Test',
          lastName: 'User'
        });

      const loginAttempts = [];
      
      // Make several failed login attempts and record response times
      for (let i = 0; i < 3; i++) {
        const start = Date.now();
        await request(app)
          .post('/api/auth/login')
          .send({
            email,
            password: 'wrongpassword'
          });
        loginAttempts.push(Date.now() - start);
      }

      // Verify increasing delays between attempts
      for (let i = 1; i < loginAttempts.length; i++) {
        expect(loginAttempts[i]).toBeGreaterThan(loginAttempts[i-1]);
      }
    });
  });

  describe('Token Security', () => {
    it('should issue tokens with appropriate expiration', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestP@ssw0rd123!'
        });

      const token = response.body.data.accessToken;
      const decoded = jwt.decode(token);

      // Token should expire in reasonable time (e.g., 1 hour)
      expect(decoded.exp - decoded.iat).toBeLessThanOrEqual(3600);
    });

    it('should properly validate token signatures', async () => {
      // Generate invalid token
      const invalidToken = jwt.sign(
        { userId: 1, email: 'test@example.com' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
    });

    it('should invalidate tokens on logout', async () => {
      // Login to get token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestP@ssw0rd123!'
        });

      const token = loginRes.body.data.accessToken;

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Try to use token after logout
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Session Security', () => {
    let token;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestP@ssw0rd123!'
        });

      token = response.body.data.accessToken;
    });

    it('should detect concurrent sessions', async () => {
      // Login from another "device"
      const secondLoginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestP@ssw0rd123!'
        });

      expect(secondLoginRes.body.data.concurrentSession).toBe(true);
    });

    it('should validate session integrity', async () => {
      const response = await request(app)
        .get('/api/auth/session-info')
        .set('Authorization', `Bearer ${token}`);

      expect(response.body.data).toHaveProperty('lastActivity');
      expect(response.body.data).toHaveProperty('ipAddress');
      expect(response.body.data).toHaveProperty('userAgent');
    });
  });
});