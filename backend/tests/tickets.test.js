const { api, query, resetDatabase, createAssignees, validTicket, createTicket, closePool } = require('./helpers');

let assignees;

beforeEach(async () => {
  await resetDatabase();
  assignees = await createAssignees();
});

afterAll(closePool);

describe('GET /api/health', () => {
  it('reports the API and database as healthy', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'connected' });
  });
});

describe('POST /api/tickets', () => {
  it('creates a valid ticket with server-generated id, status and timestamps', async () => {
    const res = await api()
      .post('/api/tickets')
      .send(validTicket({ title: '  Payment failed  ', assigneeId: assignees[0].id }));

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      id: expect.any(Number),
      title: 'Payment failed', // trimmed
      priority: 'High',
      status: 'Open',
      category: 'Account',
      assigneeId: assignees[0].id,
      assignee: { id: assignees[0].id, name: 'Test Agent One' },
    });
    expect(new Date(res.body.data.createdAt).getTime()).not.toBeNaN();

    const { rows } = await query('SELECT event_type FROM ticket_activity WHERE ticket_id = $1', [res.body.data.id]);
    expect(rows).toEqual([{ event_type: 'created' }]);
  });

  it('rejects missing required fields', async () => {
    const res = await api().post('/api/tickets').send({ description: 'No title here' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'priority', 'category']));
  });

  it('rejects a whitespace-only title', async () => {
    const res = await api().post('/api/tickets').send(validTicket({ title: '   ' }));
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Title is required');
  });

  it('rejects an invalid priority value', async () => {
    const res = await api().post('/api/tickets').send(validTicket({ priority: 'Urgent' }));
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('priority');
  });

  it('rejects a non-existent assignee', async () => {
    const res = await api().post('/api/tickets').send(validTicket({ assigneeId: 9999 }));
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('assigneeId');
  });

  it('rejects client-supplied status and timestamps', async () => {
    const res = await api()
      .post('/api/tickets')
      .send(validTicket({ status: 'Closed', createdAt: '2000-01-01T00:00:00Z' }));
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].message).toMatch(/Unknown field/);

    const { rows } = await query('SELECT COUNT(*)::int AS count FROM tickets');
    expect(rows[0].count).toBe(0);
  });
});

describe('GET /api/tickets/:id', () => {
  it('returns a ticket by id', async () => {
    const ticket = await createTicket();
    const res = await api().get(`/api/tickets/${ticket.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(ticket.id);
  });

  it('returns 404 for a missing ticket', async () => {
    const res = await api().get('/api/tickets/987654');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for a malformed id', async () => {
    const res = await api().get('/api/tickets/abc');
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/tickets/:id', () => {
  it('edits fields, reassigns, and records timeline events', async () => {
    const ticket = await createTicket({ assigneeId: assignees[0].id });

    const res = await api()
      .patch(`/api/tickets/${ticket.id}`)
      .send({ title: 'Updated title', priority: 'Critical', assigneeId: assignees[1].id });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ title: 'Updated title', priority: 'Critical', assigneeId: assignees[1].id });
    expect(new Date(res.body.data.updatedAt) >= new Date(ticket.updatedAt)).toBe(true);

    const activity = await api().get(`/api/tickets/${ticket.id}/activity`);
    const types = activity.body.data.map((event) => event.type);
    expect(types).toEqual(expect.arrayContaining(['created', 'updated', 'assigned']));
    const assigned = activity.body.data.find((event) => event.type === 'assigned');
    expect(assigned.details).toEqual({
      from: { id: assignees[0].id, name: 'Test Agent One' },
      to: { id: assignees[1].id, name: 'Test Agent Two' },
    });
  });

  it('can unassign a ticket', async () => {
    const ticket = await createTicket({ assigneeId: assignees[0].id });
    const res = await api().patch(`/api/tickets/${ticket.id}`).send({ assigneeId: null });
    expect(res.status).toBe(200);
    expect(res.body.data.assignee).toBeNull();
  });

  it('does not allow changing status through the general edit endpoint', async () => {
    const ticket = await createTicket();
    const res = await api().patch(`/api/tickets/${ticket.id}`).send({ status: 'Closed' });
    expect(res.status).toBe(400);
  });

  it('rejects an empty update body', async () => {
    const ticket = await createTicket();
    const res = await api().patch(`/api/tickets/${ticket.id}`).send({});
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/tickets/:id', () => {
  it('deletes a ticket and its history, then returns 404', async () => {
    const ticket = await createTicket();
    await api().patch(`/api/tickets/${ticket.id}/status`).send({ status: 'In Progress' });

    const res = await api().delete(`/api/tickets/${ticket.id}`);
    expect(res.status).toBe(204);

    expect((await api().get(`/api/tickets/${ticket.id}`)).status).toBe(404);
    const { rows } = await query('SELECT COUNT(*)::int AS count FROM ticket_status_history WHERE ticket_id = $1', [ticket.id]);
    expect(rows[0].count).toBe(0);
  });

  it('returns 404 when deleting a missing ticket', async () => {
    const res = await api().delete('/api/tickets/987654');
    expect(res.status).toBe(404);
  });
});

describe('Unknown routes', () => {
  it('returns a JSON 404', async () => {
    const res = await api().get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
