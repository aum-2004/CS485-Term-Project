-- ============================================================
-- Reddit AI Debate Analyzer – database schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- A thread (discussion post) that users comment on
CREATE TABLE IF NOT EXISTS threads (
  id          TEXT        PRIMARY KEY,
  title       TEXT        NOT NULL,
  is_seeded   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration: add is_seeded to existing DBs that predate this column
ALTER TABLE threads ADD COLUMN IF NOT EXISTS is_seeded BOOLEAN NOT NULL DEFAULT FALSE;

-- Individual comments belonging to a thread.
-- reasoning_score and ai_summary are populated by the AI Analysis Module.
CREATE TABLE IF NOT EXISTS comments (
  id              TEXT          PRIMARY KEY,
  thread_id       TEXT          NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  author          TEXT          NOT NULL,
  content         TEXT          NOT NULL,
  reasoning_score NUMERIC(5,2),           -- 0–100; NULL until analysed
  ai_summary      TEXT,                   -- AI-generated one-liner; NULL until analysed
  analyzed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_thread_id ON comments(thread_id);

-- AI-generated debate summary for an entire thread.
-- One row per thread; updated in-place on regeneration.
CREATE TABLE IF NOT EXISTS debate_summaries (
  id                    TEXT        PRIMARY KEY,
  thread_id             TEXT        UNIQUE NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  main_positions        TEXT[]      NOT NULL DEFAULT '{}',
  supporting_evidence   TEXT[]      NOT NULL DEFAULT '{}',
  areas_of_disagreement TEXT[]      NOT NULL DEFAULT '{}',
  generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
