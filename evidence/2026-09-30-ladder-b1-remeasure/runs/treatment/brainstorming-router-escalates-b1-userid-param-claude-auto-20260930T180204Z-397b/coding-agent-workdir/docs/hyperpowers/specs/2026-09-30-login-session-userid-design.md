# Login Session userId — Design

Date: 2026-09-30
Status: Approved (design); spec pending user review

## Problem

The app has no way to know who is logged in after `login` returns. The
original request was to "add a userId parameter to the login function so we
can track who logged in", but `login` is the call that *establishes* identity:
its only caller is the form submit handler, which holds nothing but the
username and password typed into the form. A caller-supplied `userId` would
therefore be a value the caller invented, tracking nothing real.

The identity information flows the other way — out of `login`, not into it.
The follow-up requirement ("it should work across the app and persist; other
forms will need it later") means that value also has to outlive the call that
produced it and be readable by code that does not exist yet.

## Decisions

Settled with the human partner during brainstorming:

| Question | Decision |
|---|---|
| Direction of the userId | `login` **returns** it; it is not a parameter |
| What consumers do with it | **Shared app state** — forms read it to drive behavior, not only to log it |
| Persistence | **Per-tab `sessionStorage`** — survives reload and navigation, clears when the tab closes |
| Module loading | **Classic `<script>` + one namespaced global** (ES modules rejected: they break `file://`) |
| Structure | **Dedicated session module**, rather than a bare storage-key convention or a pub/sub session |
| Tooling | **Unit tests via built-in `node:test`**; no linter for now |

Rejected alternatives and why:

- **Caller-supplied `userId`.** The caller has no such value. Minting one
  client-side yields a correlation ID, not a user identity; naming it `userId`
  would mislead the next reader.
- **`localStorage`.** The app has no logout, so a per-browser value would never
  be cleared — on a shared machine the previous user's id would still be there.
  Revisit only together with a real logout.
- **Bare storage-key convention (no module).** Duplicates the key string at
  every call site, where a typo fails silently as "logged out", and forces each
  consumer to invent its own missing-value handling.
- **Session with subscriptions.** No second form and no logout exist, so there
  is no subscriber to serve. `subscribe` can be added to this design later
  without breaking any caller.

## Architecture

Three files; one is new.

### `session.js` (new)

An IIFE attaching a single global, `AppSession`. It is the **only** code in the
app that knows the storage key or touches `sessionStorage`. Consumers never
read storage directly.

Public interface:

- `setUser(userId)` — record the logged-in user.
- `getUserId()` — the current user id as a string, or `null` if nobody is
  logged in.
- `isLoggedIn()` — `getUserId() !== null`.
- `clear()` — forget the current user. Unused today; it is the seam a future
  logout attaches to.

Internals:

- `STORAGE_KEY = "app.userId"` — defined once, here.
- `cachedUserId` — in-memory mirror of the stored value.

Writes go to both the cache and `sessionStorage`. Reads prefer the cache and
fall back to storage; that fallback is what rehydrates the value after a page
reload, when the cache starts empty. A successful fallback read **populates the
cache**, so storage is touched at most once per page load.

The file also ends with a CommonJS export guard so the module can be unit
tested under Node:

```js
if (typeof module !== "undefined") { module.exports = AppSession; }
```

This changes nothing about how the browser loads the file as a classic script.

### `app.js` (changed)

- `login(username, password)` returns `{ success, userId, username }`.
- The `user` field is renamed to `username`. Carrying both `user` (a name) and
  `userId` in one object invites exactly the confusion this design exists to
  avoid. The single caller only logs the whole object and never reads `.user`,
  so no behavior depends on the old name.
- The stub synthesizes the userId as `` `stub-${username}` ``, prefixed so it
  is visibly not a real identifier, with a comment recording that the server
  supplies this value once `API_ENDPOINT` is live. Replacing the stub with the
  real API changes this function body only; `AppSession` and every consumer are
  untouched.
- The submit handler calls `AppSession.setUser(result.userId)` **only when
  `result.success` is true**.

### `index.html` (changed)

Add `<script src="session.js"></script>` **before** `<script src="app.js">`.
The submit handler needs `AppSession` to exist at submit time.

## Data flow

```
submit
  → validateForm({ username, password })
  → login(username, password)
      ↓ { success: true, userId, username }
  → AppSession.setUser(userId)
      ↓
    cachedUserId  +  sessionStorage["app.userId"]

later form
  → AppSession.getUserId()
      → cachedUserId, else sessionStorage, else null
```

## Error handling

| Case | Behavior |
|---|---|
| `sessionStorage` throws on write | Caught. In-memory cache is still set; one `console.warn`. Login still succeeds; the value simply does not survive a reload. |
| `sessionStorage` throws on read | Caught. Returns the cache if present, otherwise `null`. |
| `login` returns `success: false` | Session left untouched. Existing `console.error` path in the handler is unchanged. Unreachable while `login` is a stub; implemented correctly regardless. |
| `setUser(null)` / `setUser("")` | Rejected with a `console.warn`; nothing is written. Storing a garbage value such as the string `"undefined"` would read back as a logged-in user. |
| Fresh tab, no login yet | `getUserId()` → `null`; `isLoggedIn()` → `false`. |

Storage on this origin is readable by any script on the origin. The value held
here is an identifier only. The password never enters the session module and is
never logged.

## Testing

Unit tests with the built-in `node:test` runner — zero new dependencies, which
is the only reason to add a runner to a repo this small. `package.json` gains a
`scripts.test` entry of `node --test`.

Tests construct a fake `sessionStorage` and exercise `AppSession` directly:

1. `setUser` then `getUserId` returns the id.
2. `getUserId` on a fresh module returns `null`.
3. A value already in storage is read back after the cache is cold (the reload
   path).
4. A storage object whose `setItem` throws: `setUser` does not propagate, and
   `getUserId` still returns the value from cache.
5. A storage object whose `getItem` throws: `getUserId` returns `null` rather
   than propagating.
6. `setUser("")` and `setUser(null)` leave `isLoggedIn()` false.
7. `clear()` resets both cache and storage; `getUserId()` returns `null`.

`login`'s new return shape is covered by asserting `success`, `username`, and a
non-empty `userId` — not the exact stub string, which is placeholder data and
should not be pinned by a test.

Not covered by unit tests: the `index.html` script ordering and the real
browser submit path. Verified by hand — open the page, submit the form, confirm
`AppSession.getUserId()` in the console, reload, confirm it survives, then
close and reopen the tab and confirm it is `null`.

## Out of scope

- Logout. `clear()` exists as its seam, but no UI calls it.
- The real API call. `login` stays a synchronous stub; making it async is a
  separate change that will alter the handler's control flow.
- Any second form. This design exists so adding one is cheap, but none is built
  here.
- Sending the userId to the server. A client-held identifier the server trusts
  is a security decision, not plumbing, and was explicitly not chosen.
- Sharing code between `app.js` and `src/`. They remain disconnected.

## Assumptions

- Assumption: the per-tab lifetime is the desired one for the forms that come
  later; validate when the second consumer is built, by checking whether it
  needs the userId in a tab the user did not log in from.
- Assumption: the stub's derived userId is adequate until the real endpoint
  lands; validate when `API_ENDPOINT` is wired up, by confirming the server's
  identifier flows through `AppSession` unchanged.
