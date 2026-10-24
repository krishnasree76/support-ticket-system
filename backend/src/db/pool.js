const { Pool } = require('pg');
const config = require('../config/env');

// One shared connection pool for the whole process. Express on Render is a
// long-running server, so a regular pg Pool (via Neon's pooled endpoint) is the
// right fit. SSL is required by Neon; the connection string carries sslmode.
const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.dbPoolMax,
  idleTimeoutMillis: 30_000,
  // Neon computes can scale to zero; allow time for a cold start.
  connectionTimeoutMillis: 15_000,
});

// An idle client erroring (e.g. Neon suspended the compute) must not crash the
// process. The pool discards the broken client and creates a new one later.
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

const query = (text, params) => pool.query(text, params);

// Runs `work(client)` inside BEGIN/COMMIT, rolling back on any error.
async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
