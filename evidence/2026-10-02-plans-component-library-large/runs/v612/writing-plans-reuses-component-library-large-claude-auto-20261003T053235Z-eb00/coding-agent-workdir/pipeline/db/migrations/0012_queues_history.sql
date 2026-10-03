-- Rows of data/queues.json from every run, for the history views.
CREATE TABLE queues_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  name TEXT NOT NULL,
  depth REAL NOT NULL,
  consumers REAL NOT NULL,
  oldest TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE INDEX queues_history_run ON queues_history (run_id);
