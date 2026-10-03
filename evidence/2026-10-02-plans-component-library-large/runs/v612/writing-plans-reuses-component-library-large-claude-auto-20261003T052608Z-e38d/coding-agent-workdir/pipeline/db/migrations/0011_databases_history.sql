-- Rows of data/databases.json from every run, for the history views.
CREATE TABLE databases_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  name TEXT NOT NULL,
  engine TEXT NOT NULL,
  version TEXT NOT NULL,
  size TEXT NOT NULL,
  replicas REAL NOT NULL,
  status TEXT NOT NULL
);

CREATE INDEX databases_history_run ON databases_history (run_id);
