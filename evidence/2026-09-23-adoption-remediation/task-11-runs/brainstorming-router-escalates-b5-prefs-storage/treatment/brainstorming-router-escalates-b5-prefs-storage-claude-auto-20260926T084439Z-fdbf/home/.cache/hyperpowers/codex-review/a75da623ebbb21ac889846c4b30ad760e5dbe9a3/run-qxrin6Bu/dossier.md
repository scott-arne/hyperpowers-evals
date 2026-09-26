# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260926T084439Z-fdbf/coding-agent-workdir/docs/hyperpowers/specs/2026-09-26-user-preferences-storage-design.md

	1	# User Preferences Storage — Design
	2	
	3	Date: 2026-09-26
	4	Status: Approved in brainstorming, pending spec review
	5	
	6	## Problem
	7	
	8	The webapp has no way to remember anything between visits. Every page load starts
	9	from the same blank state, and there is no module any feature can use to store a
	10	user setting. The request is for preferences that persist across sessions.
	11	
	12	There are no settings in the app today, so this change has to create both the
	13	storage mechanism and a first real consumer of it — otherwise "settings persist"
	14	is untestable.
	15	
	16	## Scope
	17	
	18	In scope:
	19	
	20	- A browser-local preferences module with a small, explicit interface.
	21	- One starter preference — "remember my username" — wired into the existing
	22	  login form, so persistence is observable by reloading the page.
	23	- Unit-test infrastructure, since the repo currently has none.
	24	
	25	Out of scope:
	26	
	27	- Server-backed or account-scoped preferences. There is no backend in this repo
	28	  and `login()` in `app.js` is a stub that returns a hardcoded success, so there
	29	  is no account to attach preferences to.
	30	- A dedicated settings UI section. The page has only a login form; settings
	31	  chrome for preferences that do not exist yet would be speculative.
	32	- Cross-device sync.
	33	
	34	## Global Constraints
	35	
	36	- **Unit tests are part of this work.** Node's built-in test runner
	37	  (`node:test` + `node:assert`), run via `npm test`. Every task that adds
	38	  behavior adds tests with it.
	39	- **No third-party dependencies.** `package.json` currently declares none;
	40	  the built-in runner keeps it that way.
	41	- **No linter, formatter, or end-to-end test infrastructure** is set up by this
	42	  work. That was considered and declined; match the existing file style by hand.
	43	- **The password is never persisted.** Not to localStorage, not anywhere.
	44	
	45	## Decisions
	46	
	47	### Storage location: browser localStorage
	48	
	49	Preferences live in the browser and follow the device.
	50	
	51	Rejected: server-backed per-account storage. It would give real cross-device
	52	persistence, but requires building an API, a datastore, and real authentication
	53	first — far beyond the request, and unattachable to a stubbed `login()`.
	54	
	55	Rejected: an async `get`/`set` interface over localStorage as a seam for a future
	56	server backend. The seam is speculative. If a backend arrives it will arrive with
	57	an auth system, and adapting a small, well-bounded module at that point costs
	58	less than carrying an awkward abstraction until then.
	59	
	60	### One key holding one object
	61	
	62	All preferences live under a single localStorage key, `webapp.preferences`,
	63	containing one JSON object.
	64	
	65	Chosen over a key per preference because reads and writes stay atomic, defaults
	66	merge in exactly one place, the app occupies one namespace instead of scattering
	67	entries across the origin, and a `version` field gives a migration handle. The
	68	cost — writing one preference rewrites the whole object — is irrelevant at this
	69	size.
	70	
	71	### `DEFAULTS` is the schema
	72	
	73	A single `DEFAULTS` constant declares which preferences exist and the type of
	74	each. It is the only place the set of valid preferences is defined.
	75	
	76	## Data Model
	77	
	78	Stored shape:
	79	
	80	```json
	81	{
	82	  "version": 1,
	83	  "rememberUsername": false,
	84	  "lastUsername": ""
	85	}
	86	```
	87	
	88	| Field | Type | Default | Meaning |
	89	|---|---|---|---|
	90	| `version` | number | `1` | Schema version of the stored object. |
	91	| `rememberUsername` | boolean | `false` | Whether to prefill the username field on load. |
	92	| `lastUsername` | string | `""` | The username to prefill. Empty when not remembering. |
	93	
	94	`version` is managed by the module and is not a preference. It is not a key in
	95	`DEFAULTS`, it is not readable or writable through `get`/`set`, and it is not
	96	included in what `all()` returns. It exists only in the serialized object.
	97	
	98	## Components
	99	
	100	### `prefs.js` (new, repo root)
	101	
	102	A classic script — not an ES module — exposing a single `Prefs` object, with a
	103	CommonJS `module.exports` tail so tests can require it. This matches the existing
	104	`src/utils.js` pattern and avoids converting `index.html` to module loading for
	105	the sake of one file.
	106	
	107	Interface, all synchronous:
	108	
	109	- `Prefs.get(name)` — the stored value, or the default when absent.
	110	- `Prefs.set(name, value)` — persist. Returns `true` if the value reached
	111	  localStorage, `false` if it is only held in memory.
	112	- `Prefs.all()` — a copy of the merged preferences, excluding `version`. Callers
	113	  cannot mutate internal state through it.
	114	- `Prefs.reset()` — return every preference to its default.
	115	
	116	### `index.html` (modified)
	117	
	118	Adds one checkbox to the login form, `id="remember-username"`, unchecked in the
	119	markup. Adds a `<script src="prefs.js">` tag before the existing `app.js` tag, so
	120	`Prefs` is defined when `app.js` runs.
	121	
	122	### `app.js` (modified)
	123	
	124	On load: read `rememberUsername`. If true, check the box and prefill the username
	125	input from `lastUsername`.
	126	
	127	On submit: if the box is checked, write `rememberUsername: true` and the submitted
	128	username to `lastUsername`. If it is unchecked, write `rememberUsername: false`
	129	and set `lastUsername` to `""` — unticking actively erases the stored username
	130	rather than leaving an orphaned value behind.
	131	
	132	The password is read from the form for the existing stubbed `login()` call and is
	133	never passed to `Prefs`.
	134	
	135	### `package.json` (modified)
	136	
	137	Adds `"scripts": { "test": "node --test" }`.
	138	
	139	### `test/prefs.test.js` (new)
	140	
	141	Unit tests for the module, injecting a fake `localStorage` so each case controls
	142	the store exactly.
	143	
	144	## Error Handling
	145	
	146	The governing rule: `get` and `set` never throw for storage reasons. A browser
	147	that will not persist should yield a working app with forgetful settings, not a
	148	broken page.
	149	
	150	| Condition | Behavior |
	151	|---|---|
	152	| localStorage unavailable (private mode, disabled, `SecurityError` on access) | Fall back to an in-memory object for the page's lifetime. `set` returns `false`. |
	153	| Stored JSON unparseable | Discard it, use defaults, overwrite on the next write. |
	154	| Stored `version` is not `1` | Discard to defaults. |
	155	| Quota exceeded on write | Keep the in-memory value, return `false`. |
	156	| A stored field's type does not match its default | Ignore that field, use the default. Other fields are unaffected. |
	157	
	158	Two conditions **do** throw, because they are programmer errors rather than
	159	environment conditions:
	160	
	161	- `get` or `set` with a `name` not present in `DEFAULTS`. This turns a typo into
	162	  an immediate error instead of a silently discarded setting.
	163	- `set` with a value whose type does not match that preference's default.
	164	
	165	Version handling is deliberately a discard rather than a migration. With one
	166	shipped version there is nothing to migrate from; a real migration path is
	167	cheaper to write when a v2 exists and its shape is known.
	168	
	169	## Security Considerations
	170	
	171	localStorage is readable by any script running on the page and by every tab on
	172	this origin, and it survives on shared machines until explicitly cleared. Storing
	173	a username under those properties is acceptable; storing a password is not.
	174	
	175	Three things enforce that:
	176	
	177	- `DEFAULTS` contains no field a password could be written to, and unknown names
	178	  throw.
	179	- `app.js` never passes the password value to `Prefs`.
	180	- A test asserts that no password-shaped key is ever written to the store.
	181	
	182	The feature is opt-in and defaults to off, so nothing is retained on a shared
	183	device unless the user asks for it.
	184	
	185	## Testing Strategy
	186	
	187	`npm test` runs `node --test` over `test/`. Tests inject a fake `localStorage`
	188	rather than relying on a browser, so failure modes such as quota exhaustion and a
	189	throwing storage accessor can be exercised directly.
	190	
	191	Cases:
	192	
	193	1. Empty store — `get` returns each default; `all()` equals `DEFAULTS`.
	194	2. Round-trip — `set` then `get` returns the written value.
	195	3. Persistence — a value written by one module instance is readable by a freshly
	196	   loaded instance backed by the same store. This is the actual claim the feature
	197	   makes.
	198	4. Corrupt JSON in the store — falls back to defaults, does not throw.
	199	5. localStorage absent or throwing on access — stays in memory, does not throw,
	200	   `set` returns `false`.
	201	6. Quota exceeded — `set` returns `false`, the in-memory value is still readable.
	202	7. Unknown preference name — `get` and `set` both throw.
	203	8. Wrong value type passed to `set` — throws.
	204	9. Stored `version` mismatch — resets to defaults.
	205	10. Stored field with a wrong type — that field falls back to its default while
	206	    others are preserved.
	207	11. No password-shaped key is ever present in the written object.
	208	
	209	Manual verification, since there is no end-to-end harness: load `index.html`,
	210	tick the box, submit, reload, and confirm the username is prefilled and the box
	211	is still checked; then untick, submit, reload, and confirm the field is empty.
	212	
	213	## Files Touched
	214	
	215	| File | Change |
	216	|---|---|
	217	| `prefs.js` | New. The preferences module. |
	218	| `test/prefs.test.js` | New. Unit tests. |
	219	| `index.html` | Add the checkbox and the `prefs.js` script tag. |
	220	| `app.js` | Load preferences on start, write them on submit. |
	221	| `package.json` | Add the `test` script. |


## Adjudicated decisions

NOT PROVIDED: flag not passed

## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
