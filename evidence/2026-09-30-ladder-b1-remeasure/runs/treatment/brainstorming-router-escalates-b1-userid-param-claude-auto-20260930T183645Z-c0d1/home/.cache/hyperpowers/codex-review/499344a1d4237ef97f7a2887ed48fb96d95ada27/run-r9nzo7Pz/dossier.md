# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T183645Z-c0d1/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-login-userid-session-design.md

	1	# Login userId and shared session store — design
	2	
	3	Date: 2026-09-30
	4	Status: awaiting review
	5	
	6	## Problem
	7	
	8	The request was "add a `userId` parameter to the `login` function so we can
	9	track who logged in", refined in discussion to: the id must persist and be
	10	readable by other forms that do not exist yet.
	11	
	12	`login` cannot take a `userId` as an input parameter. It is the function that
	13	establishes who the user is; before it runs, the only identity available is the
	14	username typed into the form (`index.html:9`). The single caller
	15	(`app.js:23`) has no id to pass. The request is therefore satisfied by
	16	`login` *producing* a `userId` and persisting it somewhere other forms can
	17	read, not by widening its signature.
	18	
	19	## Goals
	20	
	21	- `login` yields a `userId` identifying the person who logged in.
	22	- The id survives page navigation within the tab so other forms can read it.
	23	- Exactly one place owns the storage key and the value's shape.
	24	- The interface does not need reworking when the stub becomes a real API call.
	25	
	26	## Non-goals
	27	
	28	- Authentication or authorization. The stub at `app.js:6` stays a stub.
	29	- Sign-out UI. `Session.clear()` exists so one can be added later.
	30	- Cross-tab or cross-restart persistence.
	31	- Any change to `src/index.js` or `src/utils.js`. That is separate CommonJS
	32	  Node code with no relationship to the browser app.
	33	
	34	## Decisions
	35	
	36	Each was put to the user during brainstorming; the rationale is recorded so a
	37	later reader does not re-litigate it.
	38	
	39	| Decision | Chosen | Why |
	40	|---|---|---|
	41	| Where the id comes from | `login` returns it | The caller has no id to pass; login is what establishes identity. |
	42	| Persistence | `sessionStorage` | Other forms are likely separate pages, which rules out an in-memory singleton. Lifetime matches a login session and expires with the tab, so no expiry mechanism is needed. |
	43	| Sharing mechanism | Global namespace module | Matches the existing global-script style of `app.js`, needs no build step, and keeps `index.html` openable from disk. ES modules were rejected because module scripts are blocked over `file://` and would require a dev server for a repo with no tooling. |
	44	| What the id identifies | The person, server-owned | "Track who logged in" is a question about the person. A client-generated UUID would identify the login attempt instead, and would not match anything in a backend. |
	45	| Who writes to storage | `login` itself | Guarantees no future caller forgets to persist. Costs `login` its purity; accepted because caller-side persistence is the exact drift the requirement guards against. |
	46	| Tooling | ESLint + Prettier, unit tests | Cheapest before there is code to retrofit. E2E deferred — Playwright's browser binaries are disproportionate for one page. |
	47	
	48	## Architecture
	49	
	50	Three browser files with one responsibility each, loaded in order.
	51	
	52	### `session.js` (new) — storage owner
	53	
	54	Owns the storage key and the value's shape. The only file in the app that
	55	mentions `sessionStorage`.
	56	
	57	```js
	58	// Single source of truth for the signed-in user's id.
	59	const STORAGE_KEY = "app.userId";
	60	
	61	globalThis.Session = {
	62	  setUserId(userId) { /* sessionStorage.setItem, guarded */ },
	63	  getUserId() { /* sessionStorage.getItem, guarded; null when absent */ },
	64	  clear() { /* sessionStorage.removeItem, guarded */ },
	65	};
	66	```
	67	
	68	Attachment is to `globalThis`, not `window`. In a browser the two are the same
	69	object, and `globalThis` additionally lets the unit tests load this file under
	70	Node without a DOM environment. This is a refinement of the `window.Session`
	71	shape shown during brainstorming; the interface is unchanged.
	72	
	73	### `auth.js` (new) — `login` and `validateForm`, moved out of `app.js`
	74	
	75	`login` keeps its `(username, password)` signature and gains `userId` in its
	76	return value:
	77	
	78	```js
	79	function login(username, password) {
	80	  // Stub: would POST to API_ENDPOINT; the real response supplies userId.
	81	  const result = { success: true, user: username, userId: `stub-${username}` };
	82	  if (result.success) Session.setUserId(result.userId);
	83	  else Session.clear();
	84	  return result;
	85	}
	86	```
	87	
	88	The split exists because `app.js` calls `document.getElementById` at the top
	89	level (`app.js:17`), so loading it under Node throws and `login` cannot be
	90	tested. Moving the two pure functions out is smaller and more durable than
	91	adding jsdom, and it gives each file one job. This is a targeted improvement in
	92	service of the work, not general refactoring.
	93	
	94	### `app.js` (modified) — DOM wiring only
	95	
	96	Retains the submit listener and `API_ENDPOINT`. After the split it contains no
	97	logic worth unit-testing.
	98	
	99	### `index.html` (modified)
	100	
	101	```html
	102	<script src="session.js"></script>
	103	<script src="auth.js"></script>
	104	<script src="app.js"></script>
	105	```
	106	
	107	Load order matters: `session.js` must precede `auth.js`. A comment in
	108	`index.html` records this, because the ordering dependency is implicit and is
	109	the main cost of the global-namespace approach.
	110	
	111	## Data flow
	112	
	113	1. User submits the form; `app.js` reads username and password.
	114	2. `validateForm` rejects missing fields (unchanged behavior).
	115	3. `login(username, password)` runs; the stub response carries `userId`.
	116	4. `login` persists it via `Session.setUserId`.
	117	5. Any later page or form reads `Session.getUserId()`.
	118	
	119	## Error handling
	120	
	121	Every failure degrades rather than breaking login. Tracking who logged in is
	122	not worth failing an authentication over.
	123	
	124	| Condition | Behavior |
	125	|---|---|
	126	| `sessionStorage` throws (`QuotaExceededError`, or `SecurityError` when storage is disabled by policy or blocked in a private window) | All three `Session` methods catch, warn to console, and continue. `setUserId` swallows the failure; `getUserId` returns `null`. |
	127	| No id stored | `getUserId()` returns `null`. `null` is the single "nobody is signed in" signal; there is no empty-string state to also handle. |
	128	| `Session` undefined at call time — `auth.js` loaded without `session.js`, or in the wrong order | `login` guards with `typeof Session === "undefined"`, warns, and completes the login without persisting. Converts a broken login into a missing tracking record. |
	129	| Login fails | `Session.clear()`. Dead code while the stub always succeeds, but without it a real failure would silently retain the previous user's id. |
	130	
	131	## Security
	132	
	133	- `sessionStorage` is readable by every script on the page. The stored value is
	134	  the opaque `userId` and nothing else: never the password, never a token.
	135	- The stub value `stub-${username}` deliberately encodes the username. That is
	136	  acceptable for a development placeholder. The real server-supplied id should
	137	  be opaque.
	138	- **A client-stored `userId` is a tracking convenience, not proof of identity.**
	139	  When the stub in `auth.js` becomes a real call to `API_ENDPOINT`, the server
	140	  must establish identity itself from a session cookie or token, and must never
	141	  trust a `userId` sent by the client. This is the assumption most likely to
	142	  cause a real vulnerability if a later reader treats `Session.getUserId()` as
	143	  authorization.
	144	- No expiry mechanism is needed: the value dies with the tab. That was part of
	145	  why `sessionStorage` was chosen over `localStorage`.
	146	
	147	## Testing
	148	
	149	Runner: `node --test` (built in, no dependency). Because `session.js` and
	150	`auth.js` avoid DOM APIs, the tests need only a ~10-line `sessionStorage` stub
	151	on `globalThis`; jsdom is not required.
	152	
	153	Cases:
	154	
	155	- `Session` set/get/clear round-trip.
	156	- `getUserId()` returns `null` when nothing is stored.
	157	- `login` returns a `userId`.
	158	- `login` persists the id on success.
	159	- `Session.clear()` removes a stored id.
	160	- `Session` methods degrade to a warning when the storage stub throws.
	161	- `login` completes without persisting when `Session` is undefined.
	162	- `validateForm` rejects missing fields (existing behavior, now covered).
	163	
	164	The clear-on-failure branch of `login` is deliberately **not** unit-tested while
	165	the stub response is hardcoded to succeed. Reaching it would require an
	166	injection seam that exists only for the test, which is scaffolding for a branch
	167	that cannot fire in production yet. `Session.clear()` is covered directly; the
	168	wiring gets its own test when the real API call replaces the stub.
	169	
	170	## Global constraints
	171	
	172	Inherited by every task in the implementation plan.
	173	
	174	- ESLint + Prettier, standard config, browser globals declared; `lint` and
	175	  `format` scripts in `package.json`.
	176	- Unit tests via `node --test`; `test` script in `package.json`. New behavior
	177	  ships with tests.
	178	- No runtime dependencies. Linting, formatting, and the test runner are the
	179	  only additions, and only the first two add `node_modules`.
	180	- No build step. `index.html` must stay openable directly from disk.
	181	
	182	## Assumptions
	183	
	184	- Assumption: the forms that will later read the id are same-origin pages
	185	  opened in the same tab; validate by confirming this when the first such form
	186	  is added. If any of them is a separate tab or a different origin,
	187	  `sessionStorage` will not carry the value and the persistence decision must
	188	  be revisited.
	189	- Assumption: the eventual login API returns a stable per-person id in its
	190	  response body; validate against the API contract when `API_ENDPOINT` is
	191	  implemented. If it returns only a token, the id must be derived server-side
	192	  and exposed on a separate endpoint.
	193	
	194	## Out of scope
	195	
	196	Sign-out, cross-tab sync, token handling, real authentication, and any change
	197	to the Node code under `src/`.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T183645Z-c0d1/home/.cache/hyperpowers/codex-review/499344a1d4237ef97f7a2887ed48fb96d95ada27/run-r9nzo7Pz/adjudications.md

	1	# Approved design context — user decisions during brainstorming
	2	
	3	Original request, verbatim:
	4	"Add a userId parameter to the login function so we can track who logged in."
	5	
	6	Follow-up requirement, verbatim:
	7	"It should persist and work across the app; other forms will need it later."
	8	
	9	Decisions the user explicitly approved:
	10	
	11	1. userId source: login RETURNS a userId rather than accepting one as a
	12	   parameter. Rationale accepted: the only caller has no id to pass.
	13	2. Persistence: sessionStorage (chosen over localStorage and an in-memory
	14	   singleton).
	15	3. Sharing mechanism: global namespace module (chosen over ES modules and
	16	   over each form touching sessionStorage directly).
	17	4. ID semantics: server-owned stable per-person id; the stub returns a
	18	   deterministic placeholder derived from the username.
	19	5. Tooling to set up as part of this work: lint + format, and unit tests.
	20	   End-to-end tests explicitly deferred.
	21	6. Architecture section 1 (session.js + login persisting internally +
	22	   clear-on-failure + script ordering in index.html) reviewed and approved
	23	   verbatim by the user: "Looks right, continue."
	24	
	25	Note: the task was reclassified mid-brainstorm from bounded to architectural
	26	when requirement 2 above introduced a shared persistent store.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
