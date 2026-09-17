# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T105307Z-674f/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-login-userid-tracking-design.md

	1	# Login userId Tracking — Design
	2	
	3	Date: 2026-09-17
	4	Status: Approved design, pending implementation plan
	5	
	6	## Problem
	7	
	8	`login(username, password)` in `app.js` records nothing that identifies the
	9	account that logged in. The only identifier available at the call site is the
	10	username typed into the form, which is not a stable identity. The goal is to
	11	track who logged in, using a user ID that is available across the app, persists
	12	between page loads, and can be reused by forms added later.
	13	
	14	## Decisions
	15	
	16	These were settled during brainstorming and constrain everything below.
	17	
	18	- **ID origin:** the server issues the user ID at login. The first login call
	19	  therefore has no ID to send; the response supplies it and the app persists it
	20	  for subsequent calls.
	21	- **Persistence:** `sessionStorage`, cleared on logout. The ID survives
	22	  navigation and reloads, and dies when the tab closes. The server reissues it
	23	  at the next login, so durable on-disk storage would buy continuity the
	24	  feature does not need while widening the exposure window on shared devices.
	25	- **Scope:** build the shared identity module and make `login` its first
	26	  consumer. Do not build a generic form-submission wrapper; the interface for
	27	  that should be designed against a second real consumer, not one example.
	28	- **Shape:** optional trailing parameter, identity exposed as a browser global.
	29	  This matches the repository's existing no-build convention.
	30	- **Tooling:** add unit-test infrastructure as part of this work. No linting or
	31	  formatting setup for now.
	32	- **Logging:** `login` logs both the username and the user ID to the console.
	33	
	34	## Constraints from the existing code
	35	
	36	- `app.js` is a plain browser script loaded by a bare `<script src="app.js">`
	37	  tag in `index.html`. There is no bundler and no `type="module"`.
	38	- The `require`/`module.exports` usage in `src/index.js` and `src/utils.js` is a
	39	  separate Node entry point and is unrelated to the browser code. This change
	40	  does not touch it.
	41	- `login` is a stub. It does not yet POST to `API_ENDPOINT`; it returns a
	42	  fabricated success result.
	43	- `login` has exactly one caller: the submit handler in `app.js`.
	44	
	45	## Architecture
	46	
	47	### New: `identity.js`
	48	
	49	The single owner of the persisted user ID. No other file reads or writes
	50	`sessionStorage` directly — that rule is what lets later forms reuse this
	51	rather than copy it.
	52	
	53	Public surface, exposed as `window.Identity`:
	54	
	55	- `getUserId()` — returns the stored ID, or `null` when absent.
	56	- `setUserId(id)` — persists the ID.
	57	- `clearUserId()` — removes it.
	58	
	59	Loaded by a new `<script src="identity.js">` tag in `index.html`, placed before
	60	the existing `app.js` tag so the global exists before the submit handler is
	61	registered.
	62	
	63	`clearUserId()` will have no caller on delivery. There is no logout anywhere in
	64	this application. It exists as the documented clearing contract for when a
	65	logout is added, and is the mechanism by which the "cleared on logout" decision
	66	above is honored.
	67	
	68	### Changed: `app.js`
	69	
	70	The signature becomes:
	71	
	72	```js
	73	function login(username, password, userId = null)
	74	```
	75	
	76	The parameter is optional because the first login genuinely has no ID to pass.
	77	Any consumer must tolerate `null`.
	78	
	79	## Data flow
	80	
	81	1. The submit handler validates the form, unchanged.
	82	2. The handler calls `Identity.getUserId()`. On a first login this is `null`.
	83	3. The handler calls `login(username, password, userId)`.
	84	4. `login` logs the username and the user ID.
	85	5. On a successful result the handler calls `Identity.setUserId(result.userId)`.
	86	6. Every later login, and every later form, reads a real ID from
	87	   `getUserId()`.
	88	
	89	The stub must be adjusted so this path is exercisable. It currently returns
	90	`{ success: true, user: username }` with no ID, which means step 5 could never
	91	fire and the feature could not be observed working. The stub will add a
	92	`userId` field to its return value, whose value is the `userId` argument when
	93	one was supplied and otherwise the string `` `stub-${username}` ``. A comment
	94	records that the real POST to `API_ENDPOINT` supplies the authoritative value
	95	and that this fallback is deleted when the real request lands.
	96	
	97	## Security and privacy posture
	98	
	99	- `sessionStorage` is origin-scoped and readable by any script on the origin. A
	100	  cross-site scripting flaw on this page can read the stored ID. This is
	101	  acceptable for a non-secret tracking identifier and is **not** acceptable for
	102	  a session token. A comment in `identity.js` records this constraint so the
	103	  module is not later repurposed as a token store.
	104	- `sessionStorage` is per-tab. Two tabs hold two independent IDs until each has
	105	  logged in. This is correct behavior but is surprising to anyone who later
	106	  reasons about the store as one-ID-per-user.
	107	- The user ID appears in browser console output, per the logging decision. This
	108	  is appropriate for the current stub; it should be revisited before the
	109	  application handles real accounts.
	110	- The password is not logged today and must not be logged by this change.
	111	
	112	## Error handling
	113	
	114	`sessionStorage` access throws rather than returning `null` in some browser
	115	privacy modes. All three identity functions wrap their access in `try`/`catch`:
	116	
	117	- `getUserId()` degrades to returning `null`.
	118	- `setUserId()` becomes a no-op after emitting a single `console.warn`.
	119	- `clearUserId()` becomes a no-op.
	120	
	121	The governing rule: authentication must keep working when storage is
	122	unavailable. Tracking is the capability that degrades, never login itself.
	123	
	124	A failed login stores nothing.
	125	
	126	## Testing
	127	
	128	Unit-test infrastructure is added as part of this work, using Node's built-in
	129	`node:test` runner so the project acquires no dependencies. A `test` script is
	130	added to `package.json`.
	131	
	132	`sessionStorage` does not exist in the Node test environment, so `identity.js`
	133	resolves its storage through one internal accessor that returns
	134	`window.sessionStorage` by default and can be pointed at a fake by the tests.
	135	That accessor is the only place in the module that names `sessionStorage`.
	136	
	137	Cases to cover:
	138	
	139	- `getUserId()` returns `null` when nothing is stored.
	140	- `setUserId()` then `getUserId()` round-trips the value.
	141	- `clearUserId()` after `setUserId()` returns the store to empty.
	142	- `getUserId()` returns `null` when the storage accessor throws.
	143	- `setUserId()` does not throw when the storage accessor throws.
	144	
	145	The `app.js` submit handler is not unit-tested; it is DOM-bound and this
	146	project has no DOM test environment. Its behavior is covered by manual
	147	verification that a first login stores an ID and a second login sends it.
	148	
	149	## Out of scope
	150	
	151	- A logout flow.
	152	- A generic form-submission wrapper for future forms.
	153	- The real `POST` to `API_ENDPOINT`.
	154	- Linting and formatting setup.
	155	- Any change to `src/index.js` or `src/utils.js`.
	156	
	157	## Files touched
	158	
	159	- `identity.js` — new.
	160	- `app.js` — signature change, handler wiring, stub ID.
	161	- `index.html` — one new script tag.
	162	- `package.json` — `test` script.
	163	- `test/identity.test.js` — new.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T105307Z-674f/home/.cache/hyperpowers/codex-review/cd53508e42d80228d1134140dccddee9a82c2aad/run-7SOpkmER/adjudications.md

	1	# Approved design context — login userId tracking
	2	
	3	## Original request (verbatim)
	4	
	5	"Add a userId parameter to the login function so we can track who logged in."
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	**Q: Where should the userId that login() receives come from?**
	10	A: "The caller passes a real ID. It should work across the app, it should
	11	persist, and other forms will need it later."
	12	
	13	**Q: Where does the real userId originate?**
	14	A: Server issues it at login. The first login call has no userId; the API
	15	returns one, the app persists it, later calls and forms pass it.
	16	
	17	**Q: How long should the persisted userId survive?**
	18	A: `sessionStorage`, cleared on logout. Survives navigation and reloads, dies
	19	with the tab. Rejected: `localStorage` (on-disk identifier, lingers on shared
	20	machines), in-memory only (does not persist across reloads).
	21	
	22	**Q: How much of the "other forms" reuse should we build now?**
	23	A: Identity module plus login only. Explicitly rejected building a shared
	24	form-submission wrapper now, on the grounds that a general interface designed
	25	against a single example is the wrong abstraction.
	26	
	27	**Q: Which approach should the design use?**
	28	A: Approach A — optional trailing parameter
	29	`login(username, password, userId = null)`, with identity exposed as a browser
	30	global loaded before `app.js`. Rejected: a tracking-context options object
	31	(extensibility not yet needed), and converting the page to ES modules (moderate
	32	cost, changes the page loading model, breaks `file://`).
	33	
	34	**Q: What tooling should we set up alongside this?**
	35	A: Unit tests only. No linting or formatting setup.
	36	
	37	**Q: Should login keep console-logging the identifiers?**
	38	A: Log both username and userId. Accepted that identifiers appear in browser
	39	console output for the current stub.
	40	
	41	## Codebase facts the design was built against
	42	
	43	- `app.js` is a plain browser script loaded by `<script src="app.js">` in
	44	  `index.html`; no bundler, no `type="module"`.
	45	- `login` is a stub returning `{ success: true, user: username }`; it does not
	46	  POST to `API_ENDPOINT` yet.
	47	- `login` has exactly one caller: the submit handler in `app.js`.
	48	- `src/index.js` and `src/utils.js` are a separate Node entry point, unrelated
	49	  to the browser code, and out of scope.
	50	- `package.json` has no `scripts` and no `devDependencies`. There are no tests.
	51	- There is no logout anywhere in the application.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
