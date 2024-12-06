const path = require('path');
const fs = require('fs').promises;
const { validateDueDate, formatDueDate, DEFAULT_DUE_TIME } = require('./dateValidation');
const DB_PATH = path.join(__dirname, '../../data/database.json');

// Database read/write functions
async function readDatabase() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return {};
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

  return chores;
}

async function getChoreById(id) {
  const db = await readDatabase();
  return (db.chores || []).find(chore => chore.id === parseInt(id));
}

async function createChore(choreData) {
  const db = await readDatabase();
  if (!db.chores) db.chores = [];

  // Validate and process due date
  const { due_date, due_time = DEFAULT_DUE_TIME, ...otherData } = choreData;
  const dateValidation = validateDueDate(due_date, due_time);

  if (!dateValidation.isValid) {
    throw new Error(dateValidation.error);
  }

  const newChore = {
    id: Math.max(0, ...db.chores.map(c => c.id)) + 1,
    ...otherData,
    due_date: formatDueDate(dateValidation.date),
    created_at: new Date().toISOString()
  };
  
  db.chores.push(newChore);
  await writeDatabase(db);
  return newChore;
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

    updates.due_date = formatDueDate(dateValidation.date);
  }
  
  db.chores[index] = { 
    ...db.chores[index], 
    ...updates,
    updated_at: new Date().toISOString()
  };
  
  await writeDatabase(db);
  return db.chores[index];
}

async function deleteChore(id) {
  const db = await readDatabase();
  db.chores = (db.chores || []).filter(chore => chore.id !== parseInt(id));
  await writeDatabase(db);
  return true;
}

// Calendar-specific functions
async function getChoreSchedules(filters = {}) {
  const db = await readDatabase();
  let schedules = db.chore_schedules || [];

  if (filters.startDate) {
    schedules = schedules.filter(s => new Date(s.next_occurrence) >= new Date(filters.startDate));
  }
  
  if (filters.endDate) {
    schedules = schedules.filter(s => new Date(s.next_occurrence) <= new Date(filters.endDate));
  }

  if (filters.userId) {
    const userChores = db.chores.filter(c => c.assigned_to === parseInt(filters.userId));
    schedules = schedules.filter(s => userChores.some(c => c.id === s.chore_id));
  }

  return schedules;
}

async function getScheduleById(id) {
  const db = await readDatabase();
  return (db.chore_schedules || []).find(schedule => schedule.id === parseInt(id));
}

async function createSchedule(scheduleData) {
  const db = await readDatabase();
  if (!db.chore_schedules) db.chore_schedules = [];
  
  const newSchedule = {
    id: Math.max(0, ...db.chore_schedules.map(s => s.id), 0) + 1,
    ...scheduleData,
    created_at: new Date().toISOString()
  };
  
  db.chore_schedules.push(newSchedule);
  await writeDatabase(db);
  return newSchedule;
}

async function updateSchedule(id, updates) {
  const db = await readDatabase();
  if (!db.chore_schedules) return null;
  
  const index = db.chore_schedules.findIndex(schedule => schedule.id === parseInt(id));
  if (index === -1) return null;
  
  db.chore_schedules[index] = {
    ...db.chore_schedules[index],
    ...updates,
    updated_at: new Date().toISOString()
  };
  
  await writeDatabase(db);
  return db.chore_schedules[index];
}

async function addChoreHistory(historyData) {
  const db = await readDatabase();
  if (!db.chore_history) db.chore_history = [];
  
  const newHistory = {
    id: Math.max(0, ...db.chore_history.map(h => h.id), 0) + 1,
    ...historyData,
    completed_at: new Date().toISOString()
  };
  
  db.chore_history.push(newHistory);
  await writeDatabase(db);
  return newHistory;
}

async function getChoreHistory(choreId, filters = {}) {
  const db = await readDatabase();
  let history = (db.chore_history || []).filter(h => h.chore_id === parseInt(choreId));
  
  if (filters.startDate) {
    history = history.filter(h => new Date(h.completed_at) >= new Date(filters.startDate));
  }
  
  if (filters.endDate) {
    history = history.filter(h => new Date(h.completed_at) <= new Date(filters.endDate));
  }
  
  return history;
}

async function getUpcomingChores(userId, days = 7) {
  const db = await readDatabase();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + parseInt(days));
  
  const schedules = await getChoreSchedules({
    startDate: new Date().toISOString(),
    endDate: endDate.toISOString(),
    userId
  });
  
  // Enrich schedules with chore details
  return Promise.all(schedules.map(async schedule => {
    const chore = await getChoreById(schedule.chore_id);
    return { ...schedule, chore };
  }));
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
  getChoreSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  addChoreHistory,
  getChoreHistory,
  getUpcomingChores
};