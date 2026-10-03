-- Rows of data/jobs.json from every run, for the history views.
CREATE TABLE jobs_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  name TEXT NOT NULL,
  schedule TEXT NOT NULL,
  last_run TEXT NOT NULL,
  state TEXT NOT NULL
);

CREATE INDEX jobs_history_run ON jobs_history (run_id);
