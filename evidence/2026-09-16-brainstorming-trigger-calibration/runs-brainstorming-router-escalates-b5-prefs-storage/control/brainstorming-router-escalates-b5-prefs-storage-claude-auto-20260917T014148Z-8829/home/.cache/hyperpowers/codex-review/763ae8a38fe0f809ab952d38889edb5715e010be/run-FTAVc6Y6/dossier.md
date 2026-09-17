# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T014148Z-8829/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-user-preferences-storage-design.md

	1	# User Preferences Storage — Design
	2	
	3	Date: 2026-09-16
	4	Status: approved in chat, pending spec review
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The browser app (`index.html` + `app.js`) keeps nothing between page loads. A
	10	returning user retypes their username every visit, and there is no place to
	11	put any other user-facing setting. The repository has no settings concept, no
	12	persistence layer, and no module to extend, so this adds a new subsystem
	13	rather than changing an existing flow.
	14	
	15	## Scope
	16	
	17	In scope: a preferences module for the browser app, persisted in
	18	`localStorage`, with a fixed schema and declared defaults; the wiring in
	19	`app.js` and `index.html` that uses it; unit-test infrastructure for it.
	20	
	21	Out of scope: the Node program in `src/` (it has no settings and is not a
	22	consumer); any server-side or cross-device sync; a theme switcher UI; any
	23	change to `login` or `validateForm` behavior.
	24	
	25	## Decisions
	26	
	27	Each of these was chosen over stated alternatives during brainstorming.
	28	
	29	1. **Target: the browser app.** A "session" is a page load and persistence
	30	   means `localStorage`. The Node program in `src/` has no settings, and a
	31	   shared core serving both was rejected as speculative abstraction for a
	32	   consumer that does not exist.
	33	2. **Fixed schema with declared defaults**, not a generic open key/value
	34	   store. Unknown keys are rejected, which buys typo protection, real
	35	   defaults, and a migration story.
	36	3. **Single JSON blob under one `localStorage` key**, not a key per entry.
	37	   Writes are atomic, there is one key to inspect or clear, and prefs are
	38	   written from only one place in this app. Key-per-entry was a defensible
	39	   alternative and would win if multiple independent writers existed.
	40	4. **Explicit call sites, not DOM auto-binding.** A declarative
	41	   element-to-preference binding table would save three lines in `app.js` at
	42	   the cost of coupling storage to the DOM, needing a DOM shim to test, and
	43	   turning the password exclusion into an emergent property of configuration
	44	   rather than an explicit fact about the schema.
	45	5. **Tooling: `node:test` only.** Node ships the runner, so the repository
	46	   stays dependency-free. No linter or formatter: overhead without much
	47	   payoff on five files.
	48	
	49	## Global Constraints
	50	
	51	- **The password is never persisted.** `localStorage` is plaintext, readable
	52	  by any script on the origin, and survives logout. `password` is not a
	53	  schema key, so no code path can write it; a test asserts the serialized
	54	  blob never contains one.
	55	- **The module must load in a Node process with no `localStorage` and no
	56	  `document`.** This follows from the `node:test` choice and is what forces
	57	  the storage backend behind an injectable seam.
	58	- **No build step, no bundler, no new dependencies.** `index.html` loads
	59	  plain scripts; `package.json` gains a `scripts.test` entry and nothing
	60	  else.
	61	- **Do not add `"type": "module"` to `package.json`.** It would break the
	62	  CommonJS `require` in `src/index.js`.
	63	- **Unit tests accompany the module**, covering defaults, round-trips,
	64	  cross-session persistence, and every defined failure mode.
	65	
	66	## Architecture
	67	
	68	### New file: `preferences.js` (repository root)
	69	
	70	Sits alongside `app.js` and is loaded before it. Contains the schema, the
	71	backends, and the factory.
	72	
	73	**Schema** — the single source of truth for what a preference is:
	74	
	75	```js
	76	const SCHEMA = {
	77	  username:   { default: "",      validate: (v) => typeof v === "string" },
	78	  rememberMe: { default: false,   validate: (v) => typeof v === "boolean" },
	79	  theme:      { default: "light", validate: (v) => v === "light" || v === "dark" },
	80	};
	81	```
	82	
	83	`theme` is stored, read, and applied, but nothing in this change sets it;
	84	there is no theme switcher. It exists so the mechanism is exercised by a
	85	preference that is neither a string nor login-related. It is the first thing
	86	to drop if the schema should carry only what is actively written.
	87	
	88	**Backends.** A backend is any object exposing `getItem(key)`,
	89	`setItem(key, value)`, and `removeItem(key)`.
	90	
	91	- `localStorageBackend()` — returns `window.localStorage`.
	92	- `memoryBackend()` — a `Map`-backed stand-in with the same three methods.
	93	- `detectBackend()` — attempts a probe write/read/delete on a throwaway key
	94	  inside `try/catch` and returns the real backend on success, the in-memory
	95	  one on any failure. A probe is the only reliable detection: Safari private
	96	  mode and some blocked-storage configurations expose a `localStorage` object
	97	  whose `setItem` throws.
	98	
	99	**Factory.** `createPreferences(backend)` reads and parses the stored blob
	100	once into an in-memory object, then returns:
	101	
	102	| Method | Behavior |
	103	|---|---|
	104	| `get(key)` | Effective value: the stored value if present and valid, else the declared default. Throws on an unknown key. |
	105	| `set(key, value)` | Validates, updates memory, writes the whole blob. Throws on an unknown key or a failed validator. |
	106	| `reset(key)` | Restores one key to its default and persists. |
	107	| `reset()` | Restores every key to its default and persists. |
	108	| `all()` | A plain object of every schema key's effective value. |
	109	
	110	**Persistence format.** One `localStorage` key, `"preferences"`, holding a
	111	JSON object containing only known schema keys. Unknown keys found in the
	112	stored JSON are ignored on read and dropped on the next write.
	113	
	114	**Export.** The file ends with a dual export so one file serves both
	115	consumers with no build step:
	116	
	117	```js
	118	if (typeof module !== "undefined" && module.exports) {
	119	  module.exports = { SCHEMA, createPreferences, detectBackend, memoryBackend };
	120	} else {
	121	  window.Preferences = { SCHEMA, createPreferences, detectBackend, memoryBackend };
	122	}
	123	```
	124	
	125	### Changes to `index.html`
	126	
	127	- Add `<script src="preferences.js"></script>` immediately before the
	128	  existing `<script src="app.js"></script>`, so `window.Preferences` exists
	129	  when `app.js` runs.
	130	- Add a remember-me control to the form:
	131	  `<input type="checkbox" id="remember-me">` with an associated `<label>`.
	132	  The form has no such control today, so without it `rememberMe` could never
	133	  be turned on. This is the only UI this change adds.
	134	
	135	### Changes to `app.js`
	136	
	137	Three additions inside the existing structure. `login` and `validateForm` are
	138	untouched.
	139	
	140	1. Construct once, near the top:
	141	   `const prefs = Preferences.createPreferences(Preferences.detectBackend());`
	142	2. Restore on load, at the same point the existing `addEventListener` call
	143	   runs — the script tag is at the end of `<body>`, so the DOM is parsed and
	144	   no `DOMContentLoaded` wrapper is needed:
	145	   - set `#remember-me.checked` from `prefs.get("rememberMe")`
	146	   - when that is true, set `#username.value` from `prefs.get("username")`
	147	   - set `document.documentElement.dataset.theme` from `prefs.get("theme")`
	148	3. Persist in the submit handler, after validation succeeds:
	149	   - `prefs.set("rememberMe", rememberMeCheckbox.checked)`
	150	   - when checked, `prefs.set("username", username)`; when not,
	151	     `prefs.reset("username")` so a previously remembered name is cleared.
	152	
	153	## Data Flow
	154	
	155	**First visit.** `detectBackend()` probes successfully; no `"preferences"`
	156	key exists; every `get` returns its declared default; the form renders empty
	157	with remember-me unchecked.
	158	
	159	**Submit with remember-me checked.** The handler validates, calls `login`,
	160	then writes `{username, rememberMe: true}` through `set`, which validates
	161	each value and serializes the whole blob to `localStorage`.
	162	
	163	**Return visit.** `createPreferences` parses the stored blob once;
	164	`get("rememberMe")` is true, so `#username` is populated and remember-me is
	165	checked. This is the behavior the feature exists to deliver.
	166	
	167	**Submit with remember-me unchecked.** `rememberMe` is written as `false` and
	168	`username` is reset to its default, so the next visit starts clean.
	169	
	170	## Error Handling
	171	
	172	No failure below throws into application code.
	173	
	174	| Failure | Behavior |
	175	|---|---|
	176	| `localStorage` absent or blocked (private mode, disabled) | Probe fails at construction; the in-memory backend is used. The app works; preferences do not outlive the page. |
	177	| Stored JSON unparseable | Treated as empty. Every key reads its default; the next `set` overwrites with clean JSON. |
	178	| A stored value fails its validator | That key alone reads its default. Other keys are unaffected. |
	179	| `setItem` throws mid-session (quota exceeded) | Caught; the write is dropped and reported with `console.warn`. The in-memory value still reflects the change, so the UI stays consistent for the rest of the page's life. |
	180	
	181	Unknown-key `get`/`set` is the deliberate exception and throws: that is a
	182	programming error, not a runtime condition, and failing loudly is what makes
	183	the fixed schema worth having.
	184	
	185	## Testing
	186	
	187	`package.json` gains `"scripts": { "test": "node --test" }` and no
	188	dependencies. Tests live in `test/preferences.test.js` and run against an
	189	injected fake backend, so no DOM or browser is involved.
	190	
	191	Cases:
	192	
	193	1. Defaults are returned when the backend is empty.
	194	2. `set` then `get` round-trips each type: string, boolean, enum.
	195	3. Values survive a fresh `createPreferences` over the same backend — the
	196	   actual "persists across sessions" assertion.
	197	4. Corrupt JSON in the backend yields defaults, and a subsequent `set`
	198	   repairs the blob.
	199	5. An out-of-range value (`theme: "purple"`) yields the default for that key
	200	   only; other keys are intact.
	201	6. An unknown key throws on both `get` and `set`.
	202	7. A backend whose `setItem` throws: no exception escapes, and the in-memory
	203	   value is still updated.
	204	8. `reset(key)` and `reset()` restore defaults.
	205	9. The serialized blob never contains a `password` key.
	206	10. Unknown keys present in stored JSON are ignored on read and dropped on
	207	    the next write.
	208	
	209	**Not covered by automated tests:** the DOM wiring in `app.js` and the real
	210	`localStorage` probe. Covering them requires a DOM shim or a browser runner,
	211	which is outside the zero-dependency tooling chosen for this work. They will
	212	be verified by loading the page manually, and the result reported honestly —
	213	including any failure.
	214	
	215	## Risks and Assumptions
	216	
	217	- Assumption: the remember-me checkbox is wanted rather than persisting the
	218	  username unconditionally. Validate via the spec review below; reversing it
	219	  means deleting the checkbox and one branch in the handler.
	220	- Assumption: carrying a `theme` key that nothing yet writes is acceptable as
	221	  schema exercise. Validate via the spec review; dropping it is a two-line
	222	  change.
	223	- Storing a username in `localStorage` is a mild privacy exposure on a shared
	224	  device — it is visible to any script on the origin and to anyone who opens
	225	  the browser. This is the normal cost of a remember-me feature and is why
	226	  the checkbox is opt-in and defaults to off.
	227	- The dual export is a deliberate small hack to avoid a build step. If the
	228	  project later adopts ES modules or a bundler, it should be replaced with a
	229	  real `export`.
	230	
	231	## Files Touched
	232	
	233	| File | Change |
	234	|---|---|
	235	| `preferences.js` | New. Schema, backends, factory, dual export. |
	236	| `index.html` | Script tag for `preferences.js`; remember-me checkbox and label. |
	237	| `app.js` | Construct prefs; restore on load; persist on submit. |
	238	| `package.json` | Add `scripts.test`. |
	239	| `test/preferences.test.js` | New. The cases above. |
	240	| `.gitignore` | Already created alongside this spec, not part of the implementation. Ignores `docs/hyperpowers` so specs stay uncommitted. |


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T014148Z-8829/home/.cache/hyperpowers/codex-review/763ae8a38fe0f809ab952d38889edb5715e010be/run-oZpdimnP/approach-context.md

	1	# Approach Context: user preferences storage
	2	
	3	## Original request (verbatim)
	4	
	5	> Add user preferences storage so settings persist across sessions.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	**Q: Which program should the preferences storage serve?**
	10	A: The browser app (`index.html` + `app.js`), using `localStorage`. Not the
	11	Node program in `src/`, and not a shared core serving both.
	12	
	13	**Q: What shape should the stored preferences take?**
	14	A: A fixed set of declared keys, each with a default and a validator. Unknown
	15	keys rejected. (Chosen over a generic open key/value store, and over a
	16	minimal login-only set.)
	17	
	18	**Q: What tooling should be set up alongside the feature?**
	19	A: Unit tests using Node's built-in `node:test` runner plus an `npm test`
	20	script. Zero new dependencies. No linter/formatter.
	21	
	22	## Codebase facts
	23	
	24	Repository root contains exactly:
	25	
	26	- `index.html` — a plain HTML page, no build step, no framework, no bundler.
	27	  Body is an `h1`, a `form#login-form` containing `input#username`
	28	  (type=text), `input#password` (type=password), and a submit button. Loads
	29	  `app.js` via a plain `<script src="app.js">` tag (no `type="module"`).
	30	- `app.js` — 28 lines of vanilla browser JS at global scope. Declares
	31	  `const API_ENDPOINT`, `function login(username, password)` (a stub that
	32	  logs and returns `{success: true, user: username}`), and
	33	  `function validateForm(formData)` returning `{valid, error}`. At the bottom
	34	  it calls `document.getElementById("login-form").addEventListener("submit", ...)`
	35	  at load time, which reads the two input values, validates, and calls
	36	  `login`. There is no module system in use in this file — no `require`, no
	37	  `import`, no `export`.
	38	- `src/index.js` — CommonJS: `const { greet } = require('./utils');` then a
	39	  `main()` that console.logs a greeting. Unrelated to the browser app.
	40	- `src/utils.js` — CommonJS: exports a single `greet(name)` function.
	41	- `package.json` — `{name: "drill-test-project", version: "1.0.0",
	42	  description, main: "src/index.js"}`. No `scripts`, no `dependencies`, no
	43	  `devDependencies`, no `"type"` field (so `.js` is CommonJS for Node).
	44	- `README.md` — three lines, describes it as a minimal test project.
	45	
	46	No test runner, no test directory, no linter config, no CI config, no
	47	`node_modules`. Git branch is `feature/webapp-enhancement`; working tree
	48	clean.
	49	
	50	## Constraints established
	51	
	52	- Storage backend is `localStorage` in the browser.
	53	- The password must never be persisted. `localStorage` is plaintext, readable
	54	  by any script on the origin, and survives logout.
	55	- The preferences module must be unit-testable under `node:test`, i.e.
	56	  runnable in a Node process where `localStorage` and `document` do not
	57	  exist.
	58	- The app currently has no module system in the browser (plain script tag,
	59	  global scope). Any choice here interacts with that fact.
	60	- Behaviour when the backend is unavailable (private mode, disabled storage,
	61	  quota exceeded) and when a stored value is corrupt/unparseable must be
	62	  defined.
	63	
	64	## What to produce
	65	
	66	Independent candidate approaches for how to structure this preferences
	67	storage: the module boundary, its public API, how the fixed schema and
	68	defaults are expressed, how persistence is triggered, and how it is made
	69	testable outside a browser. Do not assume any particular structure is
	70	already decided beyond the answers above.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
