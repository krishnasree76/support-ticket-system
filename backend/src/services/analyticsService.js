const db = require('../db/pool');
const { STATUSES, PRIORITIES } = require('../utils/constants');

// Date-range rules (see README "Analytics date-range behaviour"):
// - Tickets are filtered by created_at.
// - startDate/endDate are calendar dates in `timezone` (default UTC).
// - The range is inclusive: [startDate 00:00, endDate + 1 day 00:00).
// - No dates supplied = all tickets; only one supplied = open-ended range.
// Returns a SQL condition plus its parameters. Comparing created_at against
// computed boundaries (instead of casting created_at) keeps the index usable.
function buildDateFilter({ startDate, endDate, timezone }) {
  if (!startDate && !endDate) return { sql: 'TRUE', params: [] };

  const params = [timezone];
  const conditions = [];
  if (startDate) {
    params.push(startDate);
    conditions.push(`t.created_at >= ($${params.length}::date::timestamp AT TIME ZONE $1::text)`);
  }
  if (endDate) {
    params.push(endDate);
    conditions.push(`t.created_at < (($${params.length}::date + 1)::timestamp AT TIME ZONE $1::text)`);
  }
  return { sql: conditions.join(' AND '), params };
}

async function getAnalytics({ startDate, endDate, timezone }) {
  const { sql: dateFilter, params } = buildDateFilter({ startDate, endDate, timezone });

  const kpiSql = `
    SELECT COUNT(*)::int                                          AS total,
           COUNT(*) FILTER (WHERE t.status = 'Open')::int         AS open,
           COUNT(*) FILTER (WHERE t.status = 'In Progress')::int  AS in_progress,
           COUNT(*) FILTER (WHERE t.status = 'Resolved')::int     AS resolved,
           COUNT(*) FILTER (WHERE t.status = 'Closed')::int       AS closed,
           COUNT(*) FILTER (WHERE t.priority = 'Critical')::int   AS critical,
           COUNT(*) FILTER (WHERE t.assignee_id IS NULL)::int     AS unassigned
    FROM tickets t
    WHERE ${dateFilter}`;

  // unnest(...) WITH ORDINALITY returns every status/priority, in a fixed
  // order, with 0 for values that have no tickets, so charts never have gaps.
  // `column` is always one of the two literals below, never user input.
  const groupSql = (column) => `
    SELECT v.value AS name, COUNT(t.id)::int AS count
    FROM unnest($${params.length + 1}::text[]) WITH ORDINALITY AS v(value, position)
    LEFT JOIN tickets t ON t.${column} = v.value AND ${dateFilter}
    GROUP BY v.value, v.position
    ORDER BY v.position`;

  const [kpiResult, statusResult, priorityResult] = await Promise.all([
    db.query(kpiSql, params),
    db.query(groupSql('status'), [...params, STATUSES]),
    db.query(groupSql('priority'), [...params, PRIORITIES]),
  ]);

  const k = kpiResult.rows[0];
  return {
    range: { startDate: startDate || null, endDate: endDate || null, timezone },
    kpis: {
      totalTickets: k.total,
      openTickets: k.open,
      inProgressTickets: k.in_progress,
      resolvedTickets: k.resolved,
      closedTickets: k.closed,
      criticalTickets: k.critical,
      unassignedTickets: k.unassigned,
    },
    byStatus: statusResult.rows,
    byPriority: priorityResult.rows,
  };
}

module.exports = { getAnalytics };
