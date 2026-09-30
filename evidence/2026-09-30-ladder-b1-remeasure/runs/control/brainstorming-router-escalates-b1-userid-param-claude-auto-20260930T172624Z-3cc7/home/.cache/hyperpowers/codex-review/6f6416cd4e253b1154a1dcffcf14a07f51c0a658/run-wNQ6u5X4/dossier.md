# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T172624Z-3cc7/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-login-event-tracking-design.md

	1	# Login Event Tracking — Design
	2	
	3	Date: 2026-09-30
	4	Status: Approved design, pending implementation plan
	5	
	6	## Problem
	7	
	8	The request that started this was "add a `userId` parameter to the login
	9	function so we can track who logged in." Two facts make the parameter the
	10	wrong deliverable on its own:
	11	
	12	1. No `userId` value exists anywhere in the repository. The only call site
	13	   (`app.js:23`) reads `username` and `password` from the form, so a new
	14	   parameter would be dead at the only place `login` is called.
	15	2. `login()` is what *establishes* identity. An id supplied by the caller
	16	   arrives from the same untrusted form and cannot attest that anyone logged
	17	   in.
	18	
	19	The actual goal, confirmed with the human partner, is a tracking facility that
	20	works across the app, persists, and is reusable by forms that do not exist
	21	yet. That is a new subsystem, not a signature change.
	22	
	23	## Scope
	24	
	25	In scope: a shared, persistent event-tracking module; reshaping `login()` to
	26	produce and record a user id; module wiring for the browser app; unit tests.
	27	
	28	Out of scope: a backend endpoint (`API_ENDPOINT` stays an unused stub); real
	29	authentication; tracking from the Node-side `src/` files (`localStorage` is
	30	browser-only, and nothing in the browser loads `src/`); any form other than
	31	the existing login form.
	32	
	33	## Decisions
	34	
	35	Each of these was chosen by the human partner during brainstorming.
	36	
	37	| Decision | Choice |
	38	|---|---|
	39	| Persistence | `localStorage`, behind a swappable adapter |
	40	| Identity source | The id returned by the login result |
	41	| API shape | Generic `track()` core plus named helpers |
	42	| Module wiring | ES modules |
	43	| Data model | Bounded append-only event log |
	44	| Tooling | Unit tests (no linter, no e2e) |
	45	
	46	## Architecture
	47	
	48	A single new ES module, `tracker.js`, at the repository root beside `app.js`.
	49	
	50	### Public API
	51	
	52	```js
	53	export function track(eventName, data)  // record one event; returns nothing
	54	export function trackLogin(userId)      // wrapper: track("login", { userId })
	55	export function getEvents()             // returns the stored array (possibly empty)
	56	export function clearEvents()           // removes all stored events
	57	```
	58	
	59	`track` is the engine. Future forms call it directly with their own event name
	60	and payload; no edit to `tracker.js` is required to add a form. `trackLogin`
	61	exists so the common call site reads clearly.
	62	
	63	### Storage adapter
	64	
	65	A module-private adapter is the only code that touches `localStorage`:
	66	
	67	```js
	68	const storage = {
	69	  read() { /* parse JSON from the key, return [] on any problem */ },
	70	  write(events) { /* serialize and persist */ },
	71	};
	72	```
	73	
	74	This is the swap point. Replacing `localStorage` with a network backend later
	75	changes this object and nothing else — no call site and no public signature
	76	changes.
	77	
	78	The adapter reads `globalThis.localStorage` at call time rather than capturing
	79	it at module load. This is what makes the module testable under Node, where
	80	tests assign a fake `globalThis.localStorage` before exercising `track`. No
	81	test-only export is added to the public API.
	82	
	83	### Storage format
	84	
	85	- Key: `app.events`
	86	- Value: a JSON array of event records
	87	- Cap: 500 events. On overflow the oldest is dropped (FIFO).
	88	
	89	Event record:
	90	
	91	```js
	92	{
	93	  event: "login",
	94	  timestamp: "2026-09-30T17:26:24.000Z",  // ISO 8601, from new Date().toISOString()
	95	  data: { userId: "alice" }
	96	}
	97	```
	98	
	99	Only these three fields are stored. `data` contains exactly what the caller
	100	passed.
	101	
	102	**The password is never recorded** — not in `data`, not in any other field, on
	103	any code path.
	104	
	105	## Data flow
	106	
	107	1. The submit handler reads `username` and `password` from the form.
	108	2. `validateForm` checks both are present.
	109	3. On valid input, the handler calls `login(username, password)`.
	110	4. `login` returns `{ success: true, userId }`.
	111	5. On success, `login` itself calls `trackLogin(result.userId)`.
	112	6. `trackLogin` calls `track("login", { userId })`.
	113	7. `track` builds the record, appends it, applies the 500-event cap, and hands
	114	   the array to the storage adapter.
	115	
	116	Tracking lives **inside `login()`**, not in the submit handler, so every
	117	successful login is recorded regardless of which caller initiated it. The
	118	accepted cost is that `login` now depends on `tracker.js` rather than being a
	119	self-contained stub.
	120	
	121	## The `userId` placeholder
	122	
	123	`login()` performs no network call. The only identity available is the typed
	124	username, so `login` returns `{ success: true, userId: username }` with a
	125	comment marking `userId` as the placeholder a real API response will replace.
	126	
	127	The consequence, stated plainly: **until a real API returns an opaque id, the
	128	value persisted to `localStorage` is a username** — an identity string
	129	readable by any script running on the page. This was raised with the human
	130	partner and accepted as a property of the stub. It resolves when `login`
	131	becomes a real request against `API_ENDPOINT` and the server returns an opaque
	132	id. No mitigation is built now; recording a username is the deliberate
	133	consequence of tracking a stubbed login.
	134	
	135	## Error handling
	136	
	137	Tracking must never break login. `localStorage` throws under real conditions:
	138	it is unavailable in some private-browsing modes (`SecurityError`) and throws
	139	`QuotaExceededError` when full.
	140	
	141	- Every storage read and write is wrapped. On failure, warn to the console and
	142	  return normally.
	143	- A failed `track()` is not a failed login. `track` never rethrows and never
	144	  returns a value callers are expected to check.
	145	- If the stored value is absent, unparseable, or not an array, `read()` treats
	146	  it as an empty list rather than throwing. A corrupt key self-heals on the
	147	  next write.
	148	- `getEvents()` returns `[]` under all of the above conditions.
	149	
	150	## Module wiring
	151	
	152	`index.html` changes to `<script type="module" src="app.js"></script>`, and
	153	`app.js` gains `import { trackLogin } from "./tracker.js";`.
	154	
	155	**Consequence:** module scripts require an origin, so opening `index.html`
	156	directly from disk over `file://` will stop working. The page must be served
	157	(`python3 -m http.server`, `npx serve`, or equivalent). This is a real
	158	regression in how the fixture is opened today and is accepted as the cost of a
	159	genuine import seam.
	160	
	161	The CommonJS files under `src/` are untouched. They are not loaded by the
	162	browser and `localStorage` does not exist in Node, so they are outside this
	163	subsystem.
	164	
	165	## Testing
	166	
	167	Unit tests only, using Node's built-in `node:test` runner — it ships with
	168	Node, keeps the project at zero dependencies, and supports ES modules
	169	natively. A `test` script is added to `package.json`.
	170	
	171	Tests install a fake `globalThis.localStorage` (a small in-memory object with
	172	`getItem`/`setItem`/`removeItem`) before each case.
	173	
	174	Cases to cover:
	175	
	176	- `trackLogin(id)` stores one record with `event: "login"` and the given
	177	  `userId`.
	178	- The stored record carries a parseable ISO-8601 `timestamp`.
	179	- `track` appends rather than overwriting: two calls yield two records in call
	180	  order.
	181	- The 500-event cap holds: after 501 appends the array has 500 entries and the
	182	  oldest is gone.
	183	- `getEvents()` returns `[]` when nothing is stored.
	184	- `getEvents()` returns `[]` when the key holds corrupt JSON, and does not
	185	  throw.
	186	- `getEvents()` returns `[]` when the key holds valid JSON that is not an
	187	  array.
	188	- A `setItem` that throws `QuotaExceededError` does not propagate out of
	189	  `track`.
	190	- A `getItem` that throws `SecurityError` does not propagate out of
	191	  `getEvents`.
	192	- `clearEvents()` empties the store.
	193	- No stored record contains a password field on any path.
	194	
	195	`login()` and the submit handler are not unit-tested: they depend on `document`
	196	and the form, which is e2e territory the human partner declined.
	197	
	198	## Files touched
	199	
	200	| File | Change |
	201	|---|---|
	202	| `tracker.js` | New. The module described above. |
	203	| `app.js` | Import `trackLogin`; reshape `login` to return `userId` and call `trackLogin` on success. |
	204	| `index.html` | `<script>` becomes `type="module"`. |
	205	| `package.json` | Add a `test` script. |
	206	| `test/tracker.test.js` | New. The unit tests above. |
	207	
	208	## Global Constraints
	209	
	210	- Zero runtime dependencies. `node:test` is built in; nothing is added to
	211	  `package.json` dependencies.
	212	- No bundler, no transpiler, no build step.
	213	- Passwords never enter stored events.
	214	- `localStorage` is touched only through the storage adapter.
	215	- Tracking failures never propagate to callers.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T172624Z-3cc7/home/.cache/hyperpowers/codex-review/6f6416cd4e253b1154a1dcffcf14a07f51c0a658/run-6FPopBzD/approach-context.md

	1	# Approach Context
	2	
	3	## Original request (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	**Q: "Track who logged in" — what is actually wanted: reshape the login result, add the parameter as literally asked, or build real event tracking?**
	10	A: "It should work across the app and persist; other forms will need it later."
	11	
	12	**Q: Where should tracked login events live — browser storage, a backend endpoint, or a local buffer that flushes to a backend?**
	13	A: Browser storage (`localStorage`), behind an interface that lets the storage backend be swapped later.
	14	
	15	**Q: What identifies the user in a tracked event — an id taken from the login result, the username typed into the form, or a generated anonymous per-browser id?**
	16	A: From the login result.
	17	
	18	**Q: How should other forms call the tracker — a generic `track(eventName, data)` core with named helper wrappers, a generic function only, or one named function per case?**
	19	A: Generic core plus named helpers.
	20	
	21	**Q: How should the shared module be wired in, given `app.js` is a plain non-module `<script>` — ES modules, a global on `window`, or a bundler?**
	22	A: ES modules.
	23	
	24	Additional constraint stated to the partner and not objected to: the password
	25	must never enter a tracked event, and stored fields stay minimal because
	26	`localStorage` is readable by any script on the page.
	27	
	28	## Codebase facts
	29	
	30	Repository is a 4-commit fixture. Full file list (excluding `.git`):
	31	`index.html`, `README.md`, `package.json`, `app.js`, `src/index.js`, `src/utils.js`.
	32	
	33	`package.json` — no dependencies, no scripts, no devDependencies:
	34	
	35	```json
	36	{
	37	  "name": "drill-test-project",
	38	  "version": "1.0.0",
	39	  "description": "Test project for Drill scenarios",
	40	  "main": "src/index.js"
	41	}
	42	```
	43	
	44	`app.js` (28 lines, the entire browser app):
	45	
	46	```js
	47	// Simple webapp with login form handling
	48	const API_ENDPOINT = "https://api.example.com/login";
	49	
	50	function login(username, password) {
	51	  console.log("Logging in:", username);
	52	  // Stub: would POST to API_ENDPOINT in real app
	53	  return { success: true, user: username };
	54	}
	55	
	56	function validateForm(formData) {
	57	  if (!formData.username || !formData.password) {
	58	    return { valid: false, error: "Missing required fields" };
	59	  }
	60	  return { valid: true };
	61	}
	62	
	63	document.getElementById("login-form").addEventListener("submit", (e) => {
	64	  e.preventDefault();
	65	  const username = document.getElementById("username").value;
	66	  const password = document.getElementById("password").value;
	67	  const validation = validateForm({ username, password });
	68	  if (validation.valid) {
	69	    const result = login(username, password);
	70	    console.log("Login result:", result);
	71	  } else {
	72	    console.error("Validation error:", validation.error);
	73	  }
	74	});
	75	```
	76	
	77	`index.html` (15 lines) loads it as a classic script: `<script src="app.js"></script>`.
	78	The form has `id="login-form"` with inputs `id="username"` and `id="password"`.
	79	There is exactly one form in the app today.
	80	
	81	`src/index.js` and `src/utils.js` are CommonJS Node files (`require` /
	82	`module.exports`) that nothing in the browser loads. `src/utils.js` exports a
	83	single `greet(name)` function. They are disconnected from `app.js`.
	84	
	85	Constraints and current state:
	86	- No bundler, no build step, no transpiler.
	87	- No test runner, no test files, no linter, no formatter configured.
	88	- `API_ENDPOINT` is declared but never used; `login()` is a stub that performs
	89	  no network call and always returns success.
	90	- No `userId` value exists anywhere in the repository today. The only identity
	91	  available at the call site is the `username` string read from the form input.
	92	- The app is currently openable directly from disk (`file://`).


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
