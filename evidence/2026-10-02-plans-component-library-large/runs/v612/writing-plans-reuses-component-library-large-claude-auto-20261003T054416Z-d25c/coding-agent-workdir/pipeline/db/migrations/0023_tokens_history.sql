-- Rows of data/tokens.json from every run, for the history views.
CREATE TABLE tokens_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  scopes TEXT NOT NULL,
  last_used TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE INDEX tokens_history_run ON tokens_history (run_id);
