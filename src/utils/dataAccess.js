const path = require('path');
const fs = require('fs').promises;
const { validateDueDate, formatDueDate, DEFAULT_DUE_TIME } = require('./dateValidation');

// Use path.join for cross-platform compatibility
const DB_PATH = path.join(__dirname, '../../data/database.json');

// Database read/write functions
async function readDatabase() {
  try {
    console.log('Reading database from:', DB_PATH);
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', {
      path: DB_PATH,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

async function writeDatabase(data) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing to database:', error);
    throw error;
  }
}

// Helper function to calculate future dates based on frequency
function calculateFutureDates(startDate, frequencyId, count = 10) {
  const dates = [];
  let currentDate = new Date(startDate);

  for (let i = 0; i < count; i++) {
    dates.push(new Date(currentDate));

    switch (frequencyId) {
      case 1: // Daily
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 2: // Weekly
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 3: // Monthly
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 4: // Quarterly
        currentDate.setMonth(currentDate.getMonth() + 3);
        break;
      case 5: // Yearly
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
      case 6: // Once - only generate one instance
        return dates;
      default:
        throw new Error('Invalid frequency type');
    }
  }

  return dates;
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
async function createChoreInstances(choreId, startDate, frequencyId) {
  const db = await readDatabase();
  if (!db.chore_instances) db.chore_instances = [];

  const dates = calculateFutureDates(startDate, frequencyId);
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
}

async function getChoreInstances(filters = {}) {
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
  const db = await readDatabase();
  let chores = db.chores || [];

  if (filters.userId) {
    chores = chores.filter(chore => chore.assigned_to === parseInt(filters.userId));
  }

  if (filters.locationId) {
    chores = chores.filter(chore => chore.location_id === parseInt(filters.locationId));
  }

  // If requested, include instances for each chore
  if (filters.includeInstances) {
    const instances = await getChoreInstances();
    chores = chores.map(chore => ({
      ...chore,
      instances: instances.filter(instance => instance.chore_id === chore.id)
    }));
  }

  return chores;
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

    // Create new chore with default values
    const newChore = {
      id: Math.max(0, ...db.chores.map(c => c.id)) + 1,
      name: choreData.name,
      location_id: parseInt(choreData.location_id),
      frequency_id: parseInt(choreData.frequency_id),
      assigned_to: parseInt(choreData.assigned_to || 1), // Default to user 1 if not specified
      due_date: choreData.due_date || new Date().toISOString().split('T')[0],
      due_time: choreData.due_time || DEFAULT_DUE_TIME,
      created_at: new Date().toISOString()
    };

    console.log('createChore - New chore object:', JSON.stringify(newChore, null, 2));

    // Add to database
    db.chores.push(newChore);
    await writeDatabase(db);
    
    // Create instances for the chore
    await createChoreInstances(
      newChore.id,
      newChore.due_date,
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

  // If updating due date, validate it
  if (updates.due_date) {
    const dateValidation = validateDueDate(
      updates.due_date,
      updates.due_time || DEFAULT_DUE_TIME
    );

    if (!dateValidation.isValid) {
      throw new Error(dateValidation.error);
    }
  }
  
  const updatedChore = { 
    ...db.chores[index], 
    ...updates,
    updated_at: new Date().toISOString()
  };
  
  db.chores[index] = updatedChore;
  await writeDatabase(db);
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