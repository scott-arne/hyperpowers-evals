# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T094328Z-cae7/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-user-preferences-storage-design.md

	1	# User Preferences Storage — Design
	2	
	3	Date: 2026-09-17
	4	Status: approved (brainstorming complete, awaiting implementation plan)
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The webapp has no persistence of any kind. Nothing the user does in the page
	10	survives a reload, so there is no way to offer settings that hold across
	11	sessions. The request is to add preferences storage so settings persist.
	12	
	13	## Scope
	14	
	15	In scope:
	16	
	17	- A browser-side preferences storage subsystem backed by `localStorage`.
	18	- One real preference wired into the existing login form, demonstrating the
	19	  persistence round-trip end to end.
	20	- Unit-test and lint/format infrastructure, neither of which exists today.
	21	
	22	Out of scope:
	23	
	24	- A settings panel or any multi-preference UI.
	25	- Preferences for the Node program under `src/`, which is an unrelated surface
	26	  that the browser page does not load.
	27	- Server-side or cross-device synchronization. Preferences are per-browser,
	28	  per-device.
	29	- Cross-tab live synchronization (see Future Directions).
	30	
	31	## Decisions Made During Brainstorming
	32	
	33	| Question | Decision |
	34	|---|---|
	35	| Which surface | Browser webapp (`index.html` + `app.js`), `localStorage` |
	36	| How much scope | Storage module plus one wired preference |
	37	| Data model | Single namespaced, versioned JSON blob |
	38	| Module format | `createPreferences(storage)` factory with a dual browser/Node export shim |
	39	| Demo preference | `rememberUsername` + `lastUsername` |
	40	| Tooling | `node:test` unit tests, ESLint + Prettier. No Playwright, no fuzzing |
	41	
	42	Rejected alternatives, with reasons, are recorded in Alternatives Considered.
	43	
	44	## Global Constraints
	45	
	46	These apply to every task in the implementation plan:
	47	
	48	- **Unit tests use the built-in `node:test` runner** and `node:assert`. No test
	49	  dependency is added. `npm test` runs `node --test`.
	50	- **ESLint and Prettier are configured** and the new and modified code passes
	51	  both. This introduces the repository's first `devDependencies`; the ESLint
	52	  config must declare browser globals for `app.js` and `preferences.js`, and
	53	  Node globals for `src/` and the test files.
	54	- **No build step, no bundler.** `index.html` must continue to work when opened
	55	  directly from the filesystem via `file://`.
	56	- **No runtime dependencies.** The shipped browser code adds none.
	57	- **The password is never persisted** anywhere, in any form.
	58	- Existing behaviour of `src/index.js` and `src/utils.js` is not modified.
	59	
	60	## Architecture
	61	
	62	Three files, each with a single responsibility.
	63	
	64	### `preferences.js` (new, browser + Node)
	65	
	66	The entire storage subsystem. It owns:
	67	
	68	- `DEFAULTS` — the schema. Every known preference and its default value. This
	69	  table is the single source of truth for which keys exist and what type each
	70	  one holds.
	71	- `STORAGE_KEY` — `"webapp:prefs"`.
	72	- `SCHEMA_VERSION` — `1`.
	73	- The read, validate, merge, and write logic.
	74	
	75	It knows nothing about login, forms, or the DOM.
	76	
	77	Exposed through a factory:
	78	
	79	```js
	80	createPreferences(storage)
	81	```
	82	
	83	`storage` is any object providing `getItem` and `setItem`. It defaults to
	84	`window.localStorage`. Nothing in this design removes the entry — `reset()`
	85	writes the defaults rather than deleting — so `removeItem` is deliberately not
	86	part of the required interface. This injection point is what makes the
	87	subsystem testable in Node with a `Map`-backed fake and no DOM emulator.
	88	
	89	The returned object exposes exactly three methods:
	90	
	91	- `get(key)` — returns the current value. **Throws** if `key` is not in
	92	  `DEFAULTS`. Returning `undefined` for a typo'd key would hide the bug rather
	93	  than surface it.
	94	- `set(key, value)` — updates the in-memory value and immediately serializes
	95	  the whole blob to storage. **Throws** if `key` is not in `DEFAULTS`. Returns
	96	  `true` only when the value was **durably persisted**; it returns `false` both
	97	  when the write throws (see Quota below) and when the instance is running on
	98	  the in-memory fallback, since in neither case will the value survive a
	99	  reload. Callers may ignore the return value.
	100	- `reset()` — restores every preference to its default and persists the result.
	101	  Returns the same durability boolean as `set`.
	102	
	103	The API is deliberately narrow so that adding change subscriptions later is
	104	additive rather than a rewrite.
	105	
	106	The file ends with a dual-export shim: it attaches to `window` when a browser
	107	global is present and assigns to `module.exports` when running under Node. This
	108	preserves `file://` loading while keeping the module requirable by the tests.
	109	
	110	### `app.js` (modified)
	111	
	112	Constructs the preferences instance at load, then reads and writes through it.
	113	It must not touch `localStorage`, `JSON`, or the schema version directly. Its
	114	new responsibilities are restoring the form state on load and recording it on
	115	submit.
	116	
	117	### `index.html` (modified)
	118	
	119	Loads `preferences.js` before `app.js` via a second classic `<script>` tag, and
	120	gains one checkbox in the login form with the id `remember-username` and a
	121	label reading "Remember my username".
	122	
	123	## Data Model
	124	
	125	A single `localStorage` entry under `webapp:prefs`:
	126	
	127	```json
	128	{
	129	  "v": 1,
	130	  "values": {
	131	    "rememberUsername": false,
	132	    "lastUsername": ""
	133	  }
	134	}
	135	```
	136	
	137	`DEFAULTS` for version 1:
	138	
	139	| Key | Type | Default | Meaning |
	140	|---|---|---|---|
	141	| `rememberUsername` | boolean | `false` | Whether to restore the username field on load |
	142	| `lastUsername` | string | `""` | The username to restore |
	143	
	144	These are two separate keys on purpose. Collapsing them into one would require
	145	encoding "off" as the empty string, which erases the difference between
	146	*disabled* and *enabled but never used* and makes the checkbox state guesswork.
	147	
	148	### Load sequence
	149	
	150	1. Probe storage availability (see Failure Modes). Fall back to an in-memory
	151	   store if unavailable.
	152	2. Read `STORAGE_KEY`. If absent, use `DEFAULTS` as-is.
	153	3. Parse. On any parse failure, use `DEFAULTS`.
	154	4. Reject the blob wholesale if it is not an object, if `values` is not an
	155	   object, or if `v` is greater than `SCHEMA_VERSION`. Use `DEFAULTS`.
	156	5. For each key in `DEFAULTS`, take the stored value if present and of the
	157	   matching type; otherwise take the default. Keys present in storage but
	158	   absent from `DEFAULTS` are discarded.
	159	6. Cache the merged result in memory. All `get` calls are served from this
	160	   cache, so there is no parse per read.
	161	
	162	### Write sequence
	163	
	164	`set` mutates the cache and then serializes the entire blob, including the
	165	version field, back to storage immediately. Writing on every `set` rather than
	166	batching means a tab closed without warning still persists the change. The
	167	payload is small enough that the cost of whole-blob rewrites is irrelevant.
	168	
	169	## Failure Modes
	170	
	171	Every one of these degrades to a working application. None surfaces an error to
	172	the user.
	173	
	174	| Condition | Behaviour |
	175	|---|---|
	176	| Storage unavailable (private mode, site data blocked) | Accessing `window.localStorage` can itself throw. The factory probes inside `try`/`catch` and falls back to a `Map`-backed in-memory store. The app behaves identically; preferences do not survive reload. |
	177	| Malformed JSON | Caught. Treated as "nothing stored"; defaults apply. The bad value is left in place rather than eagerly wiped — the next `set` overwrites it, and not destroying data we failed to parse is the safer default. |
	178	| Blob parses but has the wrong shape | Same as malformed: defaults apply. |
	179	| `v` greater than `SCHEMA_VERSION` | A newer build wrote it. Treated as unreadable; defaults apply. We do not guess at a future format. |
	180	| `v` less than `SCHEMA_VERSION` | Cannot occur at version 1. The migration seam is reserved and deliberately left empty. |
	181	| A stored value's type disagrees with its default | That single key falls back to its default. Every other key still loads. |
	182	| `setItem` throws `QuotaExceededError` | Caught. The in-memory value still updates so the session stays self-consistent. `set` returns `false` and logs a console warning. The app never throws at the user over a preference. |
	183	
	184	## The Wired Preference
	185	
	186	**On load:** if `rememberUsername` is true, populate `#username` with
	187	`lastUsername` and check `#remember-username`.
	188	
	189	**On submit:** if the checkbox is checked, set `rememberUsername` to `true` and
	190	`lastUsername` to the submitted username. If it is unchecked, set
	191	`rememberUsername` to `false` **and** clear `lastUsername` to `""`. Leaving a
	192	stored username behind after the user has opted out would be a privacy
	193	surprise.
	194	
	195	The existing validation and stubbed `login()` behaviour is unchanged. The
	196	preference writes happen only on a submit that passes validation, so a rejected
	197	empty form does not overwrite a previously remembered username.
	198	
	199	## Security
	200	
	201	- **The password is never stored** — not in `localStorage`, not in the blob, and
	202	  not retained beyond the submit handler. This is enforced structurally, not by
	203	  convention: `DEFAULTS` contains no password key, and because both `get` and
	204	  `set` throw on keys absent from `DEFAULTS`, a future contributor cannot
	205	  quietly add one through a `set` call.
	206	- `localStorage` is readable by any script running on the origin, so persisting
	207	  even a username is a small disclosure on a shared machine. This is the
	208	  standard, accepted tradeoff for a "remember me" feature, and it is recorded
	209	  here so the choice stays deliberate rather than accidental.
	210	
	211	## Testing
	212	
	213	Unit tests run under `node:test` against `createPreferences(fakeStorage)`, where
	214	the fake is a `Map`-backed object implementing `getItem`/`setItem`/`removeItem`.
	215	No browser and no DOM emulator are involved.
	216	
	217	Required cases:
	218	
	219	1. Empty storage yields the defaults.
	220	2. `set` then `get` round-trips a value.
	221	3. **A fresh instance over the same storage sees the previously written
	222	   value.** This is the literal "persists across sessions" claim and the test
	223	   that would catch a store which only ever worked in memory.
	224	4. Malformed JSON falls back to defaults.
	225	5. A wrong-shaped blob falls back to defaults.
	226	6. A `v` above `SCHEMA_VERSION` falls back to defaults.
	227	7. One type-mismatched key defaults while its neighbours load normally.
	228	8. A key present in storage but absent from `DEFAULTS` is discarded.
	229	9. `get` with an unknown key throws.
	230	10. `set` with an unknown key throws.
	231	11. `reset()` restores every default and persists.
	232	12. A storage whose `getItem` throws produces a working in-memory fallback:
	233	    `get`/`set` still behave, and `set` returns `false` to signal the value is
	234	    not durable.
	235	13. A `setItem` that throws `QuotaExceededError` leaves `set` returning `false`
	236	    with the in-memory value still updated.
	237	
	238	**Known coverage gap.** The DOM wiring in `app.js` — check the box, submit,
	239	reload, see the username restored — is not covered by automated tests, because
	240	end-to-end tooling was deliberately excluded. It is verified manually once, and
	241	the gap is recorded here rather than left implicit. Adding Playwright later
	242	would close it.
	243	
	244	## Alternatives Considered
	245	
	246	- **One `localStorage` key per preference.** Rejected. It buys per-key isolation
	247	  between concurrent tabs, but scatters the defaults, requires per-key value
	248	  encoding, gives schema versioning nowhere natural to live, and turns both
	249	  migration and `reset()` into prefix scans of the whole keyspace. The
	250	  properties it trades away are exactly the ones that make adding a second
	251	  preference cheap.
	252	- **An observable store with subscriptions and `storage` events.** Rejected for
	253	  now as premature. It is the right eventual shape once a settings UI exists,
	254	  and the narrow `get`/`set`/`reset` API is specifically chosen so that adding
	255	  it later is additive.
	256	- **ES modules.** Rejected. Cleaner and standard, but `type="module"` breaks
	257	  `file://` loading under module CORS rules, which would mean the page could no
	258	  longer be opened directly.
	259	- **A plain global with no factory.** Rejected. Simplest to read, but it could
	260	  only be tested through a jsdom dependency, in a repository that currently has
	261	  none.
	262	- **A shared browser/Node preferences core.** Rejected as out of scope. The
	263	  `src/` program is unrelated to the page and shares no code with it.
	264	- **Playwright end-to-end tests.** Rejected for now on cost: a dependency that
	265	  downloads browser binaries, to test one checkbox on a stub login form. This
	266	  is the accepted cause of the coverage gap noted above.
	267	- **Fuzz or mutation testing.** Rejected. The interesting input surface is
	268	  "arbitrary junk in one string," which the explicit corruption cases cover more
	269	  legibly than a fuzzer would.
	270	
	271	## Future Directions
	272	
	273	Not part of this work; recorded so the design's seams are understood.
	274	
	275	- Change subscriptions and `window.addEventListener("storage", ...)` for live
	276	  cross-tab synchronization. Additive against the current API.
	277	- A settings panel, once there is more than one user-facing preference.
	278	- Schema migrations, when `SCHEMA_VERSION` first advances past 1. The load path
	279	  already reserves the branch.
	280	
	281	## Assumptions
	282	
	283	- Assumption: preferences are acceptable as per-browser and per-device, with no
	284	  expectation of following a user to another machine. Validate by confirming
	285	  with the product owner before any multi-device expectation is set.
	286	- Assumption: the stubbed `login()` remains a stub for the duration of this
	287	  work, so there is no real authentication response that should influence what
	288	  gets persisted. Validate by re-checking `app.js` at implementation time.
	289	
	290	## Codex Approach Gate
	291	
	292	The gate fired (genuinely different data models with materially different
	293	tradeoffs) and preflight returned `ok`, but the companion returned an empty
	294	payload, so no independent Codex approaches were contributed. Per the gate's
	295	one-shot rule this was noted once and not retried. The approaches above are
	296	Claude's own.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T094328Z-cae7/home/.cache/hyperpowers/codex-review/763ae8a38fe0f809ab952d38889edb5715e010be/run-nMVptEag/adjudications.md

	1	# Approved design decisions (brainstorming adjudications)
	2	
	3	Original request, verbatim:
	4	
	5	> Add user preferences storage so settings persist across sessions.
	6	
	7	Each decision below was presented to the human partner with tradeoffs and
	8	explicitly approved. They are settled — findings that merely re-litigate a
	9	settled decision are out of scope; findings that show a decision is internally
	10	inconsistent with the rest of the spec are in scope.
	11	
	12	1. **Surface: browser webapp.** Preferences serve `index.html` + `app.js`,
	13	   persisted in `localStorage`. Rejected: the Node program under `src/`; a
	14	   shared browser+Node core.
	15	
	16	2. **Scope: storage module plus one wired preference.** Rejected: a
	17	   storage-only layer with no consumer; a full settings UI.
	18	
	19	3. **Data model: single namespaced, versioned JSON blob** under one
	20	   `localStorage` key. Rejected: one key per preference; an observable store
	21	   with subscriptions and cross-tab `storage` events (deferred as premature,
	22	   kept additive).
	23	
	24	4. **Module format: `createPreferences(storage)` factory** with injectable
	25	   storage and a dual browser/Node export shim. Rejected: ES modules (breaks
	26	   `file://` loading); a plain global with no factory (would require a jsdom
	27	   dependency).
	28	
	29	5. **Demo preference: `rememberUsername` + `lastUsername`**, wired to the
	30	   existing login form. Approved with: unchecking clears the stored username.
	31	
	32	6. **Tooling: `node:test` unit tests, plus ESLint and Prettier.** Rejected:
	33	   Playwright end-to-end (browser-binary download judged too costly for one
	34	   checkbox — the resulting DOM-wiring coverage gap is knowingly accepted and
	35	   documented in the spec); fuzz/mutation testing.
	36	
	37	## Repository facts
	38	
	39	Pre-existing files, unchanged by this design except where the spec says
	40	otherwise: `index.html` (login form, classic script tag, no CSS/framework),
	41	`app.js` (~30 lines of top-level globals, stubbed `login()`), `package.json`
	42	(no scripts, no dependencies), `src/index.js` and `src/utils.js` (an unrelated
	43	Node CommonJS program). No test runner, linter, formatter, CI, build step, or
	44	existing persistence code of any kind. Branch `feature/webapp-enhancement`,
	45	working tree clean apart from the new spec.
	46	
	47	## Prior Codex involvement
	48	
	49	The brainstorming approach gate fired and preflight returned `ok`, but the
	50	companion returned an empty payload, so no independent Codex approaches were
	51	contributed. The approaches in the spec's Alternatives Considered are Claude's
	52	own.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
