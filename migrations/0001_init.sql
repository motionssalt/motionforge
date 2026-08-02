-- ============================================================
-- MotionForge — D1 schema (initial)
-- Applied automatically by .github/workflows/deploy.yml via:
--   wrangler d1 migrations apply motionforge --remote
-- ============================================================

CREATE TABLE IF NOT EXISTS jobs (
  id                TEXT PRIMARY KEY,
  telegram_user_id  TEXT NOT NULL,
  telegram_chat_id  TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',
    -- pending | validating | rendering | done | failed
  ratio             TEXT,
  duration          REAL,
  style             TEXT,
  spec_json         TEXT,
  error_message     TEXT,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_user   ON jobs(telegram_user_id);

-- Conversation state per Telegram chat (which step of /new they're on).
-- Cleared once a job is queued or /cancel is issued.
CREATE TABLE IF NOT EXISTS sessions (
  chat_id     TEXT PRIMARY KEY,
  step        TEXT NOT NULL DEFAULT 'idle',
    -- idle | await_ratio | await_duration | await_style | await_spec
  ratio       TEXT,
  duration    REAL,
  style       TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
