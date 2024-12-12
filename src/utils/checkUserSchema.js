const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "../../data/chores.db");

async function checkUserSchema() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("Error connecting to database:", err);
        reject(err);
        return;
      }

      // Get table info
      db.all(`PRAGMA table_info(users)`, [], (err, columns) => {
        if (err) {
          console.error("Error getting schema:", err);
          return;
        }
        console.log("Users table schema:");
        columns.forEach((col) => {
          console.log(`- ${col.name} (${col.type})`);
        });

        // Check a sample user
        db.get(`SELECT * FROM users LIMIT 1`, [], (err, user) => {
          if (err) {
            console.error("Error checking user:", err);
            return;
          }
          console.log("\nSample user data structure:");
          console.log(user);

          db.close();
          resolve();
        });
      });
    });
  });
}

checkUserSchema()
  .then(() => {
    console.log("\nSchema check completed!");
    process.exitCode = 0;
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exitCode = 1;
  });
