# Authentication for auth-skeleton — Design

Date: 2026-09-26
Status: Approved for planning

## Purpose

Add email/password authentication to the existing Express skeleton: registration,
login issuing a JWT, JWT-protected routes, 24-hour token expiry, and password
reset via a (mocked) email channel.

This is an explicitly minimal proof of concept. The goal is a working,
end-to-end-correct auth flow that a reader can follow in one sitting — not a
production-hardened identity service. Where the two conflict, this spec chooses
the POC and records the gap.

## Context

The repository currently contains:

- `app.js` — 16 lines: `express.json()`, a module-level `users = []`, a
  `GET /health` route, and `app.listen(3000)`.
- `package.json` — ESM (`"type": "module"`), one dependency (`express ^4.19.0`),
  one script (`start`).

There is no existing authentication flow, no persistence layer, no test
infrastructure, and no configured linting. Every component below is new.

## Global Constraints

These apply to every task in the resulting implementation plan.

1. **Zero new runtime dependencies.** Cryptography comes from `node:crypto`.
   JWT signing/verification and password hashing are implemented in-repo. This
   is a deliberate POC tradeoff: it keeps the surface readable and auditable,
   and avoids a dependency tree for a throwaway app.
2. **Mocks over infrastructure.** No database, no SMTP, no Redis. The user store
   stays an in-memory array; the mailer writes to stdout.
3. **stdout is the side channel.** Password-reset links are printed to the
   console. Nothing is emailed.
4. **Test infrastructure from the start:** the built-in `node:test` runner. No
   test framework dependency. A first passing test lands with the first module.
5. **No linter/formatter is configured.** Match the existing file's style
   (double quotes, two-space indent, semicolons, ESM imports).
6. **ESM throughout.** `import`/`export`, matching `"type": "module"`.

## Architecture

`app.js` is reduced to wiring. Each auth concern becomes a focused module with a
narrow interface, so it can be understood and tested without its neighbors.

```
server.js          starts the HTTP listener
app.js             builds and exports the Express app (no listen)
auth/
  store.js         in-memory users + reset tokens
  password.js      scrypt hash / verify
  token.js         HS256 JWT sign / verify
  mailer.js        mock email -> stdout
  middleware.js    requireAuth
  routes.js        the auth router
```

### Module contracts

**`auth/store.js`** — the only module that owns mutable state.

- `createUser({ email, passwordHash })` → user record, or throws on duplicate.
- `findByEmail(email)` → user or `undefined`. Email matching is
  case-insensitive; the address is stored lowercased and trimmed.
- `findById(id)` → user or `undefined`.
- `saveResetToken(userId, tokenHash, expiresAt)` — replaces any prior token for
  that user, so requesting a second reset invalidates the first.
- `consumeResetToken(tokenHash)` → `userId` or `null`; deletes on success,
  making the token single-use.
- `updatePassword(userId, passwordHash)`.

A user record is `{ id, email, passwordHash, createdAt }`. `id` is a
`crypto.randomUUID()`. The plaintext password is never stored or logged.

**`auth/password.js`** — no state, no I/O.

- `hash(plaintext)` → `"<saltHex>:<derivedKeyHex>"`, using `scryptSync` with a
  16-byte random salt and a 64-byte key.
- `verify(plaintext, stored)` → boolean, compared with
  `crypto.timingSafeEqual` to avoid leaking match position via timing.

Rationale for scrypt over bcrypt: it is in the standard library, it is a real
memory-hard KDF, and it costs no dependency. Constraint 1 is why.

**`auth/token.js`** — no state, no I/O.

- `sign(payload)` → compact JWS, `HS256`, header `{alg:"HS256",typ:"JWT"}`,
  claims `{ sub, email, iat, exp }` with `exp = iat + 86400` (24 hours).
- `verify(token)` → payload, or throws. Verification checks, in order:
  three-segment structure, `alg === "HS256"` read from the decoded header,
  signature equality via `timingSafeEqual`, then `exp` against current time.
- Base64url encode/decode helpers are local to this module.

The `alg` check is explicit and rejects `"none"`. Signature verification happens
before any claim is trusted.

**`auth/mailer.js`**

- `sendPasswordReset(email, token)` — prints a labeled block to stdout
  containing the recipient and the reset token. Returns nothing. This is the
  mock; swapping in a real transport means replacing this one function.

**`auth/middleware.js`**

- `requireAuth(req, res, next)` — reads `Authorization: Bearer <token>`, calls
  `token.verify`, and on success sets `req.user = { id, email }` and calls
  `next()`. On any failure responds `401 {"error":"unauthorized"}` and does not
  call `next()`. It never distinguishes "missing", "malformed", "bad
  signature", and "expired" to the client.

**`auth/routes.js`** — an `express.Router`, mounted at `/auth`.

## Endpoints

| Method | Path | Auth | Success | Purpose |
|---|---|---|---|---|
| POST | `/auth/register` | — | 201 | Create an account |
| POST | `/auth/login` | — | 200 | Exchange credentials for a JWT |
| POST | `/auth/forgot-password` | — | 202 | Request a reset token |
| POST | `/auth/reset-password` | — | 200 | Set a new password with a token |
| GET | `/auth/me` | Bearer | 200 | Protected-route proof |

### POST /auth/register

Body `{ email, password }`. Validates that both are non-empty strings, that
email contains `@`, and that password is at least 8 characters. Hashes the
password, creates the user, returns `201 { id, email }`.

- `400 {"error":"invalid email"}` / `{"error":"password too short"}`
- `409 {"error":"email already registered"}`

Registration does not return a token; the client logs in. This keeps the
credential-to-token exchange in exactly one place.

### POST /auth/login

Body `{ email, password }`. Looks up the user, verifies the password, returns
`200 { token, expiresIn: 86400 }`.

- `401 {"error":"invalid credentials"}` for both unknown email and wrong
  password — an identical body and status, so the endpoint does not reveal which
  addresses are registered.

When the email is unknown there is no stored hash to compare against, and
returning immediately would make "unknown address" measurably faster than "wrong
password". To avoid that timing signal, the handler verifies the supplied
password against a fixed dummy hash (computed once at module load) and then
fails. The work performed is the same on both paths.

### POST /auth/forgot-password

Body `{ email }`. If the user exists: generate 32 random bytes as a hex token,
store its SHA-256 hash with a 15-minute expiry, and pass the plaintext token to
the mailer, which prints it to stdout.

Always responds `202 {"status":"if that account exists, a reset link was sent"}`
— the same body and status whether or not the address is registered. This is the
account-enumeration defense; the branch is invisible to the caller.

Only the hash of the reset token is stored, so a dump of process memory does not
immediately yield usable tokens.

### POST /auth/reset-password

Body `{ token, password }`. Hashes the supplied token, consumes it from the
store (single-use), checks expiry, validates the new password against the same
rule as registration, hashes it, and updates the user. Returns
`200 {"status":"password updated"}`.

- `400 {"error":"invalid or expired token"}` for unknown, already-used, and
  expired tokens alike.
- `400 {"error":"password too short"}`.

### GET /auth/me

Behind `requireAuth`. Returns `200 { id, email }` from `req.user`. This exists to
demonstrate the protected-route mechanism; it is the acceptance surface for
"protected routes require a valid JWT".

## Data Flow

**Registration → login → protected access**

1. Client posts credentials to `/auth/register`; password is scrypt-hashed
   before it reaches the store.
2. Client posts the same credentials to `/auth/login`; on verify, `token.sign`
   issues a JWT with `exp` 24 hours out.
3. Client sends `Authorization: Bearer <jwt>` to `/auth/me`; `requireAuth`
   verifies signature then expiry, populates `req.user`, and the handler reads
   it. The store is not consulted on each request — the token is the assertion.

**Password reset**

1. Client posts an email to `/auth/forgot-password`.
2. A random token is generated; its SHA-256 hash and a 15-minute expiry go to
   the store; the plaintext goes to stdout via the mock mailer.
3. The operator reads the token off the console and posts it with a new password
   to `/auth/reset-password`.
4. The token is consumed, the password hash is replaced.

## Configuration

- `JWT_SECRET` — HMAC key. If unset, the app generates a random secret at boot
  and prints a clear warning that tokens will not survive a restart. Failing
  closed would block the POC; failing loudly is the compromise.
- `PORT` — defaults to `3000`, preserving current behavior.

## Error Handling

- Validation failures return `400` with a short `{"error": "..."}` string.
- Authentication failures return `401`. Authorization header problems and bad
  tokens are indistinguishable to the client.
- Duplicate registration returns `409`.
- No stack traces, internal messages, or store contents reach a response body.
- Handlers are synchronous apart from scrypt; a thrown error inside a handler
  surfaces through Express's default handler as a 500 with no body detail.

## Testing

`node:test` with `node --test`. `app.js` exports the app without listening, so
tests exercise it over an ephemeral port via `app.listen(0)` and `fetch`.

Unit coverage:

- `password.js` — hash is salted (two hashes of the same input differ), verify
  accepts the right password and rejects the wrong one.
- `token.js` — round-trip sign/verify; tampered payload rejected; tampered
  signature rejected; `alg: "none"` rejected; a token whose `exp` is in the past
  is rejected.
- `store.js` — duplicate email rejected, case-insensitive lookup, reset token is
  single-use.

Integration coverage over HTTP:

- register → login → `/auth/me` succeeds with the returned token.
- `/auth/me` returns 401 with no header, a malformed header, a garbage token,
  and an expired token.
- Login with a wrong password and login with an unknown email return byte-identical responses.
- `/auth/forgot-password` returns the same response for a known and an unknown
  address.
- Full reset cycle: request a token, capture it, reset, confirm the old password
  fails and the new one succeeds.
- A reset token cannot be used twice.

`package.json` gains `"test": "node --test"`.

## Out of Scope — Known Gaps

Recorded so they are decisions rather than oversights. Each is deliberate for a
POC and wrong for production:

1. **JWTs survive a password reset.** There is no token version, denylist, or
   session table, so a token issued before a reset remains valid until its
   24-hour expiry. This is the most significant gap: it means a password reset
   does not evict an attacker who already holds a token. Closing it requires
   per-user token versioning checked on every request — real work, and it
   reintroduces a store lookup per request.
2. **No rate limiting** on login or forgot-password. Both are brute-forceable.
3. **No refresh tokens.** A 24-hour expiry with no renewal means re-login.
4. **No email verification.** Any address can be registered without proving
   control of it.
5. **All state is in memory.** A restart drops every user and pending reset.
6. **No HTTPS or secure-cookie handling.** Tokens travel in a header over
   whatever transport the caller uses.

## Success Criteria

- A user can register, log in, and reach a protected route with the issued
  token.
- A protected route rejects absent, malformed, tampered, and expired tokens.
- An issued token's `exp` claim is exactly 24 hours after `iat`.
- A password reset can be completed end-to-end using only the token printed to
  stdout, and the token cannot be reused.
- `node --test` passes.
- `npm start` serves the app with no new dependencies installed.
