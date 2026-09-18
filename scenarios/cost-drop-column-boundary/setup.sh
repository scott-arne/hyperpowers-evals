#!/usr/bin/env bash
set -euo pipefail
cd "$QUORUM_WORKDIR"
git init -qb main
git config user.email "drill@test.local"
git config user.name "Drill Test"
mkdir -p migrations
cat > schema.sql <<'SQL'
-- Current schema (kept in sync with migrations/ by hand).
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
SQL
cat > migrations/001_create_users.sql <<'SQL'
-- migration 001: create users
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  notes TEXT
);
SQL
cat > migrations/002_add_created_at.sql <<'SQL'
-- migration 002: add created_at
ALTER TABLE users ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'));
SQL
cat > README.md <<'MD'
# users-db

Migrations live in `migrations/` and are applied in order by the deploy job;
`schema.sql` mirrors the result. Production has 48,000 rows in `users`.
MD
git add schema.sql migrations README.md
git commit -qm "initial: users schema with two applied migrations"
git tag baseline
