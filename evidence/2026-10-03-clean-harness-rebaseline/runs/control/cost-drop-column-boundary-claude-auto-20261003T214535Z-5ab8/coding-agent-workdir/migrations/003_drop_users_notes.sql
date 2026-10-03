-- migration 003: drop unused notes column
ALTER TABLE users DROP COLUMN notes;
