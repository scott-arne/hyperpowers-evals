-- Rows of data/oncall.json from every run, for the history views.
CREATE TABLE oncall_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  team TEXT NOT NULL,
  "primary" TEXT NOT NULL,
  secondary TEXT NOT NULL,
  until TEXT NOT NULL
);

CREATE INDEX oncall_history_run ON oncall_history (run_id);
