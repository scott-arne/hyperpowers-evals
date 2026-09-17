# Shared Logging Module — Design

Date: 2026-09-16
Status: Approved (design), not yet implemented

## Problem

Production issues in this app cannot be debugged. Diagnostics today are three
ad-hoc `console.log` / `console.error` calls in `app.js` and one `console.log`
in `src/index.js`. They carry no timestamp, no severity, no structure, and no
way to raise or lower verbosity. Browser-side output never leaves the user's
machine, so any failure that cannot be reproduced locally is invisible.

One of those calls, `console.log("Logging in:", username)`, sits directly
beside a password field. Any future decision to ship logs off the client turns
careless log calls into a credential-disclosure path, so the rule about what
may be logged has to be part of the logging contract from the start rather
than retrofitted.

## Goals

- One logging module shared by the browser (`app.js`) and Node (`src/`) halves.
- Structured, levelled records with timestamps.
- Verbosity adjustable in a live session without a redeploy.
- Credentials cannot reach a log record, even when a call site is careless.
- A documented attachment point for a remote log sink, so shipping logs later
  does not require reworking call sites.

## Non-Goals

- No remote collector, batching, retry, or endpoint contract. No collector
  exists to target; guessing its shape now is the part most likely to be
  discarded. The seam is built; the sink is not.
- No log rotation, sampling, or correlation/request IDs.
- No change to the `https://api.example.com/login` stub or the login flow's
  behavior.
- No migration of the project to ES modules.

## Context

The repository is six files with no dependencies, no build step, and no tests.

- `app.js` — browser login form handler, loaded by `index.html` as a classic
  `<script>`. No module system.
- `src/index.js`, `src/utils.js` — an unrelated Node entry point using
  CommonJS (`require` / `module.exports`). `package.json` `main` points here.
- `package.json` — no dependencies, no `scripts`.

The two halves share no code and use incompatible module systems, which
constrains how a shared module can be loaded.

## Decisions

Each decision below was presented with alternatives and chosen by the project
owner during brainstorming.

### D1. Shared module, both surfaces

One module serves both the browser and Node halves rather than separate
loggers per surface.

### D2. Console output plus a transport seam

Records are written to the console now, and the module exposes one documented
hook where a remote sink can be attached later.

Rejected: shipping to a remote collector immediately (blocked — no endpoint
exists); console-only with no seam (leaves browser-side production failures
permanently invisible).

### D3. UMD wrapper for module loading

`src/logger.js` detects `module.exports` and otherwise attaches to `window`.

Rejected: converting the project to ES modules (edits `package.json`,
`src/index.js`, `src/utils.js`, and `index.html` — files unrelated to logging —
and breaks `file://` loading of the page); a shared core with per-environment
adapters (more files than a six-file repo warrants).

### D4. Central redaction denylist

The logger redacts sensitive values itself rather than trusting call sites.
Call-site discipline remains the convention; the denylist is the backstop.

Rejected: call-site discipline alone (one slip publishes plaintext passwords);
strict allowlisting (under-logs during an incident, which defeats the purpose).

### D5. Unit tests via `node:test`

Node's built-in test runner, chosen because it keeps the project at zero
dependencies. No linter or formatter is being introduced.

## Architecture

### Module: `src/logger.js`

A single UMD-wrapped file. Node consumes it with `require('./logger')`. The
browser loads it from a `<script src="src/logger.js">` tag placed in
`index.html` before `app.js`, which exposes `window.logger`.

Public API:

```
logger.debug(message, context)
logger.info(message, context)
logger.warn(message, context)
logger.error(message, context)
logger.setLevel(level)   // 'debug' | 'info' | 'warn' | 'error'
logger.setSink(fn)       // transport seam; fn(record)
```

`context` is optional. `message` is a plain string.

### Record shape

Every call builds one record before anything is emitted:

```js
{
  ts: "2026-09-16T12:00:00.000Z",  // ISO 8601, UTC
  level: "warn",
  msg: "Validation failed",
  env: "browser" | "node",
  ctx: { /* redacted context, omitted when no context was passed */ }
}
```

`env` is present because browser and Node records are expected to land in the
same store once a sink is attached, and they must be distinguishable there.

### Levels

Ordered `debug < info < warn < error`. A record below the active threshold is
discarded before redaction and before emission, so suppressed logging costs
nothing beyond the comparison.

Default threshold: `info`.

- Node reads `process.env.LOG_LEVEL` at module load.
- Browser reads `localStorage.logLevel` at module load, wrapped in a
  `try`/`catch` because `localStorage` access throws in some privacy modes.
- `setLevel()` overrides either at runtime.

An unrecognized level value is ignored and the default retained.

### Redaction

Applied to `ctx` after level filtering and before the record reaches the
console or the sink.

- Key denylist, stored lowercased: `password`, `passwd`, `pwd`, `token`,
  `secret`, `authorization`, `apikey`, `api_key`, `cookie`, `sessionid`. A
  context key matches when its lowercased form equals a denylist entry —
  exact match, not substring. So `apiKey` and `API_KEY` both match, while
  `passwordHint` does not.
- Matched values are replaced with the string `"[redacted]"`.
- Traversal recurses through plain objects and arrays.
- Depth is capped (limit 4); content beyond the cap is replaced with
  `"[truncated]"`.
- A `WeakSet` guards against circular references, so passing a DOM node or a
  self-referencing object cannot hang the page.
- `Error` values are converted to `{ name, message, stack }`; a raw `Error`
  otherwise serializes to `{}` and loses the diagnostic entirely.
- Redaction operates on a copy. The caller's object is never mutated.

### Console emission

Both surfaces emit the same record, formatted for its reader:

- Node: `JSON.stringify(record)` written as one line per record, since log
  collectors consume line-delimited JSON.
- Browser: the record object passed to `console.debug` / `info` / `warn` /
  `error`, so devtools keeps it expandable and inspectable.

### Transport seam

`setSink(fn)` registers a single function, replacing any previous one.

- The sink is called with the finished, already-redacted record, after console
  output. Console output never depends on the sink succeeding.
- Exceptions thrown by the sink are caught and swallowed. A broken log
  collector must never break the login flow.
- One sink at a time. Fan-out, batching, and retry are the sink
  implementation's concern, not the logger's.

## Call Site Changes

### `app.js`

The three existing `console.*` calls become logger calls:

- `login()` — `logger.info` on the login attempt, with `{ username }` only.
  The password is never passed into a log call.
- `login()` result — `logger.info` with the result.
- Validation failure — `logger.warn` with the validation error.

### `index.html`

Add `<script src="src/logger.js"></script>` before the existing `app.js` tag.

### `src/index.js`

`console.log(greet('world'))` is the program's output, not a diagnostic.
Routing it through the logger would wrap the greeting in a JSON envelope and
change what the program prints. That line stays as it is. `logger.debug` calls
are added around `main()` entry and exit instead.

### `package.json`

Add `"scripts": { "test": "node --test" }`.

## Testing

`test/logger.test.js`, run with `npm test` (`node --test`). No dependencies.

Coverage:

- Records below the active level produce no console output and no sink call.
- `setLevel` changes the threshold at runtime; an invalid level is ignored.
- Denylisted keys are redacted at the top level, nested in objects, and inside
  arrays.
- Key matching is case-insensitive (`Password`, `API_KEY`).
- The caller's context object is not mutated by redaction.
- The record carries `ts`, `level`, `msg`, and `env`.
- A registered sink receives the redacted record, not the raw context.
- A sink that throws does not propagate the exception to the caller, and
  console output still happens.
- A circular context object terminates rather than hanging.
- Depth beyond the cap is truncated.
- An `Error` in context is serialized with `name`, `message`, and `stack`.

Node-surface behavior is tested directly. Browser-surface behavior (the
`window` branch of the UMD wrapper, `localStorage` level reading) is verified
by exercising the module's exported functions under a stubbed global rather
than in a real browser; no browser test infrastructure is being introduced.

## Risks and Assumptions

- Assumption: log volume from the login flow is low enough that no sampling or
  rate limiting is needed. Validate by observing console volume once the
  logger is in place; revisit before a remote sink is attached, since sampling
  matters much more when records cost bandwidth.
- The key denylist catches conventionally-named fields only. A secret stored
  under an unconventional key still reaches the log. The call-site convention
  remains necessary; the denylist is a backstop, not a guarantee.
- `localStorage.logLevel` is user-writable. It controls verbosity only, never
  what redaction does, so raising it cannot expose credentials.
- The UMD wrapper is a dated pattern. It is confined to the top of one file
  and converts cleanly if the project later moves to ES modules.

## Files Touched

New:

- `src/logger.js`
- `test/logger.test.js`

Modified:

- `app.js`
- `index.html`
- `src/index.js`
- `package.json`
