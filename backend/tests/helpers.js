const request = require('supertest');
const config = require('../src/config/env');
const { createApp } = require('../src/app');
const { pool, query } = require('../src/db/pool');

if (!config.isTest) {
  throw new Error('Test helpers must only run with NODE_ENV=test.');
}

const app = createApp();
const api = () => request(app);

// Empties the TEST database between test files. Guarded twice: env.js refuses
// to start tests without a separate TEST_DATABASE_URL, and this checks NODE_ENV.
async function resetDatabase() {
  await query('TRUNCATE ticket_activity, ticket_status_history, tickets, assignees RESTART IDENTITY CASCADE');
}

async function createAssignees() {
  const { rows } = await query(
    `INSERT INTO assignees (name, email) VALUES
       ('Test Agent One', 'one@test.local'),
       ('Test Agent Two', 'two@test.local')
     RETURNING id, name`
  );
  return rows;
}

const validTicket = (overrides = {}) => ({
  title: 'Cannot log in',
  description: 'User sees an error after entering credentials.',
  priority: 'High',
  category: 'Account',
  ...overrides,
});

async function createTicket(overrides) {
  const res = await api().post('/api/tickets').send(validTicket(overrides));
  if (res.status !== 201) throw new Error(`createTicket failed: ${JSON.stringify(res.body)}`);
  return res.body.data;
}

async function closePool() {
  await pool.end();
}

module.exports = { api, query, resetDatabase, createAssignees, validTicket, createTicket, closePool };
