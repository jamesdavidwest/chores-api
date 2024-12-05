const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../../data/chores.db'));

// Frequency mapping in days
const FREQUENCY_DAYS = {
    1: 1,     // daily
    2: 7,     // weekly
    3: 30,    // monthly
    4: 90,    // quarterly
    5: 365    // yearly
};

// Helper function to add days to a date
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString().split('T')[0];
};

// Get current date
const currentDate = new Date().toISOString().split('T')[0];

// Update each chore with appropriate dates
const updateChoresData = () => {
    db.serialize(() => {
        // First, add new columns if they don't exist
        db.run(`
            BEGIN TRANSACTION;
            
            ALTER TABLE chores ADD COLUMN start_date DATE DEFAULT CURRENT_DATE;
            ALTER TABLE chores ADD COLUMN next_occurrence DATE;
            ALTER TABLE chores ADD COLUMN last_completed DATE;
            ALTER TABLE chores ADD COLUMN time_preference TIME DEFAULT '09:00:00';
            
            COMMIT;
        `, (err) => {
            if (err) {
                console.log('Columns might already exist:', err.message);
            }
        });

        // Get all chores
        db.each(`SELECT * FROM chores`, [], (err, chore) => {
            if (err) {
                console.error('Error reading chore:', err);
                return;
            }

            // Calculate dates based on frequency
            const daysToAdd = FREQUENCY_DAYS[chore.frequency_id];
            const nextOccurrence = addDays(currentDate, daysToAdd);
            const lastCompleted = addDays(currentDate, -daysToAdd); // Assuming last completion was one frequency ago

            // Update the chore with new dates
            db.run(`
                UPDATE chores 
                SET start_date = ?,
                    next_occurrence = ?,
                    last_completed = ?
                WHERE id = ?
            `, [currentDate, nextOccurrence, lastCompleted, chore.id], (updateErr) => {
                if (updateErr) {
                    console.error('Error updating chore:', updateErr);
                } else {
                    console.log(`Updated chore ${chore.id} - ${chore.name}`);
                }
            });
        });
    });
};

// Create chore_completions table if it doesn't exist
db.run(`
    CREATE TABLE IF NOT EXISTS chore_completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chore_id INTEGER,
        completed_by INTEGER,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chore_id) REFERENCES chores(id),
        FOREIGN KEY (completed_by) REFERENCES users(id)
    )
`, (err) => {
    if (err) {
        console.error('Error creating chore_completions table:', err);
    } else {
        console.log('Chore_completions table created or already exists');
        // After ensuring table exists, update the chores data
        updateChoresData();
    }
});

// Close the database connection after 5 seconds (allowing time for updates to complete)
setTimeout(() => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed');
        }
    });
}, 5000);