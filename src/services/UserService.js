const bcrypt = require('bcrypt');
const databaseService = require('./DatabaseService');
const AppError = require('../utils/AppError');
const { ErrorTypes } = require('../utils/errorTypes');

class UserService {
  constructor() {
    this.db = databaseService.getKnex();
    this.tableName = 'users';
    this.serviceName = 'UserService';
  }

  /**
   * Create a new user
   * @param {Object} userData User data
   * @returns {Promise<Object>} Created user
   */
  async createUser(userData) {
    try {
      const { password, ...otherData } = userData;
      const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

      const [user] = await this.db(this.tableName)
        .insert({
          ...otherData,
          password: hashedPassword,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning(['id', 'email', 'username', 'role', 'created_at', 'updated_at']);

      return user;
    } catch (error) {
      throw this._handleError(error, 'createUser', { 
        email: userData.email,
        username: userData.username 
      });
    }
  }

  /**
   * Find user by email
   * @param {string} email User email
   * @returns {Promise<Object>} User object
   */
  async findByEmail(email) {
    try {
      const user = await this.db(this.tableName)
        .where({ email })
        .first();

      if (!user) {
        throw new AppError(
          ErrorTypes.NOT_FOUND,
          this.serviceName,
          'findByEmail',
          {
            resource: 'User',
            identifier: 'email',
            value: email
          }
        );
      }

      return user;
    } catch (error) {
      throw this._handleError(error, 'findByEmail', { email });
    }
  }

  /**
   * Find user by ID
   * @param {string|number} id User ID
   * @returns {Promise<Object>} User object
   */
  async findById(id) {
    try {
      const user = await this.db(this.tableName)
        .where({ id })
        .select(['id', 'email', 'username', 'role', 'created_at', 'updated_at'])
        .first();

      if (!user) {
        throw new AppError(
          ErrorTypes.NOT_FOUND,
          this.serviceName,
          'findById',
          {
            resource: 'User',
            id: id
          }
        );
      }

      return user;
    } catch (error) {
      throw this._handleError(error, 'findById', { id });
    }
  }

  /**
   * Update user
   * @param {string|number} id User ID
   * @param {Object} updateData Update data
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(id, updateData) {
    const trx = await this.db.transaction();

    try {
      const { password, ...otherUpdates } = updateData;
      const updates = { ...otherUpdates, updated_at: new Date() };

      if (password) {
        updates.password = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
      }

      const [updatedUser] = await trx(this.tableName)
        .where({ id })
        .update(updates)
        .returning(['id', 'email', 'username', 'role', 'created_at', 'updated_at']);

      if (!updatedUser) {
        throw new AppError(
          ErrorTypes.NOT_FOUND,
          this.serviceName,
          'updateUser',
          {
            resource: 'User',
            id: id,
            updateAttempted: true,
            fields: Object.keys(updateData)
          }
        );
      }

      await trx.commit();
      return updatedUser;
    } catch (error) {
      await trx.rollback();
      throw this._handleError(error, 'updateUser', { id, updateFields: Object.keys(updateData) });
    }
  }

  /**
   * Delete user
   * @param {string|number} id User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteUser(id) {
    const trx = await this.db.transaction();

    try {
      const deleted = await trx(this.tableName)
        .where({ id })
        .delete();

      if (!deleted) {
        throw new AppError(
          ErrorTypes.NOT_FOUND,
          this.serviceName,
          'deleteUser',
          {
            resource: 'User',
            id: id,
            deleteAttempted: true
          }
        );
      }

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw this._handleError(error, 'deleteUser', { id });
    }
  }

  /**
   * Get users with pagination
   * @param {Object} options Query options
   * @returns {Promise<{data: Array<Object>, pagination: Object}>}
   */
  async getUsers(options = {}) {
    const {
      page = 1,
      limit = 10,
      role,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search
    } = options;

    try {
      const query = this.db(this.tableName)
        .select(['id', 'email', 'username', 'role', 'created_at', 'updated_at'])
        .modify(queryBuilder => {
          if (role) {
            queryBuilder.where({ role });
          }
          if (search) {
            queryBuilder.where(builder => {
              builder
                .where('email', 'like', `%${search}%`)
                .orWhere('username', 'like', `%${search}%`);
            });
          }
        })
        .orderBy(sortBy, sortOrder);

      const offset = (page - 1) * limit;
      
      const [count, users] = await Promise.all([
        this.db(this.tableName).count('id as total').first(),
        query.limit(limit).offset(offset)
      ]);

      return {
        data: users,
        pagination: {
          page,
          limit,
          total: parseInt(count.total),
          totalPages: Math.ceil(count.total / limit)
        }
      };
    } catch (error) {
      throw this._handleError(error, 'getUsers', { options });
    }
  }

  /**
   * Validate user password
   * @param {Object} user User object
   * @param {string} password Password to validate
   * @returns {Promise<boolean>} Validation result
   */
  async validatePassword(user, password) {
    try {
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        throw new AppError(
          ErrorTypes.INVALID_CREDENTIALS,
          this.serviceName,
          'validatePassword',
          {
            reason: 'Password does not match',
            userId: user.id
          }
        );
      }
      return true;
    } catch (error) {
      throw this._handleError(error, 'validatePassword', { userId: user.id });
    }
  }

  /**
   * Change user password
   * @param {string|number} id User ID
   * @param {string} currentPassword Current password
   * @param {string} newPassword New password
   * @returns {Promise<boolean>} Success status
   */
  async changePassword(id, currentPassword, newPassword) {
    const trx = await this.db.transaction();

    try {
      const user = await trx(this.tableName)
        .where({ id })
        .first();

      if (!user) {
        throw new AppError(
          ErrorTypes.NOT_FOUND,
          this.serviceName,
          'changePassword',
          {
            resource: 'User',
            id: id,
            action: 'password change'
          }
        );
      }

      await this.validatePassword(user, currentPassword);

      const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);
      
      await trx(this.tableName)
        .where({ id })
        .update({
          password: hashedPassword,
          updated_at: new Date()
        });

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw this._handleError(error, 'changePassword', { id });
    }
  }

  /**
   * Handle database errors with specific context
   * @private
   * @param {Error} error 
   * @param {string} method 
   * @param {Object} details
   * @returns {AppError}
   */
  _handleError(error, method, details = {}) {
    // If it's already an AppError, just pass it through
    if (error instanceof AppError) {
      return error;
    }

    // Handle specific database errors
    if (error.code === '23505') {
      return new AppError(
        ErrorTypes.DUPLICATE_ENTRY,
        this.serviceName,
        method,
        {
          error: error.detail,
          constraint: error.constraint,
          ...details
        }
      );
    }

    if (error.code === '23503') {
      return new AppError(
        ErrorTypes.VALIDATION_ERROR,
        this.serviceName,
        method,
        {
          message: 'Referenced record does not exist',
          error: error.detail,
          constraint: error.constraint,
          ...details
        }
      );
    }

    // Handle bcrypt errors
    if (error.name === 'bcryptError') {
      return new AppError(
        ErrorTypes.INTERNAL_ERROR,
        this.serviceName,
        method,
        {
          message: 'Password hashing failed',
          error: error.message,
          ...details
        }
      );
    }

    // Handle general database errors
    return new AppError(
      ErrorTypes.DB_ERROR,
      this.serviceName,
      method,
      {
        message: error.message,
        code: error.code,
        ...details
      }
    );
  }
}

// Export a singleton instance
const userService = new UserService();
module.exports = userService;