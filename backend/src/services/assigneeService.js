const db = require('../db/pool');

// Employees who can be assigned tickets, with how many unfinished tickets each holds.
async function listAssignees() {
  const { rows } = await db.query(`
    SELECT a.id, a.name, a.email, a.created_at,
           COUNT(t.id) FILTER (WHERE t.status IN ('Open', 'In Progress'))::int AS active_tickets
    FROM assignees a
    LEFT JOIN tickets t ON t.assignee_id = a.id
    GROUP BY a.id
    ORDER BY a.name ASC, a.id ASC
  `);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    activeTickets: row.active_tickets,
    createdAt: row.created_at,
  }));
}

module.exports = { listAssignees };
