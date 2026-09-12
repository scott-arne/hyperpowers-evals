# reportkit

Nightly billing report generator.

## Layout

- `src/reportkit/` — library and CLI
- `tests/` — pytest suite
- `deploy/` — how this runs in production
- `docs/adr/` — architecture decision records

## Running

- Tests: `pytest`
- Lint: `ruff check .`
- CLI: `reportkit summarize --day YYYY-MM-DD`
