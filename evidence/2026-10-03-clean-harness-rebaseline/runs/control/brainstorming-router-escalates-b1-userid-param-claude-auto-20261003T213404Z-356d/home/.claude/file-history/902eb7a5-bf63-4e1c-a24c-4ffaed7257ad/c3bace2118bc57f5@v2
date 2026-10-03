# Login userId + Session Design

Date: 2026-10-03
Status: Draft — awaiting user review

## Goal

Track who logged in. After a successful login the client knows the
authenticated user's `userId`, keeps it for the browser tab's session, and
exposes it to the rest of the app (other forms will need it later). The
login itself is recorded server-side.

Original request: "Add a userId parameter to the login function so we can
track who logged in." Refined during brainstorming: `userId` is *returned*
by login (the caller has no ID before authentication), not passed in.

## Decisions

| Question | Decision |
|---|---|
| Where userId comes from | Returned by `POST /login` after authentication |
| Backend | None exists yet; this spec defines the contract |
| Client-side lifetime | `sessionStorage` (survives reloads/navigation in a tab, cleared when the tab closes) |
| Where the login is recorded | Server-side, inside `/login` (no client tracking call, no `/events` endpoint) |
| Dev stub mode | Not wanted — with no backend, browser logins fail until one exists |

## Global Constraints

- No runtime or dev dependencies; tests use Node's built-in `node:test` and `node:assert`.
- Browser code is native ES modules loaded via `<script type="module">`; no bundler.
- Do not set `"type": "module"` in `package.json` — `src/index.js` and `src/utils.js` are CommonJS and must keep working.
- Test-first (TDD) for all new behavior.

## API Contract

Base URL: `API_BASE = "https://api.example.com"` (replaces the current `API_ENDPOINT` constant).

### `POST {API_BASE}/login`

Request headers: `Content-Type: application/json`
Request body: `{ "username": string, "password": string }`

Responses:
- `200` — `{ "userId": string }`. The server persists a login record
  `{ userId, timestamp }` as part of handling this request. That record is
  the tracking; the client sends nothing further.
- `401` — `{ "error": string }` for invalid credentials.
- Any other non-2xx — treated as failure; body may contain `{ "error": string }`.

Assumption: `userId` is an opaque string (not a number), validate via backend
team review when the backend is built.

## Components

All new browser modules live at the repo root alongside `app.js`.

### `api.js`

- Exports `API_BASE` and `async login(username, password)`.
- Sends the request above with `fetch`.
- Returns `{ userId }` on a 2xx response whose JSON body has a non-empty string `userId`.
- Throws `Error`:
  - non-2xx: message is the body's `error` string if present, otherwise `Login failed (HTTP <status>)`;
  - 2xx without a non-empty string `userId` (or unparseable JSON): `Malformed login response`;
  - `fetch` rejection: the rejection propagates as an `Error`.
- The only module that knows URLs.

### `session.js`

- Exports `setUserId(id)`, `getUserId()`, `clearSession()`.
- Storage key: `"userId"` in `sessionStorage`. The only module that touches `sessionStorage`.
- `getUserId()` returns `null` when unset.
- If `sessionStorage` is missing or any access throws, the function swallows
  the error: `setUserId`/`clearSession` become no-ops and `getUserId` returns `null`.
- Other forms read the logged-in user exclusively via `getUserId()`.

### `app.js`

- Keeps `validateForm(formData)` unchanged.
- Removes the old synchronous `login` stub and `API_ENDPOINT`.
- Exports `async handleLogin(username, password)`:
  1. `validateForm`; on failure, `console.error("Validation error:", error)` and return `{ success: false, error }` without any request.
  2. `await api.login(username, password)`.
  3. On success: `session.setUserId(userId)`, `console.log("Login result:", { success: true, userId })`, return `{ success: true, userId }`.
  4. On thrown error: `session.clearSession()`, `console.error("Login failed:", err.message)`, return `{ success: false, error: err.message }`.
- Attaches the submit listener (calls `preventDefault()`, reads the form
  fields, calls `handleLogin`) only when `typeof document !== "undefined"`,
  so Node can import the module in tests.

### `index.html`

- `<script src="app.js">` becomes `<script type="module" src="app.js">`.

## Data Flow

```
submit → preventDefault → handleLogin(username, password)
  → validateForm ──fail──→ console.error, no request
  → api.login ──throws──→ clearSession, console.error("Login failed: …")
  → { userId } → session.setUserId(userId) → console.log("Login result: …")

later, any form → session.getUserId() → userId | null
```

## Error Handling Summary

| Situation | Behavior | Session after |
|---|---|---|
| Missing username/password | `console.error`, no request | unchanged |
| Network failure | `console.error("Login failed: …")` | cleared |
| 401 / other non-2xx | `console.error` with server `error` or HTTP status | cleared |
| 2xx without string `userId` | `console.error("Login failed: Malformed login response")` | cleared |
| `sessionStorage` unavailable | Login still reported as success (server recorded it) | `getUserId()` → `null` |

Known consequence: until a backend exists at `API_BASE`, every browser login
takes the "Login failed" path. Accepted; no dev stub mode.

## Testing

`package.json` gains `"scripts": { "test": "node --test" }`. Tests live in
`test/*.test.js`. Node 26 auto-detects ESM syntax; a one-time
`MODULE_TYPELESS_PACKAGE_JSON` warning is accepted.

- `test/api.test.js` (stub `globalThis.fetch`, restore after each test):
  - request URL is `${API_BASE}/login`, method `POST`, JSON content type, body `{ username, password }`;
  - 200 `{ userId: "u1" }` resolves to `{ userId: "u1" }`;
  - 401 `{ error: "Invalid credentials" }` rejects with that message;
  - 500 with no `error` field rejects with `Login failed (HTTP 500)`;
  - `fetch` rejection rejects;
  - 200 with missing/non-string/empty `userId` rejects with `Malformed login response`.
- `test/session.test.js` (in-memory fake on `globalThis.sessionStorage`):
  - set/get round-trip; `getUserId()` is `null` when unset; `clearSession()` removes it;
  - missing `sessionStorage` and a throwing `sessionStorage` both degrade to no-op / `null`.
- `test/app.test.js` (stub `fetch` and `sessionStorage`):
  - success stores `userId` and returns `{ success: true, userId }`;
  - failed login clears a pre-existing `userId` and stores nothing new;
  - validation failure makes no `fetch` call.

## Out of Scope

Logout UI, a real or mock backend, a `/events` endpoint or client-side event
tracking, token/cookie authentication, user-visible (non-console) error
messages, dev stub mode.
