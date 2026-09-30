# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T225451Z-f421/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-user-tracking-identity-design.md

	1	# Persistent user tracking identity
	2	
	3	Date: 2026-09-30
	4	Status: approved design, not yet implemented
	5	
	6	## Problem
	7	
	8	The request was "add a `userId` parameter to the login function so we can
	9	track who logged in." Investigation showed the parameter has no value to
	10	receive: `index.html` collects only a username and a password, and
	11	`app.js`'s `login` is a stub that never calls `API_ENDPOINT`, so no user ID
	12	exists anywhere in the app.
	13	
	14	Clarification established a larger requirement than a parameter: the
	15	identifier must be readable from anywhere in the app, must persist across
	16	page loads, and must serve forms that do not exist yet. That is shared
	17	client-side state, which this app currently has none of.
	18	
	19	## Goals
	20	
	21	- A tracking handle that persists across page loads and identifies a
	22	  browser's activity across any number of forms.
	23	- A single place that defines what a tracked event looks like.
	24	- A seam where the server's account ID attaches to that activity once
	25	  `login` performs a real API call.
	26	- Working behavior today, against the existing stubbed `login`.
	27	
	28	## Non-goals
	29	
	30	- Replacing the `login` stub with a real API call. That is separate work.
	31	- Any analytics backend, event queue, batching, or network transport.
	32	  `track` writes to the console; the abstraction exists so that can change
	33	  in one file later.
	34	- Any authentication or authorization behavior. See "Security boundary".
	35	- Touching `src/index.js` or `src/utils.js`. They are a Node CommonJS entry
	36	  point unrelated to the browser code and are not loaded by `index.html`.
	37	
	38	## Decision: no `userId` parameter on `login`
	39	
	40	`login` keeps its `(username, password)` signature. The identifier lives in
	41	the shared store, which `login` reads and writes. A parameter would create a
	42	second, competing source for the same fact, and would not serve the stated
	43	requirement at all: the future forms that need this value never call
	44	`login` and could not pass anything to it.
	45	
	46	This divergence from the literal request was presented and approved.
	47	
	48	## Architecture
	49	
	50	The browser code is loaded by plain `<script>` tags with no build step, no
	51	bundler, and no module system. ES modules were considered and rejected:
	52	they break loading from `file://`, and they would leave the repository with
	53	two module systems, since `src/` is CommonJS. The design therefore stays
	54	inside the app's existing idiom.
	55	
	56	### New file: `tracking.js`
	57	
	58	An IIFE assigning one global, `Tracking`, with exactly four functions:
	59	
	60	```js
	61	Tracking.getHandle()           // -> string; mints and persists on first call
	62	Tracking.getUserId()           // -> string | null
	63	Tracking.setUserId(id)         // stores the account ID; null clears it
	64	Tracking.track(event, details) // one log line, handle and userId attached
	65	```
	66	
	67	`track` is the only place that decides the shape of a tracked event. It
	68	emits exactly one console line carrying one object:
	69	
	70	```js
	71	{ ...details, event, handle, userId, timestamp }
	72	```
	73	
	74	where `userId` is `null` when none is set and `timestamp` is an ISO 8601
	75	string. `details` is spread first so a caller cannot shadow `event`,
	76	`handle`, `userId`, or `timestamp`.
	77	
	78	Loaded from `index.html` before `app.js`, so the global exists when the
	79	submit handler binds.
	80	
	81	### Data model
	82	
	83	Two values with deliberately different lifetimes:
	84	
	85	| Value | Storage | Key | Lifetime |
	86	|---|---|---|---|
	87	| `handle` | `localStorage` | `tracking.handle` | Across browser restarts |
	88	| `userId` | `sessionStorage` | `tracking.userId` | Until the tab closes |
	89	
	90	`handle` is minted on first read and never rotated by this code. It names
	91	nobody, so persisting it indefinitely is safe.
	92	
	93	`userId` is deliberately *not* in `localStorage`. This app has no logout, so
	94	a `userId` in `localStorage` would outlive its session with nothing to ever
	95	clear it, and the next person to use a shared machine would have their
	96	activity logged under the previous user's account ID. Wrong attribution is
	97	worse than absent attribution. `sessionStorage` makes the session boundary
	98	do the clearing.
	99	
	100	### ID generation
	101	
	102	Fallback chain, because `crypto.randomUUID()` requires a secure context and
	103	is not guaranteed on `file://`:
	104	
	105	1. `crypto.randomUUID()`
	106	2. `crypto.getRandomValues()`, formatted as hex
	107	3. A `Math.random()`-based ID
	108	
	109	Step 3 is not cryptographically random. That is acceptable only because this
	110	handle is a correlation label, never a secret or a credential. `tracking.js`
	111	must carry a comment saying so, so the helper is not later reused for a
	112	token.
	113	
	114	## Security boundary
	115	
	116	Both stored values are client-editable; anyone can change them in devtools.
	117	They may label logs. They may **never** be the basis on which any endpoint
	118	decides who is asking — that determination stays server-side. `tracking.js`
	119	must state this in a comment at the point of definition, so the value is not
	120	later promoted into an authorization check.
	121	
	122	`track` must never be passed a password. Because a tracking helper is a
	123	plausible place for a credential to be logged by accident, this constraint
	124	is recorded in the file as well as here.
	125	
	126	## Changes to existing files
	127	
	128	`index.html` — one added line, `<script src="tracking.js"></script>` before
	129	the existing `app.js` script tag.
	130	
	131	`app.js` — `login`'s body changes; its signature does not. The existing
	132	`console.log("Logging in:", username)` is replaced by tracking calls:
	133	
	134	```js
	135	function login(username, password) {
	136	  Tracking.track("login.attempt", { username });
	137	  // Stub: would POST to API_ENDPOINT in real app
	138	  const result = { success: true, user: username };
	139	  if (result.success) {
	140	    // The real API will return the account ID; the stub has none to stamp.
	141	    Tracking.setUserId(result.userId ?? null);
	142	  }
	143	  Tracking.track("login.result", { username, success: result.success });
	144	  return result;
	145	}
	146	```
	147	
	148	The submit handler, `validateForm`, and `API_ENDPOINT` are unchanged.
	149	
	150	## Error handling
	151	
	152	Governing rule: **tracking must never be able to break login.**
	153	
	154	- `localStorage` and `sessionStorage` throw under real conditions — disabled
	155	  site data, sandboxed iframes, some private-browsing modes. Every read and
	156	  write is wrapped. On failure the value falls back to an in-memory copy
	157	  that lives as long as the page: persistence is lost, function is not.
	158	- If ID generation and storage both fail, `getHandle()` still returns a
	159	  per-page ID, `track` still logs, and `login` behaves exactly as it does
	160	  today.
	161	
	162	## Testing
	163	
	164	Unit tests via Node's built-in runner (`node --test`), chosen because it
	165	needs zero dependencies and keeps `package.json` dependency-free. The test
	166	file stubs `window`, both storages, and `crypto`.
	167	
	168	Cases:
	169	
	170	- The handle mints once and is stable across a simulated reload.
	171	- `setUserId` / `getUserId` round-trip, and `setUserId(null)` clears.
	172	- A storage that throws falls back to memory rather than propagating.
	173	- `track` output always carries the handle and the current `userId`.
	174	- `track` output never carries a password.
	175	
	176	Plus one manual browser pass: submit the form and confirm the logged event
	177	carries a handle; reload and confirm the handle is unchanged; reopen the tab
	178	and confirm `userId` is gone while the handle survives.
	179	
	180	## Global constraints
	181	
	182	- Zero runtime dependencies. `package.json` stays dependency-free.
	183	- No build step; the browser code remains classic scripts.
	184	- Unit test infrastructure is `node --test`. No linter, formatter, or
	185	  end-to-end harness is being introduced by this work.
	186	
	187	## Assumptions
	188	
	189	- Assumption: the real login API will return an account identifier that
	190	  `setUserId` can store; validate when the `login` stub is replaced with a
	191	  real call to `API_ENDPOINT`.
	192	- Assumption: no privacy or consent regime applies to persisting a
	193	  correlation handle in this app; validate with the project owner before
	194	  this ships to real users.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T225451Z-f421/home/.cache/hyperpowers/codex-review/58c4e23052230cd6f4b020fa5f48a22fb00c10a8/run-gU02UlNn/approach-context.md

	1	# Approach context
	2	
	3	## Original request (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	**Q: Where should the userId come from?**
	10	A: "Whatever you think is right. It should work across the app and persist; other forms will need it later."
	11	
	12	**Q: What is this ID, semantically — an authenticated identity, a client-generated tracking handle, or both?**
	13	A: Both, handle first. Mint a persisted client tracking handle now; stamp the server's account ID onto it once login calls the real API. It must work today against the stubbed login and extend later.
	14	
	15	## Requirements derived from those answers
	16	
	17	- A user/tracking identifier must be readable and writable from anywhere in the app, not just the login flow.
	18	- It must persist across page loads.
	19	- Additional forms, which do not exist yet, will need to read it later.
	20	- A client-minted correlation handle is needed now and must function while `login` is still a stub.
	21	- A server-issued account identifier is attached later, when `login` performs a real API call.
	22	
	23	## Codebase facts
	24	
	25	Repository root contains: `index.html`, `app.js`, `package.json`, `README.md`, `src/index.js`, `src/utils.js`.
	26	
	27	`package.json` in full:
	28	
	29	```json
	30	{
	31	  "name": "drill-test-project",
	32	  "version": "1.0.0",
	33	  "description": "Test project for Drill scenarios",
	34	  "main": "src/index.js"
	35	}
	36	```
	37	
	38	No dependencies, no devDependencies, no scripts. No test runner, no linter, no formatter, no bundler, no build step, no CI configuration present.
	39	
	40	`index.html` in full:
	41	
	42	```html
	43	<!DOCTYPE html>
	44	<html>
	45	<head>
	46	  <title>Simple Webapp</title>
	47	</head>
	48	<body>
	49	  <h1>Login</h1>
	50	  <form id="login-form">
	51	    <input type="text" id="username" placeholder="Username" />
	52	    <input type="password" id="password" placeholder="Password" />
	53	    <button type="submit">Log In</button>
	54	  </form>
	55	  <script src="app.js"></script>
	56	</body>
	57	</html>
	58	```
	59	
	60	`app.js` in full:
	61	
	62	```js
	63	// Simple webapp with login form handling
	64	const API_ENDPOINT = "https://api.example.com/login";
	65	
	66	function login(username, password) {
	67	  console.log("Logging in:", username);
	68	  // Stub: would POST to API_ENDPOINT in real app
	69	  return { success: true, user: username };
	70	}
	71	
	72	function validateForm(formData) {
	73	  if (!formData.username || !formData.password) {
	74	    return { valid: false, error: "Missing required fields" };
	75	  }
	76	  return { valid: true };
	77	}
	78	
	79	document.getElementById("login-form").addEventListener("submit", (e) => {
	80	  e.preventDefault();
	81	  const username = document.getElementById("username").value;
	82	  const password = document.getElementById("password").value;
	83	  const validation = validateForm({ username, password });
	84	  if (validation.valid) {
	85	    const result = login(username, password);
	86	    console.log("Login result:", result);
	87	  } else {
	88	    console.error("Validation error:", validation.error);
	89	  }
	90	});
	91	```
	92	
	93	Facts about `app.js`:
	94	- It is loaded via a plain `<script src="app.js">` tag. It is not a module: no `import`/`export`, no `type="module"` on the script tag.
	95	- `login` is synchronous, has exactly one caller (the submit handler in the same file), and is a stub: it never contacts `API_ENDPOINT` and returns a hardcoded `{ success: true, user: username }`.
	96	- The login form collects only `username` and `password`. No element in the page supplies any user or session identifier.
	97	- Observability today consists of `console.log` / `console.error` calls. There is no analytics client, no logging library, and no telemetry endpoint.
	98	
	99	`src/utils.js` in full:
	100	
	101	```js
	102	function greet(name) {
	103	  return `Hello, ${name}!`;
	104	}
	105	
	106	module.exports = { greet };
	107	```
	108	
	109	`src/index.js` in full:
	110	
	111	```js
	112	const { greet } = require('./utils');
	113	
	114	function main() {
	115	  console.log(greet('world'));
	116	}
	117	
	118	main();
	119	```
	120	
	121	Facts about `src/`:
	122	- `src/` uses CommonJS (`require` / `module.exports`) and runs under Node, not in the browser.
	123	- Nothing in `src/` is referenced by `index.html` or `app.js`. The browser code and the `src/` code share no module system and no code today.
	124	- `package.json` `main` points at `src/index.js`.
	125	
	126	## Repository state
	127	
	128	- Git branch: `feature/webapp-enhancement`, working tree clean.
	129	- Recent commits: "Add simple webapp fixture", "add entry point", "add utils module", "initial commit".
	130	
	131	## What to produce
	132	
	133	Propose 2-3 genuinely different architectures for introducing a persistent,
	134	app-wide user/tracking identifier into this codebase, satisfying the
	135	requirements above.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
