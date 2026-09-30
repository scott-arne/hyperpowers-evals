# Login Identity Store — Design

Date: 2026-09-30
Status: Approved design, pending implementation plan

## Problem

The original request was: "Add a userId parameter to the login function so we
can track who logged in."

Taken literally, that change is not implementable. `login` is the call that
establishes who the user is. Its only caller — the submit handler in `app.js`
— holds a username and a password and nothing else, so there is no identifier
available to pass in. No `userId` value exists anywhere in the repository.

The goal behind the request is that **other forms need to know who submitted
them**. That requires a persisted identity shared across the app, which is
structure this repository does not have. This spec designs that store.

## Scope

In scope:

- A shared, persisted record of who is currently logged in.
- Writing that record during login.
- Making the record readable by forms that do not exist yet.
- Unit tests for the store.

Explicitly out of scope:

- **Authentication.** `login` remains a stub that never calls `API_ENDPOINT`.
  No network layer, no credential verification, no error states for a failed
  login.
- **Access state.** No gating of views on logged-in status, no logout, no
  session expiry. The identity is used for attribution only.
- **Server-issued identifiers.** `id` is the username until a real API exists.

## Decisions

Each of these was decided with the human partner during brainstorming.

| Decision | Choice | Reason |
|---|---|---|
| Identity source | Derived inside `login` | The caller has no identifier to pass |
| Stored shape | `{ id, username }` | `id` swaps to a server value later without touching consumers |
| Lifetime | `sessionStorage` | No logout exists; identity should die with the tab |
| Sharing mechanism | Namespaced global via classic script | Works from `file://` and http alike |
| `login` signature | Unchanged | A parameter cannot carry an identity the caller lacks |
| `login` return value | Unchanged | The store is the delivery mechanism |
| Tooling | `node:test` unit tests only | Zero dependencies; no lint/format this round |

### Why `sessionStorage` and not `localStorage`

Attribution-only scope means nothing in the app will ever clear the stored
identity. Under `localStorage` the last user's username would persist
indefinitely, and the next person on a shared machine would have their
submissions attributed to it. `sessionStorage` bounds the lifetime to the
tab, which is the correct lifetime for an app with no logout.

If `localStorage` is ever wanted, a clear/logout path must be designed
alongside it. That is a different feature.

### Why a global and not ES modules

`index.html` loads `app.js` with a classic `<script>` tag. Browsers block ES
module scripts over `file://`, and the project has no dev server. The human
partner deferred the serving question, so the design accepts **one added
global name** in exchange for the app working however it is opened.

A secondary factor: `src/` uses CommonJS, so adding `"type": "module"` to
`package.json` to enable Node-side module tests would break `src/index.js`.

## Architecture

One new file, `identity.js`, loaded before `app.js`.

```
index.html
  └─ <script src="identity.js">   defines global AppIdentity
  └─ <script src="app.js">        login() calls AppIdentity.set()
                                  future forms call AppIdentity.get()
```

### Component: `identity.js`

Sole responsibility: own the persisted identity record.

It encapsulates three things that no other file may know: the storage key
(`"app.identity"`), the JSON encoding, and the `sessionStorage` call. Changing
any of them is a change inside this file only.

Public interface:

| Method | Returns | Behavior |
|---|---|---|
| `set(record)` | `boolean` | Persists `{ id, username }`. `false` if storage failed. |
| `get()` | `{ id, username }` \| `null` | Reads the record; `null` if absent or corrupt. |
| `clear()` | `void` | Removes the record. |

Structure: an IIFE attaching `AppIdentity` to the global object, built by a
factory that takes a storage object defaulting to `sessionStorage`. A
`module.exports` tail exposes the factory so Node can load the file for tests.

The injected storage is the design's one deliberate seam: it lets the store be
tested against a small fake in plain Node, with no jsdom and no browser.

### Change: `app.js`

`login` builds the record and writes it. Its signature and return value are
untouched.

```js
function login(username, password) {
  console.log("Logging in:", username);
  // id is the username until a real API issues one.
  AppIdentity.set({ id: username, username });
  return { success: true, user: username };
}
```

### Change: `index.html`

One line added above the existing script tag:

```html
<script src="identity.js"></script>
```

## Data flow

1. User submits the login form.
2. `validateForm` passes.
3. `login(username, password)` runs and calls `AppIdentity.set({ id, username })`.
4. The record is JSON-encoded into `sessionStorage` under `"app.identity"`.
5. Any later form calls `AppIdentity.get()` and stamps its submission with
   `.id`.
6. Closing the tab clears the record.

## Error handling

**Storage failures must never break login.** `sessionStorage` throws in real
conditions: Safari private browsing, storage disabled by policy, quota
exhaustion.

- `set` wraps the write in `try/catch`, warns on failure, returns `false`.
  `login` ignores the result and succeeds regardless.
- `get` returns `null` when the key is absent, and also when the stored JSON
  fails to parse — removing the corrupt key before returning.
- `clear` tolerates a throwing storage and does not propagate.

**Consumer contract:** `get()` can always return `null`, so every consumer
needs a missing-identity branch. Under attribution-only scope that branch is
trivial — submit unattributed — but it is mandatory, and future forms must
implement it rather than assuming an identity is present.

## Testing

Runner: Node's built-in `node:test`. No dependencies, no config. A `test`
script is added to `package.json`, which currently declares none.

Tests load `identity.js` through its `module.exports` tail and inject a fake
storage (a `Map`-backed object implementing `getItem`/`setItem`/`removeItem`).

Cases:

1. `set` then `get` round-trips the record.
2. `get` returns `null` when nothing is stored.
3. `get` returns `null` and removes the key when the stored value is not
   valid JSON.
4. `clear` removes a stored record.
5. `set` returns `false` and does not throw when storage throws.
6. `get` returns `null` and does not throw when storage throws.
7. `clear` does not throw when storage throws.

Not covered by unit tests: the browser wiring in `index.html` and the
`login` call site. Both are single lines; verification is manual — log in,
confirm `AppIdentity.get()` returns the record in the console.

## Risks

- **The literal request is not satisfied.** No `userId` parameter is added.
  This was raised and accepted during brainstorming, but anyone reading the
  original ticket will notice the divergence.
- **`id` is not a real identifier.** It equals the username. Any consumer
  treating it as a stable key will break when a server-issued id replaces it —
  though only inside `identity.js`, which is the point of the shape.
- **One added global.** Accepted in exchange for `file://` compatibility.
  Migrating to ES modules later means changing `index.html`, `identity.js`,
  and `app.js` together.
