# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T180550Z-0669/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-login-user-session-design.md

	1	# Login User Session — Design
	2	
	3	Date: 2026-09-30
	4	Status: Approved design, not yet implemented
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The request was "add a `userId` parameter to the `login` function so we can
	10	track who logged in," refined to "it should persist and work across the app;
	11	other forms will need it later."
	12	
	13	`app.js` today defines `login(username, password)`, which logs the username
	14	and returns a hardcoded `{ success: true, user: username }`. The repository
	15	has no identity, session, storage, logging, or telemetry code of any kind, and
	16	`index.html` is the only page. There is therefore nothing that can supply a
	17	`userId` and nowhere for other forms to read one from. The deliverable is not a
	18	new parameter; it is the smallest shared place for "who is logged in" to live.
	19	
	20	## Decisions
	21	
	22	These were settled with the requester before this document was written.
	23	
	24	1. **Login derives the userId; it is not passed in.** The authenticating call
	25	   is the only party that can authoritatively say who logged in. The caller
	26	   does not have a user id and would have to invent one.
	27	2. **In-memory for now.** The value must be reachable from anywhere in the
	28	   app but is not required to survive a page reload. Storage may be added
	29	   later without changing how callers read the value.
	30	3. **Namespaced global via a classic script.** A new `session.js` exposes
	31	   `window.AppSession`, loaded by an ordinary `<script>` tag before `app.js`.
	32	   ES modules were rejected for now because `type="module"` is blocked by CORS
	33	   over `file://`, and the repo has no static server, no dependencies, and no
	34	   `scripts` in `package.json`. A bundler was rejected as unjustified at this
	35	   size.
	36	4. **The stub returns a placeholder userId.** `"stub-" + username`, clearly
	37	   marked, so consumer forms can be built and tested before real auth exists.
	38	5. **Tests via Node's built-in runner.** `node --test`, zero dependencies.
	39	
	40	## Architecture
	41	
	42	### `session.js` (new)
	43	
	44	The only code in the app that knows where current-user identity is stored. An
	45	IIFE keeps state private and publishes one namespace:
	46	
	47	```
	48	window.AppSession
	49	  setSession({ userId, username })   // record who logged in
	50	  getUserId()   -> string | null
	51	  getUsername() -> string | null
	52	  clear()                            // logout / teardown
	53	```
	54	
	55	State is a single module-private variable holding either `null` or a record
	56	`{ userId, username }`.
	57	
	58	**Why the boundary matters:** these four functions are the only code that
	59	touches the stored value. Adding `sessionStorage` or `localStorage` later is a
	60	change confined to this file, with no call-site churn. This is what keeps
	61	decision 2 cheap to revisit, and it is the reason the value is reached through
	62	functions rather than read as a bare property.
	63	
	64	The file ends with a conditional CommonJS export so Node tests can load it:
	65	
	66	```js
	67	if (typeof module !== "undefined" && module.exports) {
	68	  module.exports = AppSession;
	69	}
	70	```
	71	
	72	This is the one concession the IIFE approach makes to testability. It is inert
	73	in the browser.
	74	
	75	### `index.html`
	76	
	77	Add `<script src="session.js"></script>` immediately before the existing
	78	`<script src="app.js"></script>`. Load order is significant: `app.js` calls
	79	into `AppSession` at submit time, so the namespace must already exist.
	80	
	81	### `app.js`
	82	
	83	`login(username, password)` keeps its signature — per decision 1 the id comes
	84	out of the call, not into it. Its stub return grows:
	85	
	86	```js
	87	// Stub: the real userId will come from the auth response once this
	88	// POSTs to API_ENDPOINT.
	89	return { success: true, userId: "stub-" + username, user: username };
	90	```
	91	
	92	The submit handler, on a successful login, calls
	93	`AppSession.setSession({ userId: result.userId, username })` and includes the
	94	userId in its log line. On failure it does not touch the session.
	95	
	96	`validateForm` is unchanged.
	97	
	98	## Data flow
	99	
	100	```
	101	submit
	102	  -> validateForm({ username, password })
	103	  -> login(username, password)
	104	  -> { success, userId, user }
	105	  -> AppSession.setSession({ userId, username })     [only when success]
	106	  -> later forms: AppSession.getUserId()
	107	```
	108	
	109	## Error handling
	110	
	111	- A failed login (`success: false`) must not establish a session. No partial
	112	  writes.
	113	- `getUserId()` and `getUsername()` return `null` when nobody is logged in.
	114	  Callers get an explicit "unknown", never `undefined`.
	115	- `setSession` rejects a call whose argument is missing, is not an object, or
	116	  has a missing or empty `userId`, rather than storing a broken record. It
	117	  throws a `TypeError`; a silently-empty session would surface later as a
	118	  confusing null far from the cause.
	119	- `clear()` resets state to `null` and is safe to call when no session exists.
	120	
	121	## Security boundary
	122	
	123	The stored userId is a client-side correlation value: it makes logs readable
	124	and lets later forms know who they are rendering for. It is **not** proof of
	125	identity and must never gate access to anything. Any real authorization
	126	decision re-derives identity server-side from the session credential. This
	127	constraint holds regardless of whether the value is later moved into browser
	128	storage — anything in `localStorage` or `sessionStorage` is readable and
	129	writable by any script on the page.
	130	
	131	## Testing
	132	
	133	The repo has no existing test infrastructure, so this change establishes it.
	134	
	135	- Add `"scripts": { "test": "node --test" }` to `package.json`.
	136	- Add `test/session.test.js` covering:
	137	  - `getUserId()` / `getUsername()` return `null` before any login.
	138	  - `setSession` then `getUserId()` / `getUsername()` return what was set.
	139	  - `clear()` returns state to `null`.
	140	  - `setSession` throws on a missing argument, a non-object, a missing
	141	    `userId`, and an empty-string `userId`.
	142	  - `setSession` overwrites a prior session rather than merging.
	143	
	144	`app.js` is not unit-tested: it is DOM-bound with no DOM harness in the repo,
	145	and adding one is out of scope for this change. Its behavior is verified
	146	manually — open `index.html`, submit the form, confirm the console shows the
	147	placeholder userId and that `AppSession.getUserId()` returns it afterward.
	148	This gap is deliberate and recorded here rather than left implicit.
	149	
	150	## Out of scope
	151	
	152	- Making `login` actually call `API_ENDPOINT`. It stays a stub; the placeholder
	153	  userId exists precisely because of that, and must be replaced with the real
	154	  auth response when the call becomes real.
	155	- Persisting the session across reloads. Decision 2.
	156	- A logout UI. `clear()` exists so one has somewhere to land, but no control
	157	  is added.
	158	- Any analytics or audit sink. "Track who logged in" is satisfied here by a
	159	  readable console line plus a queryable session; shipping placeholder ids to
	160	  a durable analytics store would record events that never happened.
	161	- The `src/` CommonJS files, which are Node-side and unrelated to the page.
	162	
	163	## Files touched
	164	
	165	| File | Change |
	166	|---|---|
	167	| `session.js` | New. The session module. |
	168	| `index.html` | One `<script>` tag, before `app.js`. |
	169	| `app.js` | `login` returns `userId`; submit handler records the session. |
	170	| `package.json` | Add the `test` script. |
	171	| `test/session.test.js` | New. Unit tests for the session module. |


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T180550Z-0669/home/.cache/hyperpowers/codex-review/5c64eb577b6a36a89ce3e627e5d147a4827aa5c6/run-XnNYD3Mq/approved-design.md

	1	# Approved design context (adjudicated decisions)
	2	
	3	## Original user requirements (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	> It should persist and work across the app; other forms will need it later.
	8	
	9	## Decisions the user explicitly approved during brainstorming
	10	
	11	These are settled. A finding that re-opens one of them is out of scope unless
	12	it shows the decision is unworkable as specified.
	13	
	14	1. **Login derives the userId; it is NOT added as a parameter.** The user chose
	15	   this over the literal request of adding a `userId` parameter, after being
	16	   shown that the form supplies no user id and nothing upstream knows one.
	17	2. **In-memory only for now.** Not required to survive a page reload. Future
	18	   storage backing must be introduceable without changing how callers read the
	19	   value.
	20	3. **Namespaced global (`window.AppSession`) via a classic `<script>` tag.**
	21	   Chosen over converting the page to ES modules (rejected: `type="module"` is
	22	   CORS-blocked over `file://` and the repo has no static server, no
	23	   dependencies, and no `scripts`) and over adding a bundler (rejected as
	24	   unjustified at this size).
	25	4. **The stub `login` returns a placeholder userId** (`"stub-" + username`),
	26	   chosen over returning `null`, so consumer forms can be built before real
	27	   auth exists.
	28	5. **Tests via Node's built-in runner** (`node --test`, zero dependencies),
	29	   chosen over no test infrastructure and over also adding a linter.
	30	
	31	## Repository facts
	32	
	33	- Six files before this change: `index.html`, `app.js`, `README.md`,
	34	  `package.json`, `src/index.js`, `src/utils.js`. Branch
	35	  `feature/webapp-enhancement`, working tree clean before the spec was written.
	36	- `index.html` loads `app.js` via a classic `<script src="app.js">` tag; it is
	37	  not `type="module"`. It is the only HTML file.
	38	- `package.json` has no dependencies, no devDependencies, no `scripts`, and no
	39	  `"type"` field.
	40	- `src/` is CommonJS and Node-side (`main: src/index.js`); it is not loaded by
	41	  the page and shares no code with `app.js`.
	42	- `login` in `app.js` is a stub: it never contacts `API_ENDPOINT` and returns a
	43	  hardcoded `{ success: true, user: username }`.
	44	- The repo has no existing tests, linter, build step, router, framework,
	45	  storage, logging, telemetry, or identity code.
	46	
	47	## Gate note
	48	
	49	An earlier Codex approach-gate call in this brainstorm returned an empty
	50	result, so no independent Codex approaches were folded into the design. This
	51	spec review is Codex's first look at the work.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
