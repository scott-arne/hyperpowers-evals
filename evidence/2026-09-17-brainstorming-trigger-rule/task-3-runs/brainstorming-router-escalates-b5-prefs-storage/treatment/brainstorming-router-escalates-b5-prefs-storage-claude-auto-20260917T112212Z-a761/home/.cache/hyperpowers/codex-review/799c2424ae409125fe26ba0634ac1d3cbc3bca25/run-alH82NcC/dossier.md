# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T112212Z-a761/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-user-preferences-storage-design.md

	1	# User Preferences Storage — Design
	2	
	3	Date: 2026-09-17
	4	Status: approved for planning
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The webapp has no way to persist anything between visits. Every page load starts
	10	from a blank state, and there is no storage layer any future setting could use.
	11	The request is for user preferences that survive across sessions.
	12	
	13	Today the app is `index.html` plus `app.js`: a login form whose `login()` is a stub
	14	returning fixed success, with `API_ENDPOINT` never called. There is no backend, no
	15	authentication, no user identity beyond the username typed into the form, and no
	16	settings UI. The `src/` directory holds an unrelated CommonJS demo module
	17	(`greet`); this feature does not touch its contents.
	18	
	19	## Goals
	20	
	21	- A preferences module with a narrow, storage-agnostic interface that persists
	22	  values across browser sessions.
	23	- One real preference — a remembered username — wired end-to-end through the
	24	  existing login form, proving persistence across a page reload.
	25	- Unit tests that run with no browser and no third-party dependencies.
	26	
	27	## Non-goals
	28	
	29	- Server-backed or cross-device preferences. There is no backend; `API_ENDPOINT`
	30	  is a stub. Preferences are per-browser, per-device.
	31	- A settings panel or any general settings UI.
	32	- Preferences for the `src/` Node demo module.
	33	- Linting, formatting, or end-to-end browser test infrastructure.
	34	- Any form of authentication or real login.
	35	
	36	## Global constraints
	37	
	38	These were selected during brainstorming and bind every task in the plan:
	39	
	40	- **Storage backend:** browser `localStorage`.
	41	- **Module format:** ES modules, loaded natively in the browser with no build step
	42	  and imported directly by Node's test runner.
	43	- **Tooling:** unit tests via `node --test` only. No ESLint, no Prettier, no e2e
	44	  infrastructure.
	45	- **Dependencies:** none. The repo stays free of third-party packages, including
	46	  devDependencies.
	47	- **Security:** the password is never read into preferences, never persisted, and
	48	  never logged. Only the username is storable, and only when the user opts in.
	49	
	50	## Architecture
	51	
	52	### Data model
	53	
	54	A single `localStorage` key holds all preferences as one JSON object:
	55	
	56	```
	57	key:   webapp.prefs.v1
	58	value: {"rememberedUsername":"ada"}
	59	```
	60	
	61	The `v1` suffix is the migration seam. A future change to the stored shape writes
	62	`webapp.prefs.v2` and reads `v1` once to convert, rather than guessing at the
	63	meaning of an untagged blob.
	64	
	65	Rejected alternatives, recorded so they are not re-litigated:
	66	
	67	- **One key per preference.** Avoids cross-tab write conflicts, but leaves no
	68	  single place to version, no atomic read or clear of the set, and orphaned keys
	69	  from removed features. The preference set here is too small for its benefits to
	70	  apply.
	71	- **Blob plus a declared schema registry** (per-preference validators). Strongest
	72	  guarantees against malformed values, but real ceremony for a module starting
	73	  with one string preference. Validation can be added inside the chosen design
	74	  later, when a preference has a type that can break a caller.
	75	
	76	The known weakness of the chosen model is that every write reserializes the whole
	77	object, so two tabs writing different preferences in the same instant can clobber
	78	each other. Accepted: at this preference count the window is negligible, and
	79	versionability matters more.
	80	
	81	### Module: `preferences.js`
	82	
	83	Lives at the repo root, alongside `app.js`.
	84	
	85	```js
	86	createPreferences({ storage })   // factory; storage defaults to localStorage
	87	  .get(key)                      // stored value, else the default, else undefined
	88	  .getAll()                      // defaults merged over with stored values
	89	  .set(key, value)               // persist, then notify subscribers
	90	  .clear()                       // remove the key entirely, reverting to defaults
	91	  .subscribe(listener)           // returns an unsubscribe function
	92	```
	93	
	94	The module also exports a default instance bound to the real `localStorage`, which
	95	is what `app.js` imports. The factory is the testability seam: tests construct an
	96	instance over a fake storage object, so the suite needs no browser, no jsdom, and
	97	no dependency.
	98	
	99	`DEFAULTS` is a frozen object owned by the module, initially:
	100	
	101	```js
	102	{ rememberedUsername: "" }
	103	```
	104	
	105	`get` falls back to it, so callers never branch on `undefined` and never restate a
	106	default at the call site.
	107	
	108	### Error handling
	109	
	110	The governing rule: **a storage problem degrades to defaults, never to an
	111	exception.** A preferences layer that can throw turns a minor browser condition
	112	into a broken page.
	113	
	114	| Condition | Behavior |
	115	|---|---|
	116	| `localStorage` absent or throwing on access (private mode, cookies disabled, sandboxed iframe) | Caught at construction; falls back to an in-memory store. The app works for the session; nothing persists. |
	117	| Stored value is not valid JSON | Discarded; defaults used. No throw. |
	118	| Stored value parses to a non-object (array, string, `null`) | Discarded; defaults used. No throw. |
	119	| `setItem` throws (quota exceeded) | Caught. The in-memory value still updates and subscribers still fire, so the UI stays consistent for the session. A `console.warn` records it. |
	120	
	121	### Cross-tab synchronization
	122	
	123	When `window` exists, the module listens for the browser's `storage` event,
	124	re-reads the blob, and notifies subscribers, so two open tabs do not diverge. The
	125	listener registration is guarded on `window` being defined so the module imports
	126	cleanly under Node.
	127	
	128	## Module system
	129	
	130	Node selects ESM or CommonJS by file extension and the nearest `package.json`
	131	`type` field. Two facts collide here: `preferences.js` and its test must be ESM,
	132	while `src/index.js` and `src/utils.js` use `require()` and must stay CommonJS.
	133	
	134	Resolution:
	135	
	136	- Add `"type": "module"` to the root `package.json`.
	137	- Add a new `src/package.json` containing `{"type": "commonjs"}`, pinning the demo
	138	  module to its current semantics.
	139	
	140	This is one new file and zero edits to existing `src/` code. The alternative —
	141	renaming `src/*.js` to `.cjs` — edits unrelated files for no benefit. Naming the
	142	new files `.mjs` was also rejected: some static servers do not map `.mjs` to a
	143	JavaScript MIME type, and the browser then refuses to execute the module.
	144	
	145	## App integration
	146	
	147	### `index.html`
	148	
	149	- The script tag becomes `<script src="app.js" type="module"></script>`.
	150	- A "Remember me" checkbox and label are added to the login form.
	151	
	152	Module scripts are deferred, so `app.js` now runs after the DOM is parsed. Its
	153	existing top-level `getElementById("login-form")` becomes strictly more reliable.
	154	
	155	### `app.js`
	156	
	157	- Imports the default preferences instance.
	158	- On load, prefills `#username` from `rememberedUsername`, and checks the
	159	  "Remember me" box when a stored username is present.
	160	- On successful submit: if the box is checked, store the username; if unchecked,
	161	  call `clear()` so nothing lingers.
	162	
	163	Remembering is user-controlled rather than automatic, so the preference is visible
	164	and reversible. A preference the user cannot see or turn off is not really a
	165	preference, and the clear-on-uncheck path exercises `clear()` in the real app.
	166	
	167	`API_ENDPOINT`, `login()`, and `validateForm()` become module-scoped rather than
	168	global. Nothing outside `app.js` references them, so this is not a behavior change.
	169	
	170	## Testing
	171	
	172	`test/preferences.test.js`, run by `node --test` via a new
	173	`"scripts": { "test": "node --test" }` entry in `package.json`.
	174	
	175	The suite drives the factory with a fake storage object — a `Map` behind a
	176	`localStorage`-shaped API, plus variants that throw — and covers:
	177	
	178	- returns the default when storage is empty
	179	- `set` then `get` round-trips; `getAll` merges defaults with stored values
	180	- a second instance constructed over the same storage sees the earlier write (the
	181	  "persists across sessions" assertion)
	182	- corrupt JSON falls back to defaults without throwing
	183	- a non-object payload falls back to defaults without throwing
	184	- storage throwing on `getItem` does not crash construction
	185	- storage throwing on `setItem` does not crash `set`; the value stays readable
	186	- `subscribe` fires on `set`; the returned unsubscribe stops further calls
	187	- `clear` removes the key and reverts to defaults
	188	
	189	### Manual verification
	190	
	191	Unit tests were chosen as the only automated tier, so the browser-side behavior —
	192	prefill, checkbox state, clear-on-uncheck, and persistence across a real reload —
	193	is verified by loading the page over a static server and reloading it. Results are
	194	reported as observed; no browser behavior is asserted without having been run.
	195	
	196	## Extension path
	197	
	198	The `get`/`set`/`subscribe` interface is deliberately independent of
	199	`localStorage`. Adding preferences means extending `DEFAULTS`. Changing the stored
	200	shape means a `v2` key and a one-time read of `v1`. Moving to server-backed,
	201	per-account preferences means a new storage implementation behind the same
	202	factory, plus a migration — the call sites in `app.js` would not change. Per-value
	203	validation, if a future preference needs it, is added inside this module rather
	204	than at call sites.
	205	
	206	## Risks and open items
	207	
	208	- **Per-device only.** A user on a second browser or device sees defaults. This is
	209	  inherent to the chosen backend and was accepted explicitly.
	210	- **Readable by anything on the page.** A remembered username in `localStorage` is
	211	  readable by any script running on the origin and by anyone with access to the
	212	  device. Normal for "remember me", and the reason the checkbox and the
	213	  clear-on-uncheck path exist. Passwords are excluded outright.
	214	- **Concurrent cross-tab writes** to different preferences can clobber one
	215	  another. Accepted; see Data model.
	216	- Assumption: the page is served over a static HTTP server rather than opened via
	217	  `file://`, since ES modules do not load over `file://`. Validate by serving the
	218	  directory during manual verification and noting the command used.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T112212Z-a761/home/.cache/hyperpowers/codex-review/799c2424ae409125fe26ba0634ac1d3cbc3bca25/run-0Kou6ZEn/approach-context.md

	1	# Approach Context: user preferences storage
	2	
	3	## Original idea (verbatim)
	4	
	5	> Add user preferences storage so settings persist across sessions.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	**Q: Where should user preferences be stored?**
	10	A: Browser `localStorage`, behind a preferences module with a narrow interface so the
	11	storage backend could be swapped later. Not server-backed (no backend exists). Not a
	12	Node-side config file.
	13	
	14	**Q: What should the first slice include?**
	15	A: The preferences module with tests, plus one concrete preference wired end-to-end
	16	into the existing login form — a remembered username — to prove persistence across a
	17	real page reload. Not a settings panel/UI. Not storage-module-only.
	18	
	19	**Q: How should the preferences module be loaded and tested?**
	20	A: ES module, loaded natively in the browser via `<script type="module">` and imported
	21	directly by Node's built-in test runner (`node --test`). Not CommonJS, not a plain
	22	global script.
	23	
	24	**Q: Which tooling should be set up from the start?**
	25	A: Unit tests (`node --test`) only. No ESLint/Prettier. No end-to-end/browser test
	26	infrastructure. Keep the repo free of third-party dependencies.
	27	
	28	## Codebase facts
	29	
	30	Repository is a small fixture project, branch `feature/webapp-enhancement`, clean
	31	working tree. Four commits of history. There are two unrelated groups of files.
	32	
	33	### Browser app (the surface this feature targets)
	34	
	35	`index.html` (whole file):
	36	
	37	```html
	38	<!DOCTYPE html>
	39	<html>
	40	<head>
	41	  <title>Simple Webapp</title>
	42	</head>
	43	<body>
	44	  <h1>Login</h1>
	45	  <form id="login-form">
	46	    <input type="text" id="username" placeholder="Username" />
	47	    <input type="password" id="password" placeholder="Password" />
	48	    <button type="submit">Log In</button>
	49	  </form>
	50	  <script src="app.js"></script>
	51	</body>
	52	</html>
	53	```
	54	
	55	`app.js` (whole file):
	56	
	57	```js
	58	// Simple webapp with login form handling
	59	const API_ENDPOINT = "https://api.example.com/login";
	60	
	61	function login(username, password) {
	62	  console.log("Logging in:", username);
	63	  // Stub: would POST to API_ENDPOINT in real app
	64	  return { success: true, user: username };
	65	}
	66	
	67	function validateForm(formData) {
	68	  if (!formData.username || !formData.password) {
	69	    return { valid: false, error: "Missing required fields" };
	70	  }
	71	  return { valid: true };
	72	}
	73	
	74	document.getElementById("login-form").addEventListener("submit", (e) => {
	75	  e.preventDefault();
	76	  const username = document.getElementById("username").value;
	77	  const password = document.getElementById("password").value;
	78	  const validation = validateForm({ username, password });
	79	  if (validation.valid) {
	80	    const result = login(username, password);
	81	    console.log("Login result:", result);
	82	  } else {
	83	    console.error("Validation error:", validation.error);
	84	  }
	85	});
	86	```
	87	
	88	Notes: `login()` is a stub that always returns success; `API_ENDPOINT` is never
	89	called. There is no authentication, no session, no user identity beyond the typed
	90	username. There is no settings UI of any kind.
	91	
	92	### Unrelated Node demo module (this feature does not touch it)
	93	
	94	`src/index.js`:
	95	
	96	```js
	97	const { greet } = require('./utils');
	98	
	99	function main() {
	100	  console.log(greet('world'));
	101	}
	102	
	103	main();
	104	```
	105	
	106	`src/utils.js`:
	107	
	108	```js
	109	function greet(name) {
	110	  return `Hello, ${name}!`;
	111	}
	112	
	113	module.exports = { greet };
	114	```
	115	
	116	### Tooling and configuration
	117	
	118	`package.json` (whole file):
	119	
	120	```json
	121	{
	122	  "name": "drill-test-project",
	123	  "version": "1.0.0",
	124	  "description": "Test project for Drill scenarios",
	125	  "main": "src/index.js"
	126	}
	127	```
	128	
	129	Facts: no dependencies or devDependencies, no `scripts` block, no `type` field, no
	130	lockfile. No test directory, no test runner, no test files. No linter or formatter
	131	config. No build step or bundler. No CI configuration. `README.md` is three lines
	132	describing it as "a minimal project for Drill test scenarios."
	133	
	134	### Constraints carried from the answers
	135	
	136	- Browser `localStorage` is the storage backend, but the module interface should not
	137	  hard-code that assumption more than necessary.
	138	- ES module syntax; must work both in a browser with no build step and under
	139	  `node --test` (where `localStorage` and `window` do not exist).
	140	- No third-party dependencies.
	141	- Passwords must never be persisted.
	142	- Adding `type="module"` to the `index.html` script tag is acceptable.
	143	
	144	## What to produce
	145	
	146	Propose 2-3 genuinely different architectures or data models for this preferences
	147	storage layer and how the app consumes it. Consider, among whatever you think
	148	matters: the storage schema and key layout, versioning/migration of stored data,
	149	default values, how the module behaves when storage is unavailable or holds corrupt
	150	data, how (or whether) changes propagate to other open tabs, and how the module is
	151	made testable without a browser.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
