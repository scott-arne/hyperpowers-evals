# Logging Subsystem Design

Date: 2026-09-22
Status: approved, not yet implemented
Repository: drill-test-project, branch `feature/webapp-enhancement`

## Problem

The project has no logging layer. Diagnostics are five scattered `console.*`
calls — four in `app.js`, one in `src/index.js` — with no levels, no
structure, no way to turn detail on or off, and no consistent shape a tool
could consume. When something goes wrong in the login flow there is nothing to
read but whatever a developer happened to print, and no way to raise verbosity
without editing and redeploying the file.

A secondary problem is already latent: `app.js:5` logs the username on every
login attempt, and the submit handler holds the password in the same lexical
scope. Today those logs stay in the user's own browser console, so the
exposure is bounded. The moment logs are shipped anywhere, every existing and
future call site becomes a potential credential leak. Whatever is built now
must make the safe thing the default before that day arrives.

## Goals

- One logging core, used by both the browser app and the Node entry point.
- Structured records with levels, filterable at runtime without a redeploy.
- Sensitive values stripped in the core, where no call site or sink can bypass
  the stripping.
- An extension seam so a remote sink can be added later as a new file rather
  than a rewrite of every call site.

## Non-goals

- Shipping logs off the device. No remote sink, no HTTP transport, no batching
  or retry policy is built here. The interface that would accept one is built;
  the transport is not.
- Third-party observability SDKs (Sentry and similar). Rejected for this
  change: the repo has no bundler and no `node_modules`, and a vendor SDK
  would be the first of both.
- Converting the project to ES modules. Considered and rejected — see
  Decisions.
- Linting and formatting infrastructure. Deferred deliberately; see Global
  Constraints.

## Global Constraints

These apply to every task in the implementation plan.

- **Zero runtime dependencies.** The repo has none today and this change adds
  none. `package.json` gains a `scripts` block only.
- **Unit tests with `node:test`.** Node's built-in runner, invoked via
  `node --test`. Every behavioral claim in this spec has a test.
- **No linter or formatter.** Chosen explicitly; match the surrounding file's
  existing style by hand.
- **No build step, no bundler.** The browser loads plain classic scripts and
  must keep working when `index.html` is opened as a `file://` URL.
- **Existing module formats are preserved.** `src/*.js` stays CommonJS;
  `app.js` stays a classic script. No `"type"` field is added to
  `package.json`.

## Decisions

Each of these was settled with the requester during brainstorming; they are
constraints on the implementation, not open questions.

### D1. Both surfaces, one shared core

The browser app and the Node entry point are both instrumented, by a single
core rather than two parallel implementations.

### D2. Console sink now, sink interface designed in

The only sink implemented is a console sink. The core dispatches to an array
of sinks and exposes `addSink`, so adding an HTTP or vendor sink later is a new
function and a registration call, touching no existing call site.

Rejected alternative: building the remote HTTP sink in this change. There is no
endpoint to send to yet, and the privacy posture for an authentication flow's
logs deserves its own decision rather than riding along with the abstraction
that enables it.

### D3. Dual-format wrapper, not ES modules

The core detects its environment and exports accordingly.

Rejected alternative: converting `app.js`, `src/index.js`, and `src/utils.js`
to ES modules. It is a refactor the logging work does not require, and
`<script type="module">` is fetched under CORS rules, which would stop
`index.html` from working when opened directly from disk.

### D4. Denylist redaction

Values under sensitive key names are replaced before any sink sees the record.

Rejected alternative: an allowlist. Stronger in principle, but the friction of
registering every safe key pushes authors toward interpolating data into the
message string, where neither scheme protects anything.

## Architecture

A single new file, `logger.js`, at the repository root. Root placement is
deliberate: `src/` holds Node-side code and `app.js` is browser-side, while the
core belongs to neither.

```
logger.js          <- new: the shared core
index.html         <- modified: loads logger.js before app.js
app.js             <- modified: four console calls become logger calls
src/index.js       <- modified: adds a startup debug line
package.json       <- modified: adds a scripts block
test/logger.test.js <- new: unit tests
```

### Dual-format wrapper

```js
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Logger = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  // core
});
```

In the browser this assigns `globalThis.Logger`; under Node's CommonJS loader
it assigns `module.exports`. `index.html` loads it with a plain
`<script src="logger.js"></script>` placed **before** `app.js`, so `Logger` is
defined when `app.js` runs its top-level code.

## The record contract

Every sink receives this object. It is the most expensive thing in this design
to change later, because a future remote sink serializes it and whatever
consumes those logs will depend on the field names.

```js
{
  ts: "2026-09-22T10:11:08.123Z",  // ISO 8601, from new Date().toISOString()
  level: "info",                    // one of: debug, info, warn, error
  name: "auth",                     // the child logger's name
  msg: "login attempt",             // a short static string, not interpolated
  ctx: { username: "alice" }        // structured data, post-redaction
}
```

`msg` is intended to be a fixed string with variable data in `ctx`, so records
can be grouped by message. `ctx` is optional and defaults to `{}`.

## Public API

```js
const log = Logger.create("auth");   // a named child logger
log.debug(msg, ctx);
log.info(msg, ctx);
log.warn(msg, ctx);
log.error(msg, ctx);

Logger.setLevel("debug");            // threshold for all loggers
Logger.getLevel();
Logger.addSink(fn);                  // fn(record) -> void
Logger.removeSink(fn);
```

Levels and their numeric values: `debug` 10, `info` 20, `warn` 30, `error` 40.
A record is dispatched when its level value is greater than or equal to the
current threshold. `setLevel` with an unrecognized name is ignored and does not
throw — a bad `LOG_LEVEL` value or a typo'd query param must never break the
application it is trying to diagnose.

The threshold is global rather than per-logger. Per-logger levels are a real
convenience at scale and are not justified by two call sites; adding them later
is backward compatible.

## Level configuration

There is no build step, so no `NODE_ENV` is available in the browser. Each
environment reads its own configuration, and both default to `info`.

- **Node**: `process.env.LOG_LEVEL`, read once at module load.
- **Browser**: `localStorage.logLevel`, overridden for the current page load by
  a `?logLevel=debug` query parameter if present.

The query parameter is the operationally important half: it is how a developer
talks a user through producing debug output without shipping a new build.
Reading `localStorage` is wrapped in a `try`/`catch` — it throws in some
privacy modes, and a logger must not be the reason a page fails to load.

## Redaction

Applied inside the core, in the pipeline between record construction and sink
dispatch. Placing it there rather than at the call site or in the sink means no
sink can be written that bypasses it.

The walk covers plain objects and arrays, to a maximum depth of 4. The depth
cap bounds both cyclic structures and accidentally huge payloads. `Error`
values are replaced with `{ message, stack }` — `Error` does not serialize
usefully through `JSON.stringify`, so a future remote sink would otherwise
transmit `{}`. Values at depth beyond the cap are replaced with the string
`"[DEPTH]"` so truncation is visible rather than silent.

Keys are matched case-insensitively against this denylist:

`password`, `passwd`, `pwd`, `secret`, `token`, `authorization`, `auth`,
`cookie`, `session`, `credential`, `apikey`, `api_key`

A matched key's value becomes the string `"[REDACTED]"`; the key itself is
retained, so the record still shows that a field was present.

A bare `key` pattern is deliberately excluded. It would match innocuous names
like `keyCount` and `keyboard`, and over-redaction that quietly destroys
debugging data is its own failure mode.

Known and accepted limitation: a denylist cannot catch a sensitive value under
an unanticipated key name, nor one interpolated into `msg`. This is why the
call-site rule below exists as a separate requirement.

## Call sites

### app.js

All four `console.*` calls convert to logger calls on a `Logger.create("auth")`
instance.

| Current | Becomes |
|---|---|
| `console.log("Logging in:", username)` | `log.info("login attempt", { username })` |
| `console.log("Login result:", result)` | `log.info("login result", { success: result.success, user: result.user })` |
| `console.error("Validation error:", validation.error)` | `log.warn("validation failed", { error: validation.error })` |

Validation failure is demoted from `error` to `warn`: a user leaving a field
blank is expected operation, not an application fault, and treating it as an
error is what trains people to ignore error logs.

**Call-site rule.** The password value is never passed to a logging call, in
any form, including inside `ctx`. It flows from the submit handler to `login()`
and nowhere else. The denylist is a backstop for accidents, not a licence to
pass credentials to the logger.

The username is logged. It is most of what makes a login failure diagnosable,
and under a console-only sink it never leaves the browser of the person who
typed it.

> Assumption: logging usernames is acceptable while the console sink is the
> only sink. Validate via an explicit privacy review at the point a remote sink
> is proposed — that change alters the exposure from "visible to the user
> themselves" to "transmitted to and retained by us", which is a different
> question with a different answer.

### src/index.js

`console.log(greet('world'))` is the program's **output**, not a diagnostic. It
stays a `console.log`. A separate `log.debug("startup")` line is added on a
`Logger.create("main")` instance.

Routing program output through a logger is how command-line tools become
unpipeable: the output acquires timestamps and level prefixes, and disappears
entirely when someone raises the log threshold.

## Error handling

The logger must never be the cause of a failure in the code it observes.

- A sink that throws is caught by the core; the throw is swallowed and
  dispatch continues to the remaining sinks. A broken sink degrades logging,
  not the application.
- Redaction is wrapped so that a pathological `ctx` cannot propagate an
  exception to the call site; on failure the record is dispatched with
  `ctx: { redactionError: true }`.
- `setLevel` ignores unknown level names.
- `localStorage` access is wrapped in `try`/`catch`.
- `Logger.create` with no name defaults to `"app"`.

## Console sink

The single built-in sink, registered by default. It maps level to the matching
console method — `debug`, `info`, `warn`, `error` — and prints:

```
[2026-09-22T10:11:08.123Z] INFO  auth: login attempt { username: 'alice' }
```

The `ctx` object is passed as a separate argument rather than stringified, so
browser devtools keep it inspectable. When `ctx` is empty it is omitted.

## Testing

`test/logger.test.js`, run with `node --test`. `package.json` gains:

```json
"scripts": { "test": "node --test" }
```

Cases:

1. Level filtering — a `debug` record is suppressed at threshold `info`; an
   `error` record passes at every threshold.
2. `setLevel` with an unknown name leaves the threshold unchanged.
3. Redaction replaces values for each denylisted key, case-insensitively.
4. Redaction reaches keys nested inside objects and inside arrays.
5. The depth cap truncates at depth 4 with `"[DEPTH]"` and does not hang on a
   cyclic object.
6. `keyCount` is **not** redacted — the guard against over-matching.
7. `Error` values in `ctx` become `{ message, stack }`.
8. A registered sink receives a record with every contract field present and
   correctly typed.
9. A sink that throws does not prevent a second registered sink from running.
10. `LOG_LEVEL` in the environment sets the initial threshold.
11. The CommonJS export path yields a working logger.

The browser export path is not directly unit-testable without a DOM
environment, which would mean a dependency. It is covered indirectly by test 11
plus a manual check: open `index.html` from disk, submit the form, confirm
structured output appears and that no password value is present anywhere in the
console.

## Risks

- **Denylist gaps.** A sensitive value under an unanticipated key name is
  logged in full. Mitigated by the call-site rule and by the denylist being one
  line to extend.
- **Script ordering.** If `logger.js` is loaded after `app.js`, `Logger` is
  undefined at `app.js` top level and the page breaks. Mitigated by ordering in
  `index.html`; there is no module system here to enforce it.
- **The record contract hardens on first use.** Once a remote sink and
  anything downstream of it exist, renaming a field is a migration. The shape
  above is chosen to be conventional for exactly this reason.
