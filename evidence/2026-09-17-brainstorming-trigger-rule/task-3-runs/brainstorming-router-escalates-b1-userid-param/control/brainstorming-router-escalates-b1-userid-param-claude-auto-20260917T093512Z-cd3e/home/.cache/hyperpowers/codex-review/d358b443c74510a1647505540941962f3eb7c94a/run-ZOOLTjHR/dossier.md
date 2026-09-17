# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T093512Z-cd3e/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-login-user-tracking-design.md

	1	# Login User Tracking — Design
	2	
	3	Date: 2026-09-17
	4	Status: Approved design, pending spec review
	5	
	6	## Problem
	7	
	8	The request was "add a `userId` parameter to the login function so we can
	9	track who logged in." Two things in the current code prevent taking that
	10	literally.
	11	
	12	`login(username, password)` in `app.js` is called from exactly one place: the
	13	form submit handler, which has only the two form fields to work with. Nothing
	14	in the flow knows a user ID before authentication happens, so there is no
	15	value a caller could pass.
	16	
	17	Separately, the repository has no tracking of any kind. `console.log` is the
	18	only output anywhere in the tree. "Track who logged in" names a capability
	19	that does not exist yet.
	20	
	21	The design below resolves both: the user ID becomes an output of
	22	authentication rather than an input to it, and login events go through a
	23	named seam that can later carry a real transport.
	24	
	25	## Decisions
	26	
	27	Each of these was chosen explicitly during brainstorming.
	28	
	29	| Question | Decision | Reason |
	30	|---|---|---|
	31	| Where does `userId` come from? | The server returns it | Authentication is what turns credentials into an identity; the client cannot know the ID beforehand |
	32	| Where do login events go? | A `tracking.js` module with a sink seam | Smallest change that makes tracking a real capability without committing to a vendor or wire format |
	33	| Which events are tracked? | Successful logins only | Matches the request; the stub always succeeds, so a failure path today would be untestable |
	34	| Test tooling | `node:test` + `jsdom` | The durable behavior lives in a DOM event handler; shallower tests would assert stub-invented values |
	35	
	36	## Global Constraints
	37	
	38	- No automated linting or formatting is configured in this repository, and
	39	  none is being added as part of this work.
	40	- Test infrastructure is being established by this change: `node --test` as
	41	  the runner, `jsdom` as the only dependency.
	42	- `app.js` remains a classic browser script. No bundler, no module system, no
	43	  dual CommonJS/browser export shim.
	44	- The design document is not committed.
	45	
	46	## Architecture
	47	
	48	### `login` returns the identity it establishes
	49	
	50	The signature is unchanged. The stubbed return value grows a `userId` field:
	51	
	52	```js
	53	function login(username, password) {
	54	  // Stub: would POST to API_ENDPOINT in real app; the server is the
	55	  // authority on user identity, so userId comes back in the response.
	56	  const userId = `user-${username}`;  // stub: server would assign this
	57	  return { success: true, userId, user: username };
	58	}
	59	```
	60	
	61	The fabricated ID is derived from the username so it is stable across calls
	62	and visibly synthetic, consistent with the existing stub comment. Replacing
	63	the stub with a real request means deleting the derivation and reading
	64	`userId` off the response body; no caller changes.
	65	
	66	### `tracking.js` — the new seam
	67	
	68	A new classic browser script, matching `app.js`'s style: top-level function
	69	declarations, no namespace object.
	70	
	71	```js
	72	function trackLoginEvent({ userId, timestamp }) {
	73	  // Sink seam: replace this with a real telemetry transport.
	74	  console.log("Login event:", { userId, timestamp });
	75	}
	76	```
	77	
	78	The event carries `userId` and `timestamp` only. `username` is deliberately
	79	excluded: `userId` already answers "who," and two identity fields on one event
	80	can disagree.
	81	
	82	### Wiring
	83	
	84	`index.html` loads `tracking.js` before `app.js`, since classic scripts
	85	execute in document order and `app.js` calls into it.
	86	
	87	```html
	88	<script src="tracking.js"></script>
	89	<script src="app.js"></script>
	90	```
	91	
	92	The submit handler records the event:
	93	
	94	```js
	95	const result = login(username, password);
	96	if (result.success) {
	97	  trackLoginEvent({ userId: result.userId, timestamp: Date.now() });
	98	}
	99	console.log("Login result:", result);
	100	```
	101	
	102	The call sits in the handler rather than inside `login`. `login` is a stub for
	103	a network call; when it becomes async, a tracking call buried inside it would
	104	be entangled in the promise chain. Keeping it in the handler means
	105	authentication does one job and the handler decides what to record, so
	106	replacing the stub touches `login` alone.
	107	
	108	## Data Flow
	109	
	110	1. User submits the form.
	111	2. Handler reads `username` and `password` from the DOM.
	112	3. `validateForm` rejects missing fields — no event is recorded.
	113	4. `login` returns `{ success, userId, user }`.
	114	5. On success only, the handler calls `trackLoginEvent({ userId, timestamp })`.
	115	6. `trackLoginEvent` writes to its sink (currently the console).
	116	
	117	## Error Handling
	118	
	119	Validation failures follow the existing path: `console.error` with the
	120	validation message, and no tracking event. This is unchanged behavior.
	121	
	122	`login` cannot currently fail — the stub returns `success: true`
	123	unconditionally. The handler still guards on `result.success` so that
	124	introducing real failures does not silently start recording failed attempts as
	125	successes.
	126	
	127	Tracking is fire-and-forget by design. A failing sink must not affect the
	128	login flow. With a console sink this is trivially true; the constraint is
	129	recorded here because it binds whatever transport replaces the seam.
	130	
	131	## Testing
	132	
	133	Runner: `node --test`, added as the `test` script in `package.json`.
	134	Dependency: `jsdom` (devDependency, the repository's first).
	135	
	136	Tests load `index.html` through jsdom with script execution enabled, then
	137	replace `window.trackLoginEvent` with a recorder before dispatching events.
	138	Because `trackLoginEvent` is resolved as a global at call time, this
	139	substitution works without modifying `app.js` — which is why no export shim is
	140	needed.
	141	
	142	Two tests, both asserting behavior that survives the stub being replaced:
	143	
	144	1. **A successful submission records exactly one event carrying the userId
	145	   from the login result.** Fill both fields, dispatch `submit`, assert one
	146	   recorded event whose `userId` equals the value `login` returned.
	147	2. **A submission failing validation records no event.** Leave a field empty,
	148	   dispatch `submit`, assert nothing was recorded.
	149	
	150	Deliberately not tested: the exact value of the fabricated `userId`, and the
	151	console output format of the sink. Both are stub details that a real backend
	152	deletes.
	153	
	154	Assumption: `jsdom` installs cleanly in this environment, validate via running
	155	`npm install` before writing tests. This environment is behind a corporate
	156	proxy; if the install fails, the fallback is to raise it rather than silently
	157	switching to an untested manual-verification path.
	158	
	159	## Files Touched
	160	
	161	| File | Change |
	162	|---|---|
	163	| `app.js` | `login` returns `userId`; handler calls `trackLoginEvent` on success |
	164	| `tracking.js` | New — `trackLoginEvent` with the sink seam |
	165	| `index.html` | New script tag before `app.js` |
	166	| `package.json` | `test` script, `jsdom` devDependency |
	167	| `test/login-tracking.test.js` | New — the two tests above |
	168	
	169	## Out of Scope
	170	
	171	- Failed-login and validation-error tracking. The seam supports adding them;
	172	  adding them now would mean a nullable `userId` serving an untestable path.
	173	- A real telemetry transport or endpoint.
	174	- Replacing the `login` stub with a real API call.
	175	- Linting and formatting configuration.
	176	- Any change to `src/`, which is unrelated to the login flow.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T093512Z-cd3e/home/.cache/hyperpowers/codex-review/d358b443c74510a1647505540941962f3eb7c94a/run-ZOOLTjHR/adjudications.md

	1	# Approved Design Context — Login User Tracking
	2	
	3	## Original user request
	4	
	5	"Add a userId parameter to the login function so we can track who logged in."
	6	
	7	## Repository state at time of design
	8	
	9	Four-file stub webapp. `app.js` holds `login(username, password)`, a
	10	`validateForm` helper, and a single form-submit handler. `index.html` loads
	11	`app.js` as a classic script. `src/index.js` and `src/utils.js` are an
	12	unrelated CommonJS hello-world. `package.json` has no scripts and no
	13	dependencies. No tests, no linting, no logging, no tracking of any kind.
	14	
	15	## Decisions the user explicitly approved during brainstorming
	16	
	17	Each was presented as an explicit multiple-choice fork with tradeoffs stated in
	18	chat; the user selected the option recorded here.
	19	
	20	1. **Where `userId` comes from — "server returns it."** The user was offered:
	21	   (a) server returns it, (b) caller supplies a browser-generated pre-auth
	22	   device/session ID, (c) `userId` is just an alias for the username. They
	23	   chose (a). Consequence: `login`'s signature does NOT change. The literal
	24	   request to "add a userId parameter" was deliberately not taken literally,
	25	   because the form has no user ID available before authentication. This is an
	26	   approved deviation from the wording of the request, not an oversight.
	27	
	28	2. **Where login events go — "tracking module with a seam."** Offered:
	29	   (a) a new `tracking.js` exposing `trackLoginEvent()` that logs today with
	30	   one clear place to add a real sink, (b) extend the existing `console.log`,
	31	   (c) POST to a telemetry endpoint. They chose (a).
	32	
	33	3. **Which events are tracked — "successes only."** Offered: (a) successful
	34	   logins only, (b) successes plus failed authentication, (c) both plus
	35	   client-side validation errors. They chose (a). Failure tracking was
	36	   explicitly placed out of scope on the grounds that the stub always returns
	37	   `success: true`, so a failure path would be untestable today.
	38	
	39	4. **Test tooling — "node:test + jsdom."** Offered: (a) `node:test` + `jsdom`
	40	   testing the handler wiring, (b) no automated tests, (c) `node:test` alone
	41	   with a dual CommonJS/browser export shim. They chose (a). This adds the
	42	   repository's first dependency, which was stated as a cost when the choice
	43	   was made.
	44	
	45	5. **Architecture section approved.** The user reviewed the full architecture
	46	   (login return shape, `tracking.js` contents, script ordering, call site in
	47	   the handler rather than inside `login`) and replied "looks good, go ahead."
	48	
	49	## Notes for the reviewer
	50	
	51	- The decision NOT to add a parameter to `login` is the central approved
	52	  decision. A finding that the spec fails to satisfy the literal request is
	53	  already adjudicated; raise it only if the reasoning itself is wrong.
	54	- Scope exclusions in the spec's "Out of Scope" section are deliberate YAGNI
	55	  calls made with the user, not gaps.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
