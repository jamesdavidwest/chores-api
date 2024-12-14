/**
 * Add event relationships and audit logging
 */
exports.up = async function(knex) {
  // First, add columns to events table
  await knex.schema.alterTable('events', (table) => {
    table.integer('parent_id').references('id').inTable('events').onDelete('CASCADE');
    table.jsonb('hierarchy_path').defaultTo('[]');
    table.integer('user_id').references('id').inTable('users');
  });

  // Then create the audit log table
  return knex.schema.createTable('event_audit_log', (table) => {
    table.increments('id').primary();
    table.integer('event_id').references('id').inTable('events').onDelete('CASCADE').notNullable();
    table.string('action').notNullable();
    table.jsonb('old_data');
    table.jsonb('new_data');
    table.integer('user_id').references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    
    // Indexes for performance
    table.index('event_id');
    table.index('action');
    table.index('created_at');
    table.index('user_id');
  });
};

/**
 * Remove event relationships and audit logging
 */
exports.down = async function(knex) {
  // First drop the audit log table
  await knex.schema.dropTableIfExists('event_audit_log');

  // Then remove the columns from events table
  return knex.schema.alterTable('events', (table) => {
    table.dropColumn('parent_id');
    table.dropColumn('hierarchy_path');
    table.dropColumn('user_id');
  });
};
