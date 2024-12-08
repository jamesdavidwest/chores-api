const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

async function runMigration(db, sqlFile) {
    const sql = await fs.readFile(sqlFile, 'utf8');
    return new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
            if (err) {
                console.error(`Error running migration ${sqlFile}:`, err);
                reject(err);
                return;
            }
            console.log(`Successfully ran migration: ${sqlFile}`);
            resolve();
        });
    });
}

const initializeDatabase = async () => {
    try {
        const db = new sqlite3.Database(path.join(__dirname, '../../data/chores.db'));
        
        // List of migration files in order
        const migrations = [
            path.join(__dirname, '../migrations/004_add_instances_tables.sql')
        ];

        // Run migrations sequentially
        for (const migration of migrations) {
            await runMigration(db, migration);
        }

        // Backup the database.json if it exists
        const jsonPath = path.join(__dirname, '../../data/database.json');
        const backupPath = path.join(__dirname, '../../data/database.json.bak');
        
        try {
            await fs.access(jsonPath);
            await fs.copyFile(jsonPath, backupPath);
            console.log('Successfully backed up database.json');
        } catch (error) {
            console.log('No database.json found to backup');
        }

        console.log('Database initialized successfully');
        
        // Close the database connection
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database connection closed');
            }
        });
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
};

module.exports = { initializeDatabase };