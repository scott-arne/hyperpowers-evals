# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T100917Z-b261/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-preferences-storage-design.md

	1	# User Preferences Storage — Design
	2	
	3	Date: 2026-09-17
	4	Status: Approved for planning
	5	
	6	## Problem
	7	
	8	The webapp keeps no state between visits. A user who logs in must retype their
	9	username every session. There is no storage layer, no preferences schema, and
	10	no place for any future setting to live.
	11	
	12	## Scope
	13	
	14	Add a small preferences storage module for the **browser** surface, and use it
	15	for a single real preference: a remembered username on the login form.
	16	
	17	Explicitly out of scope:
	18	
	19	- The Node entry point (`src/index.js`, `src/utils.js`). It is a separate
	20	  runtime with a separate notion of a session and no preferences of its own.
	21	  Nothing under `src/` is modified.
	22	- Theme or other display settings. They would require inventing a settings UI
	23	  and something for the settings to affect.
	24	- Any form of "stay logged in". That requires a session token from a real
	25	  backend; this app's `login()` is a stub.
	26	
	27	## Global Constraints
	28	
	29	- **Zero runtime dependencies.** The repo currently has none; keep it that way.
	30	- **Test runner:** Node's built-in `node:test`, invoked via `npm test`
	31	  (`node --test`). No jsdom, no Vitest.
	32	- **No linter or formatter** is set up as part of this work.
	33	- Follow the existing CommonJS style used under `src/`.
	34	- **Never persist the password**, or anything derived from it, to
	35	  `localStorage`. Any script on the origin can read it.
	36	
	37	## Decisions
	38	
	39	### Surface: browser only
	40	
	41	`localStorage`, per-device and per-origin. The login form is the only thing in
	42	this repo a user interacts with. A Node or server-side backend can be added
	43	later against the same preference names; building a cross-runtime abstraction
	44	now would be designing against imagined requirements.
	45	
	46	### Module format: dual export
	47	
	48	`preferences.js` attaches itself to `window` when running in a browser and to
	49	`module.exports` when running under Node:
	50	
	51	```js
	52	if (typeof module !== "undefined" && module.exports) {
	53	  module.exports = Preferences;
	54	} else {
	55	  window.Preferences = Preferences;
	56	}
	57	```
	58	
	59	This loads from a plain `<script>` tag and is testable with a plain `require()`,
	60	with no bundler and no changes to unrelated files.
	61	
	62	Rejected: ES modules throughout. It would require either `"type": "module"` in
	63	`package.json` plus converting `src/index.js` and `src/utils.js` — unrelated
	64	files — or an `.mjs` extension, which some static file servers send with a MIME
	65	type browsers refuse to load as a module.
	66	
	67	### Data model: one namespaced key
	68	
	69	All preferences live in a single `localStorage` key,
	70	`drill-test-project:preferences`, holding one JSON object. A `DEFAULTS` map is
	71	the single source of truth for which keys are valid preferences and what each
	72	falls back to:
	73	
	74	```js
	75	const DEFAULTS = { rememberUsername: false, username: "" };
	76	```
	77	
	78	A key absent from `DEFAULTS` is not a valid preference; `get` returns
	79	`undefined` for it and `set` rejects it (returns `false`) rather than writing
	80	an unknown key.
	81	
	82	No schema version field. For a two-key preference set the defaults fallback
	83	(below) already covers every case a version field would catch.
	84	
	85	## Components
	86	
	87	### `preferences.js` (new, repo root)
	88	
	89	Public API:
	90	
	91	| Call | Behavior |
	92	|---|---|
	93	| `get(key)` | The stored value, or the default when unset, corrupted, or unavailable. `undefined` for a key not in `DEFAULTS`. |
	94	| `set(key, value)` | Persists the value. Returns `true` on success, `false` on rejected key or write failure. |
	95	| `remove(key)` | Reverts the key to its default. |
	96	| `clear()` | Removes the whole namespaced key. |
	97	
	98	### `index.html` (modified)
	99	
	100	- A "Remember me" checkbox, `id="remember-me"`, inside the login form.
	101	- `<script src="preferences.js">` before `<script src="app.js">`, so the global
	102	  exists when `app.js` runs.
	103	
	104	### `app.js` (modified)
	105	
	106	- On `DOMContentLoaded`: when `rememberUsername` is true, prefill `#username`
	107	  from the stored `username` and check `#remember-me`.
	108	- On submit, after validation passes: when the box is checked, store
	109	  `rememberUsername: true` and the username; otherwise remove both keys.
	110	- The password is read for validation only and never passed to `Preferences`.
	111	
	112	## Data Flow
	113	
	114	Load: `app.js` asks `Preferences.get("rememberUsername")` -> module reads and
	115	parses the namespaced key (or falls back to defaults) -> form prefilled.
	116	
	117	Submit: form validates -> `Preferences.set(...)` or `.remove(...)` -> module
	118	merges into its in-memory object and writes the whole JSON blob back. A write
	119	failure is logged and swallowed; the login flow continues either way.
	120	
	121	## Error Handling
	122	
	123	The module must never throw into its caller. Three failure modes:
	124	
	125	1. **`localStorage` access throws** — private browsing, disabled storage, or a
	126	   sandboxed iframe can throw on property access, not just on use. Probed once
	127	   at init inside `try`/`catch`. On failure the module uses a plain in-memory
	128	   object for the rest of the page's life: preferences work for the current
	129	   session and simply do not persist.
	130	2. **Corrupted stored value** — `JSON.parse` fails, or parses to something that
	131	   is not a plain object. Caught; state resets to `DEFAULTS`. The bad value is
	132	   overwritten on the next successful `set`.
	133	3. **Write fails** — quota exceeded, or storage turned read-only mid-session.
	134	   Caught; `set` returns `false` and the value remains in the in-memory object.
	135	   A failed preference write must never break login.
	136	
	137	## Testing
	138	
	139	`test/preferences.test.js`, run by `node --test`.
	140	
	141	A Map-backed `localStorage` stub installed on `globalThis`, which can be
	142	configured to throw on access or on `setItem` so the failure paths are
	143	reachable. Cases:
	144	
	145	- Returns defaults when nothing is stored.
	146	- `set` then `get` round-trips a value.
	147	- `set` persists to the expected namespaced key as JSON.
	148	- `set` rejects a key absent from `DEFAULTS` and writes nothing.
	149	- `remove` reverts a key to its default.
	150	- `clear` removes the namespaced key.
	151	- Corrupted JSON in the key falls back to defaults instead of throwing.
	152	- A value that parses to a non-object falls back to defaults.
	153	- `setItem` throwing is contained: `set` returns `false` and `get` still
	154	  returns the value from memory.
	155	- Storage that throws on access falls back to in-memory and does not throw.
	156	
	157	**Known gap:** the DOM wiring in `app.js` has no automated test, because jsdom
	158	was deliberately excluded. It is verified by hand in a browser: log in with the
	159	box checked, reload, confirm the username is prefilled and the box is checked;
	160	then uncheck, submit, reload, and confirm the field is empty. The result of
	161	that manual check is reported with the work.
	162	
	163	## Files
	164	
	165	| File | Change |
	166	|---|---|
	167	| `preferences.js` | New. Storage module. |
	168	| `test/preferences.test.js` | New. Unit tests plus the stub. |
	169	| `index.html` | Modified. Checkbox and script tag. |
	170	| `app.js` | Modified. Load-time prefill and submit-time persistence. |
	171	| `package.json` | Modified. `"scripts": { "test": "node --test" }`. |
	172	| `src/**` | Untouched. |


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T100917Z-b261/home/.cache/hyperpowers/codex-review/b94c0b23ae73c0b516b4d8f205c669c51f12dd56/run-s8Lda6Dd/adjudications.md

	1	# Approved design context — preferences storage
	2	
	3	## Original request (verbatim)
	4	
	5	"Add user preferences storage so settings persist across sessions."
	6	
	7	## Repository facts
	8	
	9	- `index.html` + `app.js`: a browser login form. `app.js` is a plain `<script>`,
	10	  no module system. `login()` is a stub that does not call the network.
	11	- `src/index.js` + `src/utils.js`: an unrelated Node CommonJS entry point
	12	  (`greet`). Separate runtime.
	13	- `package.json`: no dependencies, no scripts, `"main": "src/index.js"`.
	14	- No test runner, no linter, no formatter, no storage or settings code.
	15	- Branch `feature/webapp-enhancement`, clean tree at the start of this work.
	16	
	17	## Decisions the user approved during brainstorming
	18	
	19	1. **Surface: browser only.** Chosen over Node-only and over a dual-backend
	20	   abstraction. Rationale: the login form is the only user-facing surface;
	21	   a cross-runtime abstraction would be designed against imagined requirements.
	22	2. **Scope: remembered username**, built on a small reusable preferences
	23	   module. Chosen over theme/display settings and over a storage layer with no
	24	   consumer. Rationale: gives the module a real consumer without inventing a
	25	   settings UI.
	26	3. **Testing: Node's built-in `node:test`** plus a hand-written `localStorage`
	27	   stub, wired to `npm test`. Chosen over Vitest+jsdom (adds a dependency tree
	28	   to a zero-dependency repo) and over no tests.
	29	4. **No linter or formatter** in this change. User chose "not now".
	30	5. **Module format: dual export** (`window` in the browser, `module.exports`
	31	   under Node). Chosen over ES modules everywhere, which would require either
	32	   `"type": "module"` plus converting unrelated files under `src/`, or an
	33	   `.mjs` extension that some static servers serve with a MIME type browsers
	34	   refuse to load as a module.
	35	
	36	## Constraint stated by Claude and not contradicted by the user
	37	
	38	The password must never be written to `localStorage`. "Stay logged in" is out
	39	of scope; it requires a session token from a real backend.
	40	
	41	## Known, accepted gap
	42	
	43	The DOM wiring in `app.js` has no automated test, because jsdom was
	44	deliberately excluded. It is to be verified manually in a browser and the
	45	result reported.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
