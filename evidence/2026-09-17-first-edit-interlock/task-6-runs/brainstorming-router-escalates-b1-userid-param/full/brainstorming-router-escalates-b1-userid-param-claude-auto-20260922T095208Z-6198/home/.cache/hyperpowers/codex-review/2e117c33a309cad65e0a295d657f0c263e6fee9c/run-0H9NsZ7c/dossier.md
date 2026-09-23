# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260922T095208Z-6198/coding-agent-workdir/docs/hyperpowers/specs/2026-09-22-current-user-session-store-design.md

	1	# Current-User Session Store — Design
	2	
	3	Date: 2026-09-22
	4	Status: approved in brainstorming, pending spec review
	5	
	6	## Problem
	7	
	8	The app has no notion of who is currently signed in. `login()` in `app.js`
	9	logs the username to the console and returns it to its single caller, and the
	10	value is discarded from there. Other forms planned for this app need to know
	11	who the user is, and that identity needs to survive a page reload.
	12	
	13	The original request was to add a `userId` parameter to `login()`. That was
	14	rejected during brainstorming for two reasons. `login()` already receives the
	15	identifier as `username`, so a second caller-supplied identity field is
	16	redundant; and on an authentication entry point a caller-controlled identity
	17	is an unverified claim, which becomes an impersonation vector once the stub at
	18	`app.js:6` is replaced by a real POST to `API_ENDPOINT`. The identity this
	19	subsystem stores is the one `login()` was given, never one a caller invented.
	20	
	21	## Goals
	22	
	23	- A single place that answers "who is signed in right now?"
	24	- The answer survives page reloads and browser restarts.
	25	- Any future form can read it without depending on `app.js`.
	26	- The stored identity expires on its own.
	27	
	28	## Non-goals
	29	
	30	- Event or audit logging. This stores identity state, not history. An event
	31	  log was considered and deferred; if it is built later it reads the current
	32	  user from this store.
	33	- Authentication itself. `login()` remains the stub it is today.
	34	- Anything on the Node side (`src/index.js`, `src/utils.js`). Those share no
	35	  code with the browser half and are untouched.
	36	- A logout control. `clear()` exists for one, but no UI calls it yet.
	37	
	38	## Decisions
	39	
	40	Each of these was chosen over stated alternatives during brainstorming.
	41	
	42	| Decision | Chosen | Rejected |
	43	|---|---|---|
	44	| What is tracked | Identity state (current user) | Event log; both |
	45	| Persistence | `localStorage` with an expiry stamp | `sessionStorage`; `localStorage` with no expiry; in-memory only |
	46	| Consumption | Namespaced global on a second script tag | ES modules; a bundler; inlining in `app.js` |
	47	| Session lifetime | 24 hours | 8 hours; 30 days |
	48	| Tooling | Unit tests | Lint/format; end-to-end tests |
	49	
	50	Two of these carry consequences worth restating.
	51	
	52	**ES modules were rejected on a concrete cost, not taste.** Module scripts are
	53	blocked under the `file://` protocol, so adopting them would mean `index.html`
	54	only works when served over HTTP. The current page opens from disk. Moving one
	55	small file from a global to an `export` later is a few lines, so this is the
	56	cheap decision to reverse; the storage format is the expensive one.
	57	
	58	**24 hours is a security-posture decision.** Because no logout control exists,
	59	expiry is currently the only mechanism that ever clears a stored identity, and
	60	every future form that trusts this store inherits that lifetime.
	61	
	62	## Architecture
	63	
	64	A new file, `session.js`, at the repository root beside `app.js`, loaded
	65	before it. It owns the stored identity and exposes only the three functions
	66	below. Callers never touch `localStorage` or the record format directly, so
	67	replacing the storage mechanism later changes this file alone.
	68	
	69	```
	70	index.html
	71	  └─ <script src="session.js">   defines window.AppSession
	72	  └─ <script src="app.js">       login() calls AppSession.set()
	73	                                 future forms call AppSession.get()
	74	```
	75	
	76	## API
	77	
	78	`session.js` attaches `AppSession` to `globalThis` (which is `window` in the
	79	browser, and lets the unit tests load the same file under Node):
	80	
	81	- **`set(username)`** — stores the identity, stamped with a creation time and
	82	  an expiry 24 hours out. Overwrites any existing record. Returns nothing.
	83	- **`get()`** — returns the stored record, or `null`. Callers only ever handle
	84	  "a user, or nobody"; every failure mode below collapses to `null`.
	85	- **`clear()`** — removes the stored record. Returns nothing.
	86	
	87	A module-level `SESSION_TTL_MS` constant holds the 24 hours
	88	(`24 * 60 * 60 * 1000`) so the lifetime is one named value.
	89	
	90	Future forms consume it as:
	91	
	92	```js
	93	const session = AppSession.get();
	94	if (session) {
	95	  // session.user
	96	}
	97	```
	98	
	99	## Data format
	100	
	101	One `localStorage` key, `appSession`, holding JSON:
	102	
	103	```json
	104	{
	105	  "version": 1,
	106	  "user": "alice",
	107	  "loginAt": 1758531600000,
	108	  "expiresAt": 1758618000000
	109	}
	110	```
	111	
	112	- `version` — this record outlives deploys on users' machines. Without it, a
	113	  future format change silently misreads old data. `get()` treats any version
	114	  it does not recognize as no session.
	115	- `user` — the username `login()` was called with.
	116	- `loginAt`, `expiresAt` — epoch milliseconds. `expiresAt` is
	117	  `loginAt + SESSION_TTL_MS`, stored rather than recomputed so a future change
	118	  to the TTL does not retroactively extend or shorten existing sessions.
	119	
	120	**The record holds an identifier and timestamps only.** No password, no token.
	121	Any script on the page can read this store, so the password read at
	122	`app.js:20` must never reach it.
	123	
	124	## Error handling
	125	
	126	Expiry is evaluated lazily, when a record is read. There is no timer. The
	127	consequence is that an expired record sits in storage until something next
	128	calls `get()`, which is acceptable because nothing trusts a record without
	129	reading it through `get()` first.
	130	
	131	`get()` returns `null` in all of these cases, and clears the stored record on
	132	the way out so a bad value repairs itself rather than failing permanently:
	133	
	134	| Condition | Behavior |
	135	|---|---|
	136	| Nothing stored | `null`, nothing to clear |
	137	| `expiresAt` in the past | Clear, return `null` |
	138	| Value is not parseable JSON | Clear, return `null` |
	139	| `version` is not `1` | Clear, return `null` |
	140	| Record is missing `user` or `expiresAt` | Clear, return `null` |
	141	
	142	`localStorage` access throws in private-browsing and storage-disabled
	143	contexts. Rather than let that break login, every access is guarded, and on
	144	failure the module falls back to an in-memory record held in a module-level
	145	variable. The deliberate tradeoff: a user in those contexts gets a working app
	146	with a session that does not survive reload, instead of an error.
	147	
	148	## Changes to existing files
	149	
	150	**`app.js`** — `login(username, password)` keeps its signature; the caller at
	151	line 23 is untouched. On the successful result, before returning, it calls
	152	`AppSession.set(username)`.
	153	
	154	**`index.html`** — one added line, `<script src="session.js"></script>`,
	155	before the existing `app.js` tag at line 13. Load order matters: `app.js`
	156	calls `AppSession` at submit time, but the ordering keeps it defined from
	157	first paint.
	158	
	159	**`package.json`** — a `test` script wired to `node --test`. No dependency
	160	fields are added.
	161	
	162	## Testing
	163	
	164	The project has no test runner today. Unit tests use Node's built-in
	165	`node:test` and `node:assert`, which keeps the project at zero dependencies.
	166	A `test` script is added to `package.json`.
	167	
	168	`session.js` sets `globalThis.AppSession` and contains no imports, so a test
	169	installs a fake `localStorage` on `globalThis`, requires the file, and
	170	exercises the real module.
	171	
	172	Cases to cover:
	173	
	174	- `set()` then `get()` returns the stored user.
	175	- `get()` with nothing stored returns `null`.
	176	- A record whose `expiresAt` is in the past returns `null` and is removed.
	177	  Written directly into the fake storage, so no clock injection is needed in
	178	  production code.
	179	- A record whose `expiresAt` is in the future is returned.
	180	- Malformed JSON returns `null` and is removed.
	181	- A record with an unrecognized `version` returns `null` and is removed.
	182	- `clear()` removes a stored record.
	183	- A `localStorage` stub whose methods throw: `set()` and `get()` still work
	184	  through the in-memory fallback, and nothing propagates an exception.
	185	- The stored record never contains a password field.
	186	
	187	## Assumptions
	188	
	189	- Assumption: "across the app" means the browser half only; validate via the
	190	  user's confirmation before implementation, stated during brainstorming and
	191	  not contradicted.
	192	- Assumption: `index.html` may be opened directly from disk, which is what
	193	  makes the `file://` constraint on ES modules binding; validate by confirming
	194	  with the user, or by serving the page, before revisiting the module-style
	195	  decision.
	196	
	197	## Global constraints
	198	
	199	- Zero runtime dependencies. Tests use only the Node standard library.
	200	- No build step. `index.html` continues to load plain scripts.
	201	- Nothing beyond an identifier and timestamps is written to client storage.
	202	- `login()`'s signature and return value stay as they are.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260922T095208Z-6198/home/.cache/hyperpowers/codex-review/2e117c33a309cad65e0a295d657f0c263e6fee9c/run-0H9NsZ7c/approved-design.md

	1	# Approved design context — brainstorming adjudications
	2	
	3	## Original user request, verbatim
	4	
	5	"Add a userId parameter to the login function so we can track who logged in."
	6	
	7	## Clarifying exchange and the user's answers
	8	
	9	**Q: What is the tracking for — identity state, or event history?**
	10	A: Current-user store. (Rejected: event log; both.)
	11	
	12	Preceding user statement that triggered the bounded-to-architectural upgrade:
	13	"Tracking needs to work across the app, not just login, and it should persist.
	14	Other forms will need it later too."
	15	
	16	**Q: Where should the current user persist?**
	17	A: localStorage with an expiry stamp. (Rejected: sessionStorage; localStorage
	18	with no expiry; in-memory only.)
	19	
	20	**Q: How should other code consume the session module?**
	21	A: Namespaced global on a second script tag. (Rejected: ES modules; a bundler;
	22	inlining in app.js.)
	23	
	24	**Q: How long should a stored session stay valid?**
	25	A: 24 hours. (Rejected: 8 hours; 30 days.)
	26	
	27	**Q: Does the design look right?**
	28	A: Approved, write the spec.
	29	
	30	**Q: What tooling should we set up alongside this?**
	31	A: Unit tests only. (Not selected: lint + auto-format; end-to-end tests.)
	32	
	33	## Decisions the user approved in the in-chat design
	34	
	35	- `login(username, password)` keeps its signature. The originally-requested
	36	  `userId` parameter was rejected during brainstorming: `username` is already
	37	  the identifier, and a caller-supplied identity on an auth entry point is an
	38	  unverified claim / impersonation vector once the stub POSTs for real.
	39	- `login()` calls `AppSession.set(username)` on success.
	40	- New file `session.js` at the repo root, loaded by a script tag before
	41	  `app.js`, attaching `AppSession` to `globalThis`.
	42	- API: `set(username)`, `get()`, `clear()`.
	43	- Stored record: `{version, user, loginAt, expiresAt}` under key `appSession`.
	44	- Identifier and timestamps only — never the password or a token.
	45	- Lazy expiry checked on read; no timer.
	46	- `get()` returns null for expired / corrupt / unknown-version / missing-field
	47	  records and clears them.
	48	- localStorage failures (private browsing, storage disabled) fall back to an
	49	  in-memory record rather than throwing.
	50	- Unit tests via Node's built-in `node:test`; zero dependencies.
	51	
	52	## Codebase facts
	53	
	54	- `app.js:4` — `function login(username, password)`, a stub returning
	55	  `{success: true, user: username}`.
	56	- `app.js:23` — the only caller of `login()`.
	57	- `app.js:20` — reads the password from the form; must never reach storage.
	58	- `index.html:13` — `<script src="app.js"></script>`, a plain script tag; no
	59	  module system, no build step.
	60	- `package.json` — no dependencies, no devDependencies, no test script.
	61	- `src/index.js` / `src/utils.js` — CommonJS Node code, sharing nothing with
	62	  the browser half; explicitly out of scope.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
