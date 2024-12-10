const DatabaseService = require('./DatabaseService');

class CategoryService extends DatabaseService {
    constructor() {
        super();
    }

    async getCategories(options = {}) {
        try {
            let sql = `
                SELECT 
                    c.*,
                    parent.name as parent_name,
                    (SELECT COUNT(*) FROM tasks 
                     WHERE category_id = c.id AND is_active = TRUE) as active_tasks_count
                FROM categories c
                LEFT JOIN categories parent ON c.parent_category_id = parent.id
                WHERE c.is_active = TRUE
            `;

            const params = [];

            if (options.parentId) {
                sql += ' AND c.parent_category_id = ?';
                params.push(options.parentId);
            }

            if (options.searchTerm) {
                sql += ' AND c.name LIKE ?';
                params.push(`%${options.searchTerm}%`);
            }

            sql += ' ORDER BY c.name';

            return await this.all(sql, params);
        } catch (error) {
            console.error('Error in getCategories:', error);
            throw error;
        }
    }

    async getCategoryById(id) {
        try {
            const sql = `
                SELECT 
                    c.*,
                    parent.name as parent_name,
                    (SELECT COUNT(*) FROM tasks 
                     WHERE category_id = c.id AND is_active = TRUE) as active_tasks_count,
                    (SELECT COUNT(*) FROM task_instances ti
                     JOIN tasks t ON ti.task_id = t.id
                     WHERE t.category_id = c.id 
                     AND ti.status = 'pending') as pending_tasks_count
                FROM categories c
                LEFT JOIN categories parent ON c.parent_category_id = parent.id
                WHERE c.id = ? AND c.is_active = TRUE
            `;

            return await this.get(sql, [id]);
        } catch (error) {
            console.error('Error in getCategoryById:', error);
            throw error;
        }
    }

    async createCategory(categoryData) {
        try {
            const { 
                name, description = null, icon_name = null,
                color_code = null, parent_category_id = null
            } = categoryData;

            const result = await this.run(`
                INSERT INTO categories (
                    name, description, icon_name,
                    color_code, parent_category_id
                ) VALUES (?, ?, ?, ?, ?)
            `, [name, description, icon_name, color_code, parent_category_id]);

            if (!result.id) throw new Error('Failed to create category');

            return this.getCategoryById(result.id);
        } catch (error) {
            console.error('Error in createCategory:', error);
            throw error;
        }
    }

    async updateCategory(id, updates) {
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
                UPDATE categories 
                SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ? AND is_active = TRUE
            `;

            const result = await this.run(sql, values);
            if (result.changes === 0) return null;

            return this.getCategoryById(id);
        } catch (error) {
            console.error('Error in updateCategory:', error);
            throw error;
        }
    }

    async deleteCategory(id) {
        return this.withTransaction(async () => {
            try {
                // Check for active tasks
                const activeTasks = await this.get(
                    'SELECT COUNT(*) as count FROM tasks WHERE category_id = ? AND is_active = TRUE',
                    [id]
                );

                if (activeTasks.count > 0) {
                    throw new Error('Cannot delete category with active tasks');
                }

                // Check for child categories
                const childCategories = await this.get(
                    'SELECT COUNT(*) as count FROM categories WHERE parent_category_id = ? AND is_active = TRUE',
                    [id]
                );

                if (childCategories.count > 0) {
                    throw new Error('Cannot delete category with child categories');
                }

                // Soft delete the category
                const result = await this.run(
                    'UPDATE categories SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [id]
                );

                return result.changes > 0;
            } catch (error) {
                console.error('Error in deleteCategory:', error);
                throw error;
            }
        });
    }

    async getCategoryHierarchy() {
        try {
            // Get all categories
            const categories = await this.all(`
                SELECT 
                    c.*,
                    (SELECT COUNT(*) FROM tasks 
                     WHERE category_id = c.id AND is_active = TRUE) as task_count
                FROM categories c
                WHERE c.is_active = TRUE
                ORDER BY c.name
            `);

            // Build hierarchy
            const buildTree = (parentId = null) => {
                return categories
                    .filter(cat => cat.parent_category_id === parentId)
                    .map(cat => ({
                        ...cat,
                        children: buildTree(cat.id)
                    }));
            };

            return buildTree();
        } catch (error) {
            console.error('Error in getCategoryHierarchy:', error);
            throw error;
        }
    }

    async getTasksByCategory(categoryId) {
        try {
            const sql = `
                SELECT 
                    t.*,
                    l.name as location_name,
                    u.name as assigned_to_name,
                    (SELECT COUNT(*) FROM task_instances 
                     WHERE task_id = t.id AND status = 'pending') as pending_instances_count,
                    (SELECT COUNT(*) FROM task_instances 
                     WHERE task_id = t.id AND status = 'completed') as completed_instances_count
                FROM tasks t
                LEFT JOIN locations l ON t.location_id = l.id
                LEFT JOIN users u ON t.assigned_to = u.id
                WHERE t.category_id = ? AND t.is_active = TRUE
                ORDER BY t.name
            `;

            return await this.all(sql, [categoryId]);
        } catch (error) {
            console.error('Error in getTasksByCategory:', error);
            throw error;
        }
    }
}

module.exports = CategoryService;