-- Rows of data/audit.json from every run, for the history views.
CREATE TABLE audit_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  at TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  result TEXT NOT NULL
);

CREATE INDEX audit_history_run ON audit_history (run_id);
