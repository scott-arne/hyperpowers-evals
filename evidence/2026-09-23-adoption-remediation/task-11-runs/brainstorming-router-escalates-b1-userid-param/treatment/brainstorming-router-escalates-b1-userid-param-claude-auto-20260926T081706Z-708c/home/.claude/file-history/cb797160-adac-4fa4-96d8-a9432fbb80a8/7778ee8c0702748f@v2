# Login Session Identity — Design

Date: 2026-09-26
Status: Awaiting review

## Problem

The request was "add a `userId` parameter to the login function so we can track
who logged in." Clarification changed the shape of the work:

- The `userId` is assigned by the server, so it arrives in the login
  *response*, not in the caller's arguments. **`login()` does not gain a
  parameter.** Adding one would require the caller to invent a value it cannot
  know.
- "Track" means the identity must persist and be readable across the whole app,
  because forms that do not exist yet will need it.

So the deliverable is not a signature change. It is a small, tab-scoped
identity store plus the module boundary that lets future forms read it.

## Decisions

| Question | Decision |
|---|---|
| Source of `userId` | Server returns it in the login response |
| Persistence | Tab session — `sessionStorage`; survives reload, dies with the tab |
| Trust level | **Label only.** Logging and form payloads. Never authorization |
| Module system | Native ES modules. No bundler, no build step |
| `login()` / store relationship | `login()` stays pure; the caller stores |
| Tooling | Vitest, ESLint, Prettier |

## Current state

`app.js` is a single flat script of global functions loaded by
`<script src="app.js">`. `login(username, password)` is a stub at `app.js:4`
that logs the username and returns `{ success: true, user: username }`; it never
calls `API_ENDPOINT`. It has exactly one call site, `app.js:23`.

`src/index.js` and `src/utils.js` are an unrelated CommonJS `greet` demo that
`index.html` never loads. **They are out of scope and must not be modified.**

There is no build, no test runner, no linter, no `.gitignore`, and no logout.

## Architecture

Three modules replace the one flat script:

- **`session.js`** — the identity store. Owns `sessionStorage`; knows nothing
  about auth or the DOM.
- **`auth.js`** — `login()` and `validateForm()`, moved from `app.js` with
  behavior unchanged. No storage, no DOM, no imports.
- **`app.js`** — the entry point. Imports the other two, wires the submit
  handler. The only file that touches the DOM.

`index.html` changes its script tag to `<script type="module" src="app.js">`.

The direction of dependency is one-way: `app.js` → {`auth.js`, `session.js`}.
`auth.js` and `session.js` do not know about each other. That is what keeps
`login()` testable without a storage stub, and `session.js` testable without a
browser.

### `session.js` API

```js
createSessionStore(storage)   // factory; tests pass a plain object
getUser()                     // -> { userId, username, loggedInAt } | null
setUser({ userId, username }) // stores; stamps loggedInAt
clearUser()
```

The module exports the factory plus a default instance bound to
`globalThis.sessionStorage`, resolved at call time rather than at import time so
importing the module under Node does not throw.

Storage key: `app.session`. Value: JSON `{ userId, username, loggedInAt }`.

`clearUser()` ships with no caller. The app has no logout; closing the tab is
the only exit today. It is part of the API because a store with no clear path
is a latent bug, but **building a logout UI is out of scope.**

### Data flow

1. Submit handler reads `username` and `password` from the form.
2. `validateForm()` gates as it does today.
3. `login(username, password)` — signature unchanged — returns
   `{ success, userId, username }`. It remains a stub returning a fake
   `userId`; making the request real is separate work.
4. On success, the handler calls `session.setUser({ userId, username })` and
   logs the `userId`.

## Error handling

Three failure modes that currently have no answer:

- **`sessionStorage` throws** (Safari private browsing, quota exceeded). A
  failed store must not fail the login. Catch, warn, and continue — the user is
  logged in for this page even though nothing persisted.
- **Corrupt JSON on read.** `getUser()` returns `null` and clears the key,
  rather than throwing on every page load until storage is cleared by hand.
- **Response missing `userId`.** Refuse to store a partial identity rather than
  persisting `undefined`.

## Security constraint

The stored identity is a label. The server authenticates every request through
its own mechanism.

**Nothing may read `getUser()` to decide what a user is allowed to see or do.**
`sessionStorage` is readable and writable by any script on the page, so a value
trusted for authorization is a value a user can edit to become someone else.
This constraint applies to every future consumer, not just the login flow.

If a credential is introduced later, it belongs in an httpOnly cookie set by
the server, not in this store.

## Testing

Vitest. `session.js` is tested through `createSessionStore(fakeStorage)` with a
plain object, so no jsdom is required.

- `session.js`: set/get/clear round trip; corrupt JSON returns `null` and
  clears the key; a throwing storage does not propagate; a payload missing
  `userId` is rejected.
- `auth.js`: `login()` returns `userId` and `username` and keeps its two-argument
  signature; `validateForm()` retains its current behavior (currently untested).

## Tooling

Vitest, ESLint, Prettier, with `test`, `lint`, and `format` scripts, plus a
`.gitignore` for `node_modules`.

`"type": "module"` must **not** be added to `package.json`. It is the obvious
way to enable ESM and it would break `src/index.js` and `src/utils.js`, which
use `require`. Vitest resolves ESM without it; browsers ignore `package.json`.

## Consequences

- Opening `index.html` from a `file://` URL stops working — module scripts need
  a real origin. Serve the directory (`npx serve .`, `python3 -m http.server`).
  This is the one user-visible regression.
- The repo gains npm dependencies, having had none.

## Assumptions

- Assumption: the real login API returns a stable, server-assigned `userId`
  field; validate via the API contract when the stub becomes a real request.

## Out of scope

- Making `login()` issue a real request to `API_ENDPOINT`.
- A logout control.
- Any change to `src/index.js` or `src/utils.js`.
- Any second form. The store is built so they can read it; none are built here.
