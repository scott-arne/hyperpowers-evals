# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T095856Z-d158/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-user-preferences-storage-design.md

	1	# User Preferences Storage — Design
	2	
	3	Date: 2026-09-17
	4	Status: approved (design), not yet implemented
	5	
	6	## Problem
	7	
	8	The webapp has no way to remember anything about a user between visits. Every
	9	page load starts from an empty form. We want user settings to persist across
	10	sessions, and we want a storage foundation that later settings can build on
	11	rather than a one-off hack in the submit handler.
	12	
	13	## Decisions Already Settled
	14	
	15	These were decided during brainstorming and are not open questions:
	16	
	17	1. **Surface: the browser webapp** (`index.html` + `app.js`), persisting via
	18	   `localStorage`. "Across sessions" means across page loads and browser
	19	   restarts, scoped per browser and origin. The Node module under `src/` is
	20	   unrelated to this work and is not touched.
	21	2. **Scope: storage layer plus one real consumer** — a "remember my username"
	22	   setting. A storage layer with no caller tends to grow options nobody needs;
	23	   one concrete consumer keeps the API honest.
	24	3. **Tooling: Node's built-in test runner** (`node --test`), zero
	25	   dependencies. No linter or formatter — overhead without a team on a
	26	   codebase this size.
	27	
	28	## Global Constraints
	29	
	30	- **Zero runtime and zero dev dependencies.** No `node_modules`, no build
	31	  step. The repo has none today and this change does not introduce any.
	32	- **Unit-test infrastructure is part of this work**: a `test/` directory, a
	33	  `"test"` script in `package.json`, and passing tests for the new module.
	34	- **The password is never written to storage.** `localStorage` is readable by
	35	  any script on the origin. A test pins the exact set of keys the stored blob
	36	  may contain (see Testing, case 10); the `app.js` side is enforced by review,
	37	  since it is not unit-testable without browser tooling.
	38	- **Unrelated files are not modified.** `src/index.js`, `src/utils.js`, and
	39	  `README.md` stay as they are. In particular, `package.json` does not gain a
	40	  `"type": "module"` field, because that would break the CommonJS modules
	41	  under `src/`.
	42	- The spec and plan documents are working files. Do not commit them.
	43	
	44	## Architecture
	45	
	46	One new file, `preferences.js`, at the repo root alongside `app.js`.
	47	
	48	It exports a factory rather than a singleton, with storage injected:
	49	
	50	```js
	51	createPreferences({
	52	  storage,              // defaults to globalThis.localStorage
	53	  namespace = "prefs",  // the localStorage key the blob lives under
	54	  defaults = {},        // values returned for keys never written
	55	});
	56	// -> { get, set, remove, clear, all }
	57	```
	58	
	59	The injected `storage` parameter is what makes the module testable in Node
	60	with no jsdom and no dependencies: tests pass a `Map`-backed fake implementing
	61	the three methods actually used (`getItem`, `setItem`, `removeItem`).
	62	
	63	### API
	64	
	65	| Method | Behavior |
	66	|---|---|
	67	| `get(key)` | Returns the stored value; falls back to `defaults[key]`; `undefined` if neither exists. |
	68	| `set(key, value)` | Writes the value. Returns `true` on success, `false` if the write failed (e.g. quota). |
	69	| `remove(key)` | Deletes the key, so `get` falls back to its default again. Returns `true`/`false` the same way. |
	70	| `clear()` | Removes the entire namespace blob. |
	71	| `all()` | Returns a plain object of defaults merged with stored values. Callers get a copy, not internal state. |
	72	
	73	### Module format
	74	
	75	`src/` is CommonJS, `app.js` loads as a plain `<script src>`, and
	76	`package.json` declares no `"type"`. `preferences.js` therefore uses a
	77	dual-export guard: it assigns to `module.exports` when `module` is defined
	78	(Node tests) and to `globalThis.Preferences` otherwise (the browser).
	79	
	80	This was chosen over two alternatives:
	81	
	82	- **Converting the project to ES modules** would require `"type": "module"` in
	83	  `package.json` and rewriting `src/index.js` and `src/utils.js` — a refactor
	84	  of files unrelated to this task.
	85	- **Naming the file `.mjs`** avoids the config change but depends on the
	86	  serving environment sending a JavaScript MIME type for `.mjs`, which is not
	87	  guaranteed for `file://` or minimal static servers.
	88	
	89	The guard is mildly old-fashioned, but it matches the repo's existing
	90	vanilla-script idiom, touches no unrelated file, and needs no configuration.
	91	
	92	## Data Model
	93	
	94	All preferences live under a **single** `localStorage` key (the namespace),
	95	holding a versioned JSON envelope:
	96	
	97	```json
	98	{ "v": 1, "data": { "rememberUsername": true, "username": "ada" } }
	99	```
	100	
	101	Chosen over one `localStorage` key per preference because it gives atomic
	102	read/write, a single place to validate shape, trivial clearing, and a
	103	migration hook (`v`) at no cost.
	104	
	105	**Accepted tradeoff:** with one blob, two browser tabs writing different
	106	preferences will clobber each other — last write wins. With two settings on a
	107	login page this is negligible. If the number of settings grows materially,
	108	splitting into per-key storage is a contained change behind this same API.
	109	
	110	Defaults for this iteration:
	111	
	112	```js
	113	{ rememberUsername: false, username: "" }
	114	```
	115	
	116	## Error Handling
	117	
	118	No method throws at the caller. The app must never break because storage
	119	misbehaved; it degrades to not remembering things.
	120	
	121	| Condition | Behavior |
	122	|---|---|
	123	| `localStorage` unavailable or throws on access (private mode, cookies disabled) | Detected at construction via a probe write/remove in `try`/`catch`; falls back to an in-memory `Map`. The API works for the lifetime of the page; nothing persists. |
	124	| Stored value is malformed JSON | Caught; treated as an empty preference set; overwritten on the next successful write. |
	125	| Stored value parses but is not an object, or has an unexpected `v` | Treated as empty, same as malformed. |
	126	| `setItem` throws (quota exceeded) | Caught; `set` returns `false` and the value is **not** retained. A later `get` returns the previous value or the default. |
	127	| `get` on a key never written | Returns `defaults[key]`, else `undefined`. |
	128	
	129	## Feature Wiring
	130	
	131	### `index.html`
	132	
	133	- Add a checkbox inside the login form:
	134	  `<label><input type="checkbox" id="remember-me" /> Remember my username</label>`
	135	- Add `<script src="preferences.js"></script>` **before** `<script src="app.js"></script>`,
	136	  so `globalThis.Preferences` exists when `app.js` runs.
	137	
	138	### `app.js`
	139	
	140	- Construct a module-level preferences instance with the defaults above.
	141	- On load (the script already runs at end of `<body>`, so the form exists):
	142	  if `rememberUsername` is true, prefill `#username` with the stored
	143	  `username` and check `#remember-me`.
	144	- In the submit handler, after validation passes:
	145	  - checkbox checked -> `set("rememberUsername", true)` and
	146	    `set("username", username)`
	147	  - checkbox unchecked -> `set("rememberUsername", false)` and
	148	    `remove("username")`
	149	- The password is read from the DOM and passed to `login()` only. It is never
	150	  passed to any preferences method.
	151	
	152	The existing `login` and `validateForm` functions are unchanged.
	153	
	154	## Testing
	155	
	156	`test/preferences.test.js`, run via `node --test` (a new `"test"` script in
	157	`package.json`). Tests use a `Map`-backed fake storage; no browser, no jsdom.
	158	
	159	Cases:
	160	
	161	1. `get` returns the configured default for a key never written.
	162	2. `get` returns `undefined` for an unknown key with no default.
	163	3. `set` then `get` round-trips a value.
	164	4. **A fresh instance constructed over the same storage sees previously
	165	   written values** — this is the "persists across sessions" property itself,
	166	   and is the single most important test in the suite.
	167	5. `remove` restores the default; `clear` empties the whole namespace.
	168	6. `all()` returns defaults merged with stored values.
	169	7. Malformed JSON already in storage: `get` returns defaults and does not
	170	   throw; a subsequent `set` repairs the blob.
	171	8. A storage whose `setItem` throws: `set` returns `false` and does not throw.
	172	9. A storage that throws on every access: construction succeeds and the
	173	   in-memory fallback round-trips values.
	174	10. Nothing resembling a password is ever written: after writing exactly the
	175	    keys `app.js` writes (`rememberUsername`, `username`), the serialized blob
	176	    contains exactly those two keys and nothing else.
	177	
	178	`app.js` itself is not unit-tested — it depends on the DOM, and browser test
	179	tooling is explicitly out of scope. Test 10 pins the storage module's
	180	serialized shape; the guarantee that `app.js` never passes a password to it is
	181	enforced by code review of a five-line handler, not by a test.
	182	
	183	Manual verification (not automated, no browser tooling in scope): open
	184	`index.html`, log in with the box checked, reload, confirm the username is
	185	prefilled; uncheck, submit, reload, confirm it is not.
	186	
	187	## Out of Scope
	188	
	189	Deliberately excluded to keep this focused:
	190	
	191	- A settings panel or any multi-setting UI.
	192	- Theme, locale, or any preference beyond remember-username.
	193	- Server-side sync or any backend (none exists).
	194	- Encryption of stored values.
	195	- Cross-tab synchronization via the `storage` event.
	196	- A migration framework beyond the `v` field being present.
	197	
	198	## Files
	199	
	200	| File | Change |
	201	|---|---|
	202	| `preferences.js` | New. The storage module. |
	203	| `test/preferences.test.js` | New. The test suite. |
	204	| `index.html` | Modified. Checkbox plus the new script tag. |
	205	| `app.js` | Modified. Prefill on load, persist on submit. |
	206	| `package.json` | Modified. Adds the `"test"` script. |


## Adjudicated decisions

NOT PROVIDED: flag not passed

## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
