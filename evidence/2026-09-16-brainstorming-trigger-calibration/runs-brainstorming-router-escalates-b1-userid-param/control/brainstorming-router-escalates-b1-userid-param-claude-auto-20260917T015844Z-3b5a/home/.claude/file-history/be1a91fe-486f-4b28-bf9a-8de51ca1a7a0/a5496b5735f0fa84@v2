# Client Identity Tracking — Design

Date: 2026-09-16
Status: Approved in brainstorming; awaiting user review before planning

## Problem

The request that started this work was "add a `userId` parameter to the login
function so we can track who logged in." Investigation showed the literal change
was not implementable as stated: `login()` in `app.js` has one call site, the
form submit handler, and that handler holds only the username and password read
from the DOM. No user ID exists anywhere in the repository, so the parameter
would have been `undefined` at every call.

The underlying need, as clarified, is broader than one signature: an identity
value that works across the app, persists across visits, and can be consumed by
forms that do not exist yet. That makes this a new subsystem rather than a
one-line change.

## Goals

- A persistent, anonymous device identifier available anywhere in the app.
- An account identifier linked to that device once a login succeeds.
- Event emission that carries both identifiers, behind an interface that a real
  transport can replace without touching call sites.
- Reusable by future forms without each one reimplementing identity.

## Non-goals

- Real authentication, sessions, or tokens. `login()` remains a stub.
- A network transport for events. Console output only, behind the interface.
- A third-party analytics vendor.
- A build step, bundler, or transpiler.
- Cross-device or server-side identity correlation.

## Decisions

Each of these was chosen explicitly during brainstorming; the rejected
alternatives are recorded because they are the ones likely to be revisited.

| Decision | Chosen | Rejected alternatives |
|---|---|---|
| What the ID identifies | Anonymous device ID, linked to an account ID after login | Account-only (nothing before login); device-only (no real attribution) |
| Event destination | `console`, behind a swappable interface | Own backend POST; third-party SDK |
| Device ID storage | `localStorage` | Cookie (consent obligations, per-request overhead); `sessionStorage` (per-tab, breaks "persists") |
| Account ID storage | In memory, for the page's lifetime | `localStorage` / `sessionStorage` — both assert an identity claim that no token or server backs, and mislabel the next user of a shared browser |
| Module delivery | Dual-format: CommonJS with a global-attach footer | Global-only script (untestable under Node); native ES modules (requires a dev server, breaks `file://`); bundler (build step unjustified for one module) |
| `login()` signature | Unchanged, two parameters | Adding the requested `userId` third parameter — no caller can supply one |
| Tooling | Unit tests via `node --test` | ESLint + Prettier; Playwright e2e |

### Why `login()` does not gain a `userId` parameter

This is a deliberate departure from the original request, approved during
design. The device ID is available from the tracking module directly, so passing
it in would be redundant; the account ID only exists after the server answers,
so it cannot be passed in at all. `login()` therefore keeps
`login(username, password)` and calls the tracking module itself on success.

## Architecture

### New file: `tracking.js` (repo root, beside `app.js`)

One responsibility: own the two identity values and emit events. It touches no
DOM and knows nothing about forms, so every future form depends on the same
small surface.

```js
Tracking.getDeviceId()         // string; generates + persists on first call
Tracking.getAccountId()        // string | null
Tracking.identify(accountId)   // link this account to this device
Tracking.reset()               // logout: drop the account link, keep the device ID
Tracking.track(event, props)   // emit, with both IDs attached automatically
```

`track()` is the extension seam. It currently writes a structured object to the
console; replacing that body with a backend POST or an analytics SDK call is a
change inside one function, with no call site modified.

The file is written as CommonJS and ends with a short footer that attaches
`window.Tracking` when `module.exports` is absent. This gives script-tag loading
in the browser and `require()` in Node tests without a build step.

### Changed files

- `index.html` — one `<script src="tracking.js"></script>` before the existing
  `app.js` tag. Load order matters: `app.js` uses `Tracking` at submit time.
- `app.js` — `login()` calls `Tracking.identify()` and `Tracking.track()` on
  success; the existing validation-failure branch emits an event.
- `package.json` — add `"scripts": { "test": "node --test" }`.

## Data flow

Page load: nothing happens. The device ID is generated lazily on first read, so
a visitor who never interacts is never assigned one.

Form submit (`app.js`):

1. `validateForm({ username, password })`
2. On invalid: `Tracking.track("login_validation_error", { error })`, then the
   existing `console.error`. This branch is where the device ID earns its keep —
   it is the only way to see repeated failed attempts from one browser.
3. On valid: `login(username, password)`
4. Inside `login()`, on success: `Tracking.identify(<account id>)` then
   `Tracking.track("login_success", { username })`
5. `login()` returns its result to the handler as it does today.

## Identity lifecycle

**Device ID.** Generated on first read via `crypto.randomUUID()`, falling back
to a `crypto.getRandomValues()`-based UUIDv4 where `randomUUID` is unavailable.
Persisted under the versioned key `tracking.deviceId.v1`; the version suffix
allows a future format change without inheriting unparseable values. On read,
any value that is not a string matching the canonical 36-character UUID pattern
is treated as absent and regenerated.

**Account ID.** Held in a module-level variable. Set by `identify()`, cleared by
`reset()`, and gone when the page unloads. Re-established at each login.

**Logout.** `reset()` clears the account link and leaves the device ID in place,
so a returning visitor is still recognized as the same browser. No logout UI
exists today; the function exists so that when one is added it cannot leave a
stale identity attached to subsequent events.

## Error handling

The governing rule: **tracking can never break a login.**

- `localStorage` throws outright in Safari private mode and when storage is
  disabled by policy. Every read and write is wrapped. On failure the module
  falls back to a per-page in-memory device ID and warns once, not on every
  call.
- The `identify()` and `track()` calls at the login site are wrapped so a throw
  inside tracking cannot prevent `login()` from returning its result. An
  analytics bug should cost data, not sign-ins.
- A corrupt or empty stored device ID is discarded and regenerated rather than
  propagated.
- `track()` tolerates a null account ID, which is the normal state before any
  login.

## Testing

Runner: Node's built-in `node:test` and `node:assert`, invoked with
`node --test`. Zero dependencies, preserving the repo's current dependency-free
state. `tracking.js` is `require()`-able because of the dual-format footer, so
no DOM shim is needed. Tests substitute a fake `globalThis.localStorage` — a
small object literal — which also makes the throwing-storage cases directly
simulable.

Tests are written before the module, per the repo's TDD practice.

Cases:

- first `getDeviceId()` generates and persists; a second call returns the same
  value
- a corrupt or empty stored value is discarded and regenerated
- storage that throws on read falls back to a stable in-memory ID
- storage that throws on write falls back to a stable in-memory ID
- `identify()` links the account ID; `getAccountId()` returns it
- `reset()` clears the account link and leaves the device ID intact
- `track()` attaches both IDs to the emitted payload
- `track()` tolerates a null account ID
- a throw inside tracking does not prevent `login()` from returning its result

The DOM wiring in `app.js` is left untested: it is a submit handler with no
logic that justifies a browser harness.

## Assumptions

- Assumption: the stub `login()` returns `{ success, user }` with no identifier,
  so `identify()` receives the username as a stand-in account ID until a real
  API response supplies one. Validate via the API contract for `API_ENDPOINT`
  when the real endpoint is implemented; the stand-in is confined to the one
  call inside `login()`.
- Assumption: the app will continue to be opened directly from disk or served
  statically, with no bundler introduced. Validate via the module-delivery
  choice above — if a bundler arrives, native ES modules become the better
  shape and the dual-format footer can be dropped.

## Open questions deferred by design

- Which real transport `track()` eventually calls, and its failure policy
  (retry, queue, or drop).
- Whether the device ID needs to become server-visible, which would reopen the
  cookie decision.
- Consent and privacy controls, if the device ID is ever sent off-device.
