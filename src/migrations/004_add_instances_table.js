exports.up = function(knex) {
  return knex.schema
    .createTable('instance_ranges', function(table) {
      table.increments('id');
      table.date('start_date').notNullable();
      table.date('end_date').notNullable();
      table.timestamp('generated_at').defaultTo(knex.fn.now());
      table.index(['start_date', 'end_date']);
    })
    .alterTable('chore_instances', function(table) {
      table.date('start_date');
      table.date('end_date');
      table.string('status').defaultTo('active');
      table.json('modified_history');
      table.boolean('skipped').defaultTo(false);
      table.index(['due_date']);
      table.index(['chore_id', 'due_date']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('instance_ranges')
    .alterTable('chore_instances', function(table) {
      table.dropColumn('start_date');
      table.dropColumn('end_date');
      table.dropColumn('status');
      table.dropColumn('modified_history');
      table.dropColumn('skipped');
      table.dropIndex(['due_date']);
      table.dropIndex(['chore_id', 'due_date']);
    });
};
