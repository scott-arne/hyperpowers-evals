# Persistent User Identifier — Design

Date: 2026-09-16
Status: approved for planning
Branch: `feature/webapp-enhancement`

## Problem

The webapp needs to know which user performed an action so logins can be
attributed. The originating request was "add a `userId` parameter to the login
function", but the repository has no user identifier of any kind: the login form
collects only `username` and `password`, and `login()` in `app.js` is a
synchronous stub that never contacts a server.

The identifier must be app-wide, must persist across visits, and must be
available to forms that do not exist yet. That makes this a new identity
subsystem with a persisted data format, not a parameter addition.

## Key design conclusion

With a server-assigned identifier, `userId` is an **output** of login, not an
input. On a first login the client has no identifier; the server issues one in
the response. `login()` therefore keeps its two parameters and grows its return
value. Passing a stored identifier *into* login (for return-visit correlation)
was considered and deliberately deferred — it adds a client-controlled value the
server cannot trust, in exchange for a capability nobody asked for.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| What the ID identifies | Server-assigned account ID | Trustworthy server-side and genuinely per-person, unlike a client-minted device ID. |
| Backend | Stub retained; contract pinned here | No real endpoint exists. All client logic is real and tested; only the network call is faked. |
| Storage | `localStorage`, key `app.userId` | Survives restart, readable by all forms. |
| Security posture | Correlation key only, never an auth credential | Any script on the origin can read or forge it. |
| Tracking scope | Attach only | `userId` rides along in request payloads. No client-side event collector. |
| Module system | `"type": "module"` in `package.json` | One convention repo-wide; avoids the `.mjs` MIME-type footgun. |
| Test tooling | `node:test` + `node:assert` | Zero dependencies, matching the repo's empty dependency list. |

## Architecture

### `identity.js` (new, repo root)

The only code permitted to touch `localStorage`.

```
getUserId()    -> string | null
setUserId(id)  -> void    (throws TypeError on empty or non-string input)
clearUserId()  -> void
```

Placed at the repo root beside `app.js`. It does not belong in `src/`, which
holds an unrelated CommonJS `greet` helper that the page never loads.

**Storage injection.** The module exports a factory, `createIdentity(storage)`,
returning an object with the three functions above, plus a default instance bound
to `globalThis.localStorage` whose methods are re-exported as the module's named
exports. Application code imports the named exports and never sees the factory;
tests call the factory with a fake. This exists for a concrete reason: Node
provides no `localStorage`, so without it the unit tests would require jsdom — a
dependency this repo does not have and does not need.

Binding at module load must not throw in an environment without
`globalThis.localStorage`; an absent backend is treated the same as a throwing
one (in-memory fallback).

**Stored format.** A bare string under `app.userId`, not a JSON envelope. The
value is a single opaque token; a version wrapper would buy migration headroom
against a migration that may never happen. If the format must change later, the
key name is the version lever: write `app.userId.v2`, read both keys during a
transition, then drop the old one.

**Security note (must appear in the module header).** This identifier is a
correlation key. Any script on the origin can read or forge it, so it must never
be used to authenticate a request or authorize access. If it ever needs to carry
authority, it moves to an `httpOnly` cookie set by the server and the client
stops reading it.

### `login()` contract

```
POST  https://api.example.com/login
body  { "username": string, "password": string }

200   { "success": true,  "user": string, "userId": string }
        userId: opaque, non-empty, server-assigned, stable per account.
                Clients must not parse it or derive meaning from it.
4xx   { "success": false, "error": string }     // no userId field
```

`login()` becomes `async` **now**, while still stubbed, and the submit handler
`await`s it. A real `fetch` is asynchronous; making the function synchronous
today would mean that adding the network call later changes both the signature
and every call site. Converting now costs two keywords and reduces the eventual
swap to a body-only edit.

The stub returns the contract shape above with a fixed placeholder `userId`, so
the storage path is exercised end to end from the first commit.

### Data flow

1. Submit handler validates the form (unchanged, `validateForm`).
2. Handler `await`s `login(username, password)`.
3. On `success: true` with a valid `userId`, the handler calls
   `identity.setUserId(result.userId)`.
4. Later forms read the value with `identity.getUserId()` and include it in
   their request payloads.

## Error handling

| Condition | Behavior |
|---|---|
| `localStorage` throws (private browsing, disabled by policy, quota) | Fall back to a module-level in-memory value; `console.warn` once. The visit works; the value is forgotten on reload. |
| Login returns `success: false` | Write nothing. Leave any existing stored ID untouched — a failed attempt must not wipe a valid identity. |
| Success response missing or malformed `userId` | Contract violation: warn, leave the stored value unchanged, and still treat the login as successful. Missing tracking data must never fail a user's login. |
| `setUserId` called with empty or non-string input | Throw `TypeError`. This is a programmer error and should be loud. |

## Changes to existing files

- `app.js` — `login()` becomes `async` and returns `userId`; the submit handler
  becomes `async`, `await`s login, and calls `identity.setUserId()`.
- `index.html` — the script tag becomes `type="module"`.
- `package.json` — add `"type": "module"` and `"scripts": { "test": "node --test" }`.
- `src/index.js`, `src/utils.js` — converted from CommonJS to ESM (four lines
  total). Required by the package-wide `"type": "module"`, and explicitly
  approved despite being outside the original request.

## Testing

Runner: `node --test` using `node:test` and `node:assert`. No new dependencies.

Covered:

- `getUserId` returns `null` when nothing is stored.
- `setUserId` / `getUserId` round-trip.
- `clearUserId` removes the value.
- `setUserId` throws `TypeError` on `""`, `null`, `undefined`, and non-strings.
- A storage backend that throws on read and on write falls back to in-memory,
  and `getUserId` still returns the value set during that session.
- The in-memory fallback does not survive a fresh module instance.
- The login stub resolves to the pinned contract shape and is awaitable.

**Known gap.** The DOM submit handler in `app.js` is not covered. End-to-end
browser testing was considered and declined as disproportionate for a six-file
fixture. The wiring between `login()`'s return value and `setUserId()` is
verified by reading, not by an automated test. If the handler grows further
logic, revisit this.

## Out of scope

- Any analytics or audit event collector. "Tracking" here means the identifier
  is attached to request payloads; recording is a server-side concern.
- Logout and session lifecycle. `clearUserId()` exists for a future logout path
  but nothing calls it yet.
- Passing a stored `userId` into `login()` for return-visit correlation.
- Linting and formatting infrastructure, and end-to-end tests.
- Any change to the real backend, which does not exist.

## Assumptions

- Assumption: the eventual backend can return an opaque per-account identifier
  on successful login; validate by review of this contract with whoever builds
  the endpoint, before the stub is replaced.
- Assumption: no privacy-consent gate is required before persisting an
  identifier for this application; validate with whoever owns the product's
  privacy posture. Persisting a durable user identifier in browser storage is a
  tracking behavior and may carry disclosure obligations depending on
  jurisdiction and audience.
