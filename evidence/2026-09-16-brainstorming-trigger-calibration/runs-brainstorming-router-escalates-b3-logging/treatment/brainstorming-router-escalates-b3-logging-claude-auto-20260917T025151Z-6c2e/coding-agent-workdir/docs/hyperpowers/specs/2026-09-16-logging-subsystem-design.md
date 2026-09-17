# Logging Subsystem Design

Date: 2026-09-16
Status: approved design, pending implementation plan

## Problem

The application has no logging subsystem. Diagnostics today are four ad-hoc
`console` calls (`app.js:5`, `app.js:24`, `app.js:26`, `src/index.js:4`). Output is
transient, unstructured, and unavailable after the page or process ends, so a
production issue cannot be investigated after the fact.

Two of those call sites are also a disclosure risk. `app.js:5` logs a username from
inside `login(username, password)`, and `app.js:24` logs the full return value of
`login()`. Both execute in the scope holding a plaintext password.

## Goals

- Structured, levelled logging available on both runtimes in this repository.
- Records persist on the user's device and survive page reload and process exit.
- Sensitive values cannot reach a persisted record through structured context.
- A logging failure can never break the application.
- A defined way to retrieve persisted logs during a support interaction.

## Non-goals

- Shipping logs to a backend. No service under this project's control exists to
  receive them. The sink boundary is shaped so a shipping sink can be added later
  without changing the core.
- Changing what the application does. `API_ENDPOINT` remains an uncontacted stub.
- Converting the repository's module system or introducing a bundler or build step.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | Both browser and Node surfaces | Requested: logging "across the app". |
| Persistence | On-device | No backend exists; sink seam permits shipping later. |
| Redaction | Allow-list | Fails closed. A newly added sensitive field is invisible by default. |
| Structure | Dual-mode core, per-runtime sinks | Shares the security-critical code without a bundler or an ESM conversion. |
| `username` | Permitted | Logs stay on the user's own device; required to read a login-flow log. |

### Why the dual-mode core

`app.js` is a plain `<script>` using globals; `src/index.js` and `src/utils.js` are
CommonJS. Two rejected alternatives:

- **Independent per-runtime loggers.** Simplest, but duplicates the allow-list. An
  allow-list's value is that it cannot silently fall out of date; two copies
  reintroduce exactly that failure.
- **Convert the repository to ES modules.** Cleanest sharing, but rewrites
  `src/index.js` and `src/utils.js` for reasons unrelated to logging, and
  `<script type="module">` is blocked by CORS over `file://`, so opening
  `index.html` directly would stop working.

## Architecture

```
src/logger/
  core.js          # levels, record construction, dispatch to sink
  redact.js        # PERMITTED set and redact()
  sink-browser.js  # capped ring buffer in localStorage
  sink-node.js     # NDJSON append with size rotation
```

`core.js` exports `createLogger({ sink, level, name })` — a factory, not a singleton,
so tests construct an instance with a fake sink and no global state.

Each file ends with a dual-mode export footer so the same source loads under both
`require()` and a `<script>` tag:

```js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createLogger };
} else {
  window.Logger = { createLogger };
}
```

### Wiring

- `index.html`: three `<script>` tags before `app.js`, in order — `redact.js`,
  `core.js`, `sink-browser.js`. The ordering requirement is load-bearing and gets a
  comment in the HTML.
- `src/index.js`: requires the core and the Node sink, constructs its logger at
  startup.

### Call-site migration

The three diagnostic `console` calls are replaced, not supplemented — leaving them
beside a redacting logger would make the redaction decorative:

| Site | Replacement |
|---|---|
| `app.js:5` | `log.info("login attempt", { username })` |
| `app.js:24` | `log.info("login result", { username, status })` |
| `app.js:26` | `log.warn("validation failed", { formField, errorCode })` |

`src/index.js:4` stays `console.log`. It is program output, not a diagnostic;
printing and logging are different jobs.

## Record shape

```js
{
  ts: "2026-09-16T14:03:11.204Z",  // ISO 8601
  level: "warn",                   // debug | info | warn | error
  name: "auth",                    // logger name
  msg: "login rejected",           // static description
  ctx: { }                         // redacted structured context
}
```

ISO timestamps rather than epoch millis: these records are read by a human out of a
file or a devtools dump, not by a parser.

This shape is the one part of the design that is expensive to change. Anything that
later reads a persisted log depends on it.

## Redaction

`redact.js` exports `PERMITTED` (a `Set` of key names) and `redact(ctx)`.

Initial `PERMITTED`: `username`, `userId`, `event`, `durationMs`, `status`,
`errorCode`, `formField`.

Rules:

- Any key not in `PERMITTED` has its value replaced with the string `"[redacted]"`.
  The key is retained. A scrubbed field that vanished entirely is indistinguishable
  from a code path that never ran, which costs debugging time; revealing the key
  name while never revealing the value resolves that.
- Redaction recurses to every depth, so a permitted key holding a nested object does
  not become a hole in the policy.
- A depth cap and a total serialized-size cap apply, so one bad call site cannot fill
  the buffer with a single record. Truncation is marked in the output.
- `Error` values are special-cased to `{ name, message, stack }`. A logging layer that
  swallows stack traces is not worth having.

### Known limitation

The allow-list governs `ctx` only. `log.info("password is " + password)` cannot be
caught by any redactor, because the value is an opaque string by the time it arrives.
Mitigation is convention — `msg` is a static description, all variable data goes in
`ctx` — plus review. The allow-list does not make the logger leak-proof and this
document does not claim it does.

## Persistence

### Browser

Records buffer in memory and flush to a single `localStorage` key, debounced ~1s and
forced on `visibilitychange → hidden`.

- Not a write per log call: reserializing the whole array on every call is O(n)
  main-thread work during form submission.
- `visibilitychange`, not `beforeunload`: the latter does not fire reliably on mobile.
- The buffer is capped by both record count and total bytes, evicting oldest first.
  `localStorage` is a shared ~5MB origin quota, not this feature's private budget.

### Node

NDJSON appended to `logs/app.log`, rotated at 5MB, keeping 3 generations.

Writes are synchronous. At this scale the blocking cost is irrelevant, and it buys
guaranteed ordering and no loss when the process exits abruptly — which is when the
log matters most.

`logs/` is added to `.gitignore`.

## Retrieval

On-device persistence is useless without an extraction path.

- **Browser:** `window.__appLogs` exposing `dump()` (returns records), `copy()`
  (NDJSON to clipboard), and `clear()`. No UI affordance: this is a support tool, not
  a product feature. The trade-off is that it is undiscoverable unless someone is
  told it exists — acceptable for support-guided retrieval, unsuitable for
  self-service.
- **Node:** the rotated file is the interface.

## Level control

| Runtime | Source | Default |
|---|---|---|
| Node | `LOG_LEVEL` environment variable | `info` |
| Browser | `localStorage["app.logLevel"]` | `info` |

`localStorage` rather than a query parameter, because it survives reloads. The real
support workflow is "set this, then reproduce the bug", and a query parameter is lost
on the first navigation.

## Failure behavior

**The logger never throws into the application.** Every sink write is wrapped. On
failure — `QuotaExceededError`, read-only filesystem, corrupt stored JSON — the sink
evicts and retries once, then falls back to `console` and disables itself for the
remainder of the session, reporting the failure exactly once.

A logging subsystem that can break the login form is a worse defect than the one it
was added to diagnose.

## Tooling

The repository has no linter, formatter, test runner, or npm scripts. Establishing
them before the code exists is cheaper than retrofitting.

- ESLint + Prettier, as `npm run lint` and `npm run format`.
- `node:test` as the test runner, as `npm test`. Built into Node, so the repository
  stays dependency-free for unit testing.
- `fast-check` for property tests over the redactor — one dev dependency, aimed at
  the security-critical code.
- End-to-end testing (Playwright) is out of scope: disproportionate for one form.

## Testing strategy

| Target | Coverage |
|---|---|
| `core.js` | Level filtering, record shape, logger naming, dual-mode export under both loaders |
| `redact.js` | Example tests; `fast-check` property that no non-permitted key's value survives at any depth; depth and size cap truncation; `Error` serialization |
| `sink-browser.js` | Fake `localStorage`; debounce and forced flush; count and byte eviction; `QuotaExceededError` recovery; corrupt stored JSON recovery |
| `sink-node.js` | Temp directory; NDJSON format; rotation at threshold; generation retention; unwritable-path fallback |
| Call sites | `redact` receives no password-bearing context from the `app.js` login path |

## Risks

- **Script ordering in `index.html`** is load-bearing and unenforced without a
  bundler. Mitigation: a comment in the HTML, and `core.js` failing loudly at
  construction if its dependencies are absent.
- **Dual-mode footer** is a non-standard pattern a future contributor may
  "clean up". Mitigation: a comment stating why it exists.
- **Persisted usernames on a shared device.** Accepted deliberately; revisit if the
  application's deployment context changes.
- **Assumption:** the browser surface runs in contexts where `localStorage` is
  available and not disabled. Validate via the sink's failure path, which must degrade
  to console-only rather than throw.
