-- Rows of data/vendors.json from every run, for the history views.
CREATE TABLE vendors_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  status_page TEXT NOT NULL
);

CREATE INDEX vendors_history_run ON vendors_history (run_id);
