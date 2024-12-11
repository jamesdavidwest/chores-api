const DatabaseService = require('./DatabaseService');
const bcrypt = require('bcrypt');

class UserService extends DatabaseService {
    constructor() {
        super();
    }

    async validateCredentials(email, password) {
        try {
            console.log('Validating credentials for:', email);
            
            // Try to find user by email or username (name)
            const user = await this.get(
                'SELECT * FROM users WHERE (email = ? OR name = ?) AND is_active = TRUE',
                [email, email]
            );

            if (!user) {
                console.log('No user found with email/username:', email);
                return null;
            }

            console.log('Found user:', user.name);

            // For development/testing, if password is 'password', skip hash check
            if (process.env.NODE_ENV === 'development' && password === 'password') {
                console.log('Development mode: accepting default password');
                delete user.password_hash;
                return user;
            }

            const isValid = await bcrypt.compare(password, user.password_hash);
            console.log('Password validation result:', isValid);

            if (!isValid) return null;

            delete user.password_hash;
            return user;
        } catch (error) {
            console.error('Error in validateCredentials:', error);
            throw error;
        }
    }

    async getUserById(id, includeStats = false) {
        try {
            console.log('Getting user by ID:', id);
            
            const sql = `
                SELECT * FROM users 
                WHERE id = ? AND is_active = TRUE
            `;

            const user = await this.get(sql, [id]);
            if (!user) {
                console.log('No user found with ID:', id);
                return null;
            }

            // Remove sensitive data
            delete user.password_hash;

            if (includeStats) {
                // Get tasks statistics
                const stats = await this.get(`
                    SELECT 
                        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
                        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks
                    FROM task_instances ti
                    JOIN tasks t ON ti.task_id = t.id
                    WHERE t.assigned_to = ?
                `, [id]);

                user.stats = stats || { completed_tasks: 0, pending_tasks: 0 };
            }

            console.log('User found:', {
                userId: user.id,
                userName: user.name,
                userRole: user.role
            });

            return user;
        } catch (error) {
            console.error('Error in getUserById:', error);
            throw error;
        }
    }

    async updateUser(id, updates) {
        try {
            const fields = [];
            const values = [];
            
            for (const [key, value] of Object.entries(updates)) {
                if (value !== undefined) {
                    // Hash password if it's being updated
                    if (key === 'password') {
                        const hashedPassword = await bcrypt.hash(value, 10);
                        fields.push('password_hash = ?');
                        values.push(hashedPassword);
                    } else {
                        fields.push(`${key} = ?`);
                        values.push(value);
                    }
                }
            }

            if (fields.length === 0) return null;

            values.push(id);
            const sql = `
                UPDATE users 
                SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ? AND is_active = TRUE
            `;

            const result = await this.run(sql, values);
            if (result.changes === 0) return null;

            return this.getUserById(id);
        } catch (error) {
            console.error('Error in updateUser:', error);
            throw error;
        }
    }

    async debugDatabase() {
        try {
            // Check if users table exists
            const tableCheck = await this.get(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='users';
            `);

            // Get all users (safely)
            const users = await this.all(`
                SELECT 
                    id, 
                    name, 
                    email, 
                    role, 
                    is_active,
                    created_at,
                    updated_at,
                    CASE 
                        WHEN password_hash IS NOT NULL THEN 'present'
                        ELSE 'missing'
                    END as password_status
                FROM users
            `);

            // Get table schema
            const schema = await this.get(`
                SELECT sql 
                FROM sqlite_master 
                WHERE type='table' AND name='users';
            `);

            return {
                tableExists: !!tableCheck,
                usersCount: users?.length,
                users: users,
                schema: schema?.sql,
                dbPath: this.dbPath
            };
        } catch (error) {
            console.error('Debug error:', error);
            throw error;
        }
    }

    async createUser(userData) {
        try {
            const {
                name, 
                email, 
                password,
                role = 'USER'
            } = userData;

            const hashedPassword = await bcrypt.hash(password, 10);

            const result = await this.run(`
                INSERT INTO users (
                    name, email, password_hash,
                    role, is_active
                ) VALUES (?, ?, ?, ?, TRUE)
            `, [name, email, hashedPassword, role]);

            if (!result.id) throw new Error('Failed to create user');

            return this.getUserById(result.id);
        } catch (error) {
            console.error('Error in createUser:', error);
            throw error;
        }
    }

    async deleteUser(id) {
        try {
            const result = await this.run(
                'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [id]
            );

            return result.changes > 0;
        } catch (error) {
            console.error('Error in deleteUser:', error);
            throw error;
        }
    }
}

module.exports = UserService;