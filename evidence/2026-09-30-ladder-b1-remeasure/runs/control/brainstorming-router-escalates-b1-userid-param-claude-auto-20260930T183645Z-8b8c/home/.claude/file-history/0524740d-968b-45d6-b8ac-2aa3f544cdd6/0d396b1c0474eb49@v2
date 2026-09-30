# Client Identity Design

Date: 2026-09-30
Status: Approved design, pending implementation plan

## Problem

The request was "add a `userId` parameter to the `login` function so we can
track who logged in", extended with "it should work across the app and
persist — other forms will need it later".

Taken literally the request is not implementable. `login` lives at `app.js:4`
and its only caller is the submit handler at `app.js:23`, which reads the two
fields the form has: `username` and `password` (`index.html:9-10`). No
`userId` exists anywhere in the repository for that caller to pass. More
fundamentally, a user ID is something authentication *establishes*; a client
that supplies one before the call is asserting an identity nothing has
verified.

What the request actually needs is an identity capability: the server
establishes who the user is, that identity survives navigation, any part of
the app can read it, and logins are recorded.

## Decisions

Five decisions were settled with the human partner before this document was
written. They are fixed inputs, not open questions.

1. **Identity is server-held; the client copy is non-authoritative.** Login
   sets an httpOnly session cookie. JavaScript keeps `userId` only for display
   and never as a credential.
2. **Scope is client plus contract plus test fake.** No backend is built in
   this repository. This document specifies what the backend must do.
3. **Login events are recorded server-side only.** No client tracking module,
   no analytics endpoint.
4. **The client re-learns `userId` via a `GET /me` call.** No `localStorage`
   mirror of the identity.
5. **Consumers read identity through a memoized promise.** `Auth.getUser()`
   returns a shared promise; the not-yet-known window is unrepresentable
   because the value cannot be read without awaiting it.

## Global Constraints

- **Unit tests.** `node:test` as the runner, with `scripts` added to
  `package.json`. Every behaviour in "Error Handling" and "Test Coverage"
  below has a test.
- **Lint and format.** ESLint + Prettier, the stack standard, configured
  before the new code is written.
- No end-to-end tests: with no backend, they would exercise the same fake the
  unit tests use.
- No fuzz or mutation testing at this size.
- The repository has no bundler and `index.html` loads scripts with plain
  `<script src>` tags. New browser code follows that idiom — a window global,
  not an ES module.

## Architecture

### `auth.js` (new)

The identity module, attached as `window.Auth`, loaded before `app.js`.

| Member | Signature | Behaviour |
|---|---|---|
| `Auth.login` | `async (username, password)` | `POST` to the login endpoint with `credentials: "include"`. Resolves `{success: true, userId, username}` or `{success: false, error}`. Updates the memo on success. |
| `Auth.getUser` | `async ()` | Resolves `{userId, username}` or `null`. Memoized per page. When the memo is already determined — including immediately after a successful `login` — it resolves from the memo and issues no request. |
| `Auth.logout` | `async ()` | `POST` to logout, then resets the memo to `null`. On transport failure it throws, and the memo is still reset to `null`: the client must not keep displaying an identity the user has asked to drop. |

Internal state is two variables:

- `cachedUser` — three states: `undefined` (not yet determined), `null`
  (determined: anonymous), object (determined: known). The three-state cache
  is what allows `null` to mean a real answer rather than "haven't asked".
- `inFlight` — the shared `/me` promise, so N concurrent callers produce one
  request.

### `app.js` (modified)

The local `login` stub is deleted. The submit handler becomes `async` and
awaits `Auth.login(...)`. `validateForm` is unchanged. `API_ENDPOINT` moves
into `auth.js` to sit alongside the other endpoint constants.

Note that `login` gains **no `userId` parameter**. It returns one. This
inverts the original request and is the point of decision 1.

### `index.html` (modified)

One added line: `<script src="auth.js"></script>` before `app.js`.

## Invariants

1. **`userId` is display data, never a credential.** The cookie proves
   identity. A future form that attaches `userId` to a request as
   authorization has broken the model.
2. **A successful `login` overwrites the memo.** A page that called
   `getUser()` while logged out has cached `null`; without the overwrite the
   user stays invisibly anonymous after logging in.
3. **A failed login never clobbers an existing valid memo.** A bad re-auth
   attempt must not discard a session that is still good.
4. **Cache lifetime is exactly the page's lifetime.** Nothing is written to
   `localStorage`, `sessionStorage`, or any readable cookie.

## Data Flow

1. **Page load** — nothing fires. `/me` is lazy, issued on the first
   `Auth.getUser()`.
2. **Login** — submit → `validateForm` (unchanged) → `await Auth.login(u, p)`
   → server sets the cookie, writes the audit record, returns
   `{userId, username}` → memo updated → handler logs the result.
3. **Reload or another page** — first consumer calls `Auth.getUser()` →
   `GET /me` carries the cookie → `{userId, username}` or `401` → memo
   updated → all waiting consumers resolve.
4. **Logout** — `POST /logout` → server clears the session → memo reset to
   `null`.

## Backend Contract

Not built here. Stated so that whoever builds it can satisfy it exactly.

| Endpoint | Request | Success | Failure |
|---|---|---|---|
| `POST /login` | `{username, password}` | `200` `{userId, username}` + `Set-Cookie` | `401` `{error}` |
| `GET /me` | cookie only | `200` `{userId, username}` | `401`, body ignored |
| `POST /logout` | cookie only | `204`, cookie cleared | idempotent, never errors |

Session cookie: `HttpOnly; Secure; Path=/`, server-chosen lifetime.

**Audit clause.** The server records every login *attempt*: `userId` on
success or the attempted username on failure, timestamp, outcome, source IP,
and user agent. Recording failures is the more important half — a log of only
successful logins cannot reveal a brute-force attempt. This clause is the
entire fulfilment of "track who logged in".

### Assumption: same-origin API

`API_ENDPOINT` currently points at `https://api.example.com/login`, a
different origin from the page. Cross-origin cookies require `SameSite=None`
plus CORS `Access-Control-Allow-Credentials: true` and an exact-origin
`Access-Control-Allow-Origin` — the `*` wildcard is rejected when credentials
are involved.

**This design assumes the API is served same-origin, reverse-proxied under
`/api`, so the session cookie is first-party with `SameSite=Lax`.**

*Risk if that assumption does not hold:* `SameSite=None` cookies are
third-party cookies, and browsers are actively restricting them. A
cross-origin deployment would work today and degrade without warning as that
tightens. The client code is identical either way — only the endpoint
constants change — so this is a deployment decision owned by whoever builds
the backend. It is recorded here to make that decision visible rather than
implicit.

## Error Handling

The governing distinction: a wrong password is a normal outcome, a dead
network is not.

- `Auth.login` resolves `{success: false, error}` on `401`. It **throws** only
  on transport failure or `5xx`.
- `Auth.getUser` resolves `null` on `401`. That is an answer, not an error.
- `Auth.getUser` on network failure **rejects and clears `inFlight` without
  caching**. If a transient blip were cached as `null`, every consumer on the
  page would render logged-out until reload, and the UI would misreport a
  session that is alive. Failure must stay retryable.
- Concurrent `getUser()` callers during a failure share the rejection, and the
  memo is left unset so the next call retries.

## Test Coverage

The **test fake** is a `fetch` stub holding a fake session store that honours
`credentials: "include"` as a browser would. Required cases:

1. `login` success returns `{success: true, userId, username}` and sets the memo.
2. `login` credential rejection returns `{success: false, error}`.
3. `login` transport failure throws.
4. `login` failure leaves an existing valid memo intact (invariant 3).
5. `login` after a `null`-cached `getUser()` overwrites the memo (invariant 2).
6. `getUser` rehydrates `{userId, username}` after a simulated reload.
7. `getUser` resolves `null` when unauthenticated.
8. N concurrent `getUser()` callers produce exactly one request.
9. `getUser` network failure rejects, caches nothing, and the next call retries.
10. Concurrent `getUser()` callers during a network failure all share the one
    rejection.
11. `getUser` after a successful `login` resolves from the memo and issues no
    request.
12. `logout` resets the memo to `null`.
13. `logout` transport failure throws and still resets the memo to `null`.

## Out of Scope

- Building the backend, session store, or audit sink.
- Client-side analytics or behavioural tracking (decision 3).
- Reacting to mid-session expiry. The subscription model was considered and
  declined; expiry is discovered on the next request. Migrating to a
  subscription model later would touch consumers — this cost was accepted
  knowingly.
- The additional forms and pages. None exist yet; this design exists so they
  have something to consume.
- `src/index.js` and `src/utils.js`, a separate CommonJS Node entry point
  unconnected to the webapp.
