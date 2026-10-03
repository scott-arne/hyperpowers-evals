-- Rows of data/secrets.json from every run, for the history views.
CREATE TABLE secrets_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  name TEXT NOT NULL,
  store TEXT NOT NULL,
  rotated_at TEXT NOT NULL,
  rotate_by TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE INDEX secrets_history_run ON secrets_history (run_id);
