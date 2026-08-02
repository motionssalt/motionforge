-- ============================================================
-- MotionForge — migration 0002
-- ------------------------------------------------------------
-- The bot flow no longer asks for a fixed duration; it now asks
-- for a scene/element-density tier ("compact" | "standard" |
-- "rich") that only shapes the creative brief. It also splits
-- the style picker into two levels (category → flavor), so we
-- track the selected category on the session too.
--
-- SQLite (D1) has no in-place column-rename that works across
-- all versions, so we rebuild the table. `sessions` is
-- ephemeral state — safe to drop existing rows.
-- ============================================================

DROP TABLE IF EXISTS sessions;

CREATE TABLE sessions (
  chat_id         TEXT PRIMARY KEY,
  step            TEXT NOT NULL DEFAULT 'idle',
    -- idle | await_ratio | await_density | await_style_category
    -- | await_style | await_spec
  ratio           TEXT,
  density         TEXT,
    -- compact | standard | rich
  style_category  TEXT,
    -- saas-ui | talking-head | typography
  style           TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
