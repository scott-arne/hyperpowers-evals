# Logging Subsystem Design

Date: 2026-09-26
Status: Approved design, pending implementation plan

## Problem

The app has no logging subsystem. Diagnostics today are three ad-hoc
`console.*` calls in `app.js` and one in `src/index.js`. In production a
browser `console.log` is invisible to the team, so failures that users hit are
not observable at all. Uncaught exceptions produce no record anywhere.

One of those existing calls, `app.js:5`, logs a username from the login form.
Any logging design here has to treat credential exposure as a first-class
constraint rather than an afterthought.

## Goals

- One logging API serving both the browser app and the Node entry point, with
  a single record format.
- Production browser failures, including uncaught ones, reach a destination
  the team can search.
- Credentials and user-supplied PII cannot reach the log destination.
- The logger cannot break the app it instruments.

## Non-Goals

- Metrics, tracing, or performance monitoring. Logging only.
- Durable client-side log storage that survives a session.
- Automatic instrumentation of network calls or user interactions.
- Log analysis, alerting, or dashboards beyond what the chosen vendor offers.

## Global Constraints

These apply to every task in the resulting implementation plan.

- **Module system:** native ES modules. `package.json` gets `"type":
  "module"`, `index.html` uses `<script type="module">`, and the existing
  CommonJS in `src/index.js` and `src/utils.js` is converted.
- **No bundler, no build step.** Source runs directly in both runtimes.
- **Zero runtime dependencies.** The vendor is reached over `fetch` against
  its HTTP ingest API, not via its browser SDK.
- **Tooling, set up before implementation:** ESLint + Prettier for
  lint/format, `node:test` for unit tests. No end-to-end test infrastructure.
- **The logger never throws into application code.**

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | Both apps, shared core | One record format across runtimes; avoids two divergent loggers |
| Destination | Hosted vendor behind a sink interface | Real visibility without building a log service; swappable later |
| Redaction | Default-deny allowlist + free-text scrubber | Allowlist cannot leak unanticipated fields; scrubber covers strings |
| Capture | Explicit API + global error handlers | Catches unanticipated crashes without wrapping `fetch` |
| Correlation | Anonymous session ID + opt-in `setUser` | Threads a session without sending PII by default |
| Vendor integration | HTTP ingest over `fetch`, no SDK | SDKs assume a bundler and add declined auto-instrumentation |

### Rejected alternatives

- **Own collector endpoint.** No backend exists in this repo; building and
  operating one is out of scope for the current goal. The sink interface keeps
  this available later as a one-file change.
- **Browser-local buffer only.** Pull-not-push; gives no visibility into
  failures that nobody reports, which is the case the request is about.
- **Redaction denylist.** Fails open. Any newly added sensitive field leaks
  silently until someone remembers to list it.
- **Auto-instrumentation of `fetch`/XHR.** Multiplies volume and cost, and
  routes request bodies — including this app's login POST — back through the
  logger after the design deliberately removed them.
- **Persistent device ID.** Durable individual tracking; needs consent review
  and is not required for the debugging cases in scope.

## Architecture

```
src/logging/
  index.js       createLogger(config) -> { debug, info, warn, error, setUser }
  record.js      builds the canonical record
  redact.js      allowlist filter + free-text scrubber
  session.js     session-ID generation and storage
  sinks/
    console.js   dev sink, pretty output
    stdout.js    Node: one JSON object per line
    http.js      Browser: batched POST to vendor ingest
  handlers.js    installs global error handlers for the current runtime
  browser.js     assembles core + http sink + browser handlers
  node.js        assembles core + stdout sink + Node handlers
```

The core has no knowledge of destinations. A sink is `{ write(record) }` and
nothing more. That single-method interface is what makes the vendor
replaceable and what makes the batching logic testable without a network.

Sink selection: `node.js` always uses `stdout.js`. `browser.js` uses
`http.js` in production and `console.js` in development, chosen by the same
configuration that sets the level. The console sink exists so local
development does not require a vendor key.

Each module has one job: `redact.js` decides what may be recorded, `record.js`
decides the shape, a sink decides where it goes, `handlers.js` decides what
gets captured automatically. None of them needs another's internals.

### Configuration

```js
createLogger({ level, release, endpoint, apiKey, allowlist, sink })
```

A single object at construction. No module-level globals, no ambient state,
so tests construct independent loggers.

## Record Format

```js
{
  ts:        "2026-09-26T08:13:19.412Z",  // ISO 8601, UTC
  level:     "error",                      // debug | info | warn | error
  message:   "Login request failed",       // scrubbed free text
  fields:    { },                          // allowlisted structured data
  sessionId: "0f3c...",                    // always present
  userId:    "u_8821",                     // only after setUser()
  runtime:   "browser" | "node",
  release:   "1.0.0",                      // from package.json version
  err:       { name, message, stack }      // error records only; scrubbed
}
```

`release` is included so regressions can be tied to a version. Without it,
"this started failing on Tuesday" is unanswerable.

## Levels

Four levels, ordered `debug < info < warn < error`, with a configurable
threshold.

- Browser: `warn` in production, `debug` in development. The higher production
  default is a cost control — every browser record is a network call to a
  metered vendor.
- Node: read from `LOG_LEVEL`, defaulting to `info`. Node records are lines on
  stdout and cost nothing.

Suppression happens before the record is constructed, so a filtered `debug`
call costs one comparison.

## Redaction

Two stages, applied in order. Neither is optional.

### Stage 1 — allowlist over `fields`

A configured set of permitted key names. Keys not in the set are **dropped,
not masked** — they never enter the record. Nested objects are walked under
the same rule.

Starting allowlist: `event`, `durationMs`, `statusCode`, `route`,
`errorCode`, `attemptCount`.

`username` is deliberately absent. It is user-supplied PII bound for a
third-party processor. The supported way to identify a user is `setUser()`
with an opaque internal ID.

### Stage 2 — scrubber over free text

Applied to `message`, `err.message`, and `err.stack`. Pattern-based
replacement with `[REDACTED]` for:

- `password=`, `token=`, `authorization:` key-value forms
- bearer tokens
- JWT-shaped strings
- long high-entropy hex and base64 runs

This stage is heuristic: it will miss some secrets and over-redact others.
That limitation is why stage 1 is default-deny rather than relying on stage 2.
It exists because a developer will eventually interpolate a secret into a
message string, where an allowlist has no visibility.

## Correlation

- **Session ID:** a random UUID per browser session (`sessionStorage`) or per
  Node process run. Attached to every record. No personal data.
- **`setUser(opaqueId)`:** optional, called after successful login with an
  internal user ID. Never the username or email from the login form. The hook
  can remain uncalled until privacy sign-off lands; building it does not
  commit to sending user IDs.

## Delivery

### Browser transport

- Batch and flush at **20 records** or **5 seconds**, whichever is first.
- `error` records flush immediately; they are the ones that must survive a tab
  close.
- Queue capped at **100 records**. Past the cap, drop oldest and carry a
  `droppedCount` on the next batch. A bounded queue is required so an error
  loop in the app cannot grow memory without limit.
- Flush on `visibilitychange` → `hidden` via `navigator.sendBeacon`, falling
  back to `fetch` with `keepalive: true`. `unload` is unreliable on mobile.
- **Retry:** one retry on network failure or 5xx after a short backoff, then
  drop the batch. No `localStorage` spooling — persisting records to the
  user's disk reopens the privacy exposure this design closes, for reliability
  diagnostics do not need.

### Node sink

One JSON object per line to stdout; `error` to stderr. Synchronous,
unbatched, no transport. Process supervision collects it.

### API key exposure

The browser's vendor `apiKey` ships in client-side JavaScript and is readable
by anyone. This is inherent to browser telemetry and cannot be designed away.
Requirement on vendor selection: the key must be **ingest-scoped, write-only,
and rotatable**. A vendor that cannot issue such a key is disqualified.

## Global Error Handlers

Installed explicitly by `browser.js` / `node.js`, never as an import side
effect. Implicit installation makes tests order-dependent and surprises
anything importing the core.

| Runtime | Hooks | Behavior |
|---|---|---|
| Browser | `window.onerror`, `unhandledrejection` | Log at `error` with scrubbed stack, then re-dispatch to any previously registered handler |
| Node | `uncaughtException`, `unhandledRejection` | Log at `error`, flush synchronously, then preserve default exit behavior |

The Node handler must not swallow `uncaughtException`. Doing so converts a
crash into a zombie process.

## Failure Behavior

The logger never throws into application code. Sink errors, network failures,
and malformed records are swallowed, with at most one `console.warn` per
session. Logging is diagnostic infrastructure; a broken logger must not become
the outage.

## Testing

Unit tests with `node:test`. Coverage is weighted toward expensive failures,
not spread evenly.

- **`redact.js` — heaviest coverage.** Allowlist drops unknown keys including
  nested ones and keeps permitted ones; scrubber catches every secret pattern
  in `message`, `err.message`, and `err.stack`. Includes an explicit
  regression test asserting that a record built from the login form's
  `{ username, password }` contains neither value anywhere in its serialized
  output. This test is written first and carries a comment explaining why it
  exists: it is the assertion that must fail before credentials could reach
  the vendor.
- **`record.js`** — record shape, required fields present, `userId` absent
  until `setUser`, level-threshold suppression.
- **Sinks** — a fake `{ write }` sink verifies batching at 20, the 5-second
  timer, immediate `error` flush, the 100-record cap and `droppedCount`, and
  single-retry-then-drop. No network in tests.
- **Handlers** — installed handlers log and delegate; the Node path preserves
  default exit behavior.
- **Out of scope for unit tests:** real vendor delivery. Verified once by hand
  against a staging project.

## Migration of Existing Call Sites

| Location | Current | Becomes |
|---|---|---|
| `app.js:5` | `console.log("Logging in:", username)` | `log.info("login attempt", { event: "login_submit" })` — username dropped |
| `app.js:24` | `console.log("Login result:", result)` | `log.info("login result", { event: "login_result" })` — `login()` is currently a stub returning `{ success, user }`; no `statusCode` exists to log until it makes a real request |
| `app.js:26` | `console.error("Validation error:", ...)` | `log.warn("validation failed", { event: "validation_failed", errorCode })` |
| `src/index.js:4` | `console.log(greet('world'))` | unchanged — program output, not a log record |

The last row is a distinction worth preserving: `greet` output is the
program's purpose, not diagnostics, and routing it through the logger would be
wrong.

## Rollout

Three independently revertible steps.

1. Land `src/logging/` with its full test suite and no callers. No app
   behavior changes.
2. Convert `src/` and `index.html` to ESM; wire `node.js` into
   `src/index.js`. Node first: no vendor, no network, no privacy surface, so
   the core is proven with the smallest blast radius.
3. Wire `browser.js` into `app.js`, replacing the three `console.*` calls,
   with `level: "warn"` and the vendor key configured.

## Open Items

- **Vendor not yet selected.** The design is vendor-agnostic by construction,
  so this does not block the spec or steps 1 and 2. Step 3 cannot start until
  a vendor is named.
- *Assumption:* the chosen vendor offers a write-only, rotatable ingest key
  and an HTTP ingest endpoint usable without its SDK. Validate against vendor
  documentation before step 3. If false, the no-SDK decision must be
  revisited, which would also reopen the no-bundler constraint.
- *Assumption:* sending anonymous session IDs and opaque user IDs to a
  third-party processor is acceptable under applicable privacy obligations.
  Validate with the owner of that sign-off before step 3. Steps 1 and 2 do not
  depend on it, so the review can run in parallel.
