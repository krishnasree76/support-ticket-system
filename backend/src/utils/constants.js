// Domain constants shared by validators, services, and the /api/meta endpoint.
// The database CHECK constraints in migrations/001_initial_schema.sql mirror these.

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];
const CATEGORIES = [
  'Technical',
  'Billing',
  'Payments',
  'Account',
  'Bug',
  'Feature Request',
  'General',
];

// Allowed status transitions: current status -> statuses it may move to.
const STATUS_TRANSITIONS = {
  Open: ['In Progress'],
  'In Progress': ['Open', 'Resolved'],
  Resolved: ['In Progress', 'Closed'],
  Closed: [],
};

function canTransition(from, to) {
  return (STATUS_TRANSITIONS[from] || []).includes(to);
}

module.exports = { PRIORITIES, STATUSES, CATEGORIES, STATUS_TRANSITIONS, canTransition };
