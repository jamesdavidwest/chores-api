const path = require('path');
const { addDays, addWeeks, addMonths, addQuarters, addYears, parseISO, isWithinInterval } = require('date-fns');
const fs = require('fs').promises;

class CalendarService {
    constructor() {
        this.dbPath = path.join(__dirname, '../../data/database.json');
    }

    async loadData() {
        try {
            const data = await fs.readFile(this.dbPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading database:', error);
            throw error;
        }
    }

    async getChoresForCalendar(startDate, endDate) {
        console.log('Calendar request for:', { startDate, endDate });
        
        try {
            const data = await this.loadData();
            const { chores, chore_instances, users, locations, frequency_types } = data;

            // Parse the start and end dates
            const startDateTime = new Date(startDate);
            const endDateTime = new Date(endDate);
            
            console.log('Parsed dates:', {
                startDateTime: startDateTime.toISOString(),
                endDateTime: endDateTime.toISOString()
            });

            // Get instances within date range
            const relevantInstances = chore_instances.filter(instance => {
                const instanceDate = new Date(instance.due_date);
                return instanceDate >= startDateTime && instanceDate <= endDateTime;
            });

            console.log('Found instances:', relevantInstances.length);

            // Transform instances into calendar events
            const events = relevantInstances.map(instance => {
                const chore = chores.find(c => c.id === instance.chore_id);
                if (!chore) {
                    console.log('No chore found for instance:', instance);
                    return null;
                }

                const location = locations.find(l => l.id === chore.location_id);
                const frequency = frequency_types.find(f => f.id === chore.frequency_id);
                const assignedTo = users.find(u => u.id === chore.assigned_to);
                const completedBy = instance.completed_by ? users.find(u => u.id === instance.completed_by) : null;

                return {
                    id: `${chore.id}-${instance.id}`,
                    title: chore.name,
                    start: this.combineDateTime(instance.due_date, chore.due_time || '09:00'),
                    end: this.combineDateTime(instance.due_date, chore.due_time || '09:00', 1),
                    allDay: false,
                    extendedProps: {
                        choreId: chore.id,
                        instanceId: instance.id,
                        location: location?.name,
                        assignedTo: assignedTo?.name,
                        frequency: frequency?.name,
                        isComplete: instance.is_complete,
                        completedAt: instance.completed_at,
                        completedBy: completedBy?.name,
                        status: this.getChoreStatus(instance, instanceDate)
                    }
                };
            }).filter(Boolean); // Remove any null entries

            console.log('Returning events:', events.length);
            return events;

        } catch (error) {
            console.error('Error getting chores for calendar:', error);
            throw error;
        }
    }

    combineDateTime(date, time = '09:00', addHours = 0) {
        if (!date) return null;
        
        try {
            // Ensure valid time format
            if (!time.includes(':')) {
                time = '09:00';
            }
            
            const [hours, minutes] = time.split(':');
            const dateObj = new Date(date);
            dateObj.setHours(parseInt(hours, 10) + addHours, parseInt(minutes, 10), 0);
            
            return dateObj.toISOString();
        } catch (error) {
            console.error('Error combining date and time:', { date, time, error });
            // Return a safe default if there's an error
            const fallback = new Date(date);
            fallback.setHours(9 + addHours, 0, 0);
            return fallback.toISOString();
        }
    }

    getChoreStatus(instance, date) {
        if (instance.is_complete) return 'completed';
        if (date < new Date()) return 'overdue';
        return 'upcoming';
    }

    async markChoreCompleted(choreId, instanceId, userId) {
        try {
            const data = await this.loadData();
            const instance = data.chore_instances.find(i => 
                i.id === instanceId && i.chore_id === choreId
            );

            if (!instance) {
                throw new Error('Instance not found');
            }

            instance.is_complete = true;
            instance.completed_at = new Date().toISOString();
            instance.completed_by = userId;

            await fs.writeFile(this.dbPath, JSON.stringify(data, null, 2));
            return { success: true };
        } catch (error) {
            console.error('Error marking chore completed:', error);
            throw error;
        }
    }

    async updateChoreSchedule(choreId, instanceId, newDate, newTime) {
        try {
            const data = await this.loadData();
            const instance = data.chore_instances.find(i => 
                i.id === instanceId && i.chore_id === choreId
            );

            if (!instance) {
                throw new Error('Instance not found');
            }

            instance.due_date = newDate;
            const chore = data.chores.find(c => c.id === choreId);
            if (chore && newTime) {
                chore.due_time = newTime;
            }

            await fs.writeFile(this.dbPath, JSON.stringify(data, null, 2));
            return { success: true };
        } catch (error) {
            console.error('Error updating chore schedule:', error);
            throw error;
        }
    }
}

// Export a new instance but maintain the class export for testing
const service = new CalendarService();
module.exports = service;