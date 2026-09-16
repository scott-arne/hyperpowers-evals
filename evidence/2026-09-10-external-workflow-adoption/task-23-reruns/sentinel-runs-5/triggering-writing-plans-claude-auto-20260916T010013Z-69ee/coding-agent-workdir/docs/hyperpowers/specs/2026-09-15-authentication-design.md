# Authentication for auth-skeleton — Design

Date: 2026-09-15
Status: Approved assumptions, pending implementation plan

## Problem

`auth-skeleton` is an Express app with an in-memory user array and a single
`/health` route. It needs authentication: registration, login issuing a JWT,
JWT-protected routes, 24-hour token expiry, and password reset over email.

## Scope and Posture

This is an **extremely minimal proof of concept**. It is not production
authentication, and the spec says so in the places where the shortcut matters.
Explicitly in scope:

- Register with email + password.
- Log in and receive a JWT.
- A protected route that requires a valid JWT.
- Tokens expire 24 hours after issue.
- Password reset initiated by email, completed with a reset token.

Explicitly out of scope: persistence, refresh tokens, token revocation /
logout, rate limiting, account lockout, email verification at registration,
password strength rules beyond a minimum length, CSRF, and HTTPS concerns.

## Assumptions

These were not confirmed with the user, who asked to proceed without
questions. Each is a decision the implementation commits to.

- **Assumption: no new npm dependencies.** Everything is built on `express`
  (already present) and the Node standard library. Validate via: `npm ls`
  shows `express` as the only dependency after implementation, and the test
  suite runs without a network install.
- **Assumption: Node 20+** is the runtime, so `node:test`, `fetch`, and
  `crypto.scrypt` are all available. Validate via: the test suite running
  under the developer's installed Node.
- **Assumption: email is mocked to stdout.** The user asked for mocks and
  stdout; no SMTP client, no message queue.
- **Assumption: the in-memory store stays in memory.** Restarting the process
  drops users, sessions, and reset tokens. That is acceptable for a POC.
- **Assumption: the signing secret comes from `process.env.JWT_SECRET`,
  falling back to a fixed development constant** with a warning printed on
  startup when the fallback is used.

## Architecture

Six focused modules under `src/`, plus the existing `app.js` as the wiring
point. Each module has one job and a small interface, so each can be tested
without standing up the whole app.

```
app.js                      Express wiring; exports `app`; starts listening
                            only when run directly.
src/store.js                The in-memory data: users, reset tokens.
src/passwords.js            hash(password) / verify(password, stored).
src/tokens.js               sign(payload) / verify(token) for HS256 JWTs.
src/mailer.js               sendPasswordResetEmail(...) — prints to stdout.
src/middleware/require-auth.js   Express middleware; attaches req.user.
src/routes/auth.js          The five HTTP endpoints.
```

### `src/store.js`

Owns all mutable state so no other module holds a module-level array.

- `users`: records of `{ id, email, passwordHash, createdAt }`. Email is the
  natural key; it is lowercased and trimmed on write and on lookup, so
  `Alice@Example.com` and `alice@example.com` are the same account.
- `resetTokens`: a `Map` from token string to
  `{ userId, expiresAt, usedAt }`.
- Functions: `findUserByEmail`, `findUserById`, `createUser`,
  `updatePassword`, `createResetToken`, `consumeResetToken`, and a `reset()`
  used by tests to clear state between cases.

`consumeResetToken` is the single place that enforces the token's one-shot
semantics: it returns the record only if the token exists, has not expired,
and has not already been used, and it marks it used in the same call.

### `src/passwords.js`

`scrypt` from `node:crypto` with a 16-byte random salt per password. Stored
form is `scrypt$<salt-hex>$<derived-hex>`, which keeps the algorithm tag in
the record so the format can change later. Verification recomputes the
derivation and compares with `timingSafeEqual`.

Rationale for `scrypt` over `bcrypt`: it is in the standard library, so the
no-new-dependencies constraint holds, and it is a genuine password KDF rather
than a bare hash.

### `src/tokens.js`

A hand-rolled HS256 JWT: base64url-encoded `{"alg":"HS256","typ":"JWT"}`
header, a payload of `{ sub, email, iat, exp }`, and an HMAC-SHA256 signature
over `header.payload`.

- `sign(payload)` sets `iat` to now and `exp` to now + 24 hours
  (`86400` seconds). The TTL is a named constant, `TOKEN_TTL_SECONDS`.
- `verify(token)` checks structural shape, recomputes the signature and
  compares it with `timingSafeEqual`, rejects any `alg` other than `HS256`,
  and rejects when `exp` is at or before the current time. It returns the
  payload on success and throws a tagged error on failure so the middleware
  can map causes to responses.

**This is POC code.** A real service should use a reviewed library
(`jsonwebtoken`, `jose`). The trade-off taken here is deliberate: roughly
forty readable lines with no install step, in exchange for carrying the
algorithm-confusion and parsing risks ourselves. The `alg` allow-list and the
constant-time signature comparison are the two mitigations that matter, and
both are required by this design rather than optional.

### `src/mailer.js`

`sendPasswordResetEmail({ to, token })` writes a formatted block to stdout
containing the recipient, the reset token, and a copy-pasteable
`POST /auth/reset-password` body. It returns nothing and never throws, so a
mail failure cannot leak account existence through the response.

### `src/middleware/require-auth.js`

Reads the `Authorization` header, requires the `Bearer <token>` form, calls
`tokens.verify`, looks the user up in the store, and sets
`req.user = { id, email }`. Any failure produces `401` with a JSON body of
`{ error: "..." }` — `missing token`, `invalid token`, or `token expired`.
Expiry is distinguished from other failures because a client needs to know to
re-authenticate.

### `src/routes/auth.js`

An Express `Router`, mounted at the app root.

| Method | Path | Auth | Behavior |
|---|---|---|---|
| POST | `/auth/register` | none | Validates email shape and a password of at least 8 characters. `409` if the email exists, otherwise creates the user and returns `201` with `{ id, email }`. Never returns a token — registration and login stay separate. |
| POST | `/auth/login` | none | Looks up the user and verifies the password. On success returns `200` with `{ token, expiresIn }`. On any failure returns `401` with a generic `invalid credentials`, identical for unknown email and wrong password. |
| GET | `/me` | required | Returns `{ id, email }` from `req.user`. This is the protected route that demonstrates the middleware. |
| POST | `/auth/forgot-password` | none | Always returns `200` with the same generic body regardless of whether the email exists. When it does exist, mints a reset token valid for one hour and hands it to the mailer. |
| POST | `/auth/reset-password` | none | Takes `{ token, password }`, consumes the reset token, validates the new password, and updates the hash. Returns `200` on success, `400` on an invalid, expired, or already-used token. |

### Request flow

Login: client posts credentials → route finds the user → `passwords.verify`
→ `tokens.sign` → JSON response carrying the token.

Protected access: client sends `Authorization: Bearer <token>` → middleware
verifies signature and expiry → loads the user → handler reads `req.user`.

Reset: client posts an email → route mints a token and calls the mailer →
the token appears on stdout → client posts token plus new password →
`consumeResetToken` validates and burns it → password hash is replaced.
Existing JWTs are **not** invalidated by a reset; without a revocation list
there is no way to, and saying so here is better than implying otherwise.

## Error Handling

- Validation failures → `400` with `{ error: "<what was wrong>" }`.
- Authentication failures → `401`, deliberately vague.
- Duplicate registration → `409`.
- Unexpected exceptions → an Express error handler returning `500` with
  `{ error: "internal error" }`, logging the stack to stderr.

Two responses are intentionally uninformative: login failure and
forgot-password. Both would otherwise let an anonymous caller enumerate
registered email addresses.

## Testing

`node:test` with `fetch` against the app bound to an ephemeral port
(`app.listen(0)`), started and stopped per test file. No new dependencies.
A `npm test` script runs `node --test`.

Cases the suite must cover:

- Register succeeds; a duplicate email is rejected with `409`.
- Register rejects a malformed email and a short password.
- Login with correct credentials returns a token; wrong password and unknown
  email both return the same `401` body.
- `/me` with a valid token returns the user.
- `/me` with no header, a malformed header, and a tampered signature each
  return `401`.
- `/me` with an expired token returns `401` and the `token expired` cause.
  The test constructs a token with a past `exp` through the signing helper
  rather than waiting.
- Forgot-password returns an identical response for a known and an unknown
  email.
- Reset-password with a valid token changes the password: the old one stops
  working and the new one logs in.
- A reset token cannot be used twice, and an expired one is rejected.

Test-only seam: `store.reset()` between cases, and a `tokens.sign` overload
accepting an explicit `exp` so expiry is testable without sleeping.

## Tooling

No linter or formatter is added; the user asked for an extremely minimal POC
and the repo has none configured. Unit-test infrastructure is set up as
described above, since the expiry and reset-token rules are not worth
verifying by hand.
