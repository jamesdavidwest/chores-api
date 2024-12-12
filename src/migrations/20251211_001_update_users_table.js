// src/migrations/[timestamp]_update_users_table.js
exports.up = function (knex) {
  return knex.schema.table('users', (table) => {
    // Email verification
    table.boolean('email_verified').defaultTo(false);
    table.string('email_verification_token');
    table.timestamp('email_verification_expires');

    // Password reset
    table.string('password_reset_token');
    table.timestamp('password_reset_expires');

    // Add indexes
    table.index('email_verification_token');
    table.index('password_reset_token');
  });
};

exports.down = function (knex) {
  return knex.schema.table('users', (table) => {
    table.dropColumn('email_verified');
    table.dropColumn('email_verification_token');
    table.dropColumn('email_verification_expires');
    table.dropColumn('password_reset_token');
    table.dropColumn('password_reset_expires');
  });
};
