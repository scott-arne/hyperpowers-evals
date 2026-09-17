# Auth POC Design

Date: 2026-09-17
Status: approved (in chat, 2026-09-17)

## Purpose

Add authentication to the existing `auth-skeleton` Express app: registration,
login with JWT issuance, JWT-protected routes, 24-hour token expiry, and a
password reset flow. The deliverable is an **extremely minimal proof of
concept**: mocked cryptography and a mocked mailer that writes to stdout.

This is not a production auth system and must not be deployed as one. See
Security Posture.

## Global Constraints

- **Zero new runtime dependencies.** Everything is built on `express` (already
  present) plus the Node standard library (`node:crypto`, `node:test`).
- **Node 18+** is assumed, for the built-in test runner and global `fetch`.
- **ESM** throughout — the package is `"type": "module"`.
- **Mocks are explicit.** Every mocked component carries a comment saying what
  the real implementation would be and why the mock is unsafe.
- **Testing:** `node --test`, no framework. Unit tests for token and password
  helpers; route-level tests that start the app on an ephemeral port and drive
  it with `fetch`.
- **No linter or formatter** is configured for this POC. Code matches the
  existing style in `app.js`: double quotes, semicolons, two-space indent.
- Documents under `docs/hyperpowers/` stay uncommitted working files.

## Architecture

`app.js` remains the process entry point and does nothing but construct the app
and listen. Everything else lives in small single-purpose modules under `src/`,
each independently testable.

```
app.js                  entry point: createApp().listen(3000)
src/app.js              createApp() — wires json middleware and routes
src/store.js            in-memory users array + resetTokens Map
src/passwords.js        MOCK password hashing (sha256 + salt)
src/tokens.js           HS256 JWT sign/verify on node:crypto
src/middleware.js       requireAuth — Bearer parsing, verification, req.user
src/routes/auth.js      register / login / forgot-password / reset-password
src/routes/me.js        GET /me — the protected-route demonstration
src/mailer.js           MOCK mailer — prints the reset link to stdout
```

Data flow for a protected request:

```
client -> Authorization: Bearer <jwt>
       -> requireAuth -> tokens.verify() -> store.findById()
       -> req.user -> route handler
```

### Why hand-rolled JWT rather than `jsonwebtoken`

`jsonwebtoken` is the conventional choice. It is rejected here only because the
zero-dependency constraint means the POC must run without a successful `npm
install`, and HS256 sign/verify is roughly thirty lines of
`crypto.createHmac`. The cost is no algorithm negotiation, no RS256, and no
JWKS support. Both sign and verify sit behind `src/tokens.js`, so swapping in
the library later is a single-module change.

## Components

### `src/store.js`

Owns all mutable state. No other module holds data.

- `users`: array of `{ id, email, passwordHash, salt, createdAt }`. `id` is a
  `crypto.randomUUID()`. `email` is stored lowercased and trimmed.
- `resetTokens`: `Map<token, { userId, expiresAt }>`.
- Exported functions: `createUser`, `findByEmail`, `findById`,
  `updatePassword`, `putResetToken`, `takeResetToken` (reads and deletes in one
  step, enforcing single use), `revokeResetTokensForUser`, `reset` (test
  helper that clears both stores).

The existing `/health` route reports `users.length`; it reads the same array
through the store rather than keeping its own copy.

### `src/passwords.js`

**Mocked.** `hash(password, salt)` returns
`sha256(salt + password)` as hex; `verify(password, salt, expectedHash)`
compares with `crypto.timingSafeEqual`. A real implementation would use bcrypt
or argon2id with a work factor; a bare SHA-256 is trivially brute-forced.

### `src/tokens.js`

- `sign(payload, { expiresInSeconds = 86400 })` — builds
  `base64url(header).base64url(payload).base64url(hmacSha256(...))` with
  `alg: "HS256"`, `typ: "JWT"`, and claims `sub`, `email`, `iat`, `exp`.
- `verify(token)` — returns the payload, or throws a `TokenError` for a
  malformed token, a signature mismatch, or `exp` in the past. Signature
  comparison uses `crypto.timingSafeEqual`. The header's `alg` must be
  `HS256`, so a token claiming `alg: "none"` is rejected.
- Secret resolution: `process.env.JWT_SECRET`, falling back to a hardcoded
  development constant. The fallback logs a warning to stdout once at startup.

### `src/middleware.js`

`requireAuth(req, res, next)`:

- Missing or non-`Bearer` `Authorization` header → `401 { error:
  "missing_token" }`.
- `tokens.verify` throws → `401 { error: "invalid_token" }`. An expired token
  is reported as `401 { error: "token_expired" }` so the expiry behavior is
  observable in tests.
- Token valid but `sub` no longer resolves to a user → `401 { error:
  "invalid_token" }`.
- Otherwise sets `req.user = { id, email }` and calls `next()`.

### `src/mailer.js`

**Mocked.** `sendPasswordReset(email, token)` writes a single line to stdout:

```
[mock-mailer] password reset for <email>: POST /auth/reset-password { token: "<token>", password: "<new>" }
```

It returns the token so tests can assert on the flow without scraping stdout. A
real implementation would hand off to an SMTP or transactional-email provider
and would never return or log the token.

### `src/routes/auth.js`

| Method | Path | Behavior |
|---|---|---|
| POST | `/auth/register` | Body `{ email, password }`. Validates email shape and a minimum password length of 8. Creates the user. `201 { id, email }`. Duplicate email → `409 { error: "email_taken" }`. Invalid input → `400 { error: "invalid_input" }`. |
| POST | `/auth/login` | Body `{ email, password }`. On success `200 { token, expiresIn: 86400 }`. Unknown email or wrong password → the same `401 { error: "invalid_credentials" }`. |
| POST | `/auth/forgot-password` | Body `{ email }`. Always `202 { ok: true }`. If the user exists, mints a reset token and calls the mock mailer. |
| POST | `/auth/reset-password` | Body `{ token, password }`. Consumes the reset token, validates the new password, updates the hash, revokes that user's other reset tokens. `200 { ok: true }`. Unknown, consumed, or expired token → `400 { error: "invalid_token" }`. |

Reset tokens are 32 random bytes as hex, expire after **15 minutes**, and are
single-use.

### `src/routes/me.js`

`GET /me` behind `requireAuth`, returning `{ id, email }`. Its only purpose is
to demonstrate and test the protected-route path.

## Error Handling

Every failure returns a JSON body with a stable snake_case `error` string and
no stack trace. Handlers validate their own input; there is no shared
validation layer, which is proportionate at four endpoints. Login and
forgot-password deliberately return identical responses for existing and
non-existing accounts so the endpoints do not enumerate users.

## Testing

`npm test` runs `node --test test/`.

- `test/tokens.test.js` — round-trip sign/verify; tampered payload rejected;
  tampered signature rejected; `alg: "none"` rejected; expired token rejected
  (signed with a negative TTL rather than by waiting).
- `test/passwords.test.js` — correct password verifies, wrong password does
  not, the same password with different salts produces different hashes.
- `test/auth-routes.test.js` — register; duplicate register is 409; login
  returns a token; login with a wrong password is 401; `/me` without a token
  is 401; `/me` with a token returns the user; `/me` with an expired token is
  401 `token_expired`; full reset flow (forgot → reset → old password fails →
  new password logs in); a reset token cannot be reused.

Route tests call `createApp()` and `listen(0)`, driving the app with global
`fetch` against the assigned port, and reset the store between tests.

## Security Posture

This POC is deliberately unsafe in ways a real system must not be:

- Password hashing is SHA-256 with a salt, not a memory-hard KDF.
- The JWT signing secret falls back to a hardcoded development constant when
  `JWT_SECRET` is unset.
- Tokens are stateless and valid for their full 24 hours; there is no
  revocation, logout, or refresh.
- The password reset token is printed to stdout instead of emailed.
- There is no rate limiting on login, register, or forgot-password.
- All state is in memory and is lost on restart.

## Out of Scope

Persistence, refresh tokens and logout, rate limiting, email verification,
roles and permissions, real SMTP delivery, CSRF protection, and account
lockout.
