-- Why a job failed, so the next run's log can say "still failing since".
CREATE TABLE job_failures (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  snapshot TEXT NOT NULL,
  message TEXT NOT NULL,
  problems TEXT
);

CREATE INDEX job_failures_snapshot ON job_failures (snapshot, run_id);
