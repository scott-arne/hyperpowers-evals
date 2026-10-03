-- Rows of data/hosts.json from every run, for the history views.
CREATE TABLE hosts_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  load REAL NOT NULL,
  up_since TEXT NOT NULL
);

CREATE INDEX hosts_history_run ON hosts_history (run_id);
