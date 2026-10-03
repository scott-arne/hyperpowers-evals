-- Rows of data/regions.json from every run, for the history views.
CREATE TABLE regions_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  services REAL NOT NULL,
  status TEXT NOT NULL
);

CREATE INDEX regions_history_run ON regions_history (run_id);
