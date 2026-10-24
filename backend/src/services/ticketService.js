const db = require('../db/pool');
const AppError = require('../utils/AppError');
const { STATUS_TRANSITIONS, canTransition } = require('../utils/constants');

// Shared SELECT used everywhere a ticket is returned to the client.
const TICKET_SELECT = `
  SELECT t.id, t.title, t.description, t.priority, t.status, t.category,
         t.assignee_id, t.created_at, t.updated_at,
         a.name AS assignee_name, a.email AS assignee_email
  FROM tickets t
  LEFT JOIN assignees a ON a.id = t.assignee_id
`;

// Whitelisted sort expressions. User input only ever selects a KEY of this
// object; it is never interpolated into SQL itself.
const SORT_COLUMNS = {
  createdAt: 't.created_at',
  updatedAt: 't.updated_at',
  title: 'LOWER(t.title)',
  // Sort by severity / workflow order instead of alphabetically.
  priority: "CASE t.priority WHEN 'Low' THEN 1 WHEN 'Medium' THEN 2 WHEN 'High' THEN 3 WHEN 'Critical' THEN 4 END",
  status: "CASE t.status WHEN 'Open' THEN 1 WHEN 'In Progress' THEN 2 WHEN 'Resolved' THEN 3 WHEN 'Closed' THEN 4 END",
};

// Converts a database row (snake_case) into the API shape (camelCase).
function mapTicket(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    category: row.category,
    assigneeId: row.assignee_id,
    assignee: row.assignee_id
      ? { id: row.assignee_id, name: row.assignee_name, email: row.assignee_email }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Escapes LIKE wildcards so a search for "50%" matches the literal text.
function escapeLike(value) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// `client` is either the pool or a transaction client; both expose .query().
async function findTicket(client, id) {
  const { rows } = await client.query(`${TICKET_SELECT} WHERE t.id = $1`, [id]);
  return rows[0] ? mapTicket(rows[0]) : null;
}

async function lockTicket(client, id) {
  const { rows } = await client.query('SELECT * FROM tickets WHERE id = $1 FOR UPDATE', [id]);
  if (!rows[0]) throw AppError.notFound(`Ticket ${id} not found`);
  return rows[0];
}

async function findAssignee(client, assigneeId) {
  if (assigneeId === null || assigneeId === undefined) return null;
  const { rows } = await client.query('SELECT id, name FROM assignees WHERE id = $1', [assigneeId]);
  if (!rows[0]) {
    throw AppError.badRequest(`Assignee ${assigneeId} does not exist`, [
      { field: 'assigneeId', message: `Assignee ${assigneeId} does not exist` },
    ]);
  }
  return rows[0];
}

async function addActivity(client, ticketId, eventType, details) {
  await client.query(
    'INSERT INTO ticket_activity (ticket_id, event_type, details) VALUES ($1, $2, $3)',
    [ticketId, eventType, JSON.stringify(details)]
  );
}

async function listTickets({ search, status, priority, category, assigneeId, page, limit, sortBy, order }) {
  const conditions = [];
  const params = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (search) {
    const pattern = addParam(`%${escapeLike(search)}%`);
    conditions.push(`(t.title ILIKE ${pattern} OR t.description ILIKE ${pattern})`);
  }
  if (status) conditions.push(`t.status = ${addParam(status)}`);
  if (priority) conditions.push(`t.priority = ${addParam(priority)}`);
  if (category) conditions.push(`t.category = ${addParam(category)}`);
  if (assigneeId === 'unassigned') conditions.push('t.assignee_id IS NULL');
  else if (assigneeId) conditions.push(`t.assignee_id = ${addParam(assigneeId)}`);

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const direction = order === 'asc' ? 'ASC' : 'DESC';
  // t.id as a tie-breaker keeps paging deterministic when sort values repeat.
  const orderBy = `ORDER BY ${SORT_COLUMNS[sortBy]} ${direction}, t.id ${direction}`;

  // The count uses exactly the same WHERE clause and parameters as the page query.
  const filterParams = [...params];
  const countSql = `SELECT COUNT(*)::int AS total FROM tickets t ${where}`;
  const pageSql = `${TICKET_SELECT} ${where} ${orderBy} LIMIT ${addParam(limit)} OFFSET ${addParam((page - 1) * limit)}`;

  const [countResult, pageResult] = await Promise.all([
    db.query(countSql, filterParams),
    db.query(pageSql, params),
  ]);

  const total = countResult.rows[0].total;
  return {
    data: pageResult.rows.map(mapTicket),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getTicket(id) {
  const ticket = await findTicket(db, id);
  if (!ticket) throw AppError.notFound(`Ticket ${id} not found`);
  return ticket;
}

async function createTicket({ title, description, priority, category, assigneeId }) {
  return db.withTransaction(async (client) => {
    const assignee = await findAssignee(client, assigneeId);

    // id, status, created_at and updated_at all come from the database.
    const { rows } = await client.query(
      `INSERT INTO tickets (title, description, priority, category, assignee_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, status`,
      [title, description, priority, category, assignee ? assignee.id : null]
    );
    const { id, status } = rows[0];

    await addActivity(client, id, 'created', {
      title,
      priority,
      status,
      category,
      assignee: assignee ? { id: assignee.id, name: assignee.name } : null,
    });

    return findTicket(client, id);
  });
}

const EDITABLE_FIELDS = {
  title: 'title',
  description: 'description',
  priority: 'priority',
  category: 'category',
  assigneeId: 'assignee_id',
};

async function updateTicket(id, changesRequested) {
  return db.withTransaction(async (client) => {
    const current = await lockTicket(client, id);

    // Only keep fields whose value actually changes.
    const changes = {};
    for (const [field, column] of Object.entries(EDITABLE_FIELDS)) {
      if (changesRequested[field] !== undefined && changesRequested[field] !== current[column]) {
        changes[field] = changesRequested[field];
      }
    }

    if (Object.keys(changes).length === 0) {
      return findTicket(client, id);
    }

    let newAssignee = null;
    if ('assigneeId' in changes) newAssignee = await findAssignee(client, changes.assigneeId);

    const setClauses = [];
    const params = [];
    for (const [field, value] of Object.entries(changes)) {
      params.push(value);
      setClauses.push(`${EDITABLE_FIELDS[field]} = $${params.length}`);
    }
    params.push(id);
    await client.query(
      `UPDATE tickets SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`,
      params
    );

    // Record field edits and assignment changes as separate timeline events.
    const fieldChanges = {};
    for (const field of ['title', 'description', 'priority', 'category']) {
      if (field in changes) {
        fieldChanges[field] = { from: current[EDITABLE_FIELDS[field]], to: changes[field] };
      }
    }
    if (Object.keys(fieldChanges).length > 0) {
      await addActivity(client, id, 'updated', { changes: fieldChanges });
    }

    if ('assigneeId' in changes) {
      const previous = current.assignee_id
        ? (await client.query('SELECT id, name FROM assignees WHERE id = $1', [current.assignee_id])).rows[0] || null
        : null;
      await addActivity(client, id, 'assigned', {
        from: previous ? { id: previous.id, name: previous.name } : null,
        to: newAssignee ? { id: newAssignee.id, name: newAssignee.name } : null,
      });
    }

    return findTicket(client, id);
  });
}

// Changes status if the transition is allowed. The ticket update, the status
// history row and the activity row are written in ONE transaction: if any
// insert fails, the status change is rolled back too.
async function updateTicketStatus(id, newStatus) {
  return db.withTransaction(async (client) => {
    const current = await lockTicket(client, id);
    const previousStatus = current.status;

    // Same status: nothing to do, and no misleading history entry.
    if (previousStatus === newStatus) {
      return { ticket: await findTicket(client, id), changed: false };
    }

    if (!canTransition(previousStatus, newStatus)) {
      const allowed = STATUS_TRANSITIONS[previousStatus];
      throw AppError.invalidTransition(
        `Cannot change status from "${previousStatus}" to "${newStatus}"`,
        { currentStatus: previousStatus, requestedStatus: newStatus, allowedTransitions: allowed }
      );
    }

    await client.query('UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2', [newStatus, id]);
    await client.query(
      'INSERT INTO ticket_status_history (ticket_id, previous_status, new_status) VALUES ($1, $2, $3)',
      [id, previousStatus, newStatus]
    );
    await addActivity(client, id, 'status_changed', { from: previousStatus, to: newStatus });

    return { ticket: await findTicket(client, id), changed: true };
  });
}

async function deleteTicket(id) {
  // History and activity rows are removed by ON DELETE CASCADE.
  const { rowCount } = await db.query('DELETE FROM tickets WHERE id = $1', [id]);
  if (rowCount === 0) throw AppError.notFound(`Ticket ${id} not found`);
}

async function ensureTicketExists(id) {
  const { rowCount } = await db.query('SELECT 1 FROM tickets WHERE id = $1', [id]);
  if (rowCount === 0) throw AppError.notFound(`Ticket ${id} not found`);
}

// Newest first. id breaks ties for events written in the same transaction.
async function getStatusHistory(id) {
  await ensureTicketExists(id);
  const { rows } = await db.query(
    `SELECT id, ticket_id, previous_status, new_status, changed_at
     FROM ticket_status_history
     WHERE ticket_id = $1
     ORDER BY changed_at DESC, id DESC`,
    [id]
  );
  return rows.map((row) => ({
    id: row.id,
    ticketId: row.ticket_id,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    changedAt: row.changed_at,
  }));
}

async function getActivity(id) {
  await ensureTicketExists(id);
  const { rows } = await db.query(
    `SELECT id, ticket_id, event_type, details, created_at
     FROM ticket_activity
     WHERE ticket_id = $1
     ORDER BY created_at DESC, id DESC`,
    [id]
  );
  return rows.map((row) => ({
    id: row.id,
    ticketId: row.ticket_id,
    type: row.event_type,
    details: row.details,
    createdAt: row.created_at,
  }));
}

module.exports = {
  listTickets,
  getTicket,
  createTicket,
  updateTicket,
  updateTicketStatus,
  deleteTicket,
  getStatusHistory,
  getActivity,
};
