-- Crossbill Postgres bootstrap.
-- Runs once on first container start. Schema itself is owned by TypeORM migrations;
-- this file only sets up the database, extensions, and the gapless-numbering primitive.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive email

-- Per-org / per-FY invoice counter. The unique (org_id, financial_year) row is the
-- lock point: invoice numbers are allocated by UPDATE ... RETURNING under a row lock,
-- guaranteeing sequential + gapless allocation even under concurrency (design §8 hard rule).
CREATE TABLE IF NOT EXISTS invoice_counters (
    org_id          UUID        NOT NULL,
    financial_year  VARCHAR(9)  NOT NULL,   -- e.g. '2026-27'
    last_number     INTEGER     NOT NULL DEFAULT 0,
    PRIMARY KEY (org_id, financial_year)
);
