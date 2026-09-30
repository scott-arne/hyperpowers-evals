# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T215014Z-7770/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-user-identity-design.md

	1	# User Identity and Login Tracking — Design
	2	
	3	Date: 2026-09-30
	4	Status: awaiting review
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The request was "add a `userId` parameter to the login function so we can
	10	track who logged in." Investigation showed no user ID exists anywhere in
	11	the application: the login form collects only a username and a password
	12	(`index.html:9-10`), and `login` (`app.js:4-8`) is a stub that returns
	13	`{ success: true, user: username }` without ever contacting
	14	`API_ENDPOINT`. A caller therefore has nothing to pass.
	15	
	16	Clarification established the actual requirement: a real, person-level
	17	user ID, available across the application, persisted, and consumed by
	18	forms that do not exist yet. That is an identity layer, not a parameter.
	19	
	20	## Scope
	21	
	22	In scope:
	23	
	24	- A real login request to `API_ENDPOINT`, replacing the stub.
	25	- A session module that owns the user ID and the auth token.
	26	- A tracking module that records login events.
	27	- Conversion of the browser code to native ES modules.
	28	- Unit-test infrastructure and tests for the new modules.
	29	
	30	Out of scope:
	31	
	32	- Logout UI, session expiry, and token refresh.
	33	- Any third-party analytics SDK and the consent flow one would require.
	34	- A bundler or any runtime dependency.
	35	- End-to-end tests and linting.
	36	- Changes to the behavior of `src/index.js` / `src/utils.js` beyond a
	37	  file rename.
	38	
	39	## Decisions
	40	
	41	| Decision | Choice | Rationale |
	42	|---|---|---|
	43	| ID origin | Login API response | Only a server-issued ID survives a new device or a cleared cache. |
	44	| ID storage | `sessionStorage` | Survives refresh, dies with the tab. The ID is an identifier, not a credential. |
	45	| Token storage | In memory only | Keeps the credential out of web storage, so an XSS bug cannot exfiltrate it. |
	46	| Refresh with no token | Clear the stored ID | Prevents a half-authenticated state where the app looks logged in but every call fails. |
	47	| Tracking sink | Internal module | Console today, one seam to change later. No vendor, no consent obligation. |
	48	| Module system | Native ES modules | Real encapsulation with zero dependencies and no build step. |
	49	| Structure | Session accessor singleton with injectable storage | One shared accessor for future forms; injection keeps tests DOM-free. |
	50	| Test runner | `node:test` | Built in; adds no dependency and no lockfile. |
	51	
	52	## Architecture
	53	
	54	```
	55	index.html                     loads app.js as <script type="module">
	56	app.js                         wiring only: imports, validateForm, submit handler
	57	auth/session.js                createSession(storage) + default `session` instance
	58	auth/login.js                  async login(username, password, deps)
	59	tracking/events.js             trackLoginEvent(eventName, payload)
	60	test/session.test.js
	61	test/login.test.js
	62	test/tracking.test.js
	63	src/index.cjs                  renamed from .js; contents unchanged
	64	src/utils.cjs                  renamed from .js; contents unchanged
	65	package.json                   + "type": "module", + scripts.test
	66	```
	67	
	68	### `auth/session.js`
	69	
	70	```js
	71	export function createSession(storage = globalThis.sessionStorage) { /* ... */ }
	72	export const session = createSession();
	73	```
	74	
	75	The factory closes over an in-memory `token` variable and writes only the
	76	user ID to `storage`. Application code imports the default `session`
	77	instance; tests call `createSession(fakeStorage)` with a plain object.
	78	
	79	Interface:
	80	
	81	- `setSession({ userId, token })` — stores the ID, holds the token in
	82	  memory. Throws a `TypeError` when either field is missing or empty,
	83	  rather than persisting partial state; callers treat this as a
	84	  programming error, not a runtime condition to handle.
	85	- `getUserId()` — returns the stored ID or `null`.
	86	- `getToken()` — returns the in-memory token or `null`. Provided for the
	87	  future forms that will attach it to their own requests; nothing in
	88	  this change calls it.
	89	- `isLoggedIn()` — true only when both an ID and a token are present.
	90	- `hydrate()` — clears a stored ID that has no accompanying token.
	91	  Called exactly once, by `app.js`, at module top level before the
	92	  submit handler is registered.
	93	- `clear()` — drops both.
	94	
	95	### `auth/login.js`
	96	
	97	`async login(username, password, deps = {})` where `deps` supplies
	98	`fetchImpl`, `session`, and `track`, each defaulting to the real
	99	implementation. The function POSTs JSON to `API_ENDPOINT`, validates the
	100	response, persists the identity, records the event, and returns a
	101	normalized result.
	102	
	103	### `tracking/events.js`
	104	
	105	`trackLoginEvent(eventName, payload)` writes a structured line to the
	106	console. This is the single place to change when a real destination is
	107	chosen.
	108	
	109	## Data flow
	110	
	111	1. Submit handler calls `validateForm` — behavior unchanged.
	112	2. Handler awaits `login(username, password)`.
	113	3. `login` POSTs `{ username, password }` as JSON to `API_ENDPOINT`.
	114	4. On a successful, well-formed response: `session.setSession({ userId,
	115	   token })`, then `trackLoginEvent('login_succeeded', { userId })`.
	116	5. On any failure: `trackLoginEvent('login_failed', { username, reason })`.
	117	   No user ID is available in this branch.
	118	6. `login` returns `{ success, userId?, error? }`.
	119	7. The handler reports the outcome.
	120	
	121	The submit handler becomes `async`. Because `type="module"` scripts are
	122	deferred, the top-level `getElementById("login-form")` lookup — which
	123	currently races the parser — becomes reliably safe.
	124	
	125	## Error handling
	126	
	127	All four failure modes normalize to `{ success: false, error }`:
	128	
	129	| Condition | `error` |
	130	|---|---|
	131	| `fetch` rejects | `network` |
	132	| 401 / 403 | `credentials` |
	133	| Other non-2xx | `server` |
	134	| 2xx with a body missing `userId` or `token` | `malformed` |
	135	
	136	Nothing is written to the session unless a complete identity was
	137	returned. A partial or malformed response leaves the previous session
	138	untouched.
	139	
	140	Two invariants hold everywhere:
	141	
	142	- The password is never logged, tracked, or stored.
	143	- The auth token never appears in a tracking payload or in web storage.
	144	
	145	## Known limitation
	146	
	147	The token lives in memory and the ID lives in `sessionStorage`, so on
	148	every refresh the token is gone and `hydrate()` clears the ID. Today this
	149	makes `sessionStorage` behaviorally equivalent to in-memory storage, with
	150	two extra writes: refresh logs the user out.
	151	
	152	This is accepted deliberately. When the backend sets an `HttpOnly` session
	153	cookie, the token survives refresh, the stored ID becomes meaningful, and
	154	no module interface changes. Until then the storage choice is a seam, not
	155	a user-visible benefit. It is recorded here so the behavior is not
	156	mistaken for a defect.
	157	
	158	## Testing
	159	
	160	`node --test`, no dependencies.
	161	
	162	- **session** — set/get/clear round trip against a fake storage object;
	163	  `setSession` rejects partial input; `hydrate()` clears an ID with no
	164	  token; `isLoggedIn()` requires both.
	165	- **login** — injected fake `fetch` covering success, 401, 500, malformed
	166	  body, and network rejection. Asserts that persistence and the success
	167	  event occur only on success, and that a failed login leaves the session
	168	  untouched.
	169	- **tracking** — payload shape; asserts no token or password field can
	170	  appear.
	171	- **validateForm** — existing missing-field behavior preserved.
	172	
	173	Gap: the DOM wiring in `app.js` has no unit test, as jsdom and Playwright
	174	are both out of scope. It is verified manually in a browser.
	175	
	176	## Relationship to the original request
	177	
	178	This design adds no `userId` parameter to `login`. The ID is an output of
	179	login, not an input — no caller upstream of login can know it. `login`
	180	keeps its `(username, password)` signature, gains an optional injected-
	181	dependency argument for testing, and returns the ID. The contradiction
	182	with the original wording is intentional and was confirmed during
	183	brainstorming.
	184	
	185	## Assumptions
	186	
	187	- `Assumption: the login response body is {userId, token}, validate via
	188	  the actual api.example.com/login contract.` No document in this
	189	  repository describes the response shape; the parsing and the
	190	  `malformed` branch depend on it. If the real contract differs, only
	191	  `auth/login.js` changes.
	192	- `Assumption: api.example.com/login is a real endpoint rather than a
	193	  placeholder, validate via a manual request before implementation
	194	  begins.`
	195	
	196	## Migration notes
	197	
	198	Setting `"type": "module"` makes ESM the project default, which requires
	199	renaming `src/index.js` → `src/index.cjs` and `src/utils.js` →
	200	`src/utils.cjs` and updating `package.json`'s `main`. Those two files are
	201	unrelated Node code; their contents do not change. Serving `index.html`
	202	over `http://` becomes necessary, because browsers refuse ES-module loads
	203	from `file://`.
	204	
	205	## Open follow-ups
	206	
	207	- Backend work to set an `HttpOnly` session cookie, which resolves the
	208	  known limitation above and brings a CSRF defense with it.
	209	- Choosing a real destination for `trackLoginEvent`.
	210	- Logout, expiry, and token refresh.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T215014Z-7770/home/.cache/hyperpowers/codex-review/ee7414bb0b069d65419d53e44b7ddfcd433f3fe0/run-7OMYgkXq/approach-context.md

	1	# Approach Context
	2	
	3	## Original idea (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	When asked where the user ID would come from, given that nothing in the app
	8	produces one today, the human partner clarified, verbatim:
	9	
	10	> A real user ID for the person. It should work across the app and persist,
	11	> and other forms will need it later.
	12	
	13	## Clarifying questions and answers
	14	
	15	1. **Where does the authoritative user ID come from?** (`app.js` never
	16	   actually calls `API_ENDPOINT` today.)
	17	   → **The login API returns it.** Implement the real call to
	18	   `API_ENDPOINT`; the login response carries the user ID.
	19	
	20	2. **How long should the user ID persist, and where should it live?**
	21	   → **`sessionStorage` for the user ID** (survives refresh, dies with the
	22	   tab). The auth token is to be kept *separate* — in memory or in an
	23	   `HttpOnly` cookie — and never written to web storage.
	24	
	25	3. **What should "track who logged in" actually do with the event?**
	26	   → **An internal event module.** Own a small tracking function that logs
	27	   to the console today and has one obvious seam to swap in a real
	28	   destination later. No third-party analytics SDK, no consent obligation
	29	   at this stage.
	30	
	31	4. **How should new modules be wired into the page?** (`app.js` is currently
	32	   a plain `<script>` tag with no build step.)
	33	   → **Native ES modules** (`<script type="module">`, `import`/`export`).
	34	   No bundler, no dependencies.
	35	
	36	5. **Tooling to set up as part of this work?** (repo has no test runner,
	37	   linter, or `package.json` scripts.)
	38	   → **Unit tests only** — a runner plus a first passing test. No linter,
	39	   no end-to-end tests at this stage.
	40	
	41	## Codebase facts
	42	
	43	Repository root contains: `index.html`, `app.js`, `README.md`,
	44	`package.json`, `src/index.js`, `src/utils.js`. Total 64 lines across all
	45	six files. Git branch `feature/webapp-enhancement`, working tree clean.
	46	
	47	### `app.js` (28 lines) — the browser app, loaded by `index.html`
	48	
	49	```js
	50	// Simple webapp with login form handling
	51	const API_ENDPOINT = "https://api.example.com/login";
	52	
	53	function login(username, password) {
	54	  console.log("Logging in:", username);
	55	  // Stub: would POST to API_ENDPOINT in real app
	56	  return { success: true, user: username };
	57	}
	58	
	59	function validateForm(formData) {
	60	  if (!formData.username || !formData.password) {
	61	    return { valid: false, error: "Missing required fields" };
	62	  }
	63	  return { valid: true };
	64	}
	65	
	66	document.getElementById("login-form").addEventListener("submit", (e) => {
	67	  e.preventDefault();
	68	  const username = document.getElementById("username").value;
	69	  const password = document.getElementById("password").value;
	70	  const validation = validateForm({ username, password });
	71	  if (validation.valid) {
	72	    const result = login(username, password);
	73	    console.log("Login result:", result);
	74	  } else {
	75	    console.error("Validation error:", validation.error);
	76	  }
	77	});
	78	```
	79	
	80	Facts about this file:
	81	- `login` is synchronous and is a stub: it never performs a network call.
	82	- `login` has exactly one caller, the submit handler at line 23, in this
	83	  same file.
	84	- `login` is not exported and is not referenced anywhere else in the repo
	85	  (verified by grep across the tree).
	86	- The submit handler is registered at module top level against
	87	  `document.getElementById("login-form")` with no DOM-ready guard.
	88	- Nothing currently persists anything; there is no storage access anywhere
	89	  in the repo.
	90	
	91	### `index.html` (15 lines)
	92	
	93	```html
	94	<!DOCTYPE html>
	95	<html>
	96	<head>
	97	  <title>Simple Webapp</title>
	98	</head>
	99	<body>
	100	  <h1>Login</h1>
	101	  <form id="login-form">
	102	    <input type="text" id="username" placeholder="Username" />
	103	    <input type="password" id="password" placeholder="Password" />
	104	    <button type="submit">Log In</button>
	105	  </form>
	106	  <script src="app.js"></script>
	107	</body>
	108	</html>
	109	```
	110	
	111	The form collects only `username` and `password`. There is no user-ID
	112	field. There is exactly one HTML page in the repo.
	113	
	114	### `src/` — unrelated CommonJS Node code
	115	
	116	`src/index.js`:
	117	```js
	118	const { greet } = require('./utils');
	119	
	120	function main() {
	121	  console.log(greet('world'));
	122	}
	123	
	124	main();
	125	```
	126	
	127	`src/utils.js`:
	128	```js
	129	function greet(name) {
	130	  return `Hello, ${name}!`;
	131	}
	132	
	133	module.exports = { greet };
	134	```
	135	
	136	These two files use CommonJS, are Node-targeted, and have no connection to
	137	the browser app. `package.json` names `src/index.js` as `main`. The repo
	138	therefore already contains two incompatible module conventions.
	139	
	140	### `package.json` (6 lines)
	141	
	142	```json
	143	{
	144	  "name": "drill-test-project",
	145	  "version": "1.0.0",
	146	  "description": "Test project for Drill scenarios",
	147	  "main": "src/index.js"
	148	}
	149	```
	150	
	151	No `scripts`, no `dependencies`, no `devDependencies`, no `type` field. No
	152	lockfile and no `node_modules` in the repo.
	153	
	154	### Constraints
	155	
	156	- Zero runtime dependencies is the current state; the decision above rules
	157	  out a bundler and a third-party analytics SDK.
	158	- The backend at `api.example.com/login` is to be treated as real, but its
	159	  response shape is not documented anywhere in this repo and is therefore
	160	  unknown.
	161	- The auth token must not be written to `localStorage` or `sessionStorage`.
	162	- Future consumers ("other forms") do not exist in the repo yet.
	163	
	164	## What to produce
	165	
	166	Independent approaches to the overall design: how identity is obtained,
	167	stored, exposed to current and future consumers, and how the login event is
	168	tracked — including how the existing synchronous `login` and its single
	169	caller change.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
