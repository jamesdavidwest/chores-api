const bcrypt = require('bcryptjs');
const { AppError } = require('../utils/AppError');
const { config } = require('../config/auth');
const DatabaseService = require('./DatabaseService');

class UserService {
  constructor() {
    this.db = DatabaseService;
    this.tableName = 'users';
  }

  async hashPassword(password) {
    return bcrypt.hash(password, config.password.saltRounds);
  }

  validatePassword(password) {
    if (password.length < config.password.minLength) {
      throw new AppError(
        400,
        'VAL001',
        `Password must be at least ${config.password.minLength} characters long`
      );
    }

    if (config.password.requireNumbers && !/\d/.test(password)) {
      throw new AppError(400, 'VAL002', 'Password must contain at least one number');
    }

    if (config.password.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new AppError(400, 'VAL003', 'Password must contain at least one special character');
    }
  }

  async create(userData) {
    const { email, password, instanceId, roles = ['user'] } = userData;

    // Validate email and password
    if (!email) throw new AppError(400, 'VAL004', 'Email is required');
    this.validatePassword(password);

    // Check if user already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new AppError(409, 'USER001', 'User already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const user = await this.db.transaction(async (trx) => {
      const [userId] = await trx(this.tableName)
        .insert({
          email,
          password: hashedPassword,
          instance_id: instanceId,
          roles: JSON.stringify(roles),
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('id');

      return this.findById(userId, trx);
    });

    // Remove password from returned user object
    delete user.password;
    return user;
  }

  async findById(id, trx = this.db) {
    const user = await trx(this.tableName).where({ id }).first();

    if (!user) {
      throw new AppError(404, 'USER002', 'User not found');
    }

    // Parse roles from JSON string
    user.roles = JSON.parse(user.roles || '[]');
    return user;
  }

  async findByEmail(email, trx = this.db) {
    const user = await trx(this.tableName).where({ email }).first();

    if (user) {
      user.roles = JSON.parse(user.roles || '[]');
    }

    return user;
  }

  async update(id, updateData) {
    const { password, ...otherUpdates } = updateData;
    const updates = { ...otherUpdates };

    if (password) {
      this.validatePassword(password);
      updates.password = await this.hashPassword(password);
    }

    updates.updated_at = new Date();

    const user = await this.db.transaction(async (trx) => {
      await trx(this.tableName).where({ id }).update(updates);

      return this.findById(id, trx);
    });

    delete user.password;
    return user;
  }

  async delete(id) {
    const deleted = await this.db(this.tableName).where({ id }).delete();

    if (!deleted) {
      throw new AppError(404, 'USER003', 'User not found');
    }

    return { success: true };
  }

  async changePassword(id, currentPassword, newPassword) {
    const user = await this.findById(id);

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new AppError(401, 'USER004', 'Current password is incorrect');
    }

    // Validate and update new password
    this.validatePassword(newPassword);
    return this.update(id, { password: newPassword });
  }

  async verifyPassword(userId, password) {
    const user = await this.findById(userId);
    return bcrypt.compare(password, user.password);
  }
}

module.exports = new UserService();
