const request = require('supertest');
const app = require('../../../src/app');
const TestUtils = require('../../utils/testUtils');
const JWTService = require('../../../src/services/JWTService');
const { hashPassword } = require('../../../src/utils/auth');

describe('Users API Routes', () => {
  beforeAll(async () => {
    await TestUtils.setupTestDatabase();
  });

  afterAll(async () => {
    await TestUtils.cleanupTestDatabase();
  });

  describe('POST /api/users/register', () => {
    it('should register new user with valid data', async () => {
      const userData = TestUtils.generateMockUser();
      delete userData.id;

      const response = await request(app)
        .post('/api/users/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        status: 'ACTIVE'
      });
      expect(response.body.data.password).toBeUndefined();
    });

    it('should reject registration with existing email', async () => {
      const existingUser = await TestUtils.createTestUser();
      const userData = TestUtils.generateMockUser();
      userData.email = existingUser.email;

      const response = await request(app)
        .post('/api/users/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should validate password requirements', async () => {
      const userData = TestUtils.generateMockUser();
      userData.password = 'weak';

      const response = await request(app)
        .post('/api/users/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/users/login', () => {
    let testUser;
    const password = 'Test123!@#';

    beforeEach(async () => {
      const hashedPassword = await hashPassword(password);
      testUser = await TestUtils.createTestUser({ password: hashedPassword });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: testUser.email,
          password: password
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user).toMatchObject({
        id: testUser.id,
        email: testUser.email
      });
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'nonexistent@example.com',
          password: password
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/users/profile', () => {
    let testUser;
    let authToken;

    beforeEach(async () => {
      testUser = await TestUtils.createTestUser();
      authToken = await JWTService.generateToken({ userId: testUser.id });
    });

    it('should return user profile', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/users/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/users/profile', () => {
    let testUser;
    let authToken;

    beforeEach(async () => {
      testUser = await TestUtils.createTestUser();
      authToken = await JWTService.generateToken({ userId: testUser.id });
    });

    it('should update user profile', async () => {
      const updates = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(updates);
    });

    it('should not allow email update', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'newemail@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate update data', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/users/change-password', () => {
    let testUser;
    let authToken;
    const originalPassword = 'Test123!@#';
    const newPassword = 'NewTest456!@#';

    beforeEach(async () => {
      const hashedPassword = await hashPassword(originalPassword);
      testUser = await TestUtils.createTestUser({ password: hashedPassword });
      authToken = await JWTService.generateToken({ userId: testUser.id });
    });

    it('should change password with valid data', async () => {
      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: originalPassword,
          newPassword: newPassword
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: testUser.email,
          password: newPassword
        });

      expect(loginResponse.status).toBe(200);
    });

    it('should reject incorrect current password', async () => {
      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: newPassword
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should validate new password requirements', async () => {
      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: originalPassword,
          newPassword: 'weak'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/users/refresh-token', () => {
    let testUser;
    let refreshToken;

    beforeEach(async () => {
      testUser = await TestUtils.createTestUser();
      refreshToken = await JWTService.generateRefreshToken({ userId: testUser.id });
    });

    it('should issue new tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/users/refresh-token')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/users/refresh-token')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/users/logout', () => {
    let testUser;
    let authToken;

    beforeEach(async () => {
      testUser = await TestUtils.createTestUser();
      authToken = await JWTService.generateToken({ userId: testUser.id });
    });

    it('should successfully logout user', async () => {
      const response = await request(app)
        .post('/api/users/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/users/logout');

      expect(response.status).toBe(401);
    });
  });
});