-- Rows of data/certificates.json from every run, for the history views.
CREATE TABLE certificates_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  domain TEXT NOT NULL,
  issuer TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE INDEX certificates_history_run ON certificates_history (run_id);
