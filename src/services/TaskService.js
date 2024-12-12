// src/services/EventService.js
const databaseService = require('./DatabaseService');

class EventService {
  constructor() {
    this.db = databaseService.getKnex();
    this.tableName = 'events';
  }

  /**
   * Create a new event
   * @param {Object} eventData 
   * @returns {Promise<Object>} Created event
   */
  async createEvent(eventData) {
    try {
      const [event] = await this.db(this.tableName)
        .insert(eventData)
        .returning('*');
      
      return event;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Create multiple events in a transaction
   * @param {Array<Object>} events 
   * @returns {Promise<Array<Object>>} Created events
   */
  async createManyEvents(events) {
    const trx = await this.db.transaction();
    
    try {
      const createdEvents = await Promise.all(
        events.map(event => 
          trx(this.tableName)
            .insert(event)
            .returning('*')
            .then(([result]) => result)
        )
      );

      await trx.commit();
      return createdEvents;
    } catch (error) {
      await trx.rollback();
      throw this._handleError(error);
    }
  }

  /**
   * Get event by ID
   * @param {string|number} id 
   * @returns {Promise<Object>} Event object
   */
  async getEventById(id) {
    try {
      const event = await this.db(this.tableName)
        .where({ id })
        .first();

      if (!event) {
        throw new Error('Event not found');
      }

      return event;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get events with pagination and filters
   * @param {Object} options Query options
   * @returns {Promise<{data: Array<Object>, pagination: Object}>}
   */
  async getEvents(options = {}) {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      type,
      status,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    try {
      const query = this.db(this.tableName)
        .modify(queryBuilder => {
          if (startDate) {
            queryBuilder.where('start_date', '>=', startDate);
          }
          if (endDate) {
            queryBuilder.where('end_date', '<=', endDate);
          }
          if (type) {
            queryBuilder.where({ type });
          }
          if (status) {
            queryBuilder.where({ status });
          }
        })
        .orderBy(sortBy, sortOrder);

      const offset = (page - 1) * limit;
      
      const [count, events] = await Promise.all([
        this.db(this.tableName).count('id as total').first(),
        query.limit(limit).offset(offset)
      ]);

      return {
        data: events,
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
   * Update an event
   * @param {string|number} id 
   * @param {Object} updateData 
   * @returns {Promise<Object>} Updated event
   */
  async updateEvent(id, updateData) {
    try {
      const [event] = await this.db(this.tableName)
        .where({ id })
        .update(updateData)
        .returning('*');

      if (!event) {
        throw new Error('Event not found');
      }

      return event;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Delete an event
   * @param {string|number} id 
   * @returns {Promise<boolean>} Success status
   */
  async deleteEvent(id) {
    try {
      const deleted = await this.db(this.tableName)
        .where({ id })
        .delete();

      if (!deleted) {
        throw new Error('Event not found');
      }

      return true;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get events by date range
   * @param {Date} startDate 
   * @param {Date} endDate 
   * @returns {Promise<Array<Object>>} Events in range
   */
  async getEventsByDateRange(startDate, endDate) {
    try {
      return await this.db(this.tableName)
        .whereBetween('start_date', [startDate, endDate])
        .orderBy('start_date', 'asc');
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get events by type
   * @param {string} type 
   * @param {Object} options Query options
   * @returns {Promise<Array<Object>>} Events of type
   */
  async getEventsByType(type, options = {}) {
    const { limit = 10, offset = 0 } = options;

    try {
      return await this.db(this.tableName)
        .where({ type })
        .limit(limit)
        .offset(offset)
        .orderBy('created_at', 'desc');
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Search events by query
   * @param {string} query Search query
   * @returns {Promise<Array<Object>>} Matching events
   */
  async searchEvents(query) {
    try {
      return await this.db(this.tableName)
        .where('title', 'like', `%${query}%`)
        .orWhere('description', 'like', `%${query}%`)
        .orderBy('created_at', 'desc');
    } catch (error) {
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
    console.error('EventService Error:', error);

    if (error.code === '23505') {
      return new Error('Duplicate event entry');
    }

    if (error.code === '23503') {
      return new Error('Referenced record not found');
    }

    if (error.message === 'Event not found') {
      return error;
    }

    return new Error('Database operation failed');
  }
}

// Export a singleton instance
const eventService = new EventService();
module.exports = eventService;