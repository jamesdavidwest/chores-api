// src/services/UserService.js
const bcrypt = require('bcrypt');
const databaseService = require('./DatabaseService');

class UserService {
  constructor() {
    this.db = databaseService.getKnex();
    this.tableName = 'users';
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
      throw this._handleError(error);
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

      return user;
    } catch (error) {
      throw this._handleError(error);
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
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw this._handleError(error);
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
        throw new Error('User not found');
      }

      await trx.commit();
      return updatedUser;
    } catch (error) {
      await trx.rollback();
      throw this._handleError(error);
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
        throw new Error('User not found');
      }

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw this._handleError(error);
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
      throw this._handleError(error);
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
      return await bcrypt.compare(password, user.password);
    } catch (error) {
      throw new Error('Password validation failed');
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
        throw new Error('User not found');
      }

      const isValid = await this.validatePassword(user, currentPassword);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

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
      throw this._handleError(error);
    }
  }

  /**
   * Handle database errors
   * @private
   * @param {Error} error 
   * @returns {Error}
   */
  _handleError(error) {
    // Log the error here if you have a logging service
    console.error('UserService Error:', error);

    if (error.code === '23505') {
      return new Error('Email or username already exists');
    }

    if (error.message === 'User not found' || 
        error.message === 'Current password is incorrect' ||
        error.message === 'Password validation failed') {
      return error;
    }

    return new Error('Database operation failed');
  }
}

// Export a singleton instance
const userService = new UserService();
module.exports = userService;