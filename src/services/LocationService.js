const DatabaseService = require('./DatabaseService');

class LocationService extends DatabaseService {
    constructor() {
        super();
    }

    async getLocations(options = {}) {
        try {
            let sql = `
                SELECT 
                    l.*,
                    parent.name as parent_name,
                    (SELECT COUNT(*) FROM tasks 
                     WHERE location_id = l.id AND is_active = TRUE) as active_tasks_count
                FROM locations l
                LEFT JOIN locations parent ON l.parent_location_id = parent.id
                WHERE l.is_active = TRUE
            `;

            const params = [];

            if (options.parentId) {
                sql += ' AND l.parent_location_id = ?';
                params.push(options.parentId);
            }

            if (options.searchTerm) {
                sql += ' AND l.name LIKE ?';
                params.push(`%${options.searchTerm}%`);
            }

            sql += ' ORDER BY l.name';

            return await this.all(sql, params);
        } catch (error) {
            console.error('Error in getLocations:', error);
            throw error;
        }
    }

    async getLocationById(id) {
        try {
            const sql = `
                SELECT 
                    l.*,
                    parent.name as parent_name,
                    (SELECT COUNT(*) FROM tasks 
                     WHERE location_id = l.id AND is_active = TRUE) as active_tasks_count,
                    (SELECT COUNT(*) FROM task_instances ti
                     JOIN tasks t ON ti.task_id = t.id
                     WHERE t.location_id = l.id 
                     AND ti.status = 'pending') as pending_tasks_count,
                    s.requires_supplies
                FROM locations l
                LEFT JOIN locations parent ON l.parent_location_id = parent.id
                LEFT JOIN supplies s ON l.id = s.location_id
                WHERE l.id = ? AND l.is_active = TRUE
            `;

            return await this.get(sql, [id]);
        } catch (error) {
            console.error('Error in getLocationById:', error);
            throw error;
        }
    }

    async createLocation(locationData) {
        try {
            const { 
                name, parent_location_id = null, floor = null,
                area_square_feet = null, notes = null,
                requires_supplies = null
            } = locationData;

            const result = await this.run(`
                INSERT INTO locations (
                    name, parent_location_id, floor,
                    area_square_feet, notes, requires_supplies
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [name, parent_location_id, floor, area_square_feet, notes, requires_supplies]);

            if (!result.id) throw new Error('Failed to create location');

            return this.getLocationById(result.id);
        } catch (error) {
            console.error('Error in createLocation:', error);
            throw error;
        }
    }

    async updateLocation(id, updates) {
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
                UPDATE locations 
                SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ? AND is_active = TRUE
            `;

            const result = await this.run(sql, values);
            if (result.changes === 0) return null;

            return this.getLocationById(id);
        } catch (error) {
            console.error('Error in updateLocation:', error);
            throw error;
        }
    }

    async deleteLocation(id) {
        return this.withTransaction(async () => {
            try {
                // Check for active tasks
                const activeTasks = await this.get(
                    'SELECT COUNT(*) as count FROM tasks WHERE location_id = ? AND is_active = TRUE',
                    [id]
                );

                if (activeTasks.count > 0) {
                    throw new Error('Cannot delete location with active tasks');
                }

                // Check for child locations
                const childLocations = await this.get(
                    'SELECT COUNT(*) as count FROM locations WHERE parent_location_id = ? AND is_active = TRUE',
                    [id]
                );

                if (childLocations.count > 0) {
                    throw new Error('Cannot delete location with child locations');
                }

                // Soft delete the location
                const result = await this.run(
                    'UPDATE locations SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [id]
                );

                return result.changes > 0;
            } catch (error) {
                console.error('Error in deleteLocation:', error);
                throw error;
            }
        });
    }

    async getLocationHierarchy() {
        try {
            // Get all locations
            const locations = await this.all(`
                SELECT 
                    l.*,
                    (SELECT COUNT(*) FROM tasks 
                     WHERE location_id = l.id AND is_active = TRUE) as task_count
                FROM locations l
                WHERE l.is_active = TRUE
                ORDER BY l.name
            `);

            // Build hierarchy
            const buildTree = (parentId = null) => {
                return locations
                    .filter(loc => loc.parent_location_id === parentId)
                    .map(loc => ({
                        ...loc,
                        children: buildTree(loc.id)
                    }));
            };

            return buildTree();
        } catch (error) {
            console.error('Error in getLocationHierarchy:', error);
            throw error;
        }
    }

    async getLocationSupplies(locationId) {
        try {
            const sql = `
                SELECT 
                    s.*,
                    l.name as location_name,
                    CASE 
                        WHEN s.current_quantity <= s.minimum_quantity THEN 'reorder'
                        WHEN s.current_quantity <= s.minimum_quantity * 2 THEN 'low'
                        ELSE 'ok'
                    END as status
                FROM supplies s
                JOIN locations l ON s.location_id = l.id
                WHERE s.location_id = ? AND s.is_active = TRUE
                ORDER BY s.name
            `;

            return await this.all(sql, [locationId]);
        } catch (error) {
            console.error('Error in getLocationSupplies:', error);
            throw error;
        }
    }

    async updateLocationSupplies(locationId, supplies) {
        return this.withTransaction(async () => {
            try {
                // First, get current supplies for the location
                const currentSupplies = await this.getLocationSupplies(locationId);
                
                // Update requires_supplies JSON in location
                await this.run(
                    'UPDATE locations SET requires_supplies = ? WHERE id = ?',
                    [JSON.stringify(supplies), locationId]
                );

                // For each supply, ensure it exists in supplies table
                for (const supply of supplies) {
                    const existingSupply = currentSupplies.find(s => s.name === supply.name);
                    
                    if (existingSupply) {
                        // Update existing supply
                        await this.run(`
                            UPDATE supplies 
                            SET minimum_quantity = ?,
                                unit = ?,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        `, [supply.minimum_quantity, supply.unit, existingSupply.id]);
                    } else {
                        // Create new supply
                        await this.run(`
                            INSERT INTO supplies (
                                name, location_id, minimum_quantity,
                                unit, current_quantity
                            ) VALUES (?, ?, ?, ?, 0)
                        `, [supply.name, locationId, supply.minimum_quantity, supply.unit]);
                    }
                }

                return await this.getLocationSupplies(locationId);
            } catch (error) {
                console.error('Error in updateLocationSupplies:', error);
                throw error;
            }
        });
    }
}

module.exports = LocationService;