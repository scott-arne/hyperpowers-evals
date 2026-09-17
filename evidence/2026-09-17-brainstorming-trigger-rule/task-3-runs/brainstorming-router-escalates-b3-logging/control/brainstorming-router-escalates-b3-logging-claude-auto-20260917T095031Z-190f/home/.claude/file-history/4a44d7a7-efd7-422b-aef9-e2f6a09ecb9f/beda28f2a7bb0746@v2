# Browser Production Logging — Design

Date: 2026-09-17
Status: Awaiting review
Branch: `feature/webapp-enhancement`

## Problem

The browser app (`index.html` + `app.js`) has no production observability. Its
only instrumentation is three `console.*` calls, which write to a console on
the user's machine that no one on the team will ever see. When a user reports
that login is broken, there is no evidence to work from beyond a reproduction
attempt.

A second problem is latent in the current code: `app.js:5` logs a username at
login time. Any telemetry system installed on this page must answer "what must
never be recorded" before it ships, because the page handles passwords.

## Scope

**In scope:** the browser app — `index.html`, `app.js`, and a new `logger.js`.

**Out of scope:** `src/index.js` and `src/utils.js`. They are a separate Node
entry point that `index.html` does not load, and they contain a greeting stub
with no production behavior to debug. If Node-side logging is wanted later it
is a separate piece of work; this design does not attempt to serve both
runtimes.

## Global Constraints

- **No build step.** `index.html` loads `app.js` with a bare `<script>` tag.
  Everything added must work as a plain script served statically. No bundler,
  no transpiler, no module syntax in browser-loaded files.
- **Unit tests are required** for `logger.js`, using Node's built-in
  `node:test` runner (zero dependencies).
- **Lint and format are required**: `eslint` + `prettier`, added as
  `devDependencies` with `npm` scripts. New and modified files must pass both.
- End-to-end browser testing is explicitly **not** adopted; see
  "Rejected alternatives".
- Fuzz and mutation testing are not adopted.

## Decisions

These were settled during brainstorming and are inputs to the design, not open
questions.

| Decision | Choice |
|---|---|
| Runtime | Browser app only |
| Destination | Third-party SaaS |
| Vendor | Sentry |
| Capture scope | Errors + masked breadcrumbs; no session replay |
| Structure | Logger façade module wrapping the SDK |
| User context | Client-side hashed username |
| Tooling | Unit tests (`node:test`), eslint + prettier |

## Architecture

### Files

| File | Change |
|---|---|
| `logger.js` | **New.** Sentry init, masking config, environment resolution, global handlers, no-op fallback, and the `log.*` surface. |
| `index.html` | Two `<script>` tags added before `app.js`: the Sentry CDN bundle, then `logger.js`. |
| `app.js` | Three `console.*` calls replaced; domain events added at decision points. No structural change. |
| `test/logger.test.js` | **New.** Unit tests for the façade. |
| `package.json` | Gains `devDependencies` (eslint, prettier) and `scripts` (`test`, `lint`, `format`). |
| `eslint.config.js`, `.prettierrc` | **New.** Tool configuration. ESLint flat config, since `.eslintrc.*` is deprecated in ESLint 9+. |

### Load order

Plain synchronous `<script>` tags, in this order:

1. The Sentry **bundled** CDN build (not the async "loader" variant).
2. `logger.js`
3. `app.js`

Sentry's async loader defers SDK availability, which would make `logger.js`
initialization race against `app.js` binding its submit handler. Synchronous
tags cost one blocking request on a page that is already a single HTML file
and a single script; deterministic ordering is worth that.

The Sentry bundle tag carries `integrity` and `crossorigin` (Subresource
Integrity), so a compromised CDN cannot inject script into a page that handles
credentials.

### Configuration

The Sentry DSN is a write-only ingest key and is designed to be public;
shipping it in static HTML is correct. Because anyone can therefore post events
to the project, inbound rate limits and an allowed-domains list must be
configured **in the Sentry project settings**. That is vendor-side
configuration, not code in this repository, and is a prerequisite for going
live.

Configuration rides on the `logger.js` script tag as data attributes, read via
`document.currentScript`:

```html
<script src="logger.js" data-dsn="https://…" data-env="production"></script>
```

This keeps configuration adjacent to its consumer and avoids introducing a
`window.APP_CONFIG` global to a page that currently has none. It requires the
tag to remain synchronous, since `document.currentScript` is `null` under
`defer` and `async` — consistent with the load-order decision above.

### Environment resolution

`data-env` wins when present. Otherwise `logger.js` infers `development` for
`localhost`, `127.0.0.1`, and the `file:` protocol, and `production` for
anything else.

In `development`, the façade writes to the console and does **not** initialize
Sentry, so local work does not pollute production issue counts.

Assumption: the hostname heuristic is an adequate proxy for environment,
validate via confirming with whoever owns deployment. This repository
currently documents no deploy pipeline and has no notion of environments. If a
pipeline exists that can template `data-env` at deploy time, that is strictly
better and should replace the heuristic.

## Logger API

```js
log.event(name, fields)   // domain breadcrumb: something happened
log.warn(name, fields)    // expected-but-notable; sent as a message
log.error(error, fields)  // captureException
log.setUser(identity)     // correlation context
```

The façade assigns `window.log` for the browser. A short tail exports the same
object for Node when `module` is defined, so tests can load it without a build
step:

```js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { /* factory + internals under test */ };
}
```

## Redaction

Redaction is **fail-closed** and layered. One layer would suffice on a page
without a password field; this page has one.

### Layer 1 — façade allowlist

`log.*` forwards only keys on a known allowlist: `reason`, `success`, `op`,
`field`, `status`, `durationMs`. Unknown keys are **dropped**, not passed
through.

This is the load-bearing decision. Because the default is "drop", adding a new
logged field requires a deliberate edit to the allowlist rather than happening
silently. Passing a raw DOM event or an entire `formData` object leaks nothing,
because none of their keys are allowlisted.

### Layer 2 — SDK configuration

- `breadcrumbsIntegration({ console: false })` — console mirroring off, so
  existing `console.*` calls anywhere on the page cannot backfill the vendor.
- DOM breadcrumbs keep the element selector and drop input values. This is
  Sentry's default; it is pinned explicitly so an SDK upgrade cannot quietly
  change it.
- No replay integration.
- `tracesSampleRate: 0` — performance monitoring is not being purchased, and a
  nonzero default is the usual cause of surprise bills.

### Layer 3 — `beforeSend` / `beforeBreadcrumb` scrub

Walks the outgoing payload and redacts values under keys matching
`/pass|secret|token|auth|credential/i`. This is a pure backstop; if layers 1
and 2 work it never fires.

### Note on stack traces

`login(username, password)` receives the password as an argument, but a
JavaScript stack trace carries function names and source positions, not
argument values. A thrown exception therefore cannot leak the password. The
real risk is writing it into a log field, which layer 1 prevents.

### Note on network breadcrumbs

When the real `fetch` to `API_ENDPOINT` replaces the current stub, Sentry's
network breadcrumbs record method, URL, and status code — never request
bodies. The eventual login POST will not carry credentials to the vendor.

## User context

`log.setUser()` sends a client-side SHA-256 digest of the username, salted with
a static application salt and truncated to 16 hex characters.

**This is pseudonymization, not anonymization.** The salt ships to the browser
in JavaScript, so anyone who reads the page's source can hash a list of
suspected addresses and match them. It defeats casual rainbow-table lookup and
keeps Sentry from holding a directly usable identifier; under GDPR the digest
should still be treated as pseudonymized personal data.

Implementation constraints:

- `crypto.subtle` requires a secure context. On plain HTTP or `file:` it is
  unavailable, and the façade sets no user context at all rather than falling
  back to a weaker hash.
- `crypto.subtle.digest` is async, so the digest resolves a tick after
  `setUser()` is called. The first event of a session may be sent without user
  context. This is accepted, not worked around.

## Failure handling

**Governing rule: logging must never break the app.** A login form that fails
because telemetry failed is worse than no telemetry.

- **CDN blocked.** Ad blockers block Sentry for a meaningful share of real
  users. `logger.js` checks for `window.Sentry`; if absent, every `log.*` call
  becomes a no-op in production and falls back to `console.*` in development.
- **Init throws.** Wrapped in `try/catch`; failure degrades to the same no-op
  path.
- **Every `log.*` call is internally guarded.** A throw inside the logger is
  swallowed rather than propagated, so instrumentation cannot poison the
  `try/catch` it sits inside.
- **Recursion guard.** The global `error` handler must not report errors
  originating inside Sentry itself, or one SDK failure becomes a loop. A
  re-entrancy flag handles this.
- **Transport failures** are Sentry's responsibility: it buffers, retries, and
  drops on overflow. No custom queueing is built — that would reimplement the
  product.

**Volume.** Errors sample at 100%, appropriate for this app's traffic.
`maxBreadcrumbs` stays at the default of 100. Sentry's built-in deduplication
handles a single error firing repeatedly.

## Call sites

`logger.js` installs global `error` and `unhandledrejection` handlers so
failures outside the submit handler are not invisible.

In `app.js`, the three existing `console.*` calls are replaced:

| Current | Becomes |
|---|---|
| `console.log("Logging in:", username)` (`app.js:5`) | `log.event("login_attempt")` — no username in the field payload |
| `console.log("Login result:", result)` (`app.js:24`) | `log.event("login_result", { success: result.success })` — the whole object is never logged |
| `console.error("Validation error:", …)` (`app.js:26`) | `log.warn("validation_failed", { reason: validation.error })` — a fixed string, not user input |

The submit handler additionally gains a `try/catch` routing throws to
`log.error(err, { op: "submit" })`.

## Testing

`logger.js` is the file standing between a password field and a third-party
vendor, so it carries the tests. `app.js` is not unit-tested: it has no module
seam, its logic is a stub, and every valuable assertion lives in the façade.

Tests use a fake Sentry object rather than the real SDK. The façade design
makes this straightforward, since the vendor is a single injectable boundary.

Test cases, in priority order:

1. **The allowlist drops unknown keys.** Given `{ password: "hunter2", reason:
   "x" }`, only `reason` survives. This is the safety property; if one test
   exists, it is this one.
2. **The scrub layer redacts** `password`, `token`, and `authorization` keys in
   a `beforeSend` payload.
3. **No-op fallback.** With `window.Sentry` undefined, every `log.*` call
   returns without throwing.
4. **`log.*` never throws** given circular objects, `undefined`, or a DOM-like
   object.
5. **Environment resolution** yields `development` for localhost and
   `production` otherwise.

## Rejected alternatives

- **Console-only logging with levels.** Cheap and clean, but writes to a
  console the team never sees. It is a code-hygiene change, not a
  production-debugging one, and would not have addressed the request.
- **Self-hosted collector endpoint.** Full control and no vendor, but requires
  building and operating a log pipeline that does not exist today.
- **Local buffer with a download-diagnostics action.** No infrastructure, but
  captures only from users who actively report a bug.
- **Full session replay / LogRocket.** The most diagnostic power and the
  largest privacy surface; ruled out deliberately, and it would have required a
  consent and compliance conversation.
- **Datadog RUM.** Correct if the team already runs Datadog and wants browser
  errors beside backend traces. Overkill without existing Datadog usage.
- **Direct SDK calls at call sites (no façade).** Least code, but redaction
  discipline would live at every call site instead of one auditable place, and
  `app.js` would be untestable without the real SDK.
- **Boundary-only instrumentation.** Near-zero edits to business logic, but a
  validation failure and a login rejection look identical from outside the
  boundary — and those are the two failures most likely to be investigated.
- **Uncaught-errors-only capture.** Near-zero risk and effort, but validation
  and failed-login issues would produce no telemetry at all.
- **Vendor-neutral wrapper with the vendor deferred.** Defers a decision that
  has already been made; the façade in this design already provides the
  indirection.
- **Playwright end-to-end leak test.** Would drive the real page with a stubbed
  Sentry and assert a typed password never reaches a payload — the strongest
  available proof of the redaction claim. Rejected for now because it is the
  only item that adds a heavyweight dependency to a repository with zero
  dependencies. Worth revisiting if the redaction surface grows.

## Prerequisites before production use

1. A Sentry project exists and its DSN is available.
2. Inbound rate limits and an allowed-domains list are configured in that
   Sentry project.
3. The SRI hash for the pinned Sentry CDN bundle version is obtained.
4. The application salt for username hashing is chosen.
5. Whoever owns deployment confirms how `data-env` is set, or accepts the
   hostname heuristic.
