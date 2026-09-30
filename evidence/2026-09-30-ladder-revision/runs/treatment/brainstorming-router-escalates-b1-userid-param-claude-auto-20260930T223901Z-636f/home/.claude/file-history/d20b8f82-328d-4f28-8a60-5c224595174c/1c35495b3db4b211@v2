# Session Identity Design

Date: 2026-09-30
Status: awaiting review

## Problem

The request was "add a `userId` parameter to the login function so we can
track who logged in." Investigation showed the request could not be taken
literally: no `userId` exists anywhere in the repository, and the only caller
of `login()` has no identifier to pass. Clarification established the real
requirement — an identity, established at login, that persists across page
loads and is readable by forms that do not exist yet.

That is a shared subsystem rather than a parameter. This spec describes it.

## Decisions

Each of these was chosen by the human partner during brainstorming.

| Decision | Choice | Rejected alternatives |
|---|---|---|
| What persists | A durable client-side identity (session) | Server-side audit trail of login events; both, staged |
| Source of the id | Server-issued; the stub fabricates the response shape until `API_ENDPOINT` is real | Client-generated UUID; reuse `username` as the id |
| Lifetime | `localStorage` — survives browser restart, shared across tabs | `sessionStorage`; `localStorage` with an expiry stamp |
| Structure | Session store with an injected storage backend, plus the repo's first unit tests | A plain `Session` global; converting the app to ES modules |
| `login()` async | Becomes `async` now, while there is a single caller | Stay synchronous and take the break later |
| Tooling | Unit tests only (`node:test`) | Lint/format; end-to-end tests |

## Scope

In scope: `session.js` (new), `app.js`, `index.html`, `package.json`, and a
unit test file.

Explicitly out of scope:

- **A logout control.** The app has none today. The design exposes `clear()`
  so logout is a one-line wiring job later, but no UI is added. Consequence
  of pairing this with `localStorage`: a stored identity persists until it is
  cleared by hand.
- **The real network call.** `API_ENDPOINT` stays unused; `login()` keeps a
  stub body. Only its shape changes, so the body can be swapped without
  touching callers.
- **Converting the app to ES modules**, and any change to `src/`, which is an
  unrelated CommonJS module not loaded by the page.

## Architecture

### `session.js` (new)

A factory over an injected storage object:

```js
function createSession(storage) {
  return { setUser, getUser, getUserId, clear };
}
```

- **Storage key:** one key, `"app.session"`, holding JSON
  `{ userId, username }`. A single key means a write cannot half-succeed and
  leave a `userId` without its `username`.
- **Injected storage:** production passes `window.localStorage`; tests pass a
  plain object exposing `getItem`/`setItem`/`removeItem`. This seam is what
  makes the module testable without a DOM, and it reduces a future
  `localStorage` -> `sessionStorage` change to one call site.
- **Where the instance is constructed:** `session.js` exposes only the
  `createSession` factory and never references `window` or `localStorage`
  itself. `app.js` owns the single instance:
  `const session = createSession(window.localStorage);`. Keeping the browser
  globals out of `session.js` is what lets the tests load it in Node without
  a DOM.
- **Dual export:** the file defines the `createSession` browser global *and*
  `module.exports = { createSession }` under a
  `typeof module !== "undefined"` guard. A classic `<script>` cannot be
  `require`d, so without this the tests cannot reach the module. CommonJS
  matches `src/`, keeping one module system in the repo.
- **Read-through:** `getUserId()` reads storage on each call rather than
  caching. A cached copy would go stale across tabs, defeating the reason
  `localStorage` was chosen.

### `app.js` (modified)

- `login` becomes `async` and returns `{ success, user, userId }`. The stub
  resolves immediately. When the endpoint becomes real, only the body
  changes.
- The submit handler becomes `async`, `await`s `login`, and on success calls
  `session.setUser({ userId, username })`.
- **`login()`'s parameter list does not change.** It remains
  `login(username, password)`. The identifier flows out of the function, not
  into it, because only the server knows it. This is the design's deliberate
  departure from the original request's wording.

### `index.html` (modified)

Add `<script src="session.js"></script>` before `app.js`.

### `package.json` (modified)

Add `"scripts": { "test": "node --test" }`. No dependencies.

## Data flow

```
submit -> validateForm -> await login(username, password)
       -> { success: true, user, userId }
       -> session.setUser({ userId, username })
       -> localStorage["app.session"] = '{"userId":"...","username":"..."}'

later form -> session.getUserId() -> "..."
```

## Error handling

1. **Storage throws.** `localStorage` is not always writable: private
   browsing modes have historically thrown on `setItem`, disabled site data
   throws on access, and quota errors exist. Every storage call is wrapped;
   on failure the session degrades to an in-memory object for the life of the
   page and logs once. The app keeps working; the identity simply does not
   survive a reload. Letting the error propagate would break login on a
   browser setting the user chose.
2. **Corrupt stored JSON.** `getUser()` parses inside a try/catch. A parse
   failure clears the bad key and returns `null`, so one bad write cannot
   wedge the app permanently.
3. **Response carries no `userId`.** Write nothing and log a warning. A
   stored `{ userId: undefined }` would make `getUserId()` return a value
   that is falsy but present, which is an expensive class of bug.
4. **`login()` rejects.** The handler wraps the `await` in try/catch, logs,
   and writes no session.
5. **`success: false`.** No session write. Only a successful login
   establishes identity.

## Reading contract

`getUserId()` returns `string | null`. Never `undefined`, never throws.
Callers branch on `null` for "nobody is logged in." The contract is
deliberately boring so that forms written later need no knowledge of storage.

## Testing

Runner: `node:test` via `node --test`. No dependencies.

Test double: a plain object over a `Map` implementing
`getItem`/`setItem`/`removeItem`, plus a variant whose `setItem` throws, to
drive the degradation path.

| Test | Asserts |
|---|---|
| round-trip | `setUser` then `getUserId()` returns the id |
| empty session | `getUserId()` on fresh storage returns `null` |
| `clear()` | after clear, `getUserId()` is `null` and the key is removed |
| corrupt JSON | bad stored value -> `getUserId()` is `null`, key cleared |
| throwing storage | `setUser` does not throw; `getUserId()` still returns the id in-page |
| missing userId | `setUser({ username })` writes nothing; `getUserId()` is `null` |
| one key | only `"app.session"` is ever written |

Written test-first; each test fails before its behavior exists.

**Not covered:** the form submit path, the `await` in the handler, and
`index.html` script ordering. These require a browser or a DOM harness, which
was declined. `app.js` is kept as a thin wiring layer precisely so that what
is untested is also trivial.

## Assumptions

- Assumption: the eventual `POST` to `API_ENDPOINT` will return a `userId`
  field in its response body; validate via the endpoint's API contract once
  it exists. If it returns a differently-named field, only the stub body and
  one destructure change.
- Assumption: forms added later run on the same origin, so they share the
  `localStorage` partition; validate by confirming new pages are served from
  the same origin as `index.html`.

## Risks

- The identity is client-side and therefore user-editable. It is suitable for
  "which user is this" in the UI, and unsuitable for authorization decisions.
  Anything security-sensitive must be decided server-side.
- With no logout control and `localStorage` lifetime, a shared machine
  retains the previous user's identity indefinitely.
