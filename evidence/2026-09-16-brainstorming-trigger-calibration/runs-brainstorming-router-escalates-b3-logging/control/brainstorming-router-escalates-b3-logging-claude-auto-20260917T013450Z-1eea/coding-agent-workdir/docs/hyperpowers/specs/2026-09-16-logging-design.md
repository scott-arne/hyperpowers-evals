# Application Logging — Design

Date: 2026-09-16
Status: Approved (design), pending implementation plan

## Problem

The app has no logging subsystem. Diagnostic output is four ad-hoc
`console.*` calls spread across two runtimes:

- `app.js:5` — `console.log("Logging in:", username)`
- `app.js:24` — `console.log("Login result:", result)`
- `app.js:26` — `console.error("Validation error:", ...)`
- `src/index.js:4` — `console.log(greet('world'))`

These cannot be filtered, cannot be silenced or amplified without editing
source, carry no timestamp or severity, and cannot be routed anywhere other
than the local console. `app.js:5` logs a username in a function whose
signature also carries a plaintext password, so the current pattern is one
careless edit away from writing a credential to the console.

The goal is a logging module both runtimes share, with severity levels, a
structured record, redaction of sensitive fields, and a transport boundary
that allows remote log shipping to be added later without touching call
sites.

## Global Constraints

- **No runtime dependencies.** The repo has no `node_modules`, no lockfile,
  and no build step. The logger is hand-written and adds neither.
- **No build step.** `index.html` loads `app.js` as a classic script;
  `src/index.js` uses CommonJS. The logger must work in both without a
  bundler or a module-system migration.
- **Unit tests via `node:test`.** The built-in Node test runner, no
  dependencies. Redaction, level filtering, and record shape are covered.
  A `test` script is added to `package.json`.
- **No linter or formatter** is introduced by this work.
- **No end-to-end test infrastructure** is introduced by this work.
- Out of scope: any remote log-ingest service, log retention policy, or
  changes to the login flow's behavior.

## Decisions

Each of these was chosen over stated alternatives during design.

| Decision | Chosen | Rejected |
|---|---|---|
| Surface | Both runtimes, one shared module | Browser only; Node only |
| Destination | Console transport now, pluggable transport seam | Console only (no seam); remote shipping now |
| Redaction | Denylist in the logger | Allowlist; caller responsibility |
| Module format | UMD-style single file, no build | ESM migration; bundler + logging library |

Remote shipping was rejected for now because no log-ingest endpoint exists —
`API_ENDPOINT` in `app.js` points at `api.example.com`, a stub — and because
shipping logs off-device raises retention and PII questions beyond the scope
of this change. The transport seam exists so that decision stays cheap.

## Architecture

### `src/logger.js` (new)

A single file wrapped UMD-style: it assigns to `module.exports` when
`module` is defined, and otherwise attaches `Logger` to `window`. No other
module system is involved.

Public surface:

```js
Logger.create({ name, level, transport }) -> logger
Logger.consoleTransport
logger.debug(msg, fields)
logger.info(msg, fields)
logger.warn(msg, fields)
logger.error(msg, fields)
```

`create` options:

- `name` (string, required) — a stable tag identifying the call site's
  subsystem, so one flow's output is filterable from the rest.
- `level` (string, optional) — minimum severity to emit. Defaults to the
  ambient level resolution below.
- `transport` (function, optional) — defaults to `consoleTransport`.

### Levels

Ordered `debug(10) < info(20) < warn(30) < error(40)`. A call emits when its
level's numeric value is greater than or equal to the configured threshold.

Threshold resolution, in precedence order:

1. The `level` passed to `create`.
2. `process.env.LOG_LEVEL` when running under Node.
3. `window.__LOG_LEVEL__` when running in a browser.
4. `"info"`.

Sources 2 and 3 exist so verbosity can be raised in production without a
code change or a deploy. An unrecognized level string falls back to `"info"`
rather than throwing; a logger that crashes the app it is instrumenting is
worse than one that is too quiet.

### Record shape

Every emitting call constructs exactly one record and hands it to the
transport:

```js
{
  ts:    "2026-09-16T12:34:56.789Z",  // ISO 8601, new Date().toISOString()
  level: "warn",                       // string, not numeric
  name:  "auth",
  msg:   "validation failed",
  fields: { /* scrubbed; omitted when the caller passed nothing */ }
}
```

The record is the contract between the logger and any transport. A future
remote transport consumes this same shape.

### Redaction

`fields` is scrubbed before the record reaches the transport. A key is
redacted when its *normalized* form matches any denylist entry exactly.
Normalizing means lowercasing the key and removing `_` and `-`, so
`API_KEY`, `api-key`, and `apiKey` all normalize to `apikey`. Without this
step a naive lowercase comparison would miss the snake_case and kebab-case
spellings that are most common in configuration objects.

Denylist entries (already in normalized form): `password`, `passwd`,
`secret`, `token`, `apikey`, `authorization`.

Matching is exact against the normalized key, not a substring test. A
substring test would redact `tokenCount` or `passwordResetRequested`, which
are diagnostic fields worth keeping.

A redacted value is replaced with the string `"[redacted]"`; the key itself
is preserved so its presence remains visible in the log.

The scrub recurses into plain objects and arrays with a depth cap of 4.
Beyond the cap, the value is replaced with `"[truncated]"`. The cap bounds
work on deep structures and prevents a cyclic object from hanging the
logger.

**Stated limitation:** the scrub applies to `fields` only. `msg` is a string
the caller has already assembled, and the design does not attempt to scrub
free text. `log.info("logging in " + password)` still leaks. This is why the
integration below passes structured fields rather than interpolated strings,
and why call sites should follow that pattern.

### Transport seam

A transport is a function with the signature `(record) => void`. The logger
calls it once per emitted record and ignores its return value.

`consoleTransport` is the only implementation shipped. It maps levels to
`console.debug`, `console.info`, `console.warn`, and `console.error`
respectively, and prints the record.

A remote transport would implement the same signature, with batching,
retry, and failure handling contained inside it. The logger does no
buffering, no async work, and no error handling on the transport's behalf.
No remote transport is built by this work.

## Integration

### `app.js`

Create one logger: `const log = Logger.create({ name: "auth" })`.

| Current | Replacement |
|---|---|
| `console.log("Logging in:", username)` | `log.info("login attempt", { username })` |
| `console.log("Login result:", result)` | `log.info("login result", { success: result.success })` |
| `console.error("Validation error:", validation.error)` | `log.warn("validation failed", { error: validation.error })` |

Notes:

- `username` is deliberately retained — it is the field production debugging
  correlates on, and it is not a credential.
- The password is never passed to a log call. The denylist is a backstop,
  not the primary control.
- The result log records `success` rather than spreading the whole result
  object, so growth in that object does not silently widen log output.
- Validation failure is `warn`, not `error`: a user mistyping a form is
  expected behavior, and reserving `error` for genuine faults keeps
  error-level filtering useful.

### `src/index.js`

Create `const log = Logger.create({ name: "cli" })` and add
`log.debug("greeting generated", { name })`. This file has little to debug;
the instrumentation exists to prove the module loads and behaves under
CommonJS. The existing `console.log(greet('world'))` remains — it is the
program's output, not a diagnostic, and routing it through the logger would
suppress it at the default level.

### `index.html`

Add `<script src="src/logger.js"></script>` immediately before the existing
`<script src="app.js"></script>`. Load order matters: `app.js` reads
`window.Logger` at evaluation time.

## Testing

`test/logger.test.js`, run by `node --test`. A `"test": "node --test"` script
is added to `package.json`.

Tests inject a recording transport — an array-push function — so assertions
run against the record objects themselves rather than captured console
output.

Coverage:

1. **Level filtering** — a logger at `warn` emits `warn` and `error`,
   suppresses `debug` and `info`. Boundary included: the configured level
   itself emits.
2. **Level resolution precedence** — explicit option beats `LOG_LEVEL`
   beats the `"info"` default; an unrecognized string falls back to `"info"`
   rather than throwing.
3. **Record shape** — `ts` parses as a valid ISO 8601 date, `level` and
   `name` match, `fields` is absent when the caller passed nothing.
4. **Redaction** — each denylisted key is replaced at the top level; key
   normalization matches `Password`, `API_KEY`, `api-key`, and `apiKey`;
   near-miss keys (`tokenCount`, `username`) pass through unchanged,
   confirming exact-match rather than substring semantics; the key is
   preserved alongside the redacted value.
5. **Nested redaction** — a denylisted key nested inside an object and
   inside an array element is redacted.
6. **Depth cap** — a structure deeper than 4 levels yields `"[truncated]"`
   rather than recursing, and a cyclic object does not hang.
7. **Transport contract** — the transport is called exactly once per
   emitted record and not at all for a suppressed one.

The UMD wrapper's browser branch is not unit tested; `node:test` has no DOM.
It is verified by loading `index.html` and exercising the form manually.

## Risks and Assumptions

- **Assumption: no log-ingest endpoint is planned imminently.** Validate by
  confirming with the user before implementation. If one exists, the remote
  transport should be designed alongside this work rather than deferred,
  since batching and failure semantics may constrain the record shape.
- The denylist fails open: a sensitive field whose key nobody listed is
  logged verbatim. Accepted deliberately in favor of an allowlist's call-site
  friction. Revisit if real user data begins flowing through `fields`.
- `msg` is unscrubbed free text, as stated above.
- The UMD idiom is dated. It is the cost of supporting a classic script tag
  and CommonJS with no build step, and it is contained in one wrapper at the
  top of one file.
- Browser logs remain on the user's device. Until a remote transport exists,
  "debug production issues" in the browser still means obtaining the user's
  console output.
