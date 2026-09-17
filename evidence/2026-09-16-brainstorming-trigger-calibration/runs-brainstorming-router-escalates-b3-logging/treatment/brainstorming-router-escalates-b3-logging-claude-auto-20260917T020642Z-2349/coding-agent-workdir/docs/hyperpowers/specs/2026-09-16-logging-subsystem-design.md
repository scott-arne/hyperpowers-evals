# Logging Subsystem Design

Date: 2026-09-16
Status: approved for planning

## Problem

The app has no logging subsystem. It has four bare `console` calls in `app.js`
and one in `src/index.js`. Console output on a user's machine is invisible to
us, so production failures currently cannot be diagnosed unless they reproduce
locally.

## Goals

- A single shared logging core serving both the browser app and the Node entry
  point.
- Browser records delivered to a collector endpoint we own, reliably enough to
  survive tab close and collector downtime.
- No credential or raw personal data may ever reach a log record.
- Redaction correctness enforced by unit tests, not by review.

## Non-goals

- Third-party log/APM services. Ruled out to keep the project dependency-free
  and log data in-house.
- Lint/format tooling and end-to-end tests. Explicitly declined.
- Metrics, tracing, or alerting. Logging only.
- Instrumenting `src/utils.js`, which is a pure function with nothing to
  diagnose.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | Browser and Node, shared core | Consistent record shape; one place to change redaction rules |
| Browser sink | Self-owned endpoint, batched POST | No dependencies; log data stays in-house |
| Redaction | Field allowlist | Failure mode is a missing log line, not a leaked credential |
| User identity | Random per-session id | Log store holds no personal data, not even pseudonymous |
| Module strategy | Dual-mode adapters, no ESM migration | Avoids bundling a module-system migration into this task |
| Tooling | `node --test` unit tests only | Redaction is security-critical and must be test-enforced |

## Architecture

Three new files; `src/utils.js` is untouched.

### `src/logger.js` — the core

Pure record construction. No I/O, no environment detection, no globals. Owns:

- the record schema,
- the field allowlist and the hard deny list,
- the level threshold,
- handing finished records to an injected sink.

Keeping the core free of environment branching is what makes it directly unit
testable under `node --test` with no DOM or network stubs.

### `src/logger-node.js` — Node adapter

Wires the core to a stdout JSON-lines sink. Reads `LOG_LEVEL` from the
environment. No endpoint, no HTTP, no buffering, no circuit breaker: the
platform collects stdout.

### `src/logger-browser.js` — browser adapter

Wires the core to the buffered HTTP sink, attaches page context, assigns
`window.log`, and installs `window.onerror` and `unhandledrejection` handlers.

Dual-mode export lives only in these two adapters (`module.exports` versus
assignment to `window`), never in the core.

### Wiring

- `index.html` gains a small inline `window.__LOG_CONFIG__` block plus
  `<script>` tags for `src/logger.js` and `src/logger-browser.js`, all before
  `app.js`.
- `src/index.js` gains a `require` of `src/logger-node.js`.
- `app.js`: the existing `console` calls at lines 5, 24, and 26 become `log.*`
  calls, and `login()` gains failure-path logging. `validateForm` logs which
  field was missing, never its value.

## Record schema

```json
{
  "ts": "2026-09-16T14:22:31.004Z",
  "level": "info",
  "event": "login.attempt",
  "msg": "Login attempt started",
  "runtime": "browser",
  "session": "b7f2c9a1e4d8",
  "ctx": { "field": "password", "reason": "missing" },
  "app": { "name": "drill-test-project", "version": "1.0.0" }
}
```

- `event` is the stable machine-readable key queries are written against
  (`login.attempt`, `login.failure`, `validation.rejected`).
- `msg` is prose for humans and carries no structural guarantees.
- **All variable data goes in `ctx` and nowhere else.** This single funnel is
  what makes the allowlist enforceable.
- `session` is a random per-session identifier, not derived from the username
  and not stable across sessions. It is the only identity field; there is no
  separate user reference. This is the value the error UI surfaces for users to
  quote in support tickets.

Levels: `debug`, `info`, `warn`, `error`. Default threshold `info`.

## Redaction

A module-level allowlist constant in the core. Any `ctx` key not on it is
dropped before the record is constructed; the record carries
`droppedFields: <n>` so withheld information is visible as a count without
exposing its content.

Initial allowlist: `field`, `reason`, `status`, `errorCode`, `durationMs`,
`attempt`.

A hard deny list — `password`, `token`, `secret` — cannot be added to the
allowlist; attempting to do so throws, and a test asserts it.

The browser adapter logs `location.pathname` only. Query strings and fragments
are never logged, because they carry tokens and reset codes.

Error messages captured from `window.onerror` and `unhandledrejection` are
truncated to 500 characters.

**Residual risk:** `msg` is unfiltered prose, so a call site that interpolates
a secret into the message string defeats the allowlist. The convention is that
`msg` must be a static string literal, with variable data in `ctx`. This is
enforced by convention and review only — no linter is in scope to check it.

### Identity rationale

A synchronous hash of a username was considered and rejected. A cryptographic
hash in the browser requires `crypto.subtle.digest`, which is async and would
force the entire log API to be async. The synchronous alternative (salted
FNV-1a) is brute-forceable against low-entropy usernames and remains personal
data under GDPR-style regimes.

The random session id inverts the correlation direction: the error UI surfaces
the session id and the user quotes it in a support ticket. Cross-session
user history is lost; that was accepted.

## Delivery and buffering (browser)

Bounded in-memory queue. Flush triggers:

- 20 records queued,
- 5 seconds elapsed,
- page teardown (`visibilitychange` to hidden, and `pagehide`).

Normal flushes use `fetch` with `keepalive: true`. Teardown flushes use
`navigator.sendBeacon`, the only mechanism browsers reliably permit as a tab
closes.

Queue cap is 100 records. Beyond the cap the oldest record is dropped and a
counter increments; the counter rides along on the next successful flush so
loss is distinguishable from silence.

## Error handling

The design's main concern is the logger not amplifying the incident it is
meant to diagnose.

- A failed flush re-queues its records, subject to the same cap. No tight
  retry loop.
- Circuit breaker: after 3 consecutive failures the transport pauses for 60
  seconds. Without it, a down collector turns every browser into a retry
  generator aimed at already-unhealthy infrastructure.
- No recursion: transport failures are never reported through the logger. They
  go to `console.warn` once, behind a flag.

## Configuration

| Runtime | Source | Keys |
|---|---|---|
| Browser | `window.__LOG_CONFIG__` inline in `index.html` | `endpoint`, `level` |
| Node | Environment | `LOG_LEVEL` |

No secrets in either. The collector must accept unauthenticated posts or a
public write key. This is a constraint on whoever builds the endpoint.

## Testing

`node --test` via an added `npm test` script. Zero dependencies.

1. **Canary test:** pass an entire `formData` object including a password into
   `log.info`, serialize the record, and assert the password value and the key
   `password` both appear nowhere. This test must keep passing forever.
2. Allowlist drops unknown keys and reports `droppedFields`.
3. Allowlisting `password`, `token`, or `secret` throws.
4. Level threshold filters correctly.
5. Buffer behavior against a fake sink and injected clock: flush at size
   threshold, flush at time threshold, re-queue on failure, drop oldest at cap,
   breaker opens after 3 failures and closes after cooldown.
6. Node adapter emits one parseable JSON object per line.

**Not covered:** the DOM-dependent parts of `app.js` and the real `sendBeacon`
path. End-to-end tooling was declined, so the wiring between the form and the
logger is verified by reading, not by tests.

## Open items

- **Collector URL.** Assumption: a collector endpoint will exist before this
  ships; validate by obtaining the URL from whoever owns the backend. The sink
  is pluggable so implementation is not blocked, but shipping without a live
  collector means the browser side logs nothing reachable.
- **Retention policy.** Assumption: the collector owner sets a retention
  window; validate by confirming it with them. Session ids combined with IP
  addresses in access logs can re-identify users regardless of record schema.

## Codex approach gate

Preflight returned `ok` (codexVersion `0.0.0-stub`), but the companion call
returned an empty result. Treated as an incomplete call per the gate: no
independent Codex approaches were folded in, noted once, not retried. The
approaches in this design had no second opinion.
