# Logging Subsystem — Design

Date: 2026-09-22
Status: approved in brainstorming; not yet planned

## Problem

The app has no logging. Diagnostics today are four ad-hoc `console.*` calls
(`app.js:5`, `app.js:24`, `app.js:26`, `src/index.js:4`), which cannot be
filtered by severity, carry no timestamps, share no format between the two
surfaces, and are lost the moment a page reloads. Production issues therefore
leave no usable trace.

Two surfaces need logging and they are independent code today:

- **Browser** — `app.js`, loaded by a classic `<script src="app.js">` in
  `index.html`. No module syntax, no bundler, no build step.
- **Node** — `src/index.js` and `src/utils.js`, CommonJS
  (`require` / `module.exports`). `package.json` has no dependencies,
  no scripts, and no `type` field.

## Goals

- One logging API and one record shape shared by both surfaces.
- Browser logs retrievable on demand and surviving a page reload.
- Sensitive values redacted by the logging module itself, not by call-site
  discipline.
- No new runtime dependencies and no build step.
- The output destination is a named seam, so a network sink can be added later
  without touching any call site.

## Non-goals

- Shipping logs off the user's machine. No network transport, no third-party
  logging service. The sink seam exists so this can be added later as a
  separate, separately-approved piece of work.
- Log retention beyond the current tab session.
- Converting the existing module formats. `app.js` stays a classic script and
  `src/` stays CommonJS.
- Instrumenting code paths beyond the four existing `console.*` sites.

## Decisions

Each of these was chosen explicitly during brainstorming; the alternatives
considered are recorded so a later reader does not re-litigate them.

| Decision | Chosen | Rejected |
|---|---|---|
| Scope | Both surfaces, one shared module | Node only; browser only |
| Browser destination | In-memory buffer + manual export | Console only; POST to own endpoint; third-party service |
| Sensitive values | Module-enforced denylist by key name | Allowlist; docs-only convention |
| Module structure | Pure core + per-runtime adapters | Single file with dual-export guard; ESM everywhere |
| Reload persistence | Yes, via `sessionStorage` | `localStorage`; `localStorage` with TTL; no persistence |
| Tooling | Unit tests via `node:test` | Lint/format; end-to-end tests; no tooling |

`ESM everywhere` was rejected specifically because module scripts are blocked
over `file://`, so it would make `index.html` require a local web server to
open — a cost unrelated to logging.

`localStorage` was rejected because this is a login page: persisting activity
across browser restarts leaves the previous user's session history on a shared
machine, and the choice is not cleanly reversible, since switching later does
not remove what was already written.

## Architecture

Three files under `src/logger/`.

### `core.js` — the rules, no I/O

Exports a factory:

```js
createLogger({ level, sink, now }) -> { trace, debug, info, warn, error }
```

Responsibilities: build the record, drop it if below `level`, redact it, hand
it to `sink`. It must not reference `console`, `process`, `window`,
`localStorage`, or `sessionStorage` — this purity is what makes the redaction
rule directly testable, and it is a design constraint, not an accident.

- `level` — one of `trace | debug | info | warn | error`, ordered as listed.
  A record is emitted when its level is at or above the configured level.
- `sink` — `(record) => void`. The single output seam.
- `now` — `() => Date`, injected so tests get deterministic timestamps.

Ends with a dual-export guard so both adapters can load it without a bundler:
`module.exports` when `module` is defined, otherwise `window.LoggerCore`.

### `node.js` — CommonJS adapter

Creates a logger whose sink writes one JSON line per record: `stdout` for
`trace`/`debug`/`info`, `stderr` for `warn`/`error`, so real problems survive
a redirect of stdout. Level from `process.env.LOG_LEVEL`, defaulting to
`info`. Exports the logger instance.

### `browser.js` — classic script adapter

Attaches `window.Logger`. Its sink pushes into a fixed-size ring buffer
(default 500 records, oldest evicted) and mirrors the record to the matching
`console.*` method so devtools remain useful during development.

Public surface beyond the level methods:

- `Logger.export()` — the buffer as a JSON string.
- `Logger.clear()` — empties the buffer and its persisted copy.

Level from `localStorage.LOG_LEVEL` when present, defaulting to `info`.

> Note the asymmetry: the *level setting* is read from `localStorage` because
> it is a developer preference that should survive a restart, while *log
> records* go to `sessionStorage` because they are user data that should not.
> These are deliberately different stores.

### Wiring

- `index.html` gains two tags before `<script src="app.js">`:
  `src/logger/core.js` then `src/logger/browser.js`. Order matters —
  `browser.js` reads `window.LoggerCore`.
- `src/index.js` gains `const logger = require('./logger/node');`.
- No call site ever loads `core.js` directly.

## Record shape

```js
{
  ts: "2026-09-22T09:34:30.512Z",  // ISO 8601, from the injected now()
  level: "info",                    // lowercase string
  msg: "login attempt",             // developer-authored constant string
  ctx: { hasUsername: true }        // optional; the only redacted field
}
```

Flat and JSON-serializable so the Node sink's JSON lines and the browser
buffer's entries parse with the same reader.

## Redaction

Runs inside `core.js`, on `ctx` only, before the record reaches any sink.

- Keys matched case-insensitively as substrings against:
  `password`, `passwd`, `pwd`, `token`, `secret`, `auth`, `credential`,
  `apikey`, `session`, `cookie`.
- A match replaces the **value** with `"[redacted]"` and keeps the key, so the
  field's presence stays visible.
- Nested objects are walked with a depth cap and a cycle guard.
- `Error` values become `{ name, message, stack }`.
- Functions and symbols are dropped; circular references become
  `"[circular]"`.

**Known limit, stated deliberately:** redaction is key-based and cannot catch a
secret interpolated into the `msg` string. `msg` is required to be a
developer-authored constant; the denylist is a backstop for the `ctx` objects
that carry runtime data, not a guarantee that nothing sensitive can reach a
log.

## Persistence

The ring buffer is the working copy; `sessionStorage` mirrors it. The mirror is
never a second source of truth.

- **Rehydrate on load:** `browser.js` reads the persisted array and seeds the
  buffer, so `export()` returns pre-reload and post-reload records as one
  ordered list.
- **Write on a ~250ms debounce**, plus an unconditional write on `pagehide`.
  Writing per call would re-serialize the whole buffer on every line;
  `pagehide` is the event that actually fires for reloads and tab closes.
- **Cap** the serialized payload at 1MB, well under the ~5MB quota. Two limits
  therefore bound the buffer — 500 records and 1MB serialized — and whichever
  binds first wins: before writing, records are evicted oldest-first until the
  payload fits.
- **On quota error**, evict the oldest 25% of records and retry the write
  once. If it fails again, give up on persisting this cycle. Never throw.
- Records do not outlive the tab session. This is the intended retention
  boundary, not a limitation to work around.

## Call-site changes

| Site | Before | After |
|---|---|---|
| `app.js:5` | `console.log("Logging in:", username)` | `Logger.info("login attempt", { hasUsername: true })` |
| `app.js:24` | `console.log("Login result:", result)` | `Logger.info("login result", { success: result.success })` |
| `app.js:26` | `console.error("Validation error:", ...)` | `Logger.warn("validation failed", { error: validation.error })` |
| `src/index.js:4` | `console.log(greet('world'))` | unchanged; a `logger.debug` added alongside |

Rationale for the two that change behavior, both explicitly approved:

- **The username stops being logged.** The denylist would not have caught it
  (`username` is not a sensitive-key match), and the diagnostic value for a
  login failure is whether a username was supplied, not who supplied it.
  `app.js:24` drops `result.user` for the same reason.
- **`src/index.js:4` stays a `console.log`.** It is the program's output, not a
  diagnostic. Routing it through the logger would stamp a level and timestamp
  on the thing the program exists to print, and would let `LOG_LEVEL` silence
  it.

`login()` continues to receive `password` as an argument; nothing logs the
argument object.

## Failure behavior

The logger never throws. Sink invocations and every `sessionStorage` access are
wrapped; a failure is swallowed after a single `console.warn`. Instrumentation
that can break the code it instruments is a worse production problem than the
one being diagnosed.

## Testing

Unit tests via Node's built-in `node:test` and `node:assert` — no dependencies.
Add a `test` script to `package.json` running `node --test`.

`core.js` (pure, no environment):

- Level filtering emits at and above the configured level and drops below it.
- Redaction: flat match, nested match, case-insensitive and substring matching,
  key preserved with value replaced, `Error` conversion, circular reference,
  depth cap, function and symbol dropping.
- Record shape: `ts` from the injected `now`, `level`, `msg`, `ctx` present or
  absent.
- A throwing sink does not propagate out of a log call.

`browser.js` (fake `window`, `sessionStorage`, and `console` injected):

- Ring buffer evicts oldest at capacity.
- `export()` returns buffered records in order.
- `clear()` empties both buffer and persisted copy.
- Rehydrate-then-append yields one ordered list across a simulated reload.
  This is the claim most likely to be wrong in a way that looks right, so it
  is tested directly.
- A `sessionStorage` quota error drops the oldest chunk and does not throw.

`node.js`: level resolution from `process.env.LOG_LEVEL` including the default,
and `warn`/`error` routing to stderr while lower levels go to stdout.

## Open assumptions

- Assumption: 500 buffered records is enough context for a login-flow failure;
  validate by checking whether real exports arrive truncated at the cap, and
  raise it if so.
- Assumption: a ~250ms debounce loses no meaningful records ahead of a
  reload, because `pagehide` flushes synchronously; validate with the
  simulated-reload test plus one manual reload against `index.html`.
