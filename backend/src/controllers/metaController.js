const { PRIORITIES, STATUSES, CATEGORIES, STATUS_TRANSITIONS } = require('../utils/constants');
const db = require('../db/pool');

// Allowed values, so the frontend never hard-codes business rules.
function getMeta(req, res) {
  res.json({
    data: {
      priorities: PRIORITIES,
      statuses: STATUSES,
      categories: CATEGORIES,
      statusTransitions: STATUS_TRANSITIONS,
    },
  });
}

// Reports API and database reachability. Returns 503 if the database is down.
async function getHealth(req, res) {
  const timestamp = new Date().toISOString();
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unreachable', timestamp });
  }
}

module.exports = { getMeta, getHealth };
