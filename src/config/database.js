// src/config/database.js
require("dotenv").config();

const getConnectionConfig = () => {
  const dbType = process.env.DB_TYPE?.toLowerCase() || "sqlite";

  if (dbType === "postgres") {
    return {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };
  }

  // SQLite configuration
  return {
    filename: process.env.DB_PATH || "./data/database.sqlite",
  };
};

const development = {
  client:
    process.env.DB_TYPE?.toLowerCase() === "postgres"
      ? "postgresql"
      : "sqlite3",
  connection: getConnectionConfig(),
  useNullAsDefault: true,
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: "./src/migrations",
    tableName: "knex_migrations",
  },
  seeds: {
    directory: "./src/seeds",
  },
};

const production = {
  client: "postgresql",
  connection: {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: "./src/migrations",
    tableName: "knex_migrations",
  },
  seeds: {
    directory: "./src/seeds",
  },
};

const testing = {
  client: "sqlite3",
  connection: {
    filename: ":memory:",
  },
  useNullAsDefault: true,
  migrations: {
    directory: "./src/migrations",
    tableName: "knex_migrations",
  },
  seeds: {
    directory: "./src/seeds",
  },
};

module.exports = {
  development,
  production,
  testing,
};
