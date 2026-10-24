const { api, query, resetDatabase, createTicket, closePool } = require('./helpers');

beforeEach(resetDatabase);
afterAll(closePool);

const changeStatus = (id, status) => api().patch(`/api/tickets/${id}/status`).send({ status });

const historyCount = async (ticketId) => {
  const { rows } = await query('SELECT COUNT(*)::int AS count FROM ticket_status_history WHERE ticket_id = $1', [ticketId]);
  return rows[0].count;
};

describe('PATCH /api/tickets/:id/status', () => {
  it('rejects an invalid status value', async () => {
    const ticket = await createTicket();
    const res = await changeStatus(ticket.id, 'Done');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an unsupported transition (Open -> Closed)', async () => {
    const ticket = await createTicket();
    const res = await changeStatus(ticket.id, 'Closed');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    expect(res.body.error.details).toEqual({
      currentStatus: 'Open',
      requestedStatus: 'Closed',
      allowedTransitions: ['In Progress'],
    });
  });

  it('does not modify the ticket or write history on an invalid transition', async () => {
    const ticket = await createTicket();
    await changeStatus(ticket.id, 'Resolved');

    const after = await api().get(`/api/tickets/${ticket.id}`);
    expect(after.body.data.status).toBe('Open');
    expect(after.body.data.updatedAt).toBe(ticket.updatedAt);
    expect(await historyCount(ticket.id)).toBe(0);
  });

  it('records each valid status change with previous and new status', async () => {
    const ticket = await createTicket();

    for (const status of ['In Progress', 'Resolved', 'Closed']) {
      const res = await changeStatus(ticket.id, status);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(status);
      expect(res.body.meta.changed).toBe(true);
    }

    const history = await api().get(`/api/tickets/${ticket.id}/history`);
    expect(history.status).toBe(200);
    // Newest first.
    expect(history.body.data.map((h) => [h.previousStatus, h.newStatus])).toEqual([
      ['Resolved', 'Closed'],
      ['In Progress', 'Resolved'],
      ['Open', 'In Progress'],
    ]);
    history.body.data.forEach((entry) => {
      expect(entry.ticketId).toBe(ticket.id);
      expect(new Date(entry.changedAt).getTime()).not.toBeNaN();
    });
  });

  it('allows moving back (In Progress -> Open, Resolved -> In Progress)', async () => {
    const ticket = await createTicket();
    expect((await changeStatus(ticket.id, 'In Progress')).status).toBe(200);
    expect((await changeStatus(ticket.id, 'Open')).status).toBe(200);
    expect((await changeStatus(ticket.id, 'In Progress')).status).toBe(200);
    expect((await changeStatus(ticket.id, 'Resolved')).status).toBe(200);
    expect((await changeStatus(ticket.id, 'In Progress')).status).toBe(200);
    expect(await historyCount(ticket.id)).toBe(5);
  });

  it('does not allow any transition out of Closed', async () => {
    const ticket = await createTicket();
    for (const status of ['In Progress', 'Resolved', 'Closed']) await changeStatus(ticket.id, status);

    for (const status of ['Open', 'In Progress', 'Resolved']) {
      const res = await changeStatus(ticket.id, status);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    }
    expect(await historyCount(ticket.id)).toBe(3);
  });

  it('does not write history when the status is unchanged', async () => {
    const ticket = await createTicket();
    const res = await changeStatus(ticket.id, 'Open');
    expect(res.status).toBe(200);
    expect(res.body.meta.changed).toBe(false);
    expect(await historyCount(ticket.id)).toBe(0);
  });

  it('returns 404 for a missing ticket', async () => {
    const res = await changeStatus(987654, 'In Progress');
    expect(res.status).toBe(404);
  });

  it('returns 404 for history of a missing ticket', async () => {
    const res = await api().get('/api/tickets/987654/history');
    expect(res.status).toBe(404);
  });

  it('rolls back the status update if writing history fails', async () => {
    const ticket = await createTicket();
    // Simulate a failure in the history insert by temporarily breaking it.
    await query(`
      CREATE OR REPLACE FUNCTION fail_history_insert() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'simulated history failure'; END; $$ LANGUAGE plpgsql;
      CREATE TRIGGER fail_history BEFORE INSERT ON ticket_status_history
        FOR EACH ROW EXECUTE FUNCTION fail_history_insert();
    `);

    try {
      const res = await changeStatus(ticket.id, 'In Progress');
      expect(res.status).toBe(500);
      const after = await api().get(`/api/tickets/${ticket.id}`);
      expect(after.body.data.status).toBe('Open');
    } finally {
      await query('DROP TRIGGER IF EXISTS fail_history ON ticket_status_history; DROP FUNCTION IF EXISTS fail_history_insert();');
    }
  });
});
