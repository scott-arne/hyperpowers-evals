# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T013101Z-e78b/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-user-preferences-storage-design.md

	1	# User Preferences Storage — Design
	2	
	3	Date: 2026-09-16
	4	Status: Approved design, pending implementation plan
	5	
	6	## Problem
	7	
	8	The webapp has no persistence of any kind. Every page load starts from a blank
	9	login form, and there is nowhere for user-facing settings to live. We want user
	10	preferences that survive a browser session so that settings the user chooses
	11	once are still in effect the next time they open the app.
	12	
	13	## Scope
	14	
	15	In scope:
	16	
	17	- A new browser-side preferences module with a declared schema, typed defaults,
	18	  and validation.
	19	- Persistence to `localStorage` under a single key.
	20	- Wiring into the existing login form so the feature is observable: a remembered
	21	  username and a light/dark theme.
	22	- Zero-dependency unit test infrastructure using Node's built-in test runner.
	23	
	24	Out of scope:
	25	
	26	- The Node module under `src/` (`index.js`, `utils.js`). It is an unrelated
	27	  CommonJS greeting stub with no settings, and this work does not touch it.
	28	- Server-side or cross-device preference sync.
	29	- Any change to authentication behavior. `login()` remains the existing stub.
	30	- A general settings screen or preferences UI beyond the two controls described
	31	  below.
	32	
	33	## Decisions
	34	
	35	These were settled during brainstorming and are not open questions.
	36	
	37	1. **Surface: browser, backed by `localStorage`.** The login form is the only
	38	   interactive surface in the repo. "Persists across sessions" means surviving a
	39	   tab close.
	40	2. **Fixed schema with defaults**, not a generic key-value bag. The module owns
	41	   the list of valid keys, their defaults, and their validators. Retrofitting
	42	   validation onto data already sitting in users' browsers is expensive, so the
	43	   schema exists from the first commit.
	44	3. **Tooling: `node:test` with an injected storage backend**, no new
	45	   dependencies. The injection seam is what makes browser storage code testable
	46	   under Node, and it is worth having regardless of testing.
	47	
	48	## Architecture
	49	
	50	### File layout
	51	
	52	| Path | Status | Purpose |
	53	|---|---|---|
	54	| `preferences.mjs` | new | The preferences module |
	55	| `test/preferences.test.mjs` | new | Unit tests |
	56	| `app.js` | modified | Reads and writes preferences; wires up UI |
	57	| `index.html` | modified | Adds the two controls, theme styling, module script tag |
	58	| `package.json` | modified | Adds the `test` script |
	59	
	60	`preferences.mjs` lives at the repo root alongside `app.js`, because the root is
	61	where the browser code lives. `src/` is the separate Node module and stays
	62	untouched.
	63	
	64	### Why `.mjs`
	65	
	66	The module has two consumers: the browser (via `<script type="module">`) and
	67	Node's test runner. Node imports `.mjs` as an ES module natively, regardless of
	68	`package.json`. The alternative — adding `"type": "module"` to `package.json` —
	69	would reinterpret every `.js` file in the repo as ESM and break
	70	`src/index.js`'s `require('./utils')`. The `.mjs` extension gets one file format
	71	serving both consumers with no collateral damage.
	72	
	73	### Storage layout
	74	
	75	All preferences live under a single `localStorage` key:
	76	
	77	- Key: `webapp:preferences`
	78	- Value: a JSON object mapping preference names to values, e.g.
	79	  `{"rememberedUsername":"alice","theme":"dark"}`
	80	
	81	One key rather than one key per preference. This means a single read and a
	82	single write per operation, makes the whole store trivially clearable, keeps the
	83	`localStorage` namespace clean, and leaves room to add a `version` field if the
	84	schema ever needs migration. Per-preference keys would make partially-written,
	85	mutually-inconsistent state representable.
	86	
	87	## Public API
	88	
	89	```js
	90	export const SCHEMA = {
	91	  rememberedUsername: { default: "",      validate: v => typeof v === "string" },
	92	  theme:              { default: "light", validate: v => v === "light" || v === "dark" },
	93	};
	94	
	95	export function createPreferences(storage = globalThis.localStorage) {
	96	  // returns { get, set, reset, all }
	97	}
	98	```
	99	
	100	### `createPreferences(storage?)`
	101	
	102	Factory returning a preferences instance. `storage` is any object implementing
	103	the `getItem(key)` / `setItem(key, value)` / `removeItem(key)` subset of the Web
	104	Storage API. Defaults to `globalThis.localStorage`.
	105	
	106	If no usable storage is available — `globalThis.localStorage` is absent, or
	107	touching it throws, as in some privacy modes — the instance falls back to an
	108	in-memory object with the same interface. Preferences then work normally for the
	109	lifetime of the page and simply do not persist. Callers never have to
	110	special-case this.
	111	
	112	### `get(key)`
	113	
	114	Returns the stored value for `key` if one is present and passes its validator,
	115	otherwise the schema default. Never returns `undefined` for a valid key.
	116	
	117	### `set(key, value)`
	118	
	119	Validates and persists. Returns `true` when the value was written, `false` when
	120	the write was rejected by the storage backend.
	121	
	122	### `reset(key?)`
	123	
	124	With a key, removes that preference so subsequent reads return its default.
	125	With no argument, clears the entire store.
	126	
	127	### `all()`
	128	
	129	Returns a plain object containing every schema key mapped to its effective
	130	value — stored-and-valid, or default. Useful for applying all preferences at
	131	page load in one pass.
	132	
	133	## Error handling
	134	
	135	The governing rule: **bad data degrades to defaults; bad code throws.**
	136	
	137	Stored data is untrusted. It can be edited by hand, left over from an older
	138	version of the app, or corrupted. None of those may break the page.
	139	
	140	| Situation | Behavior |
	141	|---|---|
	142	| Stored JSON fails to parse | Entire store treated as empty; all keys return defaults |
	143	| Stored value fails its validator | That key returns its default; sibling keys are unaffected |
	144	| Stored data contains an unknown key | Ignored on read; dropped on the next write |
	145	| `get`, `set`, or `reset` called with a key not in `SCHEMA` | Throws `Error` |
	146	| `set` called with a value failing its validator | Throws `Error` |
	147	| `storage.setItem` throws (quota exceeded, private mode) | Caught; `set` returns `false` |
	148	| `storage.getItem` throws | Caught; treated as an empty store |
	149	
	150	The distinction is deliberate. A key or value the *programmer* supplied wrongly
	151	is a defect that should surface loudly at development time. A value that
	152	*storage* supplied wrongly is an expected runtime condition and must degrade
	153	silently to a working default.
	154	
	155	A preferences failure must never prevent the user from logging in.
	156	
	157	## UI wiring
	158	
	159	Without a caller the module is unobservable, so the login form uses it.
	160	
	161	### `index.html`
	162	
	163	- Add a **"Remember me"** checkbox (`#remember-me`) inside the login form.
	164	- Add a **theme toggle** button (`#theme-toggle`) outside the form.
	165	- Add a small `<style>` block defining the default appearance and a
	166	  `[data-theme="dark"]` rule, so the toggle produces a visible change.
	167	- Change `<script src="app.js">` to `<script type="module" src="app.js">`.
	168	
	169	### `app.js`
	170	
	171	On page load:
	172	
	173	1. Create the preferences instance.
	174	2. Read `theme` and set it as `data-theme` on the `<html>` element.
	175	3. Read `rememberedUsername`; if non-empty, pre-fill `#username` and check
	176	   `#remember-me`.
	177	
	178	On theme toggle click: flip between `light` and `dark`, apply it to
	179	`<html data-theme>`, and persist immediately.
	180	
	181	On successful login — meaning the existing `login()` stub returned
	182	`{ success: true }` — store the username if "Remember me" is checked, and
	183	`reset("rememberedUsername")` if it is not.
	184	
	185	### Security constraint
	186	
	187	**The password is never stored, persisted, or passed to the preferences
	188	module.** Only the username is remembered. This is a hard constraint on the
	189	implementation, not a preference.
	190	
	191	## Testing
	192	
	193	Add to `package.json`:
	194	
	195	```json
	196	"scripts": { "test": "node --test" }
	197	```
	198	
	199	`test/preferences.test.mjs` exercises the module against a Map-backed fake
	200	storage object implementing `getItem` / `setItem` / `removeItem`. No browser and
	201	no dependencies required.
	202	
	203	Cases:
	204	
	205	1. An empty store returns the schema default for every key.
	206	2. `set` then `get` round-trips a valid value.
	207	3. A value persists across a fresh `createPreferences` over the same storage —
	208	   this is the "survives a session" property.
	209	4. Corrupt JSON in storage returns defaults for every key rather than throwing.
	210	5. A single invalid stored value falls back to its default while a valid sibling
	211	   key still returns its stored value.
	212	6. `get` and `set` with a key absent from `SCHEMA` throw.
	213	7. `set` with a value failing its validator throws, and does not modify the
	214	   store.
	215	8. A `setItem` that throws causes `set` to return `false` rather than
	216	   propagating.
	217	9. `reset(key)` restores that key's default; `reset()` clears everything.
	218	10. With no storage available, the in-memory fallback supports get/set for the
	219	    life of the instance.
	220	
	221	## Consequences and risks
	222	
	223	- `localStorage` is origin-scoped and per-browser. Preferences do not follow a
	224	  user across devices or browsers. This is understood and accepted; cross-device
	225	  sync would require a server and is out of scope.
	226	- A remembered username is mildly sensitive: anyone with access to the browser
	227	  profile can read it. This is the standard, expected behavior of a "Remember
	228	  me" checkbox, and it is opt-in via an unchecked-by-default box.
	229	- Adding a preference later means editing `SCHEMA`. That is the intended cost of
	230	  the fixed-schema decision.
	231	- Switching `app.js` to a module script makes it load deferred rather than
	232	  synchronously. The existing code already attaches its submit handler after the
	233	  form element is parsed, so behavior is unchanged, but the implementation
	234	  should confirm the handler still binds.
	235	
	236	## Assumptions
	237	
	238	- Assumption: the login form is the only surface that needs preferences in the
	239	  foreseeable term; validate by revisiting if a second consumer appears.
	240	- Assumption: `light` and `dark` are the only themes needed; validate by
	241	  extending the `theme` validator if a third is requested.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T013101Z-e78b/home/.cache/hyperpowers/codex-review/50b054766cde661a3823b800eb24e24a31eadd76/run-mT6XnhNL/approved-design-context.md

	1	# Approved design context — user preferences storage
	2	
	3	## Original user request
	4	
	5	> Add user preferences storage so settings persist across sessions.
	6	
	7	## Repository state before this work
	8	
	9	- `index.html` + `app.js` — a vanilla-JS browser login form, no build step, no framework.
	10	- `src/index.js` + `src/utils.js` — a separate CommonJS Node module that prints a greeting.
	11	- `package.json` — no dependencies, no scripts, no test runner, no linter.
	12	- No persistence, settings, or preferences code of any kind exists.
	13	
	14	## Decisions the user explicitly approved during brainstorming
	15	
	16	1. **Surface: browser, backed by `localStorage`.** Chosen over a Node/JSON-file
	17	   implementation and over a both-surfaces shared-core implementation. Rationale
	18	   accepted: the login form is the only interactive surface; the Node `src/`
	19	   module is a greeting stub with no settings.
	20	
	21	2. **Fixed schema with typed defaults and validation**, seeded with
	22	   `rememberedUsername` and `theme`. Chosen over a `rememberedUsername`-only
	23	   scope and over a generic key-value store. Rationale accepted: retrofitting
	24	   validation onto data already in users' browsers is expensive, so the schema
	25	   exists from the first commit.
	26	
	27	3. **Tooling: Node's built-in `node:test` runner with an injected storage
	28	   backend, zero new dependencies.** Chosen over adding Biome and over no
	29	   tooling at all. Rationale accepted: the injection seam is what makes browser
	30	   storage code testable under Node and is worth having regardless.
	31	
	32	4. The user reviewed a five-section design in chat covering module/format, API
	33	   and schema, error handling, UI wiring, and testing, and approved it verbatim
	34	   with "looks good, go ahead". The spec under review is the written form of
	35	   that approved design.
	36	
	37	## Constraints carried from user/project instructions
	38	
	39	- Focused, minimal changes; do not refactor unrelated code.
	40	- The `src/` CommonJS module is out of scope and must not be disturbed.
	41	- No new dependencies.
	42	- The password must never be stored or persisted.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
