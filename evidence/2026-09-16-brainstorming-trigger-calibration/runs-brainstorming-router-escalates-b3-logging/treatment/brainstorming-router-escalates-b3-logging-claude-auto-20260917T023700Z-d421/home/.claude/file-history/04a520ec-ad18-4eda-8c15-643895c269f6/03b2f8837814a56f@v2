# Browser Logging Subsystem — Design

Date: 2026-09-16
Status: Approved design, pending implementation plan

## Problem

The browser app (`index.html` + `app.js`) has no observability. Its only
instrumentation is four ad-hoc `console.log` / `console.error` calls, which stay
on the user's machine. When a login fails in production there is no way to learn
that it happened, let alone why.

This design adds a logging subsystem to the browser app that ships failure
context to an endpoint the team controls, without putting credentials or account
identifiers into the log store.

## Scope

**In scope:** `index.html`, `app.js`, a new `logger.mjs`, a new
`test/logger.test.mjs`, and `package.json`.

**Out of scope:** `src/index.js` and `src/utils.js`. That half of the repo is a
Node hello-world with no production deployment and therefore no production
issues to debug. Building a shared browser/Node logging abstraction for a
six-line consumer that does not exist yet is generality with no payer. If `src/`
later grows a real workload, retrofitting it against a proven browser logger is
cheaper than designing a seam for it now.

**Also out of scope:** the receiving endpoint itself. This design produces a
client that POSTs to a configurable URL. Standing up and operating the receiver
is separate work.

## Decisions Already Made

These were settled during brainstorming and are inputs to the design, not open
questions:

| Decision | Choice | Rejected alternatives |
|---|---|---|
| Coverage | Browser app only | Node entry only; both via a shared module |
| Destination | Team's own HTTP endpoint, configurable URL | Third-party service (Sentry etc.); structured console only |
| Sensitive data | Allowlist — fails closed | Denylist/scrub; convention only |
| User identity | Per-session random correlation ID | Hashed username; raw username |
| Capture | Uncaught errors, unhandled rejections, plus login-flow breadcrumbs | Errors only; verbose with level filter |
| Data model | Black-box recorder — breadcrumbs ring-buffered, shipped only with an error | Buffered log stream; immediate per-record POST |
| Denominator | Session-summary record on `pagehide` | Nothing for clean sessions |
| Tooling | `node --test` unit tests only | Lint/format (Biome or ESLint+Prettier); end-to-end; fuzz |

## Global Constraints

- **Zero dependencies, runtime and dev.** The self-hosted endpoint and
  `node --test` were both chosen to preserve this. No package may be added
  without revisiting this constraint explicitly.
- **The logger must never break the app.** Any failure inside logging is
  contained; it never propagates to a caller and never blocks the login flow.
- **No secret or account identifier may reach a record.** This is enforced
  structurally by the allowlist, not by convention.
- All new code is ES modules.

## Architecture

### The core/browser split

`logger.mjs` exports a browser-agnostic core plus a thin browser binding.

The core (`createLogger`) touches no globals: no `window`, no `fetch`, no
`Date`, no `crypto`. It receives what it needs through config — `transport`,
`now`, `idGen`. The browser binding (`installBrowserHandlers`) supplies the real
implementations and registers event listeners.

Rationale: there is no bundler and no DOM in the test environment. A logger that
reaches for `window` directly can only be exercised in a real browser, which in
a project with no end-to-end infrastructure means it is not exercised at all.
The injected seams cost a few lines and make every rule in this document
verifiable under `node --test`.

### Module loading

`index.html` changes from `<script src="app.js">` to
`<script type="module" src="app.js">`, and `app.js` imports from `./logger.mjs`.

Tradeoff accepted: ES modules are fetched under CORS rules, so opening
`index.html` directly via a `file://` URL will stop working. The page must be
served over HTTP. The rejected alternative — a second classic `<script>` tag
exporting a global — avoids that, but leaves the logger unimportable from Node
tests, which forfeits the entire testing approach above.

### Why the `.mjs` extension

`node --test` must parse the logger as an ES module. `package.json` has no
`"type"` field, so Node treats a `.js` file as CommonJS. The `.mjs` extension
makes it ESM to Node without any `package.json` change.

The rejected alternative was adding `"type": "module"` to `package.json`. That
works for the logger but reclassifies *every* `.js` file in the project,
breaking `src/index.js` and `src/utils.js` — both CommonJS — and forcing them to
be renamed to `.cjs`. That is a change to the half of the repo this design
explicitly excludes, incurred for nothing but a file-extension detail. The
browser is indifferent to the extension, so `.mjs` costs nothing and keeps the
blast radius inside the browser app.

## Components

### `logger.mjs` (new)

`createLogger(config) -> logger`

Config keys, all with defaults except `endpoint` and `transport`:

| Key | Default | Purpose |
|---|---|---|
| `endpoint` | — | URL records are POSTed to |
| `transport` | — | `(url, body) -> void`; injected for testability |
| `maxBreadcrumbs` | 20 | Ring buffer capacity |
| `maxEnvelopes` | 10 | Per-session cap on envelopes shipped |
| `maxStringLength` | 512 | Per-value string truncation bound |
| `now` | — | `() -> number`; injected clock |
| `idGen` | — | `() -> string`; injected correlation-ID source |

Instance methods:

- `breadcrumb(event, fields)` — sanitizes `fields`, pushes onto the ring buffer.
  Never touches the network.
- `error(event, fields)` — sanitizes `fields`, builds an envelope from the ring
  buffer plus this error, ships it.
- `sessionSummary()` — builds and ships the summary record.

`installBrowserHandlers(logger)` — registers `error`, `unhandledrejection`, and
`pagehide` listeners, and supplies the default transport (`navigator.sendBeacon`
first, `fetch(url, {keepalive: true})` as fallback).

### `app.js` (modified)

The four existing `console.*` calls are replaced by logger calls, and
breadcrumbs are added at the three interesting points of the login flow. The
submit handler is restructured so that the password value is never passed to a
logging call site — `validateForm` already returns a verdict rather than the
data, so the handler logs the verdict.

This is defense in depth. The allowlist is the guarantee; not handing the
sanitizer a secret in the first place is the cheaper habit and the one that
survives a future refactor of the allowlist.

### `test/logger.test.mjs` (new)

Unit tests under `node --test`. See Testing below.

### `package.json` (modified)

One addition: `"scripts": { "test": "node --test" }`. No `"type"` field, no
dependencies, no devDependencies. `"main"` is untouched.

## Data Model

### Sanitized field record

Every `fields` object passed to `breadcrumb` or `error` goes through one
sanitizer before it can reach a record.

`ALLOWED_FIELDS` is a module-level set:

```
event, level, ok, reason, status, field, durationMs,
errorName, errorMessage, stack, url, line, col
```

Explicitly absent: `username`, `password`, `email`.

Three rules, applied in order:

1. **Key allowlist.** A key not in `ALLOWED_FIELDS` is dropped.
2. **Primitives only.** A value passes only if it is a string, number, boolean,
   or null. Objects, arrays, and functions are dropped *even under an allowed
   key*. Without this rule, a single
   `logger.error("login.failed", {reason: formState})` serializes the entire
   form — password included — under a perfectly legitimate key name.
3. **String truncation.** Strings longer than `maxStringLength` are truncated,
   bounding record size and limiting the blast radius of anything that does slip
   through.

Every dropped key or value increments `droppedFieldCount` on the record. This
records *that* something was suppressed without the record containing *what*.

### Breadcrumb

```
{ t: <ms since logger creation>, event: <string>, ...sanitized fields, droppedFieldCount? }
```

### Envelope (shipped on error)

```
{
  kind: "error",
  correlationId: <string>,
  sentAt: <epoch ms>,
  error: { event, errorName, errorMessage, stack, url, line, col, ...sanitized },
  breadcrumbs: [ <breadcrumb>, ... ],   // oldest first
  meta: { userAgent, url }
}
```

### Session summary (shipped on `pagehide`)

```
{
  kind: "session-summary",
  correlationId: <string>,
  sentAt: <epoch ms>,
  counts: { attempts, failures, envelopesSent, envelopesDropped }
}
```

Purpose: the black-box model ships nothing for a clean session, which would
leave failure counts without a denominator. This record supplies the
denominator — rates become computable — without shipping healthy-session
breadcrumb detail.

## Data Flow

1. Page load → `createLogger` → correlation ID from `crypto.randomUUID()`, one
   per page session. `installBrowserHandlers` binds listeners.
2. Form submit → breadcrumb `form.validate` with `{ok, field}`. `field` names
   which input was missing; its value is never included.
3. Validation passed → breadcrumb `login.attempt`. No username.
4. `login()` returns → breadcrumb `login.result` with `{ok, status, durationMs}`.
   `login()` throws → `logger.error`.
5. Any error — explicit, uncaught, or unhandled rejection — builds an envelope
   from the current ring buffer plus the error, and ships it.
6. `pagehide` → `sessionSummary()` via `sendBeacon`.

## Error Handling (of the logger itself)

The governing rule: a login form that breaks because telemetry hiccuped is
strictly worse than no telemetry.

- **Contained throws.** Every public method is wrapped so an internal throw is
  swallowed. At most one `console.warn` per session reports that logging is
  degraded; after that it goes quiet rather than flooding the console someone
  would be reading.
- **Recursion guard.** `installBrowserHandlers` binds `window.onerror`, and the
  transport can throw. Unguarded, a failing POST raises an error, which fires
  the handler, which builds an envelope, which POSTs, which throws — a tight
  spiral in the user's browser triggered by nothing more than an unreachable
  endpoint. A re-entrancy flag around the ship path breaks it.
- **Envelope cap.** `maxEnvelopes` (default 10) per session. An error inside a
  render loop can produce thousands of errors per second; uncapped, the app's
  own users become a load test against the log endpoint. Past the cap, records
  are counted rather than sent, and the session summary reports
  `envelopesDropped` so truncation is visible rather than silent.
- **Fire-and-forget transport, no retry.** A retry queue implies persistence,
  backoff, and duplicate suppression — real machinery for marginal gain when the
  signal of interest is "this session broke," not "every byte arrived." Failed
  sends are counted, never re-queued, never thrown.

## Testing

`node --test`, tests in `test/logger.test.mjs`, run via `npm test`. The injected
`transport` / `now` / `idGen` seams mean all of these run headless, with no DOM
and no network.

Sanitizer (the security control — these are the ones that matter most):

1. A key not in `ALLOWED_FIELDS` is dropped, and `droppedFieldCount` reflects it.
2. A nested object under an *allowed* key is dropped — the password-in-a-blob
   case.
3. A `password` key never appears in a serialized record.
4. A string longer than `maxStringLength` is truncated.

Ring buffer and envelopes:

5. The ring buffer caps at `maxBreadcrumbs` and evicts oldest-first.
6. One error produces exactly one envelope, containing the preceding breadcrumbs
   in order, oldest first.
7. Breadcrumbs are not transmitted when no error occurs.

Resilience:

8. A throwing transport does not propagate to the caller.
9. A throwing transport does not trigger another envelope (recursion guard).
10. The envelope cap holds; `envelopesDropped` counts the suppressed ones.

Summary:

11. Session-summary counts match the events that occurred.

An untested security control is a hope, which is why items 1–4 are non-optional.

## Assumptions

- Assumption: the team has, or will stand up, an HTTP endpoint able to receive
  these POSTs before the logger is deployed. Validate by confirming the receiver
  URL exists prior to enabling a non-empty `endpoint` in production. If no
  receiver materializes, this work ships logging that reaches nobody.
- Assumption: the app is served over HTTP rather than opened from disk, so ES
  module loading works. Validate by loading `index.html` through the project's
  normal serving path during implementation.
- Assumption: target browsers support `crypto.randomUUID` and
  `navigator.sendBeacon`. Validate against the project's browser support matrix;
  if `crypto.randomUUID` is unavailable, `idGen` is already an injected seam and
  can fall back to a random-string generator without touching the core.

## Out of Scope / Explicitly Not Doing

- Log levels beyond the breadcrumb/error distinction. The black-box model makes
  a severity threshold redundant: breadcrumbs are already only shipped alongside
  an error.
- Retry, offline queueing, or persistence across page loads.
- Sampling. At the expected volume of a single login form, shipping every
  failure is affordable.
- Source-map resolution of stack traces. Records carry raw stacks; symbolication
  is the receiver's concern.
- Any change whatsoever to `src/index.js` / `src/utils.js`. The `.mjs`
  extension choice above exists specifically to keep them untouched.
