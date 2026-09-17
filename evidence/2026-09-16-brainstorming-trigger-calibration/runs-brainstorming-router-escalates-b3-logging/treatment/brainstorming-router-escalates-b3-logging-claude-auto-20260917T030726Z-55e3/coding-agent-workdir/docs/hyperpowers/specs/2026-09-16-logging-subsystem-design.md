# Logging Subsystem Design

Date: 2026-09-16
Status: approved design, not yet implemented
Repository: drill-test-project, branch `feature/webapp-enhancement`

## Problem

The application has no logging. It has scattered `console` calls that are
visible only in the devtools of whoever happens to be looking, and only on code
paths someone already anticipated. Production failures — a TypeError in an event
handler, an unhandled promise rejection — produce nothing anyone will ever see.

Two of the existing calls are also actively harmful. `app.js` logs the username
in plaintext on every login attempt, and logs the whole login result object,
which contains the username again.

The goal is a logging subsystem that (a) covers every runtime the application
runs in, (b) delivers browser-side records to a server so production failures
are visible, (c) cannot leak credentials, and (d) captures failures nobody
predicted.

## Decisions

Settled with the human partner during brainstorming:

| Decision | Choice |
|---|---|
| Surface | Both runtimes — browser and Node — over a shared core |
| Browser log destination | App-owned `POST` endpoint; console by default, remote enabled by config |
| Redaction | Deny-by-default allowlist at the remote boundary |
| Capture | Global error handlers plus converted explicit call sites |
| Architecture | Pure shared core plus per-runtime adapters |
| Error text on the wire | `errorName`, `errorMessage`, and `stack`, each truncated |
| Send failure | One retry, then drop; nothing persisted on the user's device |
| Tooling | Unit tests via `node:test`; no linter, no e2e, no property tests |

## Global Constraints

These apply to every task in the implementation plan.

- **Zero runtime dependencies.** `package.json` currently has none. This change
  adds none, in either `dependencies` or `devDependencies`.
- **No build step and no bundler.** The browser loads plain `<script>` tags.
- **No module-system migration.** `src/index.js` and `src/utils.js` stay
  CommonJS; `app.js` stays a global script. Files that must work in both
  runtimes use a dual-export footer (see "Dual-export footer").
- **Tests use `node:test` and `node:assert` only**, run via `npm test`.
- **Logging must never break the application.** Any failure inside the logging
  subsystem is contained and swallowed at the boundary. A broken transport, an
  unreachable endpoint, or a serialization error must not propagate into
  application code. The one deliberate exception is Node's
  `uncaughtException` handler (see "Capture").

## Architecture

Four files under `src/logger/`, with a strictly one-way dependency chain:

```
redact.js   (no dependencies)
   ^
core.js     (depends on redact)
   ^
browser.js / node.js   (depend on core; one is loaded per runtime)
```

That direction is the point of the design. It lets `redact.js` — the piece whose
failure mode is a credential leak — be tested as a pure function with no DOM, no
network, and no application.

### `src/logger/redact.js`

Exports `ALLOWED_CTX_FIELDS` and `redact(ctx)`.

`redact` walks only the **top level** of `ctx` and keeps only keys present in
the allowlist. Every other key is dropped regardless of its name.

Initial allowlist: `action`, `component`, `code`, `status`, `field`,
`durationMs`, `attempt`, `errorName`, `errorMessage`, `stack`.

Value coercion:

- Strings: truncated to 512 characters.
- Numbers, booleans, `null`: passed through unchanged.
- Everything else (objects, arrays, functions, symbols, `undefined`):
  replaced with the literal `"[dropped:object]"`.

Nested structures are **not** recursed into. This is deliberate: a recursive
walk is exactly how a password at `formData.fields[2].value` would reach the
wire under a key that looks innocuous. Deep context is not worth that risk.

The count of dropped keys is written to `ctx._dropped` when it is non-zero, so
the logs themselves show that redaction fired. Dropped key *names* are not
recorded.

### `src/logger/core.js`

Exports `createLogger({ level, transports, runtime, session })`, returning an
object with `debug`, `info`, `warn`, and `error` methods, each with the
signature `(msg, ctx)`.

Responsibilities, all pure apart from calling transports:

1. Filter by configured level (`debug` < `info` < `warn` < `error`).
2. Assemble the record (see "Record format").
3. Pass the unredacted record to transports marked `local`, and the redacted
   record to transports marked `remote`.
4. Wrap every transport invocation so a throwing transport is caught and
   discarded rather than propagating into the caller.

Each transport is an object `{ scope, send }` where `scope` is the string
`"local"` or `"remote"` and `send(record)` delivers it. `core.js` computes the
redacted record at most once per log call, and only when at least one `remote`
transport is registered.

`core.js` references no globals: no `window`, no `document`, no `process`, no
`fetch`. Anything runtime-specific arrives as a parameter.

### `src/logger/browser.js`

Exports `initLogger(config)` where `config` is
`{ endpoint, level, remote, window: win, fetch: fetchImpl }` — the last two
injectable so the adapter is testable without a DOM.

Responsibilities: create or read the session ID, construct the console and HTTP
transports, call `createLogger`, install the global error handlers, and return
the logger. `remote` defaults to `false`, so the HTTP transport is inert until
an endpoint is configured — the repository has no confirmed backend today.

### `src/logger/node.js`

Exports `initLogger(config)` with the same shape, reading defaults from
`LOG_LEVEL` and `LOG_ENDPOINT` environment variables, installing the stdout
transport and the `process` error handlers.

### Dual-export footer

Each of the four files ends with:

```js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { /* ... */ };
} else {
  window.AppLogger = Object.assign(window.AppLogger || {}, { /* ... */ });
}
```

This is the entire compatibility mechanism. It is dated-looking but it is six
lines, adds no dependency, and preserves `file://` loading of `index.html`,
which native ESM would break.

## Record Format

Versioned from the first record, because the server will store and query these
and the format is the expensive thing to change later.

```json
{
  "v": 1,
  "ts": "2026-09-16T21:04:18.412Z",
  "level": "error",
  "msg": "login request failed",
  "runtime": "browser",
  "session": "9f3c1a7e2b8d4506",
  "ctx": { "action": "login", "code": "ETIMEDOUT" }
}
```

- `v` — schema version, integer, currently `1`.
- `ts` — ISO 8601 UTC timestamp.
- `level` — one of `debug`, `info`, `warn`, `error`.
- `msg` — **always a developer-authored string literal.** Never interpolated,
  never containing variable data. This is a hard rule, not a convention: the
  allowlist governs `ctx` only, so `log.error(\`login failed for ${username}\`)`
  bypasses redaction entirely. Code review must reject template literals in
  `msg`.
- `runtime` — `"browser"` or `"node"`.
- `session` — correlation ID (see below).
- `ctx` — the only allowlist-governed field; all variable data goes here.

### Session correlation

A 16-hex-character random ID, generated via `crypto.getRandomValues` in the
browser and `crypto.randomBytes` in Node, stored in `sessionStorage` on the
browser side so a user's sequence of failures within a tab can be followed.

It resets when the tab closes, is never sent to the login endpoint, and is never
associated with a username. It is the replacement for the current plaintext
username logging: it answers "did this same person fail three times in a row"
without recording who they are.

## Transports

| Transport | Runtime | Receives | Behavior |
|---|---|---|---|
| `consoleTransport` | browser | unredacted | Maps level to the matching `console` method |
| `httpTransport` | browser | redacted | Batches and POSTs to the configured endpoint |
| `stdoutTransport` | node | unredacted | One JSON object per line; `warn`/`error` to stderr |

The console transport receives unredacted records deliberately. It writes to the
user's own devtools on the user's own machine, showing them their own data, so
full detail costs nothing and keeps local debugging useful. Redaction exists to
govern what crosses the network, and it is applied at exactly that boundary.

### `httpTransport` delivery

- Buffers records and flushes when the buffer reaches 20 records or every 5
  seconds, whichever comes first.
- Flushes via `navigator.sendBeacon` on `visibilitychange` → `hidden`. This
  matters specifically for a login page: a successful login navigates away and
  cancels any in-flight `fetch`, losing the records from the most interesting
  moment.
- Buffer is capped at 200 records and drops oldest on overflow, so it cannot
  grow without bound during an endpoint outage.
- A failed send is retried once with backoff and then **discarded**. Nothing is
  persisted to `sessionStorage` or `localStorage`: log records must not rest on
  a user's device where they outlive the page and are readable by any script on
  the origin.
- The transport never reports its own failures through the logger, which would
  loop.

## Capture

### Browser

`window.addEventListener("error", ...)` and
`window.addEventListener("unhandledrejection", ...)`.

Records are de-duplicated by `errorName + message + first stack frame`, capped
at 5 occurrences per key per session. An error thrown inside a loop or a
re-render must not flood the endpoint.

Both handlers are wrapped so that a failure inside the handler cannot itself
raise.

### Node

`process.on("uncaughtException")` logs the error, flushes synchronously, and
then **re-throws**. Swallowing an uncaught exception leaves the process in an
undefined state, which is worse than crashing. This is the one place logging is
permitted to end the process, and it does so only because the process was
already doomed.

`process.on("unhandledRejection")` logs at `error` and does not exit.

## Changes to Existing Files

### `app.js`

| Current | Becomes |
|---|---|
| `console.log("Logging in:", username)` | `log.info("login attempt", { action: "login" })` — the username is **removed**, not converted |
| `console.log("Login result:", result)` | `log.info("login result", { action: "login", success: result.success })` — the current line logs the whole result object, which contains `user` |
| `console.error("Validation error:", validation.error)` | `log.warn("validation failed", { action: "login", code: "missing_fields" })` — a user omitting a field is not an application error; logging it at `error` would bury real errors |

`validateForm` currently returns a single generic error and does not say which
field was missing, so the record carries a stable `code` rather than a `field`.
Reporting which field was blank would require changing `validateForm`'s return
shape, which is outside this change.

`app.js` also calls `initLogger(...)` once at load, before the submit listener is
registered.

`login(username, password)` keeps its current signature and still never logs the
password. Its signature is a standing hazard: any future edit that adds a log
line inside that function has a password in scope. The allowlist is the backstop
— `password` is not an allowed key — but the hazard is worth naming here.

### `index.html`

Three `<script>` tags added before the existing `app.js` tag, in dependency
order: `src/logger/redact.js`, `src/logger/core.js`, `src/logger/browser.js`.

### `src/index.js`

Adds `initLogger()` and the global handlers at startup.

`console.log(greet("world"))` **stays a `console.log`.** That line is the
program's output, not a diagnostic. Routing it through the logger would send
"Hello, world!" to the production log endpoint on every run. The distinction
between program output and log records is maintained deliberately.

### `src/utils.js`

Unchanged.

### `package.json`

Adds `"scripts": { "test": "node --test" }`. No dependencies of any kind.

## Testing

`node:test` and `node:assert`, run with `npm test`. Tests live in `test/`.

**`test/redact.test.js`** carries the bulk of the coverage, because it covers the
one component whose failure causes real harm:

- Allowlisted keys survive with values intact.
- Unlisted keys are dropped, including keys that merely resemble allowed ones.
- `{ username, password }` passed directly yields neither key.
- A password nested inside an allowed key's object value does not survive
  (the value becomes `"[dropped:object]"`).
- Strings longer than 512 characters are truncated.
- `_dropped` reflects the correct count, and is absent when nothing was dropped.
- `null`, `undefined`, and a non-object `ctx` are handled without throwing.

**`test/core.test.js`**:

- Level filtering includes and excludes the right levels at each setting.
- Record shape matches the documented format, including `v`.
- Local transports receive unredacted records; remote transports receive
  redacted ones.
- A transport that throws does not propagate the exception to the caller, and
  other transports still receive the record.

**`test/browser.test.js`** and **`test/node.test.js`** use the injected
`window`/`fetch` parameters to assert handler registration and batching
behavior without a DOM.

## Risks and Accepted Trade-offs

1. **`errorMessage` and `stack` can carry user input.** This is the design's
   main residual leak path and it is accepted knowingly. A thrown
   `Invalid value: hunter2`, or a JSON parse error echoing a malformed payload,
   reaches the log store as message text. The allowlist cannot help: the field
   is allowed by name and the danger is in the value. Truncation to 512
   characters bounds the blast radius but does not close the hole. The
   alternative — dropping message text — was considered and rejected as making
   crash reports too weak to serve the purpose of this change.

2. **Records generated during an endpoint outage are lost.** Accepted in
   exchange for never writing log data to a user's device.

3. **No fetch/network instrumentation.** Deferred. `login()` is currently a stub
   that performs no network call, so there is nothing to instrument. It can be
   added later behind the existing transport interface without rework.

4. **Top-level-only redaction loses structured context.** Callers must flatten
   what they want logged. This is the cost of not recursing, and it is the right
   trade for a subsystem adjacent to credential handling.

5. **Assumption: a `POST` log endpoint will exist.** The only endpoint in the
   repository is a stub pointing at `api.example.com`, and no backend was
   confirmed. Validate by configuring `endpoint` against the real service before
   enabling `remote`. Until then the HTTP transport stays disabled by default
   and the subsystem delivers console and stdout output only — which means the
   production-visibility goal is not met until that endpoint exists.

## Out of Scope

- Log aggregation, search, alerting, or retention policy on the server side.
- Any third-party logging or error-tracking service.
- Migrating the repository to ESM.
- Linting, formatting, end-to-end tests, and property-based tests (considered
  and declined during brainstorming).
- Server-side receipt, storage, or authentication of the log endpoint.

## Process Note

The Codex approach gate fired for this design (the runtime-sharing question
presented genuinely different architectures) and the preflight returned `ok`,
but the companion call returned an empty result. Per the gate's one-shot rule
this was recorded as a degrade and not retried. The three approaches considered
were therefore authored without independent Codex input.
