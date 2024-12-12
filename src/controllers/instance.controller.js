// src/controllers/instance.controller.js
const InstanceService = require('../services/InstanceService');
const AppError = require('../utils/AppError');

class InstanceController {
  constructor() {
    this.instanceService = new InstanceService();
  }

  async list(page, limit, filters) {
    try {
      return await this.instanceService.list(page, limit, filters);
    } catch (error) {
      throw new AppError(500, 'INSTANCE_LIST_ERROR', 'Error retrieving instances', error);
    }
  }

  async getById(id) {
    try {
      const instance = await this.instanceService.getById(id);
      if (!instance) {
        throw new AppError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');
      }
      return instance;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'INSTANCE_FETCH_ERROR', 'Error retrieving instance', error);
    }
  }

  async create(instanceData) {
    try {
      return await this.instanceService.create(instanceData);
    } catch (error) {
      throw new AppError(500, 'INSTANCE_CREATE_ERROR', 'Error creating instance', error);
    }
  }

  async update(id, instanceData, userId) {
    try {
      // Check if user has permission to update this instance
      const instance = await this.instanceService.getById(id);
      if (!instance) {
        throw new AppError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');
      }

      if (instance.createdBy !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Not authorized to update this instance');
      }

      return await this.instanceService.update(id, instanceData);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'INSTANCE_UPDATE_ERROR', 'Error updating instance', error);
    }
  }

  async delete(id, userId) {
    try {
      // Check if user has permission to delete this instance
      const instance = await this.instanceService.getById(id);
      if (!instance) {
        throw new AppError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');
      }

      if (instance.createdBy !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Not authorized to delete this instance');
      }

      return await this.instanceService.delete(id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'INSTANCE_DELETE_ERROR', 'Error deleting instance', error);
    }
  }

  async archive(id, userId) {
    try {
      // Check if user has permission to archive this instance
      const instance = await this.instanceService.getById(id);
      if (!instance) {
        throw new AppError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');
      }

      if (instance.createdBy !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Not authorized to archive this instance');
      }

      return await this.instanceService.archive(id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'INSTANCE_ARCHIVE_ERROR', 'Error archiving instance', error);
    }
  }

  async restore(id, userId) {
    try {
      // Check if user has permission to restore this instance
      const instance = await this.instanceService.getById(id);
      if (!instance) {
        throw new AppError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');
      }

      if (instance.createdBy !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Not authorized to restore this instance');
      }

      return await this.instanceService.restore(id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'INSTANCE_RESTORE_ERROR', 'Error restoring instance', error);
    }
  }
}

module.exports = InstanceController;
