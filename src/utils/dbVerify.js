const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data/chores.db');

async function verifyDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error connecting to database:', err);
                reject(err);
                return;
            }
            
            console.log('Successfully connected to database at:', dbPath);
            
            // Query to get all table names
            db.all(`SELECT name FROM sqlite_master WHERE type='table'`, [], (err, tables) => {
                if (err) {
                    console.error('Error getting tables:', err);
                    reject(err);
                    return;
                }
                
                console.log('\nExisting tables:');
                tables.forEach(table => {
                    console.log(`- ${table.name}`);
                });
                
                // Close the database connection
                db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                        reject(err);
                        return;
                    }
                    resolve(tables);
                });
            });
        });
    });
}

// Run the verification
verifyDatabase()
    .then(() => {
        console.log('\nDatabase verification complete!');
    })
    .catch(err => {
        console.error('Database verification failed:', err);
        process.exit(1);
    });
