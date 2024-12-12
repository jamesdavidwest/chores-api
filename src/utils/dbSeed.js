const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "../../data/chores.db");

async function seedDatabase() {
  return new Promise(async (resolve, reject) => {
    const db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error("Error connecting to database:", err);
        reject(err);
        return;
      }

      try {
        // Enable foreign keys
        await run(db, "PRAGMA foreign_keys = ON");

        // Clear existing data
        await clearTables(db);

        // Seed data in order
        console.log("Starting to seed database...");

        // 1. Seed users
        console.log("Seeding users...");
        const users = await seedUsers(db);

        // 2. Seed locations
        console.log("Seeding locations...");
        const locations = await seedLocations(db);

        // 3. Seed frequency types
        console.log("Seeding frequency types...");
        const frequencyTypes = await seedFrequencyTypes(db);

        // 4. Seed categories
        console.log("Seeding categories...");
        const categories = await seedCategories(db);

        // 5. Seed tasks
        console.log("Seeding tasks...");
        await seedTasks(db);

        console.log("Database seeding completed successfully!");
        db.close();
        resolve();
      } catch (error) {
        console.error("Error seeding database:", error);
        db.close();
        reject(error);
      }
    });
  });
}

// Helper function to run SQL commands
function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Clear all tables
async function clearTables(db) {
  const tables = [
    "notifications",
    "point_transactions",
    "supply_transactions",
    "task_instances",
    "task_dependencies",
    "tasks",
    "categories",
    "frequency_types",
    "locations",
    "user_profiles",
    "user_relationships",
    "users",
    "supplies",
    "rewards",
    "instance_ranges",
  ];

  for (const table of tables) {
    await run(db, `DELETE FROM ${table}`);
    await run(db, `DELETE FROM sqlite_sequence WHERE name='${table}'`);
  }
}

// Seed users
async function seedUsers(db) {
  const users = [
    {
      name: "Admin User",
      email: "admin@example.com",
      role: "ADMIN",
      password: "password",
    },
    {
      name: "Parent Manager",
      email: "parent@example.com",
      role: "MANAGER",
      password: "password",
    },
    {
      name: "Child User",
      email: "child@example.com",
      role: "USER",
      password: "password",
    },
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await run(
      db,
      "INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, ?)",
      [user.name, user.email, user.role, hashedPassword]
    );
  }

  return users;
}

// Seed locations
async function seedLocations(db) {
  const locations = [
    { name: "Kitchen" },
    { name: "Living Room" },
    { name: "Bathroom" },
    { name: "Bedroom" },
    { name: "Garage" },
    { name: "Yard" },
    { name: "Office" },
    { name: "Basement" },
  ];

  for (const location of locations) {
    await run(db, "INSERT INTO locations (name) VALUES (?)", [location.name]);
  }

  return locations;
}

// Seed frequency types
async function seedFrequencyTypes(db) {
  const frequencies = [
    { name: "daily" },
    { name: "weekly" },
    { name: "monthly" },
    { name: "quarterly" },
    { name: "yearly" },
    { name: "once" },
  ];

  for (const freq of frequencies) {
    await run(db, "INSERT INTO frequency_types (name) VALUES (?)", [freq.name]);
  }

  return frequencies;
}

// Seed categories
async function seedCategories(db) {
  const categories = [
    { name: "Cleaning", description: "General cleaning tasks" },
    { name: "Maintenance", description: "Home maintenance tasks" },
    { name: "Yard Work", description: "Outdoor and yard maintenance" },
    { name: "Personal", description: "Personal responsibilities" },
    { name: "Pet Care", description: "Pet-related tasks" },
    { name: "Admin Tasks", description: "Administrative responsibilities" },
    { name: "Management", description: "Household management tasks" },
  ];

  for (const category of categories) {
    await run(db, "INSERT INTO categories (name, description) VALUES (?, ?)", [
      category.name,
      category.description,
    ]);
  }

  return categories;
}

// Seed tasks
async function seedTasks(db) {
  const tasks = [
    // Admin User Tasks (Technical and Administrative)
    {
      name: "System Backup",
      location: "Office",
      frequency: "weekly",
      category: "Admin Tasks",
      points_value: 15,
      assignedToRole: "ADMIN",
    },
    {
      name: "Update Family Calendar",
      location: "Office",
      frequency: "weekly",
      category: "Admin Tasks",
      points_value: 10,
      assignedToRole: "ADMIN",
    },
    {
      name: "Pay Bills",
      location: "Office",
      frequency: "monthly",
      category: "Admin Tasks",
      points_value: 20,
      assignedToRole: "ADMIN",
    },
    {
      name: "Review Security System",
      location: "Office",
      frequency: "monthly",
      category: "Maintenance",
      points_value: 15,
      assignedToRole: "ADMIN",
    },

    // Parent Manager Tasks (Household Management)
    {
      name: "Grocery Shopping",
      location: "Kitchen",
      frequency: "weekly",
      category: "Management",
      points_value: 20,
      assignedToRole: "MANAGER",
    },
    {
      name: "Meal Planning",
      location: "Kitchen",
      frequency: "weekly",
      category: "Management",
      points_value: 15,
      assignedToRole: "MANAGER",
    },
    {
      name: "Deep Clean Kitchen",
      location: "Kitchen",
      frequency: "weekly",
      category: "Cleaning",
      points_value: 25,
      assignedToRole: "MANAGER",
    },
    {
      name: "Organize Storage Areas",
      location: "Basement",
      frequency: "monthly",
      category: "Management",
      points_value: 30,
      assignedToRole: "MANAGER",
    },

    // Child User Tasks (Regular Chores)
    {
      name: "Make Bed",
      location: "Bedroom",
      frequency: "daily",
      category: "Personal",
      points_value: 5,
      assignedToRole: "USER",
    },
    {
      name: "Clean Room",
      location: "Bedroom",
      frequency: "weekly",
      category: "Cleaning",
      points_value: 15,
      assignedToRole: "USER",
    },
    {
      name: "Feed Pets",
      location: "Kitchen",
      frequency: "daily",
      category: "Pet Care",
      points_value: 5,
      assignedToRole: "USER",
    },
    {
      name: "Empty Trash Bins",
      location: "Living Room",
      frequency: "daily",
      category: "Cleaning",
      points_value: 5,
      assignedToRole: "USER",
    },
  ];

  for (const task of tasks) {
    // Get IDs from related tables
    const locationId = await getIdByName(db, "locations", task.location);
    const frequencyId = await getIdByName(
      db,
      "frequency_types",
      task.frequency
    );
    const categoryId = await getIdByName(db, "categories", task.category);

    // Get user ID based on role
    const userId = await getUserIdByRole(db, task.assignedToRole);

    await run(
      db,
      `INSERT INTO tasks (
                name, location_id, frequency_id, category_id,
                assigned_to, points_value, time_preference
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        task.name,
        locationId,
        frequencyId,
        categoryId,
        userId,
        task.points_value,
        "09:00:00",
      ]
    );
  }
}

// Helper function to get ID by name from a table
async function getIdByName(db, table, name) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT id FROM ${table} WHERE name = ?`, [name], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.id : null);
    });
  });
}

// Helper function to get user ID by role
async function getUserIdByRole(db, role) {
  return new Promise((resolve, reject) => {
    db.get("SELECT id FROM users WHERE role = ?", [role], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.id : null);
    });
  });
}

// Run the seeding
seedDatabase()
  .then(() => {
    console.log("Database seeding completed successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error seeding database:", err);
    process.exit(1);
  });
