const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class CalendarService {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, '../../data/chores.db'));
    }

    async getChoresForCalendar(startDate, endDate) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    c.*,
                    u.name as assigned_to_name,
                    l.name as location_name,
                    f.name as frequency_name
                FROM chores c
                LEFT JOIN users u ON c.assigned_to = u.id
                LEFT JOIN locations l ON c.location_id = l.id
                LEFT JOIN frequency_types f ON c.frequency_id = f.id
                WHERE 
                    (c.next_occurrence BETWEEN ? AND ?) OR
                    (c.frequency_id = 1) -- Include all daily chores
            `;

            this.db.all(query, [startDate, endDate], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(this.transformChoresForCalendar(rows));
            });
        });
    }

    transformChoresForCalendar(chores) {
        return chores.map(chore => ({
            id: chore.id,
            title: chore.name,
            start: this.combineDateTime(chore.next_occurrence, chore.time_preference),
            end: this.combineDateTime(chore.next_occurrence, chore.time_preference, 1), // 1 hour duration
            allDay: false,
            extendedProps: {
                location: chore.location_name,
                assignedTo: chore.assigned_to_name,
                frequency: chore.frequency_name,
                lastCompleted: chore.last_completed,
                status: this.getChoreStatus(chore)
            }
        }));
    }

    combineDateTime(date, time, addHours = 0) {
        if (!date) return null;
        const combined = new Date(date + 'T' + (time || '09:00:00'));
        if (addHours) {
            combined.setHours(combined.getHours() + addHours);
        }
        return combined.toISOString();
    }

    getChoreStatus(chore) {
        const now = new Date();
        const nextOccurrence = new Date(chore.next_occurrence);
        
        if (!chore.last_completed) return 'pending';
        if (new Date(chore.last_completed) >= new Date(chore.next_occurrence)) return 'completed';
        if (nextOccurrence < now) return 'overdue';
        return 'upcoming';
    }

    async markChoreCompleted(choreId, userId) {
        return new Promise((resolve, reject) => {
            const now = new Date().toISOString();
            
            this.db.serialize(() => {
                // Begin transaction
                this.db.run('BEGIN TRANSACTION');

                // Insert completion record
                this.db.run(
                    'INSERT INTO chore_completions (chore_id, completed_by, completed_at) VALUES (?, ?, ?)',
                    [choreId, userId, now],
                    (err) => {
                        if (err) {
                            this.db.run('ROLLBACK');
                            reject(err);
                            return;
                        }

                        // Update the chore's last_completed and next_occurrence
                        this.db.get(
                            'SELECT frequency_id FROM chores WHERE id = ?',
                            [choreId],
                            (err, row) => {
                                if (err) {
                                    this.db.run('ROLLBACK');
                                    reject(err);
                                    return;
                                }

                                // Calculate next occurrence based on frequency
                                const nextOccurrence = this.calculateNextOccurrence(now, row.frequency_id);
                                
                                this.db.run(
                                    'UPDATE chores SET last_completed = ?, next_occurrence = ? WHERE id = ?',
                                    [now, nextOccurrence, choreId],
                                    (err) => {
                                        if (err) {
                                            this.db.run('ROLLBACK');
                                            reject(err);
                                            return;
                                        }

                                        this.db.run('COMMIT');
                                        resolve({ success: true });
                                    }
                                );
                            }
                        );
                    }
                );
            });
        });
    }

    calculateNextOccurrence(currentDate, frequencyId) {
        const date = new Date(currentDate);
        switch (frequencyId) {
            case 1: // daily
                date.setDate(date.getDate() + 1);
                break;
            case 2: // weekly
                date.setDate(date.getDate() + 7);
                break;
            case 3: // monthly
                date.setMonth(date.getMonth() + 1);
                break;
            case 4: // quarterly
                date.setMonth(date.getMonth() + 3);
                break;
            case 5: // yearly
                date.setFullYear(date.getFullYear() + 1);
                break;
            default:
                throw new Error('Invalid frequency ID');
        }
        return date.toISOString().split('T')[0];
    }

    async updateChoreSchedule(choreId, newDate, newTime) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE chores SET next_occurrence = ?, time_preference = ? WHERE id = ?',
                [newDate, newTime, choreId],
                (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve({ success: true });
                }
            );
        });
    }
}

module.exports = new CalendarService();