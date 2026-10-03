# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T213404Z-356d/coding-agent-workdir/docs/hyperpowers/specs/2026-10-03-login-userid-session-design.md

	1	# Login userId + Session Design
	2	
	3	Date: 2026-10-03
	4	Status: Draft — awaiting user review
	5	
	6	## Goal
	7	
	8	Track who logged in. After a successful login the client knows the
	9	authenticated user's `userId`, keeps it for the browser tab's session, and
	10	exposes it to the rest of the app (other forms will need it later). The
	11	login itself is recorded server-side.
	12	
	13	Original request: "Add a userId parameter to the login function so we can
	14	track who logged in." Refined during brainstorming: `userId` is *returned*
	15	by login (the caller has no ID before authentication), not passed in.
	16	
	17	## Decisions
	18	
	19	| Question | Decision |
	20	|---|---|
	21	| Where userId comes from | Returned by `POST /login` after authentication |
	22	| Backend | None exists yet; this spec defines the contract |
	23	| Client-side lifetime | `sessionStorage` (survives reloads/navigation in a tab, cleared when the tab closes) |
	24	| Where the login is recorded | Server-side, inside `/login` (no client tracking call, no `/events` endpoint) |
	25	| Dev stub mode | Not wanted — with no backend, browser logins fail until one exists |
	26	
	27	## Global Constraints
	28	
	29	- No runtime or dev dependencies; tests use Node's built-in `node:test` and `node:assert`.
	30	- Browser code is native ES modules loaded via `<script type="module">`; no bundler.
	31	- Do not set `"type": "module"` in `package.json` — `src/index.js` and `src/utils.js` are CommonJS and must keep working.
	32	- Test-first (TDD) for all new behavior.
	33	
	34	## API Contract
	35	
	36	Base URL: `API_BASE = "https://api.example.com"` (replaces the current `API_ENDPOINT` constant).
	37	
	38	### `POST {API_BASE}/login`
	39	
	40	Request headers: `Content-Type: application/json`
	41	Request body: `{ "username": string, "password": string }`
	42	
	43	Responses:
	44	- `200` — `{ "userId": string }`. The server persists a login record
	45	  `{ userId, timestamp }` as part of handling this request. That record is
	46	  the tracking; the client sends nothing further.
	47	- `401` — `{ "error": string }` for invalid credentials.
	48	- Any other non-2xx — treated as failure; body may contain `{ "error": string }`.
	49	
	50	Assumption: `userId` is an opaque string (not a number), validate via backend
	51	team review when the backend is built.
	52	
	53	## Components
	54	
	55	All new browser modules live at the repo root alongside `app.js`.
	56	
	57	### `api.js`
	58	
	59	- Exports `API_BASE` and `async login(username, password)`.
	60	- Sends the request above with `fetch`.
	61	- Returns `{ userId }` on a 2xx response whose JSON body has a non-empty string `userId`.
	62	- Throws `Error`:
	63	  - non-2xx: message is the body's `error` string if present, otherwise `Login failed (HTTP <status>)`;
	64	  - 2xx without a non-empty string `userId` (or unparseable JSON): `Malformed login response`;
	65	  - `fetch` rejection: the rejection propagates as an `Error`.
	66	- The only module that knows URLs.
	67	
	68	### `session.js`
	69	
	70	- Exports `setUserId(id)`, `getUserId()`, `clearSession()`.
	71	- Storage key: `"userId"` in `sessionStorage`. The only module that touches `sessionStorage`.
	72	- `getUserId()` returns `null` when unset.
	73	- If `sessionStorage` is missing or any access throws, the function swallows
	74	  the error: `setUserId`/`clearSession` become no-ops and `getUserId` returns `null`.
	75	- Other forms read the logged-in user exclusively via `getUserId()`.
	76	
	77	### `app.js`
	78	
	79	- Keeps `validateForm(formData)` unchanged.
	80	- Removes the old synchronous `login` stub and `API_ENDPOINT`.
	81	- Exports `async handleLogin(username, password)`:
	82	  1. `validateForm`; on failure, `console.error("Validation error:", error)` and return `{ success: false, error }` without any request.
	83	  2. `await api.login(username, password)`.
	84	  3. On success: `session.setUserId(userId)`, `console.log("Login result:", { success: true, userId })`, return `{ success: true, userId }`.
	85	  4. On thrown error: `session.clearSession()`, `console.error("Login failed:", err.message)`, return `{ success: false, error: err.message }`.
	86	- Attaches the submit listener (calls `preventDefault()`, reads the form
	87	  fields, calls `handleLogin`) only when `typeof document !== "undefined"`,
	88	  so Node can import the module in tests.
	89	
	90	### `index.html`
	91	
	92	- `<script src="app.js">` becomes `<script type="module" src="app.js">`.
	93	
	94	## Data Flow
	95	
	96	```
	97	submit → preventDefault → handleLogin(username, password)
	98	  → validateForm ──fail──→ console.error, no request
	99	  → api.login ──throws──→ clearSession, console.error("Login failed: …")
	100	  → { userId } → session.setUserId(userId) → console.log("Login result: …")
	101	
	102	later, any form → session.getUserId() → userId | null
	103	```
	104	
	105	## Error Handling Summary
	106	
	107	| Situation | Behavior | Session after |
	108	|---|---|---|
	109	| Missing username/password | `console.error`, no request | unchanged |
	110	| Network failure | `console.error("Login failed: …")` | cleared |
	111	| 401 / other non-2xx | `console.error` with server `error` or HTTP status | cleared |
	112	| 2xx without string `userId` | `console.error("Login failed: Malformed login response")` | cleared |
	113	| `sessionStorage` unavailable | Login still reported as success (server recorded it) | `getUserId()` → `null` |
	114	
	115	Known consequence: until a backend exists at `API_BASE`, every browser login
	116	takes the "Login failed" path. Accepted; no dev stub mode.
	117	
	118	## Testing
	119	
	120	`package.json` gains `"scripts": { "test": "node --test" }`. Tests live in
	121	`test/*.test.js`. Node 26 auto-detects ESM syntax; a one-time
	122	`MODULE_TYPELESS_PACKAGE_JSON` warning is accepted.
	123	
	124	- `test/api.test.js` (stub `globalThis.fetch`, restore after each test):
	125	  - request URL is `${API_BASE}/login`, method `POST`, JSON content type, body `{ username, password }`;
	126	  - 200 `{ userId: "u1" }` resolves to `{ userId: "u1" }`;
	127	  - 401 `{ error: "Invalid credentials" }` rejects with that message;
	128	  - 500 with no `error` field rejects with `Login failed (HTTP 500)`;
	129	  - `fetch` rejection rejects;
	130	  - 200 with missing/non-string/empty `userId` rejects with `Malformed login response`.
	131	- `test/session.test.js` (in-memory fake on `globalThis.sessionStorage`):
	132	  - set/get round-trip; `getUserId()` is `null` when unset; `clearSession()` removes it;
	133	  - missing `sessionStorage` and a throwing `sessionStorage` both degrade to no-op / `null`.
	134	- `test/app.test.js` (stub `fetch` and `sessionStorage`):
	135	  - success stores `userId` and returns `{ success: true, userId }`;
	136	  - failed login clears a pre-existing `userId` and stores nothing new;
	137	  - validation failure makes no `fetch` call.
	138	
	139	## Out of Scope
	140	
	141	Logout UI, a real or mock backend, a `/events` endpoint or client-side event
	142	tracking, token/cookie authentication, user-visible (non-console) error
	143	messages, dev stub mode.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20261003T213404Z-356d/home/.cache/hyperpowers/codex-review/24bde664da1d9b65544773c84663f91ee596ef6c/run-YjJdaqpw/decisions.md

	1	# Approved design decisions (from brainstorming with the user)
	2	- Original request: "Add a userId parameter to the login function so we can track who logged in."
	3	- userId is returned by login after authentication (user chose option A), not passed in by the caller.
	4	- Tracking must persist (sent to the API) and the userId must be available app-wide; other forms will need it later.
	5	- No backend exists; the spec defines the contract.
	6	- Client-side lifetime: sessionStorage.
	7	- Approach B chosen: the server records the login inside POST /login; no client /events call.
	8	- Section 1 (components/contract), Section 2 (data flow/errors), Section 3 (testing) each approved by the user.
	9	- No dev stub mode (user explicitly declined).


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
