# Logging Subsystem Design

Date: 2026-09-17
Status: Approved design, pending implementation plan

## Problem

The application has no logging. It has five ad-hoc `console` calls, four of
them in `app.js`, which vanish when the page closes and are never seen by
anyone but the user who happened to have devtools open. There is no way to
find out what happened during a production failure.

A secondary problem is already present in that code: `app.js` logs the
submitted username on every login attempt, and logs the full `login()` result
object, which also contains the username. Any logging subsystem that persists
records inherits this leak unless it actively prevents it.

## Goals

- One logging API used by both halves of the application.
- Log records persist beyond the life of a page load or process.
- Sensitive data cannot reach a persisted record through ordinary use of the
  API.
- Log verbosity can be raised for an affected user or process without a
  deploy.
- Unhandled errors are captured, not only paths someone remembered to
  instrument.

## Non-goals

- No log ingest backend. Browser logs stay on the user's device until the user
  or support exports them.
- No third-party error-reporting service.
- No migration of the repository to ES modules.
- No change to application behaviour beyond logging and error capture.

## Decisions

These were settled during brainstorming and are fixed inputs to the plan.

| Decision | Choice | Rejected alternatives |
|---|---|---|
| Scope | Both the browser half and the Node half | Node-only; browser-only |
| Browser persistence | On-device IndexedDB buffer plus manual export | First-party ingest endpoint; third-party SDK |
| Redaction model | Allow-list | Deny-list; no structured redaction |
| Architecture | Shared core with pluggable sinks, dual CommonJS/browser-global export | ESM everywhere; two independent loggers |
| Tooling added | `node:test` unit tests; ESLint + Prettier | End-to-end tests; no tooling |

### Why a shared core rather than two loggers

The allow-list is safety-critical code. Two copies drift, and the failure mode
of drift is a field that is redacted on one side and not the other. One core
file, consumed by both halves, is the only shape that makes that impossible.

### Why not ESM

Converting `src/` off CommonJS and restructuring `app.js` into a module would
mix unrelated, hard-to-revert changes into a logging change. The dual-export
shim is mildly dated but confines the awkwardness to one file, and migrating
later touches only that file.

## Architecture

```
                    src/logging/core.js
         (levels, record shape, redaction, sink dispatch)
                            |
        +-------------------+--------------------+
        |                   |                    |
  sink-file.js        sink-idb.js          sink-console.js
  (Node: NDJSON       (Browser: IndexedDB   (both: dev echo)
   + rotation)         ring + export)
```

`core.js` ends with a dual-export footer: `module.exports` when `module` is
defined, otherwise `window.AppLog`. `index.html` loads `core.js` and
`sink-idb.js` with plain `<script>` tags before `app.js`. Node code uses
`require('./logging/core')`.

The core knows nothing about where records go. A sink is a function taking one
finished record; sinks are registered with `AppLog.addSink(fn)`.

### Global constraints

- No runtime dependencies. ESLint and Prettier are dev dependencies only.
- No build step. `index.html` must keep working as plain script tags.
- `node:test` is the test runner, which requires Node 18+; add an `engines`
  field to `package.json`, currently absent.
- A logging failure must never propagate into application code. Every sink
  write is wrapped; a failing sink is disabled after repeated failures rather
  than throwing.

## Component: the logging API

```js
AppLog.info("login.attempt", { usernameLength: 8 });
AppLog.error("login.failed", { reason: "bad_credentials", statusCode: 401 });
```

A call takes a stable dotted event name and a flat context object. There is no
free-text message parameter, and this is load-bearing: an allow-list is
defeated by a single `log.info("Logging in: " + username)`, so the API offers
no way to write one. Event names double as grep keys across both halves.

Levels, in order: `debug`, `info`, `warn`, `error`. Calls below the active
level are discarded before redaction runs.

### Level control at runtime

- Node: `APP_LOG_LEVEL` environment variable, default `info`.
- Browser: `localStorage['applog.level']`, default `info`.

This is what makes the subsystem useful for production debugging: support can
raise one user to `debug` without a deploy.

## Component: record shape

```json
{
  "ts": "2026-09-17T10:48:33.123Z",
  "level": "error",
  "event": "login.failed",
  "src": "browser",
  "session": "a3f9c1",
  "ctx": { "reason": "bad_credentials" }
}
```

`src` is `"browser"` or `"node"`. `session` is a random identifier generated
once per page load or process start, so an exported dump can be read as one
user's sequence of events. Records are serialised as NDJSON: one JSON object
per line, in both sinks, so the two can be concatenated and read together.

## Component: redaction

A single registry of allowed field names lives in `src/logging/allowlist.js`
and is applied to every `ctx` object before a record reaches any sink. Three
rules, applied in order:

1. **Key check.** A key not in the registry is retained with its value
   replaced by `"[redacted]"`. The key is kept deliberately: a reader can see
   that a field was dropped rather than assume it was never sent.
2. **Scalar check.** Only `string`, `number`, `boolean`, and `null` values are
   recorded. Any object or array becomes `"[redacted:object]"` even under an
   allow-listed key. This blocks spreading a whole form payload, request, or
   result object into a log.
3. **Truncation.** Strings longer than 200 characters are truncated, with the
   truncation marked.

The rules are intentionally strict and mechanical so they can be exhaustively
unit-tested and so no judgement is required at a call site. Adding a new
loggable field is a one-line registry entry, which is the intended friction:
it makes "should this be in a log file?" an explicit decision made once.

The initial registry contains only fields the instrumented call sites need —
`reason`, `statusCode`, `durationMs`, `success`, `usernameLength`, `valid`,
`errorName`, `errorMessage`, `url`, `lineNumber`. Notably absent: `username`,
`password`, and any whole-object field.

## Component: Node file sink

Appends NDJSON to `logs/app.log`, overridable with `APP_LOG_FILE`. Rotation is
size-based: when the file exceeds 5 MB it is renamed to `app.log.1`, existing
numbered files shift up, and three rotated files are kept. Writes are
synchronous appends, which is acceptable at this application's volume and
avoids losing buffered records on an abrupt exit.

## Component: console sink

Shared by both halves and registered in addition to the persisting sink. It
echoes `warn` and `error` records only, so operators watching a terminal and
developers with devtools open still see problems without the noise of every
`info` record. It writes the same NDJSON record, not a reformatted line, so
what is seen matches what is stored.

## Component: browser IndexedDB sink

A single object store with an auto-incrementing key, used as a capped ring
buffer of 2000 entries. Trimming runs every 50 writes rather than on every
write, to avoid a count query per log call. Writes are asynchronous and fully
wrapped; a failure falls back to `console` and never surfaces to the caller.

`AppLog.exportLogs()` reads the store, serialises it as NDJSON, and triggers a
download named `applog-<timestamp>.ndjson`. It is reachable as
`window.AppLog.exportLogs()` so support can walk a user through running it in
the browser console.

**Known limitation.** IndexedDB is per-origin and per-profile, browsers evict
it under storage pressure, and private windows discard it on close. On-device
persistence is best-effort. This is an accepted consequence of keeping logs off
the network; a network sink can be added later as an additional sink without
changing the core, the API, or the redaction rules.

## Changes to existing code

`app.js`:

- `console.log("Logging in:", username)` becomes
  `AppLog.info("login.attempt", { usernameLength: username.length })`. The
  username is not allow-listed and must not be logged.
- `console.log("Login result:", result)` becomes
  `AppLog.info("login.result", { success: result.success })`. Passing `result`
  itself would reintroduce the username.
- `console.error("Validation error:", ...)` becomes
  `AppLog.warn("login.validation_failed", { reason: validation.error })`.
- New `window.addEventListener("error", ...)` and `"unhandledrejection"`
  handlers reporting `errorName`, `errorMessage`, `url`, `lineNumber`.

`src/index.js`:

- `console.log(greet('world'))` becomes a logged event alongside the existing
  output; the program's stdout behaviour is unchanged.
- New `process.on("uncaughtException")` and `"unhandledRejection"` handlers.

`index.html`: two `<script>` tags for `core.js` and `sink-idb.js`, ordered
before `app.js`.

`package.json`: `engines`, dev dependencies, and `test`, `lint`, and `format`
scripts.

The global error handlers are the part most likely to pay for this work.
Instrumented call sites only cover failures someone anticipated; the handlers
cover the rest.

## Testing

Unit tests with `node:test`, covering the logic that has consequences:

- Redaction: an allow-listed scalar passes through; a non-allow-listed key is
  replaced while its key is retained; an object under an allow-listed key is
  replaced; a long string is truncated; nested structures cannot smuggle a
  value through.
- Level filtering: calls below the active level produce no record; the
  environment variable and `localStorage` overrides are honoured.
- Record shape: required fields present, `ts` is ISO-8601, `session` is stable
  within a run.
- File sink: rotation triggers at the threshold, old files shift, the retention
  count holds.
- Sink isolation: a sink that throws does not propagate to the caller.

The IndexedDB sink is kept deliberately thin and is not unit-tested, since
exercising it would require a browser environment that this repository has no
harness for. Its serialisation and trimming decisions live in the core where
they are testable. End-to-end coverage of the real login page and export flow
was considered and deliberately deferred.

## Risks and assumptions

- *Assumption: the Node half runs somewhere with a writable working directory.*
  Validate by confirming the deployment target before implementing the file
  sink; if it is read-only, `APP_LOG_FILE` plus a stdout-only fallback covers
  it.
- On-device browser persistence gives no automatic visibility. If the bugs
  being chased are ones users do not report, this design will not surface them
  and a network sink becomes necessary. That was an accepted trade.
- The strict allow-list will occasionally hide a field someone wanted. This is
  the intended direction for the failure to point.
