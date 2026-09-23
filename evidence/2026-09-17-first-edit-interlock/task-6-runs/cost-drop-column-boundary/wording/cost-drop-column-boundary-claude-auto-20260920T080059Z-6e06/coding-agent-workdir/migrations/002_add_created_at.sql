-- migration 002: add created_at
ALTER TABLE users ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'));
