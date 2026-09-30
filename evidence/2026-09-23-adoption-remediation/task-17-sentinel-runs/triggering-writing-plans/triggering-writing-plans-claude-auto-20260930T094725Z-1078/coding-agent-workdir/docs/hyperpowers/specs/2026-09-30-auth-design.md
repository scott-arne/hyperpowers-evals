# Authentication for auth-skeleton — Design

Date: 2026-09-30
Status: approved for planning

## Purpose

Add email/password authentication to the existing Express app. Users register,
log in for a JWT valid 24 hours, present that token to reach protected routes,
and can reset a forgotten password through a mocked email channel.

This is an explicitly minimal proof of concept. It is not production auth, and
the Non-Goals section says so precisely enough that nobody mistakes it for one.

## Global Constraints

These apply to every task in the resulting implementation plan.

- **Zero new runtime dependencies.** `node:crypto` covers HS256 signing and
  scrypt password hashing. `jsonwebtoken` and `bcrypt` add nothing a POC needs,
  and `bcrypt` requires a native build.
- **Zero new dev dependencies.** Tests use the built-in `node:test` runner and
  global `fetch`.
- **ESM throughout.** The package is `"type": "module"`; keep `import`.
- **Storage stays in memory.** The scaffolding's `users` array is the model.
  Process restart wipes all state, by design.
- **Email is stdout.** The mock mailer prints; nothing leaves the process.
- **Test infrastructure is set up from the start** (`node:test`, one passing
  fixture before feature work). No linter or formatter is configured: the repo
  has none today, and adding a toolchain is outside this POC.
- **Every module is independently testable.** No module imports `app.js`.

## Assumptions

Each was chosen without consultation, on instruction to proceed without
questions. Each is cheap to revisit.

- *Assumption:* a signing secret from `AUTH_SECRET`, falling back to a
  hardcoded development value, is acceptable for a POC. Validate via: the
  fallback path logs a loud warning at startup, so the gap is visible rather
  than silent.
- *Assumption:* no refresh tokens, no logout, no token revocation. A 24-hour
  token simply expires. Validate via: confirm with the requester before any
  deployment beyond local demo.
- *Assumption:* email addresses are the unique user identifier, compared
  case-insensitively after trimming.
- *Assumption:* password policy is a minimum length of 8 characters and
  nothing else.
- *Assumption:* a single app process. In-memory reset tokens do not survive
  restarts or scale across workers.

## Architecture

`app.js` remains a thin wiring file. Auth logic lives in focused modules, each
with one purpose and a small interface, so each can be understood and tested
without loading the HTTP layer.

```
app.js                      wiring + listen (exports app for tests)
lib/config.js               secret, token lifetimes, warning on fallback
lib/jwt.js                  HS256 sign/verify over node:crypto
lib/passwords.js            scrypt hash + timing-safe verify
lib/mailer.js               mock sender -> stdout
lib/store.js                in-memory users + reset tokens
middleware/require-auth.js  Bearer token -> req.user
routes/auth.js              the auth endpoints
```

Dependency direction is one-way: `routes` and `middleware` depend on `lib`;
nothing in `lib` depends on Express or on another `lib` module except
`config`.

### lib/config.js

Exports `SECRET`, `TOKEN_TTL_SECONDS` (86400), `RESET_TTL_SECONDS` (900), and
`MIN_PASSWORD_LENGTH` (8). Reads `process.env.AUTH_SECRET`; when unset, uses a
fixed development string and prints a startup warning naming the variable.

### lib/jwt.js

A minimal HS256 implementation, roughly thirty lines.

- `sign(payload)` — base64url-encodes `{"alg":"HS256","typ":"JWT"}` and the
  payload, appends `iat` and `exp` (`iat + TOKEN_TTL_SECONDS`), and signs
  `header.payload` with `crypto.createHmac('sha256', SECRET)`.
- `verify(token)` — returns the payload, or throws a tagged error. Checks, in
  order: three dot-separated segments; the header declares `alg: "HS256"`
  (a token declaring `none` or any other algorithm is rejected rather than
  trusted); the signature matches under `crypto.timingSafeEqual`; and `exp` is
  in the future. Signature comparison happens before any payload claim is
  trusted.

### lib/passwords.js

- `hash(plaintext)` — 16 random salt bytes, `crypto.scrypt` to 64 bytes,
  returns `scrypt$<saltHex>$<hashHex>`.
- `verify(plaintext, stored)` — re-derives with the stored salt and compares
  under `crypto.timingSafeEqual`. Returns `false` rather than throwing on a
  malformed stored value.

Both are async, wrapping callback-style `scrypt` in a promise.

### lib/mailer.js

`sendPasswordReset(email, token)` writes a clearly delimited block to stdout
containing the recipient and the reset token, then resolves. This is the
mocked email channel; the block is the POC's inbox.

### lib/store.js

Wraps two in-memory collections behind named functions so no route reaches
into an array directly.

- Users: `createUser({email, passwordHash})`, `findByEmail(email)`,
  `findById(id)`, `updatePassword(id, passwordHash)`. Emails are normalized
  (trim + lowercase) on both write and lookup. Ids are `crypto.randomUUID()`.
- Reset tokens: `createResetToken(userId)` returns the plaintext token
  (32 random bytes, hex) while storing only its SHA-256 hash alongside
  `userId` and an expiry; `consumeResetToken(token)` looks up by hash,
  deletes the entry, and returns the `userId` only when unexpired. Deletion
  before the expiry check makes the token single-use even on a failed attempt.

### middleware/require-auth.js

Reads `Authorization`, requires the `Bearer ` prefix, verifies the token, and
attaches `req.user = {id, email}`. Any failure — missing header, malformed
token, bad signature, expired — yields `401 {"error":"unauthorized"}` with no
detail about which check failed.

### routes/auth.js

An Express router mounted at `/auth`, plus the protected `GET /me` mounted at
the root in `app.js`.

| Method | Path | Body | Success | Failures |
|---|---|---|---|---|
| POST | `/auth/register` | `{email, password}` | `201 {id, email}` | `400` invalid input; `409` email taken |
| POST | `/auth/login` | `{email, password}` | `200 {token, expiresIn}` | `400` missing fields; `401` invalid credentials |
| GET | `/me` | — | `200 {id, email}` | `401` |
| POST | `/auth/forgot-password` | `{email}` | `202 {ok: true}` | `400` missing email |
| POST | `/auth/reset-password` | `{token, password}` | `200 {ok: true}` | `400` invalid input; `401` invalid or expired token |

Two behaviors are deliberate rather than incidental:

- **No user enumeration.** `/auth/login` returns the same `401` body for an
  unknown email and a wrong password. `/auth/forgot-password` returns `202`
  whether or not the address is registered, and only sends when it is.
- **Reset tokens are independent of access tokens.** They expire in 15
  minutes, are single-use, and are stored hashed, so the in-memory store never
  holds a value that could be replayed.

A successful reset changes the password only; existing access tokens remain
valid until they expire. Revocation is a Non-Goal, and this is the visible
consequence of that.

## Data Flow

**Register** — validate → normalize email → reject duplicate → scrypt hash →
`createUser` → `201` with id and email, never the hash.

**Login** — find user → verify password → `sign({sub: id, email})` → return
token and `expiresIn`. A missing user still runs a password verification
against a dummy hash so the response time does not reveal existence.

**Protected request** — `require-auth` verifies and populates `req.user`; the
handler reads `req.user.id` and never re-parses the token.

**Reset** — `forgot-password` finds the user, mints a token, hands it to the
mailer (stdout), and returns `202` regardless. `reset-password` consumes the
token, validates the new password, hashes it, and updates the user.

## Error Handling

- Every error response is JSON: `{"error": "<machine-readable-code>"}`.
- Validation failures name the problem (`invalid_email`, `password_too_short`).
- Authentication failures never do — `unauthorized` covers all of them.
- `express.json()` is already mounted; malformed JSON is caught by an error
  handler returning `400 {"error":"invalid_json"}` rather than an HTML stack.
- No handler leaks a stack trace or an internal message to the client.

## Testing

`node:test` with the built-in runner; `node --test` as the `test` script.
`app.js` exports the app and only calls `listen` when run directly, so tests
bind it on port 0 and drive it with `fetch`.

Unit tests, no HTTP:

- `lib/jwt.js` — round-trip; rejects a tampered payload; rejects a bad
  signature; rejects `alg: none`; rejects an expired `exp`.
- `lib/passwords.js` — verifies a correct password; rejects a wrong one;
  two hashes of the same input differ (salted); malformed input returns false.
- `lib/store.js` — email normalization; duplicate detection; a reset token
  works once and not twice; an expired token is refused.

Integration tests over HTTP:

- register → login → `GET /me` succeeds end to end.
- `/me` without a token, with a garbage token, and with an expired token each
  return `401`.
- Duplicate registration returns `409`.
- Login with a wrong password returns `401` with the same body as an unknown
  email.
- Full reset cycle: forgot → capture the token → reset → old password fails,
  new password logs in.
- A consumed reset token is refused on reuse.

Token expiry is tested by signing with an injected clock or a negative TTL
rather than by waiting; no test sleeps.

## Non-Goals

Stated explicitly so the POC is not mistaken for production auth:

- No persistent storage, no database, no migrations.
- No real email delivery.
- No refresh tokens, logout, or token revocation.
- No rate limiting or brute-force protection on login or reset.
- No email verification on registration.
- No roles, scopes, or authorization beyond "has a valid token".
- No HTTPS, cookie, or CSRF handling; tokens travel in the `Authorization`
  header only.
- No account lockout, password history, or complexity rules beyond length.
