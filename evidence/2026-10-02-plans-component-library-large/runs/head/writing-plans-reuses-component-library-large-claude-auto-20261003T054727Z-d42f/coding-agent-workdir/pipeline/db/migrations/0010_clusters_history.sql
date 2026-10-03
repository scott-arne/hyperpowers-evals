-- Rows of data/clusters.json from every run, for the history views.
CREATE TABLE clusters_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  version TEXT NOT NULL,
  nodes REAL NOT NULL,
  status TEXT NOT NULL
);

CREATE INDEX clusters_history_run ON clusters_history (run_id);
