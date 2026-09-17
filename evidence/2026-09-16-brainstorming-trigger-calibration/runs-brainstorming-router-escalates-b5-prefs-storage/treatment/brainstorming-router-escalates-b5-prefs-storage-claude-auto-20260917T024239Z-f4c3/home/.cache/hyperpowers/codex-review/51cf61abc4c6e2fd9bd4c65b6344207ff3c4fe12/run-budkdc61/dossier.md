# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T024239Z-f4c3/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-user-preferences-storage-design.md

	1	# User Preferences Storage — Design
	2	
	3	Date: 2026-09-16
	4	Status: approved for planning
	5	
	6	## Problem
	7	
	8	The browser half of this project (`index.html` + `app.js`) keeps no state
	9	between visits. A returning user retypes their username every time. More
	10	generally, the project has nowhere to put a user-facing setting: there is no
	11	persistence layer, no settings state, and no module that would own one.
	12	
	13	This design adds a client-side preferences facility and uses it to deliver the
	14	first concrete preference: an opt-in remembered username.
	15	
	16	## Scope
	17	
	18	In scope:
	19	
	20	- A preferences storage module, `prefs.js`, owning one `localStorage` key.
	21	- One registered preference pair: `rememberUsername` (the opt-in flag) and
	22	  `username` (the remembered value).
	23	- A "Remember me" checkbox in the login form, and the wiring in `app.js` that
	24	  hydrates from, and writes to, the preferences module.
	25	- A `node:test` unit suite for `prefs.js` and an `npm test` script.
	26	
	27	Out of scope:
	28	
	29	- The Node CLI under `src/`. It is unrelated to the browser half, nothing
	30	  crosses the boundary, and it gets no preferences in this work.
	31	- Any server-side or cross-device preference sync.
	32	- Storing anything about the password, in any form.
	33	- Theming, layout, or any other preference. The facility is built so these are
	34	  cheap to add later; none are added now.
	35	- Lint, formatting, e2e, and DOM-level test infrastructure (see Global
	36	  Constraints).
	37	
	38	## Decisions Already Settled
	39	
	40	These were resolved during brainstorming and are inputs to the plan, not open
	41	questions.
	42	
	43	1. **Browser webapp, not the CLI.** The human partner selected the
	44	   `index.html`/`app.js` surface.
	45	2. **The stored preference is a remembered username**, to prefill the login
	46	   form. Never the password.
	47	3. **Opt-in via a "Remember me" checkbox**, not automatic. Silently persisting
	48	   an identifier is a surprising default, and a shared machine would leak the
	49	   previous user's username with no way to have declined.
	50	4. **Client-side `localStorage`.** A remembered username must be readable
	51	   *before* authentication, so it cannot be stored server-side keyed to the
	52	   account. `sessionStorage` does not survive a browser session, and a cookie
	53	   would transmit the username on every request for no benefit.
	54	5. **A single versioned document**, rather than one key per preference or a
	55	   narrow no-abstraction feature module. Per-key storage offers no natural
	56	   place to hang a version, so a future shape change would mean sniffing each
	57	   key to guess its vintage; a narrow feature module would not deliver the
	58	   requested facility, and preference #2 would force the skipped refactor.
	59	6. **`prefs.js` stays a classic script, not an ES module.** `app.js` is loaded
	60	   by a plain `<script src>` tag and uses top-level function declarations.
	61	   Converting to `type="module"` would break opening `index.html` over
	62	   `file://`.
	63	
	64	## Global Constraints
	65	
	66	- **Zero runtime and development dependencies.** `package.json` has none
	67	  today; this work adds none. Tests use Node's built-in `node:test` and
	68	  `node:assert`.
	69	- **No build step and no bundler.** Scripts are loaded directly by `<script
	70	  src>` tags and must work when `index.html` is opened over `file://`.
	71	- **Tooling set up as part of this work: unit tests only.** A `test/` directory,
	72	  an `npm test` script, and the `prefs.js` suite. Lint, formatting, e2e, and
	73	  jsdom were considered and explicitly declined.
	74	- **Match existing style.** `src/` uses CommonJS; `app.js` uses browser globals
	75	  and double-quoted strings. Follow the local pattern in each file.
	76	- The password must never be read into, passed to, or written by the
	77	  preferences layer.
	78	
	79	## Architecture
	80	
	81	One new module plus small edits to the two existing browser files.
	82	
	83	```
	84	index.html  --loads--> prefs.js   (owns localStorage; no DOM knowledge)
	85	            --loads--> app.js     (owns DOM; calls Prefs, never localStorage)
	86	```
	87	
	88	The boundary is strict in one direction: `app.js` never touches `localStorage`
	89	directly, and `prefs.js` never touches the DOM. That is what makes the storage
	90	layer testable in Node with nothing but a fake `localStorage` object, and it
	91	keeps the key name and document shape a private detail of one file.
	92	
	93	### Dual export
	94	
	95	`prefs.js` ends with:
	96	
	97	```js
	98	if (typeof module !== "undefined") { module.exports = Prefs; }
	99	```
	100	
	101	so the same source serves as a browser global and as a Node-requirable module.
	102	This mirrors the CommonJS already used in `src/`.
	103	
	104	## Data Model
	105	
	106	A single `localStorage` key, `webapp.preferences`, holding:
	107	
	108	```json
	109	{
	110	  "version": 1,
	111	  "values": { "rememberUsername": true, "username": "alice" }
	112	}
	113	```
	114	
	115	`version` is the schema version of the document, currently always `1`. It
	116	exists so a later shape change has a defined migration point; it is the one
	117	element of this design that serves a future need rather than a present one,
	118	retained because it is a single JSON field now and an unpleasant retrofit once
	119	real preferences exist in real browsers.
	120	
	121	### Registry
	122	
	123	A defaults table doubles as the set of valid preference names. A name absent
	124	from it is not a preference.
	125	
	126	| Name | Type | Default | Validator |
	127	|---|---|---|---|
	128	| `rememberUsername` | boolean | `false` | strict boolean |
	129	| `username` | string | `""` | string, length <= 256 |
	130	
	131	The length cap bounds what a buggy or hostile write can park in storage.
	132	
	133	Adding a future preference means one row in each of the defaults and validator
	134	tables, and nothing else.
	135	
	136	## Module Interface
	137	
	138	| Call | Behavior |
	139	|---|---|
	140	| `Prefs.get(name)` | Returns the stored value, or the default when absent or invalid. |
	141	| `Prefs.set(name, value)` | Validates, then persists the whole document. |
	142	| `Prefs.clear(name)` | Resets one preference to its default. |
	143	| `Prefs.clearAll()` | Removes the `webapp.preferences` key entirely. |
	144	
	145	## Error Handling
	146	
	147	The governing rule is an asymmetry: **bad calling code throws; bad stored data
	148	degrades silently.** A misspelled preference name is a defect that should
	149	surface immediately during development. A mangled `localStorage` entry is a
	150	condition that occurs in the wild and must never break a login page.
	151	
	152	| Condition | Behavior |
	153	|---|---|
	154	| `get`/`set` with an unregistered name | Throw |
	155	| `set` with a value failing its validator | Throw |
	156	| Key absent | All defaults |
	157	| `JSON.parse` fails | All defaults; the next write overwrites the garbage |
	158	| Document is not an object, or `values` is missing or not an object | All defaults |
	159	| A single field fails its validator | Only that field falls back to its default; sibling fields survive |
	160	| Unknown keys present in stored `values` | Ignored on read, dropped on the next write |
	161	| `version` is anything other than `1` (higher, lower, missing, or not a number) | All defaults — only the known version is readable, and a future shape must not be guessed at. When a version 2 exists, this row becomes "run the migration for any known older version; default for anything else." |
	162	| `localStorage` access throws (private mode, storage disabled) | Fall back to an in-memory store for the lifetime of the page; preferences stop persisting and the app keeps working |
	163	| `setItem` throws (quota exceeded) | Caught; the in-memory value is retained; no crash |
	164	
	165	Per-field fallback is deliberate: it removes the main drawback of a
	166	single-document model, since one corrupt field now costs only itself rather
	167	than every preference.
	168	
	169	## Data Flow
	170	
	171	### Hydrate, on page load
	172	
	173	`app.js` runs after the DOM is parsed (its `<script>` tag is at the end of
	174	`<body>`, unchanged). It reads `rememberUsername`, sets the checkbox to match,
	175	and when true, prefills the username input from `username`.
	176	
	177	### Persist, on successful login
	178	
	179	Gated on `result.success`, not on form submission, so a rejected login does not
	180	durably remember a mistyped username. `login()` is currently a stub that always
	181	returns `{ success: true }`, so this distinction has no observable effect today;
	182	it is the correct shape for when the real `API_ENDPOINT` call replaces the stub,
	183	and it costs nothing now.
	184	
	185	When the checkbox is checked: write `rememberUsername = true` and `username`.
	186	
	187	### Opt out, on checkbox change
	188	
	189	Unchecking clears the stored username and flag immediately, on the `change`
	190	event — not at the next submit. A user who unchecks the box and leaves without
	191	logging in has made an explicit opt-out, and the identifier must already be gone
	192	at that point. Deferring the clear to a submission that may never happen would
	193	leave it in storage.
	194	
	195	## Testing
	196	
	197	`node:test` with `node:assert`, run via `npm test` (`node --test`). `prefs.js`
	198	is required directly with a fake `localStorage` object installed as a global, so
	199	the whole storage layer is exercised as pure logic — no browser, no jsdom, no
	200	dependencies.
	201	
	202	Cases:
	203	
	204	1. Empty storage returns every default.
	205	2. `set` then `get` round-trips a value.
	206	3. A malformed JSON document yields defaults and does not throw.
	207	4. A non-object document, and a document missing `values`, yield defaults.
	208	5. A wrong-typed field falls back while its siblings retain their stored values.
	209	6. A document whose `version` is not `1` yields defaults — covering a higher
	210	   version, a missing `version`, and a non-numeric one.
	211	7. `get` and `set` throw on an unregistered preference name.
	212	8. `set` throws on a value failing its validator, including an over-length username.
	213	9. `clear(name)` restores that preference's default and leaves others alone.
	214	10. `clearAll()` removes the key.
	215	11. A `localStorage` whose property access throws is survived: the module
	216	    degrades to in-memory and does not throw.
	217	12. A `localStorage` whose `setItem` throws is survived.
	218	13. No value written to storage ever contains the password. This encodes the
	219	    invariant from Global Constraints as an executable assertion.
	220	
	221	### Known coverage gap
	222	
	223	The `app.js` DOM wiring — hydrate, persist, and opt-out — is not unit-tested,
	224	because doing so requires jsdom and the project is holding at zero
	225	dependencies. These are roughly a dozen lines of glue over a fully tested
	226	module. They are verified manually:
	227	
	228	- Open `index.html`, check "Remember me", log in, reload: the username is
	229	  prefilled and the box is checked.
	230	- Uncheck the box, reload: the field is empty and the box is unchecked.
	231	- With the box unchecked from a clean state, log in and reload: nothing is
	232	  remembered.
	233	
	234	This gap is accepted, not overlooked. Adding jsdom would close it.
	235	
	236	## Files Touched
	237	
	238	| File | Change |
	239	|---|---|
	240	| `prefs.js` | New. The preferences module. |
	241	| `index.html` | Add the "Remember me" checkbox; load `prefs.js` before `app.js`. |
	242	| `app.js` | Hydrate on load, persist on successful login, clear on opt-out. |
	243	| `test/prefs.test.js` | New. The unit suite above. |
	244	| `package.json` | Add a `scripts.test` entry running `node --test`. |
	245	| `.gitignore` | New. Ignore `docs/hyperpowers` and `docs/superpowers`. |
	246	
	247	## Risks and Assumptions
	248	
	249	- **A remembered username is a stored identifier.** It sits in plaintext
	250	  `localStorage`, readable by any script on the origin. This is accepted: the
	251	  value is low-sensitivity, the checkbox makes it visible and refusable, and
	252	  the password is never involved. It is worth restating if a future preference
	253	  carries anything more sensitive, which would change this calculus.
	254	- **Assumption: the real `login()` will report failure via a falsy
	255	  `result.success`.** The current stub always succeeds, so the failure path is
	256	  unexercised. Validate when the real API call replaces the stub, by confirming
	257	  a rejected login leaves stored preferences untouched.
	258	- **`version` is speculative.** No migration exists or is planned. It is
	259	  retained because it is one field now and expensive later; if the project
	260	  would rather not carry it, removing it reduces this design to a
	261	  single-key store with no other change.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T024239Z-f4c3/home/.cache/hyperpowers/codex-review/51cf61abc4c6e2fd9bd4c65b6344207ff3c4fe12/run-kEZ9sVNp/approach-context.md

	1	# Approach Context: user preferences storage
	2	
	3	## Original request (verbatim)
	4	
	5	> Add user preferences storage so settings persist across sessions.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	**Q: This repo has two unconnected halves — a browser login page and a Node CLI. Which one needs preferences that persist across sessions?**
	10	A: Browser webapp (`index.html` + `app.js`).
	11	
	12	**Q: What should actually be stored as preferences?**
	13	A: Remembered username — prefill the username field on return visits. Explicitly not the password.
	14	
	15	**Q: Should remembering the username be opt-in or automatic?**
	16	A: Opt-in checkbox ("Remember me"), which clears the stored value when unchecked.
	17	
	18	Also settled during the discussion: because a remembered username must be
	19	readable *before* the user authenticates, it cannot be stored server-side keyed
	20	to the account. Storage is client-side. `sessionStorage` does not survive a
	21	browser session and a cookie would transmit the username on every request for no
	22	benefit, so `localStorage` is the mechanism.
	23	
	24	## Codebase facts
	25	
	26	The repository is tiny. Full file list (excluding `.git`):
	27	
	28	```
	29	index.html
	30	README.md
	31	package.json
	32	app.js
	33	src/index.js
	34	src/utils.js
	35	```
	36	
	37	### `index.html` (complete)
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
	57	### `app.js` (complete)
	58	
	59	```js
	60	// Simple webapp with login form handling
	61	const API_ENDPOINT = "https://api.example.com/login";
	62	
	63	function login(username, password) {
	64	  console.log("Logging in:", username);
	65	  // Stub: would POST to API_ENDPOINT in real app
	66	  return { success: true, user: username };
	67	}
	68	
	69	function validateForm(formData) {
	70	  if (!formData.username || !formData.password) {
	71	    return { valid: false, error: "Missing required fields" };
	72	  }
	73	  return { valid: true };
	74	}
	75	
	76	document.getElementById("login-form").addEventListener("submit", (e) => {
	77	  e.preventDefault();
	78	  const username = document.getElementById("username").value;
	79	  const password = document.getElementById("password").value;
	80	  const validation = validateForm({ username, password });
	81	  if (validation.valid) {
	82	    const result = login(username, password);
	83	    console.log("Login result:", result);
	84	  } else {
	85	    console.error("Validation error:", validation.error);
	86	  }
	87	});
	88	```
	89	
	90	### `package.json` (complete)
	91	
	92	```json
	93	{
	94	  "name": "drill-test-project",
	95	  "version": "1.0.0",
	96	  "description": "Test project for Drill scenarios",
	97	  "main": "src/index.js"
	98	}
	99	```
	100	
	101	### `src/index.js` and `src/utils.js` (complete)
	102	
	103	```js
	104	// src/index.js
	105	const { greet } = require('./utils');
	106	
	107	function main() {
	108	  console.log(greet('world'));
	109	}
	110	
	111	main();
	112	```
	113	
	114	```js
	115	// src/utils.js
	116	function greet(name) {
	117	  return `Hello, ${name}!`;
	118	}
	119	
	120	module.exports = { greet };
	121	```
	122	
	123	### Constraints and existing patterns
	124	
	125	- **No build step, no bundler, no framework.** `app.js` is loaded by a plain
	126	  `<script src="app.js">` tag and uses browser globals directly. It is not a
	127	  module (no `import`/`export`); it relies on top-level function declarations.
	128	- **`src/` uses CommonJS** (`require`/`module.exports`) and runs under Node. It
	129	  is entirely disconnected from the browser half — nothing imports across the
	130	  boundary. `package.json` `main` points at `src/index.js`.
	131	- **No dependencies at all.** `package.json` has no `dependencies`,
	132	  `devDependencies`, or `scripts` — no test runner, no linter, no formatter is
	133	  configured in the repo.
	134	- **No existing tests** anywhere in the tree.
	135	- **No CSS** and no styling of any kind in `index.html`.
	136	- `login()` is a stub that returns `{ success: true, user: username }`
	137	  unconditionally; it never contacts `API_ENDPOINT`. Any design must work with
	138	  the stub as-is and not depend on a real authentication response shape.
	139	- Git: current branch `feature/webapp-enhancement`, clean working tree.
	140	
	141	## What to produce
	142	
	143	Independent candidate approaches for how to structure the preferences storage
	144	in this codebase — module boundary, the persisted data model/schema, how
	145	defaults and corrupt or absent data are handled, and how it is made testable
	146	given there is no test infrastructure today.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
