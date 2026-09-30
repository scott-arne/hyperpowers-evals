# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T183645Z-a89f/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-login-user-identity-design.md

	1	# Login User Identity — Design
	2	
	3	Date: 2026-09-30
	4	Status: Awaiting review
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The original request was "add a `userId` parameter to the login function so we
	10	can track who logged in." Clarification changed its shape: the identifier must
	11	name the **actual user account**, must be readable from elsewhere in the app,
	12	and must persist, because forms that do not exist yet will need it.
	13	
	14	That makes the literal request impossible as stated. An account id is issued by
	15	authentication, so `login()` must **return** it, not receive it. The call site
	16	has nothing to pass — the form collects only a username and a password. This
	17	design delivers the stated intent (a real account identity, available
	18	app-wide) rather than the original wording.
	19	
	20	## Current state
	21	
	22	`app.js` is a single classic script holding three script-scoped globals:
	23	`API_ENDPOINT` (declared, never used), `login(username, password)` (no network
	24	call, hardcoded `{ success: true, user: username }`, no failure path), and
	25	`validateForm`. Its only consumer is the submit handler in the same file.
	26	`index.html` loads it with `<script src="app.js">`.
	27	
	28	`src/index.js` and `src/utils.js` use CommonJS and are unrelated to the browser
	29	app. `package.json` declares no `scripts`, no dependencies, and no `"type"`.
	30	The repo has no test runner, linter, formatter, or build step.
	31	
	32	## Decisions taken
	33	
	34	These were settled with the human partner during brainstorming and constrain
	35	everything below.
	36	
	37	1. **Identity is a real account id**, not a per-attempt correlation id.
	38	2. **Authentication stays stubbed but real-shaped.** `login()` makes no network
	39	   call; it returns the shape a real response would, so the swap later touches
	40	   one function. Defining a backend contract is out of scope.
	41	3. **Persistence is `sessionStorage`**, behind an accessor that keeps the
	42	   backing store swappable. No "remember me", no logout UI, no expiry policy —
	43	   none were requested.
	44	4. **ES modules, page served over http.** Losing `file://` double-click support
	45	   is accepted. No bundler.
	46	5. **Unit tests only.** No linter, no formatter, no end-to-end tests.
	47	6. Approach A (layered) was chosen over a storage-only variant and an
	48	   observable-store variant.
	49	
	50	## Global constraints
	51	
	52	- No third-party runtime or dev dependencies. Tests use Node's built-in runner.
	53	- `src/index.js` and `src/utils.js` are not edited.
	54	- No UI/markup changes beyond adding `type="module"` to the existing script tag.
	55	- Reporting stays on `console.log` / `console.error`, as today.
	56	
	57	## Architecture
	58	
	59	Four modules, one responsibility each.
	60	
	61	| File | Responsibility | Depends on |
	62	|---|---|---|
	63	| `auth.js` | Authenticate; own the stub and, later, the real `fetch` to `API_ENDPOINT`. Issues the account id. | nothing |
	64	| `session.js` | Persist and expose the current identity. Sole owner of the storage key and the stored JSON shape. | `sessionStorage` |
	65	| `validate.js` | Validate form field values. Pure; no DOM access. | nothing |
	66	| `app.js` | DOM wiring: read the form, validate, call auth, hand the result to session, report. | the three above |
	67	
	68	`validateForm` moves from `app.js` into `validate.js` unchanged. It is pure —
	69	it takes a `{ username, password }` object and returns a verdict — so leaving
	70	it in `app.js` would make it untestable for no benefit: `app.js` calls
	71	`document.getElementById` at module scope, so Node cannot import it at all.
	72	
	73	The two seams are deliberate and correspond to the two changes already known to
	74	be coming: replacing the stub with real auth touches only `auth.js`; replacing
	75	`sessionStorage` with another store touches only `session.js`.
	76	
	77	### Auth response contract
	78	
	79	```js
	80	// success
	81	{ ok: true,  user: { id: "u_3f9a2c", username: "alice" } }
	82	// failure — the stub never returns this, but the shape is defined
	83	{ ok: false, error: "Invalid credentials" }
	84	```
	85	
	86	`login` is `async` from the start. Real authentication is a network call; if
	87	the stub were synchronous, every call site would have to change when `fetch`
	88	arrives. One `await` now keeps that swap confined to one function.
	89	
	90	The stub derives `id` deterministically from the username, so the same username
	91	yields the same id within and across sessions, and different usernames yield
	92	different ids. The derivation is a non-cryptographic hash of the username
	93	rendered as a `u_`-prefixed hex string; it is a placeholder for a
	94	server-assigned id and carries no security property.
	95	
	96	### Storage contract
	97	
	98	One namespaced key holding one JSON object:
	99	
	100	```js
	101	sessionStorage["webapp.session"] = '{"userId":"u_3f9a2c","username":"alice"}'
	102	```
	103	
	104	A single key rather than parallel keys, so identity is written and cleared
	105	atomically and a later field adds no key.
	106	
	107	`session.js` exports:
	108	
	109	- `saveSession(user)` — writes `{ userId: user.id, username: user.username }`.
	110	  Returns `true` on success, `false` if the write failed.
	111	- `getSession()` — the stored object, or `null`.
	112	- `getUserId()` — `getSession()?.userId ?? null`.
	113	- `clearSession()` — removes the key.
	114	
	115	Callers never reference `sessionStorage` or the key name. Future forms read
	116	identity with `import { getUserId } from './session.js'`.
	117	
	118	`session.js` reads `globalThis.sessionStorage` inside each function rather than
	119	capturing it at import time. This lets tests install a fake storage object on
	120	`globalThis` without dependency-injection plumbing in production code, and is
	121	the same seam that later permits swapping to `localStorage`.
	122	
	123	## Data flow
	124	
	125	Submit handler in `app.js`:
	126	
	127	1. `preventDefault`; read `#username` and `#password`.
	128	2. `validateForm` — if invalid, report the error and stop. No auth call, no
	129	   storage write.
	130	3. `const res = await auth.login(username, password)`.
	131	4. If `res.ok === false`: report `res.error`. Any existing session is left
	132	   untouched.
	133	5. If `res.ok === true`: `session.saveSession(res.user)`, then report success.
	134	
	135	## Error handling
	136	
	137	- **`sessionStorage` throws.** Safari private browsing and quota-exceeded both
	138	  throw on write. `saveSession` catches, returns `false`, and login still
	139	  succeeds — the identity simply does not persist. A degraded login beats a
	140	  crashed submit handler.
	141	- **Corrupt or absent stored JSON.** `getSession()` returns `null` when nothing
	142	  is stored and, on a `JSON.parse` failure, removes the bad key and returns
	143	  `null`. Callers get a single answer to "is there an identity" and never see a
	144	  parse exception.
	145	- **Auth failure.** Step 4 handles `{ ok: false }`. The stub never produces it,
	146	  but the path exists so real auth does not arrive to find nothing handling it.
	147	
	148	## Testing
	149	
	150	Node's built-in runner via `"scripts": { "test": "node --test" }`. No install
	151	step, no dependencies.
	152	
	153	`session.test.js`:
	154	
	155	- save then `getUserId` round-trips the id
	156	- `getUserId` with nothing stored returns `null`
	157	- corrupt stored JSON returns `null` **and** the key is removed
	158	- `clearSession` removes the key
	159	- a throwing storage write returns `false` and does not throw
	160	
	161	`auth.test.js`:
	162	
	163	- `login` resolves `{ ok: true }` with a `user.id` and `user.username`
	164	- the same username yields the same id on repeated calls
	165	- different usernames yield different ids
	166	
	167	`validate.test.js`:
	168	
	169	- a missing username is rejected with the "Missing required fields" error
	170	- a missing password is rejected the same way
	171	- both fields present returns valid
	172	
	173	`app.test.js` is not created. `app.js` calls `document.getElementById` at
	174	module scope, so Node cannot import it, and end-to-end tests were declined.
	175	
	176	**Known coverage gap:** the wiring inside the submit handler (the sequence in
	177	Data flow) has no automated coverage and is verified by hand.
	178	
	179	## Node/browser module interop
	180	
	181	`package.json` gains `"type": "module"` so Node can `import` the new ES
	182	modules. To keep the CommonJS files working **without editing them**, a new
	183	two-line `src/package.json` containing `{"type":"commonjs"}` scopes that
	184	directory back to CommonJS. The browser does not read `package.json`; this is
	185	purely for Node.
	186	
	187	## Files touched
	188	
	189	| File | Change |
	190	|---|---|
	191	| `auth.js` | new — stub authentication, issues the id |
	192	| `session.js` | new — `sessionStorage` accessor |
	193	| `validate.js` | new — `validateForm`, moved out of `app.js` so it is testable |
	194	| `auth.test.js` | new |
	195	| `session.test.js` | new |
	196	| `validate.test.js` | new |
	197	| `app.js` | rewritten as DOM wiring over the three modules |
	198	| `index.html` | one line: `type="module"` on the script tag |
	199	| `package.json` | add `"type": "module"` and a `test` script |
	200	| `src/package.json` | new — `{"type":"commonjs"}` |
	201	| `README.md` | one line: the page must be served, not opened via `file://` |
	202	
	203	`src/index.js` and `src/utils.js` are not edited.
	204	
	205	## Serving requirement
	206	
	207	Once `app.js` is a module, `file://` no longer works — module scripts are
	208	subject to CORS. The page must be served, e.g. `python3 -m http.server`, and
	209	the README will say so.
	210	
	211	## Out of scope
	212	
	213	Real network authentication and its backend contract; logout UI and session
	214	expiry; "remember me" / `localStorage` persistence; error UI beyond the console;
	215	linting and formatting; end-to-end tests; any change to `src/`.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T183645Z-a89f/home/.cache/hyperpowers/codex-review/5c64eb577b6a36a89ce3e627e5d147a4827aa5c6/run-40xfemTf/approach-context.md

	1	# Approach Context
	2	
	3	## Original idea (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	**Q: What should the userId parameter actually carry — a per-attempt client
	10	correlation ID, a caller-supplied real account ID, or a server-assigned ID
	11	returned rather than passed?**
	12	A: "It should identify the actual user account. Yes, it should work across the
	13	app and persist, and other forms will need it later."
	14	
	15	**Q: Where does the real account ID come from, given `login()` currently makes
	16	no network call?**
	17	A: Stub, real-shaped — `login()` stays offline but produces/returns a
	18	synthesized account ID through the same interface a real authentication
	19	response would use, so swapping in real auth later touches one function.
	20	Pinning down a backend contract is out of scope.
	21	
	22	**Q: How long should the stored identity survive?**
	23	A: `sessionStorage` — survives reloads and in-session navigation, clears when
	24	the tab closes. No "remember me"/logout-expiry feature requested yet. The
	25	accessor should be written so the backing store is swappable later.
	26	
	27	**Q: How is `index.html` opened, and which module style should the identity
	28	code use?**
	29	A: ES modules, with the page served over http. `<script type="module">` is
	30	acceptable; losing `file://` double-click support is acceptable. No bundler.
	31	
	32	## Codebase facts
	33	
	34	Repository root contains: `index.html`, `app.js`, `README.md`,
	35	`package.json`, `src/index.js`, `src/utils.js`.
	36	
	37	### `index.html` (15 lines, verbatim structure)
	38	
	39	```html
	40	<!DOCTYPE html>
	41	<html>
	42	<head>
	43	  <title>Simple Webapp</title>
	44	</head>
	45	<body>
	46	  <h1>Login</h1>
	47	  <form id="login-form">
	48	    <input type="text" id="username" placeholder="Username" />
	49	    <input type="password" id="password" placeholder="Password" />
	50	    <button type="submit">Log In</button>
	51	  </form>
	52	  <script src="app.js"></script>
	53	</body>
	54	</html>
	55	```
	56	
	57	Note: `app.js` is loaded as a **classic script**, not `type="module"`.
	58	The form has exactly two inputs: `#username` and `#password`. There is no
	59	field carrying any user/account identifier.
	60	
	61	### `app.js` (29 lines, verbatim)
	62	
	63	```js
	64	// Simple webapp with login form handling
	65	const API_ENDPOINT = "https://api.example.com/login";
	66	
	67	function login(username, password) {
	68	  console.log("Logging in:", username);
	69	  // Stub: would POST to API_ENDPOINT in real app
	70	  return { success: true, user: username };
	71	}
	72	
	73	function validateForm(formData) {
	74	  if (!formData.username || !formData.password) {
	75	    return { valid: false, error: "Missing required fields" };
	76	  }
	77	  return { valid: true };
	78	}
	79	
	80	document.getElementById("login-form").addEventListener("submit", (e) => {
	81	  e.preventDefault();
	82	  const username = document.getElementById("username").value;
	83	  const password = document.getElementById("password").value;
	84	  const validation = validateForm({ username, password });
	85	  if (validation.valid) {
	86	    const result = login(username, password);
	87	    console.log("Login result:", result);
	88	  } else {
	89	    console.error("Validation error:", validation.error);
	90	  }
	91	});
	92	```
	93	
	94	Facts about this file:
	95	- `API_ENDPOINT` is declared but never used. `login()` performs no network
	96	  call and hardcodes `success: true`. There is no failure path.
	97	- `login()` has exactly one call site: the submit handler at line 23.
	98	- Nothing is exported; all three top-level bindings are script-scoped globals.
	99	- There is no logout, no session concept, and no storage access anywhere.
	100	
	101	### `src/` (unrelated to the browser app)
	102	
	103	`src/index.js`:
	104	```js
	105	const { greet } = require('./utils');
	106	
	107	function main() {
	108	  console.log(greet('world'));
	109	}
	110	
	111	main();
	112	```
	113	
	114	`src/utils.js`:
	115	```js
	116	function greet(name) {
	117	  return `Hello, ${name}!`;
	118	}
	119	
	120	module.exports = { greet };
	121	```
	122	
	123	These use **CommonJS** (`require` / `module.exports`) and are not referenced
	124	by `index.html` or `app.js`. The repo therefore contains two incompatible
	125	module conventions and the browser side currently uses neither.
	126	
	127	### `package.json` (verbatim)
	128	
	129	```json
	130	{
	131	  "name": "drill-test-project",
	132	  "version": "1.0.0",
	133	  "description": "Test project for Drill scenarios",
	134	  "main": "src/index.js"
	135	}
	136	```
	137	
	138	Facts: no `scripts`, no `dependencies`, no `devDependencies`, no `"type"`
	139	field (so `.js` under Node defaults to CommonJS). There is **no test runner,
	140	no linter, no formatter, and no build step** configured anywhere in the repo.
	141	
	142	### `README.md` (verbatim)
	143	
	144	```
	145	# Test Project
	146	
	147	A minimal project for Drill test scenarios.
	148	```
	149	
	150	### Git state
	151	
	152	Branch `feature/webapp-enhancement`, working tree clean. Recent commits:
	153	`df69c0e Add simple webapp fixture`, `30bc3c3 add entry point`,
	154	`424fba3 add utils module`, `2c4adf4 initial commit`.
	155	
	156	## What the design must deliver
	157	
	158	1. `login` gains a user-account identifier in its signature/flow, per the
	159	   original request.
	160	2. The identifier identifies the actual user account (not a per-attempt trace
	161	   ID).
	162	3. It is reachable from elsewhere in the app ("works across the app").
	163	4. It persists for the session via `sessionStorage`, behind a swappable
	164	   accessor.
	165	5. Other forms, which do not exist yet, will need to read it later.
	166	6. The authentication itself stays stubbed but shaped like a real response.
	167	
	168	## Task
	169	
	170	Propose 2-3 genuinely different architectures / data models for this, with
	171	materially different tradeoffs — not variations of one shape.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
