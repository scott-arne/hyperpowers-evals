# Logging Subsystem Design

Date: 2026-09-17
Status: approved (design), pending implementation plan

## Problem

The app has no logging. Debugging a production issue currently means reading
three ad-hoc `console.*` calls in `app.js` and one in `src/index.js`, none of
which have a consistent shape, a severity, a timestamp, or any way to be turned
up or down without editing code and redeploying.

One of those calls, `app.js:5`, logs a username on every login attempt, inside
a flow that also handles a plaintext password.

## Goals

- One logging interface shared by both surfaces: the browser login form and the
  Node entry point.
- Structured, greppable output with timestamps and severities.
- Verbosity changeable in production without a redeploy.
- Sensitive data cannot reach the output, including when future code adds
  fields nobody reviewed for safety.
- A seam that lets logs ship to a remote collector later without touching any
  call site.

## Non-goals

- Shipping logs off the client. No transport, endpoint, batching, or retry is
  built now; the design only guarantees the seam for one.
- Third-party logging or error-reporting services.
- Converting the project to ES modules, adding a bundler, or adding any runtime
  dependency.
- Replacing the program's stdout *output* with log records (see Decision 6).

## Decisions

Each decision below was chosen explicitly during brainstorming; the rejected
alternatives are recorded because the reasons constrain later changes.

### 1. Both surfaces, one shared module

`app.js` (browser) and `src/index.js` (Node) both consume a single core module.
Rejected: instrumenting only one surface, which leaves the other blind.

### 2. UMD-style shim rather than ESM conversion

The two surfaces use incompatible module systems today: `app.js` is a classic
global-scope script loaded by `<script src="app.js">`, and `src/` is CommonJS.
There is no bundler or transpiler.

`src/logger.js` ends with a footer that assigns to `module.exports` when it
exists and to `window.AppLogger` otherwise. `index.html` gains a second script
tag before `app.js`; `src/index.js` uses `require`. No existing module syntax
changes.

Rejected: converting the project to ESM. It is the better end state, but it
touches three files unrelated to logging, and module scripts are blocked by
CORS over `file://`. How the page is served in production is not known
(Assumption: the page may be opened over `file://`; validate by asking how it
is deployed — if it is always served over HTTP, the ESM conversion becomes a
reasonable follow-up). Also rejected: two parallel implementations sharing only
a written contract, which would duplicate the redaction logic — the one place
where drift means a password in a log line.

### 3. Structured console output, with a transport seam

Records go to the console (browser) and stdout/stderr (Node). `sink` is a
constructor argument of type `(record) => void`, so adding a remote destination
later means writing one function and changing two wiring lines — no call site
changes.

Rejected: POSTing to an endpoint that does not exist yet, which would mean
building batching and retry for log lines nobody has read; and third-party
services, which add a dependency and send data off-site.

### 4. Runtime level switch

Verbosity is resolved at startup from the environment, not compiled in:

- Browser: `?log=<level>` URL parameter, then `localStorage["logLevel"]`, then
  `info`.
- Node: `LOG_LEVEL` environment variable, then `info`.

The URL parameter applies to that page load only and does not write to
`localStorage`; a support link should not leave someone in debug mode
permanently.

Consequence accepted deliberately: an end user can enable debug output, so
debug output is effectively public. Nothing sensitive may be logged at any
level. This is the same rule Decision 5 enforces mechanically.

### 5. Allowlist redaction, failing closed

Only field names in `ALLOWED_FIELDS` are emitted. Rejected: a denylist of known
sensitive keys, whose failure mode when someone adds a new field is a leak,
versus an allowlist's failure mode of a missing field noticed during debugging.

### 6. Program output is not logging

`console.log(greet('world'))` in `src/index.js` stays as it is. It is what the
program exists to print, not a diagnostic. Routing it through the logger would
let a `LOG_LEVEL` change silence the program's actual output.

### 7. Session id instead of username

Records carry a random per-run `sessionId` rather than the username, restoring
the ability to group one session's lines without putting personal data into
output a user can enable from a URL parameter.

## Architecture

### `src/logger.js` (new)

The entire core. Environment-agnostic: no `process`, and no `console` on the
record path — every record reaches its destination through the injected `sink`.
Two narrow exceptions, both guarded by a `typeof` check so the module loads
anywhere: the module footer touches `window` when `module` is absent, and the
one-time sink-failure report (see Error handling) uses `console.error` if a
`console` exists. Everything else environment-specific is injected.

```js
createLogger({ level, sink, clock, base }) // → { debug, info, warn, error }
```

- `level` — minimum severity to emit; a level string.
- `sink` — `(record) => void`. The transport seam.
- `clock` — `() => Date`, defaulting to `() => new Date()`. Injected so tests
  can assert exact output.
- `base` — flat object of fields merged into every record (carries
  `sessionId`). Passed through the same allowlist as per-call fields; the core
  grants it no special trust.

Each returned method takes `(event, fields)`. `event` is a short stable
identifier such as `"login.attempt"`. Event names rather than prose messages,
because the output is meant to be grepped and a name survives rewording.

Also exported: `resolveLevel`, `LEVELS`.

The module footer:

```js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createLogger, resolveLevel, LEVELS };
} else {
  window.AppLogger = { createLogger, resolveLevel, LEVELS };
}
```

### Wiring

Wiring lives at each entry point rather than in separate adapter files. With
two consumers, more files would be ceremony, and the part worth testing —
level resolution — is in the core.

- `index.html`: add `<script src="src/logger.js"></script>` immediately before
  the existing `app.js` tag.
- `app.js`: ~5 lines at the top — read the URL parameter and `localStorage`,
  call `resolveLevel`, generate a `sessionId`, build the console sink, call
  `createLogger`.
- `src/index.js`: ~4 lines — `require('./logger')`, read `LOG_LEVEL`, generate a
  `sessionId`, build the stream sink, call `createLogger`.

`src/utils.js` is not modified.

## Record format

One flat JSON object per record:

```json
{"ts":"2026-09-17T11:03:22.481Z","level":"info","event":"login.result","sessionId":"a3f1c2","success":true}
```

Flat rather than nested, so it greps cleanly and can be indexed by a collector
later without a schema.

`_dropped` appears only when fields were rejected, listing rejected key *names*
in sorted order. No call site in this design passes a rejected field; the case
arises when future code logs something not yet allowlisted:

```json
{"ts":"...","level":"info","event":"profile.saved","sessionId":"a3f1c2","_dropped":["email","phone"]}
```

Names are recorded, values never are. Without this, a missing field produces a
debugging session that ends in confusion rather than in "right, that is not
allowlisted."

## Redaction rules

`ALLOWED_FIELDS` is a single set declared at the top of `src/logger.js` — one
place to read to know everything that can leave the app. Initial contents:

- `sessionId`
- `success`
- `reason`
- `durationMs`
- `source` (carried by the `logger.bad_level` record; see Level resolution)

Growing it is a one-line change that appears in review as exactly what it is.

Two rules apply beyond the name check:

1. **Allowlisted keys must hold primitives.** String, number, boolean, or null
   pass through. Anything else is replaced with `"[object]"`, `"[array]"`, or
   `"[function]"`. Without this, an allowlisted `reason` holding an error object
   with a request body attached carries a password through a filter that
   reported success.
2. **Strings truncate at 200 characters**, with a trailing ellipsis. Guards
   against a stack trace or serialized payload becoming a log line.

Per-key reads are individually guarded so a throwing getter on a caller's object
cannot propagate into the caller.

## Level resolution

`LEVELS`: `debug` (10), `info` (20), `warn` (30), `error` (40). A call below the
active threshold returns before building a record.

`resolveLevel(candidates)` takes an ordered array of raw strings (any of which
may be null or invalid) and returns the first valid level name, falling back to
`info`.

An invalid non-null candidate falls through to the next and emits one `warn`
record, `logger.bad_level`, carrying the *source* (`"url"`, `"storage"`,
`"env"`) and not the offending value. A typo should not be silent, but the URL
parameter is user-controlled input, and echoing user-controlled strings into
output that may later reach a collector is how log injection starts.

## Sinks

- **Browser:** maps to `console.debug` / `console.info` / `console.warn` /
  `console.error`, passing the record as an object so devtools keeps it
  expandable.
- **Node:** one JSON line per record — `process.stdout.write` for `debug` and
  `info`, `process.stderr.write` for `warn` and `error`.

## Error handling

The logger must never break the app. A logging subsystem that crashes a login
form is worse than no logging.

- Sink invocations are wrapped. A throwing sink is swallowed, reported once via
  a guarded `console.error`, and then latched off, so a persistently broken
  transport degrades to no logs rather than to one error per log line.
- The allowlist filter tolerates `null` / `undefined` field objects and throwing
  getters.
- Circular references never reach serialization, because only primitives are
  emitted.

## Call sites

### `app.js`

| Location | Call |
|---|---|
| submit handler entry | `logger.debug("login.submit_received")` |
| validation failure | `logger.warn("login.validation_failed", { reason: validation.error })` |
| inside `login()` | `logger.info("login.attempt")` |
| after `login()` returns | `logger.info("login.result", { success: result.success })` |

These replace the three existing `console.*` calls in `app.js`.

The password is never passed to the logger at any call site. The allowlist would
drop it regardless; not handing it over means two independent mechanisms must
fail before it can leak.

### `src/index.js`

`logger.debug("main.start")` and `logger.debug("main.complete", { durationMs })`
around the existing body. The `console.log(greet('world'))` line is untouched
(Decision 6).

## Behavior changes

1. **The username no longer appears in logs.** `app.js:5` logs it today.
   Replaced by `sessionId` (Decision 7).
2. **The console output of the login flow changes shape.** `"Logging in: alice"`
   becomes a structured record. Anything reading those exact strings — a support
   runbook, a ticket screenshot, a browser test — will see different text.
3. **Validation failures move from `console.error` to a `warn` record**, and so
   appear at `console.warn` rather than `console.error` in the browser.

## Testing

Tooling: `node:test`, built into Node 18+. Chosen to keep the repository at zero
dependencies. Adds a `test/` directory and an `npm test` script; no linter,
formatter, or end-to-end infrastructure is added.

The core is environment-agnostic and takes an injected sink and clock, so every
case below tests with an array-push sink and a fixed timestamp — no DOM, no
subprocess, no fixtures.

- Level threshold filtering: calls below the active level emit nothing.
- Allowlist: permitted fields pass; rejected fields are absent and named in
  `_dropped`; `_dropped` is omitted when empty.
- Non-primitive values in allowlisted keys become type markers.
- Strings longer than 200 characters truncate.
- `base` fields are merged into every record and are themselves allowlisted.
- `resolveLevel`: ordering, fallback to `info`, invalid values skipped.
- `logger.bad_level` is emitted once with a source and never the raw value.
- A throwing sink does not propagate, is reported once, and then latches off.

The sink-throw test is the one that matters most: it is the evidence that a
broken transport cannot take down the login form.

## Global constraints

- No runtime dependencies. `node:test` is part of Node.
- No build step, bundler, or transpiler.
- Existing module syntax in `app.js`, `src/index.js`, and `src/utils.js` is
  preserved.
- `src/utils.js` is not modified.
- Nothing sensitive is logged at any level, because any user can enable debug.

## Open assumption

Assumption: the page may be served over `file://` in some environments;
validate by confirming the deployment method. If it is always served over HTTP,
the ESM conversion rejected in Decision 2 becomes a reasonable follow-up and the
UMD footer can be deleted.
