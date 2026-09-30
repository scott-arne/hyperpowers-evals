# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T174300Z-59f1/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-user-identity-design.md

	1	# User Identity for the Webapp — Design
	2	
	3	Date: 2026-09-30
	4	Status: awaiting review
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Origin
	8	
	9	The request as stated was "add a `userId` parameter to the login function so
	10	we can track who logged in." Clarification established that the identity must
	11	identify the person, work across the app, persist, and serve additional forms
	12	that do not exist yet. That is a user-identity concept with storage and shared
	13	consumers, not a function parameter, so the work was reclassified from a
	14	bounded change to an architectural one. The `userId` parameter on `login()`
	15	remains part of the outcome; it is no longer the whole of it.
	16	
	17	## Decisions Taken During Brainstorming
	18	
	19	| Question | Answer | Consequence |
	20	|---|---|---|
	21	| Where does the identity come from? | Undecided — backend may or may not exist later | The source must be swappable behind an interface |
	22	| Does anything make a trust decision on it? | No — descriptive only | A client-minted, forgeable id is adequate |
	23	| Tooling to establish | Unit tests | `node:test`; no linter or formatter this pass |
	24	
	25	Because the identity source is deferred, every consumer must treat the id as
	26	opaque and untrustworthy. Anything needing to trust it stays blocked until
	27	that question is settled.
	28	
	29	## Global Constraints
	30	
	31	- Descriptive use only. The id must never gate access, key private data, or
	32	  back an authorization decision.
	33	- Zero runtime dependencies. The repository has none today; this work adds
	34	  none. Tests use Node's built-in `node:test`.
	35	- No build step, bundler, or module system in the browser code. `index.html`
	36	  loads scripts with bare `<script src>` tags and continues to.
	37	- `login()` stays a stub. `API_ENDPOINT` stays unwired.
	38	- Unit tests accompany the implementation (the tooling selection above).
	39	- This document is a working file and is not committed.
	40	
	41	## Architecture
	42	
	43	A new root-level `identity.js`, loaded by `index.html` before `app.js`, owns
	44	identity. `app.js` continues to own form handling. Functions are declared at
	45	top level in global scope, matching the existing flat-script style; moving to
	46	ES modules would be a structural change this work does not require.
	47	
	48	### Stored shape
	49	
	50	One `localStorage` key, `webapp.identity`, holds a versioned envelope:
	51	
	52	```json
	53	{
	54	  "v": 1,
	55	  "userId": "9f1c2b7e-...",
	56	  "source": "client",
	57	  "createdAt": "2026-09-30T17:43:00.000Z"
	58	}
	59	```
	60	
	61	`v` allows a later migration to recognize and upgrade values written by this
	62	version. `source` distinguishes a browser-minted id from a server-issued one,
	63	which is what keeps the deferred backend decision inexpensive.
	64	
	65	### Public interface
	66	
	67	| Function | Behavior |
	68	|---|---|
	69	| `getUserId()` | Returns the id string. Reads the envelope; on a miss, mints, persists, and returns a new id. Callers never see the envelope. |
	70	| `setUserId(id)` | Writes `id` with `source: "server"`, preserving the existing `createdAt` when one is present and setting it to now otherwise. The documented swap point for when a backend issues real ids. |
	71	| `clearUserId()` | Removes the key and resets the in-memory cache. Used by tests and by a future logout. |
	72	
	73	The resolved id is cached in a module-level variable after the first
	74	`getUserId()` call, so repeated calls neither re-read nor re-parse storage.
	75	`setUserId` and `clearUserId` update that cache. This cache is what makes the
	76	id stable within a page load even when storage is unavailable.
	77	
	78	### Changes to `app.js`
	79	
	80	`login()` gains `userId` as a third positional parameter:
	81	
	82	```js
	83	function login(username, password, userId)
	84	```
	85	
	86	Appending it means no existing call signature breaks. The return value becomes
	87	`{ success: true, user: username, userId }`.
	88	
	89	The submit handler calls `getUserId()` and passes the result into `login()`.
	90	
	91	`getUserId()` is called by the handler rather than from inside `login()`. This
	92	keeps `login()` a pure function of its arguments: testable without a DOM or
	93	storage, and able to accept a server-issued id later without changing its
	94	body. Reaching for identity from inside `login()` would weld it permanently to
	95	browser storage.
	96	
	97	### Data flow
	98	
	99	1. `index.html` loads `identity.js`, then `app.js`.
	100	2. The user submits the form; the handler calls `preventDefault()`, reads
	101	   `#username` and `#password`, and calls `validateForm`.
	102	3. On a valid form, the handler calls `getUserId()`.
	103	4. The handler calls `login(username, password, userId)`.
	104	5. `login()` logs and returns `{ success, user, userId }`.
	105	
	106	Future forms reach identity the same way: call `getUserId()`.
	107	
	108	## Error Handling
	109	
	110	`getUserId()` must never throw. An attribution id that breaks login is worse
	111	than no id. Every failure degrades to returning a usable id.
	112	
	113	| Condition | Behavior |
	114	|---|---|
	115	| Storage unavailable or throws on read (private mode, disabled storage) | Fall back to a module-level in-memory id, stable for the page's lifetime. A persist is still attempted; its failure is ignored |
	116	| Storage throws on write (quota exceeded) | Return the id from memory; persistence degrades silently |
	117	| Corrupt or unparseable JSON | Treat as a miss; discard and mint fresh. No repair attempts |
	118	| Envelope present but `userId` missing or not a string | Treat as a miss; mint fresh |
	119	| Envelope `v` is not 1 | Treat as a miss; mint fresh rather than guess at a newer shape |
	120	| `crypto.randomUUID` unavailable (non-secure context, older browser) | Fall back to `crypto.getRandomValues`; failing that, timestamp plus random |
	121	
	122	The final minting fallback has weaker uniqueness than a UUID. That is
	123	acceptable only because the id is descriptive; it would not be acceptable for
	124	anything trust-bearing.
	125	
	126	### The fence
	127	
	128	`identity.js` carries a header comment stating that the id is client-minted,
	129	trivially forgeable, and must not be used for authorization or to key private
	130	data. This guards against the common drift where an attribution id is later
	131	reused for an access decision.
	132	
	133	## Testing
	134	
	135	Runner: `node --test`, added as `scripts.test` in `package.json`. No
	136	dependencies.
	137	
	138	Two changes make the browser code reachable from Node:
	139	
	140	1. `identity.js` and `app.js` get a CommonJS export guard at the bottom
	141	   (`if (typeof module !== "undefined") module.exports = { ... }`).
	142	   `src/utils.js` already uses this idiom.
	143	2. `app.js`'s `addEventListener` wiring is wrapped in
	144	   `if (typeof document !== "undefined")`. Without it, requiring `app.js` in
	145	   Node throws on the top-level `document.getElementById`. Browser behavior is
	146	   unchanged.
	147	
	148	Storage is faked by assigning a Map-backed stub to `globalThis.localStorage`
	149	before require, so no injection parameter leaks into the public interface.
	150	
	151	### `test/identity.test.js`
	152	
	153	- Mints and persists an id on first call.
	154	- Returns the same id on a second call.
	155	- The written envelope has `v: 1`, `source: "client"`, and an ISO `createdAt`.
	156	- Corrupt JSON mints a fresh id and does not throw.
	157	- An envelope missing `userId` mints a fresh id.
	158	- An envelope with an unrecognized `v` mints a fresh id.
	159	- A storage that throws on read still returns a usable id.
	160	- A storage that throws on write still returns an id stable within the page.
	161	- With `crypto.randomUUID` removed from the global, minting still produces a
	162	  non-empty id (exercises the fallback chain).
	163	- `setUserId` writes the given id with `source: "server"` and preserves an
	164	  existing `createdAt`.
	165	- `clearUserId` removes the key; the next `getUserId()` mints a different id.
	166	
	167	### `test/login.test.js`
	168	
	169	- `login()` returns the `userId` it was given.
	170	- `login()` is pure: identical arguments produce identical results.
	171	- Regression: `validateForm` still rejects a missing username or password with
	172	  `{ valid: false, error: "Missing required fields" }` and accepts a complete
	173	  form.
	174	
	175	## Out of Scope
	176	
	177	- Wiring `API_ENDPOINT` or making any network call. The backend is undecided.
	178	- Adding a `userId` input to the form. The id is minted, never typed.
	179	- Any analytics, logging, or telemetry subsystem. "Track" here means the id is
	180	  available and returned; where it is eventually sent is a separate design.
	181	- Any authorization or access-control use of the id.
	182	- `src/index.js` and `src/utils.js`, an unrelated CommonJS `greet()` sample.
	183	- Linting and formatting infrastructure, not selected this pass.
	184	
	185	## Files Touched
	186	
	187	| File | Change |
	188	|---|---|
	189	| `identity.js` | New. The identity component. |
	190	| `test/identity.test.js` | New. |
	191	| `test/login.test.js` | New. |
	192	| `index.html` | One script tag for `identity.js`, before `app.js`. |
	193	| `app.js` | `login()` signature and return, call site, export guard, DOM-wiring guard. |
	194	| `package.json` | `scripts.test`. |
	195	
	196	## Deferred Decisions
	197	
	198	- **Identity source.** When a backend exists, `setUserId()` receives the
	199	  server id with `source: "server"`. Data already keyed to a client id needs a
	200	  reconciliation decision at that point; `v` and `source` exist so that
	201	  decision has something to act on.
	202	- **Where tracking data goes.** Currently the id is logged to the console with
	203	  the login result. A real destination is a separate brainstorm.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T174300Z-59f1/home/.cache/hyperpowers/codex-review/db211907a2a216b1aa232a50b2cb21af79de170c/run-SFqxemgT/adjudications.md

	1	# Approved design decisions (brainstorming adjudications)
	2	
	3	## Original user requirement, verbatim
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Reclassification
	8	
	9	The request was initially classified as a bounded change. The human partner's
	10	answer to the first clarifying question ("It should identify the actual
	11	person, work across the app, and persist. Other forms will need it later
	12	too.") introduced persistence, app-wide reuse, and future consumers that do
	13	not exist in the repository. The task was escalated to the architectural path
	14	mid-brainstorm. The `userId` parameter remains part of the outcome.
	15	
	16	## Clarifying questions and answers
	17	
	18	1. **Where does the identity come from?** — "It should identify the actual
	19	   person, work across the app, and persist. Other forms will need it later
	20	   too."
	21	2. **Is there a real backend that will issue identity, or is this
	22	   client-side?** — "Not sure yet." The source must remain a deferrable
	23	   decision.
	24	3. **Will anything make a trust or access decision on this id?** —
	25	   "Descriptive only."
	26	4. **Which tooling to establish (no test runner, linter, or formatter exists
	27	   today)?** — Unit tests only. Lint and format were offered and not selected.
	28	
	29	## Approved approach
	30	
	31	Three approaches were presented:
	32	
	33	- **A. Dedicated identity module with a pluggable source** — a new
	34	  `identity.js` owning `getUserId` / `setUserId` / `clearUserId`, backed by
	35	  `localStorage`.
	36	- **B. Inline in `app.js`** — smallest diff, no new file.
	37	- **C. A versioned session record** — persist an object with `source`,
	38	  `createdAt`, `lastLoginAt` rather than a bare id.
	39	
	40	The human partner approved the recommendation: **A, borrowing exactly one
	41	element from C** — store a versioned envelope (`v`, `userId`, `source`,
	42	`createdAt`) rather than a bare string, while the accessor returns just the id
	43	string. The remainder of C (`lastLoginAt`, reconciliation logic) was
	44	explicitly excluded under YAGNI until the backend question resolves.
	45	
	46	Rationale recorded at approval time: A over B because the partner stated other
	47	forms will need the identity, making the boundary worth establishing while
	48	there are zero call sites to migrate; the borrow from C because the unresolved
	49	backend question makes an unversioned bare string the one genuinely expensive
	50	thing to undo.
	51	
	52	Both design sections (1: architecture, components, data flow; 2: error
	53	handling, testing, scope boundaries) were presented and approved by the human
	54	partner before the spec was written.
	55	
	56	## Codex approach gate
	57	
	58	The approach gate fired and ran. Preflight returned `ok`
	59	(codex-plugin-cc `0.0.0-stub`), but the one-shot `task` call returned an empty
	60	payload `{}` — no approaches. Per the approach gate's contract this was noted
	61	once and not retried. No independent Codex approaches were folded into the
	62	shortlist above.
	63	
	64	## Codebase facts the spec relies on
	65	
	66	- `app.js` (28 lines) is the whole webapp: `API_ENDPOINT` (declared, unused),
	67	  `login(username, password)` (a stub that logs and returns
	68	  `{ success: true, user: username }`), `validateForm(formData)`, and a
	69	  `submit` listener on `#login-form` that is `login()`'s only call site.
	70	- `index.html` (15 lines) loads `app.js` with a bare `<script src>` tag, not
	71	  `type="module"`. It has one form with `#username` and `#password` inputs.
	72	- `src/index.js` and `src/utils.js` are an unrelated CommonJS `greet()`
	73	  sample. `src/utils.js` uses `module.exports = { greet }`.
	74	- `package.json` has no `scripts` field and no dependencies.
	75	- No `userId`, identity, session, storage, analytics, or logging code exists
	76	  anywhere in the repository. No `.gitignore` existed before this work.
	77	- Branch `feature/webapp-enhancement`; working tree was clean at start.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
