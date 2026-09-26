# Logging Subsystem — Design

Date: 2026-09-26
Status: Approved design, pending implementation plan

## Problem

The app has no logging. It has four scattered `console.*` calls in `app.js`
and one in `src/index.js`. When something fails in production there is no
record of what happened, and no way to reconstruct what the user did before
it failed.

Two diagnostic needs drive this work:

1. **Errors and failures** — unhandled exceptions, failed calls, rejected
   input.
2. **A behavioral trail** — the sequence of events leading up to a failure,
   not just the failure itself.

Performance/timing instrumentation is explicitly out of scope.

One existing line is a live liability: `app.js:5` logs the raw username on
every login attempt, and `password` is in scope at the same call sites. Any
logging added around that form is one careless call away from writing
credentials to production output. Redaction is therefore a first-class
requirement of this design, not a follow-up.

## Global Constraints

- **Zero runtime dependencies.** The project currently has none, and this
  subsystem does not introduce any.
- **Unit-test infrastructure** using the built-in `node:test` runner, added
  as part of this work, with an `npm test` script. No linter, formatter, or
  end-to-end harness is being set up; that was considered and deferred.
- **Console output only.** No network transport is built in this change.
- The design document is a working file and is not committed.

## Runtime Context

Two runtimes, with different module systems and no build step:

| | Entry point | Loading |
|---|---|---|
| Browser | `app.js` | plain `<script>` in `index.html`, no bundler, no modules |
| Node | `src/index.js` | CommonJS `require` |

The absence of a bundler is the binding constraint on how the logger is
shared. Introducing one is out of scope.

## Decisions

Each of these was decided explicitly during design; the rationale is recorded
because the alternatives were viable.

| Decision | Chosen | Rejected alternative and why |
|---|---|---|
| Browser log destination | Console only, behind a pluggable sink | Buffer-and-ship-on-error, and a third-party service. The receiving endpoint does not exist — `app.js:6` shows the API call is still a stub — so shipping infrastructure would be built against nothing. The sink seam makes the transport addable later without touching call sites. |
| Implementation | Hand-rolled, zero deps | pino/winston/debug. ~100 lines covers the need; a library adds a browser build story the project does not have. |
| Module sharing | One dual-mode file | Two separate loggers. Duplicating redaction logic across runtimes is the specific risk being avoided. |
| Browser trail retention | Bounded in-memory ring buffer | Console-only. Console output evaporates with the tab, which leaves the behavioral-trail requirement unmet. |
| Username handling | Truncate to first 2 chars + length | Logging in full (PII in logs and in the buffer) and full redaction (loses session correlation). |

## Architecture

### Module

A single file, `src/logger.js`, with a dual-mode export shim: `module.exports`
when `module` is defined, otherwise assignment to `window.Logger`.
`index.html` loads it via `<script src="src/logger.js">` before `app.js`.

One implementation means one place where redaction lives, which is the
property this structure exists to guarantee.

### Public API

Identical in both runtimes:

```js
log.error(event, data)
log.warn(event, data)
log.info(event, data)
log.debug(event, data)

Logger.setSink(fn)   // replace the output function; defaults to console writer
Logger.dump()        // return the ring buffer contents (browser and Node)
```

- `event` is a short stable identifier (`"login.attempt"`,
  `"form.validation_rejected"`). Stable names are what make a trail
  greppable; free-text messages are not.
- `data` is an optional plain object.

### Record shape

One structured record per call, `JSON.stringify`'d to the sink:

```json
{
  "ts": "2026-09-26T08:46:19.000Z",
  "level": "info",
  "event": "login.attempt",
  "runtime": "browser",
  "data": { "username": "jo***(11)" }
}
```

JSON on both sides: it makes Node stdout machine-readable, and it means
browser records are already in the shape a future transport would send.

### Sink

`Logger.setSink(fn)` takes a function receiving the finished record. The
default writes to `console[level]`. This is the single seam for future
transports; adding buffer-and-ship later means writing a sink, not editing
call sites.

### Ring buffer

A bounded in-memory array of the 50 most recent records, retrievable via
`Logger.dump()`. It exists in both runtimes because there is one shared
implementation; the browser is the case that motivated it.

**The buffer records every level regardless of the console threshold.** The
console respects the configured level; the buffer does not. When a user
reports a problem, the dump carries the full trail including `debug` records
that were never printed.

Bounded at 50 so memory is constant.

## Redaction

Redaction runs inside the logger, before any sink sees the record. Call sites
cannot opt out or forget.

The `data` object is deep-cloned and walked. Three rules:

1. **Key denylist.** Keys matching any of `password`, `passwd`, `pwd`,
   `token`, `secret`, `apiKey`, `authorization`, `sessionId`, `creditCard`,
   `ssn` are replaced with `"[REDACTED]"`. Matching is case-insensitive and
   on substrings, so `newPassword` and `access_token` are caught. Applied
   recursively through nested objects and arrays.

2. **`data` must be a plain object.** A bare value (`log.info("x", password)`)
   has no key for the denylist to match. Non-object `data` is replaced with
   `"[INVALID_LOG_DATA]"`. This makes the unsafe call shape structurally
   impossible rather than merely discouraged.

3. **String values truncate at 200 characters.** Caps the blast radius of
   anything that evades the denylist and keeps whole request bodies out of
   the buffer.

**Username.** Truncated to first 2 characters plus total length —
`"jonathan@x.com"` becomes `"jo***(14)"`. Sufficient to correlate lines within
a session and to confirm which account a reporting user meant, without
storing the identifier. Applied to keys whose name contains `username`,
`user`, or `email`, matched case-insensitively on substrings like rule 1.

**Rule precedence:** the denylist is evaluated first. If a key matches both
the denylist and the username list, it is fully redacted. Redaction always
wins over truncation.

A denylist is optimistic by nature; rules 2 and 3 exist because of that, and
the test suite treats "a password reaches a sink" as the defining failure.

## Level control

Threshold defaults to `info`.

- Node reads `LOG_LEVEL` from the environment.
- Browser reads `localStorage["log.level"]`.

The browser mechanism matters specifically because you cannot attach a
debugger to a user's browser — it allows raising verbosity in a live
production session without a deploy.

Invalid or unrecognized values fall back to `info` rather than throwing. A
logger that crashes on misconfiguration is worse than one that is too quiet.

## Instrumentation

### `app.js`

The four existing `console.*` calls are replaced with logger calls using
stable event names:

| Location | Event | Level |
|---|---|---|
| `login()` entry | `login.attempt` | info |
| `login()` success | `login.succeeded` | info |
| `login()` failure | `login.failed` | error |
| validation rejection | `form.validation_rejected` | warn |

The raw-username line at `app.js:5` becomes compliant through the
username-truncation rule.

### Global error capture

This is the part that catches failures nobody anticipated.

- **Browser:** `window.addEventListener("error")` and
  `window.addEventListener("unhandledrejection")` emit
  `log.error("uncaught.error", {...})`. Because the ring buffer has been
  filling beforehand, the dump carries the lead-up to the crash — this is
  where the errors requirement and the trail requirement meet.
- **Node:** `process.on("uncaughtException")` and
  `process.on("unhandledRejection")` log, then re-throw or exit non-zero.
  The handler must not swallow the crash; a logger that converts a fatal
  error into a log line is worse than no logger.

### `src/index.js`

`app.start` at entry, plus installation of the uncaught handlers. `src/index.js`
is a hello-world; there is nothing further there worth instrumenting, and no
events will be invented for it.

## Testing

`node:test`, run via `npm test`. The logger is pure enough to test directly by
installing a capturing sink via `setSink`.

Coverage:

- **Password never reaches a sink** — the defining test. Includes nested
  objects, arrays, and substring keys such as `newPassword` and
  `access_token`.
- Non-object `data` is replaced with `"[INVALID_LOG_DATA]"`.
- String values over 200 chars are truncated.
- Username truncation produces the `xx***(n)` form for `username`, `user`,
  and `email` keys.
- Level thresholds gate console output; invalid level values fall back to
  `info`.
- Ring buffer is bounded at 50 and evicts oldest-first.
- Ring buffer captures records below the console threshold.
- `setSink` replaces the destination and receives the redacted record, not
  the raw input.

## Out of scope

- Network transport / remote log collection (the sink seam is the hook).
- Third-party error-reporting services.
- Performance and timing instrumentation.
- Linting, formatting, and end-to-end test infrastructure.
- Any bundler or build step.
