# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T215637Z-cc94/coding-agent-workdir/docs/hyperpowers/specs/2026-10-03-login-user-session-design.md

	1	# Login User Session — Design
	2	
	3	**Date:** 2026-10-03
	4	**Status:** Draft, pending user review
	5	
	6	## Goal
	7	
	8	Track who logged in by capturing a `userId` on successful login and making it
	9	available across the app (reloads, navigation, and future forms) for the life of
	10	the browser tab.
	11	
	12	## Decisions
	13	
	14	- **The userId comes from the login result, not from the caller.** `login()` keeps
	15	  the signature `login(username, password)` and returns the `userId`. We dropped
	16	  the literal "add a userId parameter" request: no caller has an ID before
	17	  authentication, and an ID the caller supplies can be faked.
	18	- **Persistence:** a shared `session.js` module backed by `sessionStorage`. It
	19	  survives reloads and navigation and clears when the tab closes. No backend is
	20	  required.
	21	- **Tooling:** Node's built-in test runner (`node --test`), with no new
	22	  dependencies. No linter or E2E tests for now.
	23	
	24	## Global Constraints
	25	
	26	- No runtime or dev dependencies are added.
	27	- Unit tests run with `npm test` (`node --test`).
	28	- Browser behavior is unchanged except for the additions described here.
	29	
	30	## Components
	31	
	32	### `session.js` (new, repo root)
	33	
	34	A plain browser script loaded by `index.html` before `app.js`. It defines a global
	35	`Session` object, and also exports it via `module.exports` when `module` is
	36	defined, so Node tests can load it.
	37	
	38	| Function | Behavior |
	39	|---|---|
	40	| `setCurrentUser({ userId, username })` | Writes `JSON.stringify({ userId, username })` to `sessionStorage["currentUser"]`. Throws `Error` if `userId` is missing or an empty string. |
	41	| `getCurrentUser()` | Returns `{ userId, username }` or `null`. |
	42	| `getCurrentUserId()` | Returns `getCurrentUser()?.userId ?? null`. |
	43	| `clearSession()` | Removes `sessionStorage["currentUser"]`. |
	44	
	45	The storage backend is resolved when each function is called (the
	46	`sessionStorage` global), so tests can install a fake before calling.
	47	
	48	A header comment states the trust boundary: the stored ID is client-side context
	49	only, and servers must check identity from their own session or token.
	50	
	51	### `app.js` (modified)
	52	
	53	- `login(username, password)` returns `{ success, user, userId }`. The API is
	54	  still a stub, so `userId` is a stand-in derived from the username (for example
	55	  `"stub-" + username`), marked with a `// Stub:` comment like the existing one.
	56	- On submit, if `result.success` is true, it calls
	57	  `Session.setCurrentUser({ userId: result.userId, username: result.user })`.
	58	- The DOM wiring runs only when `typeof document !== "undefined"`.
	59	- When `module` is defined, it exports `{ login, validateForm }`.
	60	
	61	### `index.html` (modified)
	62	
	63	Adds `<script src="session.js"></script>` before `<script src="app.js"></script>`.
	64	
	65	### Consumers (future forms)
	66	
	67	Future forms call `Session.getCurrentUserId()` and never read `sessionStorage`
	68	directly.
	69	
	70	## Data Flow
	71	
	72	1. The user submits the form, and `validateForm` passes.
	73	2. `login(username, password)` returns `{ success, user, userId }`.
	74	3. On success, `Session.setCurrentUser(...)` saves the user to `sessionStorage`.
	75	4. Any page or script in the tab later calls `Session.getCurrentUserId()`.
	76	
	77	## Error Handling
	78	
	79	- **Storage unavailable (access or quota errors):** each `Session` function catches
	80	  the error and calls `console.warn`. `setCurrentUser` does nothing, and the
	81	  getters return `null`. Login still succeeds.
	82	- **Corrupt or invalid stored value** (unparseable JSON, or no `userId`):
	83	  `getCurrentUser()` calls `clearSession()` and returns `null`.
	84	- **Missing or empty `userId` passed to `setCurrentUser`:** throws, because that
	85	  is a bug in the calling code. Validation happens before any storage access, so
	86	  it throws even when storage is unavailable.
	87	- **Failed login:** nothing is written, and any previously saved user is left as
	88	  it is. Logging out happens only through an explicit `clearSession()`.
	89	
	90	## Testing
	91	
	92	Tests go in `tests/`, run with `node --test`. `package.json` gains
	93	`"scripts": { "test": "node --test" }`.
	94	
	95	`tests/session.test.js` uses a fake `sessionStorage` (a Map-backed
	96	`getItem`/`setItem`/`removeItem`) installed on `globalThis`, and covers:
	97	- set, then get, returning `{ userId, username }`
	98	- `getCurrentUserId()` returns the ID, or `null` when empty
	99	- `clearSession()` empties the storage
	100	- `setCurrentUser` throws when `userId` is missing or empty
	101	- a corrupt JSON value returns `null`, and the key is removed
	102	- a stored value with no `userId` returns `null`, and the key is removed
	103	- storage that throws: setter and getters don't crash, getters return `null`, and
	104	  a warning is logged
	105	
	106	`tests/app.test.js`:
	107	- `login("alice", "pw")` returns `success: true`, `user: "alice"`, and a
	108	  non-empty `userId`
	109	- loading `app.js` without `document` doesn't throw
	110	
	111	Manual check: open `index.html`, log in, confirm `currentUser` appears under
	112	DevTools → Application → Session Storage, and confirm a reload keeps it.
	113	
	114	## Out of Scope
	115	
	116	- Logout UI, session expiry, and sharing the session across tabs.
	117	- A real auth endpoint or server-side session.
	118	- Linting and E2E tooling.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T215637Z-cc94/home/.cache/hyperpowers/codex-review/9d0863624a5cd167a1d8a3f8ea5a5d1667d2484c/run-Yyo7Rq91/decisions.md

	1	# Approved design decisions (user-confirmed in chat, 2026-10-03)
	2	- Original request: "Add a userId parameter to the login function so we can track who logged in."
	3	- User chose: login() keeps (username, password) and RETURNS userId (no caller-supplied userId param; spoofable).
	4	- User clarified tracking: "It should persist and work across the app; other forms will need it later."
	5	- User chose persistence: shared session.js module backed by sessionStorage (not localStorage, not server cookie).
	6	- User approved design sections: components/data flow, error handling.
	7	- User chose tooling: node:test unit tests only (no lint, no E2E).


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
