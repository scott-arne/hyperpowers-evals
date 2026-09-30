# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T180204Z-397b/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-login-session-userid-design.md

	1	# Login Session userId — Design
	2	
	3	Date: 2026-09-30
	4	Status: Approved (design); spec pending user review
	5	
	6	## Problem
	7	
	8	The app has no way to know who is logged in after `login` returns. The
	9	original request was to "add a userId parameter to the login function so we
	10	can track who logged in", but `login` is the call that *establishes* identity:
	11	its only caller is the form submit handler, which holds nothing but the
	12	username and password typed into the form. A caller-supplied `userId` would
	13	therefore be a value the caller invented, tracking nothing real.
	14	
	15	The identity information flows the other way — out of `login`, not into it.
	16	The follow-up requirement ("it should work across the app and persist; other
	17	forms will need it later") means that value also has to outlive the call that
	18	produced it and be readable by code that does not exist yet.
	19	
	20	## Decisions
	21	
	22	Settled with the human partner during brainstorming:
	23	
	24	| Question | Decision |
	25	|---|---|
	26	| Direction of the userId | `login` **returns** it; it is not a parameter |
	27	| What consumers do with it | **Shared app state** — forms read it to drive behavior, not only to log it |
	28	| Persistence | **Per-tab `sessionStorage`** — survives reload and navigation, clears when the tab closes |
	29	| Module loading | **Classic `<script>` + one namespaced global** (ES modules rejected: they break `file://`) |
	30	| Structure | **Dedicated session module**, rather than a bare storage-key convention or a pub/sub session |
	31	| Tooling | **Unit tests via built-in `node:test`**; no linter for now |
	32	
	33	Rejected alternatives and why:
	34	
	35	- **Caller-supplied `userId`.** The caller has no such value. Minting one
	36	  client-side yields a correlation ID, not a user identity; naming it `userId`
	37	  would mislead the next reader.
	38	- **`localStorage`.** The app has no logout, so a per-browser value would never
	39	  be cleared — on a shared machine the previous user's id would still be there.
	40	  Revisit only together with a real logout.
	41	- **Bare storage-key convention (no module).** Duplicates the key string at
	42	  every call site, where a typo fails silently as "logged out", and forces each
	43	  consumer to invent its own missing-value handling.
	44	- **Session with subscriptions.** No second form and no logout exist, so there
	45	  is no subscriber to serve. `subscribe` can be added to this design later
	46	  without breaking any caller.
	47	
	48	## Architecture
	49	
	50	Three files; one is new.
	51	
	52	### `session.js` (new)
	53	
	54	An IIFE attaching a single global, `AppSession`. It is the **only** code in the
	55	app that knows the storage key or touches `sessionStorage`. Consumers never
	56	read storage directly.
	57	
	58	Public interface:
	59	
	60	- `setUser(userId)` — record the logged-in user.
	61	- `getUserId()` — the current user id as a string, or `null` if nobody is
	62	  logged in.
	63	- `isLoggedIn()` — `getUserId() !== null`.
	64	- `clear()` — forget the current user. Unused today; it is the seam a future
	65	  logout attaches to.
	66	
	67	Internals:
	68	
	69	- `STORAGE_KEY = "app.userId"` — defined once, here.
	70	- `cachedUserId` — in-memory mirror of the stored value.
	71	
	72	Writes go to both the cache and `sessionStorage`. Reads prefer the cache and
	73	fall back to storage; that fallback is what rehydrates the value after a page
	74	reload, when the cache starts empty. A successful fallback read **populates the
	75	cache**, so storage is touched at most once per page load.
	76	
	77	The file also ends with a CommonJS export guard so the module can be unit
	78	tested under Node:
	79	
	80	```js
	81	if (typeof module !== "undefined") { module.exports = AppSession; }
	82	```
	83	
	84	This changes nothing about how the browser loads the file as a classic script.
	85	
	86	### `app.js` (changed)
	87	
	88	- `login(username, password)` returns `{ success, userId, username }`.
	89	- The `user` field is renamed to `username`. Carrying both `user` (a name) and
	90	  `userId` in one object invites exactly the confusion this design exists to
	91	  avoid. The single caller only logs the whole object and never reads `.user`,
	92	  so no behavior depends on the old name.
	93	- The stub synthesizes the userId as `` `stub-${username}` ``, prefixed so it
	94	  is visibly not a real identifier, with a comment recording that the server
	95	  supplies this value once `API_ENDPOINT` is live. Replacing the stub with the
	96	  real API changes this function body only; `AppSession` and every consumer are
	97	  untouched.
	98	- The submit handler calls `AppSession.setUser(result.userId)` **only when
	99	  `result.success` is true**.
	100	
	101	### `index.html` (changed)
	102	
	103	Add `<script src="session.js"></script>` **before** `<script src="app.js">`.
	104	The submit handler needs `AppSession` to exist at submit time.
	105	
	106	## Data flow
	107	
	108	```
	109	submit
	110	  → validateForm({ username, password })
	111	  → login(username, password)
	112	      ↓ { success: true, userId, username }
	113	  → AppSession.setUser(userId)
	114	      ↓
	115	    cachedUserId  +  sessionStorage["app.userId"]
	116	
	117	later form
	118	  → AppSession.getUserId()
	119	      → cachedUserId, else sessionStorage, else null
	120	```
	121	
	122	## Error handling
	123	
	124	| Case | Behavior |
	125	|---|---|
	126	| `sessionStorage` throws on write | Caught. In-memory cache is still set; one `console.warn`. Login still succeeds; the value simply does not survive a reload. |
	127	| `sessionStorage` throws on read | Caught. Returns the cache if present, otherwise `null`. |
	128	| `login` returns `success: false` | Session left untouched. Existing `console.error` path in the handler is unchanged. Unreachable while `login` is a stub; implemented correctly regardless. |
	129	| `setUser(null)` / `setUser("")` | Rejected with a `console.warn`; nothing is written. Storing a garbage value such as the string `"undefined"` would read back as a logged-in user. |
	130	| Fresh tab, no login yet | `getUserId()` → `null`; `isLoggedIn()` → `false`. |
	131	
	132	Storage on this origin is readable by any script on the origin. The value held
	133	here is an identifier only. The password never enters the session module and is
	134	never logged.
	135	
	136	## Testing
	137	
	138	Unit tests with the built-in `node:test` runner — zero new dependencies, which
	139	is the only reason to add a runner to a repo this small. `package.json` gains a
	140	`scripts.test` entry of `node --test`.
	141	
	142	Tests construct a fake `sessionStorage` and exercise `AppSession` directly:
	143	
	144	1. `setUser` then `getUserId` returns the id.
	145	2. `getUserId` on a fresh module returns `null`.
	146	3. A value already in storage is read back after the cache is cold (the reload
	147	   path).
	148	4. A storage object whose `setItem` throws: `setUser` does not propagate, and
	149	   `getUserId` still returns the value from cache.
	150	5. A storage object whose `getItem` throws: `getUserId` returns `null` rather
	151	   than propagating.
	152	6. `setUser("")` and `setUser(null)` leave `isLoggedIn()` false.
	153	7. `clear()` resets both cache and storage; `getUserId()` returns `null`.
	154	
	155	`login`'s new return shape is covered by asserting `success`, `username`, and a
	156	non-empty `userId` — not the exact stub string, which is placeholder data and
	157	should not be pinned by a test.
	158	
	159	Not covered by unit tests: the `index.html` script ordering and the real
	160	browser submit path. Verified by hand — open the page, submit the form, confirm
	161	`AppSession.getUserId()` in the console, reload, confirm it survives, then
	162	close and reopen the tab and confirm it is `null`.
	163	
	164	## Out of scope
	165	
	166	- Logout. `clear()` exists as its seam, but no UI calls it.
	167	- The real API call. `login` stays a synchronous stub; making it async is a
	168	  separate change that will alter the handler's control flow.
	169	- Any second form. This design exists so adding one is cheap, but none is built
	170	  here.
	171	- Sending the userId to the server. A client-held identifier the server trusts
	172	  is a security decision, not plumbing, and was explicitly not chosen.
	173	- Sharing code between `app.js` and `src/`. They remain disconnected.
	174	
	175	## Assumptions
	176	
	177	- Assumption: the per-tab lifetime is the desired one for the forms that come
	178	  later; validate when the second consumer is built, by checking whether it
	179	  needs the userId in a tab the user did not log in from.
	180	- Assumption: the stub's derived userId is adequate until the real endpoint
	181	  lands; validate when `API_ENDPOINT` is wired up, by confirming the server's
	182	  identifier flows through `AppSession` unchanged.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T180204Z-397b/home/.cache/hyperpowers/codex-review/7d80665131c1963bc64d1813facaaf15c48bb102/run-rBrPcEwk/approach-context.md

	1	# Approach Context
	2	
	3	## Original idea (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	Follow-up, verbatim:
	8	
	9	> Go with your recommendation. It should work across the app and persist; other forms will need it later.
	10	
	11	(The recommendation referred to: have `login` return the userId from the login
	12	result rather than accept a caller-supplied one, since the login call is what
	13	establishes identity and the only caller has no userId available.)
	14	
	15	## Clarifying questions and answers
	16	
	17	1. **What will the other forms actually do with the userId?**
	18	   Answer: **Shared app state** — forms read it to drive behavior (prefill,
	19	   show/hide, branch logic), not merely to tag logs. Implies a defined
	20	   lifecycle and a defined "not logged in yet" answer.
	21	
	22	2. **How long should the userId persist after login?**
	23	   Answer: **Per-tab / `sessionStorage`** — survives reloads and navigation,
	24	   clears when the tab closes. Chosen partly because the app currently has no
	25	   logout of any kind, so automatic expiry is the only clearing mechanism.
	26	
	27	3. **How do you open this app during development?**
	28	   Answer: **Not sure / no preference** — resolved to the option that works in
	29	   both cases: a classic `<script>` with one namespaced global. ES modules are
	30	   ruled out because they break `file://` loading.
	31	
	32	## Codebase facts
	33	
	34	Repository is tiny. Full file list (excluding `.git`):
	35	
	36	```
	37	index.html
	38	README.md
	39	package.json
	40	app.js
	41	src/index.js
	42	src/utils.js
	43	```
	44	
	45	### `index.html` (complete)
	46	
	47	```html
	48	<!DOCTYPE html>
	49	<html>
	50	<head>
	51	  <title>Simple Webapp</title>
	52	</head>
	53	<body>
	54	  <h1>Login</h1>
	55	  <form id="login-form">
	56	    <input type="text" id="username" placeholder="Username" />
	57	    <input type="password" id="password" placeholder="Password" />
	58	    <button type="submit">Log In</button>
	59	  </form>
	60	  <script src="app.js"></script>
	61	</body>
	62	</html>
	63	```
	64	
	65	### `app.js` (complete)
	66	
	67	```js
	68	// Simple webapp with login form handling
	69	const API_ENDPOINT = "https://api.example.com/login";
	70	
	71	function login(username, password) {
	72	  console.log("Logging in:", username);
	73	  // Stub: would POST to API_ENDPOINT in real app
	74	  return { success: true, user: username };
	75	}
	76	
	77	function validateForm(formData) {
	78	  if (!formData.username || !formData.password) {
	79	    return { valid: false, error: "Missing required fields" };
	80	  }
	81	  return { valid: true };
	82	}
	83	
	84	document.getElementById("login-form").addEventListener("submit", (e) => {
	85	  e.preventDefault();
	86	  const username = document.getElementById("username").value;
	87	  const password = document.getElementById("password").value;
	88	  const validation = validateForm({ username, password });
	89	  if (validation.valid) {
	90	    const result = login(username, password);
	91	    console.log("Login result:", result);
	92	  } else {
	93	    console.error("Validation error:", validation.error);
	94	  }
	95	});
	96	```
	97	
	98	### `src/index.js` (complete)
	99	
	100	```js
	101	const { greet } = require('./utils');
	102	
	103	function main() {
	104	  console.log(greet('world'));
	105	}
	106	
	107	main();
	108	```
	109	
	110	### `src/utils.js` (complete)
	111	
	112	```js
	113	function greet(name) {
	114	  return `Hello, ${name}!`;
	115	}
	116	
	117	module.exports = { greet };
	118	```
	119	
	120	### `package.json` (complete)
	121	
	122	```json
	123	{
	124	  "name": "drill-test-project",
	125	  "version": "1.0.0",
	126	  "description": "Test project for Drill scenarios",
	127	  "main": "src/index.js"
	128	}
	129	```
	130	
	131	### Additional constraints and observations
	132	
	133	- `login` is synchronous and is a stub; it does not call `API_ENDPOINT`. It
	134	  returns `{ success: true, user: username }`. A real implementation would be
	135	  async and would return a server-assigned user identifier.
	136	- `login` has exactly one caller: the submit handler in `app.js`.
	137	- There is no logout, no session concept, no router, and no second page.
	138	- There is no test runner, no linter, no formatter, and no dependencies.
	139	  `package.json` has no `scripts` block.
	140	- `app.js` (browser, classic script, no module system) and `src/` (Node,
	141	  CommonJS) currently share no code and have no build step connecting them.
	142	- "Other forms will need it later" — no other forms exist yet.
	143	- Browser storage on this origin is readable by any script on the origin; the
	144	  value under discussion is an identifier, not a credential.
	145	
	146	## What is wanted
	147	
	148	Two or three genuinely different approaches for where the logged-in user's
	149	identifier lives after login and how future forms read it, given the answers
	150	above. Focus on module shape, data model, the lifecycle/invalidation story,
	151	and how `login`'s contract changes.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
