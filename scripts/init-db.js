const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = path.join(__dirname, "../data/chores.db");

async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, async (err) => {
      if (err) {
        console.error("Error opening database:", err);
        reject(err);
        return;
      }

      try {
        const hashedPassword = await bcrypt.hash("password", 10);

        // Insert admin user
        db.run(
          `
                    INSERT OR IGNORE INTO users (
                        name, 
                        email, 
                        password_hash, 
                        role, 
                        is_active, 
                        timezone,
                        created_at,
                        updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                `,
          ["admin", "admin@local", hashedPassword, "ADMIN", 1, "UTC"],
          function (err) {
            if (err) {
              console.error("Error creating admin user:", err);
              reject(err);
              return;
            }

            console.log("Admin user created or already exists");
            console.log("Admin credentials:");
            console.log("Username: admin");
            console.log("Password: password");

            db.close();
            resolve();
          }
        );
      } catch (error) {
        console.error("Error in initialization:", error);
        db.close();
        reject(error);
      }
    });
  });
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log("Database initialization completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Database initialization failed:", error);
      process.exit(1);
    });
}

module.exports = initializeDatabase;
