# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T175619Z-9663/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-login-tracking-design.md

	1	# Login Tracking Design
	2	
	3	Date: 2026-09-30
	4	Status: Approved design, pending implementation plan
	5	
	6	## Problem
	7	
	8	The application has no way to record who logged in. The request that started
	9	this work was "add a `userId` parameter to the login function so we can track
	10	who logged in," but clarification established that the actual requirement is a
	11	tracking capability that persists to a backend and is reusable by other forms
	12	in the app, not a parameter on one function.
	13	
	14	The literal request is also not implementable as stated: `login` has a single
	15	call site (the form submit handler in `app.js`), the form collects only a
	16	username and a password, and no user id exists anywhere in the client at the
	17	moment `login` is called. A user id is produced by authentication rather than
	18	supplied to it.
	19	
	20	## Requirements
	21	
	22	1. Tracking events persist to a backend endpoint.
	23	2. The capability is reusable — the login form is the first consumer, not the
	24	   only one. Other forms will emit events later.
	25	3. Identity is established once, at login, and attached to subsequent events
	26	   automatically. Individual call sites do not plumb a user id.
	27	4. Event delivery never blocks and never fails the user-facing action.
	28	5. Delivery failures remain visible rather than silently swallowed.
	29	6. The wire contract is defined here; no server implements it yet.
	30	7. Failed logins carry no user id, so identity is optional throughout.
	31	
	32	## Global Constraints
	33	
	34	- **Unit tests are required.** Node's built-in `node:test` and `node:assert`.
	35	  No test dependencies are added; the project stays zero-dependency. A `test`
	36	  script is added to `package.json`.
	37	- No linter or formatter is configured as part of this work.
	38	- No end-to-end tests. No bundler, no build step.
	39	- Browser code uses native ES modules.
	40	
	41	## Current State
	42	
	43	The repository is a minimal static webapp: `index.html`, `app.js`,
	44	`package.json`, `README.md`, and an unrelated Node entry point in `src/`.
	45	
	46	Facts relevant to this design:
	47	
	48	- `login(username, password)` in `app.js` is a synchronous stub. It logs the
	49	  username, performs no network call, and returns
	50	  `{ success: true, user: username }`. It has no failure branch.
	51	- `API_ENDPOINT` (`https://api.example.com/login`) is a placeholder and is
	52	  never referenced.
	53	- `app.js` is loaded by a plain `<script src="app.js">` tag and declares bare
	54	  functions in global scope.
	55	- `src/index.js` and `src/utils.js` are CommonJS and are not loaded by the
	56	  page. They do not interact with `app.js` and are out of scope here.
	57	- There is no session layer, user store, storage, or telemetry of any kind.
	58	
	59	## Architecture
	60	
	61	A single new ES module, `tracking.js`, holds the entire capability. `app.js`
	62	becomes a module script and imports it.
	63	
	64	This was chosen over two alternatives:
	65	
	66	- **A global `Tracking` namespace loaded by a second script tag** matches the
	67	  current style and needs no setup, but makes script load order load-bearing,
	68	  couples call sites to an ambient global, and cannot be unit tested without a
	69	  fake DOM. Rejected because the interface every future form will depend on
	70	  should be an explicit import and should be testable.
	71	- **A decoupled event bus**, where forms dispatch domain events and a tracking
	72	  subscriber translates them, gives maximum decoupling but adds indirection
	73	  that is hard to trace and fails silently when nothing is listening. Rejected
	74	  as premature at one producer and one consumer.
	75	
	76	The cost of native ES modules is that module scripts do not load over
	77	`file://`. Opening `index.html` directly stops working; the page must be
	78	served over local HTTP.
	79	
	80	## Components
	81	
	82	### `tracking.js` (new)
	83	
	84	The complete public surface:
	85	
	86	```js
	87	export function identify(userId)          // record the current user
	88	export function reset()                   // clear identity (logout)
	89	export function track(eventName, props)   // emit an event
	90	```
	91	
	92	**Endpoint.** `TRACKING_ENDPOINT` is a module-level constant in `tracking.js`,
	93	alongside the existing `API_ENDPOINT` placeholder convention in `app.js`. Its
	94	value is a placeholder until the server exists.
	95	
	96	**Identity state.** One module-scoped variable holds the current user id,
	97	initialized to `null`. `identify` and `reset` are its only writers. `track`
	98	only reads it. Keeping the write surface to two functions is what makes the
	99	module-level mutable state acceptable.
	100	
	101	`identify` and `reset` only mutate that variable. Neither sends a request, so
	102	`login_succeeded` is the only thing on the wire at login time.
	103	
	104	**`track` is total.** It never throws and never returns a rejected promise, so
	105	no call site needs a `try`. It returns synchronously without awaiting
	106	delivery.
	107	
	108	**Transport.** `fetch` with `keepalive: true`, so the request survives the page
	109	navigation that typically follows a login. Without `keepalive`, the event of
	110	greatest interest is the one most likely to be cancelled.
	111	
	112	`fetch` is resolved from `globalThis` at call time rather than captured at
	113	import time, so tests substitute a fake without dependency-injection plumbing.
	114	This is a deliberate testability requirement, not incidental.
	115	
	116	**No retry and no queue.** Consistent with the fire-and-forget decision below.
	117	
	118	### `app.js` (modified)
	119	
	120	- Becomes an ES module and imports `identify` and `track` from `tracking.js`.
	121	- `login` emits the tracking calls itself, rather than the submit handler doing
	122	  it. The requirement is that every login is recorded; placing the calls in the
	123	  caller would make that depend on each caller remembering. The accepted cost
	124	  is that `login` is no longer purely authentication.
	125	- `login` remains synchronous. Converting it to async is an authentication
	126	  change, not a tracking change, and `track` is never awaited. This should be
	127	  revisited when the real auth endpoint is implemented.
	128	- The stub's return value gains a `userId` field, standing in for what a real
	129	  authentication response would carry.
	130	
	131	### `index.html` (modified)
	132	
	133	The script tag gains `type="module"`.
	134	
	135	### `README.md` (modified)
	136	
	137	Documents that the page must now be served over local HTTP, e.g.
	138	`python3 -m http.server`.
	139	
	140	## Wire Contract
	141	
	142	No server implements this yet. This design defines it; the server-side
	143	implementation is separate work outside this repository, and until it exists
	144	the client has nothing to talk to.
	145	
	146	```
	147	POST <TRACKING_ENDPOINT>
	148	Content-Type: application/json
	149	
	150	{
	151	  "event": "login_succeeded",
	152	  "occurredAt": "2026-09-30T17:56:19.000Z",
	153	  "userId": "u_123",
	154	  "properties": { "username": "alice" }
	155	}
	156	```
	157	
	158	Expected response: `202 Accepted`, body ignored.
	159	
	160	Field notes:
	161	
	162	- `userId` is `null` rather than omitted when identity is unknown, so the
	163	  server schema has exactly one shape.
	164	- `occurredAt` is set by the client, in ISO 8601. `keepalive` requests can
	165	  arrive late, which makes server receipt time an unreliable event time.
	166	- There is no idempotency key. With fire-and-forget delivery and no retry,
	167	  there are no duplicates to guard against.
	168	
	169	## Events
	170	
	171	| Event | `userId` | `properties` |
	172	|---|---|---|
	173	| `login_succeeded` | the authenticated user id | `{ username }` |
	174	| `login_failed` | `null` | `{ username, reason }` |
	175	
	176	`login_failed` is why identity is optional throughout the schema: a failed
	177	authentication produces no user id, so the attempted username is the only
	178	available attribution.
	179	
	180	Note that the current `login` stub has no failure branch, so `login_failed`
	181	becomes reachable only once real authentication exists. It is specified now so
	182	the schema does not have to change later.
	183	
	184	## Data Flow
	185	
	186	1. Submit handler reads username and password, calls `validateForm`.
	187	2. On invalid input, the existing error path runs. No tracking event.
	188	3. On valid input, the handler calls `login(username, password)`.
	189	4. `login` authenticates (currently stubbed) and obtains a user id.
	190	5. On success, `login` calls `identify(userId)` then
	191	   `track('login_succeeded', { username })`.
	192	6. On failure, `login` calls `track('login_failed', { username, reason })`
	193	   and does not call `identify`.
	194	7. `login` returns to the handler. Neither tracking call is awaited, so
	195	   nothing about step 7 depends on delivery.
	196	
	197	## Error Handling
	198	
	199	Every failure path ends in a `console.error` prefixed `[tracking]`, and no
	200	failure path propagates to the caller:
	201	
	202	| Failure | Behavior |
	203	|---|---|
	204	| Network rejection | Caught, logged, event dropped |
	205	| Non-2xx response | Logged with status, event dropped |
	206	| Missing or empty event name | Logged, event dropped, nothing sent |
	207	
	208	**Known limitation, accepted.** Fire-and-forget delivery with console-only
	209	reporting means event loss is visible only to someone with devtools open,
	210	which in production is nobody. The data will have gaps that cannot be
	211	measured. This is the accepted cost of never blocking login, and should be
	212	revisited only if the data becomes compliance-relevant — at which point a
	213	local buffer with retry, deliberately rejected here as premature, becomes the
	214	right answer.
	215	
	216	## Testing
	217	
	218	Unit tests for `tracking.js` using `node:test` and `node:assert`, run via a
	219	`test` script in `package.json`. Tests substitute `globalThis.fetch` with a
	220	fake and restore it afterward.
	221	
	222	Cases:
	223	
	224	1. `identify` then `track` sends the recorded `userId`.
	225	2. `track` without a prior `identify` sends `userId: null`.
	226	3. `reset` clears identity; a subsequent `track` sends `userId: null`.
	227	4. The request body carries the event name, an ISO 8601 `occurredAt`, and the
	228	   supplied properties.
	229	5. The request is issued with `keepalive: true`.
	230	6. A non-2xx response is logged and does not throw.
	231	7. A rejected `fetch` is logged and does not throw.
	232	8. `track` returns synchronously and does not block on the response.
	233	9. An empty or missing event name sends nothing and does not throw.
	234	
	235	The DOM wiring in `app.js` is not unit tested; it requires a browser
	236	environment, and keeping all logic in `tracking.js` is what keeps that
	237	untested surface trivial.
	238	
	239	## Out of Scope
	240	
	241	- Implementing the tracking endpoint. It does not exist.
	242	- Implementing real authentication, or the login POST to `API_ENDPOINT`.
	243	- Converting `src/` from CommonJS to ES modules. The repository mixes module
	244	  conventions and this design adds a third; unifying is a worthwhile two-file
	245	  change but is unrelated to tracking.
	246	- Session management, logout UI, and any second consumer of `track`. The
	247	  interface is designed for reuse; wiring additional forms is later work.
	248	- Retry, local buffering, and offline delivery.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T175619Z-9663/home/.cache/hyperpowers/codex-review/39a7da06409c4436a1ad02667bd48a3049b1ff42/run-s8t6o2VW/adjudications.md

	1	# Approved design decisions
	2	
	3	Original user request, verbatim:
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	The request was reclassified as architectural during brainstorming because the
	8	user clarified the outcome requires a persistent, app-wide tracking capability
	9	rather than a parameter. Each decision below was presented to the user with
	10	tradeoffs and explicitly approved by them.
	11	
	12	| # | Decision | Approved value | Alternatives rejected |
	13	|---|---|---|---|
	14	| 1 | Scope | A reusable tracking capability, not a `userId` parameter on `login` | Parameter-only change; returning `userId` from `login` |
	15	| 2 | Persistence | POST to a backend endpoint | Browser `localStorage`; local buffer flushed to server |
	16	| 3 | Endpoint exists? | No — this design defines the wire contract; server is separate work outside this repo | Using an existing endpoint; reusing the login endpoint |
	17	| 4 | Identity | `identify(userId)` at login; later `track()` calls attach identity automatically | Explicit `userId` on every call; reading from a session layer |
	18	| 5 | Failure mode | Fire-and-forget; login never waits on or fails from tracking; errors logged to console | Await and surface without blocking; tracking failure fails login |
	19	| 6 | Architecture | Native ES modules, no build step | Global `Tracking` namespace via a second script tag; decoupled event bus |
	20	| 7 | Call placement | Tracking calls live inside `login`, not the submit handler | Calls in the form submit handler |
	21	| 8 | `login` signature | Stays synchronous for now | Convert to async as part of this change |
	22	| 9 | Tooling | Unit tests via Node's built-in `node:test` / `node:assert`, zero new dependencies | Adding a linter/formatter; end-to-end tests; no tooling at all |
	23	
	24	Explicitly accepted costs (the user was told and approved):
	25	
	26	- Console-only error reporting means event loss is invisible in production.
	27	- ES module scripts do not load over `file://`, so the page must now be served
	28	  over local HTTP.
	29	- `login` is no longer purely authentication, since it emits tracking calls.
	30	- The stub's `userId` is invented placeholder data until real authentication
	31	  and the tracking endpoint exist.
	32	
	33	Out of scope by decision: implementing the tracking endpoint, implementing real
	34	authentication, converting `src/` from CommonJS to ES modules, session
	35	management, additional `track()` consumers, and retry/buffering/offline
	36	delivery.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
