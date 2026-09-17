# Browser Logging Subsystem — Design

Date: 2026-09-17
Status: approved (sections 1-3), pending spec review

## Problem

The app has no logging subsystem. What exists is three ad-hoc calls in
`app.js`: a `console.log` of the username inside `login()`, a `console.log` of
the login result at the call site, and a `console.error` for validation
failure. There are no levels, no way to raise verbosity on a user's machine, no
redaction policy, and no capture of uncaught errors. When a user reports a
login failure in production there is nothing to read.

The app is a static page: `index.html` loads `app.js` through a plain
`<script src>` tag. There is no build step, no bundler, no server-side
component, and no runtime dependencies.

## Decisions

These were settled with the human partner during brainstorming and constrain
everything below.

1. **Destination: console, with a transport seam.** Logs print to the browser
   console. A named extension point exists so remote shipping can be added
   later without changing call sites. No remote endpoint and no third-party
   service (Sentry or equivalent) in this work.
2. **Scope: browser only.** `index.html` and `app.js`. The Node entry point
   `src/index.js` is out of scope and keeps its current `console.log`. No
   module-format decision is forced and no build step is introduced.
3. **Redaction: deny-list by key name**, applied to a structured metadata
   object.
4. **Username is logged in cleartext.** It is the correlation handle between a
   user's bug report and a log line. This is a deliberate choice, recorded
   here rather than inherited by accident from the current code.
5. **Level control: `localStorage`, with a URL parameter as the hand-off.**
   Default `info`; `?logLevel=` writes into `localStorage` so raised verbosity
   survives reloads during a reproduction.
6. **Testing: `node:test` with a `node:vm` sandbox.** No new dependencies.

## Architecture

### New file: `logger.js`

Repo root, loaded by `index.html` via a `<script src="logger.js">` tag placed
before the existing `app.js` tag. It defines a single global, `window.log`.

### Interface

```
log.debug(message, meta?)
log.info(message, meta?)
log.warn(message, meta?)
log.error(message, meta?)
log.dump()
log.clear()
log.transport        // null by default; assignable
```

The four level methods take exactly two arguments and are never variadic. That
constraint is load-bearing rather than stylistic: redaction can only inspect a
structured object, so a `console.log`-style variadic signature would make the
deny-list unenforceable.

A record is:

```
{ ts, level, message, meta }
```

`ts` is an ISO-8601 string. Timestamps keep entries correlatable when a user
pastes them out of order or from more than one tab.

### Level resolution (at load)

1. Read `logLevel` from `location.search`. If present and one of `debug`,
   `info`, `warn`, `error`, write it to `localStorage` under `app.logLevel`.
2. Read `app.logLevel` from `localStorage`.
3. Fall back to `info` when absent or invalid.

Invalid values fall back rather than throw. Ordering is
`debug < info < warn < error`; a record prints when its level is at or above
the resolved threshold.

### Redaction

Runs at **record** time, before the entry enters the buffer — not at print
time. Unprinted buffered entries would otherwise retain sensitive values.

The redactor walks `meta`, its nested plain objects, and arrays, replacing any
value whose key matches (case-insensitive) `password`, `passwd`, `token`,
`secret`, `auth`, or `apiKey` with the string `[redacted]`. Matching is on the
exact key name, not a substring. It tracks visited objects and substitutes
`[circular]` for a repeat rather than recursing forever. It produces a new
object; the caller's `meta` is never mutated.

It does **not** scan the `message` string. That is a known and accepted blind
spot; the governing rule is *identifiers in the message, data in `meta`*.

The deny-list is fail-open by construction: a sensitive field whose key nobody
added to the list is logged in full. This was chosen over an allow-list because
an allow-list forces a decision at every call site, and that friction gets
routed around by stuffing data into the message string — which no key-based
scheme can see.

### Ring buffer

A fixed 200-entry array with a wrapping write index. Every call records
unconditionally; the level threshold gates only whether the record also prints.

- `log.dump()` returns the retained records in chronological order and prints
  them as one block — a single paste for the user, a single read for the
  maintainer.
- `log.clear()` empties the buffer so a user can reset before a clean
  reproduction.

The buffer is the reason console-only logging is usable for bugs that cannot be
reproduced on demand: the detail is already captured when the user makes
contact, rather than requiring them to have raised the level before the bug
occurred.

### Transport seam

`log.transport` is `null` by default. When assigned a function, it receives
every record after redaction — including records below the print threshold,
matching what the buffer retains. A transport that wants less is responsible
for its own filtering; the seam's job is to expose everything the logger knows,
since a remote collector generally wants more detail than a console does. The
call is wrapped in `try/catch`; a transport that throws is disabled after its
first failure and reported once at `warn`. This is the whole extension point
for future remote shipping.

## Instrumentation

Six call sites in `app.js`, replacing the three existing ad-hoc calls:

| Point | Level | Meta |
|---|---|---|
| Submit handler entry | `debug` | `{ username }` |
| Validation failed | `warn` | `{ username, error }` |
| Validation passed | `debug` | `{ username }` |
| `login()` entry | `info` | `{ username, endpoint: API_ENDPOINT }` |
| `login()` returning | `info` | `{ username, success }` |
| `login()` threw | `error` | `{ username, error: err.message }` |

`password` is never passed to the logger. The deny-list is the second layer,
for the case where someone later passes a whole form object: the first layer is
discipline and the second is code.

The `login()` call in the submit handler gains a `try/catch`. `login()` is
currently a stub that cannot throw, so the error row is presently unreachable —
it exists because the handler has no failure path at all today, and a rejected
login would otherwise surface as an unhandled rejection with no log line.

This also gives `API_ENDPOINT` — currently declared and unused — its first real
use.

### Global handlers

`logger.js` registers `window.addEventListener('error', ...)` and
`window.addEventListener('unhandledrejection', ...)`. Both log at `error` with
the message, source location, and stack where available. These catch failures
nobody thought to instrument, which is why explicit call sites were chosen over
intercepting `console`.

## Error handling

The logger must never break the page it exists to debug. Every path either
produces a record or produces nothing, and never propagates.

- **`localStorage` throws.** Access fails in sandboxed contexts, including
  `file://` in some browsers and older Safari private mode. Since this is a
  static page with no server, `file://` is a realistic way it gets opened. Both
  the read and the write are wrapped; on failure the level falls back to
  `info`.
- **Unserializable or circular `meta`.** Handled by the redactor's visited-set,
  which emits `[circular]`.
- **A throwing transport.** Caught, disabled after first failure, reported once
  at `warn`. A broken log shipper degrades to local logging rather than taking
  down the login form.

## Rejected alternatives

- **Intercepting `console`.** Monkeypatching `console.log/warn/error` would
  need no call-site changes and would catch code written later. Rejected on two
  counts: intercepted calls are variadic positional arguments, so the chosen
  deny-list redaction has no structured payload to walk; and every devtools log
  line would attribute to `logger.js` instead of its real source, which is
  worse for the debugging this exists to support.
- **Allow-list redaction.** Fails closed and is genuinely safer, but adds a
  decision at every log call. See the redaction section for why that friction
  is self-defeating.
- **Remote shipping or a third-party service now.** No collector exists, the
  repo has no privacy or retention position, and it currently has zero runtime
  dependencies. The transport seam makes this a contained follow-up.
- **A dual-format module or a build step** so `src/index.js` could share the
  logger. `src/index.js` is a `greet('world')` stub with no production role;
  instrumenting it would force a module-format decision the repo is not ready
  to make.

## Testing

`node:test` (built into Node, no install) loads `logger.js` with `readFileSync`
and evaluates it in a `node:vm` context holding fake `window`, `localStorage`,
and `console` objects. Assertions run against the fake console and the values
returned by `dump()`. This tests the real file rather than a copy.

Coverage:

- Level resolution: default, valid `localStorage` value, valid URL parameter,
  invalid values falling back, the URL parameter persisting to `localStorage`.
- Threshold filtering: records below threshold are buffered but not printed.
- Redaction: each deny-listed key, nested objects, case-insensitive matching,
  circular references, redaction applied before buffering.
- Ring buffer: wraparound at 200, chronological order from `dump()`, `clear()`.
- Transport: invoked with redacted records, a throwing transport is caught and
  disabled.
- Resilience: a `localStorage` that throws on read and on write.

A `test` script is added to `package.json`. The DOM wiring in `app.js` is not
unit-tested; it is verified by opening the page and exercising the form.

## Out of scope

- Any remote log destination, collector, or third-party service.
- Logging in `src/index.js` or `src/utils.js`.
- A build step, bundler, linter, or formatter.
- End-to-end browser tests.
- Making `login()` perform a real network request.

## Global constraints

- No new runtime dependencies. No new devDependencies.
- No build step.
- Unit tests via `node:test` accompany the logger.
- The logger never throws into calling code.
