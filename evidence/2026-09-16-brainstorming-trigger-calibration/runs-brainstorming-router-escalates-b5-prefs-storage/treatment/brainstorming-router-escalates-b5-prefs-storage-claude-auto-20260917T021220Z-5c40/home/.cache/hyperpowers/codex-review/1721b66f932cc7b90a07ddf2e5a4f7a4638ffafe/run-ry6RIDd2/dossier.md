# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T021220Z-5c40/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-user-preferences-storage-design.md

	1	# User Preferences Storage — Design
	2	
	3	Date: 2026-09-16
	4	Status: approved design, not yet implemented
	5	
	6	## Overview
	7	
	8	The app has no way to remember anything between visits. This design adds a
	9	single preferences module that any part of the app can read from and write to,
	10	backed by browser `localStorage`, and wires the login form to it as its first
	11	consumer: an opt-in "remember my username" checkbox that pre-fills the username
	12	field on return visits.
	13	
	14	The module — not the checkbox — is the deliverable. Additional settings and
	15	forms are expected to consume it, so the interface it exposes is the part that
	16	has to survive.
	17	
	18	## Goals
	19	
	20	- Preferences persist across browser sessions on the same device.
	21	- One shared mechanism usable from anywhere in the app, not logic bolted to the
	22	  login form.
	23	- Adding a preference later is a one-line change in one place.
	24	- A missing, corrupt, or unavailable store degrades to declared defaults and
	25	  never breaks the page.
	26	
	27	## Non-goals
	28	
	29	- Cross-device or cross-browser sync. Preferences are per-device.
	30	- Persisting credentials or session state. This is not "remember me"
	31	  authentication: no tokens, no password, no login persistence.
	32	- Server-side or user-keyed storage. `login()` is a stub that returns
	33	  `{success: true}` unconditionally, so there is no real user identity to key
	34	  on. The design leaves a seam for this (see Extension) but does not build it.
	35	- A build step, bundler, ES modules, or a framework.
	36	- Preferences for the `src/index.js` Node demo, which shares no code with the
	37	  web page.
	38	
	39	## Global constraints
	40	
	41	- **Zero runtime and development dependencies.** `package.json` currently has
	42	  none; the implementation keeps it that way.
	43	- **Unit tests via `node:test`**, the runner built into Node. A `test/`
	44	  directory with at least one passing fixture is part of the work. No lint,
	45	  format, or end-to-end tooling is being introduced (considered and declined).
	46	- **Classic scripts, plain globals.** `app.js` is loaded with a plain
	47	  `<script src>` tag and uses no module system. New browser code matches that.
	48	- Match the existing file style: two-space indent, double-quoted strings,
	49	  semicolons, as in `app.js`.
	50	
	51	## Architecture
	52	
	53	A new file, `preferences.js`, at the repository root alongside `app.js`. It is
	54	loaded in `index.html` **before** `app.js` and exposes one global, `Preferences`.
	55	
	56	Three internal pieces:
	57	
	58	1. **The schema registry** — a module-level table declaring every preference
	59	   once: its key, its default, and a validator.
	60	2. **The storage backend** — resolved once at load. Either real `localStorage`
	61	   or an in-memory `Map` fallback. All reads and writes go through it.
	62	3. **The public interface** — four functions over the first two.
	63	
	64	Nothing else in the app touches `localStorage` directly.
	65	
	66	### Schema registry
	67	
	68	```js
	69	const PREFERENCE_SCHEMA = {
	70	  rememberUsername: { default: false, validate: (v) => typeof v === "boolean" },
	71	  lastUsername:     { default: "",    validate: (v) => typeof v === "string" && v.length <= 256 },
	72	};
	73	```
	74	
	75	Defaults and validators live here and only here, so they cannot drift across
	76	call sites as more forms consume the module. Adding a preference means adding
	77	one entry.
	78	
	79	### Public interface
	80	
	81	- **`Preferences.get(key)`** — returns the stored value, or the declared default
	82	  when the entry is missing, unparseable, fails validation, carries an
	83	  unrecognized format version, or storage is unreadable. Never throws for a
	84	  known key.
	85	- **`Preferences.set(key, value)`** — validates `value` against the schema, then
	86	  writes. Returns `true` if the write landed, `false` if it did not persist
	87	  (for example, quota exhausted or the in-memory fallback is active). Returns
	88	  `false` without writing if validation fails.
	89	- **`Preferences.clear(key)`** — removes one preference, reverting it to its
	90	  default.
	91	- **`Preferences.clearAll()`** — removes every preference the module owns, by
	92	  iterating `PREFERENCE_SCHEMA`. It must **not** call `localStorage.clear()`,
	93	  which would destroy storage belonging to other code on the same origin.
	94	
	95	`get`, `set`, and `clear` throw a `TypeError` for a key absent from the schema.
	96	An unknown key is a programming error, not a runtime condition, and should fail
	97	loudly rather than silently returning `undefined`.
	98	
	99	### Stored format
	100	
	101	One `localStorage` entry per preference, keyed `app.pref.<key>` — for example
	102	`app.pref.rememberUsername`. Each entry holds:
	103	
	104	```json
	105	{"v": 1, "value": false}
	106	```
	107	
	108	`v` is the per-value format version. Nothing reads it beyond rejecting
	109	unrecognized versions today; it exists because code can be added later but data
	110	already sitting in users' browsers cannot be retroactively versioned. An entry
	111	whose `v` is not recognized is treated exactly like a corrupt entry: `get`
	112	returns the default.
	113	
	114	One key per preference, rather than a single combined document, so that two
	115	tabs writing different preferences do not clobber each other and a single
	116	corrupt entry costs one preference instead of all of them.
	117	
	118	## Failure behavior
	119	
	120	Storage is not always available. `localStorage` throws when storage is
	121	disabled, in some private-browsing modes, and when quota is exhausted; on some
	122	browsers merely accessing the `window.localStorage` property throws a
	123	`SecurityError`.
	124	
	125	At load, the module probes once inside a `try`/`catch`: write a sentinel key,
	126	read it back, remove it. If the probe succeeds, the backend is `localStorage`.
	127	If it throws or the value does not round-trip, the backend is an in-memory
	128	`Map`, which gives correct within-page behavior that simply does not survive a
	129	reload.
	130	
	131	Individual operations remain wrapped in `try`/`catch` regardless, because quota
	132	errors can appear mid-session on a store that probed fine.
	133	
	134	The governing rule: **a broken storage layer degrades to defaults and never
	135	breaks the page.** No exception from this module propagates into a form
	136	handler. A failed write surfaces as a `false` return value, not a throw.
	137	
	138	## Security and privacy
	139	
	140	- **The password is never stored, in any form.** Only `lastUsername`, and only
	141	  when the user has opted in.
	142	- **Stored values are untrusted input.** Any script on the origin, the devtools
	143	  console, or an XSS can write arbitrary content to `localStorage`. Values are
	144	  therefore validated on read against the schema, `lastUsername` is capped at
	145	  256 characters, and a restored value is only ever assigned to `input.value`
	146	  — never to `innerHTML` or any sink that could execute it. A tampered
	147	  preference cannot become script.
	148	- **`localStorage` is plaintext and readable by anyone with the device.** A
	149	  remembered username is a mild disclosure on a shared machine. This is what
	150	  makes the opt-in checkbox load-bearing rather than decorative, and why
	151	  unchecking it must actively erase the stored value rather than merely stop
	152	  writing new ones.
	153	
	154	## UI and consumer changes
	155	
	156	### `index.html`
	157	
	158	Add a labeled checkbox inside the existing form, after the password field:
	159	
	160	```html
	161	<label><input type="checkbox" id="remember-username" /> Remember my username</label>
	162	```
	163	
	164	Add `<script src="preferences.js"></script>` before the existing
	165	`<script src="app.js"></script>`.
	166	
	167	### `app.js`
	168	
	169	Two behaviors, both using only the `Preferences` interface:
	170	
	171	**On load** (inline at the end of the script, where the DOM is already parsed
	172	because the script tag sits at the end of `<body>`): if
	173	`Preferences.get("rememberUsername")` is true, check the box and set the
	174	username input's `value` to `Preferences.get("lastUsername")`.
	175	
	176	**On submit**, after `validateForm` passes and before the existing `login()`
	177	call: if the box is checked, `set("rememberUsername", true)` and
	178	`set("lastUsername", username)`; if it is not, `set("rememberUsername", false)`
	179	and `clear("lastUsername")`.
	180	
	181	**On checkbox change**, when the box transitions to unchecked: immediately
	182	`set("rememberUsername", false)` and `clear("lastUsername")`. Opting out takes
	183	effect when the user opts out, not at some later submit that may never happen.
	184	
	185	The existing `login()` and `validateForm()` functions are not modified.
	186	
	187	## Testing
	188	
	189	`node:test` with a `test/preferences.test.js` file, run via a `test` script in
	190	`package.json` (`node --test`).
	191	
	192	For the tests to reach `preferences.js` from Node, the file ends with a dual
	193	export guard: attach `Preferences` to `window` when `window` exists, and to
	194	`module.exports` when `module` exists. This is the only concession the browser
	195	code makes to testability, and it introduces no dependency.
	196	
	197	The storage backend is injectable for tests through a single exported hook,
	198	`Preferences._setBackendForTesting(backend)`, where `backend` implements
	199	`getItem`/`setItem`/`removeItem`. The underscore marks it internal; it is the
	200	only test-only surface. This lets the fallback and corrupt-data paths be driven
	201	without a browser.
	202	
	203	Cases to cover:
	204	
	205	- `get` returns the declared default when nothing is stored.
	206	- `set` then `get` round-trips each declared preference.
	207	- `set` rejects a value failing validation and leaves the stored value intact.
	208	- `set`/`get`/`clear` throw `TypeError` for an unknown key.
	209	- `get` returns the default for a corrupt entry (invalid JSON).
	210	- `get` returns the default for an entry with an unrecognized `v`.
	211	- `get` returns the default for a well-formed entry whose value fails
	212	  validation (the tampering case).
	213	- `clear` reverts one preference without disturbing others.
	214	- `clearAll` removes only `app.pref.*` keys and leaves unrelated keys untouched.
	215	- With the backend unavailable, `get` returns defaults and `set` returns
	216	  `false` without throwing.
	217	
	218	The login-form wiring in `app.js` is DOM-coupled and is not unit tested; no
	219	end-to-end tooling is being introduced. It is verified manually by loading
	220	`index.html`, checking the box, submitting, reloading, and confirming the
	221	username is pre-filled — then unchecking and confirming it is gone after a
	222	reload.
	223	
	224	Assumption: the reviewer has a browser available for that manual check;
	225	validate via running it once at implementation time and reporting the result.
	226	
	227	## Extension
	228	
	229	**Adding a preference:** one entry in `PREFERENCE_SCHEMA`, then call
	230	`Preferences.get`/`set` from the consuming form. No other file changes.
	231	
	232	**Changing a stored shape:** bump `v` for that preference and have `get`
	233	translate recognized older versions instead of discarding them.
	234	
	235	**Moving to a user-keyed remote store:** the storage backend is the seam. A
	236	backend that reads and writes through an API replaces the `localStorage` one
	237	without the public interface or any consumer changing. This is explicitly not
	238	built now — `login()` is a stub with no real identity behind it.
	239	
	240	## Rejected alternatives
	241	
	242	- **Single versioned JSON document** (all preferences under one key). Cleanest
	243	  migration story and trivial export/import, but every write rewrites every
	244	  preference, so a stale tab can silently clobber another tab's change, and one
	245	  malformed blob loses every setting at once.
	246	- **Thin key/value wrapper with call-site defaults and no schema.** The least
	247	  code, and the right answer if this stayed one preference forever. Rejected
	248	  because more settings and forms are expected: call-site defaults duplicate and
	249	  drift, nothing validates data coming back out of storage, and without a
	250	  version marker old and new data become indistinguishable.
	251	- **Node-side file store** and **user-keyed backend store**, both declined
	252	  during the clarifying questions — the first solves a problem the login page
	253	  does not have, the second requires a backend and a real user identity that do
	254	  not exist.
	255	
	256	## Notes
	257	
	258	An independent Codex approach consultation was attempted for this design and
	259	returned an empty response. The approaches above are unreviewed by Codex.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T021220Z-5c40/home/.cache/hyperpowers/codex-review/1721b66f932cc7b90a07ddf2e5a4f7a4638ffafe/run-ry6RIDd2/adjudications.md

	1	# Approved design context — user preferences storage
	2	
	3	## Original user requirement (verbatim)
	4	
	5	> Add user preferences storage so settings persist across sessions.
	6	
	7	## Decisions the user made during brainstorming
	8	
	9	**D1 — Storage surface.** Offered: browser `localStorage`; Node-side file
	10	store; user-keyed backend store; both via adapters. User chose browser
	11	`localStorage` behind a small module interface, adding: "It should work across
	12	the whole app, and other settings/forms will need it later."
	13	*Consequence:* per-device persistence; a reusable module is required, not
	14	login-form-local logic; extensibility for future settings is a first-class
	15	requirement.
	16	
	17	**D2 — First consumer.** Offered: remember username; theme light/dark; module
	18	only with no consumer; assistant picks. User chose **remember username** —
	19	pre-fill the username field on return visits behind an opt-in checkbox,
	20	username only, never the password.
	21	
	22	**D3 — Data model.** Offered three approaches:
	23	- A: schema registry, one namespaced `localStorage` key per preference,
	24	  per-value version marker.
	25	- B: single versioned JSON document holding all preferences.
	26	- C: thin key/value wrapper, call-site defaults, no schema or versioning.
	27	User chose **A**. Rationale presented and accepted: centralized defaults that
	28	cannot drift as forms multiply; per-key writes avoid cross-tab clobber; a
	29	corrupt entry costs one preference rather than all. The per-value version
	30	marker was explicitly retained as the one deliberate piece of not-yet-needed
	31	machinery, on the grounds that data already in users' browsers cannot be
	32	retroactively versioned.
	33	
	34	**D4 — Interface approval.** The user reviewed and approved the module
	35	interface section as presented: a single `Preferences` global exposing
	36	`get`/`set`/`clear`/`clearAll`, loaded as a classic script before `app.js`.
	37	Their words: "Yes, that interface looks right."
	38	
	39	**D5 — Tooling.** Offered: `node:test` unit tests; ESLint + Prettier;
	40	end-to-end tests; none. User chose **unit tests via `node:test` only**.
	41	*Consequence:* the repo stays dependency-free; no lint, format, or e2e tooling
	42	is in scope. Declining lint/format and e2e was the user's explicit choice, not
	43	an omission.
	44	
	45	## Notes for the reviewer
	46	
	47	- The Codex approach gate was attempted before this spec was written and
	48	  returned an empty response, so no independent Codex approaches informed the
	49	  design. This spec review is Codex's first look at the work.
	50	- Non-goals in the spec (cross-device sync, credential persistence,
	51	  server-side storage, build tooling, Node-half preferences) are deliberate
	52	  scope decisions traceable to D1, D2, and D5 — not gaps.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
