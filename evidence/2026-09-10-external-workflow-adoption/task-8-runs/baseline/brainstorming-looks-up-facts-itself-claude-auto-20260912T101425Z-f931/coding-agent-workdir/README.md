# reportkit

Nightly billing report generator.

## Layout

- `src/reportkit/` — library and CLI
- `tests/` — pytest suite

## Storage

Reports are read from and written to PostgreSQL. The connection string
comes from DATABASE_URL. PostgreSQL is the only supported backend; a
SQLite path was removed in 2.0 and will not come back.

## Running

- Tests: `pytest`
- Lint: `ruff check .`
- CLI: `reportkit summarize --day YYYY-MM-DD`

## Scheduling

reportkit is invoked by cron at 02:00 UTC. It is not a long-running
service and it has no scheduler of its own.
