const DatabaseService = require('./DatabaseService');
const { 
    addDays, 
    addWeeks, 
    addMonths, 
    addQuarters,
    addYears,
    parseISO,
    isValid,
    startOfDay,
    endOfDay
} = require('date-fns');

class CalendarService extends DatabaseService {
    constructor() {
        super();
    }

    async getCalendarEvents(options = {}) {
        try {
            let sql = `
                SELECT 
                    ti.id as instance_id,
                    ti.due_date,
                    ti.due_time,
                    ti.status,
                    ti.completed_at,
                    ti.completed_by,
                    t.id as task_id,
                    t.name as task_name,
                    t.frequency_id,
                    t.category_id,
                    t.location_id,
                    t.assigned_to,
                    t.priority,
                    t.estimated_duration,
                    t.points_value,
                    c.name as category_name,
                    c.color_code as category_color,
                    l.name as location_name,
                    u1.name as assigned_to_name,
                    u2.name as completed_by_name,
                    ft.name as frequency_name
                FROM task_instances ti
                JOIN tasks t ON ti.task_id = t.id
                JOIN categories c ON t.category_id = c.id
                JOIN locations l ON t.location_id = l.id
                JOIN users u1 ON t.assigned_to = u1.id
                LEFT JOIN users u2 ON ti.completed_by = u2.id
                JOIN frequency_types ft ON t.frequency_id = ft.id
                WHERE t.is_active = TRUE
            `;

            const params = [];

            if (options.startDate) {
                sql += ' AND ti.due_date >= ?';
                params.push(options.startDate);
            }

            if (options.endDate) {
                sql += ' AND ti.due_date <= ?';
                params.push(options.endDate);
            }

            if (options.userId) {
                sql += ' AND t.assigned_to = ?';
                params.push(options.userId);
            }

            if (options.categoryId) {
                sql += ' AND t.category_id = ?';
                params.push(options.categoryId);
            }

            if (options.locationId) {
                sql += ' AND t.location_id = ?';
                params.push(options.locationId);
            }

            if (options.status) {
                sql += ' AND ti.status = ?';
                params.push(options.status);
            }

            sql += ' ORDER BY ti.due_date, ti.due_time';

            return await this.all(sql, params);
        } catch (error) {
            console.error('Error in getCalendarEvents:', error);
            throw error;
        }
    }

    async generateInstances(taskId, startDate, endDate) {
        return this.withTransaction(async () => {
            try {
                // Get task details
                const task = await this.get(`
                    SELECT t.*, ft.name as frequency_name
                    FROM tasks t
                    JOIN frequency_types ft ON t.frequency_id = ft.id
                    WHERE t.id = ? AND t.is_active = TRUE
                `, [taskId]);

                if (!task) throw new Error('Task not found');

                // Check if range already generated
                const existingRange = await this.get(`
                    SELECT * FROM instance_ranges
                    WHERE task_id = ?
                    AND (
                        (start_date <= ? AND end_date >= ?) OR
                        (start_date <= ? AND end_date >= ?) OR
                        (start_date >= ? AND end_date <= ?)
                    )
                `, [taskId, startDate, startDate, endDate, endDate, startDate, endDate]);

                if (existingRange) {
                    throw new Error('Date range overlaps with existing instances');
                }

                const instances = [];
                let currentDate = new Date(startDate);
                const targetEndDate = new Date(endDate);

                // Generate instances based on frequency
                while (currentDate <= targetEndDate) {
                    const dueDate = currentDate.toISOString().split('T')[0];

                    instances.push({
                        task_id: taskId,
                        due_date: dueDate,
                        due_time: task.time_preference
                    });

                    // Calculate next date based on frequency
                    switch (task.frequency_name) {
                        case 'daily':
                            currentDate = addDays(currentDate, 1);
                            break;
                        case 'weekly':
                            currentDate = addWeeks(currentDate, 1);
                            break;
                        case 'biweekly':
                            currentDate = addWeeks(currentDate, 2);
                            break;
                        case 'monthly':
                            currentDate = addMonths(currentDate, 1);
                            break;
                        case 'quarterly':
                            currentDate = addQuarters(currentDate, 1);
                            break;
                        case 'yearly':
                            currentDate = addYears(currentDate, 1);
                            break;
                        case 'once':
                            currentDate = addYears(targetEndDate, 1); // Break the loop
                            break;
                    }
                }

                // Insert instances
                for (const instance of instances) {
                    await this.run(`
                        INSERT INTO task_instances (
                            task_id, due_date, due_time
                        ) VALUES (?, ?, ?)
                    `, [instance.task_id, instance.due_date, instance.due_time]);
                }

                // Record the range
                await this.run(`
                    INSERT INTO instance_ranges (
                        task_id, start_date, end_date, generated_count
                    ) VALUES (?, ?, ?, ?)
                `, [taskId, startDate, endDate, instances.length]);

                return instances;
            } catch (error) {
                console.error('Error in generateInstances:', error);
                throw error;
            }
        });
    }

    async moveInstance(instanceId, newDate, newTime = null) {
        return this.withTransaction(async () => {
            try {
                const instance = await this.get(
                    'SELECT * FROM task_instances WHERE id = ?',
                    [instanceId]
                );

                if (!instance) throw new Error('Instance not found');

                const result = await this.run(`
                    UPDATE task_instances 
                    SET due_date = ?,
                        due_time = ?,
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `, [newDate, newTime || instance.due_time, instanceId]);

                if (result.changes === 0) return null;

                return this.get(
                    'SELECT * FROM task_instances WHERE id = ?',
                    [instanceId]
                );
            } catch (error) {
                console.error('Error in moveInstance:', error);
                throw error;
            }
        });
    }

    async getDailySchedule(date, userId = null) {
        try {
            let sql = `
                SELECT 
                    ti.*,
                    t.name as task_name,
                    t.estimated_duration,
                    t.points_value,
                    c.name as category_name,
                    c.color_code as category_color,
                    l.name as location_name
                FROM task_instances ti
                JOIN tasks t ON ti.task_id = t.id
                JOIN categories c ON t.category_id = c.id
                JOIN locations l ON t.location_id = l.id
                WHERE ti.due_date = ?
                AND t.is_active = TRUE
            `;

            const params = [date];

            if (userId) {
                sql += ' AND t.assigned_to = ?';
                params.push(userId);
            }

            sql += ' ORDER BY ti.due_time';

            return await this.all(sql, params);
        } catch (error) {
            console.error('Error in getDailySchedule:', error);
            throw error;
        }
    }

    async getWeeklySchedule(startDate, userId = null) {
        try {
            const endDate = addDays(new Date(startDate), 6)
                .toISOString()
                .split('T')[0];

            let sql = `
                SELECT 
                    ti.*,
                    t.name as task_name,
                    t.estimated_duration,
                    t.points_value,
                    c.name as category_name,
                    c.color_code as category_color,
                    l.name as location_name
                FROM task_instances ti
                JOIN tasks t ON ti.task_id = t.id
                JOIN categories c ON t.category_id = c.id
                JOIN locations l ON t.location_id = l.id
                WHERE ti.due_date BETWEEN ? AND ?
                AND t.is_active = TRUE
            `;

            const params = [startDate, endDate];

            if (userId) {
                sql += ' AND t.assigned_to = ?';
                params.push(userId);
            }

            sql += ' ORDER BY ti.due_date, ti.due_time';

            return await this.all(sql, params);
        } catch (error) {
            console.error('Error in getWeeklySchedule:', error);
            throw error;
        }
    }

    async getUpcomingTasks(userId, days = 7) {
        try {
            const endDate = addDays(new Date(), days)
                .toISOString()
                .split('T')[0];

            const sql = `
                SELECT 
                    ti.*,
                    t.name as task_name,
                    t.estimated_duration,
                    t.points_value,
                    c.name as category_name,
                    l.name as location_name
                FROM task_instances ti
                JOIN tasks t ON ti.task_id = t.id
                JOIN categories c ON t.category_id = c.id
                JOIN locations l ON t.location_id = l.id
                WHERE t.assigned_to = ?
                AND ti.due_date <= ?
                AND ti.status = 'pending'
                AND t.is_active = TRUE
                ORDER BY ti.due_date, ti.due_time
            `;

            return await this.all(sql, [userId, endDate]);
        } catch (error) {
            console.error('Error in getUpcomingTasks:', error);
            throw error;
        }
    }

    async getTaskConflicts(date, timeSlot, userId) {
        try {
            // Get tasks within 30 minutes before and after the time slot
            const [hours, minutes] = timeSlot.split(':');
            const timeSlotDate = new Date(date);
            timeSlotDate.setHours(parseInt(hours), parseInt(minutes));

            const beforeTime = addMinutes(timeSlotDate, -30)
                .toISOString()
                .split('T')[1]
                .substr(0, 8);
            const afterTime = addMinutes(timeSlotDate, 30)
                .toISOString()
                .split('T')[1]
                .substr(0, 8);

            const sql = `
                SELECT 
                    ti.*,
                    t.name as task_name,
                    t.estimated_duration
                FROM task_instances ti
                JOIN tasks t ON ti.task_id = t.id
                WHERE ti.due_date = ?
                AND ti.due_time BETWEEN ? AND ?
                AND t.assigned_to = ?
                AND ti.status = 'pending'
                AND t.is_active = TRUE
            `;

            return await this.all(sql, [date, beforeTime, afterTime, userId]);
        } catch (error) {
            console.error('Error in getTaskConflicts:', error);
            throw error;
        }
    }
}

module.exports = CalendarService;