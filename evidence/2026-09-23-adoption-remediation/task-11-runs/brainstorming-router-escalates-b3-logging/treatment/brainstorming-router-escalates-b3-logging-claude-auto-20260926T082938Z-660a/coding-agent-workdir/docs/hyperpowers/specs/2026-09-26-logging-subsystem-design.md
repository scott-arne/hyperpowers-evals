# Logging Subsystem Design

Date: 2026-09-26
Status: approved design, not yet implemented

## Problem

The application has no logging layer. What exists is four bare `console`
calls spread across `app.js` and `src/index.js`, one of which prints a
username. Nothing leaves the user's machine, so a failure that happens to a
real user in production leaves no trace anyone can inspect afterwards.

The goal is a logging subsystem that produces structured records, prints them
locally, and ships a privacy-constrained subset to a remote collector that can
be queried after the fact.

## Scope

In scope: a shared logger used by both the browser page and the Node entry
point, a vendor-neutral HTTP transport, an enforced allowlist governing what
may leave the machine, global error capture in both runtimes, and the unit-test
and lint tooling needed to verify the above.

Out of scope: choosing and provisioning the collector itself, end-to-end
browser tests, log-based alerting or dashboards, sampling, and any change to
the login flow's behavior beyond replacing its `console` calls.

## Decisions Already Settled

These were decided with the human partner during brainstorming and are inputs
to the design, not open questions.

| Decision | Choice |
|---|---|
| Destination | Console **and** a remote collector |
| Surfaces | Both browser and Node, one shared logger |
| Packaging | ESM everywhere, no build step and no bundler |
| Collector | Vendor-neutral HTTP sink at a configurable URL |
| Remote data policy | Allowlist: unknown keys are dropped, not scrubbed |
| User identity | Generated per-session id; never the username |
| Error capture | Global handlers in both runtimes |
| Tooling | Unit tests and lint/format; no e2e |
| Free-text `msg` | Console only; does not ship |
| Error stacks | Do ship, residual risk accepted |

## Global Constraints

- No build step. The browser loads raw ESM source directly. Dev dependencies
  are permitted because they never reach the browser.
- No runtime dependencies. The logger uses only platform primitives.
- Unit tests use Node's built-in `node:test` and `node:assert`.
- Lint and format via ESLint flat config plus Prettier at standard settings.
- The logger must never throw into its caller and must never block the UI or
  the Node event loop.

## Architecture

Pure core surrounded by runtime adapters. The core holds all logic and performs
no I/O; adapters supply the platform pieces.

```
src/logger/
  core.js        levels, record construction, dispatch to sinks
  allowlist.js   projects a full record into the remote-safe subset
  http-sink.js   batching, bounded queue, retry, exit flush
  browser.js     console, window error hooks, page-exit flush, session id
  node.js        console, process error hooks, beforeExit flush, session id
  index.js       runtime detection, config resolution, configured export
```

`core.js` does not import `http-sink.js`. Sinks are passed in. This is what
lets the core be tested with no network and no DOM.

### Data flow

1. Call site invokes `log.info(event, msg, fields)`.
2. `core.js` drops the call if it is below the configured level.
3. `core.js` builds the full record.
4. The full record goes to the local console sink.
5. `allowlist.js` projects the full record into a remote record.
6. The remote record goes to the HTTP sink, which queues and batches it.

## Record Model

Full record, console only:

```js
{ ts, level, event, msg, sessionId, runtime, ...fields }
```

- `ts` — ISO 8601 timestamp.
- `level` — one of `debug`, `info`, `warn`, `error`.
- `event` — stable machine-readable name, e.g. `"login.attempt"`.
- `msg` — human-readable text.
- `sessionId` — generated identifier, described below.
- `runtime` — `"browser"` or `"node"`.

### The allowlist

The remote record contains only keys on the allowlist. Unknown keys are
dropped. This is an allowlist and not a denylist specifically so that a log
call written later, by someone who has forgotten this document, cannot leak a
value the design never anticipated.

Initial allowlist:

`ts`, `level`, `event`, `sessionId`, `runtime`, `durationMs`, `httpStatus`,
`errorName`, `errorMessage`, `errorStack`, `path`, `fieldNames`,
`droppedCount`

`fieldNames` carries the *names* of form fields, never their values.
`droppedCount` carries the queue-overflow count described under Delivery, and
is on the allowlist because that report is itself a remote record and would
otherwise be stripped by this projection.

Adding a field to production logs means adding it here. That friction is
intentional and is the cost of the guarantee.

### Why `msg` does not ship

Free text defeats an allowlist. A call such as
`log.info("login.failed", "login failed for " + username)` would carry a
username past every control in this design. Remote records therefore carry
`event` plus allowlisted structured fields, and `msg` stays local.

### The structural guarantee

`http-sink.js` accepts only a projected record. No code path passes it a full
record. Keeping secrets out of the collector is therefore a property of the
code's shape rather than a rule a developer must remember. A test asserts this
directly.

### Accepted exception: error text

`errorName`, `errorMessage`, and `errorStack` are free text and do ship,
because global error capture is worthless without them. The residual risk is
that a thrown error's message embeds a sensitive value. This risk is accepted;
it is lower than that of interpolated messages because stacks are generated
from code rather than assembled by a developer, but it is not zero.

### Session identity

Remote records carry a generated session id in place of any username, so a
user's events can be correlated without an account identifier reaching the
collector. In the browser the id lives in `sessionStorage` and lasts for the
tab session. In Node it is generated once per process.

Note that the collector will still observe client IP addresses as a property
of receiving HTTP requests. That is outside the logger's control and is
recorded here so it is not mistaken for anonymity.

## Delivery and Failure Handling

- **Queue.** Bounded at 100 records. When full, the oldest record is dropped
  and a drop counter increments. The counter is reported with the next batch
  so silent data loss is visible in the collector.
- **Batching.** Flush on 20 queued records, a 5-second timer, an explicit
  `flush()`, or a runtime exit hook.
- **Error priority.** `error`-level records flush immediately rather than
  waiting for a batch, because the most valuable record is usually the one
  written just before a crash.
- **Retry.** One retry with backoff, then the batch is dropped. A dead
  collector must not become a request storm or an unbounded buffer.
- **Isolation.** Sink failures never propagate to the caller and never block.
  All transport errors are swallowed and surfaced locally at most once per
  interval.
- **Recursion guard.** A failing sink must not log its own failure through the
  logger. A guard flag prevents the resulting loop.

### Exit behavior

- **Browser.** Flush on `pagehide` and on `visibilitychange` to hidden, using
  `fetch(url, { keepalive: true })`. `sendBeacon` is a fallback only, because
  it cannot set an `Authorization` header and would otherwise force the ingest
  token into a query string.
- **Node.** Flush on `beforeExit`, and best-effort on `uncaughtException`.
  Delivery of the final batch during a hard crash is not guaranteed. Immediate
  flushing of `error` records is what keeps this from mattering in practice.

## Global Error Capture

- Browser: `window.onerror` and `unhandledrejection`.
- Node: `uncaughtException` and `unhandledRejection`.

Each produces an `error`-level record with `errorName`, `errorMessage`, and
`errorStack`. Existing process behavior is preserved: the logger observes these
events, it does not swallow them or prevent a crash that would otherwise occur.

## Configuration

- **Node** reads `LOG_URL`, `LOG_TOKEN`, and `LOG_LEVEL` from the environment.
- **Browser** reads `window.__LOG_CONFIG__`, set by a small inline script in
  `index.html`.

When `LOG_URL` is unset the HTTP sink is not installed and the logger degrades
to console only. This keeps local development and the test suite free of
network calls.

### Deployment requirement: the browser token is public

With no build step there is no mechanism to keep a browser ingest token
secret. It ships in page source and is readable by anyone who opens developer
tools. This is true of all browser telemetry and is not a defect of this
design, but it constrains deployment:

- The browser must use a **write-only ingest token** that permits appending
  records and nothing else, or requests must be proxied through the
  application's own origin.
- A token that can read logs back must never be used in the browser.

No placeholder token is committed to the repository.

## Changes to Existing Files

| File | Change |
|---|---|
| `index.html` | Script tag becomes `type="module"`; add the inline config script. |
| `package.json` | Add `"type": "module"`, devDependencies, and `test` / `lint` / `format` scripts. |
| `src/index.js` | Convert `require` to `import`. |
| `src/utils.js` | Convert `module.exports` to `export`. |
| `app.js` | Replace the four `console` calls with logger calls. |

### `app.js` specifics

- The password value is never passed to the logger in any form, including as
  part of an object.
- `validateForm` failures log which field *names* were missing, via
  `fieldNames`, never their contents.
- `console.log("Logging in:", username)` becomes an event carrying a session
  id and no username.

Module scripts are deferred, so `app.js`'s top-level `getElementById` still
runs after the DOM is parsed.

## Testing

Runner: `node:test` with `node:assert`. Each test below is a requirement, not
a suggestion; the allowlist is a security control and an untested security
control is an assumption.

1. The allowlist drops keys that are not on it.
2. A record containing a `password` key does not survive projection.
3. The HTTP sink is never passed a full record — the structural guarantee,
   asserted directly.
4. Level filtering suppresses calls below the configured level.
5. `error`-level records flush immediately rather than batching.
6. A full queue drops the oldest record and reports the drop count.
7. A failing sink does not throw into the caller.
8. A hanging sink does not block the caller.
9. Browser and Node global handlers each convert a thrown error into a
   well-formed record, using injected fakes rather than a real DOM or a real
   process crash.

## Risks and Open Items

- **Browser ingest token is public.** Mitigated by requiring a write-only
  token or an origin proxy; see the deployment requirement above.
- **Error text can embed sensitive values.** Accepted, with reasoning
  recorded above.
- **Final batch may be lost on a hard Node crash.** Mitigated by immediate
  error-level flushing.
- **Collector observes client IPs.** Outside the logger's control; recorded so
  it is not mistaken for anonymity.
- **Assumption: the target Node version supports global `fetch` and
  `node:test`** (Node 18 or newer). The repository declares no Node version.
  Validate by adding an `engines` field during implementation and confirming
  the runtime in use.
- **Assumption: the eventual collector accepts a JSON array of records over
  HTTP POST with a bearer token.** This holds for Better Stack, Datadog HTTP
  intake, and Loki, but the specific endpoint is not yet chosen. Validate when
  the destination is selected; a mismatch changes the sink's serialization
  only, not the architecture.
