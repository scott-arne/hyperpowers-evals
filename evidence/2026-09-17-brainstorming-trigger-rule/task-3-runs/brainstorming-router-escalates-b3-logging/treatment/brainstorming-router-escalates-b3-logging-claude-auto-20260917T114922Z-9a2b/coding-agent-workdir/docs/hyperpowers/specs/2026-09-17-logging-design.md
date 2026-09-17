# Logging Subsystem Design

Date: 2026-09-17
Status: Approved in chat; pending written-spec review

## Problem

The app has no logging subsystem. Diagnostic output is four scattered
`console.log` / `console.error` calls in `app.js` and `src/index.js` with no
levels, no structure, no way to raise verbosity in production, and no record of
what happened before a failure. When a user reports a login problem there is
nothing to ask them for.

A further hazard already exists: `app.js` logs the username on every login
attempt, and `login(username, password)` holds a password one scope away from a
log call. Any logging work has to address what may be recorded before it
increases how much gets recorded.

## Goals

- One logging API usable from both the browser app and the Node entry point.
- Levels, with verbosity changeable at runtime without a redeploy.
- Retained history of the events leading up to a failure, exportable on demand.
- Secrets structurally excluded from anything the logger retains.
- No new runtime dependencies and no build step.

## Non-Goals

- Shipping logs to a remote collector. Rejected for now: this repo has no
  backend, and an endpoint is an interface plus a data-retention commitment.
  The ring buffer is the seam a collector would attach to later.
- Global `window.onerror` / `unhandledRejection` handlers, or auto-dumping the
  buffer on crash.
- Migrating the repository to ES modules. Worthwhile, but unrelated to logging
  and deserving of its own approval.
- Adding lint or formatting tooling.

## Decisions

Each was chosen against alternatives during brainstorming.

| Decision | Chosen | Rejected alternatives |
|---|---|---|
| Scope | Shared module serving both browser and Node | Browser only; Node only |
| Transport | Console plus in-memory ring buffer | Console only; POST to a collector |
| Secrets | Key-name denylist applied inside the logger | Caller convention; field allowlist |
| Module format | Single dual-mode file | Repo-wide ESM conversion; core plus shims |
| Tooling | Unit tests via `node:test` | Adding ESLint/Prettier; no tooling |

## Architecture

### `logger.js` (new, repository root)

Root placement lets the browser load it with a relative `<script src>` next to
`app.js` and lets Node reach it as `require('../logger')`.

Dual-mode export: assign to `module.exports` when `module` is defined, otherwise
assign to `globalThis.log`. No bundler, no `package.json` type change, no edits
to files that do not otherwise need them.

### API

```js
log.debug(msg, ctx?);
log.info(msg, ctx?);
log.warn(msg, ctx?);
log.error(msg, ctx?);
log.dump();      // array copy of retained entries
```

An entry is `{ ts, level, msg, ctx }`, where `ts` is an ISO 8601 string and
`ctx` is the redacted form of the caller's context object.

Redaction happens at capture, not at dump. A secret therefore never occupies the
buffer, so exporting the buffer cannot leak one even if the export path changes
later.

### Levels and the runtime switch

Ordering: `debug` < `info` < `warn` < `error`. Default: `info`.

Resolution order:

- Browser: `?log=<level>` query parameter, else `localStorage.logLevel`, else
  the default. The query parameter wins so a user can be asked to reload one URL.
- Node: the `LOG_LEVEL` environment variable, else the default.

Level resolution is factored into a pure function taking a search string and a
storage-like object, so browser behavior is testable under Node without a DOM.

An unrecognized level value falls back to the default rather than throwing; a
logger that crashes the app it instruments is worse than a verbose one.

### The ring buffer

Fixed capacity, default 200 entries, oldest evicted on overflow.

The console is filtered by the active level; the buffer records every entry down
to `debug` regardless of that level. This asymmetry is the point of the design —
the buffer's value is the history approaching a failure, and history filtered
out before storage does not exist when the failure arrives.

`log.dump()` returns a copy of the retained entries. In the browser the logger
also exposes `globalThis.__appLogs()`, the command a user is asked to run and
paste into a bug report.

### Redaction

A recursive walk of the context object. Keys matching
`/pass(word)?|token|secret|auth|credential|cookie|api[_-]?key/i` have their
values replaced with the string `'[REDACTED]'`.

- Depth-capped at 4 levels; deeper structures are replaced with `'[DEPTH]'`.
- Cycle-safe via a seen-set, so a circular object or a DOM node cannot hang the
  logger.
- Key-based only. Values are not pattern-scanned.

`username` is deliberately not on the denylist. Correlating a report with a
session needs an identifier, and the username is normally that identifier; the
password is the value that must never be recorded, and it is covered.

## Integration

### Browser

`index.html` gains `<script src="logger.js"></script>` immediately before the
existing `app.js` tag, so `globalThis.log` exists when `app.js` executes.

Call-site changes in `app.js`:

| Current | Becomes |
|---|---|
| `console.log("Logging in:", username)` | `log.info('login attempt', { username })` |
| `console.log("Login result:", result)` | `log.info('login result', { result })` |
| `console.error("Validation error:", validation.error)` | `log.warn('validation failed', { error: validation.error })` |

A `log.debug('form submitted', ...)` is added at the top of the submit handler so
the buffer records the approach to a failure rather than starting at it.

Validation failure moves from `error` to `warn`: a blank field is expected user
behavior, and logging it at `error` dilutes the level that should mean something
is broken.

### Node

`src/index.js` requires the logger and adds `log.debug('main start')`.

`console.log(greet('world'))` is left unchanged. It is program output, not a
diagnostic; routing it through the logger would corrupt stdout for any consumer
parsing it.

`src/utils.js` is untouched.

## Testing

`package.json` gains `"scripts": { "test": "node --test" }`. Tests live in
`test/logger.test.js` and use the built-in `node:test` runner, adding no
dependencies.

Cases:

- Redaction masks `password` and `token`, including nested occurrences and
  mixed-case keys, and leaves `username` intact.
- Redaction terminates on a circular object and honors the depth cap.
- The buffer evicts the oldest entry past capacity.
- `dump()` returns a copy; mutating the result does not affect retained state.
- The buffer captures `debug` entries while the console filter sits at `info` —
  the central claim of the design.
- Level resolution: `LOG_LEVEL=warn` suppresses `info` console output; an
  unrecognized value falls back to `info`.
- Browser level resolution: the query parameter takes precedence over the
  storage value.

## Files

New:

- `logger.js`
- `test/logger.test.js`
- `.gitignore` (added during design to keep spec documents uncommitted)

Modified:

- `index.html` — one script tag
- `app.js` — four call sites
- `src/index.js` — require plus one debug line
- `package.json` — test script

Untouched: `src/utils.js`, `README.md`.

## Risks and Open Questions

- The denylist is a maintained list. A future field named, say, `pin` or
  `ssn` would not be masked. Mitigation: the list lives in one place and is
  covered by tests, so tightening it is a one-line change.
- Assumption: browser log collection by asking a user to run `__appLogs()` is
  operationally acceptable for this app's support flow. Validate by using it on
  the first real production report; if it proves impractical, the buffer is
  already the attachment point for a collector.
- The buffer is memory-resident and lost on reload. A failure that reloads the
  page takes its history with it. Accepted as the cost of having no backend.
