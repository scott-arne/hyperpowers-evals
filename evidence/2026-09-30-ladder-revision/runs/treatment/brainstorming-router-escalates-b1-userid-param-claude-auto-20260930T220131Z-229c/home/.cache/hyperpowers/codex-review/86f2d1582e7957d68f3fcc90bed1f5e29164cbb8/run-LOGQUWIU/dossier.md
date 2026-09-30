# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T220131Z-229c/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-login-session-tracking-design.md

	1	# Login Session Tracking — Design
	2	
	3	Date: 2026-09-30
	4	Status: Approved design, not yet planned
	5	
	6	## Problem
	7	
	8	The app has no way to record who logged in. `login()` in `app.js` returns
	9	`{ success, user }` and the submit handler logs it to the console, after which
	10	the information is gone. Nothing outside that one call can tell who the current
	11	user is.
	12	
	13	The original request was to "add a `userId` parameter to the login function".
	14	That framing does not work as stated: at the moment `login()` is called, the
	15	only values in hand are the username and password typed into the form. Identity
	16	is the *output* of logging in, not an input to it, so a caller-supplied `userId`
	17	could only ever duplicate the username. The request is therefore satisfied by
	18	having `login()` **return** a `userId` and by persisting it somewhere later code
	19	can read.
	20	
	21	## Scope
	22	
	23	In scope:
	24	
	25	- `login()` returns a `userId` alongside its existing fields.
	26	- A tab-scoped browser session record holding `{ userId, username }`.
	27	- A single module that owns the storage key and the stored shape.
	28	- The repository's first unit-test infrastructure, covering that module.
	29	
	30	Out of scope (deliberately):
	31	
	32	- Any real authentication. `login()` remains a stub; the API call it describes
	33	  at `app.js:6` is unchanged.
	34	- Server-visible session state (cookies), cross-restart persistence
	35	  (`localStorage`), analytics or telemetry delivery, and any logout UI. Each was
	36	  considered and rejected during design; see Decisions.
	37	- Linting and formatting infrastructure.
	38	
	39	## Global Constraints
	40	
	41	- **The stored `userId` is non-authoritative.** It lives in `sessionStorage`, so
	42	  it is readable by any script on the origin (an XSS-exposed value) and is
	43	  trivially editable from devtools. It may be displayed and logged. It must
	44	  never be the basis for deciding who a user is or what they are permitted to
	45	  do. Any future authorization decision must come from the server.
	46	- **A storage failure must never fail a login.** Persistence is a side benefit
	47	  of logging in, not a precondition for it.
	48	- **Zero new runtime dependencies.** The test runner is `node:test`, which ships
	49	  with Node. `package.json` gains a `scripts` entry and no `devDependencies`.
	50	- **No change to how the page loads.** `index.html` keeps classic
	51	  `<script src>` tags; the page must still open correctly over `file://`.
	52	
	53	## Architecture
	54	
	55	Three files change or appear. The browser side of this repo is plain scripts
	56	with globals (`app.js` loaded by a bare tag at `index.html:13`), while `src/` is
	57	Node CommonJS. The new code follows the browser convention, since that is the
	58	world it runs in.
	59	
	60	### `session.js` (new, repo root)
	61	
	62	Owns the sessionStorage key and the stored shape. This is the only file in the
	63	app that references `sessionStorage`.
	64	
	65	Interface — a `Session` global with exactly three functions:
	66	
	67	- `Session.save(session)` — persists `{ userId, username }`. Returns `true` on
	68	  success, `false` if the storage backend refused.
	69	- `Session.read()` — returns the stored object, or `null` if absent or corrupt.
	70	- `Session.clear()` — removes the key.
	71	
	72	The functions read `sessionStorage` at call time rather than capturing a
	73	reference at load time. This is what makes the module testable under Node, where
	74	no `sessionStorage` global exists.
	75	
	76	The file ends with a dual-export guard:
	77	
	78	```js
	79	if (typeof module !== "undefined" && module.exports) {
	80	  module.exports = Session;
	81	}
	82	```
	83	
	84	It is inert in the browser and is what allows the test to `require` the module.
	85	
	86	### `app.js` (modified)
	87	
	88	Two changes:
	89	
	90	1. `login()` returns `{ success, user, userId }`. Because it is still a stub
	91	   with no backend, it derives the `userId` as the literal string
	92	   `` `user-${username}` ``, under a comment next to the existing "would POST to
	93	   API_ENDPOINT" note marking the derived value as placeholder data that the
	94	   real API response replaces. Keeping the shape honest now means swapping in
	95	   the real request later touches only this function's body.
	96	2. The submit handler persists the result on success and includes the id in the
	97	   log it already emits, and calls `Session.clear()` on both non-success paths
	98	   (see Error Handling). It ignores `Session.save`'s return value: a refused
	99	   write is reported by `session.js` and must not change the handler's
	100	   behaviour.
	101	
	102	Note that the stub's `success` is currently hard-coded `true`, so the
	103	failed-login branch is unreachable today. The handler is still written to handle
	104	it, because that branch becomes live the moment the real API call lands and the
	105	stale-session bug it prevents would otherwise arrive with it.
	106	
	107	`app.js` never touches `sessionStorage` directly.
	108	
	109	### `index.html` (modified)
	110	
	111	One new tag, `<script src="session.js"></script>`, placed **before** the
	112	existing `app.js` tag. Both are classic scripts, so execution order is
	113	synchronous and deterministic; `Session` is defined before `app.js` runs.
	114	
	115	## Data Flow
	116	
	117	```
	118	submit
	119	  -> validateForm({ username, password })
	120	       |
	121	       +-- invalid --> Session.clear() --> console.error(validation error)
	122	       |
	123	       +-- valid --> login(username, password) -> { success, user, userId }
	124	                        |
	125	                        +-- success --> Session.save({ userId, username })
	126	                        |                 --> console.log(result incl. userId)
	127	                        |
	128	                        +-- failure --> Session.clear()
	129	```
	130	
	131	## Error Handling
	132	
	133	Three failure modes, in order of importance.
	134	
	135	**Storage is unavailable or refuses the write.** `sessionStorage` throws in
	136	Safari private mode, when storage is disabled by policy, and on quota
	137	exhaustion. `Session.save` wraps the write in try/catch, emits a
	138	`console.warn`, and returns `false`. The login itself still succeeds and the
	139	existing success log still fires. This follows directly from the Global
	140	Constraint above.
	141	
	142	**The stored value is corrupt.** `Session.read` catches `JSON.parse` failures,
	143	calls `Session.clear()` to remove the bad value, and returns `null`. A corrupt
	144	record self-heals rather than throwing on every subsequent read.
	145	
	146	**A login fails or does not validate.** Both branches call `Session.clear()`.
	147	Without this, a `userId` stored by an earlier successful login in the same tab
	148	survives a later failed attempt and reads as the current user. This is the one
	149	genuine bug the feature can introduce, and clearing on every non-success path is
	150	the fix.
	151	
	152	## Testing
	153	
	154	Runner: `node:test` with `node:assert`, invoked by a new
	155	`"test": "node --test"` script — the first entry in `package.json`'s currently
	156	absent `scripts` block.
	157	
	158	Tests target `session.js` only. `app.js` is DOM-wired and would need a DOM
	159	harness to test; the logic worth covering lives in the session module. The test
	160	injects a fake `globalThis.sessionStorage` it fully controls.
	161	
	162	1. `save` followed by `read` round-trips `{ userId, username }`.
	163	2. `read` returns `null` when nothing is stored.
	164	3. `read` on a corrupted stored value returns `null` **and** clears the key.
	165	4. `clear` removes the key.
	166	5. `save` returns `false` and does not throw when the storage backend throws.
	167	
	168	Tests 3 and 5 cover the error-handling paths that would otherwise regress
	169	silently; the remainder are cheap regression cover for the interface.
	170	
	171	## Decisions
	172	
	173	**`userId` is returned, not passed in.** See Problem. The alternatives were a
	174	caller-supplied per-attempt tracking id (identifies the attempt, not the person,
	175	and was not what was wanted) and a literal `userId` parameter (the caller has no
	176	value to pass other than the username, which `login()` already receives).
	177	
	178	**`sessionStorage`, not `localStorage` or a cookie.** The value is wanted for
	179	display and logging within the tab. `localStorage` would persist identity across
	180	browser restarts on shared machines and would require a logout path to clear it.
	181	A cookie would make the value server-visible and therefore part of the auth
	182	surface, requiring `Secure`/`HttpOnly`/`SameSite` decisions well beyond this
	183	feature.
	184	
	185	**A separate `session.js` rather than inline helpers or ES modules.** Inlining
	186	in `app.js` saves roughly ten lines but puts storage ownership in the same file
	187	as form wiring and the API stub, with no boundary to test. Converting the
	188	browser side to ES modules gives a real import/export boundary and is the likely
	189	end state, but module scripts are deferred and CORS-blocked over `file://`, so
	190	adopting them now would break opening `index.html` directly — a page-loading
	191	regression this feature does not justify paying for.
	192	
	193	**The stored shape omits a login timestamp.** The requirement is who logged in,
	194	not when, and nothing reads a timestamp today. Because one file owns the shape,
	195	adding the field later is a single-file change.
	196	
	197	**Unit tests now, lint and format deferred.** Tooling is cheapest to adopt
	198	before more code exists, but `session.js` has real error-handling branches worth
	199	locking down while a linter would only add `devDependencies` to a repo that
	200	currently has none.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T220131Z-229c/home/.cache/hyperpowers/codex-review/86f2d1582e7957d68f3fcc90bed1f5e29164cbb8/run-LOGQUWIU/adjudications.md

	1	# Approved design context — login session tracking
	2	
	3	## Original user request (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Codebase facts
	8	
	9	- `app.js` (repo root): `login(username, password)` at line 4 is a stub that
	10	  logs and returns `{ success: true, user: username }`; `validateForm` at line
	11	  10; a submit handler at line 17 that calls `validateForm` then `login` and
	12	  logs the result. `API_ENDPOINT` is declared at line 2 and never used.
	13	- `index.html`: loads `app.js` at line 13 via a classic `<script src>` tag. No
	14	  other scripts. Inputs `#username`, `#password`, form `#login-form`.
	15	- `src/index.js` and `src/utils.js` are Node CommonJS and unrelated to the
	16	  browser app.
	17	- `package.json`: name `drill-test-project`, no `scripts`, no
	18	  `devDependencies`, no test runner, no linter, no formatter.
	19	- No test directory, no CI configuration.
	20	- Single caller of `login()` in the repo (`app.js:23`); no exports.
	21	
	22	## Clarifying questions and the user's answers
	23	
	24	1. **Where should the userId come from?** — "Return it from login": `login()`
	25	   returns `{ success, user, userId }` and the caller consumes it. (Rejected:
	26	   a caller-supplied per-attempt tracking id; a literal `userId` parameter.)
	27	2. **What does "track" mean — where does the userId go?** — "Persist it
	28	   (storage/session)". (Rejected: console.log only; analytics/telemetry.)
	29	3. **Who reads it later, and how long should it survive?** — "This tab only,
	30	   display/logging": `sessionStorage`, non-authoritative. (Rejected:
	31	   `localStorage` across restarts; a cookie visible to the server; in-memory
	32	   only.)
	33	4. **What should the userId value be, given login() is a stub?** — "Stub
	34	   derives it, marked TODO", with the real API response replacing it later.
	35	   (Rejected: random uuid per login; the username verbatim.)
	36	5. **Which approach?** — "A: separate session.js", a new classic browser
	37	   script owning the storage key and shape. (Rejected: inline helpers in
	38	   app.js; converting the browser side to ES modules.)
	39	6. **Tooling?** — "Unit tests only": a `node:test` runner and tests for
	40	   session.js. (Rejected: adding eslint/prettier; no tooling at all.)
	41	
	42	The user approved the design summarized by these answers before the spec was
	43	written. These are settled decisions, not open questions.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
