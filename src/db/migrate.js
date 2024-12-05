const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
    const db = new sqlite3.Database(path.join(__dirname, '../../data/chores.db'));
    
    try {
        // Run initial schema
        const initialSchema = await fs.readFile(path.join(__dirname, 'migrations/initial_schema.sql'), 'utf8');
        await new Promise((resolve, reject) => {
            db.exec(initialSchema, (err) => {
                if (err) {
                    console.error('Initial schema migration failed:', err);
                    reject(err);
                    return;
                }
                console.log('Initial schema migration completed successfully');
                resolve();
            });
        });

        // Insert initial data
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                // Insert users
                db.run(`INSERT OR IGNORE INTO users (id, name, role) VALUES (4, 'Sadie', 'USER')`);
                db.run(`INSERT OR IGNORE INTO users (id, name, role) VALUES (5, 'Sami', 'USER')`);

                // Insert locations
                db.run(`INSERT OR IGNORE INTO locations (id, name) VALUES (1, 'Kitchen')`);
                db.run(`INSERT OR IGNORE INTO locations (id, name) VALUES (2, 'Bathroom')`);
                db.run(`INSERT OR IGNORE INTO locations (id, name) VALUES (3, 'Living Room')`);
                db.run(`INSERT OR IGNORE INTO locations (id, name) VALUES (4, 'Bedroom')`);
                db.run(`INSERT OR IGNORE INTO locations (id, name) VALUES (7, 'House')`);
                db.run(`INSERT OR IGNORE INTO locations (id, name) VALUES (8, 'Yard')`);

                // Insert frequency types
                db.run(`INSERT OR IGNORE INTO frequency_types (id, name) VALUES (1, 'daily')`);
                db.run(`INSERT OR IGNORE INTO frequency_types (id, name) VALUES (2, 'weekly')`);
                db.run(`INSERT OR IGNORE INTO frequency_types (id, name) VALUES (3, 'monthly')`);
                db.run(`INSERT OR IGNORE INTO frequency_types (id, name) VALUES (4, 'quarterly')`);
                db.run(`INSERT OR IGNORE INTO frequency_types (id, name) VALUES (5, 'yearly')`);

                // Insert sample chores
                const choresSql = `
                    INSERT OR IGNORE INTO chores (id, name, location_id, frequency_id, assigned_to, next_occurrence)
                    VALUES 
                    (1, 'Dishes', 1, 1, 4, DATE('now')),
                    (2, 'Clean Kitchen Counters', 1, 1, 5, DATE('now')),
                    (3, 'Clean Dining Table', 1, 1, 4, DATE('now')),
                    (4, 'Take Out Trash', 7, 1, 5, DATE('now'))
                `;
                db.run(choresSql, [], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        console.log('Data migration completed successfully');

    } catch (err) {
        console.error('Migration failed:', err);
        throw err;
    } finally {
        db.close();
    }
}

runMigration().catch(console.error);