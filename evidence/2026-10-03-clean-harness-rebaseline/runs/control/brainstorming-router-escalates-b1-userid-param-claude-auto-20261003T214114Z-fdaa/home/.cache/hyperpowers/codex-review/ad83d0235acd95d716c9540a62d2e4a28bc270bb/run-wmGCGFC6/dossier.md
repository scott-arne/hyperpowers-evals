# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T214114Z-fdaa/coding-agent-workdir/docs/hyperpowers/specs/2026-10-03-login-session-design.md

	1	# Login Session Design
	2	
	3	Date: 2026-10-03
	4	Status: Draft — awaiting user review
	5	
	6	## Goal
	7	
	8	Track who logged in, and make the logged-in user available across the app
	9	(persisting across reloads) so future forms can read it.
	10	
	11	## Decisions
	12	
	13	- **userId comes from the login result, not an input parameter.** The client
	14	  does not know a user's ID before authenticating; accepting it as input would
	15	  let any caller assert any identity. `login(username, password)` keeps its
	16	  signature and returns `userId`.
	17	- **Persistence is a client-side session** in `localStorage`, lasting until
	18	  logout. No server-side login history.
	19	- **Sharing is via an ES module** (`session.js`), loaded with
	20	  `<script type="module">`.
	21	- **Placeholder userId:** until a real API exists, the `login()` stub derives
	22	  `userId` as `"user-" + username`, marked with a comment as a placeholder for
	23	  the server-issued ID.
	24	- **No logout button** for now; `logout()` is exported for future use.
	25	
	26	## Global Constraints
	27	
	28	- Tests use Node's built-in runner (`node --test`), no dependencies.
	29	- No linting/formatting setup.
	30	- `package.json` keeps its current (CommonJS) type; `src/` is untouched.
	31	- The page must be served over HTTP (ES modules do not load from `file://`).
	32	
	33	## Components
	34	
	35	### `session.js` (new) — sole owner of session storage
	36	
	37	```js
	38	const SESSION_KEY = "session";
	39	
	40	export function saveSession({ userId, username })
	41	export function getCurrentUser()
	42	export function clearSession()
	43	```
	44	
	45	- Stored value: JSON `{ userId, username, loggedInAt }` under `SESSION_KEY`,
	46	  where `loggedInAt` is an ISO-8601 timestamp set at save time.
	47	- `saveSession`:
	48	  - throws `Error` if `userId` is missing (programming error);
	49	  - returns `true` on success;
	50	  - if `localStorage` throws (unavailable, quota), logs via `console.error`
	51	    and returns `false`.
	52	- `getCurrentUser`: returns the stored object, or `null` if the key is absent,
	53	  the JSON is invalid, the object lacks `userId`, or storage throws.
	54	- `clearSession`: removes the key; swallows storage errors (logs via
	55	  `console.error`).
	56	- No DOM dependencies; reads `globalThis.localStorage` at call time so tests
	57	  can supply a stub.
	58	
	59	### `app.js` (modified)
	60	
	61	- Becomes an ES module; imports `saveSession`, `clearSession` from
	62	  `./session.js`.
	63	- `login(username, password)` returns `{ success, user, userId }`.
	64	- Submit handler: on `result.success`, calls
	65	  `saveSession({ userId: result.userId, username: result.user })`. Nothing is
	66	  saved on failure.
	67	- `export function logout()` calls `clearSession()`.
	68	
	69	### `index.html` (modified)
	70	
	71	- `<script type="module" src="app.js"></script>`.
	72	
	73	## Data Flow
	74	
	75	1. Submit → `validateForm` → `login(username, password)` →
	76	   `{ success, user, userId }`.
	77	2. On success → `saveSession(...)` writes `{ userId, username, loggedInAt }`.
	78	3. Other forms: `import { getCurrentUser } from "./session.js"` → object or
	79	   `null`.
	80	
	81	## Testing
	82	
	83	`test/session.test.mjs`, run with `npm test` (`"test": "node --test"` added to
	84	`package.json` scripts). Uses an in-memory `localStorage` stub on `globalThis`.
	85	
	86	Cases:
	87	- save then `getCurrentUser` returns `userId`, `username`, and a valid ISO
	88	  `loggedInAt`;
	89	- `getCurrentUser` returns `null` when empty;
	90	- returns `null` on corrupt JSON;
	91	- returns `null` when the stored object lacks `userId`;
	92	- `clearSession` removes the session;
	93	- `saveSession` throws when `userId` is missing;
	94	- `saveSession` returns `false` (no throw) when storage `setItem` throws;
	95	- `getCurrentUser` returns `null` when storage `getItem` throws.
	96	
	97	The `app.js` submit flow is verified manually in a browser (no e2e harness).
	98	
	99	Assumption: Node imports the ESM-syntax `session.js` from a `.mjs` test without
	100	`"type": "module"` via module syntax detection (Node ≥ 22.12), validate via
	101	running `npm test` — confirmed working on local Node v26.10.0.
	102	
	103	## Out of Scope
	104	
	105	- Server-side login history / audit trail.
	106	- Logout button or other UI changes.
	107	- Real API integration and real user IDs.
	108	- Linting, formatting, e2e tests.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T214114Z-fdaa/home/.cache/hyperpowers/codex-review/ad83d0235acd95d716c9540a62d2e4a28bc270bb/run-wmGCGFC6/adjudications.md

	1	# Approved design decisions (user-confirmed in brainstorming)
	2	- Original request: "Add a userId parameter to the login function so we can track who logged in."
	3	- User clarified: identity must work across the app and persist; other forms will need it later.
	4	- userId is RETURNED by login() (not an input param) — client cannot know/trust it pre-auth. Accepted.
	5	- Persistence: client-side session only (no server login history). User chose.
	6	- Lifetime: localStorage until logout; logout() exported, NO logout button. User chose.
	7	- Sharing: ES module session.js, app.js becomes type=module. User chose.
	8	- Placeholder userId "user-"+username from stub is acceptable. User confirmed.
	9	- Tests: node --test, test file .mjs, package.json type unchanged; src/ untouched. No linting. User chose.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
