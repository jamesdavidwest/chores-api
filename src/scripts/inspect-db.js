const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data/chores.db');
console.log('Opening database at:', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to database');

    // Get all tables
    db.all(`SELECT name, sql FROM sqlite_master WHERE type='table'`, [], (err, tables) => {
        if (err) {
            console.error('Error getting tables:', err.message);
            db.close();
            process.exit(1);
        }
        
        console.log('\nTables found:', tables.map(t => t.name).join(', '));
        
        // For each table, get its structure and contents
        tables.forEach(table => {
            console.log(`\nTable: ${table.name}`);
            console.log('Creation SQL:');
            console.log(table.sql);
            
            // Get row count
            db.get(`SELECT COUNT(*) as count FROM ${table.name}`, [], (err, result) => {
                if (err) {
                    console.error(`Error counting rows in ${table.name}:`, err.message);
                    return;
                }
                console.log(`Row count: ${result.count}`);
            });
        });

        // Get all indexes
        db.all(`SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index'`, [], (err, indexes) => {
            if (err) {
                console.error('Error getting indexes:', err.message);
                return;
            }
            
            console.log('\nIndexes:');
            indexes.forEach(index => {
                console.log(`\nIndex: ${index.name}`);
                console.log(`On table: ${index.tbl_name}`);
                console.log('Creation SQL:');
                console.log(index.sql);
            });

            // Close database after delay to allow async operations to complete
            setTimeout(() => {
                db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                    }
                    console.log('\nDatabase connection closed');
                });
            }, 1000);
        });
    });
});