const DatabaseService = require('./DatabaseService');
const { addMinutes, isAfter } = require('date-fns');

class NotificationService extends DatabaseService {
    constructor() {
        super();
    }

    async getNotifications(options = {}) {
        try {
            let sql = `
                SELECT 
                    n.*,
                    u.name as user_name,
                    u.email as user_email,
                    up.notification_methods
                FROM notifications n
                JOIN users u ON n.user_id = u.id
                LEFT JOIN user_profiles up ON u.id = up.user_id
                WHERE 1=1
            `;

            const params = [];

            if (options.userId) {
                sql += ' AND n.user_id = ?';
                params.push(options.userId);
            }

            if (options.status) {
                sql += ' AND n.status = ?';
                params.push(options.status);
            }

            if (options.type) {
                sql += ' AND n.type = ?';
                params.push(options.type);
            }

            if (options.unreadOnly) {
                sql += ' AND n.read_at IS NULL';
            }

            sql += ' ORDER BY n.created_at DESC';

            if (options.limit) {
                sql += ' LIMIT ?';
                params.push(options.limit);
            }

            return await this.all(sql, params);
        } catch (error) {
            console.error('Error in getNotifications:', error);
            throw error;
        }
    }

    async createNotification(notificationData) {
        try {
            const {
                user_id, type, title, message,
                scheduled_for = null
            } = notificationData;

            const result = await this.run(`
                INSERT INTO notifications (
                    user_id, type, title, message,
                    scheduled_for, status
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                user_id, type, title, message,
                scheduled_for,
                scheduled_for ? 'pending' : 'sent'
            ]);

            if (!result.id) throw new Error('Failed to create notification');

            return this.get(
                'SELECT * FROM notifications WHERE id = ?',
                [result.id]
            );
        } catch (error) {
            console.error('Error in createNotification:', error);
            throw error;
        }
    }

    async createTaskNotification(taskInstanceId, type) {
        return this.withTransaction(async () => {
            try {
                // Get task instance details
                const taskInstance = await this.get(`
                    SELECT 
                        ti.*, t.name as task_name,
                        t.assigned_to as user_id,
                        t.reminder_before
                    FROM task_instances ti
                    JOIN tasks t ON ti.task_id = t.id
                    WHERE ti.id = ?
                `, [taskInstanceId]);

                if (!taskInstance) throw new Error('Task instance not found');

                let title, message, scheduledFor;

                switch (type) {
                    case 'reminder':
                        title = `Reminder: ${taskInstance.task_name}`;
                        message = `Your task "${taskInstance.task_name}" is due soon.`;
                        if (taskInstance.reminder_before) {
                            scheduledFor = addMinutes(
                                new Date(`${taskInstance.due_date}T${taskInstance.due_time}`),
                                -taskInstance.reminder_before
                            );
                        }
                        break;
                    case 'completion':
                        title = `Task Completed: ${taskInstance.task_name}`;
                        message = `The task "${taskInstance.task_name}" has been marked as complete.`;
                        break;
                    case 'verification':
                        title = `Verification Needed: ${taskInstance.task_name}`;
                        message = `Please verify completion of task "${taskInstance.task_name}".`;
                        break;
                }

                return await this.createNotification({
                    user_id: taskInstance.user_id,
                    type,
                    title,
                    message,
                    scheduled_for: scheduledFor
                });
            } catch (error) {
                console.error('Error in createTaskNotification:', error);
                throw error;
            }
        });
    }

    async markAsRead(notificationId, userId) {
        try {
            const result = await this.run(`
                UPDATE notifications 
                SET status = 'read',
                    read_at = CURRENT_TIMESTAMP 
                WHERE id = ? AND user_id = ?
            `, [notificationId, userId]);

            return result.changes > 0;
        } catch (error) {
            console.error('Error in markAsRead:', error);
            throw error;
        }
    }

    async markAllAsRead(userId) {
        try {
            const result = await this.run(`
                UPDATE notifications 
                SET status = 'read',
                    read_at = CURRENT_TIMESTAMP 
                WHERE user_id = ? AND read_at IS NULL
            `, [userId]);

            return result.changes;
        } catch (error) {
            console.error('Error in markAllAsRead:', error);
            throw error;
        }
    }

    async deleteNotification(notificationId, userId) {
        try {
            const result = await this.run(
                'DELETE FROM notifications WHERE id = ? AND user_id = ?',
                [notificationId, userId]
            );

            return result.changes > 0;
        } catch (error) {
            console.error('Error in deleteNotification:', error);
            throw error;
        }
    }

    async processScheduledNotifications() {
        return this.withTransaction(async () => {
            try {
                const now = new Date();
                
                // Get all pending notifications that are due
                const notifications = await this.all(`
                    SELECT * FROM notifications 
                    WHERE status = 'pending' 
                    AND scheduled_for IS NOT NULL 
                    AND datetime(scheduled_for) <= datetime('now')
                `);

                for (const notification of notifications) {
                    // Update status to sent
                    await this.run(`
                        UPDATE notifications 
                        SET status = 'sent',
                            sent_at = CURRENT_TIMESTAMP 
                        WHERE id = ?
                    `, [notification.id]);
                }

                return notifications;
            } catch (error) {
                console.error('Error in processScheduledNotifications:', error);
                throw error;
            }
        });
    }

    async getUserNotificationPreferences(userId) {
        try {
            return await this.get(`
                SELECT 
                    up.notification_methods,
                    up.preferred_notification_time,
                    u.timezone
                FROM user_profiles up
                JOIN users u ON up.user_id = u.id
                WHERE up.user_id = ?
            `, [userId]);
        } catch (error) {
            console.error('Error in getUserNotificationPreferences:', error);
            throw error;
        }
    }
}

module.exports = NotificationService;