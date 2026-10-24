// Usage: npm run migrate
// Applies pending SQL migrations to the database in DATABASE_URL_UNPOOLED
// (falls back to DATABASE_URL). Never drops or resets anything.
const config = require('../src/config/env');
const { runMigrations } = require('../src/db/migrate');

runMigrations(config.migrationDatabaseUrl)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
