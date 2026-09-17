# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T100607Z-a6c7/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-visitor-id-tracking-design.md

	1	# Anonymous Visitor ID — Design
	2	
	3	Date: 2026-09-17
	4	Status: approved (design), not yet implemented
	5	
	6	## Problem
	7	
	8	The request was "add a `userId` parameter to the login function so we can track
	9	who logged in." The codebase has no user identifier to pass: the login form
	10	collects only a username and a password (`index.html:9-10`), `login()`
	11	(`app.js:4`) is a stub that never contacts `API_ENDPOINT`, and its single call
	12	site (`app.js:23`) has nothing ID-shaped in scope.
	13	
	14	Clarification established that the identifier must work across the whole app,
	15	persist between visits, and be reachable by other forms added later. That makes
	16	this a shared module with a persistence layer, not a parameter threaded through
	17	one function.
	18	
	19	## Decisions
	20	
	21	Each was chosen by the project owner during brainstorming.
	22	
	23	| Decision | Choice | Rejected alternatives |
	24	|---|---|---|
	25	| What the ID represents | Anonymous visitor ID, client-generated, persists indefinitely, identical before and after login | Per-session ID; server-issued authenticated user ID; anonymous ID linked to a user ID |
	26	| Delivery | ES modules | Plain global script; dual CommonJS + global shim; adding a bundler |
	27	| Consumer | Client-side only for now | Request body; cookie; third-party analytics SDK |
	28	| Signature | Optional third parameter defaulting to `null` | Required parameter; options object |
	29	| Module shape | Injectable-storage factory with a default bound instance | Lazy singleton touching `localStorage` directly; explicit bootstrap threading the ID as an argument |
	30	| File extension | `.mjs` | `"type": "module"` in `package.json`; Vitest |
	31	| Tooling | Lint + format, unit tests, static server script | End-to-end tests |
	32	
	33	## Scope
	34	
	35	In scope:
	36	
	37	- `src/visitor-id.mjs` — new module owning ID generation and persistence.
	38	- `app.js` — becomes an ES module; `login()` gains the optional third parameter;
	39	  the call site supplies the visitor ID.
	40	- `index.html` — `<script>` tag gains `type="module"`.
	41	- `package.json` — scripts, devDependencies, `engines`.
	42	- `eslint.config.mjs`, Prettier config — new.
	43	- `test/visitor-id.test.mjs` — new.
	44	- `README.md` — how to run locally.
	45	
	46	Out of scope:
	47	
	48	- Implementing the real `fetch` to `API_ENDPOINT`. `login()` stays a stub.
	49	- Any change to `validateForm`.
	50	- Any change to `src/index.js` or `src/utils.js`. They remain CommonJS and
	51	  remain unreferenced by the page.
	52	- ID rotation, expiry, cross-tab synchronization, consent gating, server-side
	53	  correlation, and analytics event dispatch.
	54	
	55	## Architecture
	56	
	57	### `src/visitor-id.mjs`
	58	
	59	Two exports:
	60	
	61	```js
	62	export function createVisitorIdStore(storage)
	63	export function getVisitorId()
	64	```
	65	
	66	`createVisitorIdStore(storage)` returns `{ get() }`. The `storage` argument needs
	67	only `getItem(key)` and `setItem(key, value)`, so a plain object literal
	68	satisfies it in tests.
	69	
	70	`getVisitorId()` is the default instance bound to `window.localStorage`, created
	71	lazily at module scope. Call sites use it; tests use the factory.
	72	
	73	**Data model.** One value: a v4 UUID string from `crypto.randomUUID()`, stored
	74	under the `localStorage` key `visitorId`. No envelope, no timestamp, no version
	75	field — a bare string, because nothing in the design needs more and a wrapper
	76	would be a migration liability.
	77	
	78	The key is unnamespaced. This is safe while the app is the only thing on its
	79	origin; if that changes, prefix it.
	80	
	81	**Resolution order for `get()`:**
	82	
	83	1. Return the cached in-memory value if the store has one.
	84	2. Otherwise read `storage.getItem("visitorId")`.
	85	3. If that value is missing, empty, or not a well-formed UUID, generate a new
	86	   one and persist it. "Well-formed" means matching
	87	   `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`
	88	   — a v4 UUID specifically, since that is the only thing the module ever
	89	   writes.
	90	4. Cache the result in the store and return it.
	91	
	92	**Invariant: `get()` never throws and never returns null or an empty string.**
	93	This is the property the tests exist to protect. Tracking is a secondary
	94	concern inside a login handler; it must not be able to break authentication.
	95	
	96	**Degraded behavior.** `localStorage` throws in some private-browsing modes and
	97	when quota is exhausted, and a stored value can be corrupt. In all such cases the
	98	store falls back to an in-memory ID that lives for the page's lifetime. Tracking
	99	degrades to per-page granularity rather than failing.
	100	
	101	### `app.js`
	102	
	103	Becomes an ES module with one import:
	104	
	105	```js
	106	import { getVisitorId } from "./src/visitor-id.mjs";
	107	```
	108	
	109	`login()` becomes:
	110	
	111	```js
	112	function login(username, password, userId = null) {
	113	  console.log("Logging in:", username, "visitor:", userId);
	114	  // Stub: would POST to API_ENDPOINT in real app
	115	  return { success: true, user: username, userId };
	116	}
	117	```
	118	
	119	The call site at `app.js:23` becomes
	120	`login(username, password, getVisitorId())`.
	121	
	122	The ID is resolved at the call site, not inside `login()`. `login()` stays a
	123	function of its arguments, which keeps it testable and keeps the new parameter
	124	meaningful; a `login()` that fetched the ID itself would make the parameter
	125	pointless.
	126	
	127	Defaulting to `null` rather than leaving it undefined gives un-updated callers an
	128	explicit absent value.
	129	
	130	### `index.html`
	131	
	132	`<script src="app.js">` becomes `<script type="module" src="app.js">`.
	133	
	134	Two consequences:
	135	
	136	- `login`, `validateForm`, and `API_ENDPOINT` stop being globals. Nothing in the
	137	  repository references them from outside `app.js`, so nothing breaks, but
	138	  console access to them changes.
	139	- Module scripts are deferred, so the top-level `document.getElementById` call
	140	  now runs after DOM parsing instead of racing it.
	141	
	142	### Data flow
	143	
	144	```
	145	page load
	146	  -> app.js module evaluated (deferred)
	147	  -> submit handler registered
	148	user submits
	149	  -> validateForm({username, password})
	150	  -> valid: getVisitorId()
	151	       -> cached? return it
	152	       -> localStorage read; missing/corrupt/throwing? generate + persist (or fall back in-memory)
	153	  -> login(username, password, visitorId)
	154	  -> console.log of the result, including userId
	155	```
	156	
	157	Nothing leaves the browser.
	158	
	159	## Error handling
	160	
	161	| Condition | Behavior |
	162	|---|---|
	163	| No stored ID | Generate, persist, return |
	164	| Stored ID is empty or malformed | Generate, persist over it, return |
	165	| `getItem` throws | Generate in-memory ID, return, do not persist |
	166	| `setItem` throws (quota, private mode) | Return the generated ID anyway; do not propagate |
	167	| `crypto.randomUUID` unavailable | Assumption: not reachable on supported targets (secure contexts and localhost in all current browsers, Node >= 19). Validate via the Node engines floor and by running the page over HTTP rather than `file://`. If it ever is unavailable, the module must still satisfy the never-throws invariant. |
	168	
	169	`validateForm` and the submit handler are unchanged; tracking failures cannot
	170	reach them because `get()` absorbs its own errors.
	171	
	172	## Testing
	173	
	174	Runner: `node:test` with `node:assert`, no dependencies. `"test": "node --test"`.
	175	Tests live in `test/visitor-id.test.mjs` and drive `createVisitorIdStore` with
	176	object-literal storage fakes.
	177	
	178	Cases:
	179	
	180	1. Empty storage: `get()` returns a well-formed UUID and writes it under
	181	   `visitorId`.
	182	2. Second `get()` on the same store returns the identical value and performs no
	183	   second write.
	184	3. Pre-populated valid storage: returns the stored value; does not overwrite.
	185	4. Stored value empty string: replaced with a fresh UUID.
	186	5. Stored value malformed: replaced with a fresh UUID.
	187	6. `getItem` throws: returns a usable ID, stable across repeat calls on that
	188	   store.
	189	7. `setItem` throws: returns a usable ID; the error does not propagate.
	190	8. Across all cases: no throw, never null, never empty.
	191	
	192	`login()` is not separately unit-tested. It remains a stub whose behavior is a
	193	`console.log` and a literal return; there is no assertion of value to make until
	194	it performs a real request. The parameter change is exercised through the module
	195	tests and manual verification in the browser.
	196	
	197	Manual verification: serve the app, submit the form, confirm the logged result
	198	carries a `userId`, reload, and confirm the same ID appears.
	199	
	200	Implementation follows TDD: tests for each case above are written before the
	201	module code.
	202	
	203	## Tooling
	204	
	205	| Item | Choice |
	206	|---|---|
	207	| Lint | ESLint 9 flat config, `eslint.config.mjs`, `js.configs.recommended` |
	208	| Format | Prettier |
	209	| Test | `node:test` (built in) |
	210	| Serve | `serve` as a devDependency; `"start": "serve ."` |
	211	| Node | `"engines": { "node": ">=20" }` for global `crypto.randomUUID` |
	212	
	213	Scripts added: `start`, `test`, `lint`, `format`.
	214	
	215	The static server is not optional polish: module scripts do not load over
	216	`file://`, so opening `index.html` directly now fails with a CORS error. The
	217	README documents this.
	218	
	219	## Risks
	220	
	221	- **Opening `index.html` directly stops working.** Anyone used to double-clicking
	222	  the file gets a console CORS error with no visible page failure. Mitigated by
	223	  the README note and the `start` script.
	224	- **Globals disappear from `app.js`.** No in-repo consumer exists, but any
	225	  external snippet or bookmarklet relying on them would break.
	226	- **The identifier is a browser, not a person.** It resets when storage is
	227	  cleared, does not follow a user across devices, and does not survive private
	228	  browsing. Any analytics built on it must not be described as identifying
	229	  users.
	230	- **Persistent identifiers carry consent obligations** in the EU, UK, and similar
	231	  jurisdictions once used for analytics. Nothing leaves the browser today, so the
	232	  obligation is not yet triggered, but it attaches the moment the ID is
	233	  transmitted. Revisit before wiring the real request.
	234	- **Mixed module systems.** The repo will hold ESM (`app.js`, `src/visitor-id.mjs`)
	235	  and CommonJS (`src/index.js`, `src/utils.js`) side by side. Intentional, to
	236	  avoid touching unrelated files; worth resolving if the Node side grows.
	237	
	238	## Open questions
	239	
	240	None blocking. Two deferred by decision: whether the storage key needs an origin
	241	namespace, and whether the anonymous ID will later be linked to a server-issued
	242	user ID.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T100607Z-a6c7/home/.cache/hyperpowers/codex-review/b047cd355f783c11e4ba0e0ffb6dedcb3e00106a/run-gYObkxUR/approach-context.md

	1	# Approach Context
	2	
	3	## Original request (verbatim)
	4	
	5	"Add a userId parameter to the login function so we can track who logged in."
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	1. **Where should the userId value come from?**
	10	   Answer: "It should work across the app and persist; other forms will need it later too."
	11	
	12	2. **How should the parameter be added to the signature?**
	13	   Answer: Optional third parameter, defaulting to null, so existing calls keep working.
	14	
	15	3. **What should this identifier actually represent?** (anonymous visitor ID /
	16	   per-session ID / authenticated user ID / anonymous linked to user ID)
	17	   Answer: Anonymous visitor ID — generated client-side on first visit, persists
	18	   indefinitely, identical before and after login.
	19	
	20	4. **How should the shared module be delivered?** (ES modules / plain global
	21	   script / dual CommonJS+global / add a bundler)
	22	   Answer: ES modules — `export`/`import`, `index.html` switches to
	23	   `<script type="module">`, accepting that the page must be served over HTTP.
	24	
	25	5. **What consumes the visitor ID once it exists?** (client-side only / request
	26	   body / cookie / third-party analytics SDK)
	27	   Answer: Client-side only for now. Nothing leaves the browser yet.
	28	
	29	6. **Which tooling should be set up from the start?**
	30	   Answer: lint + format, unit tests, and a static server script. End-to-end
	31	   tests were not selected.
	32	
	33	## Codebase facts
	34	
	35	Repository: a 4-file static webapp fixture. Git branch `feature/webapp-enhancement`,
	36	clean tree.
	37	
	38	### `app.js` (28 lines, loaded by `index.html` via plain `<script src="app.js">`)
	39	
	40	```javascript
	41	// Simple webapp with login form handling
	42	const API_ENDPOINT = "https://api.example.com/login";
	43	
	44	function login(username, password) {
	45	  console.log("Logging in:", username);
	46	  // Stub: would POST to API_ENDPOINT in real app
	47	  return { success: true, user: username };
	48	}
	49	
	50	function validateForm(formData) {
	51	  if (!formData.username || !formData.password) {
	52	    return { valid: false, error: "Missing required fields" };
	53	  }
	54	  return { valid: true };
	55	}
	56	
	57	document.getElementById("login-form").addEventListener("submit", (e) => {
	58	  e.preventDefault();
	59	  const username = document.getElementById("username").value;
	60	  const password = document.getElementById("password").value;
	61	  const validation = validateForm({ username, password });
	62	  if (validation.valid) {
	63	    const result = login(username, password);
	64	    console.log("Login result:", result);
	65	  } else {
	66	    console.error("Validation error:", validation.error);
	67	  }
	68	});
	69	```
	70	
	71	- `login()` is a stub. It never calls `API_ENDPOINT`; no `fetch` exists anywhere
	72	  in the repo.
	73	- `login()` has exactly one call site, `app.js:23`.
	74	- `app.js` uses no module system: plain script, function declarations at top level.
	75	
	76	### `index.html` (15 lines)
	77	
	78	Form `#login-form` with two inputs, `#username` (text) and `#password`. No other
	79	form exists in the repo. Loads `app.js` with a plain `<script src>` tag.
	80	
	81	### `src/index.js` (7 lines) and `src/utils.js` (5 lines)
	82	
	83	CommonJS (`require`, `module.exports`). `src/utils.js` exports a single `greet`
	84	function. These files are **not** loaded by `index.html` — they are a separate
	85	Node-side tree, unreferenced from the browser code.
	86	
	87	### `package.json` (6 lines)
	88	
	89	```json
	90	{
	91	  "name": "drill-test-project",
	92	  "version": "1.0.0",
	93	  "description": "Test project for Drill scenarios",
	94	  "main": "src/index.js"
	95	}
	96	```
	97	
	98	No `scripts`, no `dependencies`, no `devDependencies`. There is no test runner,
	99	no linter, no formatter, no bundler, and no build step in the repository. No
	100	test files exist. No CI configuration exists.
	101	
	102	### Other
	103	
	104	`README.md` is 3 lines. No existing storage, analytics, logging, or tracking code
	105	of any kind. No consent or privacy handling exists.
	106	
	107	## What the design must cover
	108	
	109	A shared, persistent anonymous visitor identifier available to `login()` today and
	110	to other forms later, delivered as an ES module, consumed client-side only, with
	111	lint/format, unit tests, and a static server script established as part of the work.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
