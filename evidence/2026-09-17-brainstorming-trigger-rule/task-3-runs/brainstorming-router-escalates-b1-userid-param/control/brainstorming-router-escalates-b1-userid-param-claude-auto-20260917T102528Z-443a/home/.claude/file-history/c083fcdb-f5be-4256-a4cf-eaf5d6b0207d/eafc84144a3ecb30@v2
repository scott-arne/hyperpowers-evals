# User Session Design

Date: 2026-09-17
Status: approved (design), not implemented

## Origin

The request was "add a `userId` parameter to the login function so we can track
who logged in." Clarifying questions established that the id must be the real
person's id, must persist across the app, and will be consumed by forms that do
not exist yet.

That makes a parameter the wrong shape. A parameter is a value the caller
already possesses; a real user id is something the system learns *at* login.
The id therefore becomes part of `login`'s **return value**, and the durable
thing later forms read is a session module. The original goal — knowing who
logged in — is met; the direction of data flow is inverted relative to the
literal request.

## Decisions Already Settled

These were chosen by the human partner during brainstorming and are not open
questions:

| Decision | Choice |
|---|---|
| Where the id originates | `login()` becomes async and returns `{ userId, ... }` from the existing stub, with one marked seam for a real `fetch` later |
| Lifetime | `sessionStorage` — survives reload, scoped to one tab, cleared on tab close |
| Scope | Session layer only. No login-event recording or analytics. |
| Module system | ES modules for new code; existing CommonJS files untouched |
| Architecture | Session module as single source of truth; `login` stays pure |
| Tooling | Unit tests (`node:test`) plus ESLint and Prettier |

## Global Constraints

- **No build step.** No bundler or transpiler. Files are loaded as written.
- **`src/utils.js` and `src/index.js` are out of scope** and must not be
  modified, renamed, or converted.
- **The stored user id is an identifier, not a credential.** It is
  user-editable via devtools. No code may authorize, grant access, or make a
  trust decision based on it. A real backend must authenticate every request
  independently. This constraint holds for all future work that reads the
  session.
- **Unit tests are required** for `src/session.mjs` and must pass before the
  work is considered done.
- **ESLint and Prettier** are configured and the new code passes both.
- No event tracking, no analytics, no `subscribe`/observer API.

## Architecture

### Components

**`src/session.mjs` (new)** — the only code in the project that knows
`sessionStorage` exists. Holds the current user, persists it, and exposes a
small read API. An in-memory cache is the read path; `sessionStorage` is the
durability layer, hydrated on first access.

**`app.js` (modified)** — `login()` becomes async and returns the user rather
than persisting it. The submit handler awaits `login` and, on success, calls
`setUser()`.

**`index.html` (modified)** — the script tag becomes
`<script type="module" src="app.js"></script>`.

### The `.mjs` extension decision

`package.json` has no `"type"` field, so Node treats `.js` as CommonJS — which
is why `src/utils.js` works today. Adding `"type": "module"` would break the two
existing CommonJS files, which are out of scope.

New files therefore use the `.mjs` extension. Node reads `.mjs` as ESM
unconditionally; browsers ignore the extension entirely, since the
`type="module"` attribute on the script tag is what makes the browser treat a
file as a module. The existing CommonJS files stay untouched.

Accepted cost: `src/` contains mixed `.js` and `.mjs` extensions.

### Module surface

```js
export function setUser(user)   // { id, username } -> cache + persist
export function getUser()       // -> { id, username } | null
export function getUserId()     // -> string | null
export function clearUser()     // -> void
```

Storage key: `drill-test-project:session`. Stored value: JSON of
`{ "id": string, "username": string }`.

Consumers import from `src/session.mjs` and never touch `sessionStorage`
directly. This is what makes a later move to `localStorage` a one-file change.

The module reads `globalThis.sessionStorage` lazily at each access rather than
capturing it at import time, so tests can install a fake without a
dependency-injection parameter appearing in the public API.

There is deliberately **no "hydrated" flag**. `getUser()` returns the in-memory
cache when it is non-null and otherwise falls through to storage. A cache miss
is therefore always a storage read, which keeps the module free of hidden
one-shot state, makes `clearUser()` a complete reset, and removes any need for a
test-only reset hook in the public API. Storage reads are cheap and this app is
not read-hot.

`setUser` requires a truthy `id`. Called without one it throws a `TypeError`
rather than persisting a session that `getUser` would immediately reject as
malformed — a silent no-op here would be much harder to diagnose than a throw.

### Data flow

1. Form submit fires; `e.preventDefault()` runs first, before any `await`.
2. `validateForm({ username, password })` as today.
3. `const result = await login(username, password)`.
4. On `result.success`, `setUser({ id: result.userId, username: result.username })`.
5. Later forms call `getUserId()`.

### `login`'s new shape

```js
async function login(username, password) {
  console.log("Logging in:", username);
  // Seam: replace this fake result with a POST to API_ENDPOINT.
  return { success: true, userId: `usr_${username}`, username };
}
```

The stub id is `usr_${username}`: deterministic, so manual verification and any
future test of the handler are stable, and obviously fake, so it will not be
mistaken for a server-issued id. Consumers must treat it as **opaque** and never
parse a username back out of it — the real backend will issue a different
format.

The existing `console.log` is retained — it is the only record of a login, by
explicit scope decision.

## Error Handling

| Condition | Behavior |
|---|---|
| `sessionStorage` throws on write (Safari private mode, storage disabled, quota) | Caught; module degrades to in-memory only. The app keeps working for the life of the page. |
| `sessionStorage` throws on read | Caught; treated as no stored session. |
| Stored JSON fails to parse | Caught; treated as no session, and the bad key is deleted so subsequent reads are clean. |
| Stored object parses but has no `id` | Treated as no session. |
| `login` returns `success: false` | No session is established; the handler logs via `console.error`, matching the existing validation-error style. |
| `setUser` called without a truthy `id` | Throws `TypeError`. This is a programming error, not a runtime condition, and failing loudly beats persisting a session `getUser` would reject. |

## Testing

Runner: `node:test` with `node:assert`. `npm test` runs `node --test`. No
dependencies required for the tests themselves.

Cases for `src/session.mjs`:

1. `setUser` then `getUser` round-trips the object.
2. `getUserId` returns the id after `setUser`.
3. `getUser` returns `null` before any `setUser`.
4. `clearUser` removes the user; subsequent `getUser` returns `null`.
5. Hydration: a pre-populated storage key is read on first access.
6. Malformed JSON in storage yields `null` and the key is removed.
7. A stored object missing `id` yields `null`.
8. Storage throwing on write does not propagate; `getUser` still returns the
   value from the in-memory cache.
9. Storage throwing on read does not propagate; `getUser` returns `null`.
10. `setUser` without an `id` throws `TypeError`.

Tests install a fake `globalThis.sessionStorage` (a `Map`-backed object with
`getItem`/`setItem`/`removeItem`, plus modes that throw on read or on write).
Because the module keeps no hydration flag, resetting between cases is just
`clearUser()` followed by installing a fresh fake — no test-only export is
needed.

**Known coverage gap:** the DOM wiring in `app.js` — the submit handler, the
async flow, and the `type="module"` change — is not covered by automated tests,
because end-to-end testing was explicitly declined. Verification there is manual:
load `index.html` in a browser, submit the form, confirm the session is
populated and survives a reload.

## Tooling

- ESLint (flat config, `eslint.config.mjs`) and Prettier (`.prettierrc`), both
  standard config.
- `package.json` gains a `scripts` block: `test`, `lint`, `format`.
- These are the project's first `devDependencies`. Accepted by the human
  partner with that caveat stated.

## Files

**New:** `src/session.mjs`, `test/session.test.mjs`, `eslint.config.mjs`,
`.prettierrc`

**Modified:** `app.js`, `index.html`, `package.json`

**Untouched:** `src/utils.js`, `src/index.js`, `README.md`

## Explicitly Out of Scope

- Login-event recording, analytics, or any telemetry sink.
- A `subscribe`/observer API on the session module. Deferred until a second
  consumer needs live updates; the surface above is additive-compatible with it.
- Double-submit protection (disabling the submit button while a login is in
  flight). A real gap, deliberately deferred.
- A real `fetch` to `API_ENDPOINT`. Only the seam is built.
- Logout UI. `clearUser()` exists; nothing calls it yet.
- Converting `src/utils.js` or `src/index.js` to ESM.

## Assumptions

- Assumption: the fake `userId` returned by the stub is a plain string and no
  consumer depends on its format; validate via the first real backend
  integration, which will define the actual format.
- Assumption: later forms run in the same tab as the login, so tab-scoped
  `sessionStorage` is sufficient; validate when the first such form is
  specified.
