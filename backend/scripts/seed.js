// Usage: npm run seed            (dev / staging databases)
//        npm run seed -- --allow-production   (explicit opt-in for NODE_ENV=production)
//
// Safe by design. This script NEVER deletes, truncates, or updates rows:
//  - Assignees are inserted with ON CONFLICT (email) DO NOTHING.
//  - Demo tickets are inserted ONLY if the tickets table is empty.
const config = require('../src/config/env');
const { Client } = require('pg');

if (config.isProduction && !process.argv.includes('--allow-production')) {
  console.error('Refusing to seed with NODE_ENV=production. Re-run with --allow-production if you are sure.');
  process.exit(1);
}

const ASSIGNEES = [
  ['Aarav Sharma', 'aarav.sharma@example.com'],
  ['Priya Nair', 'priya.nair@example.com'],
  ['Rohan Mehta', 'rohan.mehta@example.com'],
  ['Ananya Iyer', 'ananya.iyer@example.com'],
  ['Vikram Rao', 'vikram.rao@example.com'],
  ['Sneha Kapoor', 'sneha.kapoor@example.com'],
  ['Daniel Brooks', 'daniel.brooks@example.com'],
  ['Meera Pillai', 'meera.pillai@example.com'],
];

// [title, description, priority, category, finalStatus, daysAgo, assigneeIndex | null]
const TICKETS = [
  ['Payment gateway timeout on checkout', 'Customers report the checkout spinner hangs for 30s and then fails when paying by card. Started after the last deploy.', 'Critical', 'Payments', 'In Progress', 1, 0],
  ['Refund not reflected after 7 days', 'Customer #48213 was promised a refund on the 3rd; bank statement still shows the charge.', 'High', 'Payments', 'Open', 2, 1],
  ['Unable to reset password', 'Password reset emails are not arriving for Outlook addresses. Checked spam folder.', 'High', 'Account', 'Resolved', 3, 2],
  ['Invoice PDF shows wrong GST amount', 'Generated invoices round GST per line item instead of on the total, causing a 1 rupee mismatch.', 'Medium', 'Billing', 'In Progress', 4, 3],
  ['Dashboard loads slowly for large accounts', 'Accounts with more than 10k records take 12+ seconds to render the dashboard.', 'Medium', 'Technical', 'Open', 5, 4],
  ['Add dark mode to the web app', 'Several enterprise customers have asked for a dark theme for late shifts.', 'Low', 'Feature Request', 'Open', 6, null],
  ['Two-factor codes rejected', 'TOTP codes are rejected for users whose phone clock is slightly off. Consider a wider time window.', 'Critical', 'Account', 'Resolved', 7, 5],
  ['CSV export missing header row', 'Exported ticket CSVs no longer include the header row since version 4.2.', 'Low', 'Bug', 'Closed', 9, 6],
  ['Duplicate charge on annual plan renewal', 'Customer was charged twice for annual renewal. Needs urgent refund and root-cause analysis.', 'Critical', 'Payments', 'Resolved', 10, 0],
  ['Mobile app crashes on Android 14', 'App crashes on launch on Pixel 8 devices running Android 14 after the latest update.', 'High', 'Bug', 'In Progress', 11, 7],
  ['Update company billing address', 'Customer wants to change the billing address that appears on future invoices.', 'Low', 'Billing', 'Closed', 12, 3],
  ['SSO login loop with Okta', 'Users authenticating via Okta are redirected back to the login page repeatedly.', 'High', 'Account', 'Open', 13, 2],
  ['API rate limit too strict for integrations', 'Partner integration hits 429 errors during nightly sync; requests a higher limit.', 'Medium', 'Technical', 'Resolved', 14, 4],
  ['Search results ignore accented characters', 'Searching "resume" does not match "résumé" in the knowledge base.', 'Low', 'Bug', 'Open', 15, null],
  ['Card declined for international customers', 'Customers outside India get "card declined" even with valid cards. Possibly 3DS related.', 'High', 'Payments', 'In Progress', 16, 1],
  ['Request bulk user import', 'Admin wants to import 300 users from a spreadsheet instead of inviting them one by one.', 'Medium', 'Feature Request', 'Open', 18, 5],
  ['Email notifications delayed by hours', 'Ticket update emails are arriving 2-3 hours late. Queue backlog suspected.', 'High', 'Technical', 'Resolved', 19, 6],
  ['Subscription downgrade not applied', 'Customer downgraded to the Basic plan but is still billed for Pro.', 'Medium', 'Billing', 'Closed', 21, 3],
  ['Account locked after failed logins', 'User locked out after 3 failed attempts; requests manual unlock.', 'Medium', 'Account', 'Closed', 22, 2],
  ['Webhook signatures failing verification', 'Customers verifying webhook HMAC signatures see mismatches for payloads with unicode.', 'Critical', 'Technical', 'Open', 24, 7],
  ['Typo on pricing page', 'The pricing page says "anually" instead of "annually".', 'Low', 'General', 'Closed', 25, null],
  ['UPI payments stuck in pending', 'UPI transactions remain pending for over an hour before failing.', 'Critical', 'Payments', 'Closed', 27, 0],
  ['Report filters reset on refresh', 'Applied report filters are lost when the page is refreshed.', 'Medium', 'Bug', 'Resolved', 29, 4],
  ['Need GST invoice for March', 'Customer needs a GST-compliant invoice re-issued for March for their audit.', 'Low', 'Billing', 'Resolved', 31, 1],
  ['Calendar integration shows wrong time zone', 'Events synced to Google Calendar appear one hour off for users in IST.', 'Medium', 'Technical', 'In Progress', 33, 5],
  ['Request audit log export', 'Compliance team requests the ability to export audit logs for the last 12 months.', 'Medium', 'Feature Request', 'Open', 35, null],
  ['Profile picture upload fails', 'Uploading PNGs larger than 2MB returns a generic error.', 'Low', 'Bug', 'Closed', 38, 6],
  ['Change account owner', 'Founder has left the company; customer wants ownership moved to the new admin.', 'Medium', 'Account', 'Resolved', 40, 2],
  ['Data sync failing for Salesforce connector', 'Salesforce sync stopped at 2am with an OAuth token refresh error.', 'High', 'Technical', 'Closed', 42, 7],
  ['General question about data retention', 'Customer asks how long deleted tickets are retained in backups.', 'Low', 'General', 'Open', 44, 3],
];

// The sequence of status changes needed to reach each final status.
const STATUS_PATHS = {
  Open: [],
  'In Progress': ['In Progress'],
  Resolved: ['In Progress', 'Resolved'],
  Closed: ['In Progress', 'Resolved', 'Closed'],
};

const HOUR = 60 * 60 * 1000;

async function seed() {
  const client = new Client({ connectionString: config.migrationDatabaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');

    for (const [name, email] of ASSIGNEES) {
      await client.query(
        'INSERT INTO assignees (name, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING',
        [name, email]
      );
    }
    const { rows: assigneeRows } = await client.query(
      'SELECT id, name, email FROM assignees WHERE email = ANY($1)',
      [ASSIGNEES.map(([, email]) => email)]
    );
    const byEmail = new Map(assigneeRows.map((row) => [row.email, row]));
    console.log(`Assignees available: ${assigneeRows.length}`);

    const { rows: countRows } = await client.query('SELECT COUNT(*)::int AS count FROM tickets');
    if (countRows[0].count > 0) {
      console.log(`Tickets table already has ${countRows[0].count} row(s); skipping demo tickets.`);
      await client.query('COMMIT');
      return;
    }

    const now = Date.now();
    for (const [title, description, priority, category, finalStatus, daysAgo, assigneeIndex] of TICKETS) {
      const assignee = assigneeIndex === null ? null : byEmail.get(ASSIGNEES[assigneeIndex][1]);
      const createdAt = new Date(now - daysAgo * 24 * HOUR - 3 * HOUR);

      const { rows } = await client.query(
        `INSERT INTO tickets (title, description, priority, category, assignee_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING id`,
        [title, description, priority, category, assignee ? assignee.id : null, createdAt]
      );
      const ticketId = rows[0].id;

      await client.query(
        `INSERT INTO ticket_activity (ticket_id, event_type, details, created_at) VALUES ($1, 'created', $2, $3)`,
        [
          ticketId,
          JSON.stringify({
            title,
            priority,
            status: 'Open',
            category,
            assignee: assignee ? { id: assignee.id, name: assignee.name } : null,
          }),
          createdAt,
        ]
      );

      // Replay a realistic status history, spacing changes a few hours apart.
      let previous = 'Open';
      let changedAt = createdAt;
      for (const next of STATUS_PATHS[finalStatus]) {
        changedAt = new Date(Math.min(changedAt.getTime() + 5 * HOUR, now - HOUR));
        await client.query(
          'INSERT INTO ticket_status_history (ticket_id, previous_status, new_status, changed_at) VALUES ($1, $2, $3, $4)',
          [ticketId, previous, next, changedAt]
        );
        await client.query(
          `INSERT INTO ticket_activity (ticket_id, event_type, details, created_at) VALUES ($1, 'status_changed', $2, $3)`,
          [ticketId, JSON.stringify({ from: previous, to: next }), changedAt]
        );
        previous = next;
      }

      await client.query('UPDATE tickets SET status = $1, updated_at = $2 WHERE id = $3', [
        finalStatus,
        changedAt,
        ticketId,
      ]);
    }

    await client.query('COMMIT');
    console.log(`Inserted ${TICKETS.length} demo tickets.`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
