# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T214419Z-a301/coding-agent-workdir/docs/hyperpowers/specs/2026-10-03-login-user-session-design.md

	1	# Login User Session — Design
	2	
	3	Date: 2026-10-03
	4	Status: Approved in chat; awaiting spec review
	5	
	6	## Goal
	7	
	8	Track who logged in. After a successful login, the user's ID is persisted
	9	in the browser and readable from anywhere in the app, so future forms and
	10	pages can identify the current user.
	11	
	12	## Decisions
	13	
	14	- **userId is returned by `login`, not passed in.** The caller does not know
	15	  the user's ID before authenticating, and a client-supplied ID is
	16	  spoofable. `login(username, password)` keeps its signature and returns
	17	  `userId` in its result.
	18	- **Storage: `localStorage`.** Persists across reloads, restarts, and tabs.
	19	  Cleared only by an explicit logout (`clearCurrentUser`).
	20	- **Module system: native ES modules.** Pages load scripts with
	21	  `<script type="module">`. Pages must be served over HTTP, not opened via
	22	  `file://`.
	23	
	24	## Global Constraints
	25	
	26	- No new runtime or dev dependencies. Tests use Node's built-in runner
	27	  (`node --test`); Node 26 is available and loads ESM-syntax `.js` files
	28	  without `"type": "module"` in `package.json`.
	29	- Do not add `"type": "module"` to `package.json` — `src/index.js` and
	30	  `src/utils.js` use CommonJS and must keep working.
	31	- Only `session.js` may touch `localStorage`.
	32	
	33	## Components
	34	
	35	### `session.js` (new, project root)
	36	
	37	The single owner of persisted session state. Storage key: `"currentUserId"`.
	38	
	39	| Export | Behavior |
	40	|---|---|
	41	| `setCurrentUser(userId)` | Stores `userId`. If `userId` is `null`, `undefined`, or `""`, does nothing. |
	42	| `getCurrentUserId()` | Returns the stored ID, or `null` if none is stored. |
	43	| `clearCurrentUser()` | Removes the stored ID (logout). |
	44	
	45	Accesses `localStorage` through `globalThis.localStorage` at call time (not
	46	captured at import), so tests can install a fake before each call.
	47	
	48	### `auth.js` (new, project root)
	49	
	50	Holds the pure logic moved out of `app.js`, so it is importable without a
	51	DOM.
	52	
	53	- `login(username, password)` → `{ success: true, user: username, userId }`.
	54	  `userId` is set to `username` as a placeholder, marked with a comment
	55	  stating it will come from the API response once the real POST to
	56	  `API_ENDPOINT` exists. `login` does not touch storage.
	57	- `validateForm(formData)` — moved unchanged.
	58	- `API_ENDPOINT` — moved with `login`.
	59	
	60	### `app.js` (modified)
	61	
	62	Becomes form wiring only. Imports `login`, `validateForm` from `./auth.js`
	63	and `setCurrentUser` from `./session.js`. On submit, after a result with
	64	`success: true`, calls `setCurrentUser(result.userId)`. On
	65	`success: false`, does not call `setCurrentUser` and does not clear an
	66	existing session. Existing console logging is kept.
	67	
	68	### `index.html` (modified)
	69	
	70	`<script src="app.js">` → `<script type="module" src="app.js">`.
	71	
	72	### `package.json` (modified)
	73	
	74	Add `"scripts": { "test": "node --test" }`.
	75	
	76	## Data Flow
	77	
	78	Form submit → `validateForm` → `login()` returns `{ success, user, userId }`
	79	→ on success, `setCurrentUser(userId)` → any later page or form calls
	80	`getCurrentUserId()`.
	81	
	82	## Error Handling
	83	
	84	- `localStorage` access can throw (storage disabled, some private-browsing
	85	  modes, quota exceeded). In `session.js`:
	86	  - `getCurrentUserId()` catches and returns `null` (treated as logged out).
	87	  - `setCurrentUser()` and `clearCurrentUser()` catch, emit `console.warn`,
	88	    and return normally. Login still succeeds; it just will not persist.
	89	- Empty IDs are never stored (see `setCurrentUser`).
	90	
	91	## Testing
	92	
	93	`npm test` runs `node --test`, which discovers `test/*.test.js`.
	94	
	95	**`test/session.test.js`** — installs an in-memory fake on
	96	`globalThis.localStorage` before each test:
	97	- set then get returns the ID
	98	- get with nothing stored returns `null`
	99	- clear removes the ID
	100	- `null`, `undefined`, `""` are not stored
	101	- when the fake's methods throw: get returns `null`; set and clear do not
	102	  throw
	103	
	104	**`test/auth.test.js`**:
	105	- `login` returns `success: true`, `user`, and `userId` equal to the
	106	  username
	107	- `validateForm` returns `{ valid: false, error: "Missing required fields" }`
	108	  when username or password is missing, `{ valid: true }` otherwise
	109	
	110	**Manual check:** serve the project root (e.g. `npx serve`), log in,
	111	reload, confirm `localStorage.currentUserId` is set in devtools.
	112	
	113	## Out of Scope
	114	
	115	Logout UI, session expiry, server-side login event tracking, cookie-based
	116	sessions. Each can be added later behind `session.js` without changing its
	117	callers.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T214419Z-a301/home/.cache/hyperpowers/codex-review/d4f2f5c395ab72a088b0bb8492a54edccea39758/run-GlyoDjHE/adjudications.md

	1	# Approved design decisions (from chat with the user)
	2	
	3	- Original request: "Add a userId parameter to the login function so we can track who logged in."
	4	- Pushed back: a userId *parameter* is unknowable pre-auth and spoofable. User approved instead: login(username, password) keeps its signature and RETURNS userId (placeholder = username until a real API exists).
	5	- User added: the ID "should work across the app and persist; other forms will need it later." Escalated to architectural path.
	6	- User chose localStorage for persistence (over sessionStorage / cookie).
	7	- User chose native ES modules (over global script / bundler); accepted that pages must be served over HTTP.
	8	- User approved Section 1 (session.js owns storage; login stays storage-free; submit handler persists; index.html uses type="module"; logout UI, expiry, server tracking out of scope).
	9	- User approved Section 2 (try/catch storage errors -> null / console.warn; reject empty IDs; failed login neither sets nor clears; node --test with in-memory localStorage fake; extract login/validateForm into auth.js for testability; manual check via npx serve).


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
