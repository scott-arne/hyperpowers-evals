# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T015844Z-3b5a/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-client-identity-tracking-design.md

	1	# Client Identity Tracking — Design
	2	
	3	Date: 2026-09-16
	4	Status: Approved in brainstorming; awaiting user review before planning
	5	
	6	## Problem
	7	
	8	The request that started this work was "add a `userId` parameter to the login
	9	function so we can track who logged in." Investigation showed the literal change
	10	was not implementable as stated: `login()` in `app.js` has one call site, the
	11	form submit handler, and that handler holds only the username and password read
	12	from the DOM. No user ID exists anywhere in the repository, so the parameter
	13	would have been `undefined` at every call.
	14	
	15	The underlying need, as clarified, is broader than one signature: an identity
	16	value that works across the app, persists across visits, and can be consumed by
	17	forms that do not exist yet. That makes this a new subsystem rather than a
	18	one-line change.
	19	
	20	## Goals
	21	
	22	- A persistent, anonymous device identifier available anywhere in the app.
	23	- An account identifier linked to that device once a login succeeds.
	24	- Event emission that carries both identifiers, behind an interface that a real
	25	  transport can replace without touching call sites.
	26	- Reusable by future forms without each one reimplementing identity.
	27	
	28	## Non-goals
	29	
	30	- Real authentication, sessions, or tokens. `login()` remains a stub.
	31	- A network transport for events. Console output only, behind the interface.
	32	- A third-party analytics vendor.
	33	- A build step, bundler, or transpiler.
	34	- Cross-device or server-side identity correlation.
	35	
	36	## Decisions
	37	
	38	Each of these was chosen explicitly during brainstorming; the rejected
	39	alternatives are recorded because they are the ones likely to be revisited.
	40	
	41	| Decision | Chosen | Rejected alternatives |
	42	|---|---|---|
	43	| What the ID identifies | Anonymous device ID, linked to an account ID after login | Account-only (nothing before login); device-only (no real attribution) |
	44	| Event destination | `console`, behind a swappable interface | Own backend POST; third-party SDK |
	45	| Device ID storage | `localStorage` | Cookie (consent obligations, per-request overhead); `sessionStorage` (per-tab, breaks "persists") |
	46	| Account ID storage | In memory, for the page's lifetime | `localStorage` / `sessionStorage` — both assert an identity claim that no token or server backs, and mislabel the next user of a shared browser |
	47	| Module delivery | Dual-format: CommonJS with a global-attach footer | Global-only script (untestable under Node); native ES modules (requires a dev server, breaks `file://`); bundler (build step unjustified for one module) |
	48	| `login()` signature | Unchanged, two parameters | Adding the requested `userId` third parameter — no caller can supply one |
	49	| Tooling | Unit tests via `node --test` | ESLint + Prettier; Playwright e2e |
	50	
	51	### Why `login()` does not gain a `userId` parameter
	52	
	53	This is a deliberate departure from the original request, approved during
	54	design. The device ID is available from the tracking module directly, so passing
	55	it in would be redundant; the account ID only exists after the server answers,
	56	so it cannot be passed in at all. `login()` therefore keeps
	57	`login(username, password)` and calls the tracking module itself on success.
	58	
	59	## Architecture
	60	
	61	### New file: `tracking.js` (repo root, beside `app.js`)
	62	
	63	One responsibility: own the two identity values and emit events. It touches no
	64	DOM and knows nothing about forms, so every future form depends on the same
	65	small surface.
	66	
	67	```js
	68	Tracking.getDeviceId()         // string; generates + persists on first call
	69	Tracking.getAccountId()        // string | null
	70	Tracking.identify(accountId)   // link this account to this device
	71	Tracking.reset()               // logout: drop the account link, keep the device ID
	72	Tracking.track(event, props)   // emit, with both IDs attached automatically
	73	```
	74	
	75	`track()` is the extension seam. It currently writes a structured object to the
	76	console; replacing that body with a backend POST or an analytics SDK call is a
	77	change inside one function, with no call site modified.
	78	
	79	The file is written as CommonJS and ends with a short footer that attaches
	80	`window.Tracking` when `module.exports` is absent. This gives script-tag loading
	81	in the browser and `require()` in Node tests without a build step.
	82	
	83	### Changed files
	84	
	85	- `index.html` — one `<script src="tracking.js"></script>` before the existing
	86	  `app.js` tag. Load order matters: `app.js` uses `Tracking` at submit time.
	87	- `app.js` — `login()` calls `Tracking.identify()` and `Tracking.track()` on
	88	  success; the existing validation-failure branch emits an event.
	89	- `package.json` — add `"scripts": { "test": "node --test" }`.
	90	
	91	## Data flow
	92	
	93	Page load: nothing happens. The device ID is generated lazily on first read, so
	94	a visitor who never interacts is never assigned one.
	95	
	96	Form submit (`app.js`):
	97	
	98	1. `validateForm({ username, password })`
	99	2. On invalid: `Tracking.track("login_validation_error", { error })`, then the
	100	   existing `console.error`. This branch is where the device ID earns its keep —
	101	   it is the only way to see repeated failed attempts from one browser.
	102	3. On valid: `login(username, password)`
	103	4. Inside `login()`, on success: `Tracking.identify(<account id>)` then
	104	   `Tracking.track("login_success", { username })`
	105	5. `login()` returns its result to the handler as it does today.
	106	
	107	## Identity lifecycle
	108	
	109	**Device ID.** Generated on first read via `crypto.randomUUID()`, falling back
	110	to a `crypto.getRandomValues()`-based UUIDv4 where `randomUUID` is unavailable.
	111	Persisted under the versioned key `tracking.deviceId.v1`; the version suffix
	112	allows a future format change without inheriting unparseable values. On read,
	113	any value that is not a string matching the canonical 36-character UUID pattern
	114	is treated as absent and regenerated.
	115	
	116	**Account ID.** Held in a module-level variable. Set by `identify()`, cleared by
	117	`reset()`, and gone when the page unloads. Re-established at each login.
	118	
	119	**Logout.** `reset()` clears the account link and leaves the device ID in place,
	120	so a returning visitor is still recognized as the same browser. No logout UI
	121	exists today; the function exists so that when one is added it cannot leave a
	122	stale identity attached to subsequent events.
	123	
	124	## Error handling
	125	
	126	The governing rule: **tracking can never break a login.**
	127	
	128	- `localStorage` throws outright in Safari private mode and when storage is
	129	  disabled by policy. Every read and write is wrapped. On failure the module
	130	  falls back to a per-page in-memory device ID and warns once, not on every
	131	  call.
	132	- The `identify()` and `track()` calls at the login site are wrapped so a throw
	133	  inside tracking cannot prevent `login()` from returning its result. An
	134	  analytics bug should cost data, not sign-ins.
	135	- A corrupt or empty stored device ID is discarded and regenerated rather than
	136	  propagated.
	137	- `track()` tolerates a null account ID, which is the normal state before any
	138	  login.
	139	
	140	## Testing
	141	
	142	Runner: Node's built-in `node:test` and `node:assert`, invoked with
	143	`node --test`. Zero dependencies, preserving the repo's current dependency-free
	144	state. `tracking.js` is `require()`-able because of the dual-format footer, so
	145	no DOM shim is needed. Tests substitute a fake `globalThis.localStorage` — a
	146	small object literal — which also makes the throwing-storage cases directly
	147	simulable.
	148	
	149	Tests are written before the module, per the repo's TDD practice.
	150	
	151	Cases:
	152	
	153	- first `getDeviceId()` generates and persists; a second call returns the same
	154	  value
	155	- a corrupt or empty stored value is discarded and regenerated
	156	- storage that throws on read falls back to a stable in-memory ID
	157	- storage that throws on write falls back to a stable in-memory ID
	158	- `identify()` links the account ID; `getAccountId()` returns it
	159	- `reset()` clears the account link and leaves the device ID intact
	160	- `track()` attaches both IDs to the emitted payload
	161	- `track()` tolerates a null account ID
	162	- a throw inside tracking does not prevent `login()` from returning its result
	163	
	164	The DOM wiring in `app.js` is left untested: it is a submit handler with no
	165	logic that justifies a browser harness.
	166	
	167	## Assumptions
	168	
	169	- Assumption: the stub `login()` returns `{ success, user }` with no identifier,
	170	  so `identify()` receives the username as a stand-in account ID until a real
	171	  API response supplies one. Validate via the API contract for `API_ENDPOINT`
	172	  when the real endpoint is implemented; the stand-in is confined to the one
	173	  call inside `login()`.
	174	- Assumption: the app will continue to be opened directly from disk or served
	175	  statically, with no bundler introduced. Validate via the module-delivery
	176	  choice above — if a bundler arrives, native ES modules become the better
	177	  shape and the dual-format footer can be dropped.
	178	
	179	## Open questions deferred by design
	180	
	181	- Which real transport `track()` eventually calls, and its failure policy
	182	  (retry, queue, or drop).
	183	- Whether the device ID needs to become server-visible, which would reopen the
	184	  cookie decision.
	185	- Consent and privacy controls, if the device ID is ever sent off-device.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T015844Z-3b5a/home/.cache/hyperpowers/codex-review/5020d2a9ead1ecfe763733c25ffd4c9482531e1e/run-s5x9IJI2/approach-context.md

	1	# Approach Context
	2	
	3	## Original idea (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	**Q: Where should the userId come from?** (options offered: derive from the login
	10	response; caller-supplied third parameter; client-generated correlation ID)
	11	
	12	A: "Not sure about internals — what I need is that it works across the app, that
	13	it persists, and other forms will need it later too."
	14	
	15	**Q: What should this ID actually identify?** (options: both device + account
	16	linked; authenticated user only; anonymous device only)
	17	
	18	A: Both, linked — an anonymous device ID always available, associated with the
	19	account ID once a login succeeds.
	20	
	21	**Q: Where should tracking events be sent?** (options: console only for now
	22	behind a swappable interface; POST to own backend; third-party analytics SDK)
	23	
	24	A: Console only for now.
	25	
	26	**Q: How should the device ID persist in the browser?** (options: localStorage;
	27	cookie; sessionStorage)
	28	
	29	A: localStorage.
	30	
	31	## Codebase facts
	32	
	33	Repository is a small static webapp fixture. Full file inventory (no other
	34	source files exist):
	35	
	36	- `index.html` (15 lines)
	37	- `app.js` (28 lines)
	38	- `src/index.js` (7 lines)
	39	- `src/utils.js` (5 lines)
	40	- `package.json` (6 lines)
	41	- `README.md` (3 lines)
	42	
	43	### `index.html`
	44	
	45	```html
	46	<!DOCTYPE html>
	47	<html>
	48	<head>
	49	  <title>Simple Webapp</title>
	50	</head>
	51	<body>
	52	  <h1>Login</h1>
	53	  <form id="login-form">
	54	    <input type="text" id="username" placeholder="Username" />
	55	    <input type="password" id="password" placeholder="Password" />
	56	    <button type="submit">Log In</button>
	57	  </form>
	58	  <script src="app.js"></script>
	59	</body>
	60	</html>
	61	```
	62	
	63	There is exactly one HTML page and exactly one form. The script tag is a plain
	64	classic script — not `type="module"`.
	65	
	66	### `app.js`
	67	
	68	```js
	69	// Simple webapp with login form handling
	70	const API_ENDPOINT = "https://api.example.com/login";
	71	
	72	function login(username, password) {
	73	  console.log("Logging in:", username);
	74	  // Stub: would POST to API_ENDPOINT in real app
	75	  return { success: true, user: username };
	76	}
	77	
	78	function validateForm(formData) {
	79	  if (!formData.username || !formData.password) {
	80	    return { valid: false, error: "Missing required fields" };
	81	  }
	82	  return { valid: true };
	83	}
	84	
	85	document.getElementById("login-form").addEventListener("submit", (e) => {
	86	  e.preventDefault();
	87	  const username = document.getElementById("username").value;
	88	  const password = document.getElementById("password").value;
	89	  const validation = validateForm({ username, password });
	90	  if (validation.valid) {
	91	    const result = login(username, password);
	92	    console.log("Login result:", result);
	93	  } else {
	94	    console.error("Validation error:", validation.error);
	95	  }
	96	});
	97	```
	98	
	99	`login()` is a stub: it never contacts `API_ENDPOINT`, and it returns
	100	synchronously. It has exactly one call site, the submit handler in the same
	101	file. `app.js` uses no import/export and no module system.
	102	
	103	### `src/index.js`
	104	
	105	```js
	106	const { greet } = require('./utils');
	107	
	108	function main() {
	109	  console.log(greet('world'));
	110	}
	111	
	112	main();
	113	```
	114	
	115	### `src/utils.js`
	116	
	117	```js
	118	function greet(name) {
	119	  return `Hello, ${name}!`;
	120	}
	121	
	122	module.exports = { greet };
	123	```
	124	
	125	### `package.json`
	126	
	127	```json
	128	{
	129	  "name": "drill-test-project",
	130	  "version": "1.0.0",
	131	  "description": "Test project for Drill scenarios",
	132	  "main": "src/index.js"
	133	}
	134	```
	135	
	136	### Constraints and existing patterns
	137	
	138	- Two disjoint code worlds already coexist: `src/` is CommonJS run under Node
	139	  (`require`/`module.exports`), `app.js` is a classic browser script loaded by a
	140	  `<script src>` tag. Nothing currently bridges them and nothing imports
	141	  `app.js`.
	142	- No bundler, no transpiler, no build step, no dev server.
	143	- `package.json` declares no dependencies, no devDependencies, and no `scripts`
	144	  section. There is no test runner, no linter, and no formatter configured.
	145	- No existing tests of any kind.
	146	- No existing logging, analytics, storage, session, or identity code anywhere in
	147	  the repository.
	148	- No `.gitignore`, no CI configuration, no `type` field in `package.json`.
	149	- Git: branch `feature/webapp-enhancement`, working tree clean.
	150	
	151	### Scope statement from the human partner
	152	
	153	The identity value must be available across the app, persist across visits, and
	154	be consumable by additional forms that do not exist in the repository yet. Only
	155	the login form exists today.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
