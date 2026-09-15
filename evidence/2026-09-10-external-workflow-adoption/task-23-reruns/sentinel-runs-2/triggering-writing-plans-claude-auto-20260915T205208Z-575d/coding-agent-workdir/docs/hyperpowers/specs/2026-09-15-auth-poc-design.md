# Authentication POC — Design

**Date:** 2026-09-15
**Status:** Approved for planning
**Scope:** Email/password auth on the existing Express skeleton

## Problem

`app.js` is an Express app with an in-memory `users` array and a single
`/health` route. It has no authentication. We need registration, login with
JWT issuance, JWT-protected routes, 24-hour token expiry, and password reset
via email.

## Goals

- Users register with email and password.
- Users log in and receive a JWT.
- Protected routes reject requests without a valid JWT.
- Tokens expire 24 hours after issuance.
- Users can request a password reset and complete it with a emailed token.

## Non-Goals

This is an explicitly minimal proof of concept. Out of scope: persistence
beyond process memory, refresh tokens, token revocation/blacklisting, rate
limiting, account lockout, email verification at registration, multi-factor
auth, RBAC, CSRF protection, and any real SMTP delivery.

## Global Constraints

These apply to every task in the implementation plan.

- **Zero new runtime dependencies.** Express is the only dependency. JWT
  signing, password hashing, and token generation all use `node:crypto`.
- **Node built-in test runner** (`node --test`) for unit tests. No test
  framework dependency.
- **ES modules** — the package is `"type": "module"`; use `import`/`export`
  throughout, matching `app.js`.
- **Mocked email.** The mailer writes to stdout. No network calls.
- **Match existing style:** 2-space indent, double-quoted strings, `res.json`
  responses, comments that explain why rather than what.

## Architecture

`app.js` remains the composition root: it creates the app, mounts the auth
router, keeps `/health`, and listens. Auth lives in `auth/`, one concern per
file, each independently testable.

```
app.js                  composition root: mount router, keep /health, listen
auth/store.js           in-memory users + reset tokens
auth/passwords.js       scrypt hash / verify
auth/tokens.js          HS256 JWT sign / verify
auth/mailer.js          mock mailer -> stdout
auth/middleware.js      requireAuth
auth/routes.js          the Express router wiring the above together
```

Dependency direction is one-way: `routes` depends on `store`, `passwords`,
`tokens`, and `mailer`; `middleware` depends only on `tokens`. Nothing in
`auth/` imports `app.js`.

### `auth/store.js`

Owns all mutable state. Replaces the bare `users` array in `app.js`.

```js
createUser({ email, passwordHash }) -> user
findUserByEmail(email) -> user | undefined
findUserById(id) -> user | undefined
setPassword(userId, passwordHash) -> void
userCount() -> number

putResetToken(token, { userId, expiresAt }) -> void
takeResetToken(token) -> { userId, expiresAt } | undefined   // single-use: deletes on read
```

A user is `{ id, email, passwordHash, createdAt }`. `id` is a
`crypto.randomUUID()`. Emails are stored and compared lowercased and trimmed
so `Bob@example.com` and `bob@example.com` are the same account.

`takeResetToken` deletes the entry as it returns it; single-use is a property
of the store, not of the caller remembering to clean up.

`userCount()` exists so `/health` keeps reporting the user count without
reaching into store internals.

### `auth/passwords.js`

```js
hashPassword(plaintext) -> "salt:derivedKey"   // both hex
verifyPassword(plaintext, stored) -> boolean
```

`crypto.scryptSync` with a 16-byte random salt and a 64-byte derived key.
Comparison uses `crypto.timingSafeEqual`. Parameters are scrypt defaults —
adequate for a POC, and a real deployment would tune the cost factor.

`verifyPassword` returns `false` rather than throwing on a malformed stored
value, so a corrupt record cannot 500 the login route.

### `auth/tokens.js`

A minimal HS256 JWT implementation. Real signature verification and real
expiry checking — the format is interoperable with standard JWT libraries,
so swapping in `jsonwebtoken` later is a drop-in change.

```js
signToken(payload) -> string          // adds iat and exp
verifyToken(token) -> payload         // throws on any failure
TOKEN_TTL_SECONDS = 24 * 60 * 60
```

- Header: `{ "alg": "HS256", "typ": "JWT" }`.
- Payload: caller's claims plus `iat` and `exp` (`iat + TOKEN_TTL_SECONDS`),
  both epoch seconds. Routes pass `{ sub: user.id, email: user.email }`.
- Encoding: base64url, no padding.
- Verification order: three segments present, signature matches
  (`timingSafeEqual` over the HMAC), then `exp` in the future. Signature is
  checked before any payload claim is trusted.
- Secret: `process.env.JWT_SECRET`, falling back to a hardcoded dev value.
  The fallback logs a one-time warning at startup so it cannot silently ship.

`verifyToken` throws a plain `Error` with a short message; `requireAuth`
turns that into a 401 without leaking the reason to the client.

### `auth/mailer.js`

```js
sendPasswordResetEmail(email, token) -> void
```

Prints a labeled block to stdout containing the recipient, the token, and a
copy-pasteable reset URL. The signature is what a real transport would need,
so replacing the body with an SMTP call touches one file.

### `auth/middleware.js`

```js
requireAuth(req, res, next)
```

Reads `Authorization`, requires the `Bearer <token>` form, verifies the
token, loads the user by `sub`, and sets `req.user`. Any failure — header
missing, wrong scheme, bad signature, expired, user no longer in the store —
is `401 {"error": "unauthorized"}`. The response does not distinguish the
cases; the distinction is useful to an attacker and not to a client.

### `auth/routes.js`

An `express.Router`, mounted at `/auth`, plus the protected demo route
exported separately.

| Method | Path | Auth | Behavior |
|---|---|---|---|
| POST | `/auth/register` | none | Create user, return 201 `{ id, email }` |
| POST | `/auth/login` | none | Return 200 `{ token, expiresIn }` |
| POST | `/auth/forgot-password` | none | Issue reset token, mail it, return 200 |
| POST | `/auth/reset-password` | none | Consume token, set new password, 200 |
| GET | `/me` | Bearer | Return 200 `{ id, email, createdAt }` |

## Data Flow

**Register.** `POST /auth/register {email, password}` → validate both present,
email contains `@`, password ≥ 8 chars → normalize email → reject duplicate
with 409 → `hashPassword` → `createUser` → 201 `{ id, email }`. The password
hash is never in a response body.

**Login.** `POST /auth/login {email, password}` → `findUserByEmail` →
`verifyPassword` → `signToken({ sub, email })` → 200
`{ token, expiresIn: 86400 }`. Unknown email and wrong password both return
401 `{"error": "invalid credentials"}` — identical status and body, so the
endpoint does not reveal which emails are registered.

**Protected request.** `GET /me` with `Authorization: Bearer <token>` →
`requireAuth` verifies and loads the user → handler returns the profile.

**Forgot password.** `POST /auth/forgot-password {email}` → look up the user
→ if found, generate a 32-byte hex token, store it with
`expiresAt = now + 1 hour`, and call the mailer → **always** return 200
`{ message: "if that account exists, a reset link has been sent" }`,
whether or not the user exists. Same rationale as login: no enumeration.

**Reset password.** `POST /auth/reset-password {token, password}` →
`takeResetToken` (consumes it) → 400 if missing or `expiresAt` has passed →
validate the new password → `hashPassword` → `setPassword` → 200. Because the
token is consumed on read, a replayed request fails even if it arrives
milliseconds later.

Existing JWTs issued before a reset remain valid until they expire. Making a
reset invalidate outstanding tokens needs a token version or a revocation
list, which is out of scope for the POC; this is called out here so it is a
known limitation rather than an oversight.

## Error Handling

Every failure is a JSON body of the shape `{ "error": "<lowercase message>" }`,
matching the existing `res.json` convention.

| Condition | Status | Body |
|---|---|---|
| Missing/invalid field on register | 400 | `{"error": "email and password are required"}` / `{"error": "password must be at least 8 characters"}` |
| Duplicate email | 409 | `{"error": "email already registered"}` |
| Bad login | 401 | `{"error": "invalid credentials"}` |
| Missing/bad/expired JWT | 401 | `{"error": "unauthorized"}` |
| Bad/expired reset token | 400 | `{"error": "invalid or expired reset token"}` |

Validation lives at the route boundary. The modules underneath assume
well-formed input and stay small.

## Testing

`node --test` over `test/*.test.js`, added as `npm test`. Routes are exercised
through the router with `fetch` against an ephemeral port (`app.listen(0)`),
so no supertest dependency.

Unit coverage:

- **passwords** — round-trip verify, wrong password rejected, two hashes of
  the same password differ (salting), malformed stored value returns false.
- **tokens** — round-trip payload, tampered signature rejected, malformed
  input rejected, `exp` is `iat + 86400`, an already-expired token is
  rejected (constructed by signing with a backdated clock).
- **store** — create/find, `takeResetToken` returns once then undefined.

Integration coverage:

- register → 201, duplicate → 409, short password → 400
- login with correct credentials → token; wrong password → 401; unknown
  email → 401 with an identical body
- `/me` without a header → 401; with a valid token → profile; with a tampered
  token → 401
- forgot-password for a real account → 200 and a token captured from the
  mailer; for an unknown account → the same 200
- reset-password with the captured token → 200, then login with the old
  password fails and login with the new password succeeds
- reset-password replaying the same token → 400

Expiry is tested by signing a token with a backdated `iat`/`exp` rather than
by waiting, so the suite stays fast.

## Assumptions

Assumptions the design rests on that nobody confirmed. All follow from "err
on the side of extremely minimal POC; use mocks; use stdout."

- **Assumption:** In-process memory is acceptable storage; all state is lost
  on restart. Validate via: user confirms the POC is not expected to survive
  a restart.
- **Assumption:** A hand-rolled HS256 implementation is preferable to adding
  `jsonwebtoken`. Validate via: the interop property above — swapping in the
  library is a one-file change if the assumption is wrong.
- **Assumption:** Printing the reset token to stdout is the intended "mock
  email." Validate via: the mailer's signature matches a real transport, so
  swapping it is a one-file change.
- **Assumption:** A single `/me` route is a sufficient demonstration of
  "protected routes." Validate via: `requireAuth` is exported, so any further
  route opts in with one argument.
