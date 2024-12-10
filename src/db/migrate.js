const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');

class DatabaseMigration {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(new Error(`Failed to open database: ${err.message}`));
                    return;
                }
                resolve();
            });
        });
    }

    async runQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function(err) {
                if (err) {
                    reject(new Error(`Query failed: ${err.message}\nQuery: ${query}`));
                    return;
                }
                resolve(this);
            });
        });
    }

    async runScript(sqlScript) {
        return new Promise((resolve, reject) => {
            this.db.exec(sqlScript, (err) => {
                if (err) {
                    reject(new Error(`Script execution failed: ${err.message}`));
                    return;
                }
                resolve();
            });
        });
    }

    async insertSeedData() {
        const seedData = {
            users: [
                { id: 1, name: 'Admin User', email: 'admin@example.com', role: 'ADMIN' },
                { id: 2, name: 'Manager', email: 'manager@example.com', role: 'MANAGER' },
                { id: 3, name: 'Regular User', email: 'user@example.com', role: 'USER' }
            ],
            locations: [
                { id: 1, name: 'Kitchen' },
                { id: 2, name: 'Living Room' },
                { id: 3, name: 'Master Bedroom' },
                { id: 4, name: 'Bathroom' },
                { id: 5, name: 'Garage' },
                { id: 6, name: 'Yard' }
            ],
            categories: [
                { id: 1, name: 'Cleaning', description: 'General cleaning tasks' },
                { id: 2, name: 'Maintenance', description: 'Home maintenance tasks' },
                { id: 3, name: 'Organization', description: 'Organizing and tidying' },
                { id: 4, name: 'Pet Care', description: 'Pet-related tasks' }
            ],
            frequency_types: [
                { id: 1, name: 'once' },
                { id: 2, name: 'daily' },
                { id: 3, name: 'weekly' },
                { id: 4, name: 'biweekly' },
                { id: 5, name: 'monthly' },
                { id: 6, name: 'quarterly' },
                { id: 7, name: 'yearly' }
            ],
            tasks: [
                {
                    id: 1,
                    name: 'Clean Kitchen Counters',
                    category_id: 1,
                    location_id: 1,
                    frequency_id: 2,
                    assigned_to: 3,
                    priority: 2,
                    estimated_duration: 15
                },
                {
                    id: 2,
                    name: 'Vacuum Living Room',
                    category_id: 1,
                    location_id: 2,
                    frequency_id: 3,
                    assigned_to: 3,
                    priority: 2,
                    estimated_duration: 20
                }
            ],
            rewards: [
                {
                    id: 1,
                    name: 'Extra Screen Time',
                    description: '1 hour of extra screen time',
                    points_cost: 100
                },
                {
                    id: 2,
                    name: 'Choose Dinner',
                    description: 'Choose dinner for the family',
                    points_cost: 200
                }
            ]
        };

        try {
            // Insert seed data for each table
            for (const [table, data] of Object.entries(seedData)) {
                for (const item of data) {
                    const columns = Object.keys(item).join(', ');
                    const placeholders = Object.keys(item).map(() => '?').join(', ');
                    const values = Object.values(item);
                    
                    const query = `INSERT OR IGNORE INTO ${table} (${columns}) VALUES (${placeholders})`;
                    await this.runQuery(query, values);
                }
                console.log(`Seed data inserted for ${table}`);
            }
        } catch (error) {
            throw new Error(`Failed to insert seed data: ${error.message}`);
        }
    }

    async migrate() {
        try {
            // Begin transaction
            await this.runQuery('BEGIN TRANSACTION');

            // Read and execute the schema
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schemaSQL = await fs.readFile(schemaPath, 'utf8');
            await this.runScript(schemaSQL);

            // Insert seed data
            await this.insertSeedData();

            // Commit transaction
            await this.runQuery('COMMIT');
            
            console.log('Migration completed successfully');
        } catch (error) {
            // Rollback on error
            await this.runQuery('ROLLBACK');
            throw error;
        } finally {
            // Close database connection
            if (this.db) {
                this.db.close();
            }
        }
    }
}

// Run migration
async function runMigration() {
    const dbPath = path.join(__dirname, '../../data/chores.db');
    const migration = new DatabaseMigration(dbPath);
    
    try {
        await migration.init();
        await migration.migrate();
    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    runMigration();
}

module.exports = DatabaseMigration;