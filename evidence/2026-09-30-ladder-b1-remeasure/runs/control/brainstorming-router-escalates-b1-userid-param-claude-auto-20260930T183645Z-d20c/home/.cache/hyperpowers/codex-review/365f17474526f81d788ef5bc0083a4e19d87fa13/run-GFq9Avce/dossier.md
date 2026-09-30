# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T183645Z-d20c/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-current-user-store-design.md

	1	# Current-User Store Design
	2	
	3	Date: 2026-09-30
	4	Status: approved design, not yet implemented
	5	
	6	## Problem
	7	
	8	The request was "add a `userId` parameter to the login function so we can track
	9	who logged in." Inspecting the code showed the parameter framing does not work:
	10	`login()` is called from a pre-authentication form submit handler
	11	(`app.js:23`), and at that moment nothing in the app knows a user id. The id is
	12	information login *produces*, not information it needs.
	13	
	14	Clarification also established that "track" means the logged-in user must
	15	persist across the app, because other forms not yet written will need to read
	16	it. That makes this a new subsystem — storage with a lifetime plus a shared
	17	interface for future consumers — rather than a one-file change, so it was
	18	brainstormed as an architectural task.
	19	
	20	## Decisions
	21	
	22	These were settled with the human partner before this document was written.
	23	
	24	1. `login()` keeps its `(username, password)` signature. The user id is
	25	   returned in the result object, not passed in.
	26	2. The data model is a **current-user store**: one live value for who is logged
	27	   in now. Not an append-only event log. History questions ("when did they log
	28	   in", "what did they do") are explicitly out of scope; an event log can be
	29	   added on top of this interface later without a rewrite.
	30	3. Persistence medium is **`sessionStorage`** — survives reload and navigation,
	31	   cleared when the tab closes, isolated per tab. Not `localStorage`: a user id
	32	   should not outlive the browsing session on a shared machine, and per-tab
	33	   isolation avoids cross-tab clobbering.
	34	4. Sharing strategy is a **global namespace script**, not ES modules and not a
	35	   bundler. `index.html` loads `app.js` as a classic script with no build step;
	36	   a global keeps the app working under both `file://` and http. Converting to
	37	   ES modules later is mechanical (exports plus `type="module"`), so this is
	38	   not a one-way door. A bundler was rejected under YAGNI — nothing here needs
	39	   browser/Node code sharing.
	40	5. Error policy: **environment failures degrade, contract violations throw.**
	41	6. Tooling: **`node:test` unit tests**, set up before implementation. No linter
	42	   or formatter for now. No end-to-end, fuzz, or mutation testing.
	43	
	44	## Architecture
	45	
	46	### New file: `session.js`
	47	
	48	The entire subsystem. An IIFE that assigns one global:
	49	
	50	```js
	51	globalThis.AppSession = { setUser, getUser, clear };
	52	```
	53	
	54	`globalThis` rather than `window`: in a browser the two are the same object, so
	55	page code still calls `AppSession.setUser(...)` unchanged, but `window` is
	56	undefined in Node and would make the file unloadable by the unit tests below.
	57	
	58	Storage key: `app.currentUser`. Stored value: JSON of
	59	`{ userId: string, username: string }`.
	60	
	61	The username is stored alongside the id deliberately. Future forms will want to
	62	display who is logged in, and storing the id alone would force a name lookup
	63	this app has no way to perform.
	64	
	65	#### Interface
	66	
	67	`setUser({ userId, username })` → `boolean`
	68	
	69	- Validates that `userId` and `username` are both non-empty strings. If not,
	70	  throws `TypeError`. This is a caller bug; swallowing it would leave the store
	71	  silently holding `undefined`.
	72	- Writes the JSON to `sessionStorage`. Returns `true` on success.
	73	- On any storage failure, returns `false` and emits a `console.warn`. Does not
	74	  throw.
	75	
	76	`getUser()` → `{ userId, username } | null`
	77	
	78	- Returns `null` when storage is unavailable, the key is absent, or the stored
	79	  JSON is unparseable. "Nobody is logged in" is the safe answer for all three.
	80	- Never throws.
	81	- On unparseable JSON, removes the key before returning `null`, so the next
	82	  call is not fighting the same bad data.
	83	- Reads through to `sessionStorage` on every call. There is no in-memory cache,
	84	  so two scripts on a page cannot disagree about who is logged in.
	85	
	86	`clear()` → `void`
	87	
	88	- Removes the key. Never throws. This is the logout hook, for whenever a logout
	89	  exists.
	90	
	91	#### Storage access
	92	
	93	Every access is wrapped in `try`/`catch` at the point of use rather than probed
	94	once at load. Storage becoming unavailable mid-session is then handled
	95	identically to it being unavailable at startup.
	96	
	97	Three real failure modes motivate this: a browser blocking site data can throw
	98	`SecurityError` on access to `window.sessionStorage` itself; Safari private mode
	99	has historically thrown on writes; and the stored JSON is user-editable through
	100	devtools and therefore untrusted input.
	101	
	102	### Changes to `app.js`
	103	
	104	Two changes.
	105	
	106	1. `login()` returns `{ success: true, userId, user: username }`. The signature
	107	   is unchanged.
	108	
	109	   The user id is synthesized as `` `stub-${username}` ``. `login()` is a stub
	110	   that never calls `API_ENDPOINT`, so there is no real id available. The
	111	   synthesized form is deterministic — the same login yields the same id across
	112	   pages during development — and obviously fake, so it cannot be mistaken for
	113	   real data. It carries a comment in the style of the existing `// Stub:` line
	114	   and is the single line to delete when a real API arrives.
	115	
	116	2. The submit handler, on a successful login, calls
	117	   `AppSession.setUser({ userId: result.userId, username: result.user })`. If
	118	   that returns `false`, it logs a warning and continues. A login that succeeds
	119	   while tracking fails is not a reason to fail the login.
	120	
	121	### Changes to `index.html`
	122	
	123	Add `<script src="session.js"></script>` before the existing `app.js` tag.
	124	Every future page does the same, before its own script.
	125	
	126	A page that forgets the tag will hit a raw `ReferenceError: AppSession is not
	127	defined`. This is intentional and left undefended: the error is loud, immediate,
	128	and points at the right line. Guarding it would mean every caller writing
	129	`typeof AppSession` checks, which is worse than the failure.
	130	
	131	### Not touched
	132	
	133	`src/index.js` and `src/utils.js` are an unrelated CommonJS `greet()` demo that
	134	the browser app does not reference. They are out of scope.
	135	
	136	## Data flow
	137	
	138	```
	139	form submit
	140	  -> validateForm({ username, password })
	141	  -> login(username, password)           returns { success, userId, user }
	142	  -> AppSession.setUser({ userId, username })
	143	  -> sessionStorage["app.currentUser"]
	144	  -> any later page: AppSession.getUser()
	145	```
	146	
	147	## Testing
	148	
	149	`node:test` (built in, no dependencies installed) with a fake `sessionStorage`
	150	injected as `globalThis.sessionStorage`.
	151	
	152	This requires a two-line tail on `session.js` so it can be required from Node:
	153	
	154	```js
	155	if (typeof module !== "undefined") module.exports = AppSession;
	156	```
	157	
	158	This matches the CommonJS already used in `src/`. Without it the file is not
	159	loadable outside a browser and the error paths below cannot be tested at all.
	160	
	161	Add to `package.json`:
	162	
	163	```json
	164	"scripts": { "test": "node --test" }
	165	```
	166	
	167	Cases to cover:
	168	
	169	- Round trip: `setUser` then `getUser` returns the same `{ userId, username }`.
	170	- Empty store: `getUser()` with no key returns `null`.
	171	- Corrupt data: `getUser()` with non-JSON in the key returns `null` **and**
	172	  removes the key.
	173	- Throwing storage: `setUser` returns `false` (not throws) when the fake
	174	  storage throws on write; `getUser` returns `null` when it throws on read.
	175	- Bad arguments: `setUser` throws `TypeError` for missing, empty, or non-string
	176	  `userId` or `username`.
	177	- `clear()` removes the key; a subsequent `getUser()` returns `null`.
	178	- `login()` returns a `userId` matching `stub-<username>`.
	179	
	180	The browser wiring — the script tag and the submit handler's `setUser` call —
	181	is not unit tested. It is verified by loading `index.html`, submitting the form,
	182	and confirming `sessionStorage` holds the expected value.
	183	
	184	## Out of scope
	185	
	186	- Login history or an event log (decision 2).
	187	- Real authentication or any call to `API_ENDPOINT`. `login()` stays a stub.
	188	- A logout UI. `clear()` exists for it; nothing calls it yet.
	189	- The other forms themselves. This builds the store they will read.
	190	- Linting, formatting, end-to-end, fuzz, and mutation testing (decision 6).
	191	- Any change to `src/`.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T183645Z-d20c/home/.cache/hyperpowers/codex-review/365f17474526f81d788ef5bc0083a4e19d87fa13/run-PPcxDZHJ/approach-context.md

	1	# Approach Context
	2	
	3	## Original request (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	**Q: Where should the userId come from — returned from `login()`, passed in as a
	10	parameter, or is `username` already the identifier?**
	11	A: Returned from `login()`. The function keeps its `(username, password)`
	12	signature and the user id comes back in the result object.
	13	
	14	**Q: What does "track" mean — local console logging in this stub, or something
	15	that persists?**
	16	A: "It should persist and work across the app — other forms will need it later."
	17	
	18	**Q: What shape should the tracked user data take — a single current-user value,
	19	an append-only event log, or both?**
	20	A: A current-user store: one live value for who is logged in now, which other
	21	forms read.
	22	
	23	**Q: How long should the logged-in user persist — in-memory only, `sessionStorage`,
	24	or `localStorage`?**
	25	A: `sessionStorage`.
	26	
	27	## Settled constraints from those answers
	28	
	29	1. `login(username, password)` keeps its signature; the user id is part of what
	30	   it returns.
	31	2. The user id must survive page reload and navigation and be readable by other
	32	   forms/pages that do not exist yet.
	33	3. The data model is a single current-user value, not an event history.
	34	4. The persistence medium is `sessionStorage`.
	35	
	36	## Codebase facts
	37	
	38	Repository is a minimal static web app. Full file list (excluding `.git`):
	39	
	40	```
	41	index.html
	42	README.md
	43	package.json
	44	app.js
	45	src/index.js
	46	src/utils.js
	47	```
	48	
	49	### `index.html` (complete)
	50	
	51	```html
	52	<!DOCTYPE html>
	53	<html>
	54	<head>
	55	  <title>Simple Webapp</title>
	56	</head>
	57	<body>
	58	  <h1>Login</h1>
	59	  <form id="login-form">
	60	    <input type="text" id="username" placeholder="Username" />
	61	    <input type="password" id="password" placeholder="Password" />
	62	    <button type="submit">Log In</button>
	63	  </form>
	64	  <script src="app.js"></script>
	65	</body>
	66	</html>
	67	```
	68	
	69	Note: `app.js` is loaded as a **classic script**, not `type="module"`. There is
	70	no bundler, no build step, and no dev server configured.
	71	
	72	### `app.js` (complete)
	73	
	74	```js
	75	// Simple webapp with login form handling
	76	const API_ENDPOINT = "https://api.example.com/login";
	77	
	78	function login(username, password) {
	79	  console.log("Logging in:", username);
	80	  // Stub: would POST to API_ENDPOINT in real app
	81	  return { success: true, user: username };
	82	}
	83	
	84	function validateForm(formData) {
	85	  if (!formData.username || !formData.password) {
	86	    return { valid: false, error: "Missing required fields" };
	87	  }
	88	  return { valid: true };
	89	}
	90	
	91	document.getElementById("login-form").addEventListener("submit", (e) => {
	92	  e.preventDefault();
	93	  const username = document.getElementById("username").value;
	94	  const password = document.getElementById("password").value;
	95	  const validation = validateForm({ username, password });
	96	  if (validation.valid) {
	97	    const result = login(username, password);
	98	    console.log("Login result:", result);
	99	  } else {
	100	    console.error("Validation error:", validation.error);
	101	  }
	102	});
	103	```
	104	
	105	`login()` is a stub: it does not call `API_ENDPOINT`, it returns a hardcoded
	106	success, and there is currently no source of a user id anywhere in the app.
	107	`login()` has exactly one call site, the submit handler above.
	108	
	109	### `package.json` (complete)
	110	
	111	```json
	112	{
	113	  "name": "drill-test-project",
	114	  "version": "1.0.0",
	115	  "description": "Test project for Drill scenarios",
	116	  "main": "src/index.js"
	117	}
	118	```
	119	
	120	No dependencies, no devDependencies, no `scripts` block. No test runner, no
	121	linter, no formatter is configured. There are no tests in the repository.
	122	
	123	### `src/`
	124	
	125	`src/index.js` and `src/utils.js` are a CommonJS `greet()` demo
	126	(`module.exports = { greet }`) unrelated to the browser app; `app.js` does not
	127	reference them. `package.json` `main` points at `src/index.js`.
	128	
	129	So the repo currently mixes two module worlds: CommonJS under `src/` (Node) and
	130	global-scope classic scripts for the browser page. Nothing shares code between
	131	them today.
	132	
	133	### Git
	134	
	135	Branch `feature/webapp-enhancement`, clean working tree. Recent commits:
	136	`df69c0e Add simple webapp fixture`, `30bc3c3 add entry point`,
	137	`424fba3 add utils module`, `2c4adf4 initial commit`.
	138	
	139	## What is being asked of you
	140	
	141	Propose approaches for introducing a persistent current-user store that
	142	`login()` populates and that other, not-yet-written forms across this app can
	143	read, under the four settled constraints above.
	144	
	145	Things the approaches need to have a position on:
	146	
	147	- How the store is shared with other pages/forms given the classic-script,
	148	  no-build-step loading in `index.html`.
	149	- The store's public interface and where it lives on disk.
	150	- Where the user id comes from, given `login()` is a stub with no real API.
	151	- What happens on read when nobody is logged in, and how the store is cleared.
	152	- What testability is achievable given there is no test infrastructure at all.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
