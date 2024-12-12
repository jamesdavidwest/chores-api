// src/migrations/[timestamp]_create_instances_table.js
exports.up = function (knex) {
  return knex.schema.createTable("instances", (table) => {
    // Primary key
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    // Basic info
    table.string("name").notNullable();
    table.text("description");
    table.string("type").notNullable();
    table.string("status").defaultTo("active");

    // Hierarchy
    table
      .uuid("parent_id")
      .references("id")
      .inTable("instances")
      .onDelete("SET NULL");

    // JSON columns
    table.jsonb("settings").defaultTo("{}");
    table.jsonb("metadata").defaultTo("{}");

    // Dates
    table.timestamp("start_date");
    table.timestamp("end_date");

    // Tags
    table.specificType("tags", "text[]").defaultTo("{}");

    // Audit fields
    table
      .uuid("created_by")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("archived_at");

    // Indexes
    table.index("type");
    table.index("status");
    table.index("created_by");
    table.index("parent_id");
    table.index("created_at");
    table.index("tags", "gin");
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("instances");
};
