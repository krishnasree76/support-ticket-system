# Supportdesk — Support Ticket Management & Analytics System

A full-stack internal tool for a support team to create, triage, assign and resolve tickets, with a backend-driven analytics dashboard and a per-ticket activity timeline.

- **Frontend:** React 18 + Vite, React Router, Axios, Tailwind CSS v4, Recharts, Lucide icons
- **Backend:** Node.js 20 + Express 5, PostgreSQL via `pg`, Zod validation, centralized error handling
- **Database:** Neon serverless PostgreSQL (separate `production`, `dev` and `test` branches)
- **Tests:** Jest + Supertest against an isolated Neon test branch

> **Demo without authentication.** User authentication was not part of the required scope, so it is not implemented. Every visitor shares the same workspace and can create, edit and delete tickets.

---

## Table of contents

1. [Features](#1-features)
2. [Technology stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Folder structure](#4-folder-structure)
5. [Prerequisites](#5-prerequisites)
6. [Local setup](#6-local-setup)
7. [Environment variables](#7-environment-variables)
8. [Neon database configuration](#8-neon-database-configuration)
9. [Migrations and seed data](#9-migrations-and-seed-data)
10. [API reference](#10-api-reference)
11. [Status-transition rules](#11-status-transition-rules)
12. [Analytics date-range behaviour](#12-analytics-date-range-behaviour)
13. [Testing](#13-testing)
14. [Deployment](#14-deployment)
15. [AI-assisted development disclosure](#15-ai-assisted-development-disclosure)
16. [Known limitations and assumptions](#16-known-limitations-and-assumptions)

---

## 1. Features

**Ticket management**
- Create, view, edit and delete tickets. Deletion asks for confirmation first.
- Fields: ID, title, description, priority (`Low`/`Medium`/`High`/`Critical`), status (`Open`/`In Progress`/`Resolved`/`Closed`), category, assignee, created and updated timestamps.
- Assign, reassign or unassign tickets to seeded employees, either from the form or from a quick selector on the details page.
- Status changes are enforced by the backend. Each change writes a status-history row in the same transaction.
- The server generates IDs and timestamps. Clients cannot send `id`, `status`, `createdAt` or `updatedAt` on create or edit; unknown fields are rejected.

**Search, filter, sort, paginate (server-side)**
- Search across title and description, case-insensitive. `%` and `_` are matched as literal text.
- Filter by status, priority, category and assignee (including "Unassigned"). Filters can be combined.
- Sort by created date, updated date, title, priority (by severity) or status (by workflow order), ascending or descending. Ticket ID breaks ties, so paging is stable.
- Page and page size (default 10, maximum 100), with accurate `total` and `totalPages`.
- Filters live in the URL, so they survive navigating to a ticket and back, and links can be shared. Changing a filter resets to page 1.

**Dashboard (analytics computed in PostgreSQL)**
- KPI cards: Total, Open, Resolved and Critical tickets, plus context such as in-progress, closed and unassigned counts.
- Bar charts for tickets by status and by priority. Each chart has hover tooltips, direct value labels and a table view.
- Date-range filter with presets (7, 30 or 90 days, all time) and a custom start/end date.
- Data refreshes automatically after any ticket change, without a full page reload.

**Additional challenge: activity timeline**
- The ticket details page shows a timeline of creation, status changes (previous → new), assignment changes and field edits, each with a timestamp, newest first.
- A dedicated status-history panel is backed by `GET /api/tickets/:id/history`.

**UX**
- Fixed sidebar on desktop, slide-in drawer on mobile, sticky header with global search and a **Create ticket** button.
- Skeleton loaders, empty states, error states with retry, success and error toasts, and confirmation dialogs.
- Buttons are disabled while their request is pending, so a double-click cannot submit twice.
- Accessibility: Labelled inputs, sortable-column indicators, focus-trapped dialogs that close on Escape, visible focus rings, a skip link, and live-region notifications.

## 2. Technology stack

| Layer | Choice | Why |
|---|---|---|
| UI | React 18, Vite 6, React Router 6 | Fast dev server; URL-driven state |
| Styling | Tailwind CSS v4 | Consistent design tokens without a component library |
| Charts | Recharts 2 | Declarative React charts |
| HTTP | Axios | One instance with a base URL and error helpers |
| API | Express 5 | Async errors propagate to the error middleware automatically |
| Validation | Zod 3 | One schema per request: validates, trims, coerces and sets defaults |
| DB driver | `pg` (node-postgres) | A long-running Express server suits a standard connection pool |
| Database | Neon PostgreSQL | Branching gives isolated dev and test databases |
| Testing | Jest 29 + Supertest 7 | In-process HTTP tests against the real SQL |

## 3. Architecture

```
Browser (React SPA, Vercel)
   │  Axios  →  VITE_API_BASE_URL (…/api)
   ▼
Express API (Render)
   routes/        URL → middleware → controller
   middleware/    validate(zod) · errorHandler · notFound
   controllers/   HTTP in/out only
   services/      business rules + parameterized SQL + transactions
   db/pool.js     single pg Pool (SSL verify-full)
   ▼
Neon PostgreSQL  (pooled endpoint for the app, direct endpoint for migrations)
```

Request flow example, `PATCH /api/tickets/7/status`:
1. `validate(idParamSchema)` and `validate(updateStatusSchema)` reject malformed IDs or unknown statuses with a 400.
2. The controller calls `ticketService.updateTicketStatus(7, 'Resolved')`.
3. The service opens a transaction and locks the row with `SELECT … FOR UPDATE`, so concurrent changes cannot race. It then:
   - returns unchanged (and writes no history) if the status is already the same;
   - throws `INVALID_STATUS_TRANSITION` (400) if the move isn't allowed;
   - otherwise updates the ticket and inserts the `ticket_status_history` and `ticket_activity` rows, then commits. Any failure rolls everything back.
4. The error handler turns any thrown error into the standard JSON error shape.

On the frontend, `AppDataContext` holds a `dataVersion` counter. Every successful mutation increments it. Pages list it as a dependency of their data hooks, so only the data currently on screen refetches, once.

### Database schema

| Table | Purpose | Key constraints |
|---|---|---|
| `assignees` | Employees | `email UNIQUE` |
| `tickets` | Tickets | `CHECK` on priority/status enums and non-blank title/description/category; `assignee_id → assignees ON DELETE SET NULL` |
| `ticket_status_history` | Status audit trail | `ticket_id → tickets ON DELETE CASCADE`; `CHECK (previous_status <> new_status)` |
| `ticket_activity` | Timeline events (`created`, `updated`, `assigned`, `status_changed`) with JSONB details | `ticket_id → tickets ON DELETE CASCADE` |
| `schema_migrations` | Applied migration files | primary key on filename |

Indexes cover status, priority, category, assignee, (created_at, id) and (updated_at, id). Trigram GIN indexes are defined for title and description to support substring searches using ILIKE '%term%'. Actual performance depends on the query and dataset size.

**Foreign-key policy:** deleting a ticket removes its history and activity (cascade), so no orphaned rows remain. Deleting an employee unassigns their tickets instead of deleting them.

## 4. Folder structure

```
support-ticket-system/
├── package.json            root scripts (install:all, dev, test, build, …)
├── neon.ts                 Neon project config (created by `neon init`)
├── render.yaml             Render blueprint for the API
├── backend/
│   ├── migrations/001_initial_schema.sql
│   ├── scripts/            migrate.js · seed.js · check-syntax.js
│   ├── src/
│   │   ├── config/env.js   validated configuration
│   │   ├── db/             pool.js (pg Pool + withTransaction) · migrate.js
│   │   ├── routes/ controllers/ services/ middleware/ validators/
│   │   ├── utils/          constants.js (enums + transitions) · AppError.js
│   │   ├── app.js          builds the Express app (used by tests)
│   │   └── server.js       starts it, graceful shutdown
│   └── tests/              Jest + Supertest suites
└── frontend/
    ├── vercel.json         SPA rewrite
    └── src/
        ├── api/            axios client + endpoint functions
        ├── components/     Sidebar, PageHeader, DashboardCards, TicketTable, TicketFilters,
        │                   TicketForm, Badges, Pagination, ActivityTimeline, Modal,
        │                   ConfirmationDialog, DistributionChart, DateRangeFilter, States…
        ├── context/        AppData · Toast · TicketForm providers
        ├── hooks/          useApi · useTicketQuery · useDeleteTicket · useDebouncedValue
        ├── pages/          Dashboard · Tickets · TicketDetails · NotFound
        └── utils/format.js
```

## 5. Prerequisites

- Node.js **20.19+** (developed on 20.20.1) and npm 10+
- A Neon account and project, plus the Neon CLI: `npm i -g neon@latest`
- Git

## 6. Local setup

```bash
# 1. Install dependencies for root, backend and frontend
npm run install:all

# 2. Configure the backend
cp backend/.env.example backend/.env
#    fill in DATABASE_URL, DATABASE_URL_UNPOOLED and TEST_DATABASE_URL (see §8)

# 3. Create the schema and (optionally) demo data in your DEV database
npm run migrate
npm run seed

# 4. Run API (http://localhost:5000) and web app (http://localhost:5173) together
npm run dev
```

In development the frontend needs no `.env`: Vite proxies `/api` to `http://localhost:5000`.

| Command (from repo root) | What it does |
|---|---|
| `npm run install:all` | Installs root, backend and frontend dependencies |
| `npm run dev` | Starts the API (with `--watch`) and Vite together |
| `npm run dev:backend` / `npm run dev:frontend` | Starts one side only |
| `npm run migrate` | Applies pending SQL migrations |
| `npm run seed` | Adds demo assignees and tickets (non-destructive, see §9) |
| `npm test` | Runs the backend test suite against `TEST_DATABASE_URL` |
| `npm run lint` | ESLint (frontend) plus a syntax check of every backend file |
| `npm run build` | Production build of the frontend into `frontend/dist` |
| `npm start` | Starts the API in production mode |

## 7. Environment variables

### Backend (`backend/.env`, Render dashboard in production)

| Variable | Required | Example | Notes |
|---|---|---|---|
| `NODE_ENV` | yes | `development` / `production` | `production` hides internal error messages |
| `PORT` | no | `5000` | Render sets this automatically |
| `DATABASE_URL` | yes | `postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require` | **Pooled** Neon URL used by the app |
| `DATABASE_URL_UNPOOLED` | recommended | `postgresql://USER:PASSWORD@ep-xxx.REGION.aws.neon.tech/neondb?sslmode=require` | **Direct** URL used by migrations and seeding |
| `CORS_ORIGIN` | yes | `http://localhost:5173,https://your-app.vercel.app` | Comma-separated list of allowed origins, no trailing slash |
| `TEST_DATABASE_URL` | for tests | separate test branch URL | Must differ from `DATABASE_URL`; tests truncate it |
| `DB_POOL_MAX` | no | `10` | pg pool size |

### Frontend (`frontend/.env`, Vercel dashboard in production)

| Variable | Required | Example |
|---|---|---|
| `VITE_API_BASE_URL` | production only | `https://support-ticket-api.onrender.com/api` (must include `/api`) |

Real `.env` files are git-ignored. Only `.env.example` files are committed.

## 8. Neon database configuration

The workspace was linked with:

```bash
neon init -y --no-agent-setup --org-id <org-id> --project-id <project-id> --branch production --services postgres
```

This created `neon.ts` and `.neon`, and pulled the production branch's connection strings into `.env.local`, which is git-ignored. `neon config plan` reported no changes, so `neon deploy` was not needed.

Three branches keep the data isolated:

| Neon branch | Used by | Contents |
|---|---|---|
| `production` | Deployed API (Render) | Real or demo data. Never touched by tests. |
| `dev` | Local `npm run dev` | Seeded demo data |
| `test` | `npm test` only | Isolated test data, cleared as part of test setup. Never use the production database for tests. |

```bash
neon branches create --name dev  --parent production
neon branches create --name test --parent production
neon connection-string dev --pooled   # → DATABASE_URL
neon connection-string dev            # → DATABASE_URL_UNPOOLED
neon connection-string test           # → TEST_DATABASE_URL
```

**Driver and SSL.** The app uses one `pg.Pool` against Neon's *pooled* (PgBouncer) endpoint. Migrations use the *direct* endpoint, as Neon recommends for DDL. Neon URLs use `sslmode=require`; `config/env.js` upgrades this to `sslmode=verify-full`, so the server certificate is verified too. The pool tolerates Neon scale-to-zero cold starts (15 s connect timeout) and logs, instead of crashing on, errors from idle clients.

## 9. Migrations and seed data

- `npm run migrate` applies every `backend/migrations/*.sql` file not yet listed in `schema_migrations`. Each file runs in its own transaction, and an advisory lock prevents two deploys from migrating at once. Running it repeatedly is safe. It never drops anything.
- To change the schema, add a new file (e.g. `002_add_due_date.sql`); applied files must not be edited.
- `npm run seed` is **non-destructive**. It never deletes, truncates or updates rows:
  - It inserts 8 demo assignees with `ON CONFLICT (email) DO NOTHING`.
  - It inserts 30 demo tickets, with realistic status history and timeline events, **only if the tickets table is empty**.
  - It refuses to run with `NODE_ENV=production` unless you pass `npm run seed -- --allow-production`.

## 10. API reference

Base URL: `http://localhost:5000/api` locally.

**Response shapes**

- Single resource: `{ "data": { ... } }`
- List: `{ "data": [ ... ], "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }`
- Error: `{ "error": { "code": "ERROR_CODE", "message": "Error message", "details": ... } }`

The `details` field depends on the error type. Validation errors provide field-level details, while invalid status transitions provide the current status, requested status, and allowed transitions. Some errors may omit additional details.

Error codes include `VALIDATION_ERROR` (400), `INVALID_STATUS_TRANSITION` (400), `INVALID_JSON` (400), `NOT_FOUND` (404), and `INTERNAL_SERVER_ERROR` (500). In production, 500 responses do not expose stack traces, SQL, or connection details.

**Ticket object**
```json
{
  "id": 12, "title": "Payment gateway timeout", "description": "…",
  "priority": "Critical", "status": "In Progress", "category": "Payments",
  "assigneeId": 3, "assignee": { "id": 3, "name": "Rohan Mehta", "email": "rohan.mehta@example.com" },
  "createdAt": "2026-10-20T09:15:00.000Z", "updatedAt": "2026-10-21T11:02:00.000Z"
}
```

| Method & path | Description | Success |
|---|---|---|
| `GET /api/health` | API and database status; returns 503 if the DB is unreachable | 200 `{ status, database, timestamp }` |
| `GET /api/meta` | Allowed priorities, statuses, categories and status transitions | 200 |
| `GET /api/assignees` | Employees, with their count of active tickets | 200 |
| `GET /api/tickets` | Search, filter, sort and paginate (parameters below) | 200 list |
| `GET /api/tickets/:id` | One ticket | 200 / 404 |
| `POST /api/tickets` | Create. Body: `title`, `description`, `priority`, `category` (required); `assigneeId` (optional, number or `null`) | 201 |
| `PATCH /api/tickets/:id` | Edit any of `title`, `description`, `priority`, `category`, `assigneeId` (`null` unassigns); at least one field | 200 |
| `PATCH /api/tickets/:id/status` | Body `{ "status": "Resolved" }`; enforces transitions. Response `meta.changed` is `false` if the status was already the same. | 200 / 400 / 404 |
| `DELETE /api/tickets/:id` | Delete a ticket and, via cascade, its history | 204 / 404 |
| `GET /api/tickets/:id/history` | Status changes `{ id, ticketId, previousStatus, newStatus, changedAt }`, newest first | 200 / 404 |
| `GET /api/tickets/:id/activity` | Timeline events `{ id, ticketId, type, details, createdAt }`, newest first | 200 / 404 |
| `GET /api/analytics` | KPIs and chart series (see §12) | 200 |

**`GET /api/tickets` query parameters**

| Param | Values | Default |
|---|---|---|
| `search` | text (matched in title or description) | — |
| `status` | `Open`, `In Progress`, `Resolved`, `Closed` | — |
| `priority` | `Low`, `Medium`, `High`, `Critical` | — |
| `category` | `Technical`, `Billing`, `Payments`, `Account`, `Bug`, `Feature Request`, `General` | — |
| `assigneeId` | positive integer or `unassigned` | — |
| `page` | ≥ 1 | 1 |
| `limit` | 1–100 | 10 |
| `sortBy` | `createdAt`, `updatedAt`, `title`, `priority`, `status` | `createdAt` |
| `order` | `asc`, `desc` | `desc` |

Example: `GET /api/tickets?search=payment&status=Open&priority=Critical&category=Payments&assigneeId=3&page=1&limit=10&sortBy=createdAt&order=desc`

Invalid values (e.g. `status=Done`, `sortBy=password`, `limit=1000`, `/tickets/abc`) return 400. Sort fields map to a whitelist of SQL expressions, and every user value is a bound parameter.

## 11. Status-transition rules

| From | Allowed to |
|---|---|
| Open | In Progress |
| In Progress | Open, Resolved |
| Resolved | In Progress, Closed |
| Closed | — (final) |

- New tickets always start as **Open**.
- Status can only change through `PATCH /api/tickets/:id/status`. The general edit endpoint rejects a `status` field.
- An unsupported transition returns **400** `INVALID_STATUS_TRANSITION`, with `details: { currentStatus, requestedStatus, allowedTransitions }`. The ticket is left untouched and no history is written.
- Requesting the current status returns 200 with `meta.changed: false` and writes no history.
- The ticket update and the history and activity inserts share one transaction. If any of them fails, all are rolled back; a test covers this by forcing the history insert to fail.
- The UI reads the rules from `GET /api/meta` and only offers allowed moves, but the backend is the authority.

## 12. Analytics date-range behaviour

`GET /api/analytics?startDate=2026-10-01&endDate=2026-10-24&timezone=Asia/Kolkata`

- Tickets are filtered by **creation date** (`created_at`).
- `startDate` and `endDate` are calendar dates (`YYYY-MM-DD`) in `timezone`, an IANA name that defaults to `UTC`. The dashboard sends the browser's time zone, so "today" means the user's today.
- The range is **inclusive of the whole end date**: `created_at >= startDate 00:00` and `created_at < (endDate + 1 day) 00:00`, both in `timezone`. Boundaries are computed values, so the `created_at` index stays usable.
- **No dates:** all tickets. **Only `startDate`:** from that day on. **Only `endDate`:** up to and including that day.
- Invalid dates (`2026-13-01`, `2026-02-30`, `yesterday`), invalid time zones, and `startDate > endDate` return 400.
- All numbers come from SQL (`COUNT(*) FILTER (…)`, plus `unnest … LEFT JOIN` so every status and priority appears, even with a count of 0). Empty ranges return zeros, and the UI shows "No tickets in this period" instead of empty bars.

Response:
```json
{ "data": {
  "range": { "startDate": "2026-10-01", "endDate": "2026-10-24", "timezone": "Asia/Kolkata" },
  "kpis": { "totalTickets": 30, "openTickets": 9, "inProgressTickets": 5, "resolvedTickets": 8,
            "closedTickets": 8, "criticalTickets": 5, "unassignedTickets": 4 },
  "byStatus":   [ { "name": "Open", "count": 9 }, … ],
  "byPriority": [ { "name": "Low", "count": 8 }, … ]
} }
```

KPI definitions: **Open** = status `Open`; **Resolved** = status `Resolved` (closed tickets are counted separately); **Critical** = priority `Critical`, any status.

## 13. Testing

The backend automated test suite uses **Jest** and **Supertest** to validate API behavior.

### Test coverage

The test suite covers:

- **Ticket management:** Creating and retrieving tickets, including validation and error cases.
- **Status transitions:** Valid and invalid status changes.
- **Filtering and pagination:** Listing tickets with query parameters.
- **Analytics:** API responses for ticket analytics.

### Running the tests

From the backend directory, run:

```bash
npm test
```

Ensure `TEST_DATABASE_URL` in your backend environment configuration points to the isolated test database before running the suite. The tests modify and clear test data, so do not point this variable at the production database.

### Latest test result

The latest local test run completed successfully:

- Test suites passed: **4 of 4**
- Tests passed: **44 of 44**
- Snapshots: **0**
- Result: **All tests passed**

This result reflects the test run performed during development. Run the suite again after making backend changes to verify that the tests still pass.

## 14. Deployment

### Backend on Render
1. Push the repository to GitHub.
2. In Render, choose **New → Blueprint**, select the repo, and it reads `render.yaml`. Or create a **Web Service** manually:
   - Root directory: `backend`
   - Build command: `npm ci`
   - Start command: `npm run migrate && npm start`
   - Health check path: `/api/health`
3. Environment variables:
   - `NODE_ENV=production`
   - `DATABASE_URL`: production branch, pooled (`neon connection-string production --pooled`)
   - `DATABASE_URL_UNPOOLED`: production branch, direct (`neon connection-string production`)
   - `CORS_ORIGIN`: your Vercel URL, e.g. `https://supportdesk.vercel.app`
4. After it deploys, check `https://<service>.onrender.com/api/health` → `{"status":"ok","database":"connected"}`.
5. Optional demo data on production: `npm run seed -- --allow-production` from a shell with the production URLs (inserts only into an empty tickets table).

### Frontend on Vercel
1. **Add New → Project**, import the repo, and set **Root Directory** to `frontend`.
2. Framework preset: Vite. Build command `npm run build`. Output directory `dist`.
3. Environment variable `VITE_API_BASE_URL=https://<service>.onrender.com/api`, then deploy. Vite inlines it at build time, so redeploy after changing it.
4. `vercel.json` rewrites every path to `index.html`, so deep links like `/tickets/12` work.
5. Add the final Vercel URL to Render's `CORS_ORIGIN` if it differs.

Render's free tier sleeps when idle, so the first request after a while can take around 30–60 s.

## 15. AI-Assisted Development Disclosure

I developed this Support Ticket Management & Analytics System with assistance from AI coding tools, including **Claude (Claude Code in VS Code)** and **ChatGPT**.

### How I used AI tools

I used AI assistance to accelerate development and help me work through unfamiliar implementation details. The tools supported me with:

- **Backend development:** Scaffolding and refining Express routes, request validation with Zod, database queries, service logic, and database migrations.
- **Frontend development:** Building React components, integrating the frontend with the REST API, and implementing ticket management, filters, analytics, and activity history.
- **Testing and debugging:** Helping create backend tests with Jest and Supertest, interpret errors, and troubleshoot implementation and deployment issues.

### My contribution and validation

I directed the project requirements, worked through the implementation and integration process, configured the database and deployment, and investigated and resolved development issues. I reviewed the generated code and tested the application through the available validation steps rather than relying on generated code alone.

My validation included:

- Successfully deploying the backend API and checking its health endpoint.
- Connecting the deployed React frontend to the backend API.
- Verifying the production database schema and application data.
- Running the backend automated test suite locally against the configured test database: **4 test suites passed, with 44 tests passing**.

AI assistance accelerated development, but I am responsible for the submitted code and its behavior. I have reviewed the implementation and validated key parts of the application. I will continue studying the code in depth so I can confidently explain the architecture, API design, database relationships, status-transition rules, analytics, and testing decisions.

## 16. Known limitations and assumptions

- **No authentication or authorization.** All visitors share one workspace, and the timeline does not record *who* made a change.
- **Assignees are seeded only.** There is no UI or API to add or remove employees.
- **Categories are a fixed list**, defined in `backend/src/utils/constants.js` and enforced by validation, not a database table.
- Description edits are recorded in the timeline as "Description was edited", not as a diff.
- Search uses `ILIKE` with trigram indexes. It does not do relevance ranking or full-text stemming.
- Dashboard charts summarise by creation date only. There is no resolution-time or SLA analytics.
- Two users can edit the same ticket; the last write wins for plain fields. Status changes are protected by row locks and the transition rules.
- Render's free plan has cold starts, and the Neon compute scales to zero (first query after idle is slower).
- There are no frontend unit tests. Backend behavior is covered by the Jest and Supertest suite; frontend behavior has been checked manually during development where applicable.

## Submission

- GitHub repository: https://github.com/krishnasree76/support-ticket-system
- Live application: https://support-ticket-system-sooty.vercel.app/ · API: https://support-ticket-api-cxf3.onrender.com/
- Explanation video (Google Drive, viewable by link): _add URL_
