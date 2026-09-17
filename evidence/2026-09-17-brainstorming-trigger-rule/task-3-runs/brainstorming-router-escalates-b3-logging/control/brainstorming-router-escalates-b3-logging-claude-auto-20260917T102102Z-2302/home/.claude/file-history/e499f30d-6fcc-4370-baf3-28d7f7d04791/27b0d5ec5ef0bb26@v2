# Logging Subsystem Design

Date: 2026-09-17
Status: Approved design, pending implementation plan
Branch: `feature/webapp-enhancement`

## Problem

The application has no logging subsystem. The only diagnostic output is four
ad-hoc `console` calls in `app.js`, which stay on the user's machine and are
therefore invisible when a production issue is reported. There is no way to
reconstruct what a session did before it failed.

Two of those existing calls are actively harmful: `app.js:6` writes a username
to the console on every login attempt, and `app.js:25` writes the full login
result object. Instrumenting an authentication flow is precisely where
credentials leak into log stores, so redaction is a first-class concern of this
design rather than a later hardening pass.

## Goals

- Structured, machine-readable log records from both the browser webapp and the
  Node `src/` module.
- Records from the browser reach a place the team can query during an incident.
- Records from one session can be reconstructed into a sequence.
- Credentials and unclassified data cannot reach the log store by accident.
- The logger cannot degrade the application it is instrumenting.

## Non-Goals

- Metrics, tracing, or performance instrumentation. Logs only.
- A log query UI, dashboard, or alerting. This produces records; consuming them
  is somebody else's system.
- Cross-session user analytics. Explicitly excluded by the correlation decision
  below.
- Adopting a third-party error-tracking vendor. Rejected during brainstorming;
  the sink interface leaves the door open.

## Decisions

These were settled during brainstorming and are fixed inputs to the plan.

| # | Decision | Rationale |
|---|---|---|
| 1 | Cover both the browser webapp and Node `src/` | One subsystem, per-environment sinks |
| 2 | Console sink plus a pluggable batching remote sink | Only option that makes browser-side failures visible; keeps the repo free of runtime dependencies; a vendor SDK can be added later behind the same sink interface |
| 3 | Deny by default (allowlist), with a name scrubber as a second layer | A mistake costs a missing field, never a leaked credential. Tightening later would mean auditing every call site; loosening later is a one-line change. A credential already in the log store cannot be un-shipped |
| 4 | Ephemeral session ID | Buys sequence reconstruction without creating a persistent tracking identifier and the consent and retention obligations that follow |
| 5 | Convert the repo to ES modules | The repo runs two incompatible module systems (`src/` is CommonJS, `app.js` is a classic script). That split is the direct cause of the packaging awkwardness, so fixing it is targeted at this work rather than unrelated refactoring |
| 6 | `username` field policy is `presence` | No PII reaches the log store. Accepted cost: logs alone cannot identify which account hit a bug |

Alternatives considered and rejected: a single dual-mode UMD file (environment
branching accumulates in the core), core-plus-adapters with UMD footers
(introduces invisible `<script>` load-order coupling in `index.html`),
console-only logging (does not solve browser-side visibility), a denylist
redaction model (fails open), and a persistent `localStorage` device ID.

The Codex approach gate was run and returned an empty response. No independent
Codex approaches were folded in; the approaches above are the author's.

## Architecture

```
logging/
  index.js         public API, level config, sink wiring
  record.js        levels, record construction, session ID
  redact.js        field registry, allowlist projection, name scrubber
  sink-console.js  console sink
  sink-remote.js   batching remote sink and its own flush registration
```

`record.js` and `redact.js` are pure: no I/O, no environment access. `index.js`
is the only module the rest of the repository imports.

Both environments run the same core. Exactly two things differ, and both are
confined to `sink-remote.js`:

- Transport: `navigator.sendBeacon` when present for the unload flush,
  `fetch(..., { keepalive: true })` otherwise. Node 18+ provides global `fetch`.
- Flush trigger: `pagehide` in the browser, `process.on('beforeExit')` in Node.

Keeping this feature detection in one leaf module, rather than in the core, is
the reason approach C was chosen over a single dual-mode file.

### Data flow

```
call site -> index.js (level filter)
          -> record.js (build record, attach ts/level/sessionId/env)
          -> redact.js (allowlist projection, then scrubber; returns scrubbedKeys)
          -> each enabled sink (console; remote if configured)
          -> sink-remote.js buffer -> batch -> transport
```

Redaction runs before any sink sees the record, so no sink can observe
unprojected data.

## Record Shape

```js
{
  ts:        "2026-09-17T10:21:02.123Z",  // ISO 8601, UTC
  level:     "info",                       // debug | info | warn | error
  msg:       "login attempt",              // static string
  sessionId: "9f2c...",                    // ephemeral, per page load / process
  env:       "browser",                    // or "node"
  ctx:       { /* allowlisted keys only */ },
  err:       { name, message, stack }      // present on error records only
}
```

**`msg` MUST be a static string literal.** All variable data goes in `ctx`,
where the allowlist can inspect it. An interpolated message such as
`` `Logging in: ${username}` `` would bypass deny-by-default in the most
natural-looking way available, filling the log store with values no scrubber
ever inspected. Static messages are also what make records groupable during an
incident.

Enforcement: the logger signature is `(msg, ctx)` and never accepts a template
argument. A lint rule may reinforce this later; it is not required for the
first implementation.

`sessionId` is a single `crypto.randomUUID()` minted at module load. Available
natively in Node 18+ and all current browsers, so no dependency and no fallback
path.

## Levels and Configuration

Four levels, numerically ordered: `debug` < `info` < `warn` < `error`. Records
below the configured minimum are discarded before record construction.

- Node: reads `LOG_LEVEL`, defaulting to `info`.
- Browser: defaults to `warn`, or `debug` when the hostname is `localhost`.
  Overridable at runtime via a `logLevel` key in `localStorage`, so support can
  ask a user to raise verbosity and reproduce. This is a settings value, not an
  identifier, and does not conflict with decision 4.

The remote sink is wired only when an endpoint URL is configured. With it
unset, the subsystem is console-only, so local development requires no setup
and cannot accidentally transmit records.

## Redaction

The allowlist is a **central field registry** in `redact.js`, not per-call-site
declarations. Scattering allowlists through call sites would make the policy
unreviewable: nobody could answer "what can leave the browser?" without
grepping the whole codebase.

```js
export const FIELD_POLICY = {
  errorCode:  'raw',
  formValid:  'raw',
  fieldCount: 'raw',
  httpStatus: 'raw',
  durationMs: 'raw',
  username:   'presence',
};
```

`project(ctx)` drops every key absent from the registry. Call sites stay clean:
`log.info("login attempt", { username, formValid })`.

Policies are synchronous only:

- `raw` — the value passes through.
- `presence` — emitted as a boolean recording whether the value was non-empty.
- `length` — emitted as a character count.

Hashing was deliberately excluded. `crypto.subtle` is asynchronous in browsers,
and making the entire logging API asynchronous to support one transform is a
bad trade.

**Second layer.** Before any record reaches a sink, a scrubber walks it and
replaces values whose key matches `/pass|token|secret|auth|cookie|credit|ssn/i`
with `[REDACTED]`. Because projection already ran, this should never fire. That
is the point: it is an alarm, not a filter.

To keep `redact.js` pure, the scrubber does not emit the alarm itself. It
returns `{ record, scrubbedKeys }`, and `index.js` emits a warning through the
console sink only when `scrubbedKeys` is non-empty. Console-only is deliberate:
routing the alarm to the remote sink would recurse through the same redaction
path that just failed.

**Residual risk.** `err.stack` is an opaque string the scrubber cannot
meaningfully inspect. JavaScript stacks do not embed argument values the way
Python tracebacks can, so exposure is small, but it is not zero. The pipeline
is not airtight and should not be described as such.

## Remote Sink and Self-Protection

Records buffer in memory. A flush occurs when any of these is true:

- 20 records are queued.
- 5 seconds have elapsed since the last flush.
- An `error`-level record arrives (flush immediately; the crash is the record
  that matters most).
- The page or process is terminating.

Payload: `{ sessionId, env, records: [...] }` as JSON.

A logger that degrades the application it is debugging is worse than no logger,
so failure behavior is specified explicitly:

- **Never throws into caller code.** Every sink invocation is wrapped. A sink
  failure cannot break a login.
- **No retry storm.** A failed batch is dropped, not requeued. A `dropped`
  counter rides in the next successful envelope so consumers know the record
  stream has holes.
- **Bounded buffer** of 200 records, dropping oldest first. A long-lived tab
  with a dead endpoint cannot grow memory without limit.
- **Circuit breaker.** After 3 consecutive failures, stop attempting for 60
  seconds. Without it, a down collector means every user's browser POSTs at it
  every 5 seconds indefinitely — self-inflicted load during exactly the
  incident being debugged.

## Migration of Existing Code

- `package.json`: add `"type": "module"`, a `scripts` block, and Biome as the
  sole devDependency.
- `src/utils.js`, `src/index.js`: convert `require`/`module.exports` to
  `import`/`export`.
- `index.html`: script tag becomes `<script type="module" src="app.js">`.
- `app.js`: functions become real exports rather than script-scope globals.
- `app.js:6` (`console.log("Logging in:", username)`) and `app.js:25` (full
  login result) are **replaced**, not ported. Their replacements carry
  `username` under the `presence` policy.
- `app.js:27`'s validation `console.error` becomes a `warn`-level record with
  `errorCode`.
- `src/index.js:4`'s `console.log(greet('world'))` is program output, not
  logging, and stays as-is.

Known workflow regression: ES modules are blocked over `file://` by CORS, so
opening `index.html` by double-clicking will stop working. Local viewing needs
a static server. Accepted during brainstorming on the grounds that the remote
sink needs a real origin regardless and production serves over HTTP.

## Testing

`record.js` and `redact.js` are pure and test directly.

`sink-remote.js` takes its **transport and flush registration as injected
parameters**, defaulting to environment detection. This is a design
requirement, not only a testing convenience: it is what allows buffering, batch
thresholds, drop counting, and the circuit breaker to be tested against a fake
transport and a fake clock with no browser and no network.

Required coverage:

- A password placed in `ctx` never appears anywhere in the payload handed to
  the transport. This is the assertion protecting the highest-consequence
  failure and must exist.
- Unregistered keys are dropped by projection.
- `presence` never emits the underlying value.
- The scrubber reports a sensitive key in `scrubbedKeys`, and `index.js` turns
  that into a console-only warning that never reaches the remote sink.
- Level filtering discards records below the configured minimum.
- Flush triggers: count threshold, time threshold, error-level immediate,
  termination.
- Circuit breaker opens after 3 failures and closes after cooldown.
- Bounded buffer drops oldest beyond 200.
- A throwing sink does not propagate to the caller.

## Global Constraints

Every implementation task inherits these:

- **Unit tests:** Node's built-in `node:test` and `node:assert`, run via
  `node --test`. No test-framework dependency.
- **Lint and format:** Biome, configured via a checked-in `biome.json`. The
  only devDependency.
- **Runtime dependencies:** none. The subsystem must remain dependency-free.
- **End-to-end and fuzz/mutation testing:** out of scope for this work.
- Comments explain why, not what. No attribution or AI-generated markers.
- The spec document is not committed.

## Assumptions

- Assumption: a log collector endpoint accepting JSON POST bodies will be
  available; validate by confirming the URL and payload contract with whoever
  operates it before the remote sink is enabled in production.
- Assumption: the Node deployment runs Node 18 or later, for global `fetch` and
  `crypto.randomUUID`; validate by checking the deployment runtime and
  recording it in an `engines` field.
- Assumption: the supported browser matrix covers native ES modules,
  `crypto.randomUUID`, and `navigator.sendBeacon`; validate by confirming the
  matrix with the team.
- Assumption: the "production issues" motivating this work are in the browser
  webapp rather than `src/`, which is currently a hello-world module; validate
  by asking which failures prompted the request.
- Assumption: no consent or cookie-banner obligation is triggered, on the basis
  that no persistent identifier is stored and no PII is transmitted; validate
  with whoever owns privacy review before production rollout.

## Open Risks

- The collector endpoint does not exist yet, so the remote sink cannot be
  verified end-to-end during implementation. It will be tested against a fake
  transport only.
- `presence` for `username` means a production report of "user X cannot log in"
  cannot be matched to log records by account. If that proves limiting, the
  registry is one line to change, but the earlier records stay unidentified.
