// Loads and validates environment configuration in one place so the rest of
// the app never reads process.env directly.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

// Neon connection strings use sslmode=require. Upgrading to verify-full makes
// pg verify the server certificate too (and silences pg's sslmode warning).
function withVerifiedSsl(url) {
  if (!url) return url;
  return url.replace(/sslmode=(require|prefer|verify-ca)\b/, 'sslmode=verify-full');
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const isTest = NODE_ENV === 'test';
const isProduction = NODE_ENV === 'production';

// In tests we ALWAYS use TEST_DATABASE_URL and refuse to fall back to the
// normal database, so a test run can never touch dev or production data.
let databaseUrl = process.env.DATABASE_URL;
if (isTest) {
  databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('TEST_DATABASE_URL must be set to run tests (use an isolated test database).');
  }
  if (process.env.DATABASE_URL && databaseUrl === process.env.DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL must not be the same as DATABASE_URL.');
  }
}

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Copy backend/.env.example to backend/.env and fill it in.');
}

// Comma-separated list of allowed browser origins, e.g.
// "http://localhost:5173,https://my-app.vercel.app"
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

module.exports = {
  NODE_ENV,
  isTest,
  isProduction,
  port: Number(process.env.PORT) || 5000,
  databaseUrl: withVerifiedSsl(databaseUrl),
  // Direct (non-pooled) URL is preferred for migrations on Neon.
  migrationDatabaseUrl: withVerifiedSsl(
    isTest ? databaseUrl : process.env.DATABASE_URL_UNPOOLED || databaseUrl
  ),
  corsOrigins,
  dbPoolMax: Number(process.env.DB_POOL_MAX) || 10,
};
