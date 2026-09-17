# Logging Subsystem Design

Date: 2026-09-16
Status: approved for planning
Repository: `drill-test-project` (branch `feature/webapp-enhancement`)

## Problem

The application has no logging subsystem. Diagnostics today are five ad-hoc
`console` calls: three `console.log` and one `console.error` in `app.js`, and
one `console.log` in `src/index.js`. They share no format, carry no
timestamps, have no severity levels, and cannot be filtered or redirected.

Two consequences motivate this work:

1. **Production failures are invisible.** Uncaught exceptions and rejected
   promises in the browser half are never surfaced anywhere. There is no
   channel through which a production failure reaches a developer.
2. **The existing diagnostics are unsafe and unsearchable.** `app.js:5` logs
   `console.log("Logging in:", username)` — a credential-adjacent value
   interpolated into a prose string, inside the application's only
   authentication flow. Prose messages cannot be grepped or aggregated, and
   interpolation bypasses any future redaction.

## Goals

- One logging module shared by the browser half and the Node half.
- Structured, levelled, timestamped records with stable event identifiers.
- A redaction guarantee that holds for every present and future sink.
- A sink seam so remote log shipping can be added later as configuration,
  not as a rewrite of every call site.
- Unit tests that cover the redaction and username guarantees.

## Non-Goals

Explicitly out of scope. These are the obligations the sink seam exists to
accept later; none are built now.

- Remote log shipping to a collector. No collector endpoint exists — the
  `API_ENDPOINT` constant in `app.js` points at `https://api.example.com/login`,
  a stub that is never called.
- Batching, retry/backoff, and page-unload flushing.
- Sampling or rate limiting.
- Cross-request correlation IDs (there is no server component).
- User consent UI for telemetry.
- Linting and formatting infrastructure.

## Settled Decisions

Decided during brainstorming on 2026-09-16. Recorded so the plan does not
re-open them.

| Decision | Choice |
|---|---|
| Scope | One shared module, used by both halves |
| Destination | Console now, behind a pluggable sink interface |
| Redaction | Key-pattern redaction plus a no-credentials call-site rule |
| Usernames | Full in Node, hashed in the browser |
| Module format | ES modules throughout |
| Tooling | `node:test` unit tests; no linter or formatter |
| Architecture | Pure core plus factory plus two per-environment entry modules |

## Global Constraints

- **Zero runtime and dev dependencies.** The repository has none today and
  gains none here. The test runner is Node's built-in `node:test`.
- **No build step and no bundler.** Both runtimes load ES modules natively.
- **Node:** current LTS. Verified locally against v26.8.2; the features used
  (`node:test`, native ESM) have been stable since Node 18.
- **Every log record passes through redaction before any sink receives it.**
  This is the subsystem's central invariant; a change that lets a sink
  observe an unredacted record is a defect regardless of its other merits.
- **The logger must never throw into its caller.** A diagnostic subsystem
  that can crash the application it diagnoses is a net negative.

## Architecture

### Module layout

```
src/logging/core.js             createLogger(), redact(), LEVELS  (pure, no I/O)
src/logging/sinks/console.js    createConsoleSink()
src/logging/logger.node.js      createNodeLogger() + default `log` instance
src/logging/logger.browser.js   createBrowserLogger() + default `log` instance
test/logging.test.js            node:test suite
```

The core is pure: it performs no I/O, reads no environment, and constructs no
sink. Everything environment-specific is supplied by a caller. This is what
makes the browser-only behavior testable under Node.

### Files modified

| File | Change |
|---|---|
| `package.json` | Add `"type": "module"` and `"scripts": { "test": "node --test" }` |
| `src/index.js` | `require` to `import` |
| `src/utils.js` | `module.exports` to `export` |
| `app.js` | Replace ad-hoc console calls; add global error handlers |
| `index.html` | `<script src="app.js">` to `<script type="module" src="app.js">` |
| `README.md` | Document `npm test` and the local-server requirement |

## Data Model

A log record:

```js
{
  ts: "2026-09-16T18:22:01.334Z",  // ISO 8601, millisecond precision
  level: "info",                    // one of LEVELS
  event: "login_attempt",           // stable snake_case identifier
  fields: { username: "3f2a91c7" }, // redacted structured data
  ctx: { env: "browser" }           // logger-bound context, merged into every record
}
```

**`event` is an identifier, not a sentence.** `login_attempt`, never
`"Logging in: bob"`. Two reasons: prose messages cannot be grepped or grouped
across occurrences, and string interpolation smuggles variable data past
redaction, which only inspects `fields`. This rule is the direct fix for the
`app.js:5` defect.

All variable data belongs in `fields`.

### Levels

`debug < info < warn < error`, exported as an ordered `LEVELS` array. A record
whose level ranks below the configured threshold is dropped in the core, before
redaction and before the sink.

## Public API

### Core

```js
createLogger({ sink, level = "info", usernamePolicy = "full", ctx = {}, now = () => new Date() })
  // returns { debug, info, warn, error } — each (event, fields = {}) => void

redact(value)  // pure; returns a redacted deep copy
LEVELS         // ["debug", "info", "warn", "error"]
```

`now` is injected so tests can assert on `ts` deterministically.

### Entry modules

Each entry module exports a factory (for tests) and a default configured
instance (for application code).

```js
// logger.node.js
createNodeLogger({ sink, env } = {})  // env defaults to process.env
export const log = createNodeLogger()

// logger.browser.js
createBrowserLogger({ sink, storage } = {})  // storage defaults to localStorage
export const log = createBrowserLogger()
```

Both factories must tolerate their ambient dependency being absent, so that
importing `logger.browser.js` under Node does not throw. Guard with
`typeof localStorage === "undefined"` rather than assuming presence.

Each entry module sets its own bound context: `ctx: { env: "node" }` and
`ctx: { env: "browser" }` respectively. Once a remote sink aggregates both
halves, `env` is what separates them.

## Redaction

`redact()` runs inside the core, after level filtering and **before the sink is
called**. Placement is the point: the guarantee attaches to the subsystem, not
to each sink, so a remote sink added later inherits it without reimplementation.

Rules:

- Walk `fields` recursively. Replace the value of any key matching
  `/pass|secret|token|auth|credential|cookie|api[_-]?key/i` with the string
  `"[redacted]"`, regardless of the value's type.
- Recurse through plain objects and arrays. Leave other values as-is.
- Track visited objects in a `WeakSet`; on revisit, emit `"[circular]"`.
- Cap recursion at depth 8; below that, emit `"[max-depth]"`. An adversarial
  or accidentally deep object must not stall the application.
- Never mutate the caller's object. Return a copy.

**This denylist fails open.** A sensitive field whose key matches no pattern —
`pwd2`, `securityAnswer`, `ssn` — is logged in the clear. The pattern list is a
backstop against mistakes, not a substitute for the call-site rule below.

### The no-credentials call-site rule

Credential-bearing objects are never passed to the logger. Log the presence of
a secret, never the secret: `{ hasPassword: true }`, not `{ password }`. In
particular, the raw `formData` object in `app.js` must not be logged.

## Username Handling

`usernamePolicy` governs the value of a field literally named `username`:

- `"full"` — logged verbatim. Set by the Node entry, whose sink writes to
  local stdout.
- `"hash"` — logged as an 8-character hex FNV-1a digest. Set by the browser
  entry, whose sink is the one that could later ship off-device.

**The hash is a correlation identifier, not a privacy guarantee.** FNV-1a is a
fast non-cryptographic hash, and usernames are drawn from a small, guessable
space; anyone holding the logs can recover the inputs by brute force. It
defeats casual reading of logs, nothing stronger. This limitation was raised
during brainstorming and accepted: the alternative, an async SubtleCrypto
SHA-256, would make every logging call asynchronous, which is a poor trade for
a diagnostic subsystem. Revisit only if the logs' threat model changes —
notably, before any remote sink is built.

The hash must be stable within and across sessions so that multiple records
from one user can be correlated.

## Error Handling

- `sink.write(record)` is synchronous and contractually must not throw.
- The core wraps every `write` in `try/catch`. On a throw, it emits one raw
  `console.error` describing the sink failure and continues.
- A re-entrancy guard prevents a failing sink from triggering logging that
  re-enters the failing sink.
- A malformed call (`log.info()` with no event, a non-object `fields`) is
  coerced to a valid record rather than throwing. A logger that rejects bad
  input crashes callers at exactly the moment they are already in trouble.

## Call-Site Changes

### `app.js`

- `login()` logs `login_attempt` with `{ username }`. The `password` parameter
  is never passed to the logger. This replaces the existing
  `console.log("Logging in:", username)`.
- The submit handler logs `login_result` with `{ success }` on the stubbed
  result, replacing `console.log("Login result:", result)`.
- Validation failure logs `form_validation_failed` at `warn` with
  `{ missingFields: ["password"] }` — a list of *which* fields were absent.
  The `formData` object itself is not logged. This replaces
  `console.error("Validation error:", ...)`.

  This requires a small change to `validateForm`, which today returns only
  `{ valid: false, error: "Missing required fields" }` and does not say which
  field was missing. It gains a `missingFields` array alongside the existing
  `error` string; the existing keys and their values are unchanged, so the
  one current caller keeps working. Computing the list at the call site
  instead was rejected: it would duplicate the validation rule in two places,
  where the copies can drift apart.
- **New:** `window.addEventListener("error", ...)` and
  `window.addEventListener("unhandledrejection", ...)` log `uncaught_error`
  at `error` with message, source, line/column, and stack where available.
  This is the highest-value element of the change for the stated goal: it is
  the only one that surfaces failures nobody thought to instrument.

### `src/index.js`

`console.log(greet('world'))` **remains a `console.log`.** It is program
output, not a diagnostic. Routing it through a level-filtered logger would mean
`LOG_LEVEL=error` silently suppresses the program's actual output.

The governing rule: **user-facing output goes to stdout directly; diagnostics
go through the logger.** `src/index.js` gains a `log.debug("main_start")` as a
diagnostic, alongside its unchanged output statement.

## Testing

`test/logging.test.js`, run with `npm test` (`node --test`). No dependencies.

Required coverage:

1. **Redaction** — flat sensitive key; nested object; array element; each
   pattern in the denylist; a cyclic object terminates and emits
   `"[circular]"`; an over-deep object terminates and emits `"[max-depth]"`;
   the caller's input object is not mutated; a non-matching key survives
   unchanged.
2. **Level filtering** — a record below threshold never reaches the sink;
   a record at or above threshold does.
3. **Record shape** — `ts`, `level`, `event`, `fields`, `ctx` all present;
   `ts` is ISO 8601; injected `now` is honored; `ctx` is merged into every
   record.
4. **Username policy** — `"full"` passes the value through; `"hash"` replaces
   it; the same username hashes identically twice (correlation works); two
   different usernames hash differently.
5. **Sink failure** — a sink whose `write` throws does not propagate the throw
   to the caller, and does not recurse.
6. **Entry wiring** — `createBrowserLogger({ sink: fake })` produces a logger
   with `usernamePolicy: "hash"`; `createNodeLogger({ sink: fake })` produces
   one with `"full"`. Both importable under Node without a browser global.
7. **Level configuration** — `createNodeLogger` honors `env.LOG_LEVEL`;
   `createBrowserLogger` honors `storage.logLevel`; both fall back to `info`
   when the source is absent or holds an unrecognized value.

8. **`validateForm` missing-field reporting** — with neither field present,
   `missingFields` lists both; with one absent, it lists only that one; with
   both present, `valid` is `true`. The pre-existing `valid` and `error` keys
   keep their current values.

Test 6 is why the architecture has injectable entry factories: it is the only
way the browser's redaction posture is verified without a browser.

Test 8 requires `validateForm` to be importable under Node, which has two
consequences for `app.js`:

- `validateForm` gains an `export`.
- Its top-level DOM wiring — `document.getElementById("login-form")
  .addEventListener(...)` and the two new `window` error handlers — must be
  guarded by `typeof document !== "undefined"`. Without the guard, merely
  importing the module under Node throws on the missing `document`, and the
  test cannot run at all.

Splitting `app.js` into a pure module plus a separate DOM-wiring script is the
cleaner structure and would remove the need for the guard. It is deferred:
it is a refactor this task does not require, and the guard is one line.

## Operational Notes

### Changing log level in production

- Node: `LOG_LEVEL=debug node src/index.js`.
- Browser: `localStorage.setItem("logLevel", "debug")` in devtools, then
  reload. This is the intended production-debugging workflow — an affected
  user can enable debug output for their own session without a deploy.

### ESM breaks `file://` loading

Converting `index.html` to `<script type="module">` means the page no longer
works when opened directly as a `file://` URL: module scripts are subject to
CORS, and `file://` origins fail it. The page must be served over HTTP, for
example `python3 -m http.server 8000`.

This is inherent to the ES module decision, not to the logger. It will be
documented in `README.md`.

## Risks and Open Items

| Item | Disposition |
|---|---|
| The redaction denylist fails open on unanticipated key names | Accepted. Mitigated by the no-credentials call-site rule. Revisit if field count grows. |
| FNV-1a usernames are brute-forceable | Accepted and documented. Must be revisited before any remote sink ships. |
| ESM breaks `file://` loading of `index.html` | Accepted; documented in README. |
| Converting `src/utils.js` touches a file unrelated to logging | Accepted. Required by the repo-wide ESM decision; the change is two lines. |

## Implementation Sequence

Intended ordering for the plan. Each step leaves the repository working.

1. ESM conversion: `package.json`, `src/index.js`, `src/utils.js`,
   `index.html`. Verify `node src/index.js` still runs.
2. Core: `createLogger`, `redact`, `LEVELS`, level filtering, error handling.
3. Console sink.
4. Entry modules for Node and browser, with the username policies wired.
5. Test suite covering items 1-7 above.
6. Call-site migration in `app.js` and `src/index.js`, including the global
   error handlers.
7. README updates: `npm test`, the local-server requirement, and the
   log-level controls.
