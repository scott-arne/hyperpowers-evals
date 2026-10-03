-- Rows of data/deploys.json from every run, for the history views.
CREATE TABLE deploys_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  id TEXT NOT NULL,
  service TEXT NOT NULL,
  version TEXT NOT NULL,
  environment TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  author TEXT NOT NULL
);

CREATE INDEX deploys_history_run ON deploys_history (run_id);
