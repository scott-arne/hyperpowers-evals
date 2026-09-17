# Browser Logging Subsystem — Design

Date: 2026-09-17
Status: approved in chat, pending spec review

## Problem

The browser login app (`app.js` + `index.html`) has no logging subsystem. It
carries four ad-hoc `console.*` calls that are invisible in production, retains
nothing across a reload, and installs no handler for uncaught errors or
rejections — so a thrown exception in the submit handler disappears with no
trace. When a user reports a failure there is nothing to ask them for.

One of those calls, `console.log("Logging in:", username)`, logs a credential-
adjacent value, and the password is in scope two lines away. Any logging that
persists records or invites users to share them makes that a live concern
rather than a latent one.

## Goal

A small logging subsystem for the browser app that produces structured,
greppable records; retains recent history on the user's machine; exposes a way
for a user to hand that history to a developer; and captures the uncaught
errors that are currently lost. It must never break the login flow, and it must
not leak credentials into an artifact that gets pasted into a bug report.

## Scope

In scope: `app.js`, `index.html`, a new logger module, and its tests.

Out of scope: `src/index.js` and `src/utils.js` (a separate CommonJS Node
entry point, unrelated to the browser app) — these stay untouched. Also out of
scope: shipping logs to a remote collector, and any backend work. The real API
call is a stub (`API_ENDPOINT` is never contacted), so there is no server to
receive logs.

## Decisions

These were settled during brainstorming; each records the alternative rejected.

1. **Scope: browser app only.** The Node `src/` tree is a disjoint program and
   would need different logging. Not worth a shared abstraction over two
   programs with nothing in common.
2. **Destination: console + local ring buffer with an export hook.** Rejected
   console-only (invisible in production) and remote shipping (requires an
   endpoint that does not exist, plus consent and PII handling). The sink seam
   means a remote sink can be added later without touching call sites.
3. **Redaction: allowlist, with identifiers hashed.** Rejected a key-name
   denylist because it fails open — one unexpected key name (`pwd`,
   `passphrase`, a whole serialized form object) is a leak, and the artifact is
   one users hand to strangers.
4. **Module style: ES modules, served over HTTP.** Rejected a classic script
   with a `window` global. The app must be served (`python3 -m http.server` or
   equivalent) rather than opened via `file://`, which CORS blocks for module
   scripts.
5. **Tooling: zero-dependency unit tests via `node --test`.** Rejected adding a
   linter/formatter dependency for now; the repo stays dependency-free.

## Global Constraints

- **Zero runtime and dev dependencies.** `package.json` gains a `test` script
  and nothing else.
- **`src/` is not modified.** This constrains the module strategy (see below).
- **The logger must never throw into the app.** A logging failure degrades;
  it does not break login.
- **The logger core references no browser globals directly.** `localStorage`,
  the clock, and the console are injected, which is what makes the core
  testable under Node with no DOM.
- **Tests are written before implementation** (TDD); the core is pure functions
  over injected dependencies, so this is cheap.
- Verified on this machine: Node v26.8.2 (`node --test` is stable), and
  `python3 -m http.server` serves `.mjs` as `text/javascript`.

## File Layout

| File | Change |
|---|---|
| `logger.mjs` | New. Logger core, event table, and sinks. |
| `app.js` | Replace the four `console.*` calls with logger calls; install global error handlers; expose the export hook. |
| `index.html` | `<script type="module" src="app.js">`. |
| `test/logger.test.mjs` | New. `node --test` suite. |
| `package.json` | Add `"scripts": { "test": "node --test" }`. |
| `src/**` | Untouched. |

### Why `.mjs`

Root `package.json` has no `"type"` field, so Node reads `.js` as CommonJS —
correct for the existing `src/index.js` and `src/utils.js`, which use
`require`/`module.exports`. Adding `"type": "module"` would let Node read a
`logger.js` as ESM but would **break both `src/` files**, which are unrelated
to this task. Naming the core `logger.mjs` makes Node treat it as ESM
regardless of `package.json`, so the test suite imports it directly and `src/`
keeps working.

`app.js` keeps its `.js` extension because only the browser loads it, and
browsers determine module-ness from `type="module"` plus the served MIME type,
not the file extension.

## Record Shape

One structured record per event:

```js
{
  ts: "2026-09-17T10:08:40.123Z",
  level: "info",
  event: "login.result",
  ctx: { user: "usr_9f3a1c2b", success: true }
}
```

Events are named identifiers rather than free-text messages, so a dump can be
grepped and filtered by event name.

## Redaction: the event table

The allowlist lives in exactly one table in `logger.mjs`, so the entire logging
surface is auditable in one place:

```js
const EVENTS = {
  "app.start":                 ["ua"],
  "login.attempt":             ["user"],
  "login.result":              ["user", "success"],
  "login.validate.failed":     ["reason"],
  "login.error":               ["user", "message"],
  "window.error":              ["message", "source", "line", "col", "stack"],
  "window.unhandledrejection": ["reason", "stack"],
};
```

Rules:

- The serializer keeps only the keys declared for the record's event. Every
  other key is dropped, and the dropped key *names* (never their values) are
  recorded in a `_dropped: ["fieldName"]` marker, so a redaction appears in the
  dump as a visible absence rather than a silent one. The marker is written as
  a key inside `ctx` (not at the record's top level), and is omitted entirely
  when nothing was dropped, so ordinary records stay uncluttered.
- An event name absent from the table logs as `event: "unknown"` with all
  context dropped. This fails closed when a call site is added without updating
  the table.
- `password` appears in no allowlist and is never passed to a logger call at
  any level.
- `login.validate.failed` logs `reason` — the existing validation message
  string, e.g. `"Missing required fields"` — never the submitted field values.
- Context values are serialized defensively: primitives pass through; objects
  go through `JSON.stringify` inside a `try/catch` with a length cap, and an
  unserializable value becomes `"[unserializable]"`.

## Identifier Hashing

`user` is stored as `usr_` plus an 8-hex-character FNV-1a hash of the username,
so one user's events can be correlated across a dump without the dump naming
them.

**This is obfuscation, not anonymization, and the spec records that
deliberately.** FNV-1a is non-cryptographic and usernames are low-entropy, so a
party holding both the dump and a candidate list can confirm a match by
re-hashing. It defeats casual disclosure — a support ticket pasted into a chat
channel does not read out usernames — and nothing stronger. The zero-dependency
and synchronous-API constraints rule out a real KDF here, since `crypto.subtle`
is async. Accepted knowingly; revisit if the threat model changes.

## Core API

```js
createLogger({ level, sinks, clock, hashId }) -> { debug, info, warn, error }
```

Each method takes `(event, ctx)`. All four dependencies are injected, with
production defaults supplied by `app.js`.

## Sinks

The core holds a list of sinks and hands each the finished record.

- **`consoleSink(console)`** — maps level to `console.debug/info/warn/error`.
- **`ringBufferSink({ capacity = 200, storage })`** — an in-memory array that
  evicts oldest-first at capacity, written through to
  `localStorage["applog.v1"]`. `storage` is injected, defaulting to
  `globalThis.localStorage`. Quota exhaustion or a private-mode failure
  degrades the sink to memory-only rather than throwing. Exposes `snapshot()`.

**Failure isolation:** every sink invocation is wrapped in `try/catch`. A sink
that throws is disabled for the remainder of the session and its failure is
reported once to the console. A broken sink can never break the login flow.

## Levels

`debug < info < warn < error`, defaulting to `info`. Overridable for a live
debugging session via the `?log=debug` query parameter or
`localStorage.setItem("applog.level", "debug")`, read once at initialization.
An unrecognized level value falls back to `info`.

## Export Hook

Installed by `app.js`, not by the core:

```js
window.__appLog = { dump(), copy(), clear() }
```

- `dump()` returns the buffered records as pretty-printed JSON.
- `copy()` writes that JSON to the clipboard via `navigator.clipboard`.
- `clear()` empties the buffer and the `localStorage` key.

This is what a developer asks a user to run when they report a problem.

## Instrumentation

Global handlers — the main production win, entirely absent today:

- `window.addEventListener("error", ...)` → `window.error` at `error` level.
- `window.addEventListener("unhandledrejection", ...)` →
  `window.unhandledrejection` at `error` level.

Application events:

- `app.start` (info) at initialization, with the user agent. Browser and
  version is usually the first question a production bug raises.
- `login.attempt` (info) before the login call, with the hashed user.
- `login.result` (info) after it, with hashed user and success flag.
- `login.error` (error) if the login call throws — the call is wrapped so a
  throw becomes a logged record rather than an unhandled rejection.
- `login.validate.failed` (warn) on the validation-failure branch.

All four existing `console.*` calls in `app.js` are replaced by these.

## Testing

`node --test` over `test/logger.test.mjs`, with a fake clock and a fake storage
object injected so no DOM is required:

1. Context keys not declared for the event are dropped, and `_dropped` names
   them.
2. An event name absent from the table logs as `unknown` with all context
   dropped.
3. Level filtering: records below the configured level are not emitted.
4. Ring buffer evicts oldest-first at capacity and retains exactly `capacity`
   records.
5. `hashId` is stable across calls and its output never contains the input as a
   substring.
6. A sink that throws does not propagate, and is not called again afterward.
7. A storage object whose `setItem` throws (quota) degrades the sink to
   memory-only, and buffered records remain readable via `snapshot()`.
8. Record shape: `ts` comes from the injected clock, and `level`/`event` match
   the call.

Manual verification: serve the directory over HTTP, submit the form with empty
fields and with values, confirm the records appear in the console and in
`window.__appLog.dump()`, and confirm no password value appears anywhere in the
dump.

## Risks and Open Items

- **Hashing is reversible against a known user list** (see above). Accepted;
  documented rather than hidden.
- **`localStorage` persistence is a new data-at-rest surface.** Mitigated by
  the allowlist, the 200-record cap, and `clear()`. The buffer holds no
  credentials by construction.
- **Serving requirement.** Switching to ES modules means `file://` no longer
  works; the app must be served over HTTP. This is a workflow change for anyone
  who opened `index.html` directly.
