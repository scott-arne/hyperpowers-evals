# Logging Subsystem Design

Date: 2026-09-17
Status: approved design, not yet implemented

## Problem

The app has no logging. Debugging a production issue today means
reading three ad-hoc `console.*` calls in `app.js` and one in
`src/index.js`, none of which reach a developer when the code runs on
a user's machine. There is no level control, no way to retrieve what
happened during a failed session, and no protection against secrets
reaching the log.

The login flow compounds this: `app.js` currently logs `username` in
plaintext on every attempt, with `password` in the same scope. Any
logging subsystem added here inherits that exposure question, so
redaction is part of the design rather than a later hardening pass.

## Goals

- One shared logging module usable from both the browser app and the
  Node entry point.
- Retrievable evidence from a real user session, without standing up a
  collector endpoint and without data leaving the user's machine
  unless the user acts.
- Secrets cannot reach the log or its export, by construction rather
  than by call-site discipline.
- No new runtime or build dependencies.

## Non-goals

Explicitly out of scope, to be revisited only if a concrete need
appears:

- Remote log shipping or a collector endpoint.
- Log rotation or persistence across page loads.
- Correlation IDs, trace propagation, or sampling.
- A structured log schema beyond the four record fields below.
- Automated browser-DOM testing (see Testing).

## Decisions Already Made

These were settled during brainstorming and are inputs to this design,
not open questions:

| Question | Decision |
|---|---|
| Scope | Both browser and Node, via a shared module |
| Destination | In-memory ring buffer plus manual export; no remote endpoint |
| Redaction | Key denylist plus a structural never-log-password rule |
| Architecture | Pure core plus two thin runtime adapters |
| Tooling | Unit tests on the built-in `node:test` runner; no new dependencies |

## Constraints

- `package.json` has no dependencies, no `scripts`, no `"type"` field.
  The zero-dependency property is preserved by this design.
- No bundler, transpiler, or build step exists. The browser loads
  plain `<script>` tags; Node uses CommonJS `require`.
- One module must therefore be consumable from both a CommonJS
  `require` and a bare browser global.
- `index.html` may be opened directly from disk over `file://`, which
  rules out native ES modules.

## Architecture

Three files, split so that the safety-critical logic is pure and
testable and each runtime's I/O is isolated in a thin wrapper.

### `src/logger-core.js` — pure logic

No I/O, no globals, no ambient clock. Exports:

```
createLogger({ level, bufferLevel, sink, now, bufferSize }) ->
  { debug, info, warn, error, getBuffer, clear }
```

Responsibilities: level filtering, redaction, the ring buffer, and
record shaping. A record is:

```
{ ts, level, msg, ctx }
```

`now` is injected so tests produce deterministic timestamps. `sink` is
injected so the core never touches `console` or `process`.

Levels, in order: `debug`, `info`, `warn`, `error`.

**Dual export.** The file ends with a short footer assigning to
`module.exports` when it exists and to `globalThis.LoggerCore`
otherwise. This is the one concession to having no module system; it
is confined to a single file.

**Buffer/sink asymmetry.** The sink receives records at or above
`level` (default `info`). The buffer retains records at or above
`bufferLevel` (default `debug`). This is deliberate: the exported
buffer is useful precisely because it contains the detail that was
never printed to the console.

Buffer capacity is fixed (default 200 records) and evicts oldest
first, so a long-lived session cannot grow memory without bound.

### `src/logger-node.js` — Node adapter

CommonJS. Reads the level from `process.env.LOG_LEVEL`, falling back
to the default. Sink formats a single line and writes it to
`process.stderr`. Exports a configured singleton.

### `src/logger-browser.js` — browser adapter

Plain script; attaches `window.AppLog`. Reads the level from
`localStorage.logLevel`, falling back to the default. Sink dispatches
to the matching `console` method.

Owns the export path:

- `AppLog.dump()` returns the buffer array for console inspection.
- `AppLog.export()` serializes the buffer to JSON and triggers a file
  download.

Nothing is transmitted anywhere. Export is user-initiated.

## Redaction

### Key denylist

Matched case-insensitively as a substring of the key name:

```
password, passwd, pwd, token, secret, auth,
authorization, cookie, session, apikey, api_key
```

Applied recursively over plain objects and arrays, with a depth cap of
5 and a cycle guard. Matched values are replaced with `[REDACTED]`.
Structures deeper than the cap are replaced with `[TRUNCATED]` rather
than traversed, so depth cannot be used to smuggle an unredacted
value past the scan.

### Value-shape scan

Independent of key name, string values are redacted when they look
like secrets: JWT-shaped strings (three dot-separated base64url
segments beginning `eyJ`), and unbroken hex or base64 runs of 32
characters or more.

### Structural rule

`login()` retains its `password` parameter — it needs it for the
eventual POST — but never passes it to the logger. No call site hands
the logger a form-data object wholesale; call sites pass an explicit
object such as `{ username }`.

The denylist is a backstop. The structural rule is the actual
guarantee: the value never enters the logging path.

### Accepted exposure: username

`username` is logged. It is PII, and this is a deliberate tradeoff
rather than an oversight: it is the join key that makes "what happened
for this user" answerable, which is the purpose of the subsystem.
Hashing or truncating it would be a one-line change to the core's
redaction config if that tradeoff is later judged wrong.

## Data flow

**Browser.** `index.html` loads `logger-core.js`, then
`logger-browser.js`, then `app.js`. A call to `AppLog.info(msg, ctx)`
passes through level filtering, then redaction, then lands in both the
ring buffer and the console sink.

**Node.** `src/index.js` requires `./logger-node`. A call to
`log.info(msg, ctx)` follows the same path, with stderr as the sink.

## Error handling

**The logger never throws into its caller.** Every public method wraps
its body; on internal failure it emits a single raw `console.error`
and continues. A logging subsystem that can break the login form is
strictly worse than no logging.

Specific guards:

- `localStorage` access is wrapped in try/catch. It throws outright in
  some private-browsing modes.
- Circular references in `ctx` are handled by the cycle guard during
  redaction, not by allowing `JSON.stringify` to throw.
- The ring buffer's fixed capacity bounds memory.
- An unrecognized `LOG_LEVEL` or `localStorage.logLevel` value falls
  back to the default rather than erroring.

## Changes to existing files

| File | Change |
|---|---|
| `app.js` | Three `console.*` calls replaced with `AppLog`; password never passed to the logger |
| `index.html` | Two `<script>` tags added before `app.js` |
| `src/index.js` | One `console.log` becomes `log.info` |
| `src/utils.js` | Unchanged — a pure function with nothing to log |
| `package.json` | Gains `"scripts": { "test": "node --test" }`; no dependencies |

## Testing

`test/logger-core.test.js`, on the built-in `node:test` runner
(`npm test` runs `node --test`). No new dependencies.

Cases:

- Level filtering: records below `level` do not reach the sink.
- Buffer/sink asymmetry: a `debug` record is buffered but not printed
  at the default `info` level.
- Buffer eviction order and capacity.
- Redaction of denylisted keys, including at nesting depth and inside
  arrays.
- Value-shape redaction of JWT-shaped and long hex/base64 strings
  under a benign key name.
- Cycle safety: a self-referential `ctx` does not hang or throw.
- Never-throws contract: a sink that throws does not propagate to the
  caller.
- Injected clock produces deterministic timestamps.

Thin smoke tests cover `src/logger-node.js` (level parsing from the
environment, stderr formatting).

**Known coverage gap.** `node:test` has no DOM, so
`src/logger-browser.js` — the `localStorage` read and the download
path — is not covered by automated tests. It is verified manually.
Closing this gap would require a headless-browser dependency, which is
out of scope per the agreed tooling decision.

## Risks

- **The denylist is leaky by construction.** A field named in a way
  the list does not match, holding a secret that the value-shape scan
  does not recognize, will be logged. The structural never-log rule
  covers the known-critical case (password); the denylist reduces but
  does not eliminate the rest. Tightening to an allowlist later is
  cheap; the core's redaction is a single pure function.
- **The export is a file a user may email or paste into a ticket.**
  Redaction correctness therefore has a blast radius beyond the
  browser session, which is why it is the most heavily tested part of
  the design.
- **Browser adapter ships untested.** See the coverage gap above.

## Assumptions

- Assumption: users experiencing a production issue can be walked
  through running `AppLog.export()` or a download action; validate by
  confirming with whoever handles support before relying on export as
  the primary evidence path. If that is unrealistic, the destination
  decision should be revisited toward remote shipping.
- Assumption: `login()` remains a stub for now and the real POST is
  added later; validate by confirming no network call is expected as
  part of this work. The design does not instrument a request/response
  cycle that does not yet exist.
