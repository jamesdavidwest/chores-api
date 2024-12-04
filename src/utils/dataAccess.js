// src/utils/dataAccess.js
const path = require('path');
const fs = require('fs').promises;

const DB_PATH = path.join(__dirname, '../../data/database.json');

async function readDatabase() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // If database doesn't exist, create it with empty data
      const initialData = {
        users: [],
        chores: [],
        locations: [],
        frequency_types: []
      };
      await fs.writeFile(DB_PATH, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    throw error;
  }
}

async function writeDatabase(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// Chores functions
async function getChores() {
  const db = await readDatabase();
  return db.chores || [];
}

async function getChoreById(id) {
  const db = await readDatabase();
  return db.chores.find(chore => chore.id === parseInt(id));
}

async function createChore(choreData) {
  const db = await readDatabase();
  const newChore = {
    id: Math.max(0, ...db.chores.map(c => c.id)) + 1,
    ...choreData,
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
  const initialLength = db.chores.length;
  db.chores = db.chores.filter(chore => chore.id !== parseInt(id));
  
  if (db.chores.length === initialLength) return false;
  
  await writeDatabase(db);
  return true;
}

module.exports = {
  getChores,
  getChoreById,
  createChore,
  updateChore,
  deleteChore
};