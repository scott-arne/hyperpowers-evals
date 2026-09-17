# Logging Subsystem Design

Date: 2026-09-17
Status: approved design, not yet planned

## Problem

Errors vanish silently. When something fails for a real user, nobody finds out.
The application today has three `console.*` calls in `app.js`, one in
`src/index.js`, and no global error handling in either runtime: `window.onerror`,
`window.onunhandledrejection`, `process.on('uncaughtException')`, and
`process.on('unhandledRejection')` are all unused. A browser console nobody
reads is not a debugging channel.

Structure alone does not fix this. A logger that formats neatly into the same
unread console leaves the problem exactly where it is. The fix has two halves:
catch the failures currently missed, and deliver them somewhere the team looks.

## Goals

- Unhandled errors in both runtimes are captured and reported off the user's
  machine.
- One shared logging module serves both entry points.
- Credentials and PII cannot reach a log payload, enforced structurally rather
  than by author discipline.
- The logger can never itself cause or worsen a production failure.

## Non-goals

- Log aggregation for `info`/`debug` volume. Only `error` and above leave the
  machine by default.
- Session replay, performance tracing, or analytics.
- A logging backend of our own. There is no server in this repository.
- Lint/format tooling and end-to-end tests (explicitly declined; see Risks).

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | Both entry points, one shared module | Both are production surfaces |
| Destination | Hosted error service (Sentry or equivalent) | Buys alerting, dedup, and symbolication outright; building a receiver is disproportionate for an app this size |
| Vendor coupling | Behind a transport seam the project owns | Vendor SDKs sprawl into application code otherwise |
| Module strategy | Shared ESM core + per-runtime adapters, no bundler | One genuinely shared core without buying a build step |
| Redaction | Allowlist, applied in core | A denylist fails open |
| Tooling | Unit tests (`node --test`) only | Chosen by the project owner |

### Module strategy: why not a bundler

A bundler (esbuild) is the conventional answer to "npm package in a browser,"
and it brings source maps, which matter for symbolicating minified stack traces.
This repository does not minify, has no build step, and has no dependencies, so
a bundler would be cost without present return. The design is arranged so that
adding one later touches the adapters and not the core.

The browser obtains the vendor SDK from its CDN build; Node obtains it from npm.
The two transports therefore wrap different vendor artifacts. That asymmetry is
contained in the two adapter files and is precisely what the transport seam is
for.

## Architecture

Five files under `logging/`. Everything logic-bearing or security-relevant is
pure and testable without a DOM, a network, or a live process.

| File | Responsibility | Depends on |
|---|---|---|
| `logging/core.js` | `createLogger({ level, transport, context })` → `{ debug, info, warn, error, child }`. Level filter, event assembly, redaction call, transport dispatch. | `redact.js` |
| `logging/redact.js` | The allowlist and the tripwire. Pure function over a fields object. | nothing |
| `logging/transport.js` | The seam. `createConsoleTransport()`, `multiTransport([...])`. A transport is `{ send(event) }`. | nothing |
| `logging/browser.js` | `initBrowserLogging(config)`. Installs `error` + `unhandledrejection` listeners; wraps the vendor CDN global as a transport. | core, transport |
| `logging/node.js` | `initNodeLogging(config)`. Installs `uncaughtException` + `unhandledRejection`; wraps the npm SDK as a transport. | core, transport |

`browser.js` and `node.js` are the only files aware that a runtime exists.
Changing vendors touches one file per runtime.

### Unit boundaries

- **core** — what it does: turns a call site's message and fields into a
  filtered, redacted event and hands it to a transport. How you use it:
  `createLogger`. What it depends on: `redact`. Nothing else.
- **redact** — what it does: returns a copy of a fields object containing only
  allowlisted primitive values. How you use it: `redact(fields)`. Depends on
  nothing, so it can be reasoned about in isolation — which is the point, since
  it is the security boundary.
- **transport** — what it does: defines the `send(event)` contract and supplies
  console and fan-out implementations. Consumers never learn what is behind it.

## Event shape

```js
{
  ts:      "2026-09-17T09:37:57.123Z",  // ISO-8601
  level:   "error",                     // debug | info | warn | error
  msg:     "login.failed",              // stable dotted event name
  context: { runtime, release, environment, sessionId },
  fields:  { /* allowlisted primitives only */ },
  err:     { name, message, stack }     // present only when an Error was passed
}
```

`msg` is a stable dotted event name rather than prose. Hosted services group
issues by message; `"login.failed"` aggregates into one issue, while
`"Login failed for bob at 09:37"` creates a new issue per occurrence and
destroys the dedup that motivated choosing a hosted service.

## Data flow

1. Call site invokes `log.error('login.failed', { statusCode }, err)`.
2. Level filter runs **first**, so suppressed calls cost nothing beyond a
   comparison.
3. `redact(fields)` strips everything not allowlisted.
4. Event assembled with context merged from the logger and any `child()`.
5. `transport.send(event)`, wrapped in `try/catch`.
6. Fan-out: the console transport always receives the event; the vendor
   transport receives it only when `level >= remoteThreshold` (default
   `error`). The threshold is configuration, not a call-site concern.

## Redaction

Applied inside `core.js` before any transport receives the event, so no
transport — present or future — can bypass it.

Rules:

- **Allowlist of keys.** Initial set: `event`, `route`, `statusCode`,
  `durationMs`, `formField`, `validationError`, `userId`, `sessionId`,
  `success`, `attemptCount`. Anything else is dropped.
- **Dropped keys are counted** into `_dropped: n` on the event, so a withheld
  field is visible rather than silently missing during debugging.
- **Primitives only.** Strings, numbers, booleans, and `null` survive. Objects
  and arrays are dropped rather than traversed, which structurally eliminates
  the "logged the whole `formData`" leak class.
- **Strings truncate at 512 characters.**
- **Tripwire.** A key matching `/pass|secret|token|auth|cookie|card|ssn/i` is
  dropped and counted separately as `_blocked: n`, even though the allowlist
  already excluded it. Defense in depth, and it makes near-misses detectable.

`username` is deliberately **not** allowlisted. `app.js:5` currently logs a
username on every login attempt; under this design it will not. That is an
intended behavior change.

### Accepted risk

`err.stack` passes through unredacted, because a stack trace is the substance of
an error report. Some engines embed argument values in stack frames, and
key-based allowlisting cannot reach inside a stack string. This is accepted, not
solved.

## Failure behavior

The logger must never become the outage.

- `transport.send` is wrapped in `try/catch` inside core. A throwing, offline,
  or rate-limited transport never propagates to the call site.
- Send failures are **counted, never logged** — logging about logging recurses.
  A reentrancy flag enforces this.
- The browser transport is fire-and-forget. No `await` appears anywhere in the
  submit path, so error reporting cannot add latency to a login.
- `multiTransport` isolates members: one throwing transport does not prevent the
  others from receiving the event.

### Global handlers preserve crash semantics

- Browser: `window.addEventListener('error')` and `('unhandledrejection')` report
  and do **not** call `preventDefault()`. Suppressing the default changes
  application behavior, which instrumentation must not do.
- Node: `uncaughtException` logs, attempts a **bounded** flush, then
  `process.exit(1)`. A crash handler that swallows the crash trades a visible
  failure for a zombie process.

## Configuration

Without a bundler the browser cannot read environment variables, so the vendor
DSN, `environment`, and `release` arrive via a small config `<script>` in
`index.html` ahead of the module script. Browser DSNs are write-only ingest keys
and public by design, so page-source visibility is expected for this class of
service.

Assumption: the selected vendor's browser DSN is safe to expose in page source;
validate against the chosen service's own guidance before the DSN is committed.

Node reads the same values from `process.env`.

## Changes to existing files

| File | Change |
|---|---|
| `package.json` | Add `"type": "module"`, `"scripts": { "test": "node --test" }`, Node SDK dependency |
| `src/utils.js` | `module.exports` → `export` |
| `src/index.js` | `require` → `import`; initialize Node logging; `console.log` → `log.info` |
| `index.html` | `<script type="module" src="app.js">`; add vendor CDN tag and config script before it |
| `app.js` | Convert to a module; replace three `console.*` calls; wrap the submit handler body in `try/catch` reporting via `log.error` |

`app.js` call-site mapping:

- `console.log("Logging in:", username)` → `log.info('login.attempt')`, no username.
- `console.log("Login result:", result)` → `log.info('login.result', { success: result.success })`.
- `console.error("Validation error:", …)` → `log.warn('login.validation_failed', { validationError: validation.error })`.

ESM over `file://` is blocked by the browser, so the page must be served over
HTTP during development. This is a change to the local workflow and should be
noted in the README.

## Testing

`node --test`, unit only.

| Area | Cases |
|---|---|
| core | Level filtering suppresses below threshold; event shape matches spec; `child()` merges context; a throwing transport is contained |
| redact | Allowlisted key survives; unknown key dropped; `_dropped` count accurate; `password` key hits the tripwire and increments `_blocked`; nested object dropped; 600-char string truncates to 512 |
| transport | `multiTransport` fans out to every member; one throwing member does not stop the others; console transport maps each level to the right console method |
| node adapter | Handlers registered against a fake emitter; `uncaughtException` path calls injected flush then injected exit |
| browser adapter | Pure parts only: config validation, and event construction from an `ErrorEvent`-shaped plain object |

## Risks

- **Browser wiring has no automated coverage.** End-to-end tests were declined.
  The DOM listener registration and the vendor CDN transport — the exact path
  that fixes "errors vanish silently" — will be verified by a single manual
  check: throw in a served page, confirm the event arrives in the service. If
  that wiring regresses later, the failure mode is silent and identical to
  today's problem.
- **No lint or format tooling.** Declined. Style consistency rests on review.
- **Vendor lock at the adapter.** Mitigated by the transport seam, not
  eliminated: migrating still means rewriting two adapter files.
- **Stack frames may carry values.** See Accepted risk above.

## Out of scope for the first implementation

Sampling, rate limiting, offline queueing and retry, breadcrumbs, and source-map
upload. Each is additive behind the existing transport seam.
