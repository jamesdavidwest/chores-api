const request = require('supertest');
const app = require('../server');
const jwt = require('jsonwebtoken');
const { writeData } = require('../utils/dataAccess');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

describe('Auth API', () => {
  beforeEach(async () => {
    // Setup test data
    const testData = {
      users: [
        {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          role: 'USER'
        },
        {
          id: 2,
          name: 'Admin User',
          email: 'admin@example.com',
          password: 'admin123',
          role: 'ADMIN'
        }
      ],
      chores: [],
      locations: [],
      frequency_types: []
    };

    await writeData(testData);
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate valid user and return token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.role).toBe('USER');
    });

    it('should authenticate admin user and return correct role', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.role).toBe('ADMIN');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user data for valid token', async () => {
      const token = jwt.sign(
        { id: 1, email: 'test@example.com', role: 'USER' },
        JWT_SECRET
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('email', 'test@example.com');
      expect(response.body).toHaveProperty('role', 'USER');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with non-existent user', async () => {
      const token = jwt.sign(
        { id: 999, email: 'nonexistent@example.com', role: 'USER' },
        JWT_SECRET
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});