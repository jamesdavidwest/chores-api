const db = require('../data/database');

class InstanceService {
  async generateInstances(startDate, endDate, choreId = null) {
    try {
      // Record the generation range
      const [rangeId] = await db('instance_ranges').insert({
        start_date: startDate,
        end_date: endDate
      });

      // Get chores to generate instances for
      const query = db('chores').where('active', true);
      if (choreId) {
        query.where('id', choreId);
      }
      const chores = await query;

      // Generate instances for each chore
      for (const chore of chores) {
        await this.generateChoreInstances(chore, startDate, endDate);
      }

      return { success: true, rangeId };
    } catch (error) {
      console.error('Error generating instances:', error);
      throw error;
    }
  }

  async generateChoreInstances(chore, startDate, endDate) {
    // Calculate due dates based on chore frequency
    const dueDates = this.calculateDueDates(chore, startDate, endDate);
    
    // Create instances
    const instances = dueDates.map(dueDate => ({
      chore_id: chore.id,
      due_date: dueDate,
      start_date: startDate,
      end_date: endDate,
      status: 'active',
      modified_history: JSON.stringify([]),
      skipped: false
    }));

    if (instances.length > 0) {
      await db('chore_instances').insert(instances);
    }
  }

  calculateDueDates(chore, startDate, endDate) {
    const dueDates = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      // Add logic here to calculate next due date based on chore.frequency
      // This is a placeholder - implement actual frequency calculation
      dueDates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 7); // Example: weekly
    }

    return dueDates;
  }

  async updateInstanceStatus(instanceId, status, modificationDetails = {}) {
    try {
      const instance = await db('chore_instances')
        .where('id', instanceId)
        .first();

      if (!instance) {
        throw new Error('Instance not found');
      }

      const modifiedHistory = JSON.parse(instance.modified_history || '[]');
      modifiedHistory.push({
        timestamp: new Date().toISOString(),
        status,
        ...modificationDetails
      });

      await db('chore_instances')
        .where('id', instanceId)
        .update({
          status,
          modified_history: JSON.stringify(modifiedHistory)
        });

      return { success: true };
    } catch (error) {
      console.error('Error updating instance status:', error);
      throw error;
    }
  }

  async skipInstance(instanceId, reason = '') {
    try {
      await db('chore_instances')
        .where('id', instanceId)
        .update({
          skipped: true,
          status: 'skipped'
        });

      await this.updateInstanceStatus(instanceId, 'skipped', { reason });
      return { success: true };
    } catch (error) {
      console.error('Error skipping instance:', error);
      throw error;
    }
  }

  async getInstancesByDateRange(startDate, endDate, choreId = null) {
    try {
      const query = db('chore_instances')
        .whereBetween('due_date', [startDate, endDate]);

      if (choreId) {
        query.where('chore_id', choreId);
      }

      return await query;
    } catch (error) {
      console.error('Error fetching instances:', error);
      throw error;
    }
  }

  async cleanupOldInstances(beforeDate) {
    try {
      await db('chore_instances')
        .where('due_date', '<', beforeDate)
        .delete();

      return { success: true };
    } catch (error) {
      console.error('Error cleaning up old instances:', error);
      throw error;
    }
  }
}

module.exports = new InstanceService();
