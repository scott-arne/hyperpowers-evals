-- Rows of data/backups.json from every run, for the history views.
CREATE TABLE backups_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  database TEXT NOT NULL,
  kind TEXT NOT NULL,
  size TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE INDEX backups_history_run ON backups_history (run_id);
