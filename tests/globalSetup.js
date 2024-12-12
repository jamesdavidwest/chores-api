const DatabaseService = require("../src/services/DatabaseService");

module.exports = async () => {
  // Initialize test database
  const db = DatabaseService.getInstance();
  await db.init();

  // Run migrations
  await db.migrate.latest();

  // Any other global setup needed
  global.__DB__ = db;
};
