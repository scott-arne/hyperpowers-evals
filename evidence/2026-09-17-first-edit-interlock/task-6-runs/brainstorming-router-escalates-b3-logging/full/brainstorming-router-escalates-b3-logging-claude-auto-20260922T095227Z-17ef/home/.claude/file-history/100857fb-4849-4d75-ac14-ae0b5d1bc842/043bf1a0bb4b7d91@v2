# Browser Logging for Production Debugging — Design

Date: 2026-09-22
Status: Awaiting human review
Scope: the browser app (`index.html`, `app.js`) only

## Problem

Production failures in the browser app are reported by users after the fact,
and there is no way to find out what happened. The app's only instrumentation
is four `console.*` calls in `app.js`, which are visible solely to whoever has
the affected browser's devtools open at the time. There is no record of
uncaught exceptions, no way to correlate a user's report to what their session
actually did, and no store to search.

The goal is that when a user reports a login failure, the failure can be looked
up afterward: what the app was doing, what error occurred, and whether it
affected one session or many.

## Non-goals

- The Node CLI (`src/index.js`, `src/utils.js`). It shares no code with the
  browser app and is a `greet()` stub with nothing to debug.
- Analytics, product metrics, or user-behaviour tracking. This is diagnostic
  logging only.
- Server-side logging. The `API_ENDPOINT` POST is a stub and there is no server
  in this repository.
- Building our own log ingest, batching, or retry. That is the vendor's job and
  is the reason a vendor was chosen.

## Decisions made during brainstorming

| Decision | Choice | Rationale |
|---|---|---|
| Scope | Browser app only | Where real users and real failures are |
| Debug mode | Logs ship off-device | Failures are reported after the fact |
| Destination | Sentry, behind a first-party wrapper | Reliable delivery, grouping, source maps on day one |
| User data | Field allowlist + pseudonymous `userHash` | Correlation without storing raw identifiers |
| Packaging | npm + esbuild | Source-map upload; readable production stack traces |
| Error messages | Included, truncated and scrubbed | Useful enough to justify the residual leak risk |
| Tooling added | vitest, eslint + prettier | Cheapest moment; redaction needs a regression net |

## Security and privacy consequences

This change is recorded here explicitly because it extends beyond the lines of
code it touches.

1. **New third-party egress from a credential-handling page.** `index.html`
   contains a password field. After this change the same page opens a network
   path to Sentry. No password ever crosses it (see Redaction), but the path
   exists and is part of the app's threat model from now on.
2. **A new processor of user data.** Sentry will hold pseudonymized user
   identifiers and error content originating from your users. This brings them
   into scope for your data-processing agreements and your retention policy.
   Both need to be settled before the first production deploy; the code cannot
   settle them.
3. **`userHash` is pseudonymization, not anonymization.** `userHash =
   sha256(USER_HASH_SALT + username)`, truncated to 16 hex characters. The salt
   is compiled into the client bundle and is therefore public, and usernames
   are low-entropy, so the original username is recoverable by dictionary
   attack by anyone holding both the bundle and the log store. The value is
   suitable for correlating one user's events; it must not be described as
   anonymous in privacy documentation. Treat the Sentry project as containing
   pseudonymized personal data.
4. **The Sentry DSN is public by design.** It is an ingest key embedded in
   client code, not a secret. Anyone can read it and post events to the
   project. This is expected; the mitigation is Sentry's inbound filters and
   rate limits, not concealment.
5. **Existing plaintext logging is removed.** `app.js:5` currently logs the
   username in cleartext on every login attempt. This change replaces it. Had
   logging been added without this step, that line would have begun shipping
   raw usernames to a third party.
6. **Source maps are uploaded to Sentry and never served publicly.** Serving
   them would expose unminified source to anyone who requests it.

## Architecture

Four modules, each with a single responsibility. Data flows in one direction
with exactly one choke point.

```
call site -> logger/index.js -> logger/redact.js -> logger/sink-sentry.js -> Sentry
                   ^
        logger/capture.js (global error handlers)
```

### `src/logger/index.js`

The only module the application imports. Public API:

- `log.debug(event, fields)` / `log.info(...)` / `log.warn(...)` / `log.error(...)`
- `log.setUser(username)` — computes and stores `userHash`; never stores the
  username itself
- `log.init(config)` — called once at startup; wires the sink and installs
  capture

Call sites never reference Sentry's API. This wrapper is what keeps the vendor
replaceable and is the reason the destination decision is reversible.

Responsibilities: assemble the record, apply the level filter, enforce the
volume cap and recursion guard, pass the record to `redact`, hand the result to
the sink, and never throw.

### `src/logger/redact.js`

Pure, dependency-free, and the single enforcement point for the privacy rules.
Exports `redact(record)`.

Order of operations, deliberately denylist-before-allowlist so that a future
allowlist edit cannot accidentally admit a credential:

1. **Value denylist.** Drop any key matching `/pass|pwd|secret|token|auth|cookie/i`.
2. **Field allowlist.** Retain only these keys; drop everything else:
   `event`, `level`, `ts`, `sessionId`, `userHash`, `release`, `errorName`,
   `errorMessage`, `durationMs`, `httpStatus`, `formField`.
3. **Dropped-key accounting.** For each dropped key emit the *key name only*
   under a `redact.dropped_field` event, so a misbehaving call site is visible
   without its payload being transmitted.
4. **`errorMessage` treatment.** Truncate to 200 characters, then scrub
   substrings matching an email-address pattern and digit runs of 7 or more,
   replacing each with `[redacted]`.

`errorMessage` is a stated residual risk: error strings are the most common
place user data leaks into logs. Truncation and scrubbing are mitigation, not a
guarantee. The accepted alternative, if the residual risk proves unacceptable
in review, is to drop `errorMessage` and retain only `errorName`.

### `src/logger/sink-sentry.js`

The only module that imports `@sentry/browser`. Handles `Sentry.init`, maps the
internal record shape onto Sentry's event/breadcrumb model, and exposes a
single `send(record)` function. Batching, retry, and offline queueing are
Sentry's responsibility and are not reimplemented.

### `src/logger/capture.js`

Installs `window.onerror` and `window.addEventListener('unhandledrejection')`,
translating each into an `app.unhandled_error` / `app.unhandled_rejection`
event. This is the highest-value component for the stated goal: it catches the
failures nobody thought to instrument, which is the usual shape of a
user-reported production issue.

## Record shape

Every record is a flat object built by the logger, never by a call site:

```js
{
  event,        // stable dot-delimited identifier, not prose
  level,        // debug | info | warn | error
  ts,           // ISO 8601
  sessionId,    // random, minted once per page load
  userHash,     // present only after log.setUser()
  release,      // git sha, injected at build time
  ...fields     // allowlisted only
}
```

`event` names are stable identifiers rather than sentences so that logs stay
groupable and searchable. Initial vocabulary:

- `login.submit`
- `login.validation_failed` (carries `formField`)
- `login.result` (carries `httpStatus`, `durationMs`)
- `login.error` (carries `errorName`, `errorMessage`)
- `app.unhandled_error`, `app.unhandled_rejection`
- `logger.rate_limited`, `redact.dropped_field`

`sessionId` is what makes a user's report reconstructable as a sequence rather
than a set of disconnected lines.

## Changes to `app.js`

1. Becomes an ES module and imports the logger.
2. `log.init()` at startup; `log.setUser(username)` on submit.
3. `console.log("Logging in:", username)` at `app.js:5` is **removed** and
   replaced by `log.info('login.submit')`, which carries no raw identifier.
4. `console.log("Login result:", result)` becomes `log.info('login.result', …)`.
5. `console.error("Validation error:", …)` becomes
   `log.warn('login.validation_failed', { formField })` — the field *name*, not
   its value.
6. The `login()` call is wrapped so a thrown error produces `login.error`.

## Build and configuration

- `package.json` gains: dependency `@sentry/browser`; devDependencies
  `esbuild`, `vitest`, `eslint`, `prettier`; scripts `build`, `watch`, `test`,
  `lint`, `format`, `sourcemaps`.
- `build`: esbuild bundles `app.js` to `dist/app.js` with `--sourcemap`.
- `index.html:13` changes from `<script src="app.js">` to
  `<script type="module" src="dist/app.js">`.
- Build-time configuration via esbuild `--define`, documented in
  `.env.example`: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `RELEASE` (git sha),
  `USER_HASH_SALT`.
- `dist/` is gitignored. Source maps are uploaded to Sentry by the
  `sourcemaps` script and are not published.

**Accepted regression:** opening `index.html` directly from the filesystem
stops working. The app now requires `npm install && npm run build` first. This
is the cost of readable production stack traces and is accepted deliberately.

## Failure handling

- **Never break the page.** Every public logger method wraps its body in
  `try/catch` and swallows failures. In dev builds the swallowed error is
  written to `console.error` so it is not invisible during development.
- **Recursion guard.** A module-level `inFlight` flag prevents an error raised
  inside the logger from re-entering the logger via the global handlers
  installed by `capture.js`.
- **Volume cap.** At most 100 events per page load. On exceeding it, emit one
  `logger.rate_limited` event and drop the remainder. This protects the Sentry
  quota against a render loop or retry storm, the common cause of an unexpected
  bill on a first logging rollout.

## Testing

- `redact.test.js` — the regression net for the privacy design: a
  password-shaped key is dropped; an unknown key is dropped and counted;
  `errorMessage` truncates at 200 characters; an email inside `errorMessage` is
  scrubbed; `userHash` is stable for a given username and differs across salts.
- `logger.test.js` — against a fake sink: record shape, level filtering, volume
  cap, recursion guard, and that a throwing sink does not propagate.
- `capture.test.js` — both global handlers are installed and produce the
  expected events.
- `sink-sentry.js` — no unit test. It is a thin adapter, and a mocked Sentry
  would only assert the mock. Verified once manually against a staging DSN;
  that manual check is what proves the pipeline delivers end to end.

## Global constraints

- Lint and format (eslint + prettier) and unit tests (vitest) are set up as
  part of this work; all new code passes both.
- No end-to-end test infrastructure in this iteration.
- Redaction is enforced structurally in `redact.js`, never by convention at
  call sites. Any change that lets a call site bypass `redact()` is a defect.
- No raw username, password, or form input value is ever passed to the sink.

## Assumptions to validate

- Assumption: a Sentry account and project exist, or one will be created
  before rollout; validate by obtaining a staging DSN prior to implementation.
- Assumption: sending pseudonymized user identifiers and error content to
  Sentry is permitted under the project's data-protection obligations;
  validate with whoever owns that policy before the first production deploy.
- Assumption: a git sha is available at build time to serve as `RELEASE`;
  validate against the deployment pipeline, which is not in this repository.

## Open questions for the reviewer

1. Who owns the Sentry project, and what retention period should be set?
2. The `errorMessage` residual-leak risk was accepted during brainstorming.
   Confirm that still holds once whoever owns data-protection policy has seen
   it; the fallback is `errorName` only, which is a one-line change in
   `redact.js`.
3. Is there a deployment pipeline that should run `build` and `sourcemaps`, or
   is this built and deployed by hand today?
