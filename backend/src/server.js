const config = require('./config/env');
const { createApp } = require('./app');
const { pool } = require('./db/pool');

async function start() {
  // Fail fast with a clear message if the database is unreachable at boot.
  try {
    await pool.query('SELECT 1');
    console.log('Connected to PostgreSQL.');
  } catch (err) {
    console.error('Could not connect to PostgreSQL:', err.message);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`API listening on port ${config.port} (${config.NODE_ENV})`);
  });

  // Graceful shutdown: stop accepting requests, then close DB connections.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await pool.end().catch(() => {});
      process.exit(0);
    });
    // Force exit if open connections do not drain in time.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
