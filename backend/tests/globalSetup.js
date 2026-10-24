// Runs once before the whole test suite: brings the TEST database schema up
// to date. config/env.js guarantees this is TEST_DATABASE_URL, never DATABASE_URL.
module.exports = async () => {
  process.env.NODE_ENV = 'test';
  const config = require('../src/config/env');
  const { runMigrations } = require('../src/db/migrate');
  await runMigrations(config.migrationDatabaseUrl, { log: () => {} });
};
