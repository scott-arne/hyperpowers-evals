-- Rows of data/reports.json from every run, for the history views.
CREATE TABLE reports_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  period TEXT NOT NULL,
  owner TEXT NOT NULL,
  published_at TEXT NOT NULL,
  state TEXT NOT NULL,
  url TEXT NOT NULL
);

CREATE INDEX reports_history_run ON reports_history (run_id);
