# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T113637Z-8d21/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-user-preferences-storage-design.md

	1	# User Preferences Storage — Design
	2	
	3	Date: 2026-09-17
	4	Status: Approved (design), pending implementation plan
	5	
	6	## Problem
	7	
	8	The webapp (`index.html` + `app.js`) keeps no state between visits. Every load
	9	starts from the same defaults, and anything the user adjusts is lost when the
	10	tab closes. There is no settings or storage layer anywhere in the repository to
	11	extend, so persistence has to be introduced as a new unit.
	12	
	13	## Goals
	14	
	15	- Persist a small, declared set of user preferences across browser sessions.
	16	- Give consumers a single, typed-by-convention API instead of scattered
	17	  `localStorage` calls.
	18	- Fail safely: bad or unavailable storage must never break page load.
	19	- Ship with unit tests covering the storage layer.
	20	
	21	## Non-Goals
	22	
	23	- Server-side or cross-device preference sync.
	24	- Preferences tied to the authenticated account. `login()` is a stub with no
	25	  session, and building auth-backed persistence is a separate project.
	26	- A settings page or preferences UI beyond the two controls described below.
	27	- `prefers-color-scheme` as the default theme source.
	28	- Any change to `src/index.js` or `src/utils.js`.
	29	- Storing passwords or session tokens. Never.
	30	
	31	## Global Constraints
	32	
	33	- Unit-test infrastructure is part of this work: `node:test` (Node's built-in
	34	  runner), no third-party dependencies, wired to `npm test`. Every behavior in
	35	  "Failure handling" below has a test.
	36	- No linter, formatter, e2e harness, or bundler is introduced. Match the
	37	  existing plain-script style.
	38	- `package.json` stays CommonJS (no `"type": "module"`); `src/` already uses
	39	  `require`/`module.exports` and must keep working.
	40	- `index.html` must keep working when opened directly from disk (`file://`).
	41	
	42	## Storage Decision
	43	
	44	Preferences live in the browser's `localStorage`, under a single namespaced key.
	45	
	46	Rejected alternatives, and why:
	47	
	48	- **Server-backed per user** — would be the right answer once real accounts
	49	  exist, since preferences would then follow the user across devices. Today
	50	  there is no session, no token, and no API; this would mean inventing an
	51	  entire auth-backed persistence layer. Deferred deliberately, and the module
	52	  boundary below is what keeps it cheap to adopt later.
	53	- **Node config file on disk** — applies to the `src/` command-line entry
	54	  point, which is not the surface the preferences belong to.
	55	
	56	Consequence to accept: preferences are per browser profile, not per user. A
	57	different device, a different browser, or cleared site data means defaults.
	58	
	59	## Module: `preferences.js`
	60	
	61	New file at the repository root, alongside `app.js`. No dependencies.
	62	
	63	### Loading
	64	
	65	Loaded as a plain `<script src="preferences.js">` before `app.js`, attaching
	66	`window.Preferences`. A guard at the bottom of the file also exports it for
	67	Node:
	68	
	69	```js
	70	if (typeof module !== "undefined" && module.exports) {
	71	  module.exports = Preferences;
	72	}
	73	```
	74	
	75	ES modules were rejected: they do not load over `file://`, so `import` would
	76	silently require running a local web server to open the page, and `"type":
	77	"module"` in `package.json` would break the existing CommonJS `src/` files.
	78	The cost of this choice is a browser global, which is consistent with how
	79	`app.js` already works.
	80	
	81	### Public API
	82	
	83	| Function | Behavior |
	84	|---|---|
	85	| `Preferences.get(key)` | Stored value for `key`, else its declared default. Throws `Error` on an unknown key (a programming mistake, not user data). |
	86	| `Preferences.set(key, value)` | Validates `key` is known and `value` matches the default's type, persists the whole blob, returns the stored value. Throws `Error` on an unknown key or a type mismatch. |
	87	| `Preferences.getAll()` | Full resolved object: stored values merged over defaults. Returns a fresh object; mutating it does not affect storage. |
	88	| `Preferences.reset()` | Removes the stored blob so subsequent reads return defaults. |
	89	
	90	Validation is deliberately asymmetric: unknown keys arriving from *storage* are
	91	dropped silently (data written by an older version of the app), while unknown
	92	keys passed to `get`/`set` throw (a caller bug).
	93	
	94	### Data model
	95	
	96	One `localStorage` key: `webapp:prefs`. Its value is a JSON object.
	97	
	98	Declared defaults, the single source of truth for which keys exist and what
	99	type each holds:
	100	
	101	```js
	102	const DEFAULTS = {
	103	  theme: "light",            // "light" | "dark"
	104	  rememberedUsername: "",    // string; "" means not remembered
	105	};
	106	```
	107	
	108	Reads parse the blob, discard any key not present in `DEFAULTS`, and merge the
	109	remainder over `DEFAULTS`. `theme` is additionally range-checked: a stored
	110	value outside `"light" | "dark"` is treated as absent and falls back to the
	111	default.
	112	
	113	### Failure handling
	114	
	115	| Condition | Behavior |
	116	|---|---|
	117	| Key absent from storage | Return defaults. |
	118	| Stored value is not parseable JSON | Return defaults. The corrupt value is overwritten on the next `set()` rather than being left to fail every load. |
	119	| Stored value parses to a non-object (e.g. `"7"`, `null`, an array) | Treated the same as corrupt: return defaults. |
	120	| Stored object carries unknown keys | Keys dropped on read; not re-persisted on the next write. |
	121	| Stored value has the wrong type for a known key | That key falls back to its default; other keys are unaffected. |
	122	| `localStorage` unavailable or throwing (private mode, disabled storage, quota exceeded) | The module degrades to an in-memory object for the lifetime of the page. Reads and writes keep working; nothing propagates to `app.js`. A single `console.warn` is emitted, not one per call. |
	123	
	124	The invariant: no call into `Preferences` throws because of the *state of
	125	storage*. Only caller mistakes (unknown key, wrong type) throw.
	126	
	127	## UI Integration
	128	
	129	### `index.html`
	130	
	131	- Add `<script src="preferences.js"></script>` before the existing `app.js`
	132	  tag.
	133	- Add a theme toggle button (`#theme-toggle`).
	134	- Add a "Remember me" checkbox (`#remember-me`) to the login form.
	135	- Add a small `<style>` block defining the dark palette under
	136	  `[data-theme="dark"]`.
	137	
	138	### `app.js`
	139	
	140	On load:
	141	
	142	1. Apply `Preferences.get("theme")` to `document.documentElement` as
	143	   `data-theme`.
	144	2. If `rememberedUsername` is non-empty, pre-fill `#username` with it and tick
	145	   `#remember-me`.
	146	
	147	On theme toggle: flip the value, `Preferences.set("theme", next)`, re-apply the
	148	attribute.
	149	
	150	On successful login: if `#remember-me` is ticked, store the submitted username;
	151	if it is not, store `""`. The checkbox state is what makes storing the username
	152	consensual rather than silent.
	153	
	154	### Accepted trade-offs
	155	
	156	- **Flash of default theme.** The theme is applied after the document parses,
	157	  so a dark-theme user sees a brief light flash on load. Eliminating it
	158	  requires a render-blocking inline script; not worth it at this size.
	159	- **Plaintext username.** `rememberedUsername` is readable by any script on
	160	  this origin. Acceptable for a convenience pre-fill of a non-secret field,
	161	  and the reason the password is never persisted in any form.
	162	
	163	## Testing
	164	
	165	`test/preferences.test.js`, run by `node --test` via `npm test`. A fake
	166	`localStorage` (a plain object with `getItem`/`setItem`/`removeItem`) is
	167	installed as a global before each test and removed after, so tests are
	168	independent and no real browser is needed.
	169	
	170	Cases:
	171	
	172	1. `get` returns the declared default when nothing is stored.
	173	2. `set` then `get` round-trips a value.
	174	3. `set` persists across a fresh module read (values survive in storage, not
	175	   just in memory).
	176	4. Corrupt JSON in storage yields defaults.
	177	5. A non-object JSON value in storage yields defaults.
	178	6. Unknown keys in stored data are dropped and not re-persisted.
	179	7. A wrong-typed stored value falls back to that key's default without
	180	   affecting other keys.
	181	8. An out-of-range `theme` value falls back to `"light"`.
	182	9. `get`/`set` with an unknown key throws.
	183	10. `set` with a wrong-typed value throws.
	184	11. `getAll` returns defaults merged with stored values, and mutating the
	185	    result does not affect storage.
	186	12. `reset` restores defaults.
	187	13. A `localStorage` whose methods throw does not propagate: reads and writes
	188	    still work in memory.
	189	
	190	Not unit-tested: the DOM wiring in `app.js`. End-to-end browser testing was
	191	considered and declined for this change, so the theme-persists-across-reload
	192	and username-prefill behaviors are verified manually in a browser and that
	193	verification is reported as manual.
	194	
	195	## Files Touched
	196	
	197	| File | Change |
	198	|---|---|
	199	| `preferences.js` | New. The module. |
	200	| `test/preferences.test.js` | New. Unit tests. |
	201	| `index.html` | Script tag, theme toggle, remember-me checkbox, dark-theme styles. |
	202	| `app.js` | Apply theme on load, pre-fill username, wire toggle and checkbox. |
	203	| `package.json` | Add `"scripts": { "test": "node --test" }`. |
	204	
	205	## Risks
	206	
	207	- `localStorage` is origin-scoped and synchronous. At this data size the
	208	  synchronous write is immaterial; the origin scoping is the per-device
	209	  limitation already accepted above.
	210	- Adding a preference later means adding it to `DEFAULTS` and, if it is
	211	  constrained like `theme`, to the range check. If the stored shape ever needs
	212	  to change incompatibly, the single-blob layout is what makes a versioned
	213	  migration possible; no version field is included now because there is
	214	  nothing to migrate from.


## Adjudicated decisions

NOT PROVIDED: flag not passed

## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
