-- Rows of data/runbooks.json from every run, for the history views.
CREATE TABLE runbooks_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  url TEXT NOT NULL
);

CREATE INDEX runbooks_history_run ON runbooks_history (run_id);
