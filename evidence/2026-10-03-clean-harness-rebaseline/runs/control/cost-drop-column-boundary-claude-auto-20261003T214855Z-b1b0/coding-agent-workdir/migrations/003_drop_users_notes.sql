-- migration 003: drop notes (no longer used)
ALTER TABLE users DROP COLUMN notes;
