# Authentication Subsystem — Design

Date: 2026-09-22
Status: Approved (security posture confirmed by the user on 2026-09-22)

## Purpose

Add email/password authentication to the existing Express skeleton: registration,
login issuing a JWT, JWT-protected routes, 24-hour token expiry, and password
reset via a mocked email channel.

This is an explicitly minimal proof of concept. It is not production-ready and
the design records where it falls short rather than pretending otherwise.

## Global Constraints

- **Zero new npm dependencies.** `node:crypto` supplies HMAC-SHA256 and scrypt;
  `node:test` supplies the test runner. The app must install and run offline.
- **In-memory storage only.** Users and reset tokens live in process memory,
  consistent with the existing `users` array. Restart wipes all state.
- **Mocked email.** Reset links are printed to stdout. No transport is wired.
- **ES modules**, matching `"type": "module"` in `package.json`.
- **Tooling set up from the start:** unit-test infrastructure via `node:test`
  with an `npm test` script. No linter or formatter is configured; the codebase
  is too small to justify one and adding either would violate the
  zero-dependency constraint.
- No linting, formatting, e2e, or fuzz infrastructure. Out of scope for a POC.

## Accepted Security Tradeoffs

These were surfaced to the user before implementation and explicitly accepted.
They are the reason this build is a POC.

1. **24-hour tokens with no revocation.** No logout, no blocklist, no refresh
   rotation. A leaked token remains valid until it expires.
2. **Dev-fallback signing secret.** If `JWT_SECRET` is unset, the app signs with
   a hardcoded development constant and prints a warning to stdout at startup.
3. **Hand-rolled JWT handling.** The HMAC primitive is from `node:crypto`, but
   the encode/decode/compare logic is bespoke rather than `jsonwebtoken`.
4. **Reset tokens are printed to logs.** The mock mailer writes a full
   account-takeover credential to stdout. Logs are secrets in this app.

## Architecture

`app.js` reduces to wiring: middleware, route mounting, and `listen`. The
subsystem lives in focused modules, each with one purpose and a narrow surface.

| Module | Responsibility | Depends on |
|---|---|---|
| `src/store.js` | In-memory user and reset-token records; lookup and mutation | nothing |
| `src/passwords.js` | scrypt hashing and constant-time verification | `node:crypto` |
| `src/jwt.js` | Sign and verify HS256 JWTs with a 24h lifetime | `node:crypto` |
| `src/mailer.js` | Mock transport: format and print the reset link | nothing |
| `src/middleware.js` | `requireAuth` — extract, verify, attach `req.user` | `src/jwt.js` |
| `src/routes/auth.js` | The HTTP layer for all auth endpoints | all of the above |

The dependency graph is acyclic and one-directional: routes depend on services,
services depend on the standard library. No service imports a route.

### `src/store.js`

Exports a single `store` object wrapping two arrays so callers never touch the
arrays directly.

- `createUser({ email, passwordHash })` — returns the new user, assigns an `id`
  (an incrementing integer, sufficient in-memory).
- `findUserByEmail(email)` — case-insensitive; returns `undefined` when absent.
- `findUserById(id)`
- `updatePassword(id, passwordHash)`
- `createResetToken(userId)` — returns `{ token, expiresAt }`.
- `consumeResetToken(token)` — returns the associated user id and deletes the
  record, or `null` if the token is unknown, expired, or already used. Deletion
  on read is what makes reset tokens single-use.
- `userCount()` — backs the existing `/health` route.

Emails are normalized to lowercase on both write and read so `A@b.com` and
`a@b.com` are the same account.

### `src/passwords.js`

- `hashPassword(plaintext)` — generates a 16-byte random salt, derives a 64-byte
  key with `scryptSync`, returns `"<saltHex>:<keyHex>"`.
- `verifyPassword(plaintext, stored)` — re-derives with the stored salt and
  compares via `timingSafeEqual`. Returns `false` rather than throwing on a
  malformed stored value.

Synchronous scrypt is acceptable here: a POC serves one request at a time and
the blocking cost keeps the code readable.

### `src/jwt.js`

- `TOKEN_TTL_SECONDS = 86400` — the 24-hour requirement, as one named constant.
- `sign(payload)` — builds `{alg: "HS256", typ: "JWT"}`, merges `iat` and
  `exp = iat + TOKEN_TTL_SECONDS` into the payload, base64url-encodes both
  segments, and appends an HMAC-SHA256 signature over `"header.payload"`.
- `verify(token)` — returns `{ valid: true, payload }` or
  `{ valid: false, reason }` where `reason` is one of `"malformed"`,
  `"bad-signature"`, or `"expired"`. Signature is checked with `timingSafeEqual`
  **before** expiry, so an attacker cannot learn anything from a forged token's
  claims.
- Never throws. Callers branch on `valid`.

The secret resolves once at module load from `process.env.JWT_SECRET`, falling
back to a development constant with a stdout warning.

### `src/mailer.js`

- `sendPasswordResetEmail({ email, token })` — prints a clearly delimited block
  to stdout containing the recipient, the token, and a usable reset URL.

Its signature matches what a real transport would need, so replacing the body
is the entire migration path.

### `src/middleware.js`

- `requireAuth(req, res, next)` — reads `Authorization`, requires the `Bearer `
  prefix, verifies the token, and on success sets
  `req.user = { id, email }` from the payload before calling `next()`.
- On any failure responds `401` with `{ error: "<message>" }`. The message
  distinguishes a missing header from an invalid or expired token, since that
  distinction helps a legitimate client and tells an attacker nothing they
  couldn't determine by inspecting their own token.

### `src/routes/auth.js`

An `express.Router()` mounted at `/auth`, plus a protected `/me` route exported
for mounting at the root.

| Method | Path | Auth | Success | Behavior |
|---|---|---|---|---|
| POST | `/auth/register` | none | 201 | Validate, reject duplicates, hash, store, return `{id, email}` |
| POST | `/auth/login` | none | 200 | Verify credentials, return `{token, expiresIn}` |
| POST | `/auth/forgot-password` | none | 200 | Mint a reset token, print the email, always return the same body |
| POST | `/auth/reset-password` | none | 200 | Consume the token, replace the password hash |
| GET | `/me` | Bearer | 200 | Return the authenticated user's `{id, email}` |

## Data Flow

**Register.** `POST /auth/register {email, password}` → validate shape → reject
if the email exists → `hashPassword` → `store.createUser` → `201 {id, email}`.
The plaintext password is never stored and never logged.

**Login.** `POST /auth/login {email, password}` → look up user →
`verifyPassword` → `jwt.sign({sub: id, email})` → `200 {token, expiresIn}`.
A missing user and a wrong password produce the identical 401 body, so the
endpoint does not reveal which emails are registered.

**Protected access.** `GET /me` with `Authorization: Bearer <token>` →
`requireAuth` verifies signature then expiry → `req.user` populated →
handler returns the user.

**Password reset.** `POST /auth/forgot-password {email}` → if the user exists,
`store.createResetToken` and `mailer.sendPasswordResetEmail`; if not, do
nothing. Either way respond `200 {message: "If that email is registered, a
reset link has been sent."}`. Then `POST /auth/reset-password {token,
newPassword}` → `store.consumeResetToken` → on success `hashPassword` and
`store.updatePassword` → `200`. Reset tokens are 32 random bytes hex-encoded,
single-use, and expire after one hour.

Tokens issued before a password reset remain valid until they expire. Fixing
that needs a revocation mechanism, which tradeoff 1 explicitly excludes.

## Validation Rules

One shared validator keeps the rules in a single place:

- Email: a non-empty string containing `@` with at least one character either
  side. Deliberately loose — strict email validation is a known tarpit and this
  app never delivers mail.
- Password: a string of at least 8 characters. No composition rules.
- A request failing validation gets `400 {error: "<specific message>"}` and no
  side effects.

## Error Handling

| Condition | Status | Body |
|---|---|---|
| Malformed or missing fields | 400 | `{error: "<what is wrong>"}` |
| Email already registered | 409 | `{error: "Email already registered"}` |
| Bad credentials | 401 | `{error: "Invalid email or password"}` |
| Missing or invalid token | 401 | `{error: "<missing / invalid / expired>"}` |
| Invalid or expired reset token | 400 | `{error: "Invalid or expired reset token"}` |

Every handler returns JSON. No stack traces reach the client.

## Testing

`npm test` runs `node --test test/`.

**Unit — `test/jwt.test.js`**
- A signed token round-trips through verify with its payload intact.
- `exp` is exactly `iat + 86400`.
- A tampered payload segment fails with `"bad-signature"`.
- A token whose `exp` is in the past fails with `"expired"` (constructed by
  signing with an injected clock or a backdated payload, not by waiting).
- Garbage input fails with `"malformed"` rather than throwing.

**Unit — `test/passwords.test.js`**
- Hash then verify returns true for the correct password, false for a wrong one.
- Two hashes of the same password differ (salts are random).
- A malformed stored hash returns false rather than throwing.

**Integration — `test/auth.test.js`**, driving the Express app over a real
ephemeral port with `fetch`:
- Register → 201; registering the same email again → 409.
- Login with correct credentials → 200 with a token; wrong password → 401.
- `GET /me` with the token → 200 and the right user; without a header → 401;
  with a garbage token → 401.
- Full reset cycle: forgot-password → capture the token → reset-password →
  the old password fails and the new one logs in.
- Reusing a consumed reset token → 400.
- forgot-password for an unregistered email → 200 with the same body as for a
  registered one.

To make the integration tests drivable, `app.js` splits into `src/app.js`
(builds and returns the configured Express app) and `app.js` (imports it and
calls `listen`). Tests import the builder and bind their own port.

## Out of Scope

Refresh tokens, logout and revocation, rate limiting, account lockout, email
verification, OAuth or social login, roles and permissions, CSRF protection,
persistent storage, and HTTPS termination. Each is a deliberate omission for a
POC, not an oversight.
