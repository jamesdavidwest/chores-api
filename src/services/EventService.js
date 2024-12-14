const databaseService = require("./DatabaseService");
const AppError = require("../utils/AppError");
const { ErrorTypes } = require("../utils/errorTypes");

class EventService {
  constructor() {
    this.db = databaseService.getKnex();
    this.tableName = "events";
    this.serviceName = "EventService";
  }

  /**
   * Create a new event
   * @param {Object} eventData
   * @returns {Promise<Object>} Created event
   */
  async createEvent(eventData) {
    const trx = await this.db.transaction();
    
    try {
      // If this is a child event, verify parent exists and calculate hierarchy
      if (eventData.parent_id) {
        const parent = await trx(this.tableName)
          .where({ id: eventData.parent_id })
          .first();

        if (!parent) {
          throw new AppError(
            ErrorTypes.NOT_FOUND,
            this.serviceName,
            "createEvent",
            {
              resource: "Parent Event",
              id: eventData.parent_id
            }
          );
        }

        // Calculate hierarchy path
        const parentPath = parent.hierarchy_path ? JSON.parse(parent.hierarchy_path) : [];
        eventData.hierarchy_path = JSON.stringify([...parentPath, parent.id]);
      } else {
        eventData.hierarchy_path = JSON.stringify([]);
      }

      const [event] = await trx(this.tableName)
        .insert(eventData)
        .returning("*");

      // Create audit log entry
      await this._createAuditLog(trx, event.id, "CREATE", null, event, eventData.user_id);

      await trx.commit();
      return event;
    } catch (error) {
      await trx.rollback();
      throw this._handleError(error, "createEvent", { eventData });
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
        events.map(async (event) => {
          if (event.parent_id) {
            const parent = await trx(this.tableName)
              .where({ id: event.parent_id })
              .first();

            if (!parent) {
              throw new AppError(
                ErrorTypes.NOT_FOUND,
                this.serviceName,
                "createManyEvents",
                {
                  resource: "Parent Event",
                  id: event.parent_id
                }
              );
            }

            const parentPath = parent.hierarchy_path ? JSON.parse(parent.hierarchy_path) : [];
            event.hierarchy_path = JSON.stringify([...parentPath, parent.id]);
          } else {
            event.hierarchy_path = JSON.stringify([]);
          }

          const [createdEvent] = await trx(this.tableName)
            .insert(event)
            .returning("*");

          await this._createAuditLog(trx, createdEvent.id, "CREATE", null, createdEvent, event.user_id);
          return createdEvent;
        })
      );

      await trx.commit();
      return createdEvents;
    } catch (error) {
      await trx.rollback();
      throw this._handleError(error, "createManyEvents", {
        eventCount: events.length,
        failedEvent: error.event,
      });
    }
  }

  /**
   * Get event by ID
   * @param {string|number} id
   * @returns {Promise<Object>} Event object
   */
  async getEventById(id) {
    try {
      const event = await this.db(this.tableName).where({ id }).first();

      if (!event) {
        throw new AppError(
          ErrorTypes.NOT_FOUND,
          this.serviceName,
          "getEventById",
          {
            resource: "Event",
            id: id,
          }
        );
      }

      return event;
    } catch (error) {
      throw this._handleError(error, "getEventById", { id });
    }
  }

  /**
   * Get all children of an event
   * @param {string|number} parentId
   * @returns {Promise<Array<Object>>} Child events
   */
  async getEventChildren(parentId) {
    try {
      return await this.db(this.tableName)
        .where({ parent_id: parentId })
        .orderBy('created_at', 'asc');
    } catch (error) {
      throw this._handleError(error, "getEventChildren", { parentId });
    }
  }

  /**
   * Get complete event hierarchy
   * @param {string|number} eventId
   * @returns {Promise<Object>} Event hierarchy
   */
  async getEventHierarchy(eventId) {
    try {
      const event = await this.getEventById(eventId);
      const hierarchyPath = JSON.parse(event.hierarchy_path || '[]');
      
      const children = await this.getEventChildren(eventId);
      const childHierarchies = await Promise.all(
        children.map(child => this.getEventHierarchy(child.id))
      );

      return {
        ...event,
        children: childHierarchies
      };
    } catch (error) {
      throw this._handleError(error, "getEventHierarchy", { eventId });
    }
  }

  /**
   * Get event audit history
   * @param {string|number} eventId
   * @returns {Promise<Array<Object>>} Audit log entries
   */
  async getEventAuditHistory(eventId) {
    try {
      return await this.db('event_audit_log')
        .where({ event_id: eventId })
        .orderBy('created_at', 'desc');
    } catch (error) {
      throw this._handleError(error, "getEventAuditHistory", { eventId });
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
      parent_id,
      sortBy = "created_at",
      sortOrder = "desc",
    } = options;

    try {
      const query = this.db(this.tableName)
        .modify((queryBuilder) => {
          if (startDate) {
            queryBuilder.where("start_date", ">=", startDate);
          }
          if (endDate) {
            queryBuilder.where("end_date", "<=", endDate);
          }
          if (type) {
            queryBuilder.where({ type });
          }
          if (status) {
            queryBuilder.where({ status });
          }
          if (parent_id !== undefined) {
            queryBuilder.where({ parent_id });
          }
        })
        .orderBy(sortBy, sortOrder);

      const offset = (page - 1) * limit;

      const [count, events] = await Promise.all([
        this.db(this.tableName).count("id as total").first(),
        query.limit(limit).offset(offset),
      ]);

      return {
        data: events,
        pagination: {
          page,
          limit,
          total: parseInt(count.total),
          totalPages: Math.ceil(count.total / limit),
        },
      };
    } catch (error) {
      throw this._handleError(error, "getEvents", { options });
    }
  }

  /**
   * Update an event
   * @param {string|number} id
   * @param {Object} updateData
   * @returns {Promise<Object>} Updated event
   */
  async updateEvent(id, updateData) {
    const trx = await this.db.transaction();

    try {
      const oldEvent = await trx(this.tableName).where({ id }).first();

      if (!oldEvent) {
        throw new AppError(
          ErrorTypes.NOT_FOUND,
          this.serviceName,
          "updateEvent",
          {
            resource: "Event",
            id: id,
            updateAttempted: true,
          }
        );
      }

      const [event] = await trx(this.tableName)
        .where({ id })
        .update(updateData)
        .returning("*");

      // Create audit log entry
      await this._createAuditLog(trx, id, "UPDATE", oldEvent, event, updateData.user_id);

      await trx.commit();
      return event;
    } catch (error) {
      await trx.rollback();
      throw this._handleError(error, "updateEvent", { id, updateData });
    }
  }

  /**
   * Delete an event
   * @param {string|number} id
   * @returns {Promise<boolean>} Success status
   */
  async deleteEvent(id) {
    const trx = await this.db.transaction();

    try {
      const event = await trx(this.tableName).where({ id }).first();

      if (!event) {
        throw new AppError(
          ErrorTypes.NOT_FOUND,
          this.serviceName,
          "deleteEvent",
          {
            resource: "Event",
            id: id,
            deleteAttempted: true,
          }
        );
      }

      // Create audit log entry before deletion
      await this._createAuditLog(trx, id, "DELETE", event, null, event.user_id);

      await trx(this.tableName).where({ id }).delete();

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw this._handleError(error, "deleteEvent", { id });
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
        .whereBetween("start_date", [startDate, endDate])
        .orderBy("start_date", "asc");
    } catch (error) {
      throw this._handleError(error, "getEventsByDateRange", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
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
        .orderBy("created_at", "desc");
    } catch (error) {
      throw this._handleError(error, "getEventsByType", { type, options });
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
        .where("title", "like", `%${query}%`)
        .orWhere("description", "like", `%${query}%`)
        .orderBy("created_at", "desc");
    } catch (error) {
      throw this._handleError(error, "searchEvents", { query });
    }
  }

  /**
   * Create an audit log entry
   * @private
   * @param {Object} trx Transaction object
   * @param {string|number} eventId
   * @param {string} action
   * @param {Object} oldData
   * @param {Object} newData
   * @param {string|number} userId
   * @returns {Promise<Object>} Created audit log entry
   */
  async _createAuditLog(trx, eventId, action, oldData, newData, userId) {
    const auditEntry = {
      event_id: eventId,
      action,
      old_data: oldData ? JSON.stringify(oldData) : null,
      new_data: newData ? JSON.stringify(newData) : null,
      user_id: userId,
      created_at: new Date()
    };

    const [entry] = await trx('event_audit_log')
      .insert(auditEntry)
      .returning('*');

    return entry;
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
    if (error.code === "23505") {
      return new AppError(
        ErrorTypes.DUPLICATE_ENTRY,
        this.serviceName,
        method,
        {
          error: error.detail,
          constraint: error.constraint,
          ...details,
        }
      );
    }

    if (error.code === "23503") {
      return new AppError(
        ErrorTypes.VALIDATION_ERROR,
        this.serviceName,
        method,
        {
          message: "Referenced record does not exist",
          error: error.detail,
          constraint: error.constraint,
          ...details,
        }
      );
    }

    // Handle general database errors
    return new AppError(ErrorTypes.DB_ERROR, this.serviceName, method, {
      message: error.message,
      code: error.code,
      ...details,
    });
  }
}

// Export a singleton instance
const eventService = new EventService();
module.exports = eventService;