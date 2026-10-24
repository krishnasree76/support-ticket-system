const { api, query, resetDatabase, closePool } = require('./helpers');

async function insertAt(createdAt, { priority = 'Low', status = 'Open' } = {}) {
  await query(
    `INSERT INTO tickets (title, description, priority, status, category, created_at, updated_at)
     VALUES ('T', 'D', $1, $2, 'General', $3, $3)`,
    [priority, status, createdAt]
  );
}

beforeEach(resetDatabase);
afterAll(closePool);

describe('GET /api/analytics', () => {
  it('returns zeroed KPIs and full chart series for an empty dataset', async () => {
    const res = await api().get('/api/analytics');
    expect(res.status).toBe(200);
    expect(res.body.data.kpis).toMatchObject({ totalTickets: 0, openTickets: 0, resolvedTickets: 0, criticalTickets: 0 });
    expect(res.body.data.byStatus).toEqual([
      { name: 'Open', count: 0 },
      { name: 'In Progress', count: 0 },
      { name: 'Resolved', count: 0 },
      { name: 'Closed', count: 0 },
    ]);
    expect(res.body.data.byPriority.map((p) => p.name)).toEqual(['Low', 'Medium', 'High', 'Critical']);
  });

  it('calculates KPIs and distributions across all tickets', async () => {
    await insertAt('2026-10-01T10:00:00Z', { priority: 'Critical', status: 'Open' });
    await insertAt('2026-10-02T10:00:00Z', { priority: 'Critical', status: 'Resolved' });
    await insertAt('2026-10-03T10:00:00Z', { priority: 'High', status: 'In Progress' });
    await insertAt('2026-10-04T10:00:00Z', { priority: 'Low', status: 'Closed' });
    await insertAt('2026-10-05T10:00:00Z', { priority: 'Medium', status: 'Open' });

    const res = await api().get('/api/analytics');
    expect(res.body.data.kpis).toEqual({
      totalTickets: 5,
      openTickets: 2,
      inProgressTickets: 1,
      resolvedTickets: 1,
      closedTickets: 1,
      criticalTickets: 2,
      unassignedTickets: 5,
    });
    expect(res.body.data.byPriority).toEqual([
      { name: 'Low', count: 1 },
      { name: 'Medium', count: 1 },
      { name: 'High', count: 1 },
      { name: 'Critical', count: 2 },
    ]);
  });

  it('filters by creation date and includes the whole end date (UTC)', async () => {
    await insertAt('2026-09-30T23:59:59Z'); // before range
    await insertAt('2026-10-01T00:00:00Z'); // first instant of range
    await insertAt('2026-10-10T23:59:59Z'); // last second of end date
    await insertAt('2026-10-11T00:00:00Z'); // after range

    const res = await api().get('/api/analytics?startDate=2026-10-01&endDate=2026-10-10');
    expect(res.status).toBe(200);
    expect(res.body.data.kpis.totalTickets).toBe(2);
    expect(res.body.data.range).toEqual({ startDate: '2026-10-01', endDate: '2026-10-10', timezone: 'UTC' });
  });

  it('interprets dates in the requested time zone', async () => {
    // 2026-10-09T20:00Z is 2026-10-10 01:30 in India.
    await insertAt('2026-10-09T20:00:00Z');

    const utc = await api().get('/api/analytics?startDate=2026-10-10&endDate=2026-10-10');
    const ist = await api().get('/api/analytics?startDate=2026-10-10&endDate=2026-10-10&timezone=Asia/Kolkata');
    expect(utc.body.data.kpis.totalTickets).toBe(0);
    expect(ist.body.data.kpis.totalTickets).toBe(1);
  });

  it('supports open-ended ranges', async () => {
    await insertAt('2026-10-01T12:00:00Z');
    await insertAt('2026-10-20T12:00:00Z');

    const fromOnly = await api().get('/api/analytics?startDate=2026-10-15');
    const toOnly = await api().get('/api/analytics?endDate=2026-10-15');
    expect(fromOnly.body.data.kpis.totalTickets).toBe(1);
    expect(toOnly.body.data.kpis.totalTickets).toBe(1);
  });

  it('rejects invalid dates and reversed ranges', async () => {
    expect((await api().get('/api/analytics?startDate=2026-13-01')).status).toBe(400);
    expect((await api().get('/api/analytics?startDate=2026-02-30')).status).toBe(400);
    expect((await api().get('/api/analytics?startDate=yesterday')).status).toBe(400);
    expect((await api().get('/api/analytics?timezone=Mars/Base')).status).toBe(400);

    const reversed = await api().get('/api/analytics?startDate=2026-10-20&endDate=2026-10-01');
    expect(reversed.status).toBe(400);
    expect(reversed.body.error.message).toBe('startDate must be on or before endDate');
  });
});
