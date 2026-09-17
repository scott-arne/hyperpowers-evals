# Approved design context (brainstorming adjudications)

Original request, verbatim: "Add logging to the app so we can debug production issues."

The following were put to the human partner as explicit choices during
brainstorming and approved by them. They are settled inputs to the spec, not
open questions.

| Question | Chosen | Rejected |
|---|---|---|
| Which surface needs logging? | Both browser and Node, via a shared module | Browser only; Node only |
| Where do browser logs end up? | Structured console output now, with a documented transport seam | POST to our own endpoint; third-party service (Sentry etc.) |
| How is verbosity controlled? | Runtime switch (`?log=` + localStorage in browser, `LOG_LEVEL` in Node) | Fixed level in code; always verbose |
| How is sensitive data handled? | Allowlist, failing closed | Denylist of known-sensitive keys |
| Module-sharing mechanism | Approach A: UMD-style footer in `src/logger.js` | Approach B: convert project to ESM; Approach C: two parallel implementations sharing only a written contract |
| Correlation field | Random per-run `sessionId` | No correlation field; keep logging the username |
| Tooling to add | `node:test` unit tests only | Lint + format; end-to-end tests; no tooling |

Additional approved points:

- The human partner approved the module structure (section 1) and the record
  format / redaction / level-resolution design (section 2) as presented.
- Keeping the repository at zero runtime dependencies was an explicit reason for
  several of these choices; a finding that recommends adding a dependency
  should account for that constraint.
- `console.log(greet('world'))` in `src/index.js` was deliberately left as
  program output rather than converted to a log record.

## Repository facts

The repository contains only: `index.html`, `app.js`, `package.json`,
`README.md`, `src/index.js`, `src/utils.js`. No dependencies, no lockfile, no
build step, no tests, no linter, no CI. `app.js` is a classic global-scope
script; `src/` is CommonJS. Git branch `feature/webapp-enhancement`.
