# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T010106Z-9786/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-user-preferences-storage-design.md

	1	# User Preferences Storage — Design
	2	
	3	Date: 2026-09-16
	4	Status: approved design, not yet implemented
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The webapp has no persistence of any kind. Every visit starts from an
	10	identical blank state: the login form is empty, and there is no way for a
	11	returning user to carry any choice across a page load. The request is to add
	12	preferences storage so settings survive between sessions.
	13	
	14	Two settings are in scope, chosen with the user:
	15	
	16	1. **Remember username** — prefill the login form's username field on return.
	17	2. **Theme** — a light/dark preference with a toggle control.
	18	
	19	## Global Constraints
	20	
	21	- **Storage is device-local.** Browser `localStorage` only. No backend, no
	22	  network calls, no account scoping.
	23	- **No new runtime dependencies.** `package.json` gains a `scripts` block and
	24	  nothing else — no `dependencies`, no `devDependencies`.
	25	- **Testing:** unit tests via Node's built-in `node:test`. No linter or
	26	  formatter is introduced by this work. No end-to-end tests.
	27	- **`src/` is out of scope.** The Node CLI in `src/index.js` and
	28	  `src/utils.js` is untouched. Nothing crosses between the browser app and
	29	  `src/` in either direction, and this work does not create such a link.
	30	- **`login()` stays a stub.** No authentication work is in scope.
	31	
	32	## Why device-local, and what it does not give you
	33	
	34	`login()` currently returns `{success: true, user: username}` unconditionally
	35	and never contacts `API_ENDPOINT`. There is no session, no token, and no
	36	authenticated identity. Preferences therefore cannot be meaningfully scoped to
	37	a user, and this design does not pretend otherwise: preferences belong to the
	38	browser profile, not to a person.
	39	
	40	Consequences, stated so they are not discovered later:
	41	
	42	- Preferences do not follow a user to another browser, device, or profile.
	43	- Two people sharing a browser profile share preferences.
	44	- There is no security boundary. `localStorage` is readable by any script on
	45	  the origin.
	46	
	47	If a real backend arrives, syncing preferences to an account is separate work
	48	with its own merge-conflict story. This design does not lay groundwork for it
	49	beyond the `version` field described below.
	50	
	51	## Architecture
	52	
	53	Three new files, two modified.
	54	
	55	| File | Change |
	56	|---|---|
	57	| `prefs.js` | New. The preferences module. |
	58	| `styles.css` | New. Theme custom properties. |
	59	| `test/prefs.test.js` | New. Unit tests for `prefs.js`. |
	60	| `index.html` | Modified. Stylesheet link, pre-paint script, script tag, two checkboxes. |
	61	| `app.js` | Modified. Wire the two checkboxes; one post-login hook. |
	62	| `package.json` | Modified. Add a `scripts` block with `test`. |
	63	
	64	### `prefs.js`
	65	
	66	A classic script — no `type="module"`, no bundler — defining a single global
	67	`Prefs`. This matches `app.js`, which already declares plain global functions
	68	with no module system.
	69	
	70	Public interface:
	71	
	72	- `Prefs.get(key)` — the stored value, or the default if absent, unknown, or
	73	  invalid. Never returns `undefined`.
	74	- `Prefs.set(key, value)` — persist one preference.
	75	- `Prefs.clear(key)` — reset one preference to its default.
	76	
	77	Defaults are declared once, in this file:
	78	
	79	```js
	80	const DEFAULTS = { theme: "light", rememberedUsername: null };
	81	```
	82	
	83	`get` merges stored values over `DEFAULTS`, so a field that is missing from
	84	storage — including a field added by a future version of the app reading an
	85	older stored blob — resolves to its default rather than `undefined`.
	86	
	87	### Data model
	88	
	89	One `localStorage` key, `webapp.prefs`, namespaced to avoid collision with
	90	anything else on the origin. Its value is a JSON object:
	91	
	92	```json
	93	{ "version": 1, "theme": "dark", "rememberedUsername": "ada" }
	94	```
	95	
	96	- `version` (number) — schema marker. **Written but not read in this
	97	  version.** It exists so a future shape change has something to branch on.
	98	  The current reader treats any unexpected content as "use defaults," so
	99	  version 1 needs no migration logic.
	100	- `theme` (string) — `"light"` or `"dark"`. Any other value is rejected on
	101	  read (see below).
	102	- `rememberedUsername` (string or null) — `null` means "not remembered."
	103	
	104	A single blob rather than one key per setting, so writes are atomic and the
	105	set of preferences and their defaults is declared in exactly one place.
	106	
	107	## Error handling
	108	
	109	Every branch here is a silent fallback. The governing principle: **a
	110	preferences failure never breaks the page.** Preferences are a convenience and
	111	hold nothing worth interrupting the user over. Nothing in this section
	112	produces a user-facing error, an alert, or a thrown exception that escapes the
	113	module.
	114	
	115	| Condition | Behavior |
	116	|---|---|
	117	| `localStorage` access throws (Safari private mode, embedded/sandboxed contexts, blocked cookies) | Fall back to an in-memory object for the rest of the page's life. The app works normally; preferences do not survive the session. |
	118	| Key absent | Return defaults. Not an error — this is the first-visit path. |
	119	| `JSON.parse` throws | Treat as absent: return defaults, and overwrite on the next write. No partial recovery is attempted. |
	120	| Parsed value is not a plain object (a string, array, or `null`) | Same as a parse failure. |
	121	| `theme` holds an unrecognized value | Validate against `{"light", "dark"}` on read; anything else resolves to the default. Guards against hand-edited storage. |
	122	| Write throws (quota exceeded) | Swallow the error; the in-memory value still updates so the current session stays self-consistent, even though nothing persisted. |
	123	
	124	Note that storage access is wrapped at the point of access, not probed once at
	125	startup — availability can differ between read and write, and a feature-detect
	126	at load time would not catch a quota error later.
	127	
	128	## UI behavior
	129	
	130	### Theme
	131	
	132	The page currently has no CSS whatsoever — no `styles.css`, no `<style>`
	133	block, no `<link>`. Theming therefore starts by introducing a stylesheet.
	134	
	135	`styles.css` defines CSS custom properties on `:root` for foreground,
	136	background, and input colors, with overrides under `[data-theme="dark"]`.
	137	Theme is applied by setting `document.documentElement.dataset.theme`. No
	138	component needs to know the theme exists beyond consuming the properties.
	139	
	140	**Load order is load-bearing.** `app.js` is loaded by a `<script>` tag at the
	141	end of `<body>`. If the theme were applied there, the page would paint in
	142	light and then visibly flip to dark — a flash of incorrectly themed content on
	143	every load for every dark-mode user. To prevent it, `index.html` gains a small
	144	inline script in `<head>` that reads the stored theme and sets `data-theme`
	145	before the body renders.
	146	
	147	That head script duplicates a minimal read of `localStorage` rather than
	148	depending on `prefs.js`. This duplication is intentional and must carry a
	149	comment explaining why: it has to run before any external script, so it cannot
	150	wait for `prefs.js` to load. It is a few lines, and it must be independently
	151	resilient — wrapped in its own `try`/`catch`, since an exception in `<head>`
	152	before the body renders is the one place a preferences failure could plausibly
	153	harm the page.
	154	
	155	Resulting order in `index.html`:
	156	
	157	1. `<link rel="stylesheet" href="styles.css">` in `<head>`
	158	2. Inline pre-paint theme script in `<head>`
	159	3. Body content, including the toggle
	160	4. `<script src="prefs.js">`, then `<script src="app.js">`
	161	
	162	A **"Dark mode" checkbox** in the body is wired in `app.js` to both
	163	`Prefs.set("theme", ...)` and the `dataset.theme` update. Its checked state is
	164	initialized from `Prefs.get("theme")` on load so it agrees with what the head
	165	script already applied.
	166	
	167	### Remember username
	168	
	169	A **"Remember my username" checkbox** beside the login form, unchecked by
	170	default.
	171	
	172	- On **successful** `login()`, if the box is checked, store the username; if
	173	  unchecked, clear it. Clearing on the unchecked path matters: otherwise
	174	  unticking the box appears to do nothing until the next successful login,
	175	  which reads as a bug and leaves data behind the user asked to remove.
	176	- On page load, if `rememberedUsername` is non-null, prefill `#username` and
	177	  pre-check the box.
	178	- **The password is never stored, in any form.** Stated explicitly because
	179	  "remember me" is ambiguous in the wild and this is a login form.
	180	- Opt-in, and cleared immediately on untick, because a username is mild PII on
	181	  a shared device.
	182	
	183	### Out of scope
	184	
	185	No change to `login()`, `validateForm()`, or the existing submit flow beyond a
	186	single post-success hook for the remembered username.
	187	
	188	## Testing
	189	
	190	`prefs.js` is a classic script that assigns a global, so a Node test can
	191	define a fake `localStorage` on `globalThis` and `require` the file directly.
	192	This needs no test runner install, no DOM shim, and no dependencies — Node's
	193	built-in `node:test` is sufficient. `package.json` gains
	194	`"scripts": { "test": "node --test" }`.
	195	
	196	Tests target the error-handling table, because every row there is a silent
	197	fallback: a regression produces no error, just quietly wrong behavior. That is
	198	the part of this design worth automated verification.
	199	
	200	Cases to cover:
	201	
	202	- Absent key returns defaults for both preferences.
	203	- Round-trip: `set` then `get` returns the written value.
	204	- Corrupt JSON returns defaults, and a later `set` overwrites cleanly.
	205	- A parsed non-object (string, array) returns defaults.
	206	- An unrecognized `theme` value returns `"light"`.
	207	- Storage that throws on read falls back to in-memory and keeps working.
	208	- Storage that throws on write leaves the in-memory value updated.
	209	- `clear(key)` restores that key's default and leaves the other untouched.
	210	- A stored blob missing a field resolves that field to its default.
	211	
	212	The DOM wiring in `index.html` and `app.js` is verified by hand: load the
	213	page, toggle dark mode, reload and confirm no flash of light theme; tick
	214	remember-username, log in, reload and confirm the prefill; untick, reload, and
	215	confirm the username is gone.
	216	
	217	Deliberately not covered: the pre-paint flash is a rendering-timing property
	218	that only a real browser can observe. Catching it automatically would mean
	219	end-to-end infrastructure, which the user scoped out. It is on the manual
	220	list instead.
	221	
	222	## Risks and assumptions
	223	
	224	- *Assumption:* the two chosen preferences are the whole near-term set.
	225	  Validate by asking before adding a third — if preferences start
	226	  proliferating, the single-blob shape and hand-verified DOM wiring both want
	227	  revisiting.
	228	- The duplicated read in the head script is the design's one knowing
	229	  redundancy. If a third consumer of the theme value ever appears, that is the
	230	  signal to reconsider the loading strategy rather than duplicate a third
	231	  time.
	232	- `version` is written but never read. It is dead weight until the first
	233	  migration; it is included because adding it retroactively means guessing at
	234	  the shape of un-versioned blobs already in users' browsers.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b5-prefs-storage-claude-auto-20260917T010106Z-9786/home/.cache/hyperpowers/codex-review/763ae8a38fe0f809ab952d38889edb5715e010be/run-2gEE2kkw/adjudications.md

	1	# Approved design decisions (brainstorming session, 2026-09-16)
	2	
	3	Original request, verbatim:
	4	
	5	> Add user preferences storage so settings persist across sessions.
	6	
	7	Decisions the user explicitly made. These are settled; do not re-litigate them
	8	as findings unless the spec is internally inconsistent with one of them.
	9	
	10	1. **Storage location — device-local `localStorage`, single shared key.**
	11	   Chosen over (a) `localStorage` namespaced by logged-in username and
	12	   (b) server-backed per-account storage. Rationale accepted by the user:
	13	   `login()` is a stub with no session or token, so there is no authenticated
	14	   identity to scope preferences to; username-keying would imply a guarantee
	15	   the code cannot make.
	16	
	17	2. **Preferences in scope — remember-username AND theme (light/dark).**
	18	   Chosen over a generic store with no settings wired. This means user-visible
	19	   UI is in scope, not only a storage module.
	20	
	21	3. **Module approach — approach A: classic global script + single JSON blob.**
	22	   Chosen over (B) flat per-setting `localStorage` keys and (C) an
	23	   injectable-storage CommonJS core under `src/` with a browser adapter.
	24	   Rationale accepted by the user: A matches the existing `app.js` style
	25	   (plain globals, no module system); B was rejected because defaults would be
	26	   restated at each call site and drift, with no versioning story; C was
	27	   rejected because coupling the browser app to the currently-unrelated `src/`
	28	   CLI tree is a larger structural commitment than two preferences justify.
	29	
	30	4. **Tooling — unit tests via Node's built-in `node:test` only.**
	31	   The user explicitly declined a linter/formatter and declined end-to-end
	32	   tests. Zero new dependencies is a hard constraint. Note the consequence the
	33	   user accepted: the pre-paint theme flash is a rendering-timing property no
	34	   Node test can observe, so it is verified by hand.
	35	
	36	5. **Out of scope, confirmed:** `login()` stays a stub; no authentication
	37	   work; `src/index.js` and `src/utils.js` are untouched; no backend or
	38	   network calls.
	39	
	40	Design sections presented in chat and approved individually by the user:
	41	module/data-model/error-handling (section 1), UI behavior (section 2), and
	42	tooling/testing (section 3). The spec is the written form of those three
	43	approved sections.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
