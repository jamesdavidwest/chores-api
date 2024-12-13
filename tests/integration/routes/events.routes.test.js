const request = require('supertest');
const app = require('../../../src/app');
const TestUtils = require('../../utils/testUtils');
const JWTService = require('../../../src/services/JWTService');

describe('Events API Routes', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    await TestUtils.setupTestDatabase();
    testUser = await TestUtils.createTestUser();
    authToken = await JWTService.generateToken({ userId: testUser.id });
  });

  afterAll(async () => {
    await TestUtils.cleanupTestDatabase();
  });

  describe('POST /api/events', () => {
    it('should create new event with valid data', async () => {
      const eventData = TestUtils.generateMockEvent();
      delete eventData.id; // Let the server generate the ID

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eventData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        title: eventData.title,
        description: eventData.description,
        status: 'DRAFT'
      });
    });

    it('should reject invalid event data', async () => {
      const invalidData = {
        title: '', // Empty title should fail validation
        description: 'Test description'
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require authentication', async () => {
      const eventData = TestUtils.generateMockEvent();

      const response = await request(app)
        .post('/api/events')
        .send(eventData);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/events', () => {
    beforeEach(async () => {
      // Create multiple test events
      await Promise.all([
        TestUtils.createTestEvent({ createdBy: testUser.id }),
        TestUtils.createTestEvent({ createdBy: testUser.id }),
        TestUtils.createTestEvent({ createdBy: testUser.id })
      ]);
    });

    it('should list events with pagination', async () => {
      const response = await request(app)
        .get('/api/events')
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

    it('should filter events by status', async () => {
      await TestUtils.createTestEvent({
        createdBy: testUser.id,
        status: 'PUBLISHED'
      });

      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'PUBLISHED' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: 'PUBLISHED'
          })
        ])
      );
    });

    it('should sort events by date', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ sortBy: 'createdAt', order: 'desc' });

      expect(response.status).toBe(200);
      const dates = response.body.data.map(event => new Date(event.createdAt));
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });
  });

  describe('GET /api/events/:id', () => {
    let testEvent;

    beforeEach(async () => {
      testEvent = await TestUtils.createTestEvent({ createdBy: testUser.id });
    });

    it('should return event by ID', async () => {
      const response = await request(app)
        .get(`/api/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: testEvent.id,
        title: testEvent.title,
        description: testEvent.description
      });
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .get('/api/events/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/events/:id', () => {
    let testEvent;

    beforeEach(async () => {
      testEvent = await TestUtils.createTestEvent({ createdBy: testUser.id });
    });

    it('should update event with valid data', async () => {
      const updates = {
        title: 'Updated Title',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(updates);
    });

    it('should reject invalid updates', async () => {
      const invalidUpdates = {
        status: 'INVALID_STATUS'
      };

      const response = await request(app)
        .put(`/api/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdates);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should prevent unauthorized updates', async () => {
      const unauthorizedUser = await TestUtils.createTestUser();
      const unauthorizedToken = await JWTService.generateToken({ 
        userId: unauthorizedUser.id 
      });

      const response = await request(app)
        .put(`/api/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .send({ title: 'Unauthorized Update' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/events/:id', () => {
    let testEvent;

    beforeEach(async () => {
      testEvent = await TestUtils.createTestEvent({ createdBy: testUser.id });
    });

    it('should delete event', async () => {
      const response = await request(app)
        .delete(`/api/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify event is deleted
      const getResponse = await request(app)
        .get(`/api/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should prevent unauthorized deletion', async () => {
      const unauthorizedUser = await TestUtils.createTestUser();
      const unauthorizedToken = await JWTService.generateToken({ 
        userId: unauthorizedUser.id 
      });

      const response = await request(app)
        .delete(`/api/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${unauthorizedToken}`);

      expect(response.status).toBe(403);
    });
  });
});