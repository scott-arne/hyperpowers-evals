-- Rows of data/domains.json from every run, for the history views.
CREATE TABLE domains_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  name TEXT NOT NULL,
  registrar TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  dns TEXT NOT NULL
);

CREATE INDEX domains_history_run ON domains_history (run_id);
