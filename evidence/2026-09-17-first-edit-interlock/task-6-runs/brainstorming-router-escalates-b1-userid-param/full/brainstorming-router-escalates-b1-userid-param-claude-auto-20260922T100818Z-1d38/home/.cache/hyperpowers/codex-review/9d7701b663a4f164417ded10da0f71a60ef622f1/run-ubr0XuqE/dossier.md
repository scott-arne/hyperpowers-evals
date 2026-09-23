# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260922T100818Z-1d38/coding-agent-workdir/docs/hyperpowers/specs/2026-09-22-userid-tracking-design.md

	1	# userId Tracking — Design
	2	
	3	Date: 2026-09-22
	4	
	5	## Problem
	6	
	7	The login flow cannot identify who logged in. `login(username, password)`
	8	in `app.js` logs a username and returns `{ success: true, user: username }`.
	9	A username is what someone typed, not a stable identity: it can change, and
	10	nothing else in the app can correlate activity to a person.
	11	
	12	The requirement is a `userId` that the caller passes in, that works across
	13	the app, that persists, and that forms not yet written can use.
	14	
	15	## Scope
	16	
	17	In scope: a server-assigned user identifier, persisted client-side, readable
	18	by any part of the app, and passed into `login` as continuity information.
	19	
	20	Out of scope: a logout UI, a real authentication backend, authorization,
	21	and any change to `src/index.js` or `src/utils.js` (Node CommonJS files the
	22	browser app never loads).
	23	
	24	## Global Constraints
	25	
	26	- **The userId is an identifier for tracking, never an authorization
	27	  credential.** The server may log it and attribute actions to it. The
	28	  server must never grant access based on a client-supplied copy, because
	29	  anyone can edit client-side storage. Any future server work inherits this
	30	  constraint.
	31	- Match the existing code style: plain browser scripts, globals, no
	32	  bundler, no framework, no runtime dependencies.
	33	- `index.html` must keep opening directly from the filesystem. This rules
	34	  out ES modules, which CORS blocks over `file://`.
	35	- Unit tests for `session.js` using Node's built-in test runner. No new
	36	  dependencies in `package.json`.
	37	
	38	## Decisions
	39	
	40	Each of these was chosen over stated alternatives during brainstorming.
	41	
	42	| Decision | Chosen | Rejected because |
	43	|---|---|---|
	44	| ID origin | Server assigns on successful login | A client-generated ID identifies a browser, not a person. An upstream/SSO source would need a system that does not exist here. |
	45	| Storage | `localStorage`, key `app.userId` | `sessionStorage` leaves returning users unidentified and isolates tabs. An `HttpOnly` cookie cannot be read by JavaScript, so callers could not pass it. |
	46	| `login` signature | `login(username, password, previousUserId)` | A required third parameter breaks the first-ever login, which has no ID. Returning the ID without any parameter loses the returning-user link. |
	47	| Sharing mechanism | New `session.js` plain script | ES modules force a local web server. Inlining in `app.js` makes future forms load the login handler. |
	48	
	49	## Architecture
	50	
	51	```
	52	index.html   <script src="session.js">   loaded first
	53	             <script src="app.js">
	54	
	55	session.js   Session.getUserId() / setUserId(id) / clear()     [new]
	56	             sole owner of identity storage
	57	
	58	app.js       login(username, password, previousUserId)
	59	             submit handler: read previous -> login -> store new
	60	```
	61	
	62	All storage logic lives in `session.js`. `app.js` is a consumer and contains
	63	no `localStorage` access. Future forms depend only on the three `Session`
	64	functions, not on how or where the ID is stored — so a later move to
	65	`sessionStorage`, cookies, or modules changes one file.
	66	
	67	## Components
	68	
	69	### `session.js` (new)
	70	
	71	Exposes one global, `Session`, with three functions:
	72	
	73	- `getUserId()` — returns the stored ID, or `null` if none is stored or
	74	  storage is unavailable. Callers treat both cases identically.
	75	- `setUserId(id)` — persists the ID.
	76	- `clear()` — removes it. This is the logout path.
	77	
	78	`clear()` has no caller in this change. The app has no logout. It is
	79	included because "cleared on explicit logout" was part of the persistence
	80	decision, and omitting it would mean reopening this file when logout is
	81	added. No logout button is added here.
	82	
	83	The file also attaches `Session` to `module.exports` when `module` is
	84	defined, so the Node test runner can require it. This mirrors the existing
	85	CommonJS style in `src/utils.js` and is inert in the browser.
	86	
	87	### `app.js` (modified)
	88	
	89	`login(username, password, previousUserId)`. The third parameter is
	90	optional and defaults to `null`. It carries **who this browser was**, never
	91	who it is now — the current user's ID cannot be known before authenticating.
	92	The name `previousUserId` is deliberate: two IDs are in play during one
	93	call, and a bare `userId` would invite confusing them.
	94	
	95	Return value gains the server-assigned ID:
	96	`{ success: true, user: username, userId }`.
	97	
	98	`login` remains a stub with no server behind it, so it fabricates the ID.
	99	That line is commented as the seam where a real API response takes over.
	100	The ID's origin is server-side by design even while the server is imaginary.
	101	
	102	### `index.html` (modified)
	103	
	104	One added `<script src="session.js">` before the existing `app.js` tag.
	105	`app.js` only reaches for `Session` inside the submit handler, so either
	106	order would work at runtime; listing it first states the dependency
	107	where a reader will see it.
	108	
	109	## Data Flow
	110	
	111	1. User submits the form. Existing validation runs unchanged.
	112	2. Handler calls `Session.getUserId()` — `null` on a first-ever visit.
	113	3. Handler calls `login(username, password, previousUserId)`.
	114	4. On success, handler calls `Session.setUserId(result.userId)`.
	115	5. Any other form, now or later, calls `Session.getUserId()` and gets a
	116	   value without knowing anything about login.
	117	
	118	## Error Handling
	119	
	120	`localStorage` **throws** rather than returning `null` when it is
	121	unavailable — Safari private mode, disabled storage, some enterprise
	122	policies. Unhandled, that would break the login form entirely.
	123	
	124	All three `Session` functions wrap storage access in `try`/`catch` and fall
	125	back to an in-memory value held in the module closure. The app degrades to
	126	"identity works for this page load" instead of failing the form. This is a
	127	deliberate trade: a silently non-persistent ID is better than a broken
	128	login, given the ID is for tracking rather than access.
	129	
	130	## Testing
	131	
	132	Node's built-in runner (`node --test`), added as `"test": "node --test"` in
	133	`package.json`. No dependencies.
	134	
	135	`session.js` is required directly; tests install a fake `localStorage` on
	136	`globalThis` before each case.
	137	
	138	Cases:
	139	
	140	1. `getUserId()` returns `null` when nothing is stored.
	141	2. `setUserId(id)` then `getUserId()` returns that id.
	142	3. `clear()` then `getUserId()` returns `null`.
	143	4. `setUserId` overwrites a previously stored id.
	144	5. Storage that throws on read: `getUserId()` returns `null`, does not throw.
	145	6. Storage that throws on write: `setUserId()` does not throw, and
	146	   `getUserId()` returns the value from the in-memory fallback.
	147	
	148	`app.js` is not unit tested: it touches `document` at load time and has no
	149	DOM harness. Its verification is manual — open `index.html`, submit the
	150	form, confirm the console shows a `userId` and that reloading and submitting
	151	again passes the prior ID as `previousUserId`. This gap is stated rather
	152	than papered over; closing it would mean the end-to-end tooling that was
	153	explicitly not chosen.
	154	
	155	## Risks
	156	
	157	- **Script-readable identifier.** Any JavaScript on the page, including
	158	  injected script, can read `app.userId`. Accepted because the ID is not a
	159	  credential. It would be unacceptable for a session token.
	160	- **Shared machines.** A persisted ID outlives the browser session, so the
	161	  next person on the same browser inherits the previous user's ID until a
	162	  new login. Explicit logout calling `Session.clear()` is the mitigation,
	163	  and no logout exists yet.
	164	- **Stub ID.** The fabricated ID is not stable across page loads until a
	165	  real backend assigns one. Tracking is only as meaningful as the server
	166	  that eventually mints the value.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260922T100818Z-1d38/home/.cache/hyperpowers/codex-review/9d7701b663a4f164417ded10da0f71a60ef622f1/run-ubr0XuqE/adjudications.md

	1	# Approved design context — userId tracking
	2	
	3	## Original user request
	4	
	5	"Add a userId parameter to the login function so we can track who logged in."
	6	
	7	Follow-up when asked where userId should come from: "The caller passes it in.
	8	It should work across the app, it should persist, and other forms will need
	9	it later."
	10	
	11	## Repository state before the change
	12	
	13	- `app.js` — `login(username, password)` stub at line 4; logs the username,
	14	  returns `{ success: true, user: username }`. One caller: the form submit
	15	  handler at line 23. `login` and `validateForm` are bare globals.
	16	- `index.html` — loads `app.js` via a plain `<script>` tag (line 13). No
	17	  modules, no bundler, no framework. Opens directly from the filesystem.
	18	- `src/index.js`, `src/utils.js` — CommonJS Node files the browser app never
	19	  loads. Out of scope.
	20	- `package.json` — no dependencies, no scripts, no test runner. No tests
	21	  anywhere in the repo.
	22	
	23	## Decisions the user explicitly approved (each chosen over stated alternatives)
	24	
	25	1. **ID origin: server assigns on successful login.** Rejected: client-side
	26	   `crypto.randomUUID()` (identifies a browser, not a person); an upstream
	27	   SSO/URL-param source (no such system exists here).
	28	
	29	2. **Storage: `localStorage`, cleared on explicit logout.** Rejected:
	30	   `sessionStorage` (returning users unidentified, tabs isolated); cookie
	31	   (the secure `HttpOnly` form is unreadable from JavaScript, which
	32	   contradicts the caller-passes-it requirement).
	33	
	34	3. **`login` signature: `login(username, password, previousUserId)`** with the
	35	   third parameter optional. Rejected: a required third parameter (breaks the
	36	   first-ever login, which has no ID); no parameter at all (does not meet the
	37	   user's literal request and loses returning-user correlation).
	38	
	39	4. **Sharing: a new `session.js` loaded as a plain `<script>`** before
	40	   `app.js`, exposing a `Session` global. Rejected: ES modules (CORS blocks
	41	   them over `file://`, so `index.html` would need a local web server);
	42	   inlining in `app.js` (future forms would have to load the login handler).
	43	
	44	5. **Tooling: unit tests for `session.js` only.** The user selected unit tests
	45	   and did not select linting/formatting or end-to-end tests. Constraint: no
	46	   new dependencies, so Node's built-in `node --test` runner.
	47	
	48	## Stated constraints carried into the spec
	49	
	50	- The userId is an identifier for tracking, never an authorization credential.
	51	  The server must never grant access based on a client-supplied copy.
	52	- Match the existing style: plain browser scripts, globals, zero runtime
	53	  dependencies.
	54	- `index.html` must keep opening directly from the filesystem.
	55	
	56	## Explicitly out of scope
	57	
	58	A logout UI, a real authentication backend, authorization, and any change to
	59	`src/index.js` or `src/utils.js`.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
