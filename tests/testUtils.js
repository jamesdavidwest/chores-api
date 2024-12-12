const jwt = require("jsonwebtoken");
const DatabaseService = require("../src/services/DatabaseService");

const testUtils = {
  // Database utilities
  async clearTable(tableName) {
    const db = DatabaseService.getInstance();
    await db(tableName).del();
  },

  async createTestUser(userData = {}) {
    const db = DatabaseService.getInstance();
    const defaultUser = {
      email: "test@example.com",
      password: "$2a$10$testHashedPassword",
      role: "user",
      ...userData,
    };

    const [userId] = await db("users").insert(defaultUser);
    return userId;
  },

  // Authentication utilities
  generateTestToken(userId, role = "user") {
    return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
  },

  // Request helpers
  getAuthHeader(token) {
    return { Authorization: `Bearer ${token}` };
  },

  // Mock data generators
  generateMockUser(overrides = {}) {
    return {
      email: `test-${Date.now()}@example.com`,
      password: "TestPassword123!",
      role: "user",
      ...overrides,
    };
  },

  generateMockEvent(overrides = {}) {
    return {
      title: `Test Event ${Date.now()}`,
      description: "Test description",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(), // +1 day
      ...overrides,
    };
  },
};

module.exports = testUtils;
