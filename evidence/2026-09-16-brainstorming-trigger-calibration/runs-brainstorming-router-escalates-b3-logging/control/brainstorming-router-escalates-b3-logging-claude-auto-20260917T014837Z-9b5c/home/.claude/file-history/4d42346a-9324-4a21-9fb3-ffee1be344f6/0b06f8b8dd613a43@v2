# Browser Logging Design

Date: 2026-09-16
Status: approved (design), pending implementation plan

## Problem

The webapp has no logging subsystem. What exists is four ad-hoc `console.*`
calls in `app.js`, emitting loose strings that cannot be filtered by severity,
correlated across a session, or queried by field. Uncaught exceptions and
unhandled promise rejections are not captured at all, so the failures most
likely to matter in production leave no trace. One existing call logs the
username on every login attempt with no central control over what may be
serialized.

The goal is to make production issues debuggable from a user's console output.

## Decisions

These were settled during brainstorming and are not open in the implementation
plan.

1. **Destination: structured console output behind a pluggable sink seam.** No
   remote collector and no third-party SDK. The seam exists so remote shipping
   can be added later as a new sink rather than a rewrite of every call site.
2. **Scope: browser only.** `src/index.js` and `src/utils.js` are untouched and
   keep their existing `console.log`. The repo is not converted to ESM.
3. **Redaction: deny-list scrub enforced inside the logger.** Not an allow-list,
   and not call-site discipline. `username` is logged in full.
4. **Coverage: existing call sites, plus global error capture, plus a
   per-page-load session ID on every record.** No lifecycle or timing
   instrumentation.
5. **Tooling: unit tests via Node's built-in `node:test`.** No linter, no
   end-to-end tests, and no runtime or dev dependencies.
6. **Structure: a separate `logger.js` classic script with a dual-export
   footer.** Rejected alternatives: a `console.*` monkey-patch (leaves records
   unstructured, gives the deny-list nothing keyed to scrub, and makes devtools
   line numbers point at the wrapper) and inlining the logger in `app.js`
   (not requirable from Node, because `app.js` touches `document` at load).

## Global Constraints

- Zero dependencies, runtime and dev.
- No build step and no bundler. `index.html` loads classic scripts via plain
  `<script src>` tags.
- `logger.js` must not reference `window` or `document` at module load time on
  the Node path. This is what allows `node:test` to require it. The single
  browser-global assignment in the footer sits behind the `module`-absent
  branch, so it never executes under Node; all other browser wiring lives in
  `app.js`.
- The logger must never throw into application code.
- Unit tests cover the logger's logic; the test command is `npm test`.

## Record Shape

Every record is one object:

```js
{
  ts: "2026-09-16T18:48:12.031Z",  // ISO 8601, from new Date().toISOString()
  level: "info",                    // "debug" | "info" | "warn" | "error"
  event: "login.attempt",           // dotted machine-readable name
  sessionId: "a1b2c3d4",            // stable for the life of the logger instance
  context: { username: "alice" }    // redacted caller-supplied fields
}
```

`event` is a dotted identifier, not a sentence, so records stay greppable.
Freeform prose belongs in `context.message`.

This shape is the subsystem's interface. Any future remote sink and every call
site depend on it, so changes here are expensive after the call sites exist.

## Components

### `logger.js` (new)

Exports a `createLogger(options)` factory plus `redact` for direct testing.

**Levels.** `debug` (10), `info` (20), `warn` (30), `error` (40). A record is
emitted when its level is at or above the active threshold. The threshold
resolves in this order: an explicit `options.level`; else `localStorage.logLevel`
when it is present and names a known level; else `info`. Reading the threshold
from `localStorage` means a user in production can run
`localStorage.logLevel = 'debug'` and reload to produce verbose output without a
deploy. Access to `localStorage` is wrapped in `try/catch`, because it throws in
some privacy modes.

**Redaction.** `redact(value)` returns a copy of `value` with any property whose
key matches the deny-list replaced by the string `[redacted]`. The deny-list is
`password`, `token`, `secret`, `authorization`, `apiKey`, matched
case-insensitively. The walk recurses through plain objects and arrays, carries a
`WeakSet` to survive cycles (a repeat reference becomes `"[circular]"`), and stops
at a depth of 5, replacing anything deeper with `"[truncated]"`. Non-plain values
(strings, numbers, `null`, `Date`, DOM nodes) are passed through without
recursion.

The deny-list fails open on a sensitive key nobody named. That is the accepted
cost of choosing a deny-list over an allow-list; it catches the realistic
failure mode in this codebase, which is spreading a whole `formData` object into
a log call.

**Sink seam.** `setSink(fn)` replaces the destination. The default sink formats
the record to `console.debug`, `console.info`, `console.warn`, or `console.error`
by level. The sink call is wrapped in `try/catch` and a throwing sink is
swallowed, so a logging failure can never break the login flow.

**Session ID.** Generated once per logger instance from `crypto.randomUUID()`
when that is available, falling back to a `Math.random`-derived string. The
fallback matters because `crypto.randomUUID` requires a secure context and is
absent over `file://`.

**Footer.** The file ends with the dual-export branch below. The `window`
assignment is unreachable under Node, which is what keeps the Global Constraint
above satisfied:

```js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createLogger, redact };
} else {
  window.log = createLogger();
}
```

This is what gives the browser a global and Node's `require` the same code, with
no build step and no ESM conversion.

### `app.js` (modified)

Call-site replacements:

| Current | Becomes |
|---|---|
| `console.log("Logging in:", username)` | `log.info('login.attempt', { username })` |
| `console.log("Login result:", result)` | `log.info('login.result', { username, success: result.success })` |
| `console.error("Validation error:", validation.error)` | `log.warn('login.validation_failed', { username, error: validation.error })` |

Two deliberate changes beyond a mechanical swap:

- The validation failure drops from `error` to `warn`. A user omitting a field
  is not an application fault and should not pollute an error feed.
- `login.result` logs `result.success` rather than the whole `result` object, so
  the record shape does not silently change when `login()` stops being a stub.

Two global handlers are installed here rather than in `logger.js`, because
`logger.js` may not touch `window` at load:

- `window.addEventListener('error', ...)` emits
  `log.error('uncaught.error', { message, source, lineno, colno, stack })`.
- `window.addEventListener('unhandledrejection', ...)` emits
  `log.error('uncaught.rejection', { reason })`.

### `index.html` (modified)

One line: `<script src="logger.js"></script>` immediately before the existing
`<script src="app.js"></script>`. Order matters — `app.js` reads `window.log` at
load time to install the global handlers.

### `package.json` (modified)

Adds `"scripts": { "test": "node --test" }`. No other field changes.

### `test/logger.test.js` (new)

Cases:

- Redaction replaces a top-level `password`.
- Redaction replaces a nested sensitive key.
- Redaction replaces a sensitive key inside an array element.
- Redaction matches keys case-insensitively (`Password`, `API_KEY`).
- Non-sensitive fields survive untouched.
- A cyclic context does not hang or throw.
- Depth beyond the cap is truncated.
- A record below the threshold is not emitted.
- A record at or above the threshold is emitted.
- The emitted record carries `ts`, `level`, `event`, `sessionId`, `context`.
- `sessionId` is identical across two calls from one logger instance.
- A custom sink installed via `setSink` receives the record.
- A sink that throws does not propagate the exception to the caller.

## Data Flow

A call site invokes `log.info(event, context)`. The logger compares the level
against the threshold and returns immediately if it is below. Otherwise it
builds the record — timestamp, level, event, the instance's session ID, and
`redact(context)` — and hands it to the active sink inside a `try/catch`. The
default sink writes it to the matching `console` method.

## Testing Strategy

Unit tests via `node:test`, run with `npm test`. `logger.js` is requirable from
Node because it touches no browser globals at load, so redaction, level
filtering, record construction, and sink behavior are all testable without a
browser or a DOM shim.

Browser wiring — the script tag ordering, the two global handlers, and
`window.log` assignment — is not covered by automated tests. End-to-end testing
was explicitly ruled out as disproportionate for a 28-line form. Verification
there is manual: open `index.html`, submit the form empty and then filled, and
confirm the records appear with the expected levels and no plaintext password.

## Out of Scope

- Remote log shipping, batching, and retry. The sink seam is the extension
  point when this is wanted.
- Logging in `src/index.js` and `src/utils.js`.
- Converting the repository to ESM.
- Linting and formatting infrastructure.
- Lifecycle and timing instrumentation.
- Hashing or truncating `username`. Console-only output makes this low stakes;
  it becomes a real question if a remote sink is ever added.
