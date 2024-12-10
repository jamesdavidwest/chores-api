const DatabaseService = require('./DatabaseService');
const { addDays, parseISO, isValid } = require('date-fns');

class TaskService extends DatabaseService {
    constructor() {
        super();
    }

    async getTasks({ startDate = null, endDate = null, userId = null, includeInstances = true } = {}) {
        try {
            let sql = `
                SELECT 
                    t.*,
                    l.name as location_name,
                    c.name as category_name,
                    ft.name as frequency_name,
                    u.name as assigned_to_name
                FROM tasks t
                LEFT JOIN locations l ON t.location_id = l.id
                LEFT JOIN categories c ON t.category_id = c.id
                LEFT JOIN frequency_types ft ON t.frequency_id = ft.id
                LEFT JOIN users u ON t.assigned_to = u.id
                WHERE t.is_active = TRUE
            `;

            const params = [];

            if (userId) {
                sql += ' AND t.assigned_to = ?';
                params.push(userId);
            }

            const tasks = await this.all(sql, params);

            if (includeInstances) {
                for (const task of tasks) {
                    let instanceSql = `
                        SELECT * FROM task_instances
                        WHERE task_id = ?
                    `;
                    const instanceParams = [task.id];

                    if (startDate && isValid(parseISO(startDate))) {
                        instanceSql += ' AND due_date >= ?';
                        instanceParams.push(startDate);
                    }

                    if (endDate && isValid(parseISO(endDate))) {
                        instanceSql += ' AND due_date <= ?';
                        instanceParams.push(endDate);
                    }

                    instanceSql += ' ORDER BY due_date, due_time';
                    task.instances = await this.all(instanceSql, instanceParams);
                }
            }

            return tasks;
        } catch (error) {
            console.error('Error in getTasks:', error);
            throw error;
        }
    }

    async getTaskById(id) {
        try {
            const sql = `
                SELECT 
                    t.*,
                    l.name as location_name,
                    c.name as category_name,
                    ft.name as frequency_name,
                    u.name as assigned_to_name
                FROM tasks t
                LEFT JOIN locations l ON t.location_id = l.id
                LEFT JOIN categories c ON t.category_id = c.id
                LEFT JOIN frequency_types ft ON t.frequency_id = ft.id
                LEFT JOIN users u ON t.assigned_to = u.id
                WHERE t.id = ? AND t.is_active = TRUE
            `;

            const task = await this.get(sql, [id]);
            if (!task) return null;

            // Get instances for this task
            task.instances = await this.all(
                'SELECT * FROM task_instances WHERE task_id = ? ORDER BY due_date, due_time',
                [id]
            );

            return task;
        } catch (error) {
            console.error('Error in getTaskById:', error);
            throw error;
        }
    }

    async createTask(taskData) {
        return this.withTransaction(async () => {
            try {
                const { name, location_id, category_id, frequency_id, assigned_to, 
                        priority = 2, estimated_duration = null, points_value = 0,
                        time_preference = '09:00:00', notes = null } = taskData;

                const result = await this.run(`
                    INSERT INTO tasks (
                        name, location_id, category_id, frequency_id, assigned_to,
                        priority, estimated_duration, points_value, time_preference, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [name, location_id, category_id, frequency_id, assigned_to,
                    priority, estimated_duration, points_value, time_preference, notes]);

                if (result.id) {
                    // Generate initial instances based on frequency
                    await this.generateInstances(result.id);
                    return this.getTaskById(result.id);
                }
                throw new Error('Failed to create task');
            } catch (error) {
                console.error('Error in createTask:', error);
                throw error;
            }
        });
    }

    async updateTask(id, updates) {
        return this.withTransaction(async () => {
            try {
                const fields = [];
                const values = [];
                
                // Build dynamic update query based on provided fields
                Object.entries(updates).forEach(([key, value]) => {
                    if (value !== undefined && !key.includes('instances')) {
                        fields.push(`${key} = ?`);
                        values.push(value);
                    }
                });

                if (fields.length === 0) return null;

                values.push(id); // for WHERE clause
                const sql = `
                    UPDATE tasks 
                    SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ? AND is_active = TRUE
                `;

                const result = await this.run(sql, values);
                if (result.changes === 0) return null;

                // If frequency changed, regenerate future instances
                if (updates.frequency_id) {
                    await this.regenerateInstances(id);
                }

                return this.getTaskById(id);
            } catch (error) {
                console.error('Error in updateTask:', error);
                throw error;
            }
        });
    }

    async deleteTask(id) {
        return this.withTransaction(async () => {
            try {
                // Soft delete the task
                const result = await this.run(
                    'UPDATE tasks SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [id]
                );

                // Soft delete related instances
                await this.run(`
                    UPDATE task_instances 
                    SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
                    WHERE task_id = ? AND status = 'pending'
                `, [id]);

                return result.changes > 0;
            } catch (error) {
                console.error('Error in deleteTask:', error);
                throw error;
            }
        });
    }

    async updateInstance(instanceId, updates) {
        try {
            const fields = [];
            const values = [];
            
            Object.entries(updates).forEach(([key, value]) => {
                if (value !== undefined) {
                    fields.push(`${key} = ?`);
                    values.push(value);
                }
            });

            if (fields.length === 0) return null;

            values.push(instanceId);
            const sql = `
                UPDATE task_instances 
                SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `;

            const result = await this.run(sql, values);
            if (result.changes === 0) return null;

            return this.get('SELECT * FROM task_instances WHERE id = ?', [instanceId]);
        } catch (error) {
            console.error('Error in updateInstance:', error);
            throw error;
        }
    }

    async generateInstances(taskId, startDate = new Date(), daysToGenerate = 30) {
        try {
            const task = await this.get(
                'SELECT * FROM tasks WHERE id = ? AND is_active = TRUE',
                [taskId]
            );
            if (!task) throw new Error('Task not found');

            const frequency = await this.get(
                'SELECT * FROM frequency_types WHERE id = ?',
                [task.frequency_id]
            );
            if (!frequency) throw new Error('Invalid frequency type');

            // Calculate interval in days
            const intervalMap = {
                'once': null,
                'daily': 1,
                'weekly': 7,
                'biweekly': 14,
                'monthly': 30,
                'quarterly': 90,
                'yearly': 365
            };

            const interval = intervalMap[frequency.name];
            if (!interval) return; // 'once' frequency doesn't generate recurring instances

            const instances = [];
            let currentDate = new Date(startDate);
            const endDate = addDays(startDate, daysToGenerate);

            while (currentDate <= endDate) {
                instances.push({
                    task_id: taskId,
                    due_date: currentDate.toISOString().split('T')[0],
                    due_time: task.time_preference
                });
                currentDate = addDays(currentDate, interval);
            }

            // Insert instances
            for (const instance of instances) {
                await this.run(`
                    INSERT INTO task_instances (task_id, due_date, due_time)
                    VALUES (?, ?, ?)
                `, [instance.task_id, instance.due_date, instance.due_time]);
            }

            // Record the generated range
            await this.run(`
                INSERT INTO instance_ranges (task_id, start_date, end_date, generated_count)
                VALUES (?, ?, ?, ?)
            `, [taskId, startDate.toISOString().split('T')[0], 
                endDate.toISOString().split('T')[0], instances.length]);

        } catch (error) {
            console.error('Error in generateInstances:', error);
            throw error;
        }
    }

    async regenerateInstances(taskId) {
        return this.withTransaction(async () => {
            try {
                // Delete future pending instances
                await this.run(`
                    DELETE FROM task_instances 
                    WHERE task_id = ? 
                    AND status = 'pending' 
                    AND due_date >= date('now')
                `, [taskId]);

                // Generate new instances
                await this.generateInstances(taskId);
            } catch (error) {
                console.error('Error in regenerateInstances:', error);
                throw error;
            }
        });
    }
}

module.exports = TaskService;