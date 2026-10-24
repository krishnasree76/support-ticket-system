-- 001_initial_schema.sql
-- Core schema for the Support Ticket Management & Analytics System.
-- Applied once by scripts/migrate.js and recorded in schema_migrations.

-- Trigram indexes make ILIKE '%term%' search on title/description fast.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE assignees (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL CHECK (length(btrim(name)) > 0),
  email       VARCHAR(255) NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE tickets (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(200) NOT NULL CHECK (length(btrim(title)) > 0),
  description  TEXT         NOT NULL CHECK (length(btrim(description)) > 0),
  priority     VARCHAR(20)  NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  status       VARCHAR(20)  NOT NULL DEFAULT 'Open'
               CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  category     VARCHAR(50)  NOT NULL CHECK (length(btrim(category)) > 0),
  -- Deleting an employee leaves their tickets unassigned rather than deleting them.
  assignee_id  INTEGER      REFERENCES assignees(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Status-change audit trail. History belongs to its ticket: deleting a ticket
-- removes its history (ON DELETE CASCADE) so no orphaned rows remain.
CREATE TABLE ticket_status_history (
  id               SERIAL PRIMARY KEY,
  ticket_id        INTEGER     NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  previous_status  VARCHAR(20) NOT NULL
                   CHECK (previous_status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  new_status       VARCHAR(20) NOT NULL
                   CHECK (new_status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  changed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (previous_status <> new_status)
);

-- Broader activity timeline: creation, field edits, assignment and status changes.
CREATE TABLE ticket_activity (
  id          SERIAL PRIMARY KEY,
  ticket_id   INTEGER     NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  event_type  VARCHAR(30) NOT NULL
              CHECK (event_type IN ('created', 'updated', 'assigned', 'status_changed')),
  details     JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common filters and sorts.
CREATE INDEX idx_tickets_status      ON tickets (status);
CREATE INDEX idx_tickets_priority    ON tickets (priority);
CREATE INDEX idx_tickets_category    ON tickets (category);
CREATE INDEX idx_tickets_assignee_id ON tickets (assignee_id);
CREATE INDEX idx_tickets_created_at  ON tickets (created_at DESC, id DESC);
CREATE INDEX idx_tickets_updated_at  ON tickets (updated_at DESC, id DESC);
CREATE INDEX idx_tickets_title_trgm       ON tickets USING GIN (title gin_trgm_ops);
CREATE INDEX idx_tickets_description_trgm ON tickets USING GIN (description gin_trgm_ops);

CREATE INDEX idx_status_history_ticket ON ticket_status_history (ticket_id, changed_at);
CREATE INDEX idx_activity_ticket       ON ticket_activity (ticket_id, created_at);
