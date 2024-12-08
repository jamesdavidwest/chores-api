const path = require('path');
const fs = require('fs').promises;
const { validateDueDate, formatDueDate, DEFAULT_DUE_TIME } = require('./dateValidation');

// Use path.join for cross-platform compatibility
const DB_PATH = path.join(__dirname, '../../data/database.json');
const BACKUP_PATH = path.join(__dirname, '../../data/database.backup.json');

// Validate database structure
function validateDatabaseStructure(data) {
    if (!data || typeof data !== 'object') return false;
    if (!Array.isArray(data.users)) return false;
    if (!Array.isArray(data.locations)) return false;
    if (!Array.isArray(data.chores)) return false;
    if (!Array.isArray(data.frequency_types)) return false;
    if (!Array.isArray(data.chore_instances)) data.chore_instances = [];  // Initialize if missing
    return true;
}

// Create backup of database
async function createBackup(data) {
    try {
        await fs.writeFile(BACKUP_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Error creating backup:', error);
        throw new Error('Failed to create backup before write operation');
    }
}

// Restore from backup
async function restoreFromBackup() {
    try {
        console.log('Attempting to restore from backup...');
        const backupData = await fs.readFile(BACKUP_PATH, 'utf8');
        const parsedBackup = JSON.parse(backupData);
        if (validateDatabaseStructure(parsedBackup)) {
            await fs.writeFile(DB_PATH, backupData, 'utf8');
            console.log('Successfully restored from backup');
            return parsedBackup;
        }
        throw new Error('Backup data is invalid');
    } catch (error) {
        console.error('Error restoring from backup:', error);
        throw error;
    }
}

// Database read function with recovery attempt
async function readDatabase() {
    try {
        console.log('Reading database from:', DB_PATH);
        const data = await fs.readFile(DB_PATH, 'utf8');
        const parsedData = JSON.parse(data);
        
        // Validate database structure
        if (!validateDatabaseStructure(parsedData)) {
            console.error('Database structure is invalid, attempting recovery...');
            return await restoreFromBackup();
        }
        
        return parsedData;
    } catch (error) {
        console.error('Error reading database:', {
            path: DB_PATH,
            error: error.message,
            stack: error.stack
        });
        
        // If file is empty or corrupted, try to restore from backup
        if (error instanceof SyntaxError || error.code === 'ENOENT') {
            return await restoreFromBackup();
        }
        
        throw error;
    }
}

// Enhanced write function with safeguards
async function writeDatabase(data) {
    // Validate data structure before writing
    if (!validateDatabaseStructure(data)) {
        throw new Error('Invalid database structure');
    }

    try {
        // Create backup before writing
        await createBackup(data);

        // Write to temp file first
        const tempPath = `${DB_PATH}.temp`;
        await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');

        // Rename temp file to actual file (atomic operation)
        await fs.rename(tempPath, DB_PATH);

        // Verify the write was successful
        const verificationRead = await fs.readFile(DB_PATH, 'utf8');
        const verifiedData = JSON.parse(verificationRead);
        
        if (!validateDatabaseStructure(verifiedData)) {
            throw new Error('Written data failed validation');
        }
    } catch (error) {
        console.error('Error writing to database:', error);
        // Attempt to restore from backup if write fails
        await restoreFromBackup();
        throw error;
    }
}

// Helper function to calculate dates between start and end date based on frequency
function calculateFutureDates(startDate, endDate, frequencyId) {
    try {
        const dates = [];
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        console.log('Calculating dates:', { startDate, endDate, frequencyId });

        // For one-time chores, just return the start date
        if (frequencyId === 6) {
            return [start];
        }

        // If end date is before start date, return empty array
        if (end < start) {
            console.log('End date is before start date, returning empty array');
            return [];
        }

        let currentDate = new Date(start);

        // Safety check to prevent infinite loops
        let maxIterations = 365; // Maximum one year of dates
        let iterations = 0;

        while (currentDate <= end && iterations < maxIterations) {
            dates.push(new Date(currentDate));

            let nextDate = new Date(currentDate);
            switch (parseInt(frequencyId)) {
                case 1: // Daily
                    nextDate.setDate(nextDate.getDate() + 1);
                    break;
                case 2: // Weekly
                    nextDate.setDate(nextDate.getDate() + 7);
                    break;
                case 3: // Monthly
                    nextDate.setMonth(nextDate.getMonth() + 1);
                    break;
                case 4: // Quarterly
                    nextDate.setMonth(nextDate.getMonth() + 3);
                    break;
                case 5: // Yearly
                    nextDate.setFullYear(nextDate.getFullYear() + 1);
                    break;
                default:
                    console.error('Invalid frequency type:', frequencyId);
                    return [];
            }
            currentDate = nextDate;
            iterations++;
        }

        console.log(`Generated ${dates.length} dates for chore with frequency ${frequencyId}`);
        return dates;
    } catch (error) {
        console.error('Error in calculateFutureDates:', error);
        return [];
    }
}

// User functions
async function getUsers() {
    const db = await readDatabase();
    return db.users || [];
}

async function getUserById(id) {
    const db = await readDatabase();
    return (db.users || []).find(user => user.id === parseInt(id));
}

// Location functions
async function getLocations() {
    const db = await readDatabase();
    return db.locations || [];
}

async function getLocationById(id) {
    const db = await readDatabase();
    return (db.locations || []).find(location => location.id === parseInt(id));
}

// Chore instance functions
async function createChoreInstances(choreId, startDate, endDate, frequencyId) {
    try {
        const db = await readDatabase();
        if (!db.chore_instances) db.chore_instances = [];

        // Remove any existing instances for this chore
        db.chore_instances = db.chore_instances.filter(
            instance => instance.chore_id !== choreId
        );

        const dates = calculateFutureDates(startDate, endDate, frequencyId);
        if (!dates.length) {
            console.log('No valid dates generated for chore instances');
            return [];
        }

        const newInstances = dates.map((date, index) => ({
            id: Math.max(0, ...db.chore_instances.map(i => i.id)) + index + 1,
            chore_id: choreId,
            due_date: date.toISOString().split('T')[0],
            is_complete: false,
            completed_at: null,
            completed_by: null
        }));

        db.chore_instances.push(...newInstances);
        await writeDatabase(db);
        return newInstances;
    } catch (error) {
        console.error('Error in createChoreInstances:', error);
        throw error;
    }
}

async function getChoreInstances(filters = {}) {
    try {
        const db = await readDatabase();
        let instances = db.chore_instances || [];

        if (filters.choreId) {
            instances = instances.filter(instance => instance.chore_id === parseInt(filters.choreId));
        }

        if (filters.startDate) {
            instances = instances.filter(instance => instance.due_date >= filters.startDate);
        }

        if (filters.endDate) {
            instances = instances.filter(instance => instance.due_date <= filters.endDate);
        }

        return instances;
    } catch (error) {
        console.error('Error in getChoreInstances:', error);
        return [];
    }
}

async function updateChoreInstance(id, updates) {
    const db = await readDatabase();
    if (!db.chore_instances) return null;

    const index = db.chore_instances.findIndex(instance => instance.id === parseInt(id));
    if (index === -1) return null;

    db.chore_instances[index] = {
        ...db.chore_instances[index],
        ...updates,
        updated_at: new Date().toISOString()
    };

    await writeDatabase(db);
    return db.chore_instances[index];
}

// Chore functions
async function getChores(filters = {}) {
    try {
        const db = await readDatabase();
        let chores = db.chores || [];

        // Only filter by userId if it's explicitly provided
        if (filters.userId !== undefined) {
            chores = chores.filter(chore => chore.assigned_to === parseInt(filters.userId));
        }

        if (filters.locationId) {
            chores = chores.filter(chore => chore.location_id === parseInt(filters.locationId));
        }

        // If requested, include instances for each chore
        if (filters.includeInstances) {
            const instances = await getChoreInstances({
                startDate: filters.startDate,
                endDate: filters.endDate
            });
            chores = chores.map(chore => ({
                ...chore,
                instances: instances.filter(instance => instance.chore_id === chore.id)
            }));
        }

        return chores;
    } catch (error) {
        console.error('Error in getChores:', error);
        return [];
    }
}

async function getChoreById(id) {
    const db = await readDatabase();
    return (db.chores || []).find(chore => chore.id === parseInt(id));
}

async function createChore(choreData) {
    console.log('createChore - Input data:', JSON.stringify(choreData, null, 2));
    
    try {
        const db = await readDatabase();
        console.log('createChore - Current database state:', JSON.stringify(db, null, 2));
        
        if (!db.chores) db.chores = [];

        // Validate required fields
        if (!choreData.name) throw new Error('Name is required');
        if (!choreData.location_id) throw new Error('Location is required');
        if (!choreData.frequency_id) throw new Error('Frequency is required');
        if (!choreData.start_date) throw new Error('Start date is required');
        if (!choreData.end_date) throw new Error('End date is required');

        // Create new chore with default values
        const newChore = {
            id: Math.max(0, ...db.chores.map(c => c.id)) + 1,
            name: choreData.name,
            location_id: parseInt(choreData.location_id),
            frequency_id: parseInt(choreData.frequency_id),
            assigned_to: parseInt(choreData.assigned_to || 1),
            start_date: choreData.start_date,
            end_date: choreData.end_date,
            due_time: choreData.due_time || DEFAULT_DUE_TIME,
            notes: choreData.notes || '',
            created_at: new Date().toISOString()
        };

        console.log('createChore - New chore object:', JSON.stringify(newChore, null, 2));

        // Add to database
        db.chores.push(newChore);
        await writeDatabase(db);
        
        // Create instances for the chore
        await createChoreInstances(
            newChore.id,
            newChore.start_date,
            newChore.end_date,
            newChore.frequency_id
        );
        
        console.log('createChore - Successfully saved chore and instances');
        return newChore;
    } catch (error) {
        console.error('createChore - Error:', error);
        throw error;
    }
}

async function updateChore(id, updates) {
    const db = await readDatabase();
    const index = db.chores.findIndex(chore => chore.id === parseInt(id));
    
    if (index === -1) return null;

    // If updating dates, validate them
    if (updates.start_date || updates.end_date) {
        const startDate = updates.start_date || db.chores[index].start_date;
        const endDate = updates.end_date || db.chores[index].end_date;
        if (new Date(endDate) < new Date(startDate)) {
            throw new Error('End date cannot be before start date');
        }
    }
    
    const updatedChore = { 
        ...db.chores[index], 
        ...updates,
        updated_at: new Date().toISOString()
    };
    
    db.chores[index] = updatedChore;
    await writeDatabase(db);

    // If dates or frequency changed, regenerate instances
    if (updates.start_date || updates.end_date || updates.frequency_id) {
        await createChoreInstances(
            updatedChore.id,
            updatedChore.start_date,
            updatedChore.end_date,
            updatedChore.frequency_id
        );
    }

    return updatedChore;
}

async function deleteChore(id) {
    const db = await readDatabase();
    
    // Remove the chore
    db.chores = (db.chores || []).filter(chore => chore.id !== parseInt(id));
    
    // Remove all instances of this chore
    if (db.chore_instances) {
        db.chore_instances = db.chore_instances.filter(
            instance => instance.chore_id !== parseInt(id)
        );
    }
    
    await writeDatabase(db);
    return true;
}

module.exports = {
    getUsers,
    getUserById,
    getLocations,
    getLocationById,
    getChores,
    getChoreById,
    createChore,
    updateChore,
    deleteChore,
    getChoreInstances,
    updateChoreInstance,
    createChoreInstances
};
