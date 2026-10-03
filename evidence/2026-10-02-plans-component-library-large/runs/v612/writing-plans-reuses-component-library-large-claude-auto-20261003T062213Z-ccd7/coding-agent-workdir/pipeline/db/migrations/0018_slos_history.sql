-- Rows of data/slos.json from every run, for the history views.
CREATE TABLE slos_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  name TEXT NOT NULL,
  service TEXT NOT NULL,
  target TEXT NOT NULL,
  current TEXT NOT NULL,
  budget_left REAL NOT NULL,
  status TEXT NOT NULL
);

CREATE INDEX slos_history_run ON slos_history (run_id);
