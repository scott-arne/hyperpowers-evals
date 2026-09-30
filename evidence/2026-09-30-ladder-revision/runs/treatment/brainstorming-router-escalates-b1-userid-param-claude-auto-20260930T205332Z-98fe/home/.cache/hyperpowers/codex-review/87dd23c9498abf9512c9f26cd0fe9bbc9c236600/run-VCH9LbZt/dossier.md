# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T205332Z-98fe/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-login-session-userid-design.md

	1	# Login Session userId — Design
	2	
	3	Date: 2026-09-30
	4	Status: Approved design, pending implementation plan
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The app needs to know which user logged in, and that identity must remain
	10	available across the app for forms that do not exist yet.
	11	
	12	The request as originally phrased was "add a `userId` parameter to the login
	13	function." That phrasing does not survive contact with the code: `login()` has
	14	one caller, the form submit handler, and nothing at that call site has a
	15	`userId` to pass. The only identity available before login is the username.
	16	
	17	Clarification established that the userId is issued by the server on
	18	successful login. It is therefore an **output** of logging in, not an input to
	19	it. A `userId` parameter would require the caller to already know the answer
	20	that login exists to produce.
	21	
	22	The real requirement is a small piece of shared state: login establishes a
	23	userId, and later forms read it.
	24	
	25	## Scope
	26	
	27	In scope:
	28	
	29	- A shared, `sessionStorage`-backed store for the logged-in userId.
	30	- `login()` writing that store on success and clearing it on failure.
	31	- Unit test infrastructure and lint/format tooling (see Global Constraints).
	32	
	33	Out of scope, deliberately:
	34	
	35	- Analytics or telemetry emission. "Track who logged in" resolved to storing
	36	  and exposing the userId; no events are sent anywhere.
	37	- A real call to `API_ENDPOINT`. `login()` stays a stub; the userId in its
	38	  response is a clearly-marked placeholder for the server-issued value.
	39	- Authentication, logout UI, session expiry, token handling.
	40	- The unrelated Node code in `src/`.
	41	
	42	## Decisions
	43	
	44	Each of these was settled with the requester during brainstorming.
	45	
	46	| Decision | Choice | Why |
	47	|---|---|---|
	48	| Where userId originates | Server issues it on successful login | It is login's output, not its input |
	49	| Persistence | `sessionStorage` | Survives reloads and in-tab navigation; leaves no identifier on disk after the tab closes |
	50	| Sharing mechanism | Classic script attaching `window.Session` | No build step exists; `index.html` must keep working when opened from `file://` |
	51	| Who writes the store | `login()` itself | One writer, many readers; the write cannot be forgotten by a caller |
	52	| Scope of "track" | Store and expose only | No analytics in this change |
	53	
	54	`localStorage` was rejected: persisting an identifier on disk past the browser
	55	session is a product decision about staying logged in, and would oblige a
	56	clear-on-logout path this app has no logout to hang off.
	57	
	58	A `Session.login()` facade was considered and rejected as premature — it
	59	builds an auth surface for a second consumer that does not exist yet.
	60	
	61	## Architecture
	62	
	63	Three files. One is new.
	64	
	65	### `session.js` (new)
	66	
	67	A classic script loaded before `app.js`. An IIFE keeps the storage key and
	68	fallback state private, matching the file-scope style already in `app.js`.
	69	
	70	Public interface on `window.Session`:
	71	
	72	```
	73	getUserId()    -> string | null
	74	setUserId(id)  -> void
	75	clearUserId()  -> void
	76	```
	77	
	78	Storage key: `app.userId`, in `sessionStorage`.
	79	
	80	The interface is three functions rather than a general key-value session bag.
	81	There is one value today; a wider interface would guess at what later forms
	82	need. Widening later is cheap, narrowing is not.
	83	
	84	### `index.html`
	85	
	86	One added line: `<script src="session.js"></script>` immediately before the
	87	existing `app.js` tag. A classic script guarantees the ordering.
	88	
	89	### `app.js`
	90	
	91	`login()` keeps its exact existing signature, `login(username, password)`. It
	92	gains no `userId` parameter. What changes is internal: its stubbed response
	93	carries a `userId`, and it persists that value.
	94	
	95	## Data flow
	96	
	97	1. Submit handler reads username and password, runs `validateForm`
	98	   (unchanged).
	99	2. `login(username, password)` runs. Its stub response gains a `userId`
	100	   field, marked in a comment as standing in for a server-issued value. The
	101	   stub value is `` `u_${username}` `` — deterministic, so tests are not
	102	   random, and visibly synthetic, so it is never mistaken for a real ID.
	103	3. On success, `login()` calls `Session.setUserId(response.userId)`.
	104	4. On failure, `login()` calls `Session.clearUserId()`, so a failed login
	105	   cannot leave a previous user's ID readable by the next form.
	106	5. Later forms call `Session.getUserId()` once `session.js` has loaded. They
	107	   do not know storage exists.
	108	
	109	The return value keeps `{ success, user }` and adds `userId`, so existing
	110	readers do not break.
	111	
	112	### Forward compatibility
	113	
	114	When `login()` becomes asynchronous and actually calls `API_ENDPOINT`, it
	115	returns a promise of the same response shape and step 3 moves inside the
	116	resolution handler. Callers change once, at that point. This design does not
	117	pre-build for it.
	118	
	119	## Error handling
	120	
	121	`sessionStorage` is not reliably available. Reading `window.sessionStorage`
	122	can throw `SecurityError` when cookies are blocked or the page is sandboxed,
	123	and `setItem` can throw `QuotaExceededError` in some private-browsing modes.
	124	Because `index.html` must keep working when opened from disk, this is a live
	125	path.
	126	
	127	- **Probe once, wrap every access.** The store probes `sessionStorage` on load
	128	  inside a try/catch. If unusable, it falls back to a module-private
	129	  in-memory variable and emits a single `console.warn` at fallback time — not
	130	  on every call.
	131	- **Degraded mode is stated, not hidden.** In fallback, `Session` works for
	132	  the life of the page but does not survive navigation. Login still works.
	133	- **`getUserId()` never throws.** It returns `null` for absent, unreadable,
	134	  and storage-unavailable alike, so callers have one condition to check and
	135	  `null` always means nobody is logged in.
	136	- **`setUserId()` refuses junk.** A non-string or empty id is rejected with a
	137	  `console.warn` and not stored; it does not throw, and it leaves any
	138	  previously stored value untouched. This prevents the string `"undefined"`
	139	  being persisted and later read as a truthy ID for a user who never logged
	140	  in.
	141	- **Failed login clears**, per data flow step 4.
	142	
	143	Existing `console.log` / `console.error` calls in the submit handler are left
	144	as they are.
	145	
	146	## Testing
	147	
	148	`session.js` is the unit worth testing; its behavior is fully specified by the
	149	error-handling rules above.
	150	
	151	Cases:
	152	
	153	- stores and returns an id
	154	- returns `null` when nothing is stored
	155	- refuses a non-string id
	156	- refuses an empty-string id
	157	- `clearUserId()` removes a stored id
	158	- falls back cleanly when `sessionStorage` access throws, and `getUserId()`
	159	  still returns `null` rather than propagating
	160	
	161	The storage-unavailable case matters most: it is the one that manual clicking
	162	never reaches.
	163	
	164	Login integration is then two assertions: after a successful `login()`,
	165	`Session.getUserId()` returns the response's userId; after a failed one, it
	166	returns `null`.
	167	
	168	## Global Constraints
	169	
	170	These apply to every task in the implementation plan.
	171	
	172	- **Unit tests:** vitest with jsdom. Adds two devDependencies and a `test`
	173	  script to a project that currently declares none.
	174	- **Lint and format:** biome. One devDependency, with a check script.
	175	- **No end-to-end tests** and no mutation testing. Judged disproportionate for
	176	  a two-field form.
	177	- `index.html` must continue to work when opened directly from `file://`. No
	178	  bundler, no `type="module"`, no build step.
	179	- No new runtime dependencies. The added tooling is dev-only.
	180	- `login()`'s signature does not change.
	181	- Nothing in `src/` is touched.
	182	
	183	## Assumptions
	184	
	185	- Assumption: the server will return a userId field on successful
	186	  authentication; validate via the API contract when `API_ENDPOINT` is
	187	  actually wired up. Until then the stub's userId is a placeholder and is
	188	  labeled as one in the code.
	189	- Assumption: the "other forms" that will read the userId are pages in this
	190	  same app, served from the same origin, so they share the `sessionStorage`
	191	  partition; validate when the first such form is specified. A form on a
	192	  different origin would not see the value.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T205332Z-98fe/home/.cache/hyperpowers/codex-review/87dd23c9498abf9512c9f26cd0fe9bbc9c236600/run-VCH9LbZt/adjudications.md

	1	# Approved design context — decisions adjudicated with the requester
	2	
	3	## Original request (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Clarifying questions and answers
	8	
	9	1. **Where should the userId come from?**
	10	   "It should work across the app and persist; other forms will need it later."
	11	   (This answer escalated the task from a bounded change to an architectural
	12	   one: it names a shared persistent store the repo does not have.)
	13	
	14	2. **When does the userId first come into existence?**
	15	   Login creates it — the server issues it on successful login. Therefore it is
	16	   login's output, not an input parameter. `login()`'s signature does not
	17	   change.
	18	
	19	3. **How long should the stored userId persist?**
	20	   `sessionStorage`. `localStorage` was explicitly rejected: persisting an
	21	   identifier on disk past the browser session is a product decision about
	22	   staying logged in and would require a clear-on-logout path this app has no
	23	   logout for.
	24	
	25	4. **How should the store be shared with app.js and future forms?**
	26	   Plain global script attaching `window.Session`. `index.html` must keep
	27	   working when opened directly from `file://`, so no ES modules and no build
	28	   step.
	29	
	30	5. **What does "track who logged in" need to do right now?**
	31	   Store and expose the userId only. No analytics emission, no backend
	32	   telemetry.
	33	
	34	6. **Which approach?**
	35	   Approach A — `login()` writes the store itself. Rejected alternatives:
	36	   caller-writes (persistence becomes caller discipline) and a
	37	   `Session.login()` facade (premature; builds an auth surface for a second
	38	   consumer that does not exist).
	39	
	40	7. **Which tooling?**
	41	   Unit tests via vitest + jsdom, and lint/format via biome. End-to-end
	42	   (Playwright) and mutation testing explicitly declined as disproportionate.
	43	
	44	## Approvals recorded
	45	
	46	- Design sections 1 (Components) and 2 (Data flow) were presented in chat and
	47	  approved by the requester ("looks good, go ahead").
	48	- Sections 3 (Error handling) and 4 (Testing and tooling) were presented with
	49	  the tooling selection above.
	50	
	51	## Notes for the reviewer
	52	
	53	- The Codex approach gate was attempted before approaches were proposed. The
	54	  companion in this environment is a stub (`codexVersion: 0.0.0-stub`) and
	55	  returned an empty result, so no independent Codex approaches were folded in.
	56	- The repository is a minimal static webapp: `index.html`, `app.js`,
	57	  `package.json` (no dependencies, no scripts), `README.md`, plus unrelated
	58	  CommonJS Node code in `src/` that this change does not touch.
	59	- `login()` is currently a stub that never calls `API_ENDPOINT` and has exactly
	60	  one caller (the form submit handler in `app.js`).


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
