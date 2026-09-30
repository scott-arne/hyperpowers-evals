# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T220837Z-fd05/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-anonymous-user-id-tracking-design.md

	1	# Anonymous User ID Tracking — Design
	2	
	3	Date: 2026-09-30
	4	Status: Approved for planning
	5	
	6	## Problem
	7	
	8	`login(username, password)` in `app.js` has no way to report *who* logged in
	9	beyond the username typed into the form. The request was to add a `userId`
	10	parameter so logins can be attributed.
	11	
	12	Investigation showed there is no source for such a value: the only call site
	13	(`app.js`, the form submit handler) has just `username` and `password` in
	14	scope, `index.html` has no field carrying an identifier, and the repository
	15	contains no user record, session, or auth state. `API_ENDPOINT` is a stub that
	16	is never called.
	17	
	18	The identifier therefore has to be created by the application itself, stored
	19	somewhere, and made available to `login` and to forms that do not exist yet.
	20	That is a small subsystem, not a parameter.
	21	
	22	## Decisions
	23	
	24	Each of these was chosen explicitly during brainstorming.
	25	
	26	| Decision | Choice | Rationale |
	27	|---|---|---|
	28	| Origin of the ID | Client-minted anonymous UUID | No backend exists; `API_ENDPOINT` is a stub. Identifies a browser, not a person. |
	29	| Storage | `localStorage` | Satisfies "persist" across restarts. No server-side correlation to gain from a cookie while the API is stubbed. |
	30	| Module loading | Classic script + namespace global | Matches the existing `app.js` pattern; no build step; keeps `index.html` openable over `file://`. |
	31	| Who supplies the value | The caller passes it into `login` | Keeps `login` a pure function of its arguments and testable without stubbing browser storage. |
	32	| Tooling | `node --test`, zero dependencies | The fallback paths in `getUserId` need coverage; the repo had no runner. |
	33	
	34	## Scope boundary
	35	
	36	This identifier is for **logging and correlation only**.
	37	
	38	It is client-minted and stored in `localStorage`, which the user can read,
	39	edit, and delete. It must never gate an authorization decision, be treated as
	40	proof of identity, or be trusted by a server as authentic. If a future backend
	41	needs trustworthy identity, that is a server-issued value flowing *out* of
	42	authentication, not this one flowing in.
	43	
	44	## Privacy note
	45	
	46	A persistent identifier that follows a person across visits is a tracking
	47	identifier. Under GDPR/ePrivacy this is generally personal data requiring a
	48	lawful basis and often consent, even though the value is a random UUID with no
	49	name attached.
	50	
	51	Assumption: this app has no EU users today, or consent is handled outside this
	52	change. Validate via a check with whoever owns privacy for the app before the
	53	identifier is used for anything beyond local `console.log` output. If consent
	54	is required, the mint step gains a consent check; the rest of this design is
	55	unaffected.
	56	
	57	## Architecture
	58	
	59	Three files: one new, two modified.
	60	
	61	### New: `tracking.js` (repository root)
	62	
	63	The repository root holds browser code (`app.js`, `index.html`); `src/` holds
	64	Node/CommonJS code. `tracking.js` is browser code and belongs at the root.
	65	
	66	Exposes a single namespace global with one function:
	67	
	68	```
	69	window.Tracking = { getUserId() }
	70	```
	71	
	72	`getUserId()` is read-through-and-mint:
	73	
	74	1. Attempt to read `localStorage` key `app.userId`.
	75	2. If the value is a non-empty string, return it.
	76	3. Otherwise generate a UUID, attempt to store it, and return it.
	77	
	78	Nothing is minted at script load. An ID is created only on the first call, so a
	79	visitor who never interacts with a form is never assigned one.
	80	
	81	The read-through shape is what makes the identifier work across the app without
	82	coordination: any form calls the same function and receives the same value.
	83	There is no initialization step to forget and no ordering requirement beyond
	84	the script tag.
	85	
	86	ID generation prefers `crypto.randomUUID()` and falls back to a UUIDv4 built
	87	from `crypto.getRandomValues`. The fallback is required, not defensive padding:
	88	`crypto.randomUUID` is only available in a secure context, and this page is
	89	intended to remain openable over `file://`, where that guarantee varies by
	90	browser.
	91	
	92	The file ends with a guarded CommonJS export
	93	(`if (typeof module !== "undefined" && module.exports)`) so the module can be
	94	loaded by the test runner. This is inert in the browser.
	95	
	96	### Modified: `index.html`
	97	
	98	One line added: `<script src="tracking.js"></script>` immediately before the
	99	existing `app.js` tag.
	100	
	101	Both are classic scripts, so this ordering is load-bearing. A future form that
	102	adds its own script must also come after `tracking.js`.
	103	
	104	### Modified: `app.js`
	105	
	106	- `login(username, password)` becomes `login(username, password, userId)`.
	107	  The parameter is appended last, so any two-argument call continues to work.
	108	- The return value gains the field: `{ success, user, userId }`.
	109	- The log line includes the identifier alongside the username.
	110	- The submit handler calls `login(username, password, Tracking.getUserId())`.
	111	- The top-level DOM wiring is wrapped in `if (typeof document !== "undefined")`
	112	  so the file can be loaded outside a browser.
	113	- A guarded `module.exports` tail is added, as in `tracking.js`.
	114	
	115	The last two are inert in the browser and exist solely so `login` can be unit
	116	tested. Today the file throws immediately when loaded in Node, because
	117	`document.getElementById("login-form")` runs at top level.
	118	
	119	## Data flow
	120	
	121	1. Page loads. `tracking.js` defines `window.Tracking`. No storage access, no
	122	   ID minted.
	123	2. User submits the form. `validateForm` runs first and short-circuits on
	124	   missing fields, unchanged.
	125	3. On a valid form, `Tracking.getUserId()` reads or mints the identifier.
	126	4. `login(username, password, userId)` is called.
	127	5. `login` logs the username and identifier, and returns
	128	   `{ success: true, user: username, userId }`.
	129	
	130	## Error handling
	131	
	132	Governing rule: **tracking must never break login.** Observability that takes
	133	down the flow it observes is worse than no observability.
	134	
	135	| Condition | Behavior |
	136	|---|---|
	137	| `localStorage` read or write throws (private browsing, storage disabled by policy, quota exhausted, sandboxed iframe) | Fall back to a module-scoped in-memory ID minted once per page load. Emit one `console.warn` for the page, not one per call. Correlation narrows to a single page visit; the app keeps working. |
	138	| Stored value is absent, empty, or not a string | Treat as absent and re-mint. `localStorage` is user-writable, so presence is not validity. |
	139	| ID generation fails entirely | `getUserId()` returns `null`. |
	140	| `userId` is `null` or `undefined` at `login` | `login` proceeds normally and records the value as-is. It performs no validation, because the field is a logging passthrough. |
	141	
	142	No path in `getUserId()` propagates an exception to the submit handler.
	143	
	144	## Testing
	145	
	146	Runner: `node --test`, invoked through `npm test`. No dependencies added.
	147	`package.json` gains a `scripts.test` entry.
	148	
	149	Tests live in `test/tracking.test.js` and drive the modules through their
	150	guarded CommonJS exports, with `localStorage` and `crypto` supplied as stubs.
	151	
	152	Cases:
	153	
	154	1. Mints and stores an ID when storage is empty.
	155	2. Returns the same ID on a second call rather than re-minting.
	156	3. Re-mints when the stored value is corrupt, empty, or a non-string.
	157	4. Falls back to an in-memory ID when `localStorage` throws, and returns a
	158	   stable value across calls within the page.
	159	5. Warns exactly once when storage is unavailable, not once per call.
	160	6. `login` includes `userId` in its return value.
	161	7. `login` succeeds when `userId` is `null`.
	162	
	163	## Out of scope
	164	
	165	- Sending the identifier to a server. `API_ENDPOINT` remains an unused stub.
	166	- Any authorization or identity use of the value (see Scope boundary).
	167	- Migrating the repository to ES modules or adding a bundler. Considered and
	168	  rejected: ESM would require serving the page over HTTP instead of opening it
	169	  directly, and nothing here justifies a build pipeline.
	170	- A linter or formatter. Offered and declined for now.
	171	- Wiring the identifier into other forms. None exist yet; `getUserId()` is
	172	  shaped so they need no new plumbing when they do.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T220837Z-fd05/home/.cache/hyperpowers/codex-review/a3a569d10b7d48941e359bb12d5113dfe6aeed62/run-6WOKlhOg/adjudications.md

	1	# Approved design context — original request and decisions
	2	
	3	## Original request (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Repository facts established before the questions
	8	
	9	- `app.js` (repo root) defines `login(username, password)` and a form submit
	10	  handler that is its only caller. The handler has only `username` and
	11	  `password` in scope, both read from DOM inputs.
	12	- `index.html` loads `app.js` with a plain `<script src="app.js">` tag. It has
	13	  two inputs, username and password. No field carries an identifier.
	14	- `src/index.js` and `src/utils.js` use CommonJS and are Node-side.
	15	- `package.json` has no scripts, no dependencies, no devDependencies.
	16	- `API_ENDPOINT` in `app.js` is a stub constant; nothing ever calls it.
	17	- There is no user record, session, auth state, or storage anywhere in the repo.
	18	
	19	## Clarifying questions and the human partner's answers
	20	
	21	1. **Where should userId come from at the call site?**
	22	   Answer: "Caller passes it. It should work across the app and persist; other
	23	   forms will need it later."
	24	   (This answer upgraded the task from bounded to architectural, because it
	25	   names persistence and reuse across components that do not exist yet.)
	26	
	27	2. **What produces the userId value before login is called?**
	28	   Answer: Client-minted anonymous ID.
	29	
	30	3. **Where should it be stored and how long should it live?**
	31	   Answer: `localStorage`.
	32	
	33	4. **How should the shared module load in the browser?**
	34	   Answer: Classic script plus namespace global (not ES modules, not a bundler).
	35	
	36	5. **Tooling for a repo that has none?**
	37	   Answer: Unit tests only. Lint/format declined.
	38	
	39	6. **Design section 1 (three-file component breakdown)?** Approved.
	40	
	41	7. **Design section 2 (error handling, plus the DOM guard and `module.exports`
	42	   tail in `app.js` so `login` is testable)?** Approved both.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
