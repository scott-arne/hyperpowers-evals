# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T214423Z-9db7/coding-agent-workdir/docs/hyperpowers/specs/2026-10-03-current-user-session-design.md

	1	# Current-User Session — Design
	2	
	3	Date: 2026-10-03
	4	Status: Approved in brainstorming, pending spec review
	5	
	6	## Goal
	7	
	8	Record which user logged in, persist it across page loads, and expose it
	9	through one shared module that the login form and future forms all use.
	10	
	11	Original request: "Add a userId parameter to the login function so we can
	12	track who logged in." Decided instead: `login()` **returns** the userId
	13	rather than taking it as a parameter. The client has no verified userId
	14	before login; identity should come from whatever verified the credentials.
	15	
	16	## Decisions
	17	
	18	| Topic | Decision | Rationale |
	19	|-------|----------|-----------|
	20	| userId source | Returned by `login()`, signature unchanged | Caller cannot know a verified ID before login |
	21	| Persistence | `localStorage`, behind a session module | Survives reloads/restarts, shared across tabs; module keeps it swappable |
	22	| Module system | ES modules (`<script type="module">`) | Explicit dependencies; cheapest to adopt while there is one form |
	23	| Tracking scope | Current user only (no login history) | Cross-form reuse needs "who am I"; client-side history is not a trustworthy audit trail |
	24	| Tooling | Unit tests via `node:test` only | Zero dependencies; lint and E2E deferred |
	25	
	26	## Global Constraints
	27	
	28	- Unit tests run with `npm test` (`node --test`); no test dependencies.
	29	- No new runtime or dev dependencies.
	30	- Existing CommonJS code in `src/` is left untouched; do not add
	31	  `"type": "module"` to `package.json`.
	32	- Pages must be served over HTTP (ES modules do not load from `file://`).
	33	
	34	## Components
	35	
	36	### `session.js` (new, repo root, ES module)
	37	
	38	The only code that reads or writes the stored user.
	39	
	40	```js
	41	export function createSession(storage = globalThis.localStorage) {
	42	  return { setCurrentUser, getCurrentUser, clearCurrentUser };
	43	}
	44	export const session = createSession();
	45	```
	46	
	47	- Storage key: `"currentUser"`.
	48	- Stored value: JSON `{ "userId": string, "username": string, "loggedInAt": string }`
	49	  where `loggedInAt` is an ISO-8601 timestamp set by `setCurrentUser`.
	50	- `setCurrentUser({ userId, username })`: validates, stamps `loggedInAt`,
	51	  writes JSON.
	52	- `getCurrentUser()`: returns the parsed record or `null`.
	53	- `clearCurrentUser()`: removes the key.
	54	- `createSession(storage)` accepts any object with `getItem`, `setItem`,
	55	  and `removeItem`. Tests pass an in-memory fake; a server-backed version
	56	  can replace it later without changing any form.
	57	- `session` is created when the module loads. In Node, `globalThis.localStorage`
	58	  may be undefined. Creating the default instance must not throw in that
	59	  case; calls on it then follow the "storage not available" rules below.
	60	
	61	### `app.js` (modified)
	62	
	63	- Add `import { session } from './session.js';`.
	64	- `login(username, password)`: signature unchanged; returns
	65	  `{ success, user, userId }`. The stub sets `userId = username` and has a
	66	  comment marking where the real API response's ID will come from.
	67	- Submit handler: on `result.success`, call
	68	  `session.setCurrentUser({ userId: result.userId, username: result.user })`.
	69	  Writing the session is the caller's job, not `login()`'s.
	70	
	71	### `index.html` (modified)
	72	
	73	- `<script src="app.js">` becomes `<script type="module" src="app.js">`.
	74	
	75	### `package.json` (modified)
	76	
	77	- Add `"scripts": { "test": "node --test" }`.
	78	
	79	## Data Flow
	80	
	81	form submit → `validateForm` → `login(username, password)` →
	82	`{ success, user, userId }` → if `success`:
	83	`session.setCurrentUser({ userId, username: user })` → any form:
	84	`session.getCurrentUser()`.
	85	
	86	## Error Handling
	87	
	88	- **Failed login** (`success: false`): the session is not touched; the
	89	  previously logged-in user stays logged in.
	90	- **Corrupt stored data** (JSON that won't parse, a non-object value, or
	91	  `userId` missing or not a string): `getCurrentUser()` returns `null`
	92	  and removes the entry.
	93	- **Storage not available** (missing `localStorage`, or `getItem`/`setItem`/`removeItem`
	94	  throwing, e.g. Safari private mode or quota exceeded):
	95	  - `setCurrentUser` catches the error, calls `console.error`, and does not throw.
	96	  - `getCurrentUser` returns `null`.
	97	  - `clearCurrentUser` catches the error, calls `console.error`, and does not throw.
	98	- **Programming error**: `setCurrentUser` called with `userId` missing or
	99	  not a non-empty string throws `TypeError`. Input is validated before any
	100	  storage access.
	101	
	102	## Testing
	103	
	104	`test/session.test.js` imports `../session.js`. Each test builds a fresh
	105	in-memory fake storage and passes it to `createSession`.
	106	
	107	1. set then get returns `userId`, `username`, and a valid ISO `loggedInAt`.
	108	2. get with nothing stored returns `null`.
	109	3. clear removes the stored user.
	110	4. A second set overwrites the first.
	111	5. JSON that won't parse under `currentUser`: get returns `null` and the entry is removed.
	112	6. A stored record with no `userId`: get returns `null`.
	113	7. Storage whose `setItem` throws: set does not throw and `console.error` is called.
	114	8. Storage whose `getItem` throws: get returns `null`.
	115	9. set with no `userId` throws `TypeError`.
	116	10. `createSession(undefined)` does not throw; get returns `null` and set does not throw.
	117	
	118	Assumption: Node detects ES module syntax in `session.js` and the test file
	119	without `"type": "module"`. Validate by running `npm test` on Node 26.
	120	
	121	`app.js` has no automated tests (it runs DOM code at load, and the new
	122	logic is just wiring). Check it by hand: serve the repo over HTTP, log in,
	123	confirm `localStorage.currentUser` holds the record, reload, and confirm it
	124	is still there.
	125	
	126	Implementation is TDD: write the session tests first and see them fail,
	127	then write the module to make them pass.
	128	
	129	## Out of Scope
	130	
	131	- Logout UI (`clearCurrentUser` exists for when one is added).
	132	- Login history or audit trail.
	133	- Server-side sessions and the real API call.
	134	- Lint/format and E2E tooling.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T214423Z-9db7/home/.cache/hyperpowers/codex-review/346b1591b6655384a12bf348dd9ae6fc724a2cdc/run-W0pE1C8O/adjudications.md

	1	# Approved design context (brainstorming, 2026-10-03)
	2	
	3	Original user request: "Add a userId parameter to the login function so we can track who logged in."
	4	Repo: browser login form (index.html + app.js, plain script), stub login() returning { success, user }.
	5	
	6	User decisions:
	7	- userId source: user said "your call" between returning it from login() vs a new parameter; Claude chose returning it (signature unchanged) because the client has no verified ID before login.
	8	- Requirement from user: "It should persist, and work across the app — other forms will need it later."
	9	- Persistence: localStorage behind a session module (user chose).
	10	- Module system: ES modules (user chose); pages must be served over HTTP.
	11	- Tracking scope: current user only, no login history (user chose).
	12	- Tooling: unit tests via node:test only; no lint, no E2E (user chose).
	13	- User approved design sections 1 (components), 2 (data flow / error handling), 3 (testing).


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
