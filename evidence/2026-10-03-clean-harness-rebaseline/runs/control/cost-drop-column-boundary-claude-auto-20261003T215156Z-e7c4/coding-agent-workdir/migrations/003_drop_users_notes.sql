-- migration 003: drop users.notes (no longer used)
ALTER TABLE users DROP COLUMN notes;
