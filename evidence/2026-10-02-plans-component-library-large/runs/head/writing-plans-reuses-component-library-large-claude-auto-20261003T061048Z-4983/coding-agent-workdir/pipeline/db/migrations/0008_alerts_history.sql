-- Rows of data/alerts.json from every run, for the history views.
CREATE TABLE alerts_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  name TEXT NOT NULL,
  service TEXT NOT NULL,
  severity TEXT NOT NULL,
  state TEXT NOT NULL,
  fired_at TEXT NOT NULL
);

CREATE INDEX alerts_history_run ON alerts_history (run_id);
