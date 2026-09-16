# Minimal Authentication POC — Design

Date: 2026-09-15
Status: Approved (in-chat, 2026-09-15)
Repository: `auth-skeleton` (Express, in-memory user store)

## Purpose

Add authentication to the existing Express scaffolding: registration,
JWT-based login, protected routes, 24-hour token expiry, and a password
reset flow. The deliverable is a proof of concept, not a production
service. Every external dependency that would normally require
infrastructure (password hashing library, email delivery) is replaced by
a mock with a realistic interface, so the POC runs with a single `npm
install` and no services.

## Global Constraints

These apply to every task in the implementation plan.

- **Extremely minimal.** Prefer the smallest implementation that
  satisfies the requirement. No abstraction that is not used by at least
  one caller today.
- **Mocks over infrastructure.** Password hashing and email delivery are
  mocked. Both mocks expose the interface their real counterpart would,
  so replacement is a single-file change.
- **stdout is the only side channel.** Reset links, warnings, and
  diagnostics are written with `console.log` / `console.warn`. No log
  files, no log library.
- **One new runtime dependency:** `jsonwebtoken`. Nothing else is added
  to `dependencies`.
- **ES modules.** `package.json` already declares `"type": "module"`;
  all new files use `import`/`export`.
- **Match the existing route style** in `app.js`: `app.<verb>(path,
  handler)` with `res.json(...)` bodies.
- **Tooling selected for this project:** unit-test infrastructure only,
  using the built-in `node:test` runner (zero new dependencies), wired
  to `npm test`. Linting/auto-formatting, end-to-end tests, and
  fuzz/mutation testing are explicitly NOT set up for this POC.

## Architecture

The current `app.js` holds wiring, the store, and routes together. It is
split into single-purpose modules so each piece can be understood and
tested on its own. `app.js` keeps only wiring and `app.listen`.

```
app.js                 express wiring, route mounting, listen; keeps GET /health;
                       exports the configured app so tests can drive it in-process
store.js               in-memory users array + resetTokens map + accessors
auth/hash.js           MOCK password hashing (hash / verify)
auth/tokens.js         JWT sign / verify, 24h expiry
auth/middleware.js     requireAuth — Bearer token -> req.user
auth/routes.js         express.Router for /auth/*
mailer.js              MOCK email delivery — writes to stdout
routes/me.js           express.Router for GET /me (protected-route demo)
```

Dependency direction is one-way: `app.js` -> routers -> (`store`,
`auth/*`, `mailer`). No module imports `app.js`.

### store.js

Owns all mutable state. Exports:

- `users` — array of `{ id, email, passwordHash }`. `id` is a
  monotonically increasing integer as a string.
- `findUserByEmail(email)` — case-insensitive lookup; emails are stored
  lowercased and trimmed.
- `findUserById(id)`
- `createUser({ email, passwordHash })` — returns the new user.
- `resetTokens` — `Map<token, { userId, expiresAt }>`.

State is process-local and not persisted. Restarting the server clears
all users and all reset tokens. This is an accepted limitation of the
POC: the reset flow can only be exercised within one process lifetime.

### auth/hash.js (mock)

Uses node's built-in `crypto`. `hash(password)` returns
`"mock$" + sha256(password)` as hex; `verify(password, stored)` recomputes
and compares. The `mock$` prefix makes it obvious in any dump that these
are not real hashes.

This is deliberately NOT a secure password hash — no salt, no work
factor. It exists so the POC has no native-build dependency. The
interface (`hash`, `verify`) matches what a bcrypt/argon2 wrapper would
expose, so swapping in a real implementation touches only this file.

### auth/tokens.js

Wraps `jsonwebtoken`.

- `signToken(user)` — payload `{ sub: user.id, email: user.email }`,
  signed with `HS256` and `expiresIn: "24h"`.
- `verifyToken(token)` — returns the decoded payload, or throws.
- Secret resolution: `process.env.JWT_SECRET`, falling back to a
  hardcoded development string. When the fallback is used, the module
  writes a one-time warning to stdout at startup.

### auth/middleware.js

`requireAuth(req, res, next)`:

1. Read the `Authorization` header. Missing, or not `Bearer <token>` →
   401.
2. `verifyToken`. Throws (invalid signature, malformed, or expired) →
   401.
3. Look up the user by `payload.sub`. Not found → 401.
4. Assign `req.user = { id, email }` and call `next()`.

Expiry is enforced by `jsonwebtoken`'s own `exp` check — the middleware
does not re-implement it.

### mailer.js (mock)

`sendPasswordResetEmail(email, token)` writes a formatted block to
stdout containing the recipient, the token, and a usable reset URL
(`http://localhost:3000/auth/reset` plus the token). It returns nothing
and never fails. This is the only delivery channel in the POC.

## Endpoints

All request and response bodies are JSON. All error responses use the
shape `{ "error": "<message>" }`.

### POST /auth/register

Request `{ email, password }`.

- Missing or non-string `email` or `password` → 400.
- `password` shorter than 1 character → 400. No other strength rule.
- Email already registered (case-insensitive) → 409.
- Success → 201 with `{ id, email }`. The password hash is never
  included in any response.

### POST /auth/login

Request `{ email, password }`.

- Missing fields → 400.
- Unknown email OR wrong password → 401 with the same message
  (`"invalid credentials"`), so the response does not reveal whether an
  account exists.
- Success → 200 with `{ token }`.

### GET /me

Protected by `requireAuth`. Success → 200 with `{ id, email }` taken
from `req.user`. This route exists to demonstrate that protected routes
require a valid JWT.

### POST /auth/forgot

Request `{ email }`.

- Missing or non-string `email` → 400.
- Always responds 200 with a fixed message, whether or not the account
  exists, to avoid account enumeration.
- When the account does exist: generate a token via
  `crypto.randomBytes(32).toString("hex")`, store
  `{ userId, expiresAt: Date.now() + 3_600_000 }` in `resetTokens`
  (1 hour), and call `mailer.sendPasswordResetEmail`.

Reset-token lifetime (1 hour) is intentionally shorter than the JWT
lifetime (24 hours); they are independent values.

### POST /auth/reset

Request `{ token, password }`.

- Missing fields → 400.
- Token not found, or `expiresAt` in the past → 400 with
  `"invalid or expired reset token"`. An expired token is deleted from
  the map when encountered.
- Success → replace the user's `passwordHash`, delete the token from the
  map (single use), respond 200.

Existing JWTs issued before a reset remain valid until they expire.
Token revocation is out of scope; this is noted so the behavior is not
mistaken for a bug.

## Error Handling

Route handlers validate their own input and return early with an
explicit status. There is no shared validation middleware and no schema
library — at this size, inline checks are clearer than the machinery
that would replace them.

Status codes used: 200, 201, 400 (malformed or missing input), 401
(authentication failure, invalid or expired JWT), 409 (duplicate email).

`auth/tokens.js` is the only place that catches `jsonwebtoken` errors;
callers see a thrown error or a decoded payload, not library-specific
error types.

## Testing

A single `node:test` suite covering the round trip, run with
`npm test`. `app.js` exports the configured `app` and only calls
`listen` when it is the process entry point. The suite starts the app on
an ephemeral port (`listen(0)`), reads the assigned port, and drives it
with node's global `fetch`. This keeps the fixed port 3000 out of the
tests and avoids adding an HTTP-assertion dependency such as
`supertest`.

Cases:

1. Register a new user → 201; the response body has no password field.
2. Register the same email again → 409.
3. Login with correct credentials → 200 and a token.
4. Login with a wrong password → 401.
5. `GET /me` with the token → 200 and the right email.
6. `GET /me` with no token → 401.
7. `GET /me` with a garbage token → 401.
8. `GET /me` with a token signed with `expiresIn: "-1s"` → 401,
   covering expiry without waiting 24 hours.
9. Forgot → reset → login with the new password succeeds and login with
   the old password fails.
10. Reset with an unknown token → 400.

Test state isolation relies on distinct email addresses per test rather
than a store reset, since the store is module-level.

## Out of Scope

Named explicitly so the plan does not drift into them: refresh tokens,
logout / token revocation, rate limiting, account lockout, email address
verification, password strength rules, CSRF, HTTPS/TLS, persistence
across restarts, user roles or authorization beyond "is authenticated",
and any real email transport.
