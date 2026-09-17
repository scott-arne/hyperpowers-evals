# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T031407Z-619f/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-user-preferences-storage-design.md

	1	# User Preferences Storage — Design
	2	
	3	Date: 2026-09-16
	4	Status: approved design, not yet implemented
	5	
	6	## Problem
	7	
	8	The webapp has no persistent state. Every page load starts from nothing: the
	9	username field is empty, and there is no way for a user to express a preference
	10	about the page at all. The request is for preferences storage so settings
	11	survive across sessions.
	12	
	13	Because the repository has no settings concept today — no settings screen, no
	14	config object, no stored state of any kind — this introduces a new subsystem
	15	rather than extending an existing one.
	16	
	17	## Scope
	18	
	19	In scope:
	20	
	21	- A preferences module with validated defaults, persisted to `localStorage`.
	22	- Two real preferences wired into the existing page: remember-username and a
	23	  light/dark theme.
	24	- Minimal CSS so there is something for the theme preference to switch.
	25	- Zero-dependency unit tests via `node --test`.
	26	
	27	Out of scope:
	28	
	29	- Any preferences on the Node half of the repo (`src/`). It is a hello-world
	30	  with no user and no session; it gains nothing from this.
	31	- Cross-device or server-side preference sync. There is no server — `login()`
	32	  is a stub that performs no network call.
	33	- A linter or formatter. Explicitly deferred.
	34	- A DOM-based test environment.
	35	
	36	## Decisions
	37	
	38	These were settled during brainstorming and are fixed inputs to the plan.
	39	
	40	1. **Storage lives in the browser, in `localStorage`.** "Across sessions" means
	41	   across tab closes. Preferences are per-browser and do not sync.
	42	2. **The change ships plumbing plus two real preferences**, not plumbing alone,
	43	   so the API is designed against actual callers.
	44	3. **Tooling is `node --test` plus a hand-written storage fake.** No new runtime
	45	   or dev dependencies; the repo stays dependency-free.
	46	4. **Data layout is a single JSON blob behind an injected storage backend**
	47	   (approach C of three considered). The alternatives were the same blob read
	48	   from the `localStorage` global directly, and one flat `localStorage` key per
	49	   preference. The blob was chosen for atomic writes and a single place to
	50	   version; the injected backend was chosen because it lets tests pass a fake
	51	   object instead of mutating `globalThis`.
	52	
	53	## Security constraint
	54	
	55	**The password is never persisted.** The preferences module does not read,
	56	write, or reference the password field. "Remember me" covers the username only.
	57	
	58	`localStorage` is plaintext and readable by any script on the origin, so a
	59	stored password would be exposed to any XSS on the page and to anyone with
	60	access to the browser profile. This is a deliberate boundary, not an oversight —
	61	do not add password persistence as a later convenience.
	62	
	63	`lastUsername` is itself mildly sensitive (it discloses who last used the
	64	browser). That is the accepted, conventional tradeoff for a remember-me feature,
	65	and it is only stored when the user opts in.
	66	
	67	## Architecture
	68	
	69	One new module, `prefs.js`, at the repository root beside `app.js` — matching
	70	where the browser half already lives.
	71	
	72	```
	73	index.html ──<script>── prefs.js ──── storage backend (localStorage | Map fallback)
	74	     │                     ▲
	75	     └──<script>── app.js ─┘  (constructs, reads on load, writes on submit)
	76	```
	77	
	78	`prefs.js` has one job: turn a storage backend plus a schema into validated,
	79	persisted preference values. It knows nothing about forms, the DOM, or login.
	80	`app.js` owns all DOM wiring. The module can be understood and tested without
	81	reading `app.js`, and `app.js` uses it through a four-method interface.
	82	
	83	### Module boundary
	84	
	85	- **What it does:** validated get/set/reset over a persisted preferences blob.
	86	- **How you use it:** `createPreferences()` in the browser;
	87	  `createPreferences({ storage: fake })` in tests.
	88	- **What it depends on:** a storage backend object. Nothing else. No DOM, no
	89	  globals when a backend is injected.
	90	
	91	## Data model
	92	
	93	Single `localStorage` key: `webapp.prefs`.
	94	
	95	```json
	96	{
	97	  "version": 1,
	98	  "theme": "light",
	99	  "rememberUsername": false,
	100	  "lastUsername": ""
	101	}
	102	```
	103	
	104	Schema table (the single source of defaults and validation):
	105	
	106	| Key | Type | Default | Validation |
	107	|---|---|---|---|
	108	| `theme` | enum | `"light"` | one of `"light"`, `"dark"` |
	109	| `rememberUsername` | boolean | `false` | strict boolean |
	110	| `lastUsername` | string | `""` | string, trimmed, max 256 chars |
	111	
	112	Rules:
	113	
	114	- `lastUsername` is written only while `rememberUsername` is true. Setting
	115	  `rememberUsername` to false clears `lastUsername` in the same write, so
	116	  opting out removes the stored name rather than orphaning it.
	117	- **Versioning:** if the stored `version` is absent or is not `1`, the whole
	118	  blob is discarded and defaults are used. With a single version there is
	119	  nothing to migrate from; a migration framework with no migrations in it would
	120	  be speculative. The envelope exists so a future rename has a defined starting
	121	  point.
	122	
	123	## Module API
	124	
	125	```js
	126	createPreferences({ storage, schema }) // both optional
	127	  .get(key)         // validated stored value, else the schema default
	128	  .set(key, value)  // validate, then persist the full blob
	129	  .reset()          // remove the stored blob; back to defaults
	130	  .all()            // plain object of all current values
	131	```
	132	
	133	- `storage` defaults to `globalThis.localStorage`, so browser callers write
	134	  `createPreferences()` with no arguments.
	135	- `schema` defaults to the built-in table; it is injectable so tests can
	136	  exercise validation without inventing production preferences.
	137	- `set` **throws** on an unknown key and on a value that fails validation. A
	138	  typo'd key or a bad value originates in code and is a defect; failing loudly
	139	  keeps it from becoming a silent no-op.
	140	- `get` **never throws** on bad *stored* data; it returns the default.
	141	
	142	The asymmetry is deliberate: bad input from code is a bug to surface, bad data
	143	in storage is a runtime condition the page must absorb.
	144	
	145	- Every `set` rewrites the whole blob. With three keys, tracking dirty state
	146	  would cost more than it saves.
	147	
	148	### Dual export
	149	
	150	`prefs.js` is loaded by a bare `<script>` tag and also `require`d by the tests,
	151	and the repo has no bundler. The file ends with a short conditional export:
	152	`module.exports` when `module` is defined, otherwise assignment to
	153	`window.Preferences`. This avoids introducing a build step.
	154	
	155	## UI wiring
	156	
	157	`index.html`:
	158	
	159	- `<link rel="stylesheet" href="styles.css">` in the head.
	160	- A theme toggle button above the form.
	161	- A "Remember my username" checkbox inside the form.
	162	
	163	`app.js` on load:
	164	
	165	1. Construct the preferences instance.
	166	2. Apply `theme` by setting `data-theme` on the `<html>` element.
	167	3. If `rememberUsername` is true, prefill the username input from
	168	   `lastUsername` and check the checkbox.
	169	
	170	`app.js` on theme-toggle click: flip `theme` between `"light"` and `"dark"`,
	171	persist it immediately, and update `data-theme`. The theme is not tied to the
	172	form — it persists on click, whether or not the user ever submits or logs in.
	173	
	174	`app.js` on submit, after the existing validation passes:
	175	
	176	- Checkbox checked → persist `rememberUsername: true` and
	177	  `lastUsername: <username>`.
	178	- Checkbox unchecked → persist `rememberUsername: false`, clearing
	179	  `lastUsername`.
	180	
	181	Existing `login()` and `validateForm()` logic is not modified. New behavior is
	182	added around it.
	183	
	184	`styles.css` is new and minimal: a `:root` block of light values and a
	185	`[data-theme="dark"]` override for background and text colors. No framework, no
	186	reset. Theming stays in CSS; JS only sets the attribute.
	187	
	188	## Error handling
	189	
	190	The governing invariant: **no failure in the preferences layer may break
	191	login.**
	192	
	193	| Failure | Behavior |
	194	|---|---|
	195	| Corrupt / unparseable JSON | Discard the blob, return defaults, `console.warn` once. Page renders normally. |
	196	| Valid JSON, one invalid value | That key falls back to its default; other keys are preserved. Per-key, not all-or-nothing. |
	197	| Unknown or missing `version` | Discard the blob, return defaults. |
	198	| Storage unavailable or write rejected | Catch at construction and on every write; fall back to an in-memory `Map` with the same interface. Warn once, not per write. The app works; preferences do not outlive the tab. |
	199	
	200	The storage-unavailable path is not hypothetical: Safari private mode throws on
	201	`setItem`, and `file://` origins can reject storage access.
	202	
	203	## Testing
	204	
	205	`package.json` gains its first `scripts` entry: `"test": "node --test"`.
	206	
	207	Tests live in `test/prefs.test.js`. A `createFakeStorage()` helper (~15 lines)
	208	wraps a `Map` behind `getItem`/`setItem`/`removeItem`, with a throwing variant
	209	for the unavailable-storage case.
	210	
	211	Cases:
	212	
	213	1. Empty storage returns every schema default.
	214	2. **Persistence:** `set` a value, construct a *fresh* instance over the same
	215	   storage, read the value back. This is the literal "persists across sessions"
	216	   claim and the reason the backend is injected.
	217	3. Corrupt JSON returns defaults and does not throw.
	218	4. One invalid value defaults that key and preserves the others.
	219	5. Unknown `version` returns defaults.
	220	6. `set` with an unknown key throws.
	221	7. `set` with an invalid value throws.
	222	8. Setting `rememberUsername` to false clears `lastUsername`.
	223	9. Throwing storage falls back to memory without crashing.
	224	10. `reset()` restores defaults and removes the stored key.
	225	
	226	### Not covered by tests
	227	
	228	The `app.js` DOM wiring has no automated coverage, because a DOM test
	229	environment was declined. It will be verified manually: load the page, set both
	230	preferences, reload, confirm they persist. This is a manual check and will be
	231	reported as such — not as a passing test.
	232	
	233	## Files touched
	234	
	235	| File | Change |
	236	|---|---|
	237	| `prefs.js` | New. The preferences module. |
	238	| `styles.css` | New. Light/dark custom properties. |
	239	| `test/prefs.test.js` | New. Unit tests plus the storage fake. |
	240	| `index.html` | Stylesheet link, theme toggle, remember checkbox, `prefs.js` script tag. |
	241	| `app.js` | Load-time init and submit-handler persistence. Existing logic untouched. |
	242	| `package.json` | Add `scripts.test`. |
	243	
	244	## Open assumptions
	245	
	246	- Assumption: the page is served over `http(s)://` or opened via `file://` in a
	247	  browser with `localStorage` enabled; validate via the manual browser check
	248	  described above. The in-memory fallback covers the case where it is not.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T031407Z-619f/home/.cache/hyperpowers/codex-review/7f40ad0e352bacc394581fc057631e956f97c55c/run-pqxaA3wB/adjudications.md

	1	# Approved design decisions (brainstorming adjudications)
	2	
	3	Original request, verbatim: "Add user preferences storage so settings persist
	4	across sessions."
	5	
	6	The following were decided by the human partner during brainstorming and are
	7	**fixed inputs**. Do not re-litigate them; review the spec for how faithfully
	8	and completely it executes against them.
	9	
	10	1. **Surface: browser / `localStorage`.** Chosen over a Node JSON config file
	11	   and over a dual-backend shared core. Preferences are per-browser; no
	12	   cross-device sync.
	13	2. **Scope: plumbing plus two real preferences.** Chosen over plumbing-only and
	14	   over plumbing-plus-one. The two are remember-username and a light/dark theme,
	15	   wired into the existing page.
	16	3. **Security constraint, stated by Claude and accepted:** the password is never
	17	   persisted. Remember-me covers the username field only.
	18	4. **Tooling: `node --test` plus a hand-written `localStorage` fake.** Chosen
	19	   over Vitest+jsdom and over no tooling. ESLint/Prettier explicitly declined
	20	   for now. No new runtime or dev dependencies.
	21	5. **Data layout and module shape: approach C** — a single JSON blob under one
	22	   key, behind an injected storage backend, with a declarative schema table.
	23	   Chosen over (A) the same blob reading the `localStorage` global directly and
	24	   (B) one flat `localStorage` key per preference.
	25	6. The human partner approved the data-model and module-API sections in chat
	26	   before the spec was written ("looks good, go ahead").
	27	
	28	## Codebase facts the spec was written against
	29	
	30	Repo root: `README.md`, `app.js`, `index.html`, `package.json`, `src/index.js`,
	31	`src/utils.js`. Branch `feature/webapp-enhancement`, working tree clean.
	32	
	33	`package.json` has no `dependencies`, `devDependencies`, `scripts`, or `type`
	34	field. No lockfile, no bundler, no build step, no test runner, no linter config.
	35	
	36	`app.js` is loaded by a bare `<script src="app.js">` tag; its functions are
	37	plain top-level declarations. `src/` uses CommonJS. There is no build step to
	38	bridge the two module systems.
	39	
	40	`login()` in `app.js` is a stub that performs no network call and returns a
	41	literal success object. There is no server and no session token.
	42	
	43	`index.html` has no CSS at all — no `<link>`, no `<style>`, no inline styles.
	44	
	45	Nothing in the repo reads or writes persistent state today, and there is no
	46	existing settings screen or config object to extend.
	47	
	48	## Codex approach gate
	49	
	50	A Codex approach consultation was attempted earlier in this brainstorm and
	51	returned an empty response, so the three approaches considered were
	52	single-source (Claude's own). This is a known blind spot in the option set.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
