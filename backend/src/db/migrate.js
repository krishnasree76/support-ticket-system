const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');

// Applies every migrations/*.sql file that has not been applied yet, in
// filename order. Each file runs in its own transaction and is recorded in
// schema_migrations, so running this repeatedly is safe (idempotent).
async function runMigrations(connectionString, { log = console.log } = {}) {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Prevent two migration runs (e.g. two deploys) from racing each other.
    await client.query('SELECT pg_advisory_lock(727001)');

    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.filename));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      log(`Applying migration ${file}...`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        count += 1;
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }

    log(count === 0 ? 'Database is up to date.' : `Applied ${count} migration(s).`);
    return count;
  } finally {
    await client.query('SELECT pg_advisory_unlock(727001)').catch(() => {});
    await client.end();
  }
}

module.exports = { runMigrations };
