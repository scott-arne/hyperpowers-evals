# Login userId tracking — design

**Date:** 2026-09-30
**Status:** Awaiting review
**Branch:** `feature/webapp-enhancement`

## Problem

`login(username, password)` in `app.js` has no notion of user identity beyond
the submitted username. The goal is to track *who* logged in, using the
authenticated user ID the backend issues, and to make that ID available to
the rest of the app — including forms that do not exist yet.

The request began as "add a `userId` parameter to the login function." The
parameter is the visible part; the substance is a small persistence component
that supplies it. A parameter alone cannot satisfy "works across the app and
persists," because nothing in the app currently holds state between page
loads.

## Requirements

Established through brainstorming; each was confirmed by the human partner.

1. `login` gains a `userId` parameter.
2. The value is a **backend-issued authenticated user ID**, not a
   locally-minted client or device identifier.
3. It is absent on a first-ever login and present on subsequent ones.
4. It persists across page loads and visits.
5. It is readable by other forms in the app that do not exist yet.
6. It is **non-authoritative**: it never affects whether authentication
   succeeds.
7. When a different account logs in on the same browser, the stored value
   must not carry into the new session.

## Global Constraints

- **Testing:** unit tests via Node's built-in `node:test`. No new runtime or
  dev dependencies — the repository is currently dependency-free and stays
  that way.
- **No build step.** Plain `<script>` tags, no bundler, no module loader, no
  transpilation. Code must run as-is in a browser.
- **No linter or formatter** is being introduced by this work. Match the
  existing style in `app.js` (2-space indent, double quotes, semicolons).
- **No end-to-end or fuzz testing.** The submit-handler wiring is verified
  manually.

## Architecture

A new file, `session.js`, owns all persisted per-user state and exposes a
single global, `UserSession`. `app.js` consumes it. `index.html` loads
`session.js` before `app.js`.

```
index.html
  ├─ <script src="session.js">   defines window.UserSession
  └─ <script src="app.js">       consumes UserSession
```

The alternative of keeping the store inline in `app.js` was rejected:
requirement 5 means a second consumer is a stated need rather than a guess,
and a future form would have to duplicate the store or pull in all of
`app.js`. A pluggable storage backend with change notifications was also
rejected as YAGNI — there is one form and one storage mechanism anyone has
asked for. `session.js` can be upgraded to that shape later without touching
its consumers, which is the point of the boundary.

An HttpOnly cookie set by the backend is the more secure way to persist
identity, and was considered and discarded: JavaScript cannot read an
HttpOnly cookie, so the ID could be neither a parameter to `login` nor
readable by other forms, contradicting requirements 1 and 5. Browser-readable
storage is therefore a deliberate choice, defensible only because of
requirement 6.

### Invariants

These are the properties that keep the design safe. Any change that breaks
one is a design change, not an implementation detail.

- **`UserSession` is the sole accessor of `localStorage`.** No other code
  reads or writes the storage key directly. This is what makes the storage
  mechanism swappable without hunting call sites.
- **The stored ID is non-authoritative.** It is tracking context, never a
  credential. `login` must not branch on it. Any backend that later receives
  it treats it as untrusted input.

## Components

### `session.js` — `UserSession`

Backing store: `localStorage`, one key, `webapp:userId`, holding the raw ID
string. Not a JSON envelope — there is one value and no versioning need, and
a bare string keeps the failure modes trivial.

`localStorage` rather than `sessionStorage` because requirement 4 says
persist; `sessionStorage` dies with the tab, which would leave a returning
visitor passing `null` in most real sessions.

| Method | Behavior |
|---|---|
| `getUserId()` | Returns the stored ID string, or `null` if none is stored. |
| `setUserId(id)` | Stores `id`. |
| `clear()` | Removes all stored per-user state. |
| `reconcile(passedId, returnedId)` | Applies the reconcile rule below; returns the ID now in effect. |

**Storage-failure fallback.** `localStorage` access throws in real
conditions — private browsing modes, storage disabled by policy, quota
exhaustion. Every access is wrapped; on a throw, `UserSession` falls back to
an in-memory value for the lifetime of the page. The app keeps working and
loses only persistence. Letting the exception propagate would turn a storage
quirk into a broken login form.

**Storage resolution.** `UserSession` resolves its store as
`globalThis.localStorage` at each access rather than capturing a reference at
load time. This is what lets the unit tests substitute a fake: a test assigns
`globalThis.localStorage` before exercising a method. It also means the
component behaves correctly if storage is unavailable at load but present
later. No dependency-injection plumbing is introduced — there is no build
step, and an injectable parameter would leak test scaffolding into the
browser API.

**Node-loadability.** The unit tests load `session.js` under Node, where
there is no `localStorage` and no `window`. The file must therefore attach
its global in a way that works in both environments and must tolerate absent
browser storage at load time — the storage-failure fallback already covers
the missing-`localStorage` case, so no browser-detection branch is needed
beyond the global assignment itself.

### The reconcile rule

Where account-switch protection lives.

- `returnedId` is absent (`null`, `undefined`, or empty) → **no change**, and
  return the current stored value. A response missing the field is not
  evidence the user changed. This case is checked first.
- `passedId` is `null` → store `returnedId`. First login on this browser.
- `passedId === returnedId` → store `returnedId`. Same user returning.
- `passedId !== returnedId`, both non-null → **a different person has logged
  in on this browser.** Call `clear()` first, then store `returnedId`.

Today `clear()` is technically redundant with overwriting a single key. The
rule is written this way so it stays correct the first time a second
per-user value is stored alongside the ID.

### `app.js` changes

- `login(username, password, userId)` — third parameter added. It is always
  passed explicitly by the caller, `null` when unknown, rather than given a
  default value. A default quietly hides a forgotten argument at a future
  call site; an explicit `null` does not.
- `login` records `userId` as context (today the existing `console.log`;
  later, part of the POST body to `API_ENDPOINT`). It does not branch on it.
  Success is determined by username and password alone — this is the one
  place invariant 2 could be violated.
- `login`'s stub return grows a `userId` of `stub-<username>`. There is no
  backend, so there is no real ID to return; a marked placeholder makes the
  whole loop observable and testable now, and the `stub-` prefix makes a fake
  value obvious if it ever surfaces somewhere unexpected. This is replaced
  when `API_ENDPOINT` is actually wired up.
- The submit handler reads `UserSession.getUserId()` before calling `login`,
  and calls `UserSession.reconcile(passedId, result.userId)` on success.
- `validateForm` is **unchanged**. It gates on username and password only. A
  missing `userId` is normal, not a validation failure — wiring the new field
  into validation would break first-time login for every user.

### `index.html` changes

One added line: `<script src="session.js"></script>` before the existing
`<script src="app.js"></script>`. Ordering is load-bearing; `app.js`
references `UserSession` at submit time, but keeping the tags ordered avoids
depending on that timing.

## Data flow

1. Page loads. User submits the form.
2. Handler reads `username` and `password` as today.
3. Handler reads `const userId = UserSession.getUserId()` — `null` on a
   first-ever login.
4. `validateForm({ username, password })` runs unchanged.
5. `login(username, password, userId)` is called; it logs the context and
   returns `{ success, user, userId }`.
6. On success, `UserSession.reconcile(userId, result.userId)` stores the
   authoritative ID, clearing prior state first on an account switch.

## Error handling

| Condition | Behavior |
|---|---|
| `localStorage` throws on read or write | Fall back to an in-memory value for the page lifetime; app continues without persistence. |
| No stored ID | `getUserId()` returns `null`; `login` receives `null`; this is the normal first-login path, not an error. |
| Stored value is an empty string | Treated as no value; `getUserId()` returns `null`. |
| `login` returns no `userId` | Leave the store untouched rather than clearing it. A response missing the field is not evidence the user changed. |
| Login fails (`success: false`) | Store is untouched. Reconcile runs only on success. |

## Testing

Unit tests for `session.js` via `node:test`, substituting a fake
`globalThis.localStorage`:

- `getUserId()` returns `null` when nothing is stored.
- `setUserId` / `getUserId` round-trip.
- `clear()` removes the value; `getUserId()` then returns `null`.
- Empty stored string reads back as `null`.
- `reconcile` with `passedId === null` stores the returned ID.
- `reconcile` with matching IDs stores the returned ID.
- `reconcile` with differing non-null IDs clears before storing.
- `reconcile` with an absent `returnedId` leaves an existing stored ID
  untouched.
- Throwing storage: `setUserId` then `getUserId` still round-trips in memory,
  and nothing propagates to the caller.

The submit handler is not unit-tested — it needs a DOM, and for wiring this
thin the jsdom setup cost exceeds the value. Manual browser verification
covers it:

1. Log in. Confirm a `stub-` ID is stored.
2. Reload and log in as the same user. Confirm the stored ID was passed in.
3. Log in as a different username. Confirm the store holds the new ID.
4. Disable storage in the browser. Confirm login still works.

## Known gaps

- **No logout.** The store clears on account *switch*, not on logout, because
  the app has no logout. A user who walks away from a shared browser leaves
  their ID behind. Given requirement 6 this is a privacy wrinkle rather than
  a security hole, but it is a real gap and is not addressed here.
- **`API_ENDPOINT` is still unused.** `login` remains a stub. Sending
  `userId` to a real backend is future work, and the `stub-` placeholder is
  the marker for where that work lands.

## Out of scope

- Wiring `login` to a real endpoint.
- Logout, session expiry, or ID rotation.
- Additional forms. The design makes them cheap; it does not build them.
- Linting, formatting, or end-to-end test infrastructure.
- The unrelated `src/index.js` / `src/utils.js` Node code, which has no
  connection to the browser script.
