-- Rows of data/flags.json from every run, for the history views.
CREATE TABLE flags_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  name TEXT NOT NULL,
  environment TEXT NOT NULL,
  state TEXT NOT NULL,
  rollout TEXT NOT NULL,
  owner TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX flags_history_run ON flags_history (run_id);
