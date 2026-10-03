-- Rows of data/webhooks.json from every run, for the history views.
CREATE TABLE webhooks_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT NOT NULL,
  last_delivery TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE INDEX webhooks_history_run ON webhooks_history (run_id);
