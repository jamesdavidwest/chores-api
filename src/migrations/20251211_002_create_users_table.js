exports.up = function (knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email').notNullable().unique();
    table.string('password').notNullable();
    table.integer('instance_id').unsigned().references('id').inTable('instances');
    table.json('roles').notNullable().defaultTo('["user"]');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.boolean('email_verified').notNullable().defaultTo(false);
    table.string('verification_token');
    table.string('reset_password_token');
    table.timestamp('reset_password_expires');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('email');
    table.index('instance_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('users');
};
