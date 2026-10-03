# Persisted userId Session — Design

**Date:** 2026-10-03
**Status:** Draft, awaiting user review

## Goal

Track who logged in. After a successful login, the logged-in user's `userId`
is persisted in the browser and readable from any current or future form in
the webapp.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Source of `userId` | Returned by `login()` (from the server response), not passed in | The caller (login form) does not know a user's ID before login; a client-supplied ID is untrustworthy for tracking |
| Persistence | `localStorage` | Survives reloads, tabs, and browser restarts until cleared |
| Module format | Browser ES modules (`<script type="module">`), no build step | Explicit imports for future forms, no globals, no new tooling |
| Tests | Node built-in `node:test`, zero dependencies | Repo has no test infrastructure; cheapest useful setup |

## Global Constraints

- No new runtime or dev dependencies.
- Unit tests run with `npm test` using `node:test`.
- Only `session.js` may access `localStorage` directly.
- Never store secrets (passwords, tokens) in `localStorage` — `userId` only.

## Architecture

### `session.js` (new, project root)

Browser ES module; the single owner of persisted session state.

- `STORAGE_KEY = "app.session.userId"`
- `setUser(userId)` — stores `String(userId)` under `STORAGE_KEY`. Rejects
  `null`/`undefined`/empty string by throwing `TypeError` (a programming
  error, not a runtime condition).
- `getUser()` — returns the stored string, or `null` if absent.
- `clearUser()` — removes the key.

**Error handling:** `localStorage` access can throw (storage disabled, private
mode, quota exceeded). Each function wraps storage access in `try/catch`:
`getUser()` returns `null`; `setUser()` and `clearUser()` log
`console.warn` and return without throwing. Storage failure must never break
login.

**Testability:** functions resolve storage via `globalThis.localStorage` at
call time, so tests can install an in-memory fake on `globalThis` (and a
throwing fake to exercise the error path).

### `login()` changes (`app.js`)

- Signature unchanged: `login(username, password)`.
- Stub response gains a `userId`. Until the real API exists, the stub derives
  a placeholder: `userId: \`stub-${username}\`` with a comment marking it as a
  stand-in for the server-assigned ID.
- On `success: true`, `login()` calls `setUser(result.userId)` before
  returning. On failure, nothing is stored. (The current stub always
  succeeds, so the failure branch is untested until the real API exists.)
- Returns `{ success, user, userId }`.

To make `login()` testable from Node, it moves out of `app.js` into
`auth.js` (ES module, exports `login`). `app.js` keeps only DOM wiring and
`validateForm`, and imports `login` from `./auth.js`. `auth.js` must not touch
the DOM.

### `index.html`

`<script src="app.js">` becomes `<script type="module" src="app.js">`.
Note: ES modules do not load over `file://`; the page must be served (e.g.
`npx serve` or `python3 -m http.server`). README gets a one-line note.

### `package.json`

- Add `"scripts": { "test": "node --test" }`.
- Root browser modules use the `.js` extension and ESM syntax, while `src/`
  is CommonJS. To avoid flipping the whole package to `"type": "module"`
  (which would break `src/`), tests are written as `.mjs` files and import
  the root modules — Assumption: Node loads ESM-syntax `.js` files imported
  from `.mjs` via its syntax detection (Node ≥ 22.7 default), validate via
  running `npm test` on the installed Node version. If unsupported, fallback:
  add a `package.json` with `{"type":"module"}` scoped to a new `web/`
  directory holding the browser files.

## Data Flow

1. User submits form → `app.js` validates → calls `login(username, password)`.
2. `login()` gets (stub) response with `userId`.
3. On success → `setUser(userId)` → `localStorage["app.session.userId"]`.
4. Any form later → `import { getUser } from "./session.js"` → `userId` or `null`.

## Testing

`test/session.test.mjs`:
- `setUser` then `getUser` returns the ID; `clearUser` then `getUser` → `null`.
- `getUser` with nothing stored → `null`.
- `setUser(null | undefined | "")` throws `TypeError`.
- Throwing storage fake: `getUser` → `null`; `setUser`/`clearUser` do not throw.

`test/auth.test.mjs`:
- Successful `login` returns a `userId` and persists it (`getUser()` matches).
- Storage failure during `login` still returns `success: true`.

## Out of Scope

- Logout UI (`clearUser` exists for it), session expiry, real API call,
  server-side sessions, other forms, linting, E2E tests.
