# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T103715Z-60c9/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-user-preferences-storage-design.md

	1	# User Preferences Storage — Design
	2	
	3	Date: 2026-09-17
	4	Status: Approved for planning
	5	
	6	## Problem
	7	
	8	The webapp has no persistence of any kind. `index.html` renders a login form,
	9	`app.js` handles submit against a stubbed `login()`, and nothing the user does
	10	survives a reload. There is no settings flow to extend and no storage layer to
	11	build on, so preference storage arrives as a new subsystem rather than a change
	12	to an existing one.
	13	
	14	The goal is a preferences layer that persists across sessions, plus one real
	15	preference wired end to end so the layer is exercised by the running page
	16	instead of sitting unused.
	17	
	18	## Scope
	19	
	20	In scope:
	21	
	22	- A `PreferencesStore` module owning all preference reads and writes.
	23	- One preference, `rememberUsername`, wired through the login form.
	24	- Unit tests for the store.
	25	
	26	Out of scope:
	27	
	28	- A settings panel or any additional preferences.
	29	- Server-side persistence, authentication, and session tokens.
	30	- Changes to `src/index.js` and `src/utils.js`, which are unrelated CommonJS
	31	  fixture code the page never loads.
	32	
	33	## Global Constraints
	34	
	35	These decisions were made during brainstorming and bind every task in the
	36	implementation plan:
	37	
	38	- **Storage backend:** browser `localStorage`, accessed only through the
	39	  `PreferencesStore` seam. No call site touches `localStorage` directly.
	40	- **Module format:** ES modules. `index.html` loads `app.js` with
	41	  `<script type="module">`.
	42	- **File extension:** new modules use `.mjs`. Adding `"type": "module"` to
	43	  `package.json` would break the `require()` calls in `src/utils.js` and
	44	  `src/index.js`; those files stay untouched.
	45	- **Test runner:** Node's built-in `node --test`. Zero new dependencies —
	46	  the project has none today and gains none here.
	47	- **Development approach:** test-driven. Store tests are written before the
	48	  store implementation.
	49	- **No linter or formatter** is being introduced as part of this work.
	50	
	51	## Architecture
	52	
	53	One new module, `preferences.mjs`, exporting a factory:
	54	
	55	```js
	56	createPreferencesStore(backend = globalThis.localStorage) -> PreferencesStore
	57	```
	58	
	59	The injected `backend` is the single seam. It serves two purposes at once: in
	60	tests it is an in-memory fake or a deliberately throwing stub, and in a future
	61	where preferences move server-side it is the swap point. Nothing else in the
	62	codebase knows where preferences live.
	63	
	64	Note that resolving the default argument *itself* reads `globalThis.localStorage`,
	65	and that read is one of the accesses that can throw (see Error Handling). The
	66	factory must therefore resolve and probe its backend inside a `try`, not rely on
	67	the default-parameter expression alone.
	68	
	69	### Interface
	70	
	71	```
	72	load()        -> Promise<Preferences>
	73	save(partial) -> Promise<Preferences>
	74	clear()       -> Promise<void>
	75	```
	76	
	77	The interface is asynchronous even though `localStorage` is synchronous. A
	78	server-backed implementation is inherently async, and a synchronous interface
	79	would force a signature change at every call site on that migration — the
	80	migration the seam exists to absorb. The cost today is two `await`s in
	81	`app.js`.
	82	
	83	`save()` takes a partial object and merges it into the stored preferences
	84	rather than replacing them, so a caller updating one preference cannot
	85	accidentally erase another. It resolves to the resulting full preferences
	86	object.
	87	
	88	## Data Model
	89	
	90	A single `localStorage` key holds the entire preference set as JSON:
	91	
	92	- Key: `webapp.preferences.v1`
	93	- Value: `{"rememberUsername": true, "lastUsername": "alice"}`
	94	
	95	One key rather than a key per preference: reads and writes stay atomic, and
	96	there is one place to version. The `v1` suffix reserves a migration path — if
	97	the shape ever changes incompatibly, a `v2` key plus a one-time migration is
	98	the mechanism. No migration code is written now.
	99	
	100	Defaults live in a frozen module-level object:
	101	
	102	```js
	103	const DEFAULTS = Object.freeze({
	104	  rememberUsername: false,
	105	  lastUsername: "",
	106	});
	107	```
	108	
	109	`load()` returns `DEFAULTS` merged with whatever was stored. Keys present in
	110	storage but absent from `DEFAULTS` are ignored, so a build reading a blob
	111	written by a newer build degrades quietly instead of leaking unknown fields
	112	into application code.
	113	
	114	## Feature Wiring
	115	
	116	`index.html` gains a "Remember me" checkbox (`#remember-me`) inside the login
	117	form. Without it the preference has no way to be set, and the storage layer
	118	would have no genuine consumer.
	119	
	120	On page load, `app.js` calls `load()`. If `rememberUsername` is true and
	121	`lastUsername` is non-empty, it prefills `#username` and checks `#remember-me`.
	122	
	123	On form submit, `app.js` saves only when `validateForm()` passes and `login()`
	124	returns `success: true` — a failed validation leaves stored preferences
	125	untouched. (`login()` is a stub that always succeeds today; the check is written
	126	against its contract, not its current body.) The save call carries the checkbox
	127	state:
	128	
	129	- Checked: `{rememberUsername: true, lastUsername: <username>}`
	130	- Unchecked: `{rememberUsername: false, lastUsername: ""}`
	131	
	132	Unchecking therefore clears the stored username rather than leaving a stale
	133	value behind.
	134	
	135	**The password is never written to storage.** A test asserts the serialized
	136	blob contains no password field.
	137	
	138	## Error Handling
	139	
	140	Preference storage is best-effort. A storage failure must never break login.
	141	
	142	- **Storage unavailable.** Accessing `localStorage` can throw outright — not
	143	  merely return `null` — under private browsing, disabled cookies, or a
	144	  sandboxed iframe. The store catches this and falls back to an in-memory
	145	  backend for the remainder of the session. The app continues with defaults;
	146	  preferences simply do not persist.
	147	- **Corrupt stored JSON.** `load()` catches the parse error and returns
	148	  defaults. The unparseable value is left in place rather than eagerly
	149	  deleted; the next `save()` overwrites it.
	150	- **Quota exceeded on write.** `save()` catches, logs a warning via
	151	  `console.warn`, and resolves normally. It does not reject, because a
	152	  rejected preference save inside the submit handler would surface as a broken
	153	  login.
	154	- **Nothing throws out of the public interface.** `load`, `save`, and `clear`
	155	  always resolve.
	156	
	157	## Testing
	158	
	159	Tests live in `test/preferences.test.mjs` and run via a new `package.json`
	160	script, `"test": "node --test"`.
	161	
	162	Cases:
	163	
	164	1. Empty storage yields the defaults.
	165	2. `save()` then `load()` round-trips a value.
	166	3. A partial `save()` merges and does not drop other stored preferences.
	167	4. Corrupt JSON in storage yields the defaults.
	168	5. A backend that throws on read yields defaults without crashing.
	169	6. A backend that throws on write does not propagate the error.
	170	7. `clear()` removes stored values and returns to defaults.
	171	8. Unknown keys in the stored blob are ignored.
	172	9. The serialized blob never contains a password field.
	173	
	174	### Known testing gap
	175	
	176	The `app.js` wiring — prefill on load, save on submit — is not unit tested.
	177	`app.js` touches the DOM at import time, so covering it requires a browser or
	178	a DOM library, and adding jsdom is out of proportion to one checkbox. That
	179	wiring is verified by loading the page manually, and the verification result
	180	is reported explicitly rather than implied by the store's passing tests.
	181	
	182	Because the page uses ES modules, it must be served over HTTP; `file://`
	183	blocks module loading. Manual verification uses a static server such as
	184	`npx serve`.
	185	
	186	## Files
	187	
	188	New:
	189	
	190	- `preferences.mjs` — defaults, `createPreferencesStore`, error handling
	191	- `test/preferences.test.mjs` — store unit tests
	192	
	193	Modified:
	194	
	195	- `app.js` — import the store, prefill on load, save on submit
	196	- `index.html` — `<script type="module">`, "Remember me" checkbox
	197	- `package.json` — `"scripts": {"test": "node --test"}`
	198	
	199	Untouched:
	200	
	201	- `src/index.js`, `src/utils.js` — unrelated CommonJS fixture code
	202	
	203	## Risks and Assumptions
	204	
	205	- **Assumption:** the page is served over HTTP during development and in any
	206	  real deployment. Validate via the manual verification step, which uses a
	207	  static server. If the page must remain openable from `file://`, the module
	208	  format decision has to be revisited before implementation.
	209	- Node availability for `node --test` is confirmed, not assumed: the host runs
	210	  Node v26.8.2.
	211	- Storing a username in `localStorage` is a deliberate, user-opted choice on a
	212	  shared-device threat model no worse than any "remember me" checkbox. No
	213	  credential is stored.


## Adjudicated decisions

NOT PROVIDED: flag not passed

## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
