# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T212815Z-0aff/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-client-user-id-design.md

	1	# Client-Persisted User Identifier
	2	
	3	Date: 2026-09-30
	4	Status: awaiting user review
	5	
	6	## Problem
	7	
	8	`login()` in `app.js` logs a username and returns a stub result. There is no
	9	way to attribute a login to a returning person: the username is whatever was
	10	typed into the form, and nothing ties today's login to last week's.
	11	
	12	The request was to add a `userId` parameter to `login()` so logins can be
	13	attributed. The app has no `userId` anywhere and no form field that could
	14	supply one, so the parameter needs a source. The follow-up requirement — that
	15	it work across the app, and that forms not yet written will need it — makes
	16	that source shared infrastructure rather than a local edit.
	17	
	18	## Goals
	19	
	20	- `login()` accepts a `userId` as an explicit third parameter.
	21	- A stable per-person identifier, persisted client-side, surviving page
	22	  reloads and browser restarts.
	23	- One shared source that forms not yet written can use without each inventing
	24	  its own.
	25	- Unit test coverage for the identifier module's branching behavior.
	26	
	27	## Non-Goals
	28	
	29	These are deliberate exclusions, not oversights:
	30	
	31	- **No consent mechanism, opt-out, or expiry.** The identifier persists until
	32	  the user clears site data. Client-side persistence was raised explicitly
	33	  during design and accepted.
	34	- **No backend integration.** `login()` remains a stub; `API_ENDPOINT` is
	35	  still never called. The `userId` reaches the console and nowhere else.
	36	- **No server-assigned identity.** Considered and rejected for now: it is the
	37	  authoritative long-term shape, but it is blocked on an API contract that
	38	  does not exist.
	39	- **No changes to `src/index.js` or `src/utils.js`.** Both are unreferenced by
	40	  `index.html`. "Across the app" is scoped to the browser surface.
	41	- **No new form fields and no changes to `validateForm`.** The identifier is
	42	  not user input and is not validated.
	43	- **No linter or formatter.** Offered during design and declined.
	44	
	45	## Decisions
	46	
	47	Each was chosen over stated alternatives during brainstorming.
	48	
	49	| Decision | Chosen | Rejected alternatives |
	50	|---|---|---|
	51	| What the id identifies | A person, across visits | A single visit (in-memory); a server-assigned id |
	52	| Where it lives | `localStorage` | Cookie; in-memory only |
	53	| How callers get it | Shared module, passed as an explicit parameter | Read implicitly inside `login()`; injected by a submit-handler wrapper |
	54	| How the module loads | Plain global script tag | ES modules (breaks `file://` loading) |
	55	| Stored shape | Versioned JSON envelope | Bare string (a later second field would be a migration) |
	56	| Tooling added | `node:test` unit tests | Also adding ESLint/Prettier |
	57	
	58	The loading model and the storage model were split deliberately: converting to
	59	ES modules later is mechanical and leaves stored data untouched, whereas
	60	changing the stored format after ids exist in real browsers is a migration.
	61	The care was spent on the expensive-to-change side.
	62	
	63	## Architecture
	64	
	65	One new module, one new global, one new parameter.
	66	
	67	```
	68	index.html
	69	  ├─ <script src="src/identity.js">   (new, loaded first)
	70	  │     └─ window.AppIdentity = { getUserId }
	71	  └─ <script src="app.js">
	72	        └─ login(username, password, AppIdentity.getUserId())
	73	```
	74	
	75	`src/identity.js` is an IIFE attaching a single object to the global scope,
	76	matching the existing pattern in `app.js` (global function declarations, no
	77	module system). `identity.js` is placed before `app.js`. Because
	78	`AppIdentity.getUserId()` is called at submit time rather than at load time,
	79	either order happens to work today; the stated order is required so that a
	80	future load-time caller does not silently break.
	81	
	82	### Data model
	83	
	84	One `localStorage` key, `app.identity`, holding:
	85	
	86	```json
	87	{ "v": 1, "userId": "9f2c1a44-...", "createdAt": "2026-09-30T12:00:00.000Z" }
	88	```
	89	
	90	`v` is written for future readers. No code branches on it today — see the
	91	lenient read below. `createdAt` is an ISO 8601 string recording first
	92	generation; it is never updated.
	93	
	94	The `userId` is an opaque UUID v4. It carries no personally identifying
	95	information and is not derived from the username.
	96	
	97	### `getUserId()` resolution order
	98	
	99	Memoized once per page load. Resolution:
	100	
	101	1. If a value was already resolved this page load, return it.
	102	2. Read and parse the stored key. **If it parses and contains a non-empty
	103	   string `userId`, return that value regardless of `v`.**
	104	3. Otherwise — key absent, unparseable, wrong shape, or empty `userId` —
	105	   generate a new id, write a fresh record, return it. No attempt is made to
	106	   salvage a corrupt record.
	107	
	108	The lenient read at step 2 is deliberate. A record written by a future schema
	109	version, or read after a rollback to this build, must not be clobbered. Adding
	110	a version check would risk destroying exactly the persistent ids this feature
	111	exists to maintain, in exchange for no present benefit.
	112	
	113	### Generation
	114	
	115	`crypto.randomUUID()` when available; otherwise a v4 assembled from
	116	`crypto.getRandomValues`. There is no `Math.random` fallback — any environment
	117	providing `localStorage` provides `getRandomValues`.
	118	
	119	### Failure behavior
	120	
	121	Every `localStorage` read and write is wrapped. A throw (Safari private
	122	browsing, blocked site data, exceeded quota) falls through to an in-memory
	123	identifier for the current page load.
	124	
	125	Two consequences, both accepted during design:
	126	
	127	- `getUserId()` never throws and never returns `undefined`. Callers need no
	128	  guard. A login form must not fail because analytics cannot persist.
	129	- Tracking silently degrades from per-person to per-visit for that user, and
	130	  the resulting id is **not distinguishable** in the logs from a persisted
	131	  one. Making it distinguishable was offered and declined; it would be an
	132	  additional envelope field.
	133	
	134	## Changes to `app.js`
	135	
	136	All additive; no existing behavior is removed.
	137	
	138	```js
	139	function login(username, password, userId) {
	140	  if (!userId) {
	141	    console.warn("login() called without a userId; this login will not be attributable");
	142	  }
	143	  console.log("Logging in:", username, "userId:", userId);
	144	  return { success: true, user: username, userId };
	145	}
	146	```
	147	
	148	The call site becomes `login(username, password, AppIdentity.getUserId())`.
	149	
	150	The warning addresses the known weakness of the explicit-parameter approach:
	151	a future form can forget to pass the id. The warning cannot prevent that, but
	152	it surfaces the omission in the console rather than leaving a silent
	153	`undefined` in the logs.
	154	
	155	`userId` is included in the return value so the existing
	156	`console.log("Login result:", result)` at the call site carries it without a
	157	further change.
	158	
	159	## Testing
	160	
	161	`package.json` gains `"scripts": { "test": "node --test test/" }` and remains
	162	at zero dependencies.
	163	
	164	`src/identity.js` is a browser IIFE that depends on `localStorage` and
	165	`crypto` and memoizes its result. Node provides neither storage API
	166	reliably, and the memoization means a naively-loaded module would leak state
	167	between cases — the first test to run would poison every later "first visit"
	168	assertion.
	169	
	170	Rather than add test-only hooks to production code, the suite loads
	171	`src/identity.js` into a **fresh `node:vm` context per test case**, injecting
	172	a fake `localStorage` and `crypto` into that context's globals, then reads
	173	`AppIdentity` back out of it. Production code stays free of test scaffolding
	174	and every case gets a genuinely cold module.
	175	
	176	Cases:
	177	
	178	1. Cold start with empty storage writes a well-formed record (`v`, `userId`,
	179	   `createdAt`) and returns the id.
	180	2. A second call in the same context returns the same id and does not write
	181	   again.
	182	3. An existing valid record is returned as-is and not overwritten.
	183	4. Malformed JSON regenerates and overwrites.
	184	5. Valid JSON with no `userId` regenerates and overwrites.
	185	6. A record with `v: 99` and a valid `userId` is returned untouched
	186	   (the lenient read).
	187	7. `getItem` throwing yields a valid, stable id with nothing propagating to
	188	   the caller.
	189	8. `setItem` throwing yields a valid id with nothing propagating.
	190	9. With `crypto.randomUUID` absent, the `getRandomValues` path still yields a
	191	   well-formed v4.
	192	
	193	Beyond the unit suite, the browser integration (script ordering, the wired
	194	call site) is verified manually by opening `index.html` and submitting the
	195	form: the console should show a `userId` on the login line, and the same id
	196	should reappear after a reload.
	197	
	198	## Files
	199	
	200	| File | Change |
	201	|---|---|
	202	| `src/identity.js` | New. The module. |
	203	| `app.js` | `login()` signature, warning, log line, return value, call site. |
	204	| `index.html` | One `<script>` tag before `app.js`. |
	205	| `package.json` | `test` script. |
	206	| `test/identity.test.js` | New. The nine cases. |
	207	| `test/helpers/load-identity.js` | New. The `vm`-context loader. |
	208	
	209	## Risks
	210	
	211	- **The explicit parameter can be forgotten.** Mitigated by the console
	212	  warning, not prevented. This was the accepted cost of choosing an explicit
	213	  parameter over reading the id inside `login()`.
	214	- **Global namespace and load order.** `AppIdentity` is a global and depends
	215	  on script ordering. Accepted to keep `file://` loading working; converting
	216	  to ES modules later is mechanical.
	217	- **A persistent client-side identifier has privacy implications.** No consent
	218	  mechanism is in scope. The identifier is opaque and carries no PII, but it
	219	  does persist indefinitely.
	220	- **Assumption: `file://` loading matters.** This drove the choice of a global
	221	  script over ES modules. Validate by asking whether the page is ever opened
	222	  directly rather than served; if it is always served over http, approach B
	223	  becomes preferable and this decision should be revisited before
	224	  implementation.


## Adjudicated decisions

NOT PROVIDED: flag not passed

## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
