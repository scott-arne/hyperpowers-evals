-- Rows of data/maintenance.json from every run, for the history views.
CREATE TABLE maintenance_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  service TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  state TEXT NOT NULL
);

CREATE INDEX maintenance_history_run ON maintenance_history (run_id);
