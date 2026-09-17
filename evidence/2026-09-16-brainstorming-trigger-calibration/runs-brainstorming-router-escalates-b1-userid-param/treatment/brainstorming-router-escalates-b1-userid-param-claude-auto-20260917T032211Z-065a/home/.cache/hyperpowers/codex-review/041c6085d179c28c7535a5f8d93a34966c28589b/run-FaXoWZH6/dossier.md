# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T032211Z-065a/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-login-session-identity-design.md

	1	# Login Session Identity — Design
	2	
	3	Date: 2026-09-16
	4	Status: Awaiting review
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The original request was "add a `userId` parameter to the login function so we
	10	can track who logged in." The repository has no user identifier anywhere:
	11	`index.html` collects only a username and a password, and `login()` in `app.js`
	12	is a stub that fabricates its own response. A caller therefore has no `userId`
	13	to pass.
	14	
	15	Clarification established the real requirement: the identity comes from the
	16	**auth response**, it must be readable **across the app**, it must **persist**,
	17	and **other forms will consume it later**. That is a shared identity store, not
	18	a parameter.
	19	
	20	## Scope
	21	
	22	In scope:
	23	
	24	- A new browser module owning the persisted logged-in identity.
	25	- A contract change to `login()` so it returns the authenticated identity.
	26	- A minimal consumer — a signed-in indicator and a logout control — so the
	27	  feature is verifiable and the session can be cleared.
	28	- First-time tooling setup: a unit-test runner and a lint/format tool.
	29	
	30	Out of scope:
	31	
	32	- Real authentication. `login()` remains a stub; `API_ENDPOINT` stays unused.
	33	- Auth tokens, session expiry, and refresh. Identity only is stored.
	34	- `src/index.js` and `src/utils.js`. They are the Node side, they do not
	35	  interact with `app.js`, and they stay on CommonJS.
	36	- A bundler. Rejected under YAGNI for a six-file project.
	37	
	38	## Decisions
	39	
	40	Each decision below was confirmed with the requester.
	41	
	42	| Decision | Choice | Rationale |
	43	|---|---|---|
	44	| Source of `userId` | Auth response, via `login()`'s return value | A caller cannot supply an identity it has not yet authenticated |
	45	| Stored contents | Identity only (`userId`, `username`) | No credential client-side; a page-script XSS has nothing to steal |
	46	| Persistence | `localStorage` | Survives reload and restart, consistent across tabs |
	47	| Browser module system | ES modules | Explicit dependencies, no global namespace |
	48	| Store API shape | Plain `get`/`set`/`clear` | `subscribe()` deferred; purely additive when a second consumer needs it |
	49	| Write ownership | The call site, not `login()` | Keeps `login()` testable without a browser |
	50	| Tooling | `node:test` + Biome | Zero-dependency runner; one dev dependency for lint and format |
	51	
	52	### Rejected alternatives
	53	
	54	- **`login()` owns the session write.** Fewer call-site steps, but it welds auth
	55	  transport to browser storage, makes `login()` untestable without a DOM, and
	56	  hides a persistent-state mutation behind a function that promises only
	57	  authentication.
	58	- **Observable store with `subscribe()` and cross-tab `storage` events.** Solves
	59	  staleness across tabs, but maintains a notification system with no subscribers
	60	  today. Revisit when a second long-lived view must react without a reload; it is
	61	  an additive change to the same file.
	62	- **Adding `"type": "module"` to `package.json`.** The tidier long-term layout,
	63	  but it breaks the two existing CommonJS files and renaming them is unrelated
	64	  scope. See "Module resolution" below.
	65	
	66	## Architecture
	67	
	68	### `src/session.mjs` (new)
	69	
	70	Sole owner of the persisted identity. No other file touches `localStorage`.
	71	
	72	```js
	73	export function getSession()                       // → { userId, username } | null
	74	export function setSession({ userId, username })   // validates, persists
	75	export function clearSession()                     // removes the key
	76	```
	77	
	78	- Storage key: `appSession`, holding a JSON object. Namespaced to avoid
	79	  collisions with anything else on the origin.
	80	- `getSession()` never throws. A missing key, malformed JSON, or a record
	81	  lacking a `userId` all return `null`. Corrupt storage reads as logged out.
	82	- `setSession()` throws a `TypeError` on a missing or non-string `userId`.
	83	  Persisting a broken record is worse than not persisting one, because it
	84	  survives the page. (This is a synchronous throw, not a rejected promise; the
	85	  module exposes no async API.)
	86	- Writes are guarded against `QuotaExceededError` and against Safari private
	87	  mode, where touching `localStorage` can throw. On a failed write the module
	88	  retains the value in a module-level variable for the life of the page and
	89	  `getSession()` returns that mirror when storage is unreadable, so the session
	90	  still works within the page; login still succeeds. The mirror is not a second
	91	  source of truth — when storage is healthy, `getSession()` reads storage.
	92	
	93	**Invariant for all consumers: the store is a cache, and the server is the
	94	source of truth.** A value from `getSession()` means "probably this person". It
	95	is never proof of authorization, and nothing in it is a credential.
	96	
	97	### `app.js` (modified)
	98	
	99	```js
	100	async function login(username, password)   // → { success: true, userId, username }
	101	                                           //   { success: false, error }
	102	```
	103	
	104	- **The signature keeps `(username, password)`.** This is the one place the
	105	  design departs from the literal original request: `userId` is in the return
	106	  value rather than the parameter list, because the identity originates in the
	107	  auth response.
	108	- **`login()` becomes `async` while it is still a stub.** A real `fetch` to
	109	  `API_ENDPOINT` forces this eventually, and converting sync to async later
	110	  fails silently — callers receive a `Promise`, `result.success` is `undefined`,
	111	  and `undefined` is falsy, so every login reads as a failure with no error. One
	112	  `await` today at the single call site avoids that.
	113	- The stub returns a fabricated `userId` until a backend exists.
	114	
	115	### `index.html` (modified)
	116	
	117	- `<script src="app.js">` becomes `<script type="module" src="app.js">`.
	118	- Adds a signed-in indicator element and a logout button.
	119	
	120	**Consequence:** module scripts are blocked over `file://`, so `index.html` must
	121	be served over HTTP. `python3 -m http.server` is sufficient and was verified to
	122	serve `.mjs` as `text/javascript`.
	123	
	124	### Module resolution
	125	
	126	`package.json` has no `"type"` field, so Node parses `.js` as CommonJS. A Node
	127	test importing an ESM `src/session.js` would fail with "Cannot use import
	128	statement outside a module". Naming the file `src/session.mjs` makes it
	129	unambiguously ESM to Node without disturbing the existing CommonJS files.
	130	`app.js` stays `.js`: it is browser-only, and browsers determine module-ness
	131	from the `type="module"` attribute, never from `package.json`.
	132	
	133	## Data flow
	134	
	135	1. Submit → `preventDefault()`.
	136	2. `validateForm({ username, password })` — unchanged.
	137	3. `await login(username, password)`.
	138	4. On `success`: `setSession({ userId, username })`, then render the indicator.
	139	5. On failure: surface the error, and clear any existing session.
	140	6. On page load: read `getSession()` and render the indicator if present.
	141	7. Logout: `clearSession()`, then re-render.
	142	
	143	## Error handling
	144	
	145	| Failure | Behavior |
	146	|---|---|
	147	| Validation fails | Unchanged; `login()` not called, session untouched |
	148	| `login()` returns `success: false` | Error surfaced; session **cleared**, never left stale |
	149	| `login()` rejects (network, once real) | Caught at the call site, treated as a failed login |
	150	| `localStorage` unavailable or full | `setSession` degrades to in-memory; login still succeeds |
	151	| Stored JSON corrupt or malformed | `getSession()` returns `null` — reads as logged out |
	152	
	153	A failed login must never leave a previous identity looking current. This is why
	154	step 5 clears rather than merely skipping the write.
	155	
	156	## Session lifecycle
	157	
	158	`localStorage` survives browser restart. Without a clear path, the first person
	159	to log in would remain "logged in" on that browser indefinitely — a real defect
	160	on a shared machine, not a missing nicety. The logout control closes this and
	161	gives `clearSession()` a caller rather than shipping it as dead code.
	162	
	163	The indicator additionally makes the feature verifiable by hand, which matters
	164	because the DOM wiring is not unit-tested.
	165	
	166	## Testing
	167	
	168	Runner: `node:test` with `node:assert`, both built in. A `test` script is added
	169	to `package.json`.
	170	
	171	`src/session.mjs` is pure logic over an injectable storage object and tests
	172	without a browser, using a small in-memory `localStorage` fake:
	173	
	174	- round-trip: `setSession` then `getSession` returns the same identity
	175	- empty storage → `null`
	176	- corrupt JSON → `null`, does not throw
	177	- record missing `userId` → `null`
	178	- `setSession` throws a `TypeError` on a missing or non-string `userId`
	179	- `clearSession` removes the key; a subsequent `getSession` → `null`
	180	- a throwing storage backend → no exception escapes; session degrades to
	181	  in-memory
	182	
	183	`login()` is tested for its return contract on both the success and failure
	184	branches.
	185	
	186	**Known coverage gap:** the DOM wiring in `app.js` — the submit handler, the
	187	indicator, and the logout button — is not unit-tested. Covering it needs jsdom
	188	or a browser driver, which is disproportionate for a form this size. Manual
	189	verification via the indicator covers it; adding Playwright is the escalation
	190	path if that wiring grows.
	191	
	192	## Tooling
	193	
	194	- **`node:test`** — zero dependencies, matching the repo's current
	195	  zero-dependency state. Wired as `npm test`.
	196	- **Biome** — one dev dependency providing both linting and formatting, rather
	197	  than the four packages an ESLint + Prettier pair requires. Wired as
	198	  `npm run lint` and `npm run format`.
	199	- End-to-end (Playwright) and fuzz/mutation testing were considered and
	200	  deferred: a browser download and CI story is disproportionate here, and
	201	  mutation testing has too little logic to act on.
	202	
	203	## Assumptions
	204	
	205	- Assumption: the eventual backend returns a stable `userId` in its login
	206	  response body; validate by confirming the auth API's response shape before
	207	  replacing the stub.
	208	- Assumption: developers can serve the app over local HTTP rather than opening
	209	  `index.html` from disk; validate by confirming the `python3 -m http.server`
	210	  workflow with whoever runs the app.
	211	
	212	## Risks
	213	
	214	- **Stale identity.** The stored identity can outlive the server session, so the
	215	  UI may name a user whose session has expired. Bounded: nothing stored is a
	216	  credential, so the worst case is a wrong name on screen until a server call
	217	  corrects it. Cross-tab staleness is the trigger for adopting the deferred
	218	  `subscribe()`.
	219	- **`file://` regression.** Anyone who currently opens `index.html` directly
	220	  loses that workflow. Mitigated by documenting the server command in the
	221	  README.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T032211Z-065a/home/.cache/hyperpowers/codex-review/041c6085d179c28c7535a5f8d93a34966c28589b/run-ToguehRb/approach-context.md

	1	# Approach Context
	2	
	3	## Original request (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	**Q: Where should the userId value come from?**
	10	A: "It should come from the auth response — track the authenticated identity. It
	11	needs to work across the app and persist, and other forms will need it later."
	12	
	13	**Q: What should the shared store hold after a successful login?**
	14	A: Identity only — `userId` plus username/display name. No auth token or session
	15	object held client-side.
	16	
	17	**Q: How long should the stored identity persist?**
	18	A: `localStorage` — survives reload and browser restart, shared across tabs,
	19	cleared on explicit logout.
	20	
	21	**Q: How should the shared session module be loaded by the browser?**
	22	A: ES modules (`<script type="module">`, explicit imports). Accepted consequence:
	23	`index.html` must be served over a local HTTP server rather than opened via
	24	`file://`.
	25	
	26	## Codebase facts
	27	
	28	Repository is a six-file static webapp fixture. Full file list (excluding
	29	`.git`): `index.html`, `README.md`, `package.json`, `app.js`, `src/index.js`,
	30	`src/utils.js`. Current branch `feature/webapp-enhancement`, working tree clean.
	31	
	32	### `app.js` (28 lines, browser, no module syntax)
	33	
	34	```js
	35	// Simple webapp with login form handling
	36	const API_ENDPOINT = "https://api.example.com/login";
	37	
	38	function login(username, password) {
	39	  console.log("Logging in:", username);
	40	  // Stub: would POST to API_ENDPOINT in real app
	41	  return { success: true, user: username };
	42	}
	43	
	44	function validateForm(formData) {
	45	  if (!formData.username || !formData.password) {
	46	    return { valid: false, error: "Missing required fields" };
	47	  }
	48	  return { valid: true };
	49	}
	50	
	51	document.getElementById("login-form").addEventListener("submit", (e) => {
	52	  e.preventDefault();
	53	  const username = document.getElementById("username").value;
	54	  const password = document.getElementById("password").value;
	55	  const validation = validateForm({ username, password });
	56	  if (validation.valid) {
	57	    const result = login(username, password);
	58	    console.log("Login result:", result);
	59	  } else {
	60	    console.error("Validation error:", validation.error);
	61	  }
	62	});
	63	```
	64	
	65	`login()` is a stub: it performs no network call, `API_ENDPOINT` is unused, and
	66	it synchronously returns `{ success: true, user: username }`. It has exactly one
	67	call site, line 23.
	68	
	69	### `index.html` (15 lines)
	70	
	71	```html
	72	<!DOCTYPE html>
	73	<html>
	74	<head>
	75	  <title>Simple Webapp</title>
	76	</head>
	77	<body>
	78	  <h1>Login</h1>
	79	  <form id="login-form">
	80	    <input type="text" id="username" placeholder="Username" />
	81	    <input type="password" id="password" placeholder="Password" />
	82	    <button type="submit">Log In</button>
	83	  </form>
	84	  <script src="app.js"></script>
	85	</body>
	86	</html>
	87	```
	88	
	89	The form collects only `username` and `password`. There is no existing user
	90	identifier anywhere in the repo. There is no logout control and no second form.
	91	
	92	### `src/utils.js` and `src/index.js` (Node, CommonJS)
	93	
	94	```js
	95	// src/utils.js
	96	function greet(name) { return `Hello, ${name}!`; }
	97	module.exports = { greet };
	98	
	99	// src/index.js
	100	const { greet } = require('./utils');
	101	function main() { console.log(greet('world')); }
	102	main();
	103	```
	104	
	105	These are a separate Node-side pair using CommonJS. They do not interact with
	106	`app.js`.
	107	
	108	### `package.json`
	109	
	110	```json
	111	{
	112	  "name": "drill-test-project",
	113	  "version": "1.0.0",
	114	  "description": "Test project for Drill scenarios",
	115	  "main": "src/index.js"
	116	}
	117	```
	118	
	119	No dependencies, no devDependencies, no `scripts` block. Therefore: no test
	120	runner, no linter, no formatter, no bundler, no build step configured anywhere
	121	in the repo.
	122	
	123	## Constraints
	124	
	125	- Identity persists in `localStorage`; no token or session object stored
	126	  client-side.
	127	- Browser code uses ES modules.
	128	- The backend does not exist; `login()` remains a stub for now, but the design
	129	  should anticipate a real auth response supplying the identity.
	130	- Future consumers ("other forms") do not exist yet and must be able to read the
	131	  logged-in identity.
	132	- The repo currently has no tooling of any kind.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
