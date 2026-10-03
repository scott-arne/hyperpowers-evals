-- Rows of data/incidents.json from every run, for the history views.
CREATE TABLE incidents_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  service TEXT NOT NULL,
  severity TEXT NOT NULL,
  opened_at TEXT NOT NULL,
  resolved_at TEXT,
  runbook TEXT NOT NULL
);

CREATE INDEX incidents_history_run ON incidents_history (run_id);
