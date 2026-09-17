# Logging Subsystem Design

Date: 2026-09-16
Status: approved, pending implementation plan
Branch: `feature/webapp-enhancement`

## Problem

The app has no logging subsystem. Diagnostics today are four ad-hoc
`console.log`/`console.error` calls (three in `app.js`, one in `src/index.js`)
with no levels, no timestamps, no structure, and no redaction. Nothing about
that output is reachable or filterable when a user hits a problem in
production, which is the stated goal: "add logging so we can debug production
issues."

The app has two runtimes with no shared module system between them — a browser
page (`index.html` loading `app.js` via a classic script tag) and a CommonJS
Node entry (`src/index.js`). The only real user flow is a login form, so the
logger sits directly adjacent to plaintext credentials.

## Goals

- One logger, one record format, usable from both runtimes.
- Levels, filterable at runtime without a redeploy.
- Structured records, so a future log collector does not have to re-parse
  formatted strings.
- Sensitive values kept out of log output by the logger itself, not by caller
  discipline.
- An extension point for remote log shipping that does not require rewriting
  call sites when it is implemented.

## Non-goals

- **No remote transport in this change.** The sink seam is built; no sink that
  ships logs off the client is written. The app's `login()` is still a stub
  and `API_ENDPOINT` is never called, so there is no backend to receive logs.
  Designing a transport against a server that does not exist would fix the
  wrong interface.
- No third-party logging library. The project currently has zero dependencies
  and this change keeps it that way.
- No bundler, no ESM migration. Existing files are not converted.
- No log rotation, retention policy, or sampling.

## Decisions

Each of these was an explicit fork presented during brainstorming.

| Decision | Choice | Rationale |
|---|---|---|
| Scope | Both runtimes, one shared logger | One API and one record format everywhere |
| Transport | Console now, pluggable sink seam | No backend exists yet to receive logs |
| Redaction | Logger redacts by key (denylist) | Fails safe when a caller is careless |
| Module form | Dual-mode single file | No ESM conversion, no bundler, `file://` keeps working |
| Level control | Runtime on both sides | Live diagnosis without a redeploy |
| `username` | Logged plainly | Primary signal for tracing an individual report |
| Tooling | `node:test` unit tests | Redaction logic is pure and has real edge cases |

## Architecture

### File layout

One new file, `logger.js`, at the repository root — beside `app.js`, so the
browser loads it as `<script src="logger.js"></script>` and Node reaches it as
`require('../logger')`.

One new test file, `test/logger.test.js`, run by the built-in Node test runner.

### Public API

```js
const log = Logger.create('auth');   // named logger, name appears on every record

log.debug(msg, fields);
log.info(msg, fields);
log.warn(msg, fields);
log.error(msg, fields);

Logger.setLevel('debug');            // runtime override from a console
Logger.setSink(fn);                  // replace the output function
```

`msg` is a short static description. `fields` is an optional plain object
carrying the variable data. This split is load-bearing: redaction operates on
`fields`, not on `msg` (see Redaction below).

### Record shape

Every call builds exactly one object:

```js
{ ts, level, name, msg, ...fields }
```

`ts` is an ISO-8601 string. `level` is the lowercase level name. `name` is the
logger name from `Logger.create`. Reserved keys (`ts`, `level`, `name`, `msg`)
take precedence over same-named keys in `fields`; a colliding field key is
emitted with a `fields_` prefix rather than silently overwriting the envelope.

### Error values in fields

`Error` instances need explicit handling: `message` and `stack` are
non-enumerable, so a generic object walk produces `{}` and silently discards
the one thing worth logging. During the redaction walk, any value that is an
`Error` is converted to `{ name, message, stack }`, and `cause` is followed if
present (depth-capped like any other nesting). The resulting object is then
redacted normally, so a secret attached to a custom error property is still
scrubbed.

### The sink seam

The record leaves the logger through exactly one function:

```js
Logger.setSink(fn);   // fn(record) -> void
```

The default sink maps level to `console.debug` / `console.info` /
`console.warn` / `console.error`. This single function is the entire extension
point: adding remote shipping later means writing one new sink that batches
and POSTs records, with no change to any call site and no change to the record
format.

### Level resolution

Levels are ordered `debug` (10), `info` (20), `warn` (30), `error` (40).
The active level is resolved once at load:

- **Node:** `process.env.LOG_LEVEL`
- **Browser:** `?logLevel=<level>` in the query string, else
  `localStorage.getItem('logLevel')`
- **Fallback:** `info`
- An unrecognized value falls back to `info` rather than throwing or silencing
  output.

The URL parameter takes precedence over `localStorage` so a debug link can be
handed to someone reproducing a problem. **The URL override deliberately does
not persist to `localStorage`** — persisting it would leave anyone who clicked
a debug link in debug mode indefinitely.

`Logger.setLevel()` overrides the resolved level at runtime.

A suppressed call returns before building its record, so disabled `debug`
logging costs a single numeric comparison.

### Dual-mode loading

The file ends with:

```js
if (typeof module !== 'undefined' && module.exports) module.exports = Logger;
else globalThis.Logger = Logger;
```

This is the only unusual construct in the file and warrants a short comment
explaining why it exists (two runtimes, no shared module system, no bundler).

### Data flow

call site → level check (early return) → build record → recursive redaction →
sink → console.

## Redaction

A recursive walk over `fields` before the record reaches the sink.

- Case-insensitive key match against a denylist: `password`, `passwd`, `pwd`,
  `token`, `secret`, `authorization`, `auth`, `cookie`, `session`, `apiKey`,
  `api_key`.
- A matching key's value is replaced with the string `[REDACTED]` regardless of
  the value's type.
- Arrays are walked element-wise.
- Recursion depth is capped at 8; deeper structures are replaced with
  `[TRUNCATED]`.
- A `WeakSet` guards against circular references, which are replaced with
  `[CIRCULAR]`. Without this guard a cyclic logged object would hang the page —
  a logger that freezes the app during an incident is worse than no logger.

### Stated limitations

- **`msg` is not scrubbed.** Regex-hunting secrets in free text is unreliable
  in both directions. The rule is: message is a static description, data goes
  in fields. Redaction protects fields only.
- **A secret stored under an unexpected key name is not caught.** A denylist is
  a safety net, not a guarantee.
- **`username` is intentionally not on the denylist.** It is PII, and knowing
  which user hit a bug is most of the value of login logging. Retention of
  usernames in logs is a policy question this design does not settle.

## Failure behavior

The logger must never throw into its caller.

- Record construction and redaction are wrapped; a failure produces a minimal
  fallback record rather than propagating.
- A sink that throws is caught. The failure is reported once via
  `console.error`, after which that sink is marked poisoned and skipped rather
  than being retried on every subsequent call.

## Global error capture

`logger.js` installs page- and process-level handlers, each emitting one
`error` record including the stack. This is where most unanticipated
production failures will actually surface — the explicit call sites only cover
paths someone already thought about.

**Browser:** `window.addEventListener('error', ...)` and
`window.addEventListener('unhandledrejection', ...)`. Listeners are used rather
than assigning `window.onerror`, which would clobber any handler the page
already installed. The listeners do not call `preventDefault()`, so the error
still reaches the console and any other listener.

**Node:** `process.on('uncaughtException')` and `process.on('unhandledRejection')`.

Registering an `uncaughtException` listener **does** change Node's behavior: it
suppresses the default print-and-exit. Continuing to run after an uncaught
exception leaves the process in an undefined state, so the handler must log the
record and then terminate deliberately:

```js
process.on('uncaughtException', (err) => {
  log.error('uncaught exception', { err: serializeError(err) });
  process.exit(1);
});
```

`unhandledRejection` is handled the same way, since modern Node also defaults to
terminating on it. The net effect matches the default behavior — the process
still dies with a non-zero status — but a structured record is emitted first.

Because the handler is the last code to run before exit, it calls the sink
synchronously. A future remote sink that batches asynchronously will need a
flush-before-exit path; that belongs with the transport work, not here, and is
noted in Risks.

## Call-site migration

| Location | Current | Change |
|---|---|---|
| `app.js:5` | `console.log("Logging in:", username)` | `log.info('login attempt', { username })` |
| `app.js:24` | `console.log("Login result:", result)` | `log.info('login result', { success, user })` |
| `app.js:26` | `console.error("Validation error:", ...)` | `log.warn('validation failed', { error })` |
| `src/index.js` | `console.log(greet('world'))` | **unchanged** |

Two notes:

- Validation failure moves from `error` to `warn`. A user leaving a field blank
  is expected input handling, not an application fault; logging it at `error`
  is how error dashboards fill with noise.
- `greet('world')` is the program's **output**, not a diagnostic. Routing it
  through the logger would stamp a timestamp and level onto the text the user
  came to read, and would make it disappear under `LOG_LEVEL=warn`.
  `src/index.js` gains a logger for diagnostics alongside its untouched
  `console.log`.

`index.html` gains one line: `<script src="logger.js"></script>` **before** the
existing `app.js` tag, since `app.js` references the global at load time.

## Testing

The built-in Node test runner (`node --test`), added as a `test` script in
`package.json`. No dependencies are introduced.

Redaction and level resolution are pure and testable without a browser. Test
coverage to include:

- Denylisted keys redacted at the top level, nested, and inside arrays
- Key matching is case-insensitive
- Non-denylisted keys, including `username`, pass through unchanged
- Depth cap produces `[TRUNCATED]`; cyclic input produces `[CIRCULAR]` and
  terminates
- Level filtering suppresses below-threshold calls and admits at-or-above ones
- An unrecognized `LOG_LEVEL` falls back to `info`
- A throwing sink is caught, reported once, and not retried
- An `Error` in fields serializes to `name`/`message`/`stack` rather than `{}`
- Record envelope contains `ts`, `level`, `name`, `msg`; a colliding field key
  is prefixed rather than overwriting the envelope

Browser-specific paths (`localStorage`, URL parameter, `window.onerror`) are
verified manually against `index.html`; the dual-mode footer means the Node
tests exercise the same core logic.

## Risks

- A denylist misses secrets under unanticipated key names. Mitigated by the
  msg/fields discipline and by reviewing new field names, not eliminated.
- `?logLevel=debug` is reachable by any visitor, so verbose output is publicly
  togglable. This is the accepted cost of live diagnosis, and is why redaction
  is the logger's responsibility rather than the caller's.
- Usernames accumulate in logs with no retention policy defined here.
- The dual-mode footer is a compatibility shim. If the project later adopts
  ESM or a bundler, the footer is replaced; the core logic moves unchanged.
- The fatal-error handlers exit the process immediately after logging, which is
  safe only because the default sink is synchronous. Adding an asynchronous
  remote sink later requires a flush-before-exit path, or crash records will be
  dropped exactly when they matter most.
