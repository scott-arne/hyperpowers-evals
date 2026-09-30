# Login Audit Correlation — Design

Date: 2026-09-30
Status: Awaiting user review
Scope: this repository (browser frontend) only

## Problem

The request that started this work was "add a `userId` parameter to the login
function so we can track who logged in." Clarification changed its shape
substantially:

- "Track" means a **security/compliance** audit trail, not console logging and
  not product analytics.
- The mechanism must **work across the app**; other forms will need it later.
- The service that actually authenticates (`API_ENDPOINT`) is **owned by us**,
  but is **out of scope** for this design.
- There is **no existing audit schema or log sink** to conform to.

A browser cannot produce a compliance-grade audit trail. `app.js` runs on the
user's machine, so any claim it makes about who logged in is attacker
controlled: it can be forged, suppressed, or replayed. For a record of "who
accessed what, when" to be evidence, it must be written by the party that
verifies the credentials.

Therefore the authoritative trail is server-side work that **is not designed
here**. This spec covers only what the frontend can honestly contribute:

1. **Correlation** — tying a browser login attempt to the server's record.
2. **Identity propagation** — a single, consistent way for this and future
   forms to carry the authenticated user's identity.

### What this design does not deliver

This is stated first because it is the most important thing to carry forward:
**nothing in this spec is the compliance guarantee.** Implementing all of it
does not produce an audit trail that would satisfy a compliance review. It
makes the frontend ready to correlate with one. The authoritative trail
requires a separate backend design covering event schema, storage,
tamper-resistance, and retention.

## Assumed backend contract

Because the backend is out of scope, the following is an **assumption**, not an
agreement. If the backend team lands something different, the frontend contract
below changes with it.

- The client sends an `X-Correlation-Id` header on each request.
- On successful authentication the server responds with `{ userId, sessionId }`.
- The server writes the authoritative audit record itself, keyed by the
  correlation id it received.
- The real session is held in an HttpOnly cookie owned by the server.

## Approach

Three approaches were considered. The chosen one is **C, an audited request
chokepoint**.

- **A — shared auth-context module.** Identity returned by the server is held
  in a module other forms read from. Lighter, but each form must remember to
  use it.
- **B — explicit `userId` parameter threaded through every form.** This is the
  literal original request. Rejected: no user id exists before authentication,
  so it would have to be a client-generated pseudonymous device id. That
  conflates a forgeable client value with an authenticated identity, and
  placing a client-invented id into a compliance record defeats its purpose.
- **C — audited request chokepoint (chosen).** One `apiRequest()` wrapper that
  every form uses; it attaches the correlation id and current identity in a
  single place.

C was chosen because the failure mode that matters, given "other forms will
need it later" plus a compliance purpose, is a future form silently not being
audited. A chokepoint makes that impossible rather than merely discouraged. Its
extra cost is small here because the repository is nearly empty.

No independent Codex approaches were obtained: the approach gate ran, and the
Codex companion returned an empty response (an incomplete call, not retried per
the gate's one-shot rule). The approach set above is single-source.

**Consequence for the original request:** `login` does **not** gain a `userId`
parameter. Its signature stays `(username, password)`. The identity arrives
from the server after authentication and is stored in the session context;
other forms read it there.

## Architecture

### Module system

`app.js` is currently a plain global browser script, which cannot be unit
tested because a global cannot be imported. The new code is therefore written
as ES modules, and `app.mjs` is loaded via `<script type="module">`.

The `.mjs` extension is used rather than setting `"type": "module"` in
`package.json`, because that setting is package-wide and would break the
existing CommonJS files `src/index.js` and `src/utils.js` (an unrelated Node
entry point that must stay untouched).

Known cost: some static file servers serve `.mjs` with an incorrect MIME type,
which browsers reject for module scripts. If that is hit in deployment, the
alternative is `"type": "module"` plus renaming the two `src/` files to
`.cjs`.

### Modules

Each new module is DOM-free and takes its dependencies by injection, so it is
testable in Node without a browser.

| Module | Responsibility |
|---|---|
| `src/web/correlation.mjs` | Mints a correlation id per attempt (`crypto.randomUUID`). |
| `src/web/session-context.mjs` | Holds the `{ userId, sessionId }` the server returned. `get` / `set` / `clear`. Never invents an id. |
| `src/web/api-request.mjs` | The chokepoint. Takes `fetch` injected; attaches the correlation id; the only path to the network. |
| `app.mjs` | `login(username, password)`, now async, routed through `apiRequest`. Submit handler keeps its current shape. |

`app.js` is **renamed** to `app.mjs` (not copied), and the `<script>` tag in
`index.html` gains `type="module"` and points at the new filename. Renaming
rather than leaving both avoids two divergent copies of the login path, which
in a compliance context would be a live hazard.

`src/index.js` and `src/utils.js` are unrelated and unchanged.

### The client does not send the user id

`apiRequest` attaches the `X-Correlation-Id` header. It does **not** send the
`userId` from the session context.

This is deliberate and follows the reasoning that rejected approach B. If the
browser sent a `userId` and the server recorded it, a client-supplied value
would be entering the audit record — the same forgery problem, one layer down.
The server already knows the caller's identity from the HttpOnly session
cookie, which the client cannot read or alter.

The `userId` in the session context is therefore for **client-side use only**:
rendering the signed-in user and letting support correlate a report. It is
never evidence of identity.

## Data flow

1. The submit handler reads `username` and `password` from the DOM and
   validates with the existing `validateForm`, which is unchanged.
2. `login(username, password)` mints a correlation id.
3. `apiRequest` POSTs the credentials to `API_ENDPOINT` with the
   `X-Correlation-Id` header.
4. On success, the server's `{ userId, sessionId }` is stored in
   `session-context`, and `login` returns
   `{ success: true, userId, correlationId }`.
5. Later forms call `apiRequest`, which mints its own correlation id per
   request. No form passes a `userId`, and none is sent on the wire; the
   server identifies the caller from the session cookie.

### Client-side logging

`app.js:5` currently does `console.log("Logging in:", username)`. Console
output is not an audit record and must not resemble one. Client logging is
reduced to the correlation id only: no username, and never the password. The
correlation id is what lets a support report be tied to the server's real
record.

## Error handling

| Case | Behavior |
|---|---|
| Network failure / no response | `{ success: false, reason: 'network', correlationId }` |
| Retry | Reuses the **same** correlation id, so a retried attempt can be de-duplicated server-side instead of appearing as two access events. |
| Rejected credentials (401) | `{ success: false, reason: 'invalid-credentials' }`, with no distinction between an unknown user and a bad password. |
| Malformed success response (no `userId`) | Treated as a failure; the context is **not** set. The module refuses to invent an identity. |

A client-side failure does **not** mean the attempt went unaudited — the server
may have recorded it before the response was lost. The client must never
present its own failure as evidence that no access attempt occurred.

### Session storage

The session context is held **in memory only**, never in `localStorage`, so an
XSS bug cannot lift it. This depends on the assumption that the server holds
the real session in an HttpOnly cookie. Consequence: a page refresh requires
re-establishing identity.

## Testing

Unit tests only, using Node's built-in `node:test` and `node:assert`. This
keeps the repository at zero dependencies, matching its current setup, and
requires Node 18+. Added to `package.json`:
`"scripts": { "test": "node --test" }`.

Coverage:

- `correlation` — id uniqueness and format.
- `session-context` — `set`/`get`/`clear`; rejects a payload missing `userId`.
- `api-request` — attaches `X-Correlation-Id`; **does not** send a `userId`
  header even when the session context is populated; behavior on non-2xx;
  behavior when the injected `fetch` throws.
- `login` — success, rejected credentials, malformed response, and correlation
  id reuse across a retry.

### Known coverage gap

Unit tests only were chosen, so the DOM wiring in the submit handler — that the
form is actually connected to `login` — is covered by no test. This is the seam
most likely to break silently. It is an accepted trade for scope, recorded here
so the spec does not imply coverage that does not exist.

## Global constraints

- Scope is this repository only. The backend audit trail is a separate design.
- Zero runtime dependencies; `node:test` for unit tests.
- Node 18+ for `node:test` and `crypto.randomUUID`.
- Do not modify `src/index.js` or `src/utils.js`.
- Never log credentials; never log the username client-side.
- The frontend never mints, infers, or defaults a `userId`, and never sends
  one on the wire.
- Files touched: `app.js` (renamed to `app.mjs`), `index.html` (script tag),
  `package.json` (test script), plus the three new `src/web/*.mjs` modules and
  their tests.

## Open questions for the backend design

Not blocking this spec, but they must be resolved before the trail is real:

1. Audit event schema and storage.
2. Retention period and any regulatory regime that applies.
3. Tamper-resistance (append-only storage, signing).
4. Whether failed login attempts are audited (they usually must be).
5. Server-side de-duplication keyed on the correlation id.
