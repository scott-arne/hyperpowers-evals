-- Rows of data/services.json from every run, for the history views.
CREATE TABLE services_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  environment TEXT NOT NULL,
  health TEXT NOT NULL,
  deployed_at TEXT NOT NULL
);

CREATE INDEX services_history_run ON services_history (run_id);
