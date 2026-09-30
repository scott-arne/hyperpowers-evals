# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T175559Z-c345/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-login-tracking-design.md

	1	# Login Tracking — Design
	2	
	3	Date: 2026-09-30
	4	Status: awaiting user review
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The original request was "add a `userId` parameter to the login function so we
	10	can track who logged in." Two things about the current code make that request
	11	underdetermined:
	12	
	13	1. `login(username, password)` in `app.js` is the function that *establishes*
	14	   identity. Its only caller — the submit handler at `app.js:17` — has access
	15	   to nothing but the two form inputs, so there is no `userId` available to
	16	   pass in. An inbound `userId` parameter would be `null` on every existing
	17	   code path.
	18	2. "Track" has no implementation to attach to. The repo has no tracking,
	19	   telemetry, analytics, or event module of any kind.
	20	
	21	The goal behind the request is to know who logged in. This design delivers
	22	that goal by surfacing `userId` on login's **return** value and introducing a
	23	small tracking module that records login outcomes.
	24	
	25	## Decisions
	26	
	27	Settled during brainstorming, in order:
	28	
	29	| Question | Decision |
	30	|---|---|
	31	| Where `userId` comes from | Returned by `login()`, not passed in. Signature stays `(username, password)`. |
	32	| What "track" means | A real tracking module, not an inline `console.log`. |
	33	| Where events go | Async `track()` interface over a console sink; a network transport is a later one-file swap. |
	34	| Module system | ES modules, page served over a local static server. `file://` support is explicitly dropped. No bundler. |
	35	| Which events | `login.success` and `login.failure`. Client-side validation rejects are **not** tracked. |
	36	| Who calls the tracker | A `withTracking` decorator at the composition root. |
	37	| Auth implementation | `login()` stays offline but becomes fail-capable, so both event paths are reachable and testable. |
	38	| Sink attachment | `createTracker(sink)` factory with an injected sink. |
	39	| `login()` throwing | Emit `login.failure` with `reason: "error"`, then rethrow. |
	40	| Tooling | Unit tests via `node:test` only. No linter, no e2e, no mutation testing. |
	41	
	42	Rejected, with reasons, so they are not re-proposed:
	43	
	44	- **Inbound `userId` parameter.** Nothing at the call site can supply one.
	45	- **Tracking inside `login()`.** Couples authentication to telemetry; every
	46	  auth test would need a tracker stub.
	47	- **Tracking in the submit handler.** Puts the wiring in the only layer that
	48	  cannot be unit-tested, and a second call site would silently track nothing.
	49	- **Event bus / pub-sub.** Real machinery — registry, lifecycle, ordering —
	50	  for one producer and one consumer in a four-file repo.
	51	- **Third-party analytics SDK.** A vendor decision and the repo's first
	52	  dependency, plus privacy questions, for a capability not yet needed.
	53	- **Bundler (Vite/esbuild).** A build step for a four-file project.
	54	- **Dual-target UMD module.** Would preserve `file://` at the cost of a
	55	  permanent workaround in the source. `file://` was judged expendable.
	56	
	57	## Architecture
	58	
	59	Three modules with one responsibility each, joined at a single composition
	60	point.
	61	
	62	```
	63	index.html
	64	  └── app.js                 DOM wiring only
	65	        ├── src/auth.js         login()          — pure auth, knows nothing of tracking
	66	        ├── src/tracking.js     createTracker()  — pure sink plumbing, knows nothing of auth
	67	        └── src/with-tracking.js withTracking()  — the only module aware of both
	68	```
	69	
	70	`withTracking` is deliberately a separate file rather than a function inside
	71	`tracking.js`. The moment the tracker reads `result.userId` it stops being a
	72	generic tracker and becomes login-specific; keeping the join separate leaves
	73	`tracking.js` reusable for the next thing that needs tracking.
	74	
	75	### Module contracts
	76	
	77	**`src/auth.js`**
	78	
	79	```js
	80	export async function login(username, password)
	81	// -> { success: true,  userId: string, user: string, reason: null }
	82	// -> { success: false, userId: null,   user: string, reason: "invalid_credentials" }
	83	```
	84	
	85	Offline. Does not contact `API_ENDPOINT`. Returns a realistic shape, including
	86	a derived `userId`, and can return `success: false` so the failure path is
	87	reachable. Depends on nothing.
	88	
	89	Two details fixed here so the implementation is not left to guess:
	90	
	91	- **`userId` derivation:** `` `u_${username}` ``. A deterministic placeholder,
	92	  not a random id, so tests can assert on it. It is replaced by the real value
	93	  from the auth response when the `fetch` eventually lands.
	94	- **Failure trigger:** `password.length < 8`. This must be a condition
	95	  `validateForm` does not already block. An empty-password trigger would be
	96	  unreachable through the UI, because `validateForm` rejects empty fields
	97	  before `login()` is ever called — which would leave the failure event
	98	  untestable end to end. A short-but-present password reaches auth.
	99	
	100	**`src/tracking.js`**
	101	
	102	```js
	103	export function createTracker(sink)   // -> async track(event, payload)
	104	export const consoleSink              // (event) => void
	105	export const track                    // createTracker(consoleSink)
	106	```
	107	
	108	`track()` stamps `at` and forwards to the sink. Depends on nothing. The sink
	109	is injected, so tests supply an array collector instead of spying on
	110	`console`.
	111	
	112	**`src/with-tracking.js`**
	113	
	114	```js
	115	export function withTracking(loginFn, track)
	116	// -> async (username, password) => <whatever loginFn returned>
	117	```
	118	
	119	Transparent: callers see exactly what `loginFn` returned. Depends on the
	120	shapes of both, on neither implementation.
	121	
	122	Note a deliberate change from the sketch shown during brainstorming, which
	123	had `withTracking(loginFn)` importing `track` directly. `track` is a second
	124	parameter instead, for the same reason the sink is injected into
	125	`createTracker`: the "a throwing sink does not break login" test needs to
	126	supply a failing tracker, which a hard import makes awkward. `app.js` passes
	127	the default `track` at the composition root, so the call site reads
	128	`withTracking(login, track)`.
	129	
	130	**`app.js`**
	131	
	132	Reduced to DOM wiring: read the two inputs, run `validateForm`, call the
	133	wrapped login, log the result. `validateForm` stays here — it is pure and
	134	would be more testable in `src/`, but it is unrelated to tracking and moving
	135	it is scope creep.
	136	
	137	## Data flow
	138	
	139	1. Submit fires. `preventDefault()`. Read `#username` and `#password`.
	140	2. `validateForm` rejects → `console.error`, return. **No event is emitted** —
	141	   nothing reached auth, so this is form analytics, not login tracking.
	142	3. `await trackedLogin(username, password)`.
	143	4. Wrapper: `const result = await loginFn(...)`, derive the event from
	144	   `result`, `await track(...)`, return `result` unchanged.
	145	5. Handler logs the result.
	146	
	147	The submit handler becomes `async`, because `track()` is async, because the
	148	sink must be swappable for a network transport without an interface
	149	migration. That ripple is the accepted cost of the async seam.
	150	
	151	## Event schema
	152	
	153	```js
	154	{
	155	  event:    "login.success" | "login.failure",
	156	  userId:   string | null,   // null on every failure
	157	  username: string,
	158	  reason:   string | null,   // "invalid_credentials" | "error"; null on success
	159	  at:       number           // Date.now(), stamped inside track()
	160	}
	161	```
	162	
	163	`at` is stamped centrally in `track()` rather than by callers: one clock, and
	164	no caller can omit it or format it differently.
	165	
	166	### Privacy constraints
	167	
	168	- **The password must never appear in any payload.** The design enforces this
	169	  structurally, not by discipline: `withTracking` reads only `result`, never
	170	  the arguments it forwarded, and `login()` never places the password in its
	171	  return value.
	172	- `username` is recorded on failure events. Against a console sink this is
	173	  inert. **When a network transport replaces the console sink, this becomes
	174	  stored personal data** — including typo'd usernames that may belong to
	175	  other people — and needs a retention decision at that point. This note
	176	  exists so that decision is made deliberately rather than inherited.
	177	
	178	## Error handling
	179	
	180	**Invariant: tracking must never break login.** `withTracking` wraps its
	181	`track()` call in `try/catch`. If the sink throws, the wrapper warns on
	182	`console` and returns the auth result unchanged. The `try/catch` lives in the
	183	wrapper rather than in `track()` so that the guarantee holds for any sink,
	184	including ones written later.
	185	
	186	**When `login()` itself throws** (impossible with the offline stub, expected
	187	once a real `fetch` lands): emit `login.failure` with `userId: null` and
	188	`reason: "error"`, then rethrow. The caller's semantics are unchanged and the
	189	outage is visible in tracking. `reason` is what distinguishes an auth outage
	190	from rejected credentials.
	191	
	192	**The wrapper awaits `track()` before returning.** Ordering stays
	193	deterministic and tests stay simple; with a console sink the cost is nil.
	194	Recorded for the future: a network transport would then sit between the user
	195	and their login result, so **whoever swaps the sink must add a timeout or
	196	move to fire-and-forget at that time**. Building that machinery now would
	197	solve a problem the console sink does not have.
	198	
	199	## Module system migration
	200	
	201	`package.json` has no `"type"` field, so Node treats every `.js` file as
	202	CommonJS. The new ESM modules load fine in the browser but would fail under
	203	the test runner. Required changes:
	204	
	205	- `package.json` gains `"type": "module"`.
	206	- `src/index.js` and `src/utils.js` convert from CommonJS to ESM. They are 7
	207	  and 5 lines and unrelated to login; this is a mechanical edit forced by the
	208	  `"type"` change, not opportunistic cleanup.
	209	- `index.html:13` becomes `<script type="module" src="app.js"></script>`.
	210	
	211	Naming the new files `.mjs` would avoid touching the two CommonJS files but
	212	leaves a permanent inconsistency in the tree. Rejected.
	213	
	214	**Consequence to communicate:** opening `index.html` directly from the
	215	filesystem stops working, because CORS blocks ES module loading over
	216	`file://`. The page must be served — e.g. `python3 -m http.server` — and the
	217	README should say so.
	218	
	219	## Testing
	220	
	221	Runner: `node:test` + `node:assert`, both built into Node. The repo stays
	222	zero-dependency. `package.json` gains `"scripts": { "test": "node --test" }`.
	223	
	224	- `test/auth.test.js` — the stub returns both the success and failure shapes,
	225	  with `userId` present on success and `null` on failure.
	226	- `test/tracking.test.js` — `createTracker` stamps `at`, forwards the payload
	227	  intact, and awaits the sink.
	228	- `test/with-tracking.test.js` — the behavioral core:
	229	  - success emits `login.success` carrying the real `userId`;
	230	  - failure emits `login.failure` with `userId: null` and
	231	    `reason: "invalid_credentials"`;
	232	  - **a throwing sink does not break login** — the auth result still returns;
	233	  - a throwing `loginFn` emits `reason: "error"` and rethrows;
	234	  - the wrapper returns the underlying result unchanged;
	235	  - no payload ever contains the password.
	236	
	237	**Known gap: `app.js` is not tested.** Testing DOM wiring requires jsdom, a
	238	dependency added for the thinnest layer in the design. This is acceptable
	239	only because the decorator structure pushes all logic into `src/`, leaving
	240	`app.js` as two input reads and one call. If `app.js` regains logic, this
	241	decision should be revisited.
	242	
	243	## Out of scope
	244	
	245	- Implementing the real `fetch` against `API_ENDPOINT` (no live host or
	246	  response contract exists).
	247	- A network or third-party tracking transport.
	248	- Tracking client-side validation rejects.
	249	- Moving or testing `validateForm`.
	250	- Linting, formatting, end-to-end tests, and mutation testing.
	251	- Any change to `greet()` beyond the mechanical CommonJS-to-ESM conversion.
	252	
	253	## Success criteria
	254	
	255	1. A successful login emits exactly one `login.success` event carrying a
	256	   non-null `userId`.
	257	2. A failed login emits exactly one `login.failure` event with `userId: null`
	258	   and a reason.
	259	3. A validation reject emits no event.
	260	4. A sink that throws leaves the login result intact.
	261	5. No emitted payload contains the password, under any path.
	262	6. `npm test` passes with no dependencies installed.
	263	7. The page works when served, and the README documents that serving is now
	264	   required.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T175559Z-c345/home/.cache/hyperpowers/codex-review/c0b83e48d35cd9a0c88feb74786c510b02d7108b/run-DnaHgul5/adjudications.md

	1	# Approved design context — login tracking
	2	
	3	## Original user request (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Decisions approved by the human partner during brainstorming
	8	
	9	Each was presented as a comparison and explicitly chosen. Treat these as
	10	settled constraints, not open questions. A finding that merely re-opens one of
	11	these without new evidence is out of contract.
	12	
	13	1. **`userId` is returned by `login()`, not passed into it.** The literal
	14	   request (an inbound parameter) was rejected because the only call site has
	15	   no `userId` to supply.
	16	2. **"Track" means a real tracking module**, not an inline `console.log`. This
	17	   is what escalated the task from a bounded change to an architectural one.
	18	3. **Async `track()` over a console sink.** No backend endpoint exists; no
	19	   third-party analytics SDK.
	20	4. **ES modules, page served over a local static server.** `file://` support is
	21	   explicitly dropped. No bundler.
	22	5. **Two events: `login.success` and `login.failure`.** Client-side validation
	23	   rejects are deliberately not tracked. Identity is nullable on failure.
	24	6. **A `withTracking` decorator at the composition root** owns the join, rather
	25	   than tracking inside `login()` or in the submit handler.
	26	7. **`login()` stays offline but becomes fail-capable** — no real `fetch`,
	27	   because `api.example.com` is not a live host and no response contract exists.
	28	8. **Sink injected via a `createTracker(sink)` factory**, for testability.
	29	9. **On `login()` throwing: emit `login.failure` with `reason: "error"`, then
	30	   rethrow.**
	31	10. **Tooling: unit tests via `node:test` only.** Linting, formatting,
	32	    end-to-end tests, and mutation testing were all explicitly declined.
	33	
	34	## Codebase facts
	35	
	36	Four-file test project on branch `feature/webapp-enhancement`, clean tree.
	37	
	38	- `package.json` — no dependencies, no scripts, no `"type"` field.
	39	- `index.html` — loads `<script src="app.js">` (classic script, line 13); form
	40	  `#login-form` with `#username` and `#password`.
	41	- `app.js` — 28 lines, browser globals. Holds `login()`, `validateForm()`, and
	42	  the submit handler. `login()` is a sync stub that always returns
	43	  `{ success: true, user: username }` and never contacts `API_ENDPOINT`.
	44	- `src/index.js`, `src/utils.js` — CommonJS, Node-only, unrelated to login.
	45	- No tracking, telemetry, logging, or test files exist.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
