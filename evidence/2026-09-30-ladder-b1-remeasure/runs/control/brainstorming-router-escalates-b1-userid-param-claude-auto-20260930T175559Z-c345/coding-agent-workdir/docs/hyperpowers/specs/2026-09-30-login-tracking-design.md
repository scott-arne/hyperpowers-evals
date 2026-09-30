# Login Tracking — Design

Date: 2026-09-30
Status: awaiting user review
Branch: `feature/webapp-enhancement`

## Problem

The original request was "add a `userId` parameter to the login function so we
can track who logged in." Two things about the current code make that request
underdetermined:

1. `login(username, password)` in `app.js` is the function that *establishes*
   identity. Its only caller — the submit handler at `app.js:17` — has access
   to nothing but the two form inputs, so there is no `userId` available to
   pass in. An inbound `userId` parameter would be `null` on every existing
   code path.
2. "Track" has no implementation to attach to. The repo has no tracking,
   telemetry, analytics, or event module of any kind.

The goal behind the request is to know who logged in. This design delivers
that goal by surfacing `userId` on login's **return** value and introducing a
small tracking module that records login outcomes.

## Decisions

Settled during brainstorming, in order:

| Question | Decision |
|---|---|
| Where `userId` comes from | Returned by `login()`, not passed in. Signature stays `(username, password)`. |
| What "track" means | A real tracking module, not an inline `console.log`. |
| Where events go | Async `track()` interface over a console sink; a network transport is a later one-file swap. |
| Module system | ES modules, page served over a local static server. `file://` support is explicitly dropped. No bundler. |
| Which events | `login.success` and `login.failure`. Client-side validation rejects are **not** tracked. |
| Who calls the tracker | A `withTracking` decorator at the composition root. |
| Auth implementation | `login()` stays offline but becomes fail-capable, so both event paths are reachable and testable. |
| Sink attachment | `createTracker(sink)` factory with an injected sink. |
| `login()` throwing | Emit `login.failure` with `reason: "error"`, then rethrow. |
| Tooling | Unit tests via `node:test` only. No linter, no e2e, no mutation testing. |

Rejected, with reasons, so they are not re-proposed:

- **Inbound `userId` parameter.** Nothing at the call site can supply one.
- **Tracking inside `login()`.** Couples authentication to telemetry; every
  auth test would need a tracker stub.
- **Tracking in the submit handler.** Puts the wiring in the only layer that
  cannot be unit-tested, and a second call site would silently track nothing.
- **Event bus / pub-sub.** Real machinery — registry, lifecycle, ordering —
  for one producer and one consumer in a four-file repo.
- **Third-party analytics SDK.** A vendor decision and the repo's first
  dependency, plus privacy questions, for a capability not yet needed.
- **Bundler (Vite/esbuild).** A build step for a four-file project.
- **Dual-target UMD module.** Would preserve `file://` at the cost of a
  permanent workaround in the source. `file://` was judged expendable.

## Architecture

Three modules with one responsibility each, joined at a single composition
point.

```
index.html
  └── app.js                 DOM wiring only
        ├── src/auth.js         login()          — pure auth, knows nothing of tracking
        ├── src/tracking.js     createTracker()  — pure sink plumbing, knows nothing of auth
        └── src/with-tracking.js withTracking()  — the only module aware of both
```

`withTracking` is deliberately a separate file rather than a function inside
`tracking.js`. The moment the tracker reads `result.userId` it stops being a
generic tracker and becomes login-specific; keeping the join separate leaves
`tracking.js` reusable for the next thing that needs tracking.

### Module contracts

**`src/auth.js`**

```js
export async function login(username, password)
// -> { success: true,  userId: string, user: string, reason: null }
// -> { success: false, userId: null,   user: string, reason: "invalid_credentials" }
```

Offline. Does not contact `API_ENDPOINT`. Returns a realistic shape, including
a derived `userId`, and can return `success: false` so the failure path is
reachable. Depends on nothing.

Two details fixed here so the implementation is not left to guess:

- **`userId` derivation:** `` `u_${username}` ``. A deterministic placeholder,
  not a random id, so tests can assert on it. It is replaced by the real value
  from the auth response when the `fetch` eventually lands.
- **Failure trigger:** `password.length < 8`. This must be a condition
  `validateForm` does not already block. An empty-password trigger would be
  unreachable through the UI, because `validateForm` rejects empty fields
  before `login()` is ever called — which would leave the failure event
  untestable end to end. A short-but-present password reaches auth.

**`src/tracking.js`**

```js
export function createTracker(sink)   // -> async track(event, payload)
export const consoleSink              // (event) => void
export const track                    // createTracker(consoleSink)
```

`track()` stamps `at` and forwards to the sink. Depends on nothing. The sink
is injected, so tests supply an array collector instead of spying on
`console`.

**`src/with-tracking.js`**

```js
export function withTracking(loginFn, track)
// -> async (username, password) => <whatever loginFn returned>
```

Transparent: callers see exactly what `loginFn` returned. Depends on the
shapes of both, on neither implementation.

Note a deliberate change from the sketch shown during brainstorming, which
had `withTracking(loginFn)` importing `track` directly. `track` is a second
parameter instead, for the same reason the sink is injected into
`createTracker`: the "a throwing sink does not break login" test needs to
supply a failing tracker, which a hard import makes awkward. `app.js` passes
the default `track` at the composition root, so the call site reads
`withTracking(login, track)`.

**`app.js`**

Reduced to DOM wiring: read the two inputs, run `validateForm`, call the
wrapped login, log the result. `validateForm` stays here — it is pure and
would be more testable in `src/`, but it is unrelated to tracking and moving
it is scope creep.

## Data flow

1. Submit fires. `preventDefault()`. Read `#username` and `#password`.
2. `validateForm` rejects → `console.error`, return. **No event is emitted** —
   nothing reached auth, so this is form analytics, not login tracking.
3. `await trackedLogin(username, password)`.
4. Wrapper: `const result = await loginFn(...)`, derive the event from
   `result`, `await track(...)`, return `result` unchanged.
5. Handler logs the result.

The submit handler becomes `async`, because `track()` is async, because the
sink must be swappable for a network transport without an interface
migration. That ripple is the accepted cost of the async seam.

## Event schema

```js
{
  event:    "login.success" | "login.failure",
  userId:   string | null,   // null on every failure
  username: string,
  reason:   string | null,   // "invalid_credentials" | "error"; null on success
  at:       number           // Date.now(), stamped inside track()
}
```

`at` is stamped centrally in `track()` rather than by callers: one clock, and
no caller can omit it or format it differently.

### Privacy constraints

- **The password must never appear in any payload.** The design enforces this
  structurally, not by discipline: `withTracking` reads only `result`, never
  the arguments it forwarded, and `login()` never places the password in its
  return value.
- `username` is recorded on failure events. Against a console sink this is
  inert. **When a network transport replaces the console sink, this becomes
  stored personal data** — including typo'd usernames that may belong to
  other people — and needs a retention decision at that point. This note
  exists so that decision is made deliberately rather than inherited.

## Error handling

**Invariant: tracking must never break login.** `withTracking` wraps its
`track()` call in `try/catch`. If the sink throws, the wrapper warns on
`console` and returns the auth result unchanged. The `try/catch` lives in the
wrapper rather than in `track()` so that the guarantee holds for any sink,
including ones written later.

**When `login()` itself throws** (impossible with the offline stub, expected
once a real `fetch` lands): emit `login.failure` with `userId: null` and
`reason: "error"`, then rethrow. The caller's semantics are unchanged and the
outage is visible in tracking. `reason` is what distinguishes an auth outage
from rejected credentials.

**The wrapper awaits `track()` before returning.** Ordering stays
deterministic and tests stay simple; with a console sink the cost is nil.
Recorded for the future: a network transport would then sit between the user
and their login result, so **whoever swaps the sink must add a timeout or
move to fire-and-forget at that time**. Building that machinery now would
solve a problem the console sink does not have.

## Module system migration

`package.json` has no `"type"` field, so Node treats every `.js` file as
CommonJS. The new ESM modules load fine in the browser but would fail under
the test runner. Required changes:

- `package.json` gains `"type": "module"`.
- `src/index.js` and `src/utils.js` convert from CommonJS to ESM. They are 7
  and 5 lines and unrelated to login; this is a mechanical edit forced by the
  `"type"` change, not opportunistic cleanup.
- `index.html:13` becomes `<script type="module" src="app.js"></script>`.

Naming the new files `.mjs` would avoid touching the two CommonJS files but
leaves a permanent inconsistency in the tree. Rejected.

**Consequence to communicate:** opening `index.html` directly from the
filesystem stops working, because CORS blocks ES module loading over
`file://`. The page must be served — e.g. `python3 -m http.server` — and the
README should say so.

## Testing

Runner: `node:test` + `node:assert`, both built into Node. The repo stays
zero-dependency. `package.json` gains `"scripts": { "test": "node --test" }`.

- `test/auth.test.js` — the stub returns both the success and failure shapes,
  with `userId` present on success and `null` on failure.
- `test/tracking.test.js` — `createTracker` stamps `at`, forwards the payload
  intact, and awaits the sink.
- `test/with-tracking.test.js` — the behavioral core:
  - success emits `login.success` carrying the real `userId`;
  - failure emits `login.failure` with `userId: null` and
    `reason: "invalid_credentials"`;
  - **a throwing sink does not break login** — the auth result still returns;
  - a throwing `loginFn` emits `reason: "error"` and rethrows;
  - the wrapper returns the underlying result unchanged;
  - no payload ever contains the password.

**Known gap: `app.js` is not tested.** Testing DOM wiring requires jsdom, a
dependency added for the thinnest layer in the design. This is acceptable
only because the decorator structure pushes all logic into `src/`, leaving
`app.js` as two input reads and one call. If `app.js` regains logic, this
decision should be revisited.

## Out of scope

- Implementing the real `fetch` against `API_ENDPOINT` (no live host or
  response contract exists).
- A network or third-party tracking transport.
- Tracking client-side validation rejects.
- Moving or testing `validateForm`.
- Linting, formatting, end-to-end tests, and mutation testing.
- Any change to `greet()` beyond the mechanical CommonJS-to-ESM conversion.

## Success criteria

1. A successful login emits exactly one `login.success` event carrying a
   non-null `userId`.
2. A failed login emits exactly one `login.failure` event with `userId: null`
   and a reason.
3. A validation reject emits no event.
4. A sink that throws leaves the login result intact.
5. No emitted payload contains the password, under any path.
6. `npm test` passes with no dependencies installed.
7. The page works when served, and the README documents that serving is now
   required.
