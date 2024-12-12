// tests/__tests__/unit/services/UserService.test.js

const UserService = require('../../../../src/services/UserService');
const DatabaseService = require('../../../../src/services/DatabaseService');
const testUtils = require('../../../testUtils');

describe('UserService', () => {
  let db;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
  });

  beforeEach(async () => {
    await testUtils.clearTable('users');
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = testUtils.generateMockUser();
      const user = await UserService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe('user');
      expect(user.password).not.toBe(userData.password); // Should be hashed
    });

    it('should throw error if email already exists', async () => {
      const userData = testUtils.generateMockUser();
      await UserService.createUser(userData);

      await expect(UserService.createUser(userData)).rejects.toThrow();
    });
  });
});

// tests/__tests__/integration/auth.test.js

const request = require('supertest');
const app = require('../../../../src/app');
const testUtils = require('../../../testUtils');

describe('Authentication API', () => {
  beforeEach(async () => {
    await testUtils.clearTable('users');
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = testUtils.generateMockUser();

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.password).toBeUndefined();
    });

    it('should return validation error for invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VAL_001');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const userData = testUtils.generateMockUser();
      await testUtils.createTestUser(userData);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });
  });
});

// tests/__tests__/unit/utils/responseFormatter.test.js

const ResponseFormatter = require('../../../../src/utils/responseFormatter');

describe('ResponseFormatter', () => {
  describe('success', () => {
    it('should format successful response correctly', () => {
      const data = { id: 1, name: 'Test' };
      const response = ResponseFormatter.success(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.metadata).toBeDefined();
      expect(response.metadata.timestamp).toBeDefined();
      expect(response.metadata.requestId).toBeDefined();
    });
  });

  describe('error', () => {
    it('should format error response correctly', () => {
      const error = {
        code: 'TEST_ERROR',
        message: 'Test error message',
        details: { field: 'test' },
      };
      const response = ResponseFormatter.error(error);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe(error.code);
      expect(response.error.message).toBe(error.message);
      expect(response.metadata).toBeDefined();
    });
  });

  describe('withPagination', () => {
    it('should format paginated response correctly', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const paginationData = {
        page: 1,
        limit: 10,
        total: 20,
      };

      const response = ResponseFormatter.withPagination(data, paginationData);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.metadata.pagination).toBeDefined();
      expect(response.metadata.pagination.hasMore).toBe(true);
    });
  });
});