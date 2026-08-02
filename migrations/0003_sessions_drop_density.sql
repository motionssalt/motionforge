-- ============================================================
-- MotionForge — migration 0003
-- ------------------------------------------------------------
-- Reverses migration 0002. The bot flow no longer offers a
-- density picker OR a style picker (single-level or two-level)
-- — the authoring AI decides scene count, element density, and
-- visual style itself based on the user's own prompt and any
-- attached audio. The only remaining conversation state is the
-- ratio choice.
--
-- SQLite (D1) has no in-place column-drop that works across all
-- versions, so we rebuild the table. `sessions` is ephemeral
-- state — safe to drop existing rows.
-- ============================================================

DROP TABLE IF EXISTS sessions;

CREATE TABLE sessions (
  chat_id     TEXT PRIMARY KEY,
  step        TEXT NOT NULL DEFAULT 'idle',
    -- idle | await_ratio | await_spec
  ratio       TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
