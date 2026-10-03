-- Rows of data/status.json from every run, for the history views.
CREATE TABLE status_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  name TEXT NOT NULL,
  "group" TEXT NOT NULL,
  state TEXT NOT NULL
);

CREATE INDEX status_history_run ON status_history (run_id);
