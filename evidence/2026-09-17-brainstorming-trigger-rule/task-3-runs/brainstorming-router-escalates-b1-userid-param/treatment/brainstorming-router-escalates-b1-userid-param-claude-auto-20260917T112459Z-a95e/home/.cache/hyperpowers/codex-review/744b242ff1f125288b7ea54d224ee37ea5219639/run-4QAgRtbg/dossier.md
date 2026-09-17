# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T112459Z-a95e/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-login-userid-session-design.md

	1	# Login `userId` and Persisted Session Identity — Design
	2	
	3	Date: 2026-09-17
	4	Status: Approved in brainstorming; not yet planned
	5	Repository: `drill-test-project`, branch `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	`login()` in `app.js` takes a username and password and returns
	10	`{ success: true, user: username }`. The submit handler logs that object and
	11	discards it, so nothing in the application can answer "who is logged in?" after
	12	the handler returns.
	13	
	14	The request was to add a `userId` parameter to `login()` "so we can track who
	15	logged in." Clarification established that the identity must outlive the call:
	16	it has to persist across page loads and be readable by forms that do not exist
	17	yet. That is not a parameter addition — the browser side of this repository has
	18	no state layer, no module system, and no shared identity of any kind. This
	19	design introduces that layer.
	20	
	21	## Scope
	22	
	23	In scope:
	24	
	25	- An optional `userId` parameter on `login()`.
	26	- A new `session.js` owning a persisted identity record in `sessionStorage`.
	27	- Wiring `login()` to write that record.
	28	- Unit-test infrastructure, which the repository does not currently have.
	29	
	30	Out of scope:
	31	
	32	- Real authentication. `login()` remains a stub; `API_ENDPOINT` is still unused.
	33	- Logout UI. `Session.clear()` exists, but nothing calls it yet.
	34	- The future forms that will read the identity. They do not exist, and this
	35	  design only guarantees the interface they will use.
	36	
	37	## Settled Decisions
	38	
	39	Each of these was chosen by the human partner during brainstorming.
	40	
	41	| Decision | Choice |
	42	|---|---|
	43	| Persistence lifetime | `sessionStorage` — survives reload and in-tab navigation, cleared on tab close |
	44	| Default `userId` | The username, produced inside `login()` |
	45	| Structure | A `session.js` classic script exposing a `Session` global |
	46	| Stored shape | JSON record `{ userId, username }` under key `session.user` |
	47	| Storage-failure behavior | Warn on the console; never block login |
	48	| Tooling | Unit tests via Node's built-in `node --test`; no linter, no e2e, no fuzzing |
	49	
	50	`localStorage` was rejected: it would leave a user identifier on the machine
	51	after the browser closes, which is a deliberate choice rather than a default.
	52	In-memory-only was rejected because it cannot satisfy "other forms will need it."
	53	Converting the browser side to ES modules was rejected because `type="module"`
	54	is blocked by CORS on `file://`, and this repository has no dev server or build
	55	step. Inline `sessionStorage` calls were rejected because they duplicate the
	56	storage key and record shape into every future consumer.
	57	
	58	## Architecture
	59	
	60	### `session.js` (new)
	61	
	62	A classic script — no module syntax — loaded by `index.html` in a `<script>`
	63	tag placed **before** `app.js`, so the global exists by the time `app.js`
	64	registers its submit handler.
	65	
	66	It is the only code in the application that touches `sessionStorage`. That
	67	single-owner property is what makes the eventual swap to a server-issued id a
	68	one-line change, and it is the reason this file exists at all.
	69	
	70	Public surface, exactly three functions:
	71	
	72	- `Session.setUser({ userId, username })` — serializes the record and writes it
	73	  under `session.user`.
	74	- `Session.getUser()` — returns the parsed record, or `null` when no user is
	75	  stored.
	76	- `Session.clear()` — removes the key. Needed for a future logout, and for
	77	  tests to reset state between cases.
	78	
	79	There is intentionally no `getUserId()`. `getUser()?.userId` covers it, and
	80	keeping the surface at three functions means less to maintain. If future forms
	81	want only the id, adding it then is one line.
	82	
	83	The file ends with `if (typeof module !== "undefined") module.exports = Session;`
	84	so it works as a browser global and as a CommonJS import. That matches the
	85	convention already used in `src/`, and it is what lets the unit tests require
	86	the module without a DOM.
	87	
	88	### Stored record
	89	
	90	Key: `session.user`. Value: JSON, of the shape
	91	
	92	```json
	93	{ "userId": "alice", "username": "alice" }
	94	```
	95	
	96	Both fields hold the same value today. They exist separately because they
	97	diverge the moment `API_ENDPOINT` becomes a real call and the server returns its
	98	own id: consumers key off `userId` and display `username`, and neither consumer
	99	changes at the swap. A bare string under key `userId` was rejected for this
	100	reason — widening a string to an object later is a breaking read for anything
	101	already written to a live `sessionStorage`.
	102	
	103	No `loggedInAt` timestamp and no schema version field. Nothing described needs
	104	either, and both are cheap to add later.
	105	
	106	**Constraint: the session record holds an identifier and a display name only.**
	107	No tokens, no credentials, no password. `sessionStorage` is readable by any
	108	script on the page, so a later change that puts a bearer token in this record
	109	would turn a benign store into a credential store. This constraint is recorded
	110	here so that change is a deliberate one rather than an accident.
	111	
	112	### `app.js` (modified)
	113	
	114	`login()` becomes:
	115	
	116	```js
	117	function login(username, password, userId = username)
	118	```
	119	
	120	The parameter is optional and defaults to the username, per the settled
	121	decision. The function keeps its current stub behavior and gains one step:
	122	
	123	1. Log: `console.log("Logging in:", username, userId)`.
	124	2. Persist: `Session.setUser({ userId, username })`.
	125	3. Return: `{ success: true, user: username, userId }`.
	126	
	127	The submit handler is **unchanged**. It does not pass a `userId` because it has
	128	none to pass — `index.html` collects only a username and a password — and the
	129	default covers it.
	130	
	131	The DOM wiring at the bottom of `app.js` gets a guard:
	132	
	133	```js
	134	if (typeof document !== "undefined") { /* existing addEventListener block */ }
	135	```
	136	
	137	Without it, requiring `app.js` in Node throws at load on
	138	`document.getElementById("login-form")`, and `login()` cannot be unit-tested at
	139	all. This is a two-line change to code the feature already touches.
	140	
	141	`app.js` also gains the same trailing CommonJS export guard as `session.js`:
	142	
	143	```js
	144	if (typeof module !== "undefined") module.exports = { login, validateForm };
	145	```
	146	
	147	Without it, requiring `app.js` yields an empty object and `login()` is still
	148	untestable even with the DOM guard in place.
	149	
	150	`login()` refers to `Session` as a bare identifier, which resolves to
	151	`globalThis.Session` in both environments: the browser sets it via the script
	152	tag, and the tests assign `globalThis.Session` before calling `login()`. No
	153	`require` of `session.js` inside `app.js` — that would make `app.js` a module in
	154	a way the classic-script loading model does not support.
	155	
	156	### `index.html` (modified)
	157	
	158	One added line: `<script src="session.js"></script>` immediately before the
	159	existing `<script src="app.js"></script>`. Order matters and is load-bearing.
	160	
	161	### The swap point
	162	
	163	When `API_ENDPOINT` becomes a real `fetch`, the server-issued id replaces the
	164	default at exactly one line inside `login()`. No other file changes. Every
	165	consumer continues to call `Session.getUser()` and read the same two fields.
	166	
	167	## Data Flow
	168	
	169	```
	170	submit handler
	171	  -> validateForm({ username, password })
	172	  -> login(username, password)            // userId defaults to username
	173	       -> console.log
	174	       -> Session.setUser({ userId, username })
	175	            -> sessionStorage.setItem("session.user", JSON.stringify(record))
	176	       -> returns { success, user, userId }
	177	
	178	any later form
	179	  -> Session.getUser()
	180	       -> sessionStorage.getItem("session.user") -> JSON.parse -> record | null
	181	```
	182	
	183	## Error Handling
	184	
	185	All three cases are handled inside `session.js`; no caller needs a `try/catch`.
	186	
	187	| Case | Behavior | Rationale |
	188	|---|---|---|
	189	| `sessionStorage` throws on write | `setUser` catches, warns on the console, returns normally | Throws in Safari private mode and when cookies are blocked. Blocking login because persistence is unavailable would be a worse bug than the one being fixed. |
	190	| Stored JSON is malformed | `getUser` catches the parse error and returns `null` | A caller receiving `null` behaves as it would for a logged-out user, which is the safe reading. Throwing into an unrelated form is not. |
	191	| Key absent | `getUser` returns `null` | Not an error — the ordinary "nobody has logged in yet" state. |
	192	
	193	`setUser` reports failure only to the console. Making a storage failure visible
	194	to the user was considered and rejected: it is not actionable by them, and login
	195	itself still succeeded.
	196	
	197	## Testing
	198	
	199	The repository has no test runner, no dependencies, and no `scripts` block.
	200	This design adds unit tests using Node's built-in runner, which keeps the
	201	dependency count at zero.
	202	
	203	- Add `"scripts": { "test": "node --test" }` to `package.json`.
	204	- Tests require `session.js` and `app.js` via their CommonJS export guards and
	205	  inject a fake `sessionStorage` object rather than needing a DOM.
	206	- `session.js` reads `sessionStorage` as a bare identifier, so tests assign
	207	  `globalThis.sessionStorage` to a fake with `getItem`/`setItem`/`removeItem`,
	208	  and reset it between cases. Cases 6 and 7 additionally assign
	209	  `globalThis.Session` before calling `login()`.
	210	
	211	Cases to cover:
	212	
	213	1. `setUser` then `getUser` round-trips both fields.
	214	2. `getUser` returns `null` when the key is absent.
	215	3. `getUser` returns `null` when the stored value is malformed JSON, and does
	216	   not throw.
	217	4. `setUser` does not throw when the storage backend throws on write.
	218	5. `clear` removes the record; a subsequent `getUser` returns `null`.
	219	6. `login(username, password)` persists a record whose `userId` equals the
	220	   username.
	221	7. `login(username, password, explicitId)` persists a record whose `userId` is
	222	   the explicit id and whose `username` is still the username.
	223	
	224	End-to-end infrastructure and fuzz/mutation testing were considered and
	225	rejected: a browser driver is a heavy dependency for one form with a stubbed
	226	login that makes no network call, and the only parse in the codebase is a single
	227	`JSON.parse` already guarded by `try/catch`. Linting and formatting were offered
	228	and declined.
	229	
	230	Manual verification: open `index.html`, submit the form, confirm the console
	231	line carries both values and that `sessionStorage` holds the record under
	232	`session.user`.
	233	
	234	## Files Touched
	235	
	236	| File | Change |
	237	|---|---|
	238	| `session.js` | New. The `Session` global, the storage key, and all error handling. |
	239	| `app.js` | `login()` gains the optional third parameter, logs and returns the id, calls `Session.setUser`; DOM wiring gets a `typeof document` guard; file gains a CommonJS export guard. |
	240	| `index.html` | One `<script src="session.js">` tag before `app.js`. |
	241	| `package.json` | A `test` script. |
	242	| `test/session.test.js` | New. The seven cases above. |
	243	
	244	`src/index.js` and `src/utils.js` are not touched. They are a separate Node
	245	entry point that the page never loads.
	246	
	247	## Risks and Assumptions
	248	
	249	- **Assumption: `session.js` loading before `app.js` is sufficient ordering.**
	250	  Both are synchronous classic scripts with no `defer` or `async`, so this holds
	251	  today. Validate by loading the page and confirming no `Session is not defined`
	252	  error. Adding `defer` to either tag later would break it.
	253	- **Assumption: the future forms are same-origin pages in this app.**
	254	  `sessionStorage` is per-origin and per-tab; a form opened in a new tab will
	255	  not see the record. Validate when the first additional form is built. If
	256	  cross-tab identity turns out to be required, that is a return to
	257	  `localStorage` and a re-decision, not a patch.
	258	- The password parameter remains unused, as it is today. This design does not
	259	  change that and does not store it.
	260	- `userId` is client-supplied and unverified. Until a real API issues it, it is
	261	  a tracking convenience, not an authorization fact, and nothing should make a
	262	  trust decision based on it.
	263	
	264	## Next Step
	265	
	266	Hand this spec to the writing-plans skill to produce an implementation plan.
	267	No code is written before that plan exists.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T112459Z-a95e/home/.cache/hyperpowers/codex-review/744b242ff1f125288b7ea54d224ee37ea5219639/run-Ev3x72ZW/approach-context.md

	1	# Approach Context
	2	
	3	## Original idea (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	**Q: Where should the userId value come from?** (options offered: optional
	10	parameter defaulting to username; from existing client state; a new form field)
	11	
	12	A: "It should work across the whole app and persist; other forms will need it
	13	later too."
	14	
	15	**Q: What should login() do with the userId once it has it?** (options offered:
	16	log it and return it; log only; return only)
	17	
	18	A: "It should persist so the rest of the app can tell who logged in, not just be
	19	logged."
	20	
	21	**Q: How long should the userId persist?** (in-memory only / sessionStorage /
	22	localStorage)
	23	
	24	A: sessionStorage — survives page reloads and in-tab navigation, cleared when
	25	the tab closes.
	26	
	27	**Q: What fills userId when the caller does not pass one?** (stub returns the
	28	username as the id / mint a client-side UUID / required parameter)
	29	
	30	A: The stub returns the username as the id; the parameter stays optional, with a
	31	single swap point for a real server-issued id later.
	32	
	33	## Codebase facts
	34	
	35	Repository is a minimal fixture project, `drill-test-project` v1.0.0. Full file
	36	list: `README.md`, `index.html`, `app.js`, `package.json`, `src/index.js`,
	37	`src/utils.js`. Git branch `feature/webapp-enhancement`, working tree clean.
	38	
	39	`package.json` in full:
	40	
	41	```json
	42	{
	43	  "name": "drill-test-project",
	44	  "version": "1.0.0",
	45	  "description": "Test project for Drill scenarios",
	46	  "main": "src/index.js"
	47	}
	48	```
	49	
	50	No `scripts` block, no dependencies, no devDependencies, no test runner, no
	51	linter or formatter config, no build step, no bundler, no `node_modules`.
	52	
	53	`index.html` in full:
	54	
	55	```html
	56	<!DOCTYPE html>
	57	<html>
	58	<head>
	59	  <title>Simple Webapp</title>
	60	</head>
	61	<body>
	62	  <h1>Login</h1>
	63	  <form id="login-form">
	64	    <input type="text" id="username" placeholder="Username" />
	65	    <input type="password" id="password" placeholder="Password" />
	66	    <button type="submit">Log In</button>
	67	  </form>
	68	  <script src="app.js"></script>
	69	</body>
	70	</html>
	71	```
	72	
	73	Note: a single classic `<script src="app.js">` tag, not `type="module"`. There
	74	is one HTML page in the repo; the "other forms" the human partner refers to do
	75	not exist yet.
	76	
	77	`app.js` in full:
	78	
	79	```js
	80	// Simple webapp with login form handling
	81	const API_ENDPOINT = "https://api.example.com/login";
	82	
	83	function login(username, password) {
	84	  console.log("Logging in:", username);
	85	  // Stub: would POST to API_ENDPOINT in real app
	86	  return { success: true, user: username };
	87	}
	88	
	89	function validateForm(formData) {
	90	  if (!formData.username || !formData.password) {
	91	    return { valid: false, error: "Missing required fields" };
	92	  }
	93	  return { valid: true };
	94	}
	95	
	96	document.getElementById("login-form").addEventListener("submit", (e) => {
	97	  e.preventDefault();
	98	  const username = document.getElementById("username").value;
	99	  const password = document.getElementById("password").value;
	100	  const validation = validateForm({ username, password });
	101	  if (validation.valid) {
	102	    const result = login(username, password);
	103	    console.log("Login result:", result);
	104	  } else {
	105	    console.error("Validation error:", validation.error);
	106	  }
	107	});
	108	```
	109	
	110	Facts about `app.js`: it is a flat classic script with no module syntax, no
	111	exports, and no state that outlives the submit handler. `API_ENDPOINT` is
	112	declared but never used — `login()` is a stub that does not perform a network
	113	call. `login()` has exactly one call site, the submit handler in the same file.
	114	The handler logs the returned object and discards it. There is no client-side
	115	identity, session, storage, or router layer of any kind.
	116	
	117	`src/index.js` in full:
	118	
	119	```js
	120	const { greet } = require('./utils');
	121	
	122	function main() {
	123	  console.log(greet('world'));
	124	}
	125	
	126	main();
	127	```
	128	
	129	`src/utils.js` in full:
	130	
	131	```js
	132	function greet(name) {
	133	  return `Hello, ${name}!`;
	134	}
	135	
	136	module.exports = { greet };
	137	```
	138	
	139	Facts about `src/`: it is CommonJS, runs under Node, and is the `main` entry in
	140	`package.json`. It is entirely disconnected from the browser side — `index.html`
	141	never loads it, and `app.js` never requires it. So the repo currently contains
	142	two unrelated module conventions: CommonJS in `src/`, and no module system at
	143	all in `app.js`.
	144	
	145	## Constraints
	146	
	147	- The `userId` parameter on `login()` is requested explicitly and is part of the
	148	  outcome.
	149	- Storage mechanism is settled: `sessionStorage`.
	150	- The default id value is settled: the username, produced by the stub, with one
	151	  place to change when a real API returns a server-issued id.
	152	- What is open is the structure: how the persisted identity is exposed to the
	153	  rest of the app, given that the browser side today has no module system and
	154	  the future consumers ("other forms") do not exist yet.
	155	- There is no established testing pattern in this repo to follow.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
