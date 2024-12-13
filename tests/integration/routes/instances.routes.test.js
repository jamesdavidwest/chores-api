const request = require('supertest');
const app = require('../../../src/app');
const TestUtils = require('../../utils/testUtils');
const JWTService = require('../../../src/services/JWTService');

describe('Instances API Routes', () => {
  let authToken;
  let testUser;
  let testEvent;

  beforeAll(async () => {
    await TestUtils.setupTestDatabase();
    testUser = await TestUtils.createTestUser();
    authToken = await JWTService.generateToken({ userId: testUser.id });
    testEvent = await TestUtils.createTestEvent({ createdBy: testUser.id });
  });

  afterAll(async () => {
    await TestUtils.cleanupTestDatabase();
  });

  describe('POST /api/instances', () => {
    it('should create new instance with valid data', async () => {
      const instanceData = TestUtils.generateMockInstance(testEvent.id);
      delete instanceData.id;

      const response = await request(app)
        .post('/api/instances')
        .set('Authorization', `Bearer ${authToken}`)
        .send(instanceData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        eventId: testEvent.id,
        status: 'PENDING'
      });
    });

    it('should reject instance for non-existent event', async () => {
      const invalidData = TestUtils.generateMockInstance('non-existent-event');
      delete invalidData.id;

      const response = await request(app)
        .post('/api/instances')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const instanceData = TestUtils.generateMockInstance(testEvent.id);

      const response = await request(app)
        .post('/api/instances')
        .send(instanceData);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/instances', () => {
    beforeEach(async () => {
      await Promise.all([
        TestUtils.createTestInstance(testEvent.id),
        TestUtils.createTestInstance(testEvent.id),
        TestUtils.createTestInstance(testEvent.id)
      ]);
    });

    it('should list instances with pagination', async () => {
      const response = await request(app)
        .get('/api/instances')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: expect.any(Number),
        hasMore: true
      });
    });

    it('should filter instances by event ID', async () => {
      const response = await request(app)
        .get('/api/instances')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ eventId: testEvent.id });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventId: testEvent.id
          })
        ])
      );
    });

    it('should filter instances by status', async () => {
      await TestUtils.createTestInstance(testEvent.id, { status: 'COMPLETED' });

      const response = await request(app)
        .get('/api/instances')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'COMPLETED' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: 'COMPLETED'
          })
        ])
      );
    });
  });

  describe('GET /api/instances/:id', () => {
    let testInstance;

    beforeEach(async () => {
      testInstance = await TestUtils.createTestInstance(testEvent.id);
    });

    it('should return instance by ID', async () => {
      const response = await request(app)
        .get(`/api/instances/${testInstance.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: testInstance.id,
        eventId: testEvent.id,
        status: testInstance.status
      });
    });

    it('should return 404 for non-existent instance', async () => {
      const response = await request(app)
        .get('/api/instances/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/instances/:id', () => {
    let testInstance;

    beforeEach(async () => {
      testInstance = await TestUtils.createTestInstance(testEvent.id);
    });

    it('should update instance status', async () => {
      const updates = {
        status: 'COMPLETED',
        data: JSON.stringify({ completed: true })
      };

      const response = await request(app)
        .put(`/api/instances/${testInstance.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(updates);
    });

    it('should reject invalid status transition', async () => {
      const completedInstance = await TestUtils.createTestInstance(testEvent.id, { 
        status: 'COMPLETED' 
      });

      const invalidUpdate = {
        status: 'PENDING'
      };

      const response = await request(app)
        .put(`/api/instances/${completedInstance.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdate);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should prevent unauthorized updates', async () => {
      const unauthorizedUser = await TestUtils.createTestUser();
      const unauthorizedToken = await JWTService.generateToken({ 
        userId: unauthorizedUser.id 
      });

      const response = await request(app)
        .put(`/api/instances/${testInstance.id}`)
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/instances/:id', () => {
    let testInstance;

    beforeEach(async () => {
      testInstance = await TestUtils.createTestInstance(testEvent.id);
    });

    it('should delete instance', async () => {
      const response = await request(app)
        .delete(`/api/instances/${testInstance.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify instance is deleted
      const getResponse = await request(app)
        .get(`/api/instances/${testInstance.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should prevent unauthorized deletion', async () => {
      const unauthorizedUser = await TestUtils.createTestUser();
      const unauthorizedToken = await JWTService.generateToken({ 
        userId: unauthorizedUser.id 
      });

      const response = await request(app)
        .delete(`/api/instances/${testInstance.id}`)
        .set('Authorization', `Bearer ${unauthorizedToken}`);

      expect(response.status).toBe(403);
    });
  });
});