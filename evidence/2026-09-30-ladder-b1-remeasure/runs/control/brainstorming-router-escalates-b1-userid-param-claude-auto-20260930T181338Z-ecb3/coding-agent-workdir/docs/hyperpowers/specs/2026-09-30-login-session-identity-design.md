# Persisted login identity — design

Date: 2026-09-30
Status: awaiting review
Branch: `feature/webapp-enhancement`

## Problem

The original request was "add a `userId` parameter to the login function so we
can track who logged in." Clarification changed the shape of the work twice:

1. The userId is not an input to `login()`. It comes back from the login
   response — identity is what login *establishes*, and the caller has no
   userId to pass (the form collects only username and password).
2. "Track who logged in" means the identity must **persist** and be
   **readable from anywhere in the app**, because forms added later will
   need it.

Point 2 is why this is not a one-line parameter change. The repository has no
storage layer, no shared-module mechanism, and no second form — the structure
the request depends on does not exist yet.

## Current state

```
index.html    one login form (username, password); loads app.js as a classic script
app.js        API_ENDPOINT (declared, never used), login(), validateForm(), submit handler
package.json  no dependencies, no scripts, no "type" field
src/index.js  CommonJS, unrelated to the webapp
src/utils.js  CommonJS, unrelated to the webapp
```

`login()` is a synchronous stub that never calls `API_ENDPOINT`:

```js
function login(username, password) {
  console.log("Logging in:", username);
  return { success: true, user: username };
}
```

There is no `userId` anywhere in the repository, and no linter, formatter, or
test runner.

## Decisions

Each was chosen explicitly during brainstorming.

| Decision | Choice | Why |
|---|---|---|
| Source of userId | Login response | Identity is login's output, not its input. |
| Persistence | `localStorage` | Must survive browser restart and be shared across tabs. |
| Module wiring | ES modules, no bundler | Gives a real testable module without adding the repo's first dependency. |
| `login()` signature | `async` now, stub body | The async signature is the contagious part; pay it once while there is one caller. |
| Decomposition | Single `session` module | Scope is store-and-read; `login()` stays in `app.js`. |
| File extension | `session.mjs` | Node reads `.js` as CommonJS here, and `src/` genuinely is CommonJS. `.mjs` is ESM regardless of `package.json`, so no existing file changes. |
| Tooling | `node --test` unit tests | Zero dependencies; covers the new module. |

## Architecture

### `session.mjs` (new, repository root)

The only module that knows identity is stored at all.

```js
export function setUserId(userId)   // persist the id
export function getUserId()         // return the stored id, or null
```

The storage mechanism and the key name are private to this module. Callers
never read `localStorage` directly — that is what makes a later form a
one-line import instead of a duplicated key string.

### `app.js` (modified)

- Imports `setUserId` from `./session.mjs`.
- `login()` becomes `async` and returns `{ success, user, userId }`.
- The submit handler becomes `async` and awaits `login()`.
- `validateForm()` is unchanged.

### `index.html` (modified)

`<script src="app.js">` becomes `<script type="module" src="app.js">`.

## Data flow

```
submit → validateForm → await login() → response carries userId
       → setUserId(userId) → [forms added later] getUserId()
```

## Data model

One `localStorage` entry:

| Key | Value |
|---|---|
| `app.userId` | the user id string |

Nothing else is stored. **No password and no auth token go into
`localStorage`.** Any script on the origin can read it, so an XSS bug exposes
everything kept there; restricting it to an opaque user identifier bounds that
exposure. This is a deliberate constraint, not an omission, and it applies to
every future addition to this module.

## Stub behavior

`login()` is `async` with no `await` in its body yet. It synthesizes a
deterministic id from the username (`user-<username>`) rather than a random
UUID, so repeated dev logins as the same user produce a stable id. It carries
a `TODO` naming the real `fetch` to `API_ENDPOINT` that will replace the body;
that replacement touches only `login()`.

## Error handling

- **`localStorage` throws.** Safari private mode and quota exhaustion both
  raise. `getUserId()` returns `null`; `setUserId()` logs and swallows. A
  storage failure must never break a login that otherwise succeeded.
- **Login fails.** The handler persists only when
  `result.success && result.userId`, so a failed or malformed login cannot
  leave a stale identity behind. The stub always succeeds, but the real
  `fetch` will not.

## Testing

`node --test`, built into Node, no dependencies. `package.json` gains
`"scripts": { "test": "node --test" }`.

`test/session.test.mjs` installs a fake `localStorage` on `globalThis`, then
dynamically imports the module so the fake is in place first. Cases:

1. `setUserId` then `getUserId` round-trips the value.
2. `getUserId` returns `null` when nothing is stored.
3. `setUserId` does not propagate an exception from a throwing storage.
4. Only the `app.userId` key is written.

**Known coverage limit.** This tests `session.mjs`, not `login()`. `app.js`
calls `document.getElementById` at import time, so it cannot be imported
without a DOM. Testing `login()` would require extracting it into its own
module (approach B during brainstorming), which was considered and declined
for this pass.

## Out of scope

Deferred deliberately; each is cheap to add later on top of this module, and
none changes the interface the other forms use:

- Clear / logout
- Session expiry
- Cross-tab synchronization via the `storage` event
- The real `fetch` to `API_ENDPOINT`
- Linting, formatting, and end-to-end tests

## Operational note

ES module scripts are blocked by CORS on `file://`. After this change,
`index.html` must be opened through a local HTTP server rather than by
double-clicking the file.
