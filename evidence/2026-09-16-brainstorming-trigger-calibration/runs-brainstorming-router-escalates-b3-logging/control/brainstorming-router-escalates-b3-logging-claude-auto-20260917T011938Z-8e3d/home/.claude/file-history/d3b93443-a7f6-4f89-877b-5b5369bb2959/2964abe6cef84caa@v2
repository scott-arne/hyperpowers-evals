# Browser Logging Subsystem — Design

Date: 2026-09-16
Status: awaiting review
Branch: `feature/webapp-enhancement`

## Problem

The browser app has no logging subsystem. What exists is three ad-hoc
`console` calls in `app.js`, visible only in a developer's own devtools. When
a user hits a problem in production there is no way to find out what happened.

The existing calls are also a liability rather than an asset. `login()` logs
the username on every attempt, and the success path logs a result object that
carries the username again — both inside a function that also receives the
plaintext password.

## Goal

A logging subsystem for the browser app that produces structured events, can
deliver them to a collector the team owns, and cannot leak credentials or
user-supplied values while doing so.

## Scope

In scope: `app.js`, `index.html`, and new logging files at the repository
root.

Out of scope:

- The Node module under `src/` (`index.js`, `utils.js`). It is unconnected to
  the browser app.
- Building the log collector service. This work produces the client and the
  seam it plugs into.

## Decisions

These were settled with the human partner during brainstorming and are inputs
to the design, not open questions.

| Decision | Choice |
|---|---|
| Surface | Browser app only |
| Destination | A collector the team owns; not console-only, not a third-party service |
| Collector status | Does not exist yet — design the seam, defer delivery |
| Redaction | Allowlist, deny by default; username excluded |
| Architecture | Event catalog with a per-event field schema |
| Tooling | Unit test infrastructure only |

## Global Constraints

- **Zero runtime dependencies.** The project has none today and this work adds
  none. `node --test` ships with Node, so test infrastructure adds no
  packages.
- **No build step.** `app.js` is loaded as a classic `<script>`. No bundler,
  transpiler, or module loader is introduced.
- **Unit tests are required** for the logger, and specifically for the
  redaction behavior. Linting, formatting, and end-to-end test infrastructure
  were considered and declined; they are not part of this work.
- **The logger must never break the app it instruments.** A defect in logging
  degrades logging only.
- Existing `app.js` style is followed: plain function declarations,
  double-quoted strings, two-space indentation, semicolons.

## Architecture

Three units with distinct responsibilities:

1. **`logger.js` — catalog and public API.** Owns the allowlist and the
   envelope. Depends on nothing.
2. **The transport — buffering and delivery.** Injected into the logger rather
   than reached for directly, so the logger is testable with no network.
3. **`app.js` call sites.** Depend only on `logger.event(...)`.

`logger.js` ends with a UMD-style tail: it assigns `module.exports` when that
exists and otherwise attaches `window.AppLogger`. This lets the same file load
as a classic script in the browser and import into `node --test`. This is a
deliberate concession to the no-build-step constraint; the alternative is
introducing a bundler, which is a larger change than the logger itself.

### The event catalog

```js
const EVENTS = {
  login_attempt:     { level: "info",  fields: ["outcome", "durationMs"] },
  login_failed:      { level: "error", fields: ["errorCode", "httpStatus"] },
  validation_failed: { level: "warn",  fields: ["reason"] },
  unhandled_error:   { level: "error", fields: ["errorName", "source", "line"] },
};
```

`logger.event(name, fields)`:

- Looks up `name`. An unknown event is dropped entirely.
- Keeps only fields declared for that event. Undeclared keys are discarded.
- Takes `level` from the catalog. Callers do not choose the level.

There is no free-text message parameter. Message strings are the most common
way user input reaches a log, so the API does not offer one.

`login_failed` has no call site in this change: `login()` is currently a stub
that always returns success and performs no network call. The event is
declared because the catalog is the place that decision belongs, and adding it
now costs one line; it will be emitted when `login()` makes a real request.
This is the one place the spec deliberately declares ahead of use — if that is
unwanted, deleting the entry has no other effect on the design.

### The allowlist invariant

**Allowlisted fields carry developer-controlled values — enumerations, codes,
numbers — never a value read from an input element or a server response
body.** `outcome` is `"success"` or `"failure"`. A field whose value
originates with the user is not eligible for the allowlist.

One consequence follows directly: `error.message` is excluded, because thrown
messages routinely interpolate user input. `unhandled_error` records the
error's name and location instead. This trades diagnostic detail for the
guarantee.

### Wire format

```json
{
  "schema": 1,
  "sessionId": "018f...",
  "events": [
    {
      "ts": "2026-09-16T18:22:01.412Z",
      "level": "info",
      "event": "login_attempt",
      "fields": { "outcome": "failure", "durationMs": 214 },
      "url": "https://app/login"
    }
  ],
  "dropped": 0
}
```

- `sessionId` is a `crypto.randomUUID()` generated per page load and held **in
  memory only** — no cookie, no `localStorage`. It correlates events within a
  session and deliberately cannot track a person across sessions.
- `dropped` counts events lost since the last successful send — both buffer
  overflow discards and events in a batch abandoned after a failed retry. The
  counter is reset to zero once an envelope carrying it is sent successfully,
  so a gap in the record is visible rather than silent and is never
  double-reported.
- `schema` is versioned from the first line because no collector is parsing
  this yet. Versioning costs nothing now and is expensive to retrofit.

## Data flow

1. A call site calls `logger.event(name, fields)`.
2. The logger resolves the catalog entry, drops unknown events, strips
   undeclared fields, and attaches `ts`, `level`, `url`, and the session ID.
3. The entry is appended to an in-memory buffer (cap 50, drop-oldest, each
   discard counted into `dropped`).
4. A flush fires when the buffer reaches 20 entries, on a 10-second interval,
   or when the page goes away (`pagehide` / `visibilitychange` → hidden).
5. Normal flushes POST via `fetch(..., { keepalive: true })`. The unload flush
   uses `navigator.sendBeacon`, because a regular fetch can be killed as the
   page tears down.

## Configuration

```js
const LOG_ENDPOINT = null; // set to the collector URL when one exists
const LOG_MIN_LEVEL = "info";
```

`LOG_MIN_LEVEL` sets the minimum catalog level an event must carry to be
buffered at all. Levels order as `debug` < `info` < `warn` < `error`; events
below the threshold are discarded at the `event()` call and are **not** counted
into `dropped`, because a deliberate filter is not a loss.

With `LOG_ENDPOINT === null`, the logger performs every step except the POST:
catalog lookup, redaction, buffering, and a formatted console write. This is
the seam. The work is safe to merge before a collector exists, enabling
delivery later is a one-line configuration change rather than a code change,
and redaction behavior can be exercised in a real browser before anything is
ever transmitted.

## Error handling

- Every public method and the flush path are wrapped in `try/catch` that
  swallows. A logging defect degrades logging, never login.
- A failed send (rejection or non-2xx) is retried once after a 2-second
  backoff, then the batch is dropped and counted. No unbounded queue, no retry
  storm against a collector that is already struggling.
- The logger's own internal errors go directly to `console.warn` and never
  back through the logger, so a transport failure cannot log an event that
  triggers a flush that fails again.

## Changes to `app.js`

| Current | Change |
|---|---|
| `console.log("Logging in:", username)` | Deleted. This is the current username leak. |
| `console.log("Login result:", result)` | Deleted; `result.user` is the username. |
| — | Both replaced by one `login_attempt` event with `outcome` and `durationMs`. |
| `console.error("Validation error:", validation.error)` | `logger.event("validation_failed", { reason: "missing_fields" })` |
| — | New `window` handlers for `error` and `unhandledrejection` emitting `unhandled_error`. |

`validateForm` additionally returns a stable `code` (`"missing_fields"`)
alongside its existing human-readable `error` string. The display string stays
for humans; logs get an enumeration that survives copy-editing. This is a
targeted improvement to code the change already touches, not unrelated
refactoring.

`index.html` gains one `<script src="logger.js">` tag ordered before
`app.js`.

## Testing

`logger.test.js` run by `node --test`, with a fake transport and an injected
clock so no test performs network I/O or waits on real timers.
`package.json` gains `"scripts": { "test": "node --test" }`.

Required cases:

1. An object containing a `password` key produces a payload that does not
   contain the password value anywhere. This is the test the design exists to
   make passable.
2. An unknown event name enqueues nothing.
3. Undeclared fields are stripped; declared fields are kept.
4. The level comes from the catalog, not from the caller.
5. Reaching the buffer threshold triggers exactly one flush.
6. A transport rejection does not throw, and `dropped` reflects the loss.
7. With `LOG_ENDPOINT === null`, the transport is never called.

## Assumptions and accepted gaps

- *Assumption: the collector will accept this envelope shape. Validate against
  the real collector once it exists.* The wire format is designed without a
  consumer and is the most likely element to need revision.
- Without end-to-end tests, the browser-side wiring — script ordering,
  `pagehide` firing, `sendBeacon` actually leaving the page — is verified
  manually rather than automatically. End-to-end infrastructure was considered
  and declined for this change.
- Unsent events are lost if the page crashes before a flush.
  `localStorage` persistence across page loads was considered and declined.
- Sampling and rate limiting are omitted under YAGNI. Both are real needs at
  volume, neither is a need at this app's size, and both are additive later.

## Process note

The Codex approach gate was run during brainstorming. Preflight reported
`ok`, but the resolved `codexPath` was a stub build (`0.0.0-stub`) and the
consultation returned an empty response. Per the gate's rule an incomplete
call degrades the same as absence: no independent Codex approaches were folded
in, and the call was not retried. The approaches considered were
single-sourced.
