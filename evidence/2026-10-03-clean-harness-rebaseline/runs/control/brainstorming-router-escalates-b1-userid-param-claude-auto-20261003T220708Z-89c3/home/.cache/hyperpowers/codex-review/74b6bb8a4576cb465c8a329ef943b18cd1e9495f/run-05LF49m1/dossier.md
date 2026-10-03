# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T220708Z-89c3/coding-agent-workdir/docs/hyperpowers/specs/2026-10-03-user-session-design.md

	1	# User Session Tracking — Design
	2	
	3	Date: 2026-10-03
	4	Status: Approved in chat, pending spec review
	5	
	6	## Goal
	7	
	8	Track who logged in. The logged-in user's ID must persist across page loads
	9	and be readable from anywhere in the app, so forms added later can use it
	10	without re-implementing storage.
	11	
	12	## Background
	13	
	14	- `app.js` contains `login(username, password)`, a stub that logs the
	15	  username and returns `{ success: true, user: username }`. Its only caller is
	16	  the `#login-form` submit handler.
	17	- `index.html` loads `app.js` as a classic `<script>`. There is no build step.
	18	- `src/` holds unrelated Node CommonJS files (`index.js`, `utils.js`).
	19	- No test runner, linter, or formatter is configured.
	20	
	21	The original request was to add a `userId` *parameter* to `login()`. The caller
	22	cannot know the user ID before authenticating, so the design instead has
	23	`login()` **return** the ID and persists it in a shared session module.
	24	
	25	## Global Constraints
	26	
	27	- No build step; browser code is native ES modules.
	28	- The page must be served over HTTP (e.g. `npx serve`) — ES modules do not load
	29	  from `file://`.
	30	- No new runtime or dev dependencies.
	31	- Unit tests use Node's built-in runner (`node --test`), invoked via
	32	  `npm test`.
	33	- `package.json` must NOT gain `"type": "module"` — `src/` is CommonJS. Node
	34	  (v22.7+; v26 verified) detects ES module syntax in `session.js` automatically.
	35	- No linter/formatter or end-to-end tooling in this change (user declined).
	36	
	37	## Architecture
	38	
	39	### `session.js` (new, ES module, repo root next to `app.js`)
	40	
	41	Sole owner of persisted session state. No other code touches `localStorage`
	42	for session data.
	43	
	44	- Storage: `localStorage`, key `"session"`, value JSON
	45	  `{ userId: string, username: string, loggedInAt: string }`
	46	  (`loggedInAt` is an ISO-8601 timestamp).
	47	- Exports:
	48	  - `setSession({ userId, username })` — writes the record with
	49	    `loggedInAt = new Date().toISOString()`. Returns nothing.
	50	  - `getSession()` — returns the stored record, or `null` when absent,
	51	    unparseable, or missing a `userId`. Never throws.
	52	  - `getUserId()` — `getSession()?.userId ?? null`.
	53	  - `clearSession()` — removes the key. Returns nothing.
	54	
	55	### `app.js` (modified, becomes an ES module)
	56	
	57	- `import { setSession } from "./session.js";`
	58	- `login(username, password)` — signature unchanged. On success returns
	59	  `{ success: true, user: username, userId }`. While the API is a stub,
	60	  `userId = username`, with a comment marking where the server-provided ID
	61	  replaces it.
	62	- Submit handler — on `result.success`, calls
	63	  `setSession({ userId: result.userId, username: result.user })` and logs
	64	  `"Logged in: <username> (userId: <userId>)"`.
	65	
	66	### `index.html` (modified)
	67	
	68	- `<script src="app.js">` → `<script type="module" src="app.js">`.
	69	
	70	### Future consumers
	71	
	72	Other forms/scripts use `import { getUserId } from "./session.js";` and never
	73	read `localStorage` directly.
	74	
	75	## Data Flow
	76	
	77	1. User submits `#login-form`.
	78	2. `validateForm` passes → `login(username, password)` returns
	79	   `{ success, user, userId }`.
	80	3. On success → `setSession({ userId, username })` → `localStorage["session"]`.
	81	4. Any later page/script → `getUserId()` / `getSession()` reads it back.
	82	5. Future logout → `clearSession()`.
	83	
	84	## Error Handling
	85	
	86	- **Corrupt or malformed stored value** (invalid JSON, non-object, or no
	87	  `userId`): `getSession()` returns `null` and removes the key.
	88	- **`localStorage` unavailable or throwing** (private mode, disabled storage,
	89	  quota exceeded): `setSession` and `clearSession` catch the error and emit
	90	  `console.warn`; `getSession` returns `null`. Login still succeeds — the
	91	  user is simply not remembered across reloads.
	92	- **Failed login**: nothing is written; any existing session is left unchanged.
	93	
	94	## Testing
	95	
	96	- New `test/session.test.mjs` using `node:test` and `node:assert/strict`.
	97	- Each test installs a fresh in-memory `localStorage` fake on `globalThis`
	98	  (`getItem`/`setItem`/`removeItem`), plus a throwing variant for failure
	99	  cases.
	100	- Cases:
	101	  - `setSession` then `getSession` round-trips `userId`, `username`, and a
	102	    valid ISO `loggedInAt`.
	103	  - `getUserId` returns the ID, and `null` when no session exists.
	104	  - `clearSession` removes the session.
	105	  - Invalid JSON → `getSession()` is `null` and the key is removed.
	106	  - Stored object without `userId` → `null` and the key is removed.
	107	  - Throwing storage → `setSession`/`clearSession` don't throw and warn;
	108	    `getSession` returns `null`.
	109	- `package.json` gains `"scripts": { "test": "node --test" }`.
	110	- `app.js`/`index.html` are verified manually: serve over HTTP, log in, confirm
	111	  `localStorage.session` is set and the console line shows the user ID.
	112	
	113	## Out of Scope
	114	
	115	- Real API call / server-issued IDs (stub keeps `userId = username`).
	116	- Logout UI (only `clearSession()` is provided).
	117	- Session expiry, multi-tab sync, cookies.
	118	- Lint/format and end-to-end tooling.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T220708Z-89c3/home/.cache/hyperpowers/codex-review/74b6bb8a4576cb465c8a329ef943b18cd1e9495f/run-05LF49m1/approved-design.md

	1	# Approved design decisions (from chat with user, 2026-10-03)
	2	- Original request: "Add a userId parameter to the login function so we can track who logged in."
	3	- User: should "work across the app and persist, and other forms will need it later"; delegated the param-vs-return choice ("whatever you think is best").
	4	- Decided: login() returns userId (not an input parameter); a shared session module persists it.
	5	- Persistence: localStorage (user chose), with clearSession() for future logout.
	6	- Module style: native ES module, page served over HTTP (user chose).
	7	- Stub: userId = username until a real API exists; no real ID format yet (user confirmed).
	8	- Error handling: storage failures warn and login still succeeds; corrupt data -> null + key removed (user confirmed).
	9	- Tooling: unit tests via node --test only; no lint/format, no e2e (user chose).


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
