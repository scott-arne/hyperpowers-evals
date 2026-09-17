# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T011650Z-c086/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-user-preferences-storage-design.md

	1	# User Preferences Storage — Design
	2	
	3	Date: 2026-09-16
	4	Status: Approved (design), not yet implemented
	5	
	6	## Problem
	7	
	8	The webapp has no way to remember anything about a user between visits. Every
	9	page load starts from an empty login form, and there is no place to put a
	10	setting even if we had one. This spec adds a small preferences layer that
	11	persists across browser sessions, and wires it to one real consumer so the
	12	layer is exercised end to end rather than shipped unused.
	13	
	14	## Scope
	15	
	16	In scope:
	17	
	18	- A reusable preferences store (`src/preferences.js`).
	19	- One consumer: an opt-in "Remember me" checkbox on the login form that
	20	  prefills the username on return visits.
	21	- Unit tests for the store, using Node's built-in test runner.
	22	
	23	Out of scope:
	24	
	25	- A settings UI or settings page.
	26	- Any preference beyond `rememberUsername` and `lastUsername`.
	27	- Server-side or cross-device preference sync.
	28	- Changes to `src/index.js` and `src/utils.js`, which are unrelated to this
	29	  work and keep their current module style.
	30	
	31	## Decisions
	32	
	33	These were settled during brainstorming and the design depends on them.
	34	
	35	1. **Device-local storage with a synchronous API.** Preferences live in
	36	   `localStorage`. A server-backed store would follow the user across devices
	37	   but requires an authenticated backend that does not exist — `login()` in
	38	   `app.js` is a stub that never calls `API_ENDPOINT`. A synchronous API also
	39	   lets the login form prefill during page load with no loading state.
	40	2. **No pre-emptive async shaping.** The API is synchronous, not
	41	   Promise-returning. The injectable storage backend (below) is the seam a
	42	   future server-backed store would replace; shaping every caller around a
	43	   migration that may never happen is not worth the complexity today.
	44	3. **Opt-in consent.** The username is persisted only when the user checks
	45	   "Remember me". This is a login form that may run on a shared machine, so
	46	   storing an identifier without consent is the wrong default.
	47	4. **Dual export, no build step.** `src/preferences.js` assigns
	48	   `module.exports` when it exists and otherwise attaches to the browser
	49	   global. This lets the browser load it with a plain `<script>` tag and lets
	50	   Node tests `require()` it, without converting the repo to ES modules or
	51	   introducing a bundler.
	52	5. **Single JSON blob.** All preferences live under one `localStorage` key as
	53	   one JSON object, rather than one entry per preference. This keeps `clear()`
	54	   to a single call and gives a future schema migration one place to hook.
	55	
	56	## Architecture
	57	
	58	### Storage module
	59	
	60	New file: `src/preferences.js`.
	61	
	62	```
	63	createPreferences(storage)   // storage defaults to globalThis.localStorage
	64	  .get(key)                  // stored value, else the default, else undefined
	65	  .set(key, value)           // persists the value
	66	  .remove(key)               // drops the key, reverting to its default
	67	  .clear()                   // drops the whole blob
	68	```
	69	
	70	- Storage key: `"prefs"`.
	71	- Defaults table: `{ rememberUsername: false, lastUsername: "" }`. Defaults are
	72	  merged on read, so an absent or partial blob still yields sensible values.
	73	- The `storage` parameter is the isolation seam. It must satisfy the
	74	  `getItem`/`setItem`/`removeItem` shape, which both `localStorage` and a
	75	  test fake can provide. Nothing in the module reaches for `window` directly
	76	  except the default argument.
	77	- Exported surface: `createPreferences` (the factory) plus `preferences`, a
	78	  ready-made instance over the real `localStorage` so `app.js` does not have to
	79	  construct one. In the browser both hang off a single `window.Preferences`
	80	  object; under Node both are named exports of `module.exports`.
	81	
	82	### Data flow
	83	
	84	Read path: `get(key)` reads the raw string from `storage`, parses it, merges it
	85	over `DEFAULTS`, and returns the requested field.
	86	
	87	Write path: `set(key, value)` reads and parses the current blob, assigns the
	88	field, and writes the serialized object back.
	89	
	90	Both paths go through a single internal read helper and a single internal write
	91	helper, so the error handling below exists in exactly one place each.
	92	
	93	### Error handling
	94	
	95	`localStorage` is not reliably available, and this is the part of the design
	96	most likely to be got wrong:
	97	
	98	- Access can throw outright when storage is disabled by browser settings.
	99	- `setItem` throws in Safari private mode and on quota exhaustion.
	100	- The stored blob can be corrupt, truncated, or not an object — a user or
	101	  another script can write anything to that key.
	102	
	103	Required behavior:
	104	
	105	- Any throw from the backing store is caught. On first failure the module
	106	  falls back to an in-memory object and keeps using it for the lifetime of the
	107	  page, so preferences degrade to non-persistent rather than breaking the app.
	108	- A failure to persist is never surfaced to the caller as an exception. Login
	109	  must keep working when storage does not.
	110	- Corrupt or non-object JSON is treated as an empty preferences object, not
	111	  thrown. The next successful write replaces it.
	112	
	113	### Consumer: remember-me on the login form
	114	
	115	`index.html`:
	116	
	117	- Add `<script src="src/preferences.js"></script>` before the existing
	118	  `app.js` tag, so the global is defined when `app.js` runs.
	119	- Add a `Remember me` checkbox (`id="remember-me"`) to the login form.
	120	
	121	`app.js`:
	122	
	123	- On load, if `rememberUsername` is true, prefill `#username` with
	124	  `lastUsername` and check the box.
	125	- On successful login, if the box is checked, store `lastUsername` and set
	126	  `rememberUsername` to true; if unchecked, remove both so a previously
	127	  remembered username does not linger.
	128	- The password is never read from or written to storage under any branch.
	129	  Only the username is persisted, and only with the box checked.
	130	
	131	## Testing
	132	
	133	Tooling: Node's built-in `node:test` runner, with a `test` script added to
	134	`package.json`. No dependencies and no install step. No linter or formatter is
	135	being introduced.
	136	
	137	New file: `test/preferences.test.js`. The storage seam is what makes these
	138	tests possible without a browser.
	139	
	140	Cases:
	141	
	142	- Round trip: `set` then `get` returns the value.
	143	- Defaults: `get` on an untouched store returns the declared default.
	144	- Unknown key: `get` on a key with no default returns `undefined`.
	145	- Removal: `remove` reverts a key to its default; `clear` empties the store.
	146	- Persistence: a second `createPreferences` over the same backing storage sees
	147	  values written by the first.
	148	- Corrupt data: a backing store holding non-JSON, or JSON that is not an
	149	  object, reads as empty instead of throwing.
	150	- Storage unavailable: a fake whose `getItem`/`setItem` throw must not
	151	  propagate; the store keeps working in memory for the rest of its life.
	152	
	153	The login-form wiring is verified manually in the browser — the repo has no DOM
	154	test infrastructure, and introducing one is out of scope.
	155	
	156	## Risks and assumptions
	157	
	158	- Assumption: preferences are acceptable per-browser rather than per-account.
	159	  Validate by confirming with the user if a real backend later lands; the
	160	  storage seam is the migration point.
	161	- A user on a shared machine who checks "Remember me" leaves their username in
	162	  that browser. This is the standard tradeoff for the feature and is why the
	163	  behavior is opt-in and reversible by unchecking the box.
	164	- `localStorage` is cleared by privacy tooling and by the browser under storage
	165	  pressure. Losing preferences is a silent, acceptable outcome; the defaults
	166	  table means a missing blob is indistinguishable from a fresh visit.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T011650Z-c086/home/.cache/hyperpowers/codex-review/e8331598eaf9b5c9dff9891de06fbe2725235e3c/run-HPMGq7rM/adjudications.md

	1	# Approved design context — user preferences storage
	2	
	3	## Original request (verbatim)
	4	
	5	"Add user preferences storage so settings persist across sessions."
	6	
	7	## Codebase facts
	8	
	9	- Repo root contains: `index.html`, `app.js`, `README.md`, `package.json`,
	10	  `src/index.js`, `src/utils.js`. No other source files, no tests, no CI.
	11	- `index.html` is a login page: username input, password input, submit button,
	12	  and `<script src="app.js"></script>`. No other controls.
	13	- `app.js` is a classic (non-module) script: `API_ENDPOINT` constant,
	14	  a stubbed `login()` that only logs and returns `{success:true,user}` without
	15	  any network call, `validateForm()`, and a submit listener.
	16	- `src/index.js` and `src/utils.js` are CommonJS Node files (`require` /
	17	  `module.exports`), unrelated to the browser app.
	18	- `package.json` declares no dependencies, no devDependencies, and no scripts.
	19	  `main` points at `src/index.js`.
	20	- No bundler, no build step, no test runner, no linter, no formatter.
	21	
	22	## Decisions made with the user during brainstorming
	23	
	24	Question: What should the preferences system store, given the app has no
	25	settings today?
	26	Answer: The storage layer plus one real consumer — remember the username on the
	27	login form.
	28	
	29	Question: Where should preferences live (localStorage sync API / localStorage
	30	async API / server-backed)?
	31	Answer: localStorage with a synchronous API.
	32	
	33	Question: How is the remembered username captured (opt-in checkbox / always
	34	remember)?
	35	Answer: Opt-in "Remember me" checkbox.
	36	
	37	Question: How is the module loaded in the browser and in tests (dual export /
	38	ES modules everywhere / ESM for the new file only)?
	39	Answer: Dual export — CommonJS export with a browser-global fallback, so no
	40	existing file changes module style.
	41	
	42	Question: Which data model (single JSON blob / key-per-preference /
	43	schema-driven store)?
	44	Answer: Single JSON blob under one key, with a defaults table.
	45	
	46	Question: Which tooling to set up from the start?
	47	Answer: Unit tests via Node's built-in `node:test` only. No linter, no
	48	formatter.
	49	
	50	## Explicitly out of scope (user-approved)
	51	
	52	- Settings UI or settings page.
	53	- Any preference beyond `rememberUsername` and `lastUsername`.
	54	- Server-side or cross-device sync.
	55	- Changes to `src/index.js` and `src/utils.js`.
	56	- DOM/browser test infrastructure for the login-form wiring.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
