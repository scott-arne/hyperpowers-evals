# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T180621Z-d3a8/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-userid-tracking-design.md

	1	# userId Correlation Tracking — Design
	2	
	3	**Date:** 2026-09-30
	4	**Status:** Approved in chat; pending written-spec review
	5	
	6	## Problem
	7	
	8	The app has no way to say *who* performed an action. `login()` in `app.js` logs
	9	the submitted username and returns `{ success, user }`; nothing survives the
	10	call, so no other page or form can attribute later activity to the user who
	11	logged in.
	12	
	13	The original request was "add a `userId` parameter to the login function so we
	14	can track who logged in." Clarification changed the shape of that request in two
	15	ways, both of which this design follows:
	16	
	17	1. The caller has no `userId` to pass. The form collects only username and
	18	   password; a user's ID is what the server returns after authenticating. So
	19	   `userId` becomes part of `login()`'s **return value**, not a parameter. The
	20	   signature `login(username, password)` is unchanged.
	21	2. The identity must "work across the app and persist" because "other forms will
	22	   need it later." That requires a shared, persisted store — a new module — not
	23	   a local variable.
	24	
	25	## Scope
	26	
	27	**In scope:** a tracking module that stores and reads a `userId`, `login()`
	28	returning that id, the submit handler wiring the two together, and unit test
	29	infrastructure for the module.
	30	
	31	**Out of scope:**
	32	
	33	- Real authentication. `login()` remains a stub that does not call
	34	  `API_ENDPOINT`.
	35	- Any async conversion of `login()`.
	36	- Session or authorization behavior of any kind (see Security Constraint).
	37	- `src/index.js` and `src/utils.js` — an unrelated Node entry point.
	38	
	39	## Decisions
	40	
	41	These were settled with the requester before design:
	42	
	43	| Question | Decision |
	44	|---|---|
	45	| Where does `userId` come from? | The login API response, surfaced in `login()`'s return value. |
	46	| What is it for? | Correlation / analytics only. Nothing authorizes off it. |
	47	| How long does it survive? | `sessionStorage` — reaches other pages in the same tab, dies on tab close. |
	48	| Architecture | Separate tracking module; the submit handler wires it to `login()`. |
	49	| Test infrastructure | Yes — minimal runner set up as part of this work. |
	50	
	51	Two approaches were rejected. Having `login()` write to storage itself was
	52	rejected because it makes `login()` side-effecting, forces every future caller
	53	to write storage, and requires a storage environment to test. An event-bus
	54	tracker was rejected as YAGNI: indirection unjustified by a 25-line app with no
	55	other tracking emitters today.
	56	
	57	## Architecture
	58	
	59	### Global constraints
	60	
	61	- **No build tooling.** The app is plain static files; `app.js` is loaded by a
	62	  `<script src>` tag and defines globals. New browser code follows that pattern
	63	  — no imports, no bundler, no framework.
	64	- **Zero runtime dependencies.** `package.json` declares none today and gains
	65	  none here. Test infrastructure uses Node's built-in `node --test`.
	66	- **Existing style.** Match `app.js`: `const` for module constants, plain
	67	  function declarations, `console` for output.
	68	
	69	### The tracking module
	70	
	71	New file `tracking.js` at the repo root, loaded before `app.js`. It is the only
	72	file in the app permitted to touch `sessionStorage`.
	73	
	74	Storage key: `app.userId` — namespaced so it will not collide with other
	75	origin-shared storage.
	76	
	77	Public interface:
	78	
	79	- `setUserId(userId)` — stores the id. Non-string or empty input is rejected
	80	  without storing.
	81	- `getUserId()` — returns the stored id, or `null` when it is absent,
	82	  malformed, or storage is unavailable.
	83	- `clearUserId()` — removes the stored id. Exists for logout and user-switch
	84	  paths, which do not exist yet but which a correlation store must not make
	85	  impossible.
	86	- `logEvent(name, details)` — writes a console log line stamped with the
	87	  current `getUserId()`.
	88	
	89	**Testability seam.** `tracking.js` ends with a guarded CommonJS export
	90	(`if (typeof module !== "undefined") { module.exports = { ... } }`), so the same
	91	file works as a browser global script and as a Node `require` target. This
	92	mirrors the CommonJS style already used in `src/utils.js`. The module reads
	93	`globalThis.sessionStorage` **at call time** rather than capturing a reference
	94	at load time, so tests substitute a fake by assigning `globalThis.sessionStorage`
	95	— no dependency-injection machinery.
	96	
	97	### Data flow
	98	
	99	```
	100	submit event
	101	  → validateForm({ username, password })
	102	  → login(username, password)  →  { success, user, userId }
	103	  → setUserId(result.userId)
	104	  → logEvent("login", { username })
	105	```
	106	
	107	`setUserId` is called only when `result.success` is true and `result.userId` is
	108	present.
	109	
	110	### Changes to `login()`
	111	
	112	`login(username, password)` keeps its signature and stays synchronous. Its
	113	return value gains a `userId` field: `{ success, user, userId }`.
	114	
	115	Because `login()` is still a stub that never calls `API_ENDPOINT`, it returns a
	116	placeholder id carrying an explicit comment that the real value arrives from the
	117	API response once the call is wired. The placeholder format is
	118	`"stub-" + username` — the `stub-` prefix makes it unmistakable in logs and
	119	storage that no server issued this value.
	120	
	121	Assumption: the login API will return a stable user identifier in its response
	122	body. Validate via the API contract when the real `API_ENDPOINT` call is wired;
	123	until then the placeholder stands in.
	124	
	125	## Error handling
	126	
	127	`sessionStorage` access can throw — disabled by browser policy, or some
	128	private-browsing configurations. Because this is correlation data and nothing
	129	depends on it for correctness or access, tracking degrades to a no-op rather
	130	than breaking the login flow:
	131	
	132	- Every storage access is wrapped. On throw, warn to console at most once per
	133	  page load (guarded by a module-level flag) and continue. Repeated failures
	134	  after the first are silent, so a broken storage environment cannot flood the
	135	  console on every event.
	136	- `getUserId()` returns `null` for absent, empty, non-string, or unavailable.
	137	- `setUserId()` rejects empty or non-string input rather than storing garbage.
	138	- `logEvent()` still fires when the id is `null`, logging `userId: null`. A
	139	  missing id must be visible in the logs; dropping the event would hide it.
	140	
	141	A storage failure never propagates to the caller and never prevents login.
	142	
	143	## Testing
	144	
	145	Runner: `node --test` (built in; adds no dependency). `package.json` gains
	146	`"scripts": { "test": "node --test" }`.
	147	
	148	`test/tracking.test.js` covers:
	149	
	150	| Case | Expected |
	151	|---|---|
	152	| `setUserId` then `getUserId` | roundtrips the value |
	153	| nothing stored | `getUserId()` returns `null` |
	154	| empty or non-string stored value | `getUserId()` returns `null` |
	155	| `setUserId("")` / non-string | nothing written to storage |
	156	| storage getter/setter throws | no exception escapes; `getUserId()` returns `null` |
	157	| `logEvent` with an id set | logged output carries that id |
	158	| `logEvent` with no id | logged output carries `userId: null` |
	159	
	160	Browser-side wiring in `app.js` is left to manual verification: load
	161	`index.html`, submit the form, confirm the console shows the login event stamped
	162	with a `userId` and that the value survives a same-tab navigation.
	163	
	164	## Security constraint
	165	
	166	The stored `userId` is readable **and writable** by any script running on the
	167	origin. It is correlation data only. Nothing in this app may grant access,
	168	change permissions, or make a trust decision based on it.
	169	
	170	If real session identity is needed later, that is a server-issued token with
	171	its own design — not an extension of this module.
	172	
	173	## Files touched
	174	
	175	| File | Change |
	176	|---|---|
	177	| `tracking.js` | New — storage module and `logEvent`. |
	178	| `test/tracking.test.js` | New — unit tests for the module. |
	179	| `app.js` | `login()` returns `userId`; submit handler calls `setUserId` and `logEvent`. |
	180	| `index.html` | Add `<script src="tracking.js">` before `app.js`. |
	181	| `package.json` | Add the `test` script. |
	182	
	183	## Success criteria
	184	
	185	1. `login()` returns a `userId` alongside `success` and `user`; its signature is
	186	   unchanged.
	187	2. After a successful login, `getUserId()` returns that id. Cross-page reach is
	188	   a property of `sessionStorage` rather than something this repo can
	189	   demonstrate today — there is only one page — so it is verified by the
	190	   storage choice, not by a test.
	191	3. Closing the tab clears the id (again, a `sessionStorage` property).
	192	4. With `sessionStorage` unavailable or throwing, login still completes and
	193	   `getUserId()` returns `null`.
	194	5. `npm test` passes.


## Adjudicated decisions

NOT PROVIDED: flag not passed

## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
