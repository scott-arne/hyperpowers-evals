# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260922T100224Z-4a00/coding-agent-workdir/docs/hyperpowers/specs/2026-09-22-user-preferences-storage-design.md

	1	# User Preferences Storage — Design
	2	
	3	Date: 2026-09-22
	4	Status: Approved (design), pending implementation plan
	5	
	6	## Problem
	7	
	8	The webapp (`index.html` + `app.js`) has no notion of user settings and no
	9	persistence of any kind. Returning users retype everything. We want
	10	preferences that survive a browser session, starting with a "remember my
	11	username" option on the login form.
	12	
	13	## Scope
	14	
	15	In scope:
	16	
	17	- A browser-side preferences module with a narrow read/write interface.
	18	- One concrete consumer: remembering the username on the login form.
	19	- Unit tests for the preferences module.
	20	
	21	Out of scope:
	22	
	23	- Server-backed or cross-device preferences. The current `login()` is a stub
	24	  that returns `{ success: true }` without contacting anything, so there is no
	25	  user identity to key server-side preferences to. Adding one is a separate
	26	  project.
	27	- Storing the password. `prefs.js` never reads or writes it.
	28	- Preferences for the `src/` CommonJS half of the repo, which is unrelated to
	29	  the webapp and stays untouched.
	30	- Theming or any other preference beyond the username.
	31	
	32	## Decisions
	33	
	34	### Backing store: browser `localStorage`
	35	
	36	Chosen over a server-backed store because it delivers the feature with no
	37	backend, no datastore, and no auth work, and over `sessionStorage` because
	38	that is cleared when the tab closes, which is the opposite of the
	39	requirement.
	40	
	41	Consequence the user accepted: preferences are per-browser-per-device. The
	42	same person on another device sees defaults.
	43	
	44	### Data model: one namespaced key holding a JSON object
	45	
	46	All preferences live in a single `localStorage` entry under `webapp.prefs`,
	47	holding a JSON object, rather than one `localStorage` key per preference.
	48	
	49	- Adding a preference later needs no new storage plumbing.
	50	- `clear()` cannot wipe unrelated keys the page may use.
	51	- Cost: every write re-serializes the whole object. Irrelevant at this size.
	52	
	53	### Isolation
	54	
	55	Every `localStorage` call is confined to `prefs.js`. Swapping in a
	56	server-backed store later is a change to one file rather than to every call
	57	site.
	58	
	59	## Interface
	60	
	61	```js
	62	Prefs.get(key, fallback)   // parsed value, or fallback when absent/unreadable
	63	Prefs.set(key, value)      // returns true on success, false on failure; never throws
	64	Prefs.remove(key)          // deletes one preference, leaves the rest
	65	Prefs.clear()              // empties the namespace
	66	```
	67	
	68	Plus one seam that is not part of the public surface:
	69	
	70	```js
	71	Prefs.init(store)          // re-point the backend; called at load with globalThis.localStorage
	72	```
	73	
	74	Loaded in `index.html` by a `<script>` tag before `app.js`, matching the
	75	existing no-build, plain-global pattern. A footer exports the module for
	76	CommonJS when `module` is defined, so the same file is `require()`-able by
	77	tests.
	78	
	79	## Error handling
	80	
	81	`localStorage` fails in ways normal browsing does not show:
	82	
	83	- Safari private mode throws `QuotaExceededError` on every write.
	84	- A user can disable site data, so touching `window.localStorage` itself
	85	  throws a `SecurityError`.
	86	- The stored JSON can be corrupt, because anything on the page — or the user
	87	  via devtools — can overwrite the key.
	88	
	89	The module therefore never throws and never assumes:
	90	
	91	- **Availability probe on load.** Write, read, and delete a throwaway key
	92	  inside `try`. If it fails, fall back to an in-memory object: the page keeps
	93	  working, preferences just do not survive the tab.
	94	- **`get()` wraps the parse.** Malformed JSON, or a stored value that is not
	95	  an object, is treated as "no preferences" and the entry is reset, rather
	96	  than left to throw on every subsequent read.
	97	- **`set()` returns `false`** on a quota or security failure instead of
	98	  throwing, so callers can react. No silent empty `catch`.
	99	
	100	## UI wiring
	101	
	102	- `index.html` gains
	103	  `<label><input type="checkbox" id="remember-username"> Remember me</label>`
	104	  in the form.
	105	- On submit, **after** validation passes: if checked,
	106	  `Prefs.set('username', username)`; if unchecked, `Prefs.remove('username')`,
	107	  so unticking actively clears a previously stored value rather than leaving
	108	  it behind.
	109	- On page load, read the stored username; if present, pre-fill `#username`
	110	  and tick the checkbox.
	111	
	112	Remembering is opt-in via the checkbox rather than automatic: the username
	113	lands in browser storage that anyone using the device can read, so the user
	114	should choose it.
	115	
	116	## Deliberate omissions
	117	
	118	- **No expiry** on the stored username. `localStorage` has no TTL and
	119	  hand-rolling one for a "remember me" field is complexity without a
	120	  requirement.
	121	- **No cross-tab `storage` event sync.** The value is only read at load.
	122	
	123	## Testing
	124	
	125	Runner: Node's built-in `node:test` with `node:assert`, wired as
	126	`"test": "node --test"` in `package.json`. Zero dependencies, which preserves
	127	the repo's dependency-free character and matches the CommonJS already in
	128	`src/`.
	129	
	130	The storage backend needs a seam: the availability probe runs once at load, so
	131	an internal `init(store)` — called at load with `globalThis.localStorage` and
	132	exported for tests — lets tests re-initialize with a fake. This seam exists
	133	for testability rather than for the feature; it earns its place because the
	134	interesting failures are exactly the ones a real browser will not reproduce on
	135	demand.
	136	
	137	`test/prefs.test.js`, against a fake store (a `Map` wrapper that can be told
	138	to throw):
	139	
	140	- round-trip: `set` then `get` returns the value; `get` on a missing key
	141	  returns the fallback
	142	- `remove` deletes one preference and leaves the others
	143	- `clear` empties the namespace
	144	- corrupt JSON in the entry: `get` returns the fallback instead of throwing,
	145	  and the entry is reset
	146	- a non-object stored under the key (`"null"`, `"[]"`): same treatment
	147	- backend throws on write (quota): `set` returns `false`, no throw
	148	- backend throws on read (security): module falls back to in-memory, `get`
	149	  and `set` still work
	150	- values survive as types: a boolean stays a boolean, not `"true"`
	151	
	152	**Not covered by automated tests:** the DOM wiring in `app.js` and
	153	`index.html` — the checkbox, the pre-fill, the clear-on-untick. Covering it
	154	needs jsdom, a dependency this design declined. It will be verified by hand in
	155	a browser, with the checked behaviors reported explicitly. Adding jsdom is a
	156	separate decision for the user.
	157	
	158	## Files touched
	159	
	160	| File | Change |
	161	|---|---|
	162	| `prefs.js` | New. The preferences module. |
	163	| `test/prefs.test.js` | New. Unit tests. |
	164	| `index.html` | Script tag for `prefs.js`; "Remember me" checkbox. |
	165	| `app.js` | Load prefill on page load; save/clear on submit. |
	166	| `package.json` | `"test": "node --test"`. |
	167	
	168	`src/index.js`, `src/utils.js`, and `README.md` are untouched.


## Adjudicated decisions

NOT PROVIDED: flag not passed

## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
