# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260926T081704Z-13a3/coding-agent-workdir/docs/hyperpowers/specs/2026-09-26-user-preferences-storage-design.md

	1	# User Preferences Storage — Design
	2	
	3	Date: 2026-09-26
	4	Status: approved in brainstorming; not yet planned
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The application has no way to remember anything between visits. There is no
	10	settings state, no storage layer, and no persistence code of any kind. The
	11	request is to add user preferences storage so settings persist across
	12	sessions.
	13	
	14	Because the repository contains no existing preferences flow, this is new
	15	structure rather than a change to existing behavior: a storage module, its
	16	tests, and a first consumer.
	17	
	18	## Decisions
	19	
	20	These were settled during brainstorming and are inputs to the design, not
	21	open questions.
	22	
	23	| Decision | Choice |
	24	|---|---|
	25	| What is stored | A generic key-value store. No fixed set of keys defined up front. |
	26	| Where it is stored | Browser `localStorage`, client-only. Per-device; no backend. |
	27	| Module system | ES modules. |
	28	| Storage layout | One `localStorage` entry per preference. |
	29	| Integration scope | The module, its tests, and one demo preference (dark-mode toggle). |
	30	| Test tooling | Node's built-in runner (`node --test`). No new dependencies. |
	31	
	32	Cross-device synchronization is explicitly out of scope. The application has
	33	no backend — `login()` in `app.js` is a stub that never contacts
	34	`API_ENDPOINT` — so server-backed preferences would require building an API,
	35	a datastore, and auth-scoped reads first. If cross-device persistence becomes
	36	a requirement, this design is superseded rather than extended.
	37	
	38	## Architecture
	39	
	40	One new module, `prefs.js`, at the repository root alongside `app.js`.
	41	
	42	Browser code lives at the root in this repository; `src/` holds a separate,
	43	unrelated CommonJS Node program (`src/index.js`, `src/utils.js`) that nothing
	44	in the browser code references. The two are not mixed.
	45	
	46	```
	47	index.html  --(type="module")-->  app.js  --(import)-->  prefs.js  --> localStorage
	48	```
	49	
	50	`prefs.js` has no dependencies and no knowledge of the DOM. `app.js` owns all
	51	DOM interaction. This boundary is what makes `prefs.js` testable in plain
	52	Node with no browser and no DOM shim.
	53	
	54	## Public interface
	55	
	56	```js
	57	export function createPreferences({ storage = globalThis.localStorage,
	58	                                    namespace = "prefs" } = {}) { … }
	59	
	60	export const preferences = createPreferences();
	61	```
	62	
	63	The factory exists so tests can inject a fake `storage`. Application code
	64	imports the `preferences` instance and does not call the factory.
	65	
	66	| Member | Signature | Behavior |
	67	|---|---|---|
	68	| `get` | `get(key, fallback)` | Returns the stored value. Returns `fallback` (default `undefined`) when the key is unset or unreadable. Never throws. |
	69	| `set` | `set(key, value) -> boolean` | Stores the value. Returns `true` when durably written, `false` when only held in memory. Never throws. |
	70	| `remove` | `remove(key) -> void` | Deletes the key from both durable storage and the in-memory overlay. No-op when absent. |
	71	| `keys` | `keys() -> string[]` | Preference names currently stored, with the namespace prefix stripped. Order is unspecified. |
	72	| `isPersistent` | boolean property | `false` when the instance fell back to in-memory storage at construction. |
	73	
	74	Defaults are supplied per call site via `get`'s `fallback` argument. There is
	75	no central registry of keys and no registration step; that would contradict
	76	the generic key-value decision.
	77	
	78	### Deliberately excluded
	79	
	80	- **Change notification** (`subscribe`, `storage`-event fan-out). Reads pass
	81	  straight through to `localStorage`, so no cached state can go stale and
	82	  nothing needs invalidating. Add it when a consumer needs to react to a
	83	  change it did not make.
	84	- **`clear()`**. Expressible as `keys().forEach(remove)`.
	85	- **A defaults registry and schema-migration hook.** Machinery for a schema
	86	  change that has not happened, and in tension with having no fixed key set.
	87	- **Custom type tagging** to preserve `Date` and similar. See Serialization.
	88	
	89	## Storage layout
	90	
	91	Each preference is one `localStorage` entry keyed `` `${namespace}:${key}` ``
	92	— by default `prefs:theme`, `prefs:fontSize`, and so on.
	93	
	94	`keys()` enumerates `localStorage` by index, keeps entries whose name starts
	95	with `` `${namespace}:` ``, and strips that prefix. Keys containing further
	96	colons round-trip correctly because only the leading prefix is removed.
	97	
	98	Rationale for one entry per preference rather than a single JSON document:
	99	
	100	- Two tabs writing different preferences cannot clobber each other. A single
	101	  shared document requires read-modify-write, where the second writer
	102	  silently discards the first writer's change.
	103	- A corrupt or truncated entry costs one preference, not all of them.
	104	- The layout mirrors the key-value API one-to-one.
	105	
	106	The accepted costs: enumeration is a prefix scan rather than a single read,
	107	there is no atomic multi-key write, and there is no single place to stamp a
	108	schema version. If the stored shape ever must change, the namespace is bumped
	109	(`prefs.v2`) and old entries are ignored.
	110	
	111	## Serialization
	112	
	113	Values are written with `JSON.stringify` and read with `JSON.parse`.
	114	
	115	**Contract: values are JSON. What comes back is what JSON can represent, not
	116	necessarily the object that went in.** A `Date` returns as an ISO string.
	117	`NaN` and `Infinity` return as `null`. This limit is documented rather than
	118	worked around; custom type tagging would add a serialization format that
	119	becomes load-bearing and then subtly wrong.
	120	
	121	Supported without surprise: `null`, booleans, finite numbers, strings, and
	122	plain arrays and objects composed of those.
	123	
	124	Two write cases need explicit handling:
	125	
	126	- **`set(key, undefined)`**, and equally a function or a symbol value:
	127	  `JSON.stringify` produces no string for these. Treated as `remove(key)`,
	128	  returning `true`. Writing the literal text `undefined` and returning it
	129	  forever as a string would be worse.
	130	- **Cyclic objects and `BigInt`**: `JSON.stringify` throws. `set` catches,
	131	  writes nothing, and returns `false`. A bad value from one caller never
	132	  corrupts the store and never escapes as an exception into an event handler.
	133	
	134	**Corrupt reads.** When `JSON.parse` throws — a hand-edited entry, a write
	135	truncated by a crash — `get` returns the fallback and leaves the entry in
	136	place. It does not delete it. A read path that destroys data is a worse
	137	surprise than one that returns a default, and preserving the value keeps it
	138	available for diagnosis.
	139	
	140	## Failure behavior
	141	
	142	`localStorage` fails in two distinct ways, both handled.
	143	
	144	**Unavailable at construction** — Safari private browsing, blocked site data,
	145	`file://` sandboxing, or `storage` missing entirely. The factory probes once
	146	by writing and removing a namespaced probe key inside a `try`. On failure the
	147	instance routes every operation to an in-memory `Map` and sets
	148	`isPersistent = false`. The application keeps working; preferences simply do
	149	not outlive the tab.
	150	
	151	**Failing later** — quota exhaustion strikes a particular `set` long after a
	152	successful probe. That `set` catches the throw, records the value in an
	153	in-memory overlay, and returns `false`.
	154	
	155	`get` consults the overlay before `localStorage`, so a value whose durable
	156	write failed is never shadowed by a stale persisted value underneath it.
	157	`remove` clears both. This keeps reads consistent within the session even
	158	when the store is partially durable.
	159	
	160	Consequently `set`'s boolean return is meaningful in both modes, and
	161	`isPersistent` lets a caller warn up front that settings will not be saved.
	162	
	163	## Security boundary
	164	
	165	`localStorage` is readable by any script running on the page and by anyone
	166	with access to the machine. It is not a secret store, and nothing in this
	167	design changes that.
	168	
	169	The protection is scope, not obfuscation:
	170	
	171	- The login form stays unwired from this module.
	172	- No username, password, token, session identifier, or "stay signed in" flag
	173	  is stored through it. No such feature is being added.
	174	- `prefs.js` carries a header comment stating this contract.
	175	
	176	Key-name filtering (rejecting keys named `password` and similar) is
	177	deliberately **not** implemented. It would not catch the names a real mistake
	178	would use, and its main effect would be to make the store feel safer than it
	179	is.
	180	
	181	## Integration
	182	
	183	**`index.html`** — `<script src="app.js">` becomes
	184	`<script type="module" src="app.js">`.
	185	
	186	Consequence: module scripts require an `http://` origin, so opening
	187	`index.html` directly from the filesystem stops working. Local development
	188	uses a static server, for example `python3 -m http.server` from the
	189	repository root. This is a real regression in how the page is opened and is
	190	accepted knowingly.
	191	
	192	A checkbox control and label for the dark-mode toggle are added to the body.
	193	
	194	**`app.js`** — imports `{ preferences }` from `./prefs.js`. On load it reads
	195	`preferences.get("theme", "light")`, applies it to the document, and reflects
	196	it in the checkbox. On change it applies the new theme and calls
	197	`preferences.set("theme", …)`. Existing login behavior is unchanged.
	198	
	199	Module scripts are deferred, so the existing top-level
	200	`document.getElementById("login-form")` lookup still resolves; it currently
	201	works only because the script tag sits at the end of `<body>`.
	202	
	203	**`package.json`** — gains `"type": "module"` and a `"test": "node --test"`
	204	script.
	205	
	206	`"type": "module"` is package-wide and would break the CommonJS `require` in
	207	`src/`. To contain it, a new one-line `src/package.json` containing
	208	`{"type": "commonjs"}` pins that directory to its current semantics.
	209	`src/index.js` and `src/utils.js` are not edited. Adding a preferences module
	210	must not turn into rewriting an unrelated program.
	211	
	212	The demo preference exists so that "persists across sessions" is verifiable
	213	by a human reloading the page, rather than only by tests.
	214	
	215	## Testing
	216	
	217	Node's built-in runner: `node --test`, no packages added. Requires Node 18 or
	218	newer.
	219	
	220	Assumption: the development environment runs Node 18+; validate by running
	221	`node --version` before implementation begins, and fall back to a minimal
	222	hand-rolled assertion script if it does not hold.
	223	
	224	Tests construct instances via `createPreferences({ storage: fakeStorage })`,
	225	where `fakeStorage` is a small object implementing `getItem`, `setItem`,
	226	`removeItem`, `key`, and `length` over a `Map` — and able to throw on demand.
	227	No browser and no DOM shim.
	228	
	229	Coverage:
	230	
	231	1. Round trip for each supported type: string, finite number, boolean,
	232	   `null`, array, plain object.
	233	2. `get` on an unset key returns the fallback, and `undefined` when no
	234	   fallback is given.
	235	3. Namespacing: the underlying storage key is `prefs:<name>`; `keys()`
	236	   returns unprefixed names and ignores unrelated entries in the same
	237	   storage.
	238	4. `set(key, undefined)` removes the key and returns `true`.
	239	5. A cyclic value leaves the store unchanged and returns `false`.
	240	6. `NaN` reads back as `null` — asserting the documented contract, not
	241	   pretending otherwise.
	242	7. A corrupt stored value makes `get` return the fallback and leaves the
	243	   entry present.
	244	8. A storage that throws on the construction probe yields
	245	   `isPersistent === false`, and get/set still work in memory.
	246	9. A storage that throws only on a later `setItem` makes that `set` return
	247	   `false`, and the subsequent `get` returns the overlay value rather than
	248	   the stale persisted one.
	249	10. `remove` clears both the durable entry and the overlay.
	250	
	251	Manual verification for the integration: serve the directory, toggle dark
	252	mode, reload, confirm the setting survives; then restart the browser and
	253	confirm it survives that too.
	254	
	255	## Files touched
	256	
	257	| File | Change |
	258	|---|---|
	259	| `prefs.js` | New. The preferences module. |
	260	| `test/prefs.test.js` | New. The test suite. |
	261	| `src/package.json` | New. One line, pins `src/` to CommonJS. |
	262	| `package.json` | Add `"type": "module"` and a `test` script. |
	263	| `index.html` | `type="module"`; add the toggle control. |
	264	| `app.js` | Import and apply the theme preference. |
	265	| `src/index.js`, `src/utils.js` | Not edited. |
	266	
	267	## Out of scope
	268	
	269	- Cross-device or server-backed preferences.
	270	- Any credential, token, or "remember me" persistence.
	271	- Linting and formatting tooling; end-to-end and fuzz testing.
	272	- A bundler.
	273	- Change-notification APIs and cross-tab live updates.
	274	- Refactoring the unrelated `src/` Node program.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260926T081704Z-13a3/home/.cache/hyperpowers/codex-review/9fcff1ee84c6cbea07fa9fc4c1034ee551110cd5/run-WgE7JybX/adjudications.md

	1	# Approved design decisions (brainstorming record)
	2	
	3	## Original request (verbatim)
	4	
	5	> Add user preferences storage so settings persist across sessions.
	6	
	7	## Decisions the human partner made explicitly
	8	
	9	1. **What is stored** — a generic key-value store; no fixed set of keys
	10	   defined up front. Rejected: UI/display settings only; UI settings plus
	11	   login-convenience items.
	12	2. **Where** — browser `localStorage`, client-only. Rejected: a sync-ready
	13	   boundary for a future remote backend; server-backed per-user storage.
	14	3. **Module system** — ES modules. Rejected: plain script exposing a global;
	15	   adding a bundler.
	16	4. **Storage layout** — one `localStorage` entry per preference. Rejected: a
	17	   single JSON document under one key; a versioned document plus a defaults
	18	   registry and migration hook.
	19	5. **Integration scope** — the module, its tests, and one demo preference (a
	20	   dark-mode toggle) so persistence is verifiable by reloading the page.
	21	   Rejected: module and tests only, with no consumer.
	22	6. **Test tooling** — Node's built-in `node --test`; no dependencies added.
	23	   Rejected: also adding ESLint and Prettier; shipping without tests.
	24	
	25	## Design sections approved in chat
	26	
	27	- **Section 1, public interface** — approved. The `createPreferences` factory
	28	  plus a `preferences` singleton; `get`/`set`/`remove`/`keys`/`isPersistent`.
	29	  Defaults come from `get`'s `fallback` argument rather than a registry.
	30	  Change notification, `clear()`, and a defaults registry were deliberately
	31	  excluded as speculative.
	32	- **Section 2, storage and failure behavior** — approved. Namespaced
	33	  per-preference keys; JSON serialization with a documented "you get JSON
	34	  back, not your object" contract; `undefined` treated as removal; cyclic and
	35	  `BigInt` values rejected with `false`; corrupt reads return the fallback
	36	  without deleting the entry; construction-time availability probe with an
	37	  in-memory fallback; mid-session quota failure handled by an in-memory
	38	  overlay that `get` consults first.
	39	- **Section 3, integration and testing** — approved. `index.html` switches to
	40	  `type="module"` (accepted regression: `file://` opening no longer works);
	41	  root `package.json` gains `"type": "module"` with a new one-line
	42	  `src/package.json` pinning the unrelated CommonJS program to
	43	  `"type": "commonjs"`; `node --test` with an injected fake storage.
	44	
	45	## Standing constraints stated during brainstorming
	46	
	47	- Cross-device synchronization is out of scope; there is no backend
	48	  (`login()` in `app.js` is a stub that never calls `API_ENDPOINT`).
	49	- No credential, token, username, or "stay signed in" value may be persisted
	50	  through this store. The login form stays unwired from it.
	51	- Credential-name blocklisting was considered and deliberately rejected as
	52	  security theatre; the protection is scope plus a documented contract.
	53	- The unrelated CommonJS program in `src/` must not be edited.
	54	
	55	## Codex approach gate
	56	
	57	Fired and ran; the one-shot call returned an empty response, so no
	58	independent Codex approaches were folded in. Not retried, per the gate's
	59	one-shot rule.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
