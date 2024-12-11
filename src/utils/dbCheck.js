const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data/chores.db');

async function checkData() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error connecting to database:', err);
                reject(err);
                return;
            }

            console.log('Checking seeded data...\n');

            // Check users
            db.all(`
                SELECT name, email, role 
                FROM users 
                ORDER BY role`, [], (err, users) => {
                if (err) {
                    console.error('Error checking users:', err);
                    return;
                }
                console.log('Users in system:');
                users.forEach(user => {
                    console.log(`- ${user.name} (${user.email}) - ${user.role}`);
                });
                console.log();

                // Check tasks with assignments
                db.all(`
                    SELECT 
                        t.name as task_name,
                        u.name as assigned_to,
                        l.name as location,
                        f.name as frequency,
                        c.name as category,
                        t.points_value
                    FROM tasks t
                    JOIN users u ON t.assigned_to = u.id
                    JOIN locations l ON t.location_id = l.id
                    JOIN frequency_types f ON t.frequency_id = f.id
                    JOIN categories c ON t.category_id = c.id
                    ORDER BY u.role, t.name`, [], (err, tasks) => {
                    if (err) {
                        console.error('Error checking tasks:', err);
                        return;
                    }
                    console.log('Tasks assigned:');
                    tasks.forEach(task => {
                        console.log(`- ${task.task_name} (${task.points_value} points)`);
                        console.log(`  Assigned to: ${task.assigned_to}`);
                        console.log(`  Location: ${task.location}`);
                        console.log(`  Frequency: ${task.frequency}`);
                        console.log(`  Category: ${task.category}`);
                        console.log();
                    });

                    db.close((err) => {
                        if (err) {
                            console.error('Error closing database:', err);
                            reject(err);
                            return;
                        }
                        resolve();
                    });
                });
            });
        });
    });
}

// Run the check
checkData()
    .then(() => {
        console.log('Database check completed!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Error checking database:', err);
        process.exit(1);
    });
