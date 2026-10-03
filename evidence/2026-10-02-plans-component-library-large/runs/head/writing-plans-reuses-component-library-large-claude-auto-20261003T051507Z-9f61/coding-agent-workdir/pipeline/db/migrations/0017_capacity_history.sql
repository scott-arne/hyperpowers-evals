-- Rows of data/capacity.json from every run, for the history views.
CREATE TABLE capacity_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  used REAL NOT NULL,
  total REAL NOT NULL,
  status TEXT NOT NULL
);

CREATE INDEX capacity_history_run ON capacity_history (run_id);
