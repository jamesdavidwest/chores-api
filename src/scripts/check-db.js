const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data/chores.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    
    // Get list of tables
    db.all(`SELECT name FROM sqlite_master WHERE type='table'`, [], (err, tables) => {
        if (err) {
            console.error('Error getting tables:', err.message);
            return;
        }
        
        console.log('Tables in database:', tables);
        
        // Close database
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            }
        });
    });
});