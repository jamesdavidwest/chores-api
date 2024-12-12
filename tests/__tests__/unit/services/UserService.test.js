// tests/__tests__/unit/services/UserService.test.js

const UserService = require('../../../../src/services/UserService');
const DatabaseService = require('../../../../src/services/DatabaseService');
const testUtils = require('../../../testUtils');

describe('UserService', () => {
  beforeAll(async () => {
    DatabaseService.getInstance();
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
