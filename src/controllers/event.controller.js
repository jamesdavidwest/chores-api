// src/controllers/event.controller.js
const EventService = require('../services/EventService');
const AppError = require('../utils/AppError');

class EventController {
  constructor() {
    this.eventService = new EventService();
  }

  async list(page, limit, filters) {
    try {
      return await this.eventService.list(page, limit, filters);
    } catch (error) {
      throw new AppError(500, 'EVENT_LIST_ERROR', 'Error retrieving events', error);
    }
  }

  async getById(id) {
    try {
      const event = await this.eventService.getById(id);
      if (!event) {
        throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found');
      }
      return event;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'EVENT_FETCH_ERROR', 'Error retrieving event', error);
    }
  }

  async create(eventData) {
    try {
      return await this.eventService.create(eventData);
    } catch (error) {
      throw new AppError(500, 'EVENT_CREATE_ERROR', 'Error creating event', error);
    }
  }

  async update(id, eventData) {
    try {
      const event = await this.eventService.update(id, eventData);
      if (!event) {
        throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found');
      }
      return event;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'EVENT_UPDATE_ERROR', 'Error updating event', error);
    }
  }

  async delete(id) {
    try {
      const result = await this.eventService.delete(id);
      if (!result) {
        throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found');
      }
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'EVENT_DELETE_ERROR', 'Error deleting event', error);
    }
  }
}

module.exports = EventController;
