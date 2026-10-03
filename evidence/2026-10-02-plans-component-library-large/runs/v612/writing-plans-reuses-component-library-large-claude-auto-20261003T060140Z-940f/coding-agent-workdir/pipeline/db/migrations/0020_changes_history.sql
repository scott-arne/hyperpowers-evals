-- Rows of data/changes.json from every run, for the history views.
CREATE TABLE changes_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  risk TEXT NOT NULL,
  state TEXT NOT NULL,
  opened_at TEXT NOT NULL
);

CREATE INDEX changes_history_run ON changes_history (run_id);
