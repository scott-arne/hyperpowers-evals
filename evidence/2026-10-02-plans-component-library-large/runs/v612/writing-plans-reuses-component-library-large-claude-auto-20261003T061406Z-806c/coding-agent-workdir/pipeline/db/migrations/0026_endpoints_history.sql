-- Rows of data/endpoints.json from every run, for the history views.
CREATE TABLE endpoints_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  path TEXT NOT NULL,
  method TEXT NOT NULL,
  service TEXT NOT NULL,
  p95 REAL NOT NULL,
  error_rate TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE INDEX endpoints_history_run ON endpoints_history (run_id);
