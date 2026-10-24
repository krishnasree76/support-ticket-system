const { api, query, resetDatabase, createAssignees, closePool } = require('./helpers');

let assignees;

// Inserts tickets directly with controlled timestamps so ordering is predictable.
async function insertTicket({ title, description = 'Details', priority = 'Low', status = 'Open', category = 'General', assigneeId = null, minutesAgo = 0 }) {
  const { rows } = await query(
    `INSERT INTO tickets (title, description, priority, status, category, assignee_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW() - make_interval(mins => $7), NOW() - make_interval(mins => $7))
     RETURNING id`,
    [title, description, priority, status, category, assigneeId, minutesAgo]
  );
  return rows[0].id;
}

beforeAll(async () => {
  await resetDatabase();
  assignees = await createAssignees();

  await insertTicket({ title: 'Payment declined', priority: 'Critical', status: 'Open', category: 'Payments', assigneeId: assignees[0].id, minutesAgo: 10 });
  await insertTicket({ title: 'Payment page slow', priority: 'Critical', status: 'In Progress', category: 'Payments', minutesAgo: 20 });
  await insertTicket({ title: 'Login broken', description: 'payment form unrelated', priority: 'High', status: 'Open', category: 'Account', assigneeId: assignees[1].id, minutesAgo: 30 });
  await insertTicket({ title: 'Invoice typo', priority: 'Low', status: 'Resolved', category: 'Billing', minutesAgo: 40 });
  // 12 extra low-priority tickets for pagination tests.
  for (let i = 1; i <= 12; i += 1) {
    await insertTicket({ title: `Bulk ticket ${String(i).padStart(2, '0')}`, priority: 'Medium', status: 'Open', category: 'Technical', minutesAgo: 100 + i });
  }
});

afterAll(closePool);

describe('GET /api/tickets', () => {
  it('returns the default page with pagination metadata', async () => {
    const res = await api().get('/api/tickets');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(10);
    expect(res.body.pagination).toEqual({ page: 1, limit: 10, total: 16, totalPages: 2 });
    // Default sort: newest first.
    expect(res.body.data[0].title).toBe('Payment declined');
  });

  it('filters by status and priority together', async () => {
    const res = await api().get('/api/tickets?status=Open&priority=Critical');
    expect(res.status).toBe(200);
    expect(res.body.data.map((t) => t.title)).toEqual(['Payment declined']);
    expect(res.body.pagination.total).toBe(1);
  });

  it('searches title and description case-insensitively', async () => {
    const res = await api().get('/api/tickets?search=PAYMENT');
    expect(res.body.data.map((t) => t.title).sort()).toEqual(['Login broken', 'Payment declined', 'Payment page slow']);
    expect(res.body.pagination.total).toBe(3);
  });

  it('combines search with other filters', async () => {
    const res = await api().get('/api/tickets?search=payment&category=Payments&status=In%20Progress');
    expect(res.body.data.map((t) => t.title)).toEqual(['Payment page slow']);
  });

  it('filters by assignee and by unassigned', async () => {
    const one = await api().get(`/api/tickets?assigneeId=${assignees[1].id}`);
    expect(one.body.data.map((t) => t.title)).toEqual(['Login broken']);

    const unassigned = await api().get('/api/tickets?assigneeId=unassigned&limit=100');
    expect(unassigned.body.pagination.total).toBe(14);
  });

  it('paginates filtered results with correct counts', async () => {
    const page1 = await api().get('/api/tickets?search=bulk&limit=5&page=1&sortBy=title&order=asc');
    const page3 = await api().get('/api/tickets?search=bulk&limit=5&page=3&sortBy=title&order=asc');

    expect(page1.body.pagination).toEqual({ page: 1, limit: 5, total: 12, totalPages: 3 });
    expect(page1.body.data.map((t) => t.title)).toEqual([
      'Bulk ticket 01', 'Bulk ticket 02', 'Bulk ticket 03', 'Bulk ticket 04', 'Bulk ticket 05',
    ]);
    expect(page3.body.data.map((t) => t.title)).toEqual(['Bulk ticket 11', 'Bulk ticket 12']);
  });

  it('returns an empty page beyond the last page', async () => {
    const res = await api().get('/api/tickets?page=50');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(16);
  });

  it('sorts by priority severity', async () => {
    const res = await api().get('/api/tickets?sortBy=priority&order=desc&limit=3');
    expect(res.body.data.map((t) => t.priority)).toEqual(['Critical', 'Critical', 'High']);
  });

  it('treats LIKE wildcards in search as literal text', async () => {
    const res = await api().get('/api/tickets?search=%25');
    expect(res.body.pagination.total).toBe(0);
  });

  it('rejects invalid query parameters', async () => {
    expect((await api().get('/api/tickets?status=Done')).status).toBe(400);
    expect((await api().get('/api/tickets?sortBy=password')).status).toBe(400);
    expect((await api().get('/api/tickets?limit=1000')).status).toBe(400);
    expect((await api().get('/api/tickets?page=0')).status).toBe(400);
    expect((await api().get('/api/tickets?assigneeId=abc')).status).toBe(400);
  });
});

describe('GET /api/assignees', () => {
  it('lists assignees', async () => {
    const res = await api().get('/api/assignees');
    expect(res.status).toBe(200);
    expect(res.body.data.map((a) => a.name)).toEqual(['Test Agent One', 'Test Agent Two']);
    expect(res.body.data[0].activeTickets).toBe(1);
  });
});
