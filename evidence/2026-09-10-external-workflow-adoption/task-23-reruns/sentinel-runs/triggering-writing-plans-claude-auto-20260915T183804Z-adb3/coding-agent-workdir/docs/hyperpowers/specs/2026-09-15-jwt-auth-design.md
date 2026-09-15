# JWT Authentication for auth-skeleton — Design

Date: 2026-09-15
Status: approved-by-assumption (partner asked for no clarifying questions)

## Goal

Add email/password authentication to the existing Express app: registration,
login issuing a JWT, JWT-protected routes, 24-hour token expiry, and a
password-reset flow whose email delivery is mocked to stdout.

This is an explicitly minimal proof of concept. It is not production-ready and
the spec says so in the places where that matters.

## Non-goals

- No database. The in-memory store stays in memory and is lost on restart.
- No refresh tokens, token revocation list, or session management.
- No real SMTP. No email templating.
- No rate limiting, account lockout, CSRF, or CORS configuration.
- No user roles or authorization beyond "is this request authenticated".

## Global constraints

- **Zero new runtime dependencies.** JWT signing/verification and password
  hashing both use node's built-in `node:crypto`. Rationale: a POC should run
  with `node app.js` against the dependencies already in `package.json`, and
  hand-rolling HS256 is ~40 lines against an installed-and-audited `jsonwebtoken`
  we do not otherwise need. This is a POC-scoped trade: a production build
  should adopt `jsonwebtoken` and `bcrypt`/`argon2` rather than keep these.
- **Test framework is built-in `node:test`**, run with `node --test`. No
  supertest, no jest.
- **ESM throughout** (`"type": "module"` is already set).
- Existing style: 2-space indent, double-quoted strings, named `export`s,
  comments that explain rationale rather than mechanics.
- Mocked email goes to stdout via `console.log`, as the partner specified.

## Architecture

```
app.js                    wires middleware + routes, exports createApp()
src/store.js              in-memory users + reset tokens
src/passwords.js          scrypt hash / verify
src/jwt.js                HS256 sign / verify with exp
src/mailer.js             mock mailer -> stdout
src/require-auth.js       Bearer-token Express middleware
src/routes/auth.js        the five auth endpoints
test/auth.test.js         end-to-end tests over a live ephemeral-port server
```

Each module has one job and a small surface, so a route handler can be read
without reading the crypto and vice versa.

### `src/store.js`

Owns all mutable state, so nothing else holds module-level arrays.

- `users`: array of `{ id, email, passwordHash, createdAt }`. Email is the
  natural key; it is lowercased and trimmed on write and on lookup so
  `Alice@x.com` and `alice@x.com` are the same account.
- `resetTokens`: `Map<token, { userId, expiresAt }>`.
- Exports: `createUser({ email, passwordHash })`, `findUserByEmail(email)`,
  `findUserById(id)`, `countUsers()`, `putResetToken(token, record)`,
  `takeResetToken(token)` (single-use: reads and deletes), `resetStore()` for
  tests.
- `id` is `crypto.randomUUID()`.

### `src/passwords.js`

- `hashPassword(plain)` -> `"<saltHex>:<derivedKeyHex>"` using
  `crypto.scryptSync(plain, salt, 64)` with a 16-byte random salt.
- `verifyPassword(plain, stored)` -> boolean, compared with
  `crypto.timingSafeEqual`. Returns `false` rather than throwing on a
  malformed stored value.

### `src/jwt.js`

Minimal HS256 JSON Web Token implementation.

- `signToken(payload, { expiresInSeconds = 86400 })` -> compact JWS string.
  Adds `iat` and `exp` (seconds since epoch) to the payload.
- `verifyToken(token)` -> `{ valid: true, payload }` or
  `{ valid: false, reason }` where reason is one of `"malformed"`,
  `"bad-signature"`, `"expired"`. Never throws.
- Base64url encode/decode helpers are module-private.
- Signature comparison uses `crypto.timingSafeEqual` on equal-length buffers.
- Secret comes from `process.env.JWT_SECRET`, defaulting to a hardcoded
  development value. The default is logged as a warning at startup so nobody
  ships it by accident.

### `src/mailer.js`

- `sendPasswordResetEmail({ to, token })` prints a clearly-delimited block to
  stdout containing the recipient, the token, and a copy-pasteable reset URL,
  and pushes the same message onto an exported `sentEmails` array. This is the
  mock the partner asked for; the reset token is deliberately visible in the
  log because there is no inbox to read, and `sentEmails` is the inbox tests
  read instead of scraping stdout.
- `clearSentEmails()` empties that array between tests.

### `src/require-auth.js`

Express middleware. Reads `Authorization: Bearer <token>`.

- Missing or non-Bearer header -> `401 { error: "missing token" }`.
- `verifyToken` failure -> `401 { error: "invalid token" }` for malformed or
  bad-signature, `401 { error: "token expired" }` for expired. Distinguishing
  expiry is useful to a client and leaks nothing a client does not already
  hold.
- Success -> sets `req.user = { id, email }` from the payload and calls
  `next()`.

### `src/routes/auth.js`

Exports `authRouter`, an `express.Router()` mounted at `/auth`.

| Method | Path               | Auth | Behavior |
|--------|--------------------|------|----------|
| POST   | `/register`        | no   | Validates email/password, rejects duplicates, hashes, creates user. `201 { id, email }`. |
| POST   | `/login`           | no   | Verifies credentials, issues 24h JWT. `200 { token, expiresIn: 86400 }`. |
| GET    | `/me`              | yes  | `200 { id, email }` from `req.user`. The protected-route demonstration. |
| POST   | `/forgot-password` | no   | Always `200 { ok: true }`. If the email matches a user, mints a 1-hour single-use reset token and "mails" it to stdout. |
| POST   | `/reset-password`  | no   | Consumes token, re-hashes new password. `200 { ok: true }`. |

Validation rules, applied uniformly:

- `email` must be a string containing `@` with non-empty local and domain
  parts. Deliberately loose; full RFC validation is out of scope.
- `password` must be a string of at least 8 characters.
- Failures -> `400 { error: "<what is wrong>" }`.

Security behaviors that are cheap and worth keeping even in a POC:

- Registration with an existing email returns `409 { error: "email already
  registered" }`. This is an intentional enumeration trade-off: a registration
  form has to tell the user the address is taken to be usable.
- Login failure returns the same `401 { error: "invalid credentials" }` whether
  the email is unknown or the password is wrong.
- `/forgot-password` returns `200` for unknown emails so it cannot be used to
  enumerate accounts.
- Reset tokens are single-use (`takeResetToken` deletes on read) and expire
  after one hour, independently of the 24-hour access-token lifetime.

### `app.js`

Refactored minimally: export `createApp()` returning the configured app, keep
`GET /health` (now reporting `countUsers()`), mount `authRouter` at `/auth`,
and only call `listen` when the module is the process entry point so tests can
bind their own port. The in-memory `users` array moves to `src/store.js`; no
other existing behavior changes.

## Data flow

Register -> validate -> `findUserByEmail` -> `hashPassword` -> `createUser` -> 201.

Login -> validate -> `findUserByEmail` -> `verifyPassword` -> `signToken({ sub: id, email })` -> 200 with token.

Protected request -> `requireAuth` -> `verifyToken` -> `req.user` -> handler.

Forgot -> validate -> lookup (silent on miss) -> `randomBytes(32).toString("hex")` -> `putResetToken` -> `sendPasswordResetEmail` -> 200.

Reset -> validate -> `takeResetToken` -> expiry check -> `findUserById` -> `hashPassword` -> mutate `user.passwordHash` -> 200. Existing JWTs issued before the reset stay valid until they expire; revoking them needs a token version or denylist, which is out of scope and noted here so the gap is deliberate.

## Error handling

Route handlers are fully synchronous: scrypt is used in its sync form, which
is acceptable for a POC and is the first thing to change under real load,
because it blocks the event loop for the duration of each hash. Every handler
validates input before touching the store and
returns a `{ error }` object with a 4xx status; there is no stack-trace leakage
because no handler throws on user input. Malformed JSON bodies are handled by
`express.json()`'s default error response.

## Testing

`test/auth.test.js`, run with `node --test`. Each test starts the app on port
`0`, resets the store, and drives it with global `fetch`.

Coverage:

1. Register returns 201 and a user id.
2. Duplicate registration returns 409.
3. Register rejects a short password and a malformed email (400).
4. Login with correct credentials returns a token; the token decodes with
   `exp - iat === 86400`.
5. Login with a wrong password returns 401 `invalid credentials`; unknown email
   returns the identical body.
6. `GET /auth/me` without a header returns 401.
7. `GET /auth/me` with a valid token returns the user.
8. `GET /auth/me` with a tampered signature returns 401.
9. An expired token is rejected — built by signing with
   `expiresInSeconds: -1` rather than by waiting.
10. Full reset round trip: forgot -> capture token from the store -> reset ->
    old password fails, new password logs in.
11. A reset token cannot be used twice (second attempt 400).
12. An expired reset token is rejected.

Unit-level tests for `jwt.js` and `passwords.js` round-tripping are included in
the same file; the surface is small enough that a second file would be
ceremony.

## Assumptions

- Assumption: the partner wants HTTP-level JSON APIs with no UI; validate by
  the fact that the existing app is JSON-only with no view layer.
- Assumption: a single-process server, so in-memory reset tokens are
  acceptable; validate against the existing in-memory user store, which already
  makes this trade.
