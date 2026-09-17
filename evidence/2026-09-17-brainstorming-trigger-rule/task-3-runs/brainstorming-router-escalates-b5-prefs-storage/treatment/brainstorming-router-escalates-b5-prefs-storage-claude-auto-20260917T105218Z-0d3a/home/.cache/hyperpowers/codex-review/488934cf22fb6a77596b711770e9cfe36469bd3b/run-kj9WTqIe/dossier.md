# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T105218Z-0d3a/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-user-preferences-storage-design.md

	1	# User Preferences Storage — Design
	2	
	3	Date: 2026-09-17
	4	Status: approved (design), pending implementation plan
	5	
	6	## Problem
	7	
	8	The webapp has no persistence of any kind. Nothing the user adjusts on the
	9	page survives a reload, because there is nothing to adjust and nowhere to put
	10	it. The request is to add preferences storage so UI settings persist across
	11	sessions.
	12	
	13	## Scope
	14	
	15	**In scope:** UI preferences only — presentation settings with no user-identifying
	16	content. A storage module, plus one preference (`theme`) wired end to end so the
	17	module's API is exercised by a real caller rather than designed against
	18	imagined usage.
	19	
	20	**Explicitly out of scope:**
	21	
	22	- Any persistence of user-identifying data, including the login form's
	23	  username. This was considered and rejected during design: it puts an
	24	  identifier into persistent client storage and carries a security boundary
	25	  question that plain presentation settings do not.
	26	- Credentials. Nothing in this design touches the password field.
	27	- Account-scoped or cross-device preferences. Those require a backend; the
	28	  `login()` function in `app.js` is a stub that performs no network call, so
	29	  account-scoped storage would imply building real authentication first.
	30	- A general settings panel. One preference and one control.
	31	- The Node code under `src/`. It is disjoint from the browser page and is not
	32	  modified.
	33	
	34	## Existing code
	35	
	36	- `index.html` — static page, classic `<script>` tags, no build step, no
	37	  stylesheet.
	38	- `app.js` — browser globals (`API_ENDPOINT`, `login`, `validateForm`) and a
	39	  top-level submit handler on `#login-form`. No exports, no storage use.
	40	- `src/index.js`, `src/utils.js` — CommonJS Node hello-world, unrelated to the
	41	  page.
	42	- `package.json` — no dependencies, no `scripts` block.
	43	- No tests, no linter, no formatter, no existing testing pattern.
	44	
	45	## Architecture
	46	
	47	### Module boundary
	48	
	49	A new `prefs.js` at the repo root, beside `app.js`. `index.html` loads it via
	50	`<script src="prefs.js"></script>` **before** `app.js`, so `Prefs` is defined
	51	when `app.js` evaluates. No bundler and no module system, matching the page as
	52	it exists.
	53	
	54	The file defines a factory plus a default instance:
	55	
	56	```js
	57	function createPrefs(storage) { /* ... */ }
	58	const Prefs = createPrefs(globalThis.localStorage);
	59	```
	60	
	61	and ends with a guarded CommonJS export:
	62	
	63	```js
	64	if (typeof module !== "undefined") {
	65	  module.exports = { createPrefs, Prefs };
	66	}
	67	```
	68	
	69	In the browser that line is inert and `Prefs` is a global, consistent with how
	70	`login` and `validateForm` are already exposed. Under Node the tests `require`
	71	the file and call `createPrefs(fakeStorage)` with an in-memory stand-in. This
	72	is what makes the module testable without jsdom or any dependency.
	73	
	74	### Storage backend
	75	
	76	`localStorage`, under a single key `webapp.prefs` holding one JSON object
	77	(e.g. `{"theme":"dark"}`).
	78	
	79	Rejected alternatives: `sessionStorage` is cleared when the tab closes, which
	80	defeats the requirement; cookies transmit the data to the server for no
	81	reason; IndexedDB is asynchronous machinery disproportionate to a handful of
	82	scalar settings.
	83	
	84	One key rather than one key per preference keeps a read to a single parse and
	85	makes the stored state inspectable as a unit in devtools.
	86	
	87	### Data model
	88	
	89	A single declaration table at the top of the module:
	90	
	91	```js
	92	const SCHEMA = {
	93	  theme: { default: "light", valid: ["light", "dark"] },
	94	};
	95	```
	96	
	97	Each entry declares the preference's default and what counts as a valid stored
	98	value. This table is the one place that answers "what settings exist, and what
	99	are their defaults."
	100	
	101	Considered and rejected: a thin `get(key, fallback)` wrapper with no schema.
	102	It is about thirty lines smaller, but restates each default at every call site
	103	so they drift as soon as two places read the same setting, and it validates
	104	nothing. Also rejected: an observable store with subscriptions and cross-tab
	105	`storage`-event sync — real value, but there is one consumer; the schema store
	106	extends into it later without changing callers.
	107	
	108	### API
	109	
	110	- `Prefs.get(name)` — returns the stored value if present and valid, otherwise
	111	  the declared default.
	112	- `Prefs.set(name, value)` — validates against the schema, then persists.
	113	
	114	**Caller errors versus untrusted data.** These are two different situations and
	115	the module treats them differently, deliberately:
	116	
	117	- *Untrusted stored data* — anything read back out of `localStorage` — never
	118	  throws. It falls back to the default, per the rule below.
	119	- *Caller errors* — a `name` not present in `SCHEMA`, passed to either `get` or
	120	  `set`, or a `value` passed to `set` that is outside that preference's `valid`
	121	  set — throw. These are bugs in the calling code, not conditions a user can
	122	  produce, and a silent no-op would hide a typo'd preference name behind
	123	  behavior that looks like a working default.
	124	
	125	## Failure behavior
	126	
	127	The governing rule: **`get` returns the declared default unless storage holds a
	128	value that validates.** One rule absorbs every failure mode rather than each
	129	needing separate handling:
	130	
	131	| Condition | Result |
	132	|---|---|
	133	| Storage key absent | default |
	134	| Stored JSON unparseable | default |
	135	| Parsed root is not an object | default |
	136	| Value outside the schema's `valid` set | default |
	137	| Preference removed in a later build | default |
	138	
	139	None of these throw.
	140	
	141	Additional decisions:
	142	
	143	- **Storage access is individually wrapped, not probed once.** Reading
	144	  `localStorage` can throw outright (Safari private browsing, disabled site
	145	  data) and writes can throw on quota. Each read and write is wrapped, with an
	146	  in-memory object as fallback, so preferences still work for the current page
	147	  session when nothing can be persisted. The feature degrades to "does not
	148	  survive reload" rather than breaking the page.
	149	- **Unknown keys in storage are preserved on write.** A newer build's
	150	  preference sitting in storage must not be destroyed when this build calls
	151	  `set`.
	152	- **No version field.** Validate-or-default already serves as the migration
	153	  mechanism for scalar settings: a renamed or retyped preference falls back to
	154	  its default automatically. A version counter would add a migration ladder
	155	  with nothing to migrate. Deliberately omitted, not overlooked; if
	156	  preferences later hold structured values, that is when it earns its place.
	157	
	158	## The wired preference
	159	
	160	`theme`, values `light` and `dark`.
	161	
	162	A new `styles.css` defines two custom properties on `:root`, overridden under
	163	`[data-theme="dark"]`, applied to `body`. Approximately fifteen lines. Note
	164	that the page currently has no CSS at all, so wiring a theme necessarily
	165	introduces a stylesheet; this is an accepted cost of the choice, held to the
	166	minimum, with no design system or component styling.
	167	
	168	Control: `<label><input type="checkbox" id="theme-toggle"> Dark mode</label>`,
	169	placed **outside** `#login-form` so it cannot participate in form submission.
	170	
	171	Wiring in `app.js`:
	172	
	173	- `applyTheme()` sets `document.documentElement.dataset.theme` from
	174	  `Prefs.get("theme")`.
	175	- On load, the theme is applied **and** the toggle's `checked` state is
	176	  initialized from the same stored value. Both are required: applying the
	177	  theme while leaving the control at its HTML default reads to the user as
	178	  the setting having failed to save.
	179	- A `change` listener on the toggle calls `Prefs.set("theme", ...)` then
	180	  `applyTheme()`.
	181	
	182	The existing submit handler, `login()`, and `validateForm()` are unchanged.
	183	
	184	## Testing
	185	
	186	Tooling decision: unit tests via Node's built-in `node:test`. Chosen because
	187	it keeps `package.json` dependency-free, matching the repo's current state.
	188	`package.json` gains `"scripts": { "test": "node --test" }`.
	189	
	190	A linter/formatter and end-to-end tests were offered during design and not
	191	selected.
	192	
	193	`test/prefs.test.js` exercises the module against a fake storage object:
	194	
	195	1. Returns the declared default when storage is empty.
	196	2. Round-trips a valid value through `set` then `get`.
	197	3. Returns the default when the stored value is outside the valid set.
	198	4. Returns the default when stored JSON will not parse.
	199	5. Returns the default when the parsed root is not an object.
	200	6. Preserves unknown keys across a write.
	201	7. Does not throw when `getItem` / `setItem` themselves throw, and falls back
	202	   to in-memory behavior.
	203	8. Throws on caller errors: an unknown preference name passed to `get` or
	204	   `set`, and an out-of-range value passed to `set`.
	205	
	206	**Known coverage gap:** the DOM wiring in `app.js` and `index.html` has no
	207	automated coverage, since the selected tooling includes neither jsdom nor
	208	end-to-end tests. Its verification is manual: open `index.html`, toggle to
	209	dark, reload, confirm the setting persists and the toggle reflects it.
	210	
	211	## Files touched
	212	
	213	| File | Change |
	214	|---|---|
	215	| `prefs.js` | new — factory, schema, get/set, storage wrapping |
	216	| `styles.css` | new — theme custom properties |
	217	| `test/prefs.test.js` | new — module unit tests |
	218	| `index.html` | stylesheet link, `prefs.js` script tag, theme toggle |
	219	| `app.js` | `applyTheme()`, load-time init, toggle change listener |
	220	| `package.json` | `scripts.test` |
	221	| `.gitignore` | new — ignore `docs/hyperpowers` |
	222	| `src/**` | untouched |
	223	
	224	## Notes on process
	225	
	226	The Codex approach gate fired during design (a genuine data-model choice) and
	227	returned an empty response. The approaches recorded above are the author's
	228	alone, with no independent Codex input.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T105218Z-0d3a/home/.cache/hyperpowers/codex-review/488934cf22fb6a77596b711770e9cfe36469bd3b/run-kj9WTqIe/adjudications.md

	1	# Approved design decisions (brainstorming, 2026-09-17)
	2	
	3	Original request, verbatim:
	4	
	5	> Add user preferences storage so settings persist across sessions.
	6	
	7	Decisions the user made and approved during brainstorming. These are settled
	8	inputs to the spec, not open questions — a finding that re-opens one of these
	9	as if undecided is out of scope unless the spec is internally inconsistent
	10	with it.
	11	
	12	1. **Scope of what persists: UI preferences only.** The user explicitly chose
	13	   this over (a) remembering the username, (b) per-account backend-synced
	14	   settings. No user-identifying data, no credentials, no backend.
	15	
	16	2. **Deliverable: storage layer plus one preference wired end to end.** Chosen
	17	   over (a) storage layer only, (b) storage plus a full settings panel. The
	18	   intent is that a real caller exercises the module's API.
	19	
	20	3. **Approach: declared-schema store.** Chosen over (a) a thin
	21	   `get(key, fallback)` key-value wrapper with no schema, (b) an observable
	22	   store with subscriptions and cross-tab `storage`-event sync. Rationale
	23	   recorded in the spec.
	24	
	25	4. **Tooling: unit tests via Node's built-in `node:test` only.** The user was
	26	   offered, and did not select, a linter/formatter and end-to-end tests. The
	27	   repo has no tooling today. Absence of a linter and of e2e/DOM coverage is a
	28	   deliberate, recorded choice, not an oversight.
	29	
	30	5. Design sections for module boundary, data model / failure behavior, and UI
	31	   wiring were each presented in chat and approved before the spec was written.
	32	
	33	Codex approach gate: fired during design, returned an empty response. The
	34	approaches in the spec are the author's alone.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
