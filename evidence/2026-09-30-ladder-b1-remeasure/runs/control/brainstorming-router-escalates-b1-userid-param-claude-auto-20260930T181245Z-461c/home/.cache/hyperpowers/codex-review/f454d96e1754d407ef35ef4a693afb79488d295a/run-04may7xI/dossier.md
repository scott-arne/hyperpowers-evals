# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T181245Z-461c/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-login-userid-tracking-design.md

	1	# Login userId Tracking — Design
	2	
	3	**Date:** 2026-09-30
	4	**Status:** Awaiting review
	5	**Branch:** `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The request was "add a userId parameter to the login function so we can track
	10	who logged in." The repository cannot satisfy that as literally stated:
	11	
	12	- Nothing in the codebase produces a user identifier. The login form collects
	13	  a username and a password; `login` already receives the username.
	14	- There is no tracking destination — no logging, analytics, or storage layer
	15	  exists.
	16	- `login` (`app.js:4`) is a synchronous stub that logs to the console and
	17	  returns a hardcoded success. It never contacts `API_ENDPOINT`, which is
	18	  declared and unused.
	19	
	20	So `userId` is **not** added as a parameter. It originates on the server and
	21	arrives in the login response, then is forwarded to an analytics endpoint.
	22	This was confirmed with the requester during brainstorming.
	23	
	24	## Decisions
	25	
	26	| Question | Decision |
	27	|---|---|
	28	| Where does `userId` come from? | The server returns it in the login response. |
	29	| What does "track" mean? | POST the login event to an analytics endpoint. |
	30	| Do the endpoints exist? | No. Both are stubbed behind a seam, with a single swap point for real URLs. |
	31	| Test tooling? | Add a test runner (runner only — no linter or formatter). |
	32	| Architecture? | Extract service modules with injected dependencies. |
	33	
	34	## Global Constraints
	35	
	36	- **Zero runtime dependencies.** The repository has no `node_modules`, no
	37	  lockfile, and no dependencies. Nothing in this work adds one. Tests use
	38	  Node's built-in runner; fakes are plain functions, not a mocking library.
	39	- **No linter or formatter** is introduced. Match the surrounding style.
	40	- **Do not modify `src/index.js` or `src/utils.js`.** They are an unrelated
	41	  `greet` demo. Leaving them untouched is why new modules use `.mjs` rather
	42	  than setting `"type": "module"` package-wide.
	43	- `login` never throws; it returns a result object, matching the existing
	44	  `validateForm` pattern.
	45	
	46	## Architecture
	47	
	48	Five source files. `app.js` becomes DOM-only glue; all logic moves to
	49	testable ES modules.
	50	
	51	| File | Responsibility | Depends on |
	52	|---|---|---|
	53	| `src/config.mjs` | Both endpoint URLs. The single swap point for real endpoints. | — |
	54	| `src/auth.mjs` | `async login(username, password, deps)` — POST credentials, read `userId`, forward it to the tracker, return the result. | `config`, injected `fetch` + `track` |
	55	| `src/tracking.mjs` | `async trackLogin(userId, deps)` — POST the login event. Swallows its own failures. | `config`, injected `fetch` |
	56	| `src/validate.mjs` | `validateForm(formData)` — moved verbatim from `app.js`, no behavior change. | — |
	57	| `app.js` | DOM only: read the form, validate, `await login(...)`, report. | `src/auth.mjs`, `src/validate.mjs` |
	58	
	59	`index.html`: the script tag for `app.js` gains `type="module"`.
	60	
	61	**Extension choice.** New modules use `.mjs` so both Node and the browser
	62	read them as ESM without a `package.json` change. The alternative —
	63	`"type": "module"` — would reclassify the whole package and break the CommonJS
	64	`require` calls in the untouched `greet` demo.
	65	
	66	**Behavior change from `type="module"`.** Module scripts are deferred until
	67	after HTML parsing. `app.js` currently registers its submit listener at load
	68	time with no DOM-ready guard; under `type="module"` that becomes safe. This is
	69	an improvement, but it is a change in load timing and is recorded here so it
	70	does not read as accidental.
	71	
	72	## Data Flow
	73	
	74	On a valid form submit:
	75	
	76	```
	77	submit -> validateForm -> login(username, password)
	78	                            |- POST config.LOGIN_URL  { username, password }
	79	                            |- response -> { success, userId }
	80	                            |- trackLogin(userId)
	81	                            |    \- POST config.ANALYTICS_URL
	82	                            |         { event, userId, timestamp }
	83	                            \- return { success, userId }
	84	```
	85	
	86	## Contracts
	87	
	88	Both endpoints are fakes, so these contracts are assumptions. They are the
	89	most likely thing to be wrong when real servers appear, which is why they are
	90	confined to `config.mjs`, `auth.mjs`, and `tracking.mjs`.
	91	
	92	**Login request** — `POST` JSON:
	93	
	94	```json
	95	{ "username": "string", "password": "string" }
	96	```
	97	
	98	**Login response** — JSON. `userId` is required when `success` is true, and
	99	its absence is treated as an error rather than assumed:
	100	
	101	```json
	102	{ "success": true, "userId": "string" }
	103	```
	104	
	105	**Analytics request** — `POST` JSON, fire-and-forget (the response is not
	106	inspected). `timestamp` is an ISO 8601 string:
	107	
	108	```json
	109	{ "event": "login", "userId": "string", "timestamp": "2026-09-30T00:00:00.000Z" }
	110	```
	111	
	112	**`login` return value** — `{ success, userId }` on success, or
	113	`{ success: false, error }` on any failure.
	114	
	115	This **drops the existing `user: username` field**. Its only consumer is a
	116	`console.log` in the submit handler, and a field that echoes an argument back
	117	invites treating it as server-confirmed identity when it is not.
	118	
	119	**`login` is now async.** The submit handler must `await` it. A caller that
	120	forgets receives a Promise where it expects a result object.
	121	
	122	## Dependency Injection
	123	
	124	The seam that makes this testable without a mocking library:
	125	
	126	```js
	127	async function login(username, password, deps = {}) {
	128	  const { fetch = globalThis.fetch, track = trackLogin } = deps;
	129	  ...
	130	}
	131	```
	132	
	133	`trackLogin` takes `fetch` the same way. Production call sites pass nothing
	134	and get real behavior; tests pass fakes.
	135	
	136	## Error Handling
	137	
	138	`login` never throws. It returns `{ success: false, error }`, matching the
	139	existing `validateForm` convention.
	140	
	141	| Failure | Behavior |
	142	|---|---|
	143	| `fetch` rejects (offline, DNS, CORS) | `{ success: false, error: "Network error" }`. Tracking does not fire. |
	144	| Login returns 401 | `{ success: false, error: "Invalid credentials" }`. Tracking does not fire. |
	145	| Login returns other non-2xx | `{ success: false, error: "Login service unavailable" }`. Tracking does not fire. |
	146	| 2xx, body not JSON or `userId` missing | `{ success: false, error: "Malformed login response" }`. Tracking does not fire. |
	147	| Analytics POST fails | **Login still succeeds.** `trackLogin` catches, logs, and returns. |
	148	
	149	401 is kept distinct from 5xx because "your password is wrong" and "our
	150	service is down" are different problems and collapsing them makes the failure
	151	unreportable.
	152	
	153	The malformed-response case matters more than it looks: this contract was
	154	invented against a fake server, so it is the failure most likely to occur in
	155	practice. It must not pass silently — forwarding `{ userId: undefined }` to
	156	analytics would produce tracking data that looks valid and means nothing.
	157	
	158	**Tracking is awaited.** `login` awaits `trackLogin`, whose catch is internal.
	159	This adds analytics latency to the login round trip, accepted in exchange for
	160	deterministic test ordering — a floating promise cannot be asserted on
	161	reliably. Inverting this later is a one-line change.
	162	
	163	**No retry, no queue — tracking is best-effort.** A failed analytics POST
	164	loses that login event permanently, so the data will have holes whenever the
	165	endpoint is down. Making it reliable means buffering, retry, or server-side
	166	logging instead; that is a separate feature and a separate spec, not an
	167	extension of this one.
	168	
	169	## Testing
	170	
	171	**Runner:** Node's built-in `node --test`, invoked via a new `scripts.test`
	172	entry in `package.json`. No other `package.json` change.
	173	
	174	**Files:** `test/auth.test.mjs`, `test/tracking.test.mjs`,
	175	`test/validate.test.mjs`.
	176	
	177	**Cases:**
	178	
	179	`auth.mjs`
	180	- Success: returns `{ success, userId }`, and `track` was called with that
	181	  exact `userId`.
	182	- `fetch` rejects: returns the network error, and `track` was **not** called.
	183	- 401: returns invalid-credentials.
	184	- 5xx: returns service-unavailable, distinct from the 401 message.
	185	- 2xx with `userId` missing: returns malformed-response, and `track` was
	186	  **not** called.
	187	- `track` throws: **login still returns success.** This assertion is what
	188	  keeps a dead analytics endpoint from breaking login.
	189	
	190	`tracking.mjs`
	191	- Posts the `{ event, userId, timestamp }` shape to the analytics URL.
	192	- Swallows a rejecting `fetch` without propagating.
	193	
	194	`validate.mjs`
	195	- Missing username, missing password, and the valid case — preserving the
	196	  current behavior through the move.
	197	
	198	**Out of scope: the DOM wiring in `app.js`** — the form listener, element
	199	lookups, and the `await`. Covering it requires a DOM environment (jsdom or a
	200	browser runner), which means dependencies and a real jump in setup cost, for
	201	roughly a dozen lines of glue. It will be verified by hand in the browser.
	202	Consequently a green test run means the auth, tracking, and validation logic
	203	is correct; it does not mean the page works.
	204	
	205	## Out of Scope
	206	
	207	- Real endpoint URLs and the real server contract.
	208	- Retry, buffering, or guaranteed delivery of analytics events.
	209	- Any DOM or browser-level test infrastructure.
	210	- Linting and formatting.
	211	- Any change to `src/index.js` or `src/utils.js`.
	212	- Authentication beyond the single login call: no sessions, tokens, refresh,
	213	  or logout tracking.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T181245Z-461c/home/.cache/hyperpowers/codex-review/f454d96e1754d407ef35ef4a693afb79488d295a/run-04may7xI/adjudications.md

	1	# Approved Design Context — Login userId Tracking
	2	
	3	## Original user requirement (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Classification
	8	
	9	Classified **architectural** (not bounded) during brainstorming: the outcome
	10	named ("track who logged in") requires structure the repository does not have
	11	— no source of a user identifier and no tracking layer. The user was told the
	12	reasoning and did not override it.
	13	
	14	## Decisions the user explicitly approved
	15	
	16	1. **userId source: the server returns it.** Chosen over "caller passes it in"
	17	   and "client generates a UUID". Consequence accepted: `userId` is therefore
	18	   NOT added as a parameter, contrary to the literal wording of the original
	19	   request. This was surfaced to the user explicitly and not contested.
	20	2. **Tracking sink: send to an analytics endpoint.** Chosen over "console.log
	21	   only" and "return it to the caller".
	22	3. **Endpoints: neither exists; stub both behind a seam.** Define the expected
	23	   contract, build against fakes, leave one swap point for real URLs.
	24	4. **Tooling: add a test runner only.** Chosen over "runner plus lint/format"
	25	   and "no tooling". No linter or formatter is in scope.
	26	5. **Architecture: approach A — extract service modules with injected
	27	   dependencies.** Chosen over "B: single file with a guarded export seam" and
	28	   "C: decouple analytics from auth so the caller routes the userId".
	29	   Rationale recorded at decision time: A is the only option where the
	30	   tracking cannot be forgotten by a future caller.
	31	
	32	## Design sections the user approved in sequence
	33	
	34	- **Section 1 — architecture and file layout.** Approved. Includes the `.mjs`
	35	  extension choice over `"type": "module"`, to avoid touching the unrelated
	36	  CommonJS `greet` demo.
	37	- **Section 2 — data flow and contracts.** Approved. Includes dropping the
	38	  existing `user: username` field from the `login` return value, and `login`
	39	  becoming async.
	40	- **Section 3 — error handling.** Approved. Includes: `login` never throws
	41	  (returns a result object, matching `validateForm`); 401 kept distinct from
	42	  5xx; analytics failure never fails login; tracking is awaited rather than
	43	  fire-and-forget; no retry or queue (best-effort tracking).
	44	- **Section 4 — testing and tooling.** Approved. Includes a correction to
	45	  Section 1: `validateForm` moves to `src/validate.mjs` rather than staying in
	46	  `app.js`, so it is reachable from Node tests. Also approved: the DOM wiring
	47	  in `app.js` stays untested, verified by hand in the browser instead.
	48	
	49	## Codex approach gate
	50	
	51	Fired (real architectural alternatives present). Preflight returned `ok`, but
	52	the invocation returned an empty payload — an incomplete call. Per the gate's
	53	one-shot rule it was not retried. The three approaches presented to the user
	54	were Claude's alone; no independent-agreement signal exists for any of them.
	55	
	56	## Notes for the reviewer
	57	
	58	The repository is a small fixture: `index.html`, `README.md`, `package.json`,
	59	`app.js`, `src/index.js`, `src/utils.js`. It has zero dependencies, no
	60	lockfile, no test runner, no linter, and no build step. `src/index.js` and
	61	`src/utils.js` are an unrelated CommonJS `greet` demo that is explicitly out
	62	of scope.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
