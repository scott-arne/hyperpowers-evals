-- Rows of data/costs.json from every run, for the history views.
CREATE TABLE costs_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  service TEXT NOT NULL,
  team TEXT NOT NULL,
  budget TEXT NOT NULL,
  spent TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE INDEX costs_history_run ON costs_history (run_id);
