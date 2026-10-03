-- Rows of data/teams.json from every run, for the history views.
CREATE TABLE teams_history (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  lead TEXT NOT NULL,
  members REAL NOT NULL,
  channel TEXT NOT NULL,
  staffing TEXT NOT NULL
);

CREATE INDEX teams_history_run ON teams_history (run_id);
