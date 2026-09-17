# Logging Subsystem Design

Date: 2026-09-17
Status: approved in brainstorming, pending user review

## Problem

The app has no logging subsystem. What exists is four scattered `console.log`
and `console.error` calls in `app.js` and one in `src/index.js`. None of them
carry a timestamp, a level, or structured context, and none of them leave the
user's machine. A production issue in the browser is therefore invisible unless
a user happens to open devtools and report what they see.

Separately, `login(username, password)` logs the username on a code path that
holds a credential. Any design that ships logs off-device has to answer for
that before it ships anything.

## Goals

- One logging interface shared by both runtimes in the repo.
- Structured records with levels, timestamps, and context.
- Browser records can reach an HTTP endpoint so production issues are
  debuggable without the user's console.
- Uncaught errors are captured, not just hand-written log calls.
- Sensitive data cannot reach the remote endpoint by accident.

## Non-Goals

- A remote sink for the Node side. Node writes JSON to stdout; whatever runs
  the process already collects it.
- Child loggers, custom levels, pluggable formatters, log rotation.
- Adopting a third-party logging or error-reporting service. The transport seam
  is designed so one can be adopted later without touching call sites.
- A bundler, a module-system migration, or any change to how the page is served.

## Global Constraints

- **Zero runtime dependencies.** The repo has none today; this work adds none.
- **Test infrastructure:** Node's built-in runner (`node --test`), with a `test`
  script in `package.json`. No linter, formatter, or end-to-end infrastructure
  is set up as part of this work.
- **No changes to how the app loads.** `index.html` stays classic scripts;
  `src/*.js` stays CommonJS. Opening `index.html` over `file://` must keep
  working.
- The spec document is a working file and is not committed.

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Scope | Both runtimes, shared design | One record shape across the app |
| Destination | Console + optional remote sink | Console-only cannot debug an issue you did not witness |
| Capture | Explicit calls + global error handlers | The crash you most want to see is the one nobody wrote a log line for |
| Redaction | Allowlist at the remote boundary | Fails closed; a leak is a disclosure, not a bug |
| Structure | Pure core + runtime adapters | Makes the security boundary testable in isolation |

An independent Codex approach consultation was attempted during brainstorming.
Preflight reported `ok` (version `0.0.0-stub`) but the call returned an empty
payload, so no external approaches informed this design.

## Architecture

### Module layout

```
src/logger/core.js      pure: record building, level filter, redaction
src/logger/node.js      adapter: stdout sink, process error handlers
src/logger/browser.js   adapter: console sink, remote transport, window handlers
```

`core.js` performs no I/O and does no runtime detection. It exports pure
functions only, which is what allows the redaction rule to be tested without a
DOM, a network, or a process.

Each file ends with a five-line dual-mode tail: assign to `module.exports` when
it exists, otherwise to a browser global. The globals are `window.__loggerCore`
(from `core.js`, an internal detail) and `window.logger` (from `browser.js`, the
call-site handle used by `app.js`). Consequences:

- Node: `const logger = require('./logger/node')`.
- Browser: `index.html` loads `src/logger/core.js`, then `src/logger/browser.js`,
  then `app.js`. Order matters and is load-bearing.

Loading an adapter installs that runtime's global error handlers as a side
effect, so no explicit init call is needed at any call site. `configureRemote`
is the one thing that must be called explicitly, and only when a remote endpoint
is being enabled.

### Core API

```js
logger.debug(msg, ctx)
logger.info(msg, ctx)
logger.warn(msg, ctx)
logger.error(msg, ctx)   // ctx.err may carry an Error instance
logger.fatal(msg, ctx)
```

**`msg` must be a static string. Every dynamic value goes in `ctx`.** A value
interpolated into the message text bypasses a field-level allowlist entirely.
This rule is enforced by convention and by the message-length cap; there is no
linter configured to check it.

### Record model

```js
{
  v: 1,
  ts: "2026-09-17T10:38:21.123Z",   // ISO 8601, UTC
  level: "debug" | "info" | "warn" | "error" | "fatal",
  msg: "...",
  ctx: { ... },                      // flat object
  err: { name, message, stack },     // present only when an Error was supplied
  runtime: "browser" | "node",
  sessionId: "..."                   // per page load / per process
}
```

`v` is the schema version, so a receiver can handle records from older clients
still in the wild. `sessionId` is what allows a sequence of records to be
stitched into one user's story, which is most of what production debugging is.

This is the wire format and is the most expensive part of the design to change
later.

### Level control

Levels are ordered `debug < info < warn < error < fatal`.

- Node: `LOG_LEVEL` environment variable.
- Browser: `?logLevel=` query parameter, then `localStorage.logLevel`.
- Both default to `info`. Unrecognized values fall back to the default rather
  than throwing.

The query parameter exists so a user hitting a production bug can be told to
add it to their URL and retry, with no new build.

## Redaction

Two paths with different rules.

**Console path** receives the full `ctx`, passed through `scrubForConsole`: a
recursive denylist replacing values whose key matches
`/pass|pwd|token|secret|auth|cookie|session[_-]?key/i` with `"[redacted]"`.
This is a backstop. It fails open — an unexpected key name passes through —
which is precisely why it is not what guards the remote path.

**Remote path** passes through `projectForRemote(record, REMOTE_CTX_ALLOWLIST)`,
which constructs a new object rather than deleting from the existing one. A
field nobody considered is never copied, so it cannot leak by omission. It
enforces:

1. **Key allowlist** — `REMOTE_CTX_ALLOWLIST` is a single declared constant
   (initially `event`, `reason`, `success`, `httpStatus`, `durationMs`).
   Unlisted keys are dropped silently.
2. **Primitive values only** — an allowlisted key holding an object or array is
   dropped rather than serialized, so a secret cannot ride to the endpoint
   nested inside an approved key.
3. **Length caps** — `msg` and every string value truncate at 256 characters,
   so a stray blob cannot become an exfiltration channel.

`err.stack` is transmitted. An error without a stack is close to useless for
production debugging, and the alternative is dropping the most valuable field in
the record. Accepted residual risk: code that writes `throw new Error(password)`
would transmit that message. `scrubForConsole` is applied to `err.message` as a
backstop; it is not a guarantee.

Adding a field to `REMOTE_CTX_ALLOWLIST` is a deliberate act and should be
treated as a review-worthy change.

## Transport

Browser adapter:

```js
configureRemote({
  endpoint,              // required; absent means the remote sink stays off
  minLevel: 'warn',
  flushIntervalMs: 5000,
  maxBatch: 20,
})
```

The remote sink is **off unless an endpoint is supplied**. No endpoint exists
yet, so nothing is transmitted until someone opts in.

Behavior:

- Records at or above `minLevel` queue in memory.
- The queue flushes as a JSON array on the interval, when it reaches `maxBatch`,
  and immediately on a `fatal` record.
- On `pagehide` / `visibilitychange` it flushes via `navigator.sendBeacon`,
  which survives page unload. Otherwise `fetch(endpoint, { keepalive: true })`.
- The queue is capped at 100 records, dropping oldest first, so an unreachable
  endpoint cannot grow memory without bound.
- A recursion guard routes transport failures to the console only. A logger that
  logs its own network failures into its own network queue does not terminate.

All of this sits behind a single `setTransport(fn)` seam. Adopting Sentry or a
similar service later means writing one function, not editing call sites.

Node adapter writes one JSON object per line to stdout. No remote sink.

## Error Capture

**Browser:** `window.addEventListener('error')` and `'unhandledrejection'`, each
logged at `error` with the stack.

**Node:**

- `uncaughtException` → log at `fatal`, flush stdout, `process.exit(1)`.
- `unhandledRejection` → log at `error`, then exit non-zero.

Exiting on an unhandled rejection is deliberate. Modern Node crashes on one by
default, and attaching a handler silently suppresses that. Preserving the crash
means adding logging does not quietly change what the process does under
failure.

## Call-Site Changes

### `app.js`

| Current | Replacement |
|---|---|
| `console.log("Logging in:", username)` | `logger.info('login attempt', { event: 'login_attempt', username })` |
| `console.log("Login result:", result)` | `logger.info('login completed', { event: 'login_complete', success: result.success, username: result.user })` |
| `console.error("Validation error:", ...)` | `logger.warn('form validation failed', { event: 'validation_failed', reason: validation.error })` |

Notes:

- `username` appears in console output and is dropped en route to the endpoint,
  because it is not allowlisted. This is the mechanism working as designed.
- Validation failure is a `warn`, not an `error`. A user leaving a field blank is
  expected behavior; routing it to the error channel trains people to ignore
  that channel.
- The submit handler body is wrapped in `try/catch` logging at `error`, so a
  throw inside it produces a record rather than a silently dead form.
- `login()` continues to receive the password and continues never to place it in
  a log call. The difference is that this is now enforced structurally rather
  than by care alone.

### `src/index.js`

`console.log(greet('world'))` is the program's **output**, not a log line. It
stays a `console.log`. Routing it through the logger would turn `Hello, world!`
into a JSON record and change what the program prints. A `logger.debug` call is
added alongside it instead.

`src/utils.js` is not modified.

### `index.html`

Two `<script>` tags added before the existing `app.js` tag, in order:
`src/logger/core.js`, then `src/logger/browser.js`.

### `package.json`

Add a `test` script running `node --test`. No dependencies added.

## Testing

Unit tests against `core.js`, which is pure and needs no DOM, network, or
process. The tests that carry weight:

- An unlisted `ctx` key is absent from remote output.
- An allowlisted key holding an object or array is dropped, not serialized.
- Strings over 256 characters truncate, in both `msg` and `ctx` values.
- `scrubForConsole` redacts a nested `password` key.
- Level filtering honors each runtime's configuration precedence, and an
  unrecognized level falls back to `info`.
- A record carrying a password in an unlisted field produces remote output with
  no trace of that value anywhere in the serialized payload. This asserts the
  security property directly rather than asserting the shape of the code.

Adapter behavior (batching, `sendBeacon`, global handlers) is not covered by
automated tests, since no end-to-end infrastructure is being set up. It is
verified manually.

## Risks and Assumptions

- **Assumption:** an endpoint will exist to receive browser records. Validate by
  confirming the receiving service and its expected payload shape before
  `configureRemote` is called with a real endpoint. Until then the sink stays
  off and the subsystem is console-only.
- **Assumption:** `sessionId` is not treated as personal data by whoever operates
  the endpoint. Validate with whoever owns the log store before enabling remote.
- Script-load order in `index.html` is load-bearing and has no automated guard.
- `REMOTE_CTX_ALLOWLIST` will drift toward permissiveness unless additions are
  reviewed deliberately.
- The static-`msg` rule has no automated enforcement, only the length cap.
