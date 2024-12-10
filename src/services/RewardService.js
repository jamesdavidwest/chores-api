const DatabaseService = require('./DatabaseService');

class RewardService extends DatabaseService {
    constructor() {
        super();
    }

    async getRewards(options = {}) {
        try {
            let sql = `
                SELECT 
                    r.*,
                    (SELECT COUNT(*) FROM point_transactions 
                     WHERE reward_id = r.id) as times_redeemed
                FROM rewards r
                WHERE r.is_active = TRUE
            `;

            const params = [];

            if (options.minPoints) {
                sql += ' AND r.points_cost <= ?';
                params.push(options.minPoints);
            }

            if (options.searchTerm) {
                sql += ' AND (r.name LIKE ? OR r.description LIKE ?)';
                const searchPattern = `%${options.searchTerm}%`;
                params.push(searchPattern, searchPattern);
            }

            sql += ' ORDER BY r.points_cost';

            return await this.all(sql, params);
        } catch (error) {
            console.error('Error in getRewards:', error);
            throw error;
        }
    }

    async getRewardById(id) {
        try {
            const sql = `
                SELECT 
                    r.*,
                    (SELECT COUNT(*) FROM point_transactions 
                     WHERE reward_id = r.id) as times_redeemed,
                    (SELECT COUNT(DISTINCT user_id) FROM point_transactions 
                     WHERE reward_id = r.id) as unique_users_redeemed
                FROM rewards r
                WHERE r.id = ? AND r.is_active = TRUE
            `;

            return await this.get(sql, [id]);
        } catch (error) {
            console.error('Error in getRewardById:', error);
            throw error;
        }
    }

    async createReward(rewardData) {
        try {
            const { 
                name, description = null,
                points_cost
            } = rewardData;

            const result = await this.run(`
                INSERT INTO rewards (
                    name, description, points_cost
                ) VALUES (?, ?, ?)
            `, [name, description, points_cost]);

            if (!result.id) throw new Error('Failed to create reward');

            return this.getRewardById(result.id);
        } catch (error) {
            console.error('Error in createReward:', error);
            throw error;
        }
    }

    async updateReward(id, updates) {
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

            values.push(id);
            const sql = `
                UPDATE rewards 
                SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ? AND is_active = TRUE
            `;

            const result = await this.run(sql, values);
            if (result.changes === 0) return null;

            return this.getRewardById(id);
        } catch (error) {
            console.error('Error in updateReward:', error);
            throw error;
        }
    }

    async deleteReward(id) {
        try {
            const result = await this.run(
                'UPDATE rewards SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [id]
            );

            return result.changes > 0;
        } catch (error) {
            console.error('Error in deleteReward:', error);
            throw error;
        }
    }

    async redeemReward(userId, rewardId) {
        return this.withTransaction(async () => {
            try {
                // Get reward details
                const reward = await this.getRewardById(rewardId);
                if (!reward) throw new Error('Reward not found');

                // Get user's current points
                const user = await this.get(
                    'SELECT points_balance FROM users WHERE id = ? AND is_active = TRUE',
                    [userId]
                );
                if (!user) throw new Error('User not found');

                // Check if user has enough points
                if (user.points_balance < reward.points_cost) {
                    throw new Error('Insufficient points');
                }

                // Deduct points from user
                await this.run(`
                    UPDATE users 
                    SET points_balance = points_balance - ?,
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `, [reward.points_cost, userId]);

                // Record the transaction
                const result = await this.run(`
                    INSERT INTO point_transactions (
                        user_id, transaction_type, points_amount,
                        reward_id, notes
                    ) VALUES (?, 'spent', ?, ?, ?)
                `, [
                    userId,
                    reward.points_cost,
                    rewardId,
                    `Redeemed reward: ${reward.name}`
                ]);

                return {
                    transactionId: result.id,
                    reward,
                    pointsSpent: reward.points_cost,
                    newBalance: user.points_balance - reward.points_cost
                };
            } catch (error) {
                console.error('Error in redeemReward:', error);
                throw error;
            }
        });
    }

    async getUserTransactions(userId, options = {}) {
        try {
            let sql = `
                SELECT 
                    pt.*,
                    r.name as reward_name,
                    t.name as task_name,
                    ti.due_date as task_due_date
                FROM point_transactions pt
                LEFT JOIN rewards r ON pt.reward_id = r.id
                LEFT JOIN task_instances ti ON pt.task_instance_id = ti.id
                LEFT JOIN tasks t ON ti.task_id = t.id
                WHERE pt.user_id = ?
            `;

            const params = [userId];

            if (options.type) {
                sql += ' AND pt.transaction_type = ?';
                params.push(options.type);
            }

            if (options.startDate) {
                sql += ' AND pt.created_at >= ?';
                params.push(options.startDate);
            }

            if (options.endDate) {
                sql += ' AND pt.created_at <= ?';
                params.push(options.endDate);
            }

            sql += ' ORDER BY pt.created_at DESC';

            if (options.limit) {
                sql += ' LIMIT ?';
                params.push(options.limit);
            }

            return await this.all(sql, params);
        } catch (error) {
            console.error('Error in getUserTransactions:', error);
            throw error;
        }
    }

    async getUserStats(userId) {
        try {
            return await this.get(`
                SELECT 
                    u.points_balance as current_balance,
                    (SELECT SUM(points_amount) FROM point_transactions 
                     WHERE user_id = ? AND transaction_type = 'earned') as total_earned,
                    (SELECT SUM(points_amount) FROM point_transactions 
                     WHERE user_id = ? AND transaction_type = 'spent') as total_spent,
                    (SELECT COUNT(*) FROM point_transactions 
                     WHERE user_id = ? AND reward_id IS NOT NULL) as rewards_redeemed,
                    (SELECT COUNT(*) FROM task_instances 
                     WHERE completed_by = ? AND status = 'completed') as tasks_completed
                FROM users u
                WHERE u.id = ?
            `, [userId, userId, userId, userId, userId]);
        } catch (error) {
            console.error('Error in getUserStats:', error);
            throw error;
        }
    }
}

module.exports = RewardService;