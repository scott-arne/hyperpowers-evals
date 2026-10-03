# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T212533Z-1554/coding-agent-workdir/docs/hyperpowers/specs/2026-10-03-login-user-tracking-design.md

	1	# Login User Tracking — Design
	2	
	3	**Date:** 2026-10-03
	4	**Status:** Approved design, pending spec review
	5	
	6	## Goal
	7	
	8	Track who logged in. Login records must persist durably, and the logged-in
	9	user's identity must be available to other forms in the app (current and future).
	10	
	11	## Key Decision: userId is an output of login, not an input
	12	
	13	The original request was "add a `userId` parameter to `login`". At call time the
	14	client does not yet know the user's ID — establishing identity is what login
	15	does — and a client-supplied ID is spoofable, so it cannot back an audit trail.
	16	Instead, the server authenticates, records the login, and returns `userId`.
	17	`login(username, password)` keeps its signature.
	18	
	19	## Global Constraints
	20	
	21	- No bundler or build step. Browser code is loaded via plain `<script>` tags.
	22	- Unit tests use Node's built-in `node:test` runner (zero dependencies), run via
	23	  `npm test`. No lint/format or end-to-end tooling in this scope.
	24	- `src/` (Node CommonJS entry point) is out of scope and stays untouched.
	25	
	26	## Architecture
	27	
	28	### Login API contract (backend-owned; stubbed in this repo)
	29	
	30	- Request: `POST /login` with JSON `{ username, password }`.
	31	- Success response: `{ success: true, userId: string, username: string }`.
	32	- Failure response: `{ success: false, error: string }`.
	33	- The **server** writes the audit record (at minimum `userId` and timestamp).
	34	  The client does not write or send audit records.
	35	
	36	Assumption: the real backend will implement this contract, validate via review
	37	with the backend owner before replacing the stub.
	38	
	39	### `session.js` (new, repo root) — shared session module
	40	
	41	Single responsibility: hold the current user's identity for the browser tab.
	42	
	43	- Storage: `sessionStorage`, one key (`"currentUser"`), value is JSON
	44	  `{ userId, username }`. Survives reloads and navigation within the tab;
	45	  cleared on tab close.
	46	- API:
	47	  - `setCurrentUser({ userId, username })` — writes the record.
	48	  - `getCurrentUser()` — returns `{ userId, username }` or `null`.
	49	  - `clearCurrentUser()` — removes the record (for failed login and future logout).
	50	- Exposure: browser global `window.Session`. Ends with a guard
	51	  `if (typeof module !== "undefined") module.exports = …` so Node tests can
	52	  `require` it.
	53	- The storage object is injectable (e.g. a factory `createSession(storage)`
	54	  with the global bound to `sessionStorage`) so tests can supply a fake or a
	55	  throwing storage.
	56	
	57	### `app.js` (modified)
	58	
	59	- `login(username, password)` signature unchanged. It remains a pure API call
	60	  and does not touch storage. The stub returns the contract's success shape with
	61	  a deterministic fake ID (`"user-" + username`), clearly commented as a stub.
	62	- Remove the `console.log("Logging in:", username)` line; the audit trail lives
	63	  server-side.
	64	- Form submit handler: on `success: true`, call
	65	  `Session.setCurrentUser({ userId, username })`; on `success: false`, call
	66	  `Session.clearCurrentUser()` and report the error.
	67	- The submit-handling logic is extracted into a function that takes its
	68	  dependencies (login, session) so it can be unit tested in Node; DOM wiring
	69	  stays a thin layer that only runs when `document` exists. Same
	70	  `module.exports` guard as `session.js`.
	71	
	72	### `index.html` (modified)
	73	
	74	Add `<script src="session.js"></script>` before `<script src="app.js"></script>`.
	75	
	76	## Data Flow
	77	
	78	1. User submits the form → `validateForm` (unchanged).
	79	2. `login(username, password)` → `{ success, userId, username }` or `{ success: false, error }`.
	80	3. Success → `Session.setCurrentUser({ userId, username })`.
	81	   Failure → `Session.clearCurrentUser()`.
	82	4. Any form, any page in the tab → `Session.getCurrentUser()?.userId`.
	83	
	84	## Error Handling
	85	
	86	- **Failed login:** nothing written; any existing session cleared so a previous
	87	  user's ID cannot persist past a failed login.
	88	- **Storage unavailable** (private mode, quota exceeded, disabled, access throws):
	89	  `session.js` catches. `setCurrentUser` logs a warning and does not throw —
	90	  login still succeeds. `getCurrentUser` returns `null`. `clearCurrentUser`
	91	  is a no-op.
	92	- **Corrupt stored value** (invalid JSON or missing `userId`): `getCurrentUser`
	93	  returns `null` and removes the key.
	94	
	95	## Testing
	96	
	97	Runner: `node:test` via `npm test` (`"test": "node --test"` in `package.json`).
	98	
	99	`session.js`:
	100	- set → get round-trip returns `{ userId, username }`.
	101	- get on empty storage returns `null`.
	102	- clear after set → get returns `null`.
	103	- corrupt JSON → get returns `null` and the key is removed.
	104	- storage whose methods throw → set does not throw, get returns `null`.
	105	
	106	`app.js` submit logic:
	107	- successful login writes `{ userId, username }` to the session.
	108	- failed login clears a pre-existing session and writes nothing.
	109	- invalid form does not call `login` and does not touch the session.
	110	
	111	## Out of Scope
	112	
	113	- Implementing the backend endpoint or the audit store.
	114	- Logout UI, session expiry, cross-tab persistence.
	115	- Linting/formatting, end-to-end tests.
	116	- Changes under `src/`.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T212533Z-1554/home/.cache/hyperpowers/codex-review/c9f4f6dc8f55c8084821d4645c4be3839af820a7/run-mFriVCeq/approved-design.md

	1	# Approved design decisions (user-confirmed in brainstorming)
	2	- Original request: "Add a userId parameter to the login function so we can track who logged in."
	3	- User clarified: tracking must PERSIST (audit of who logged in) and identity must work across the app; other forms will need it later.
	4	- Decision: userId is returned by the server from login, not passed in; server records the audit (user chose "Server-side").
	5	- Decision: client session stored in sessionStorage (user chose).
	6	- Decision: shared session.js module as window.Session global, script tag before app.js, no bundler. src/ untouched.
	7	- Decision: failed login clears session; storage errors are caught, never throw; corrupt data -> null + key removed.
	8	- Decision: tooling = unit test runner only (node:test, npm test). No lint, no e2e.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
