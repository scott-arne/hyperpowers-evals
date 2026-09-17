# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T023041Z-5318/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-persistent-user-identity-design.md

	1	# Persistent User Identity — Design
	2	
	3	Date: 2026-09-16
	4	Status: approved (design), pending implementation plan
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The original request was "add a `userId` parameter to the login function so we
	10	can track who logged in." Clarification established that the desired outcome is
	11	not a parameter: the identifier must be *real* (not client-asserted), must
	12	persist across page loads and browser restarts, must be readable from anywhere
	13	in the app, and will be consumed by additional forms that do not exist yet.
	14	
	15	A real user identifier cannot be passed *into* `login()`. Before authentication
	16	the app knows only what was typed into a form, and a client-chosen identifier is
	17	self-asserted rather than authoritative. The server mints the canonical
	18	identifier and returns it on successful login. `login()` therefore *returns* a
	19	`userId`; it does not accept one. The requested signature change is replaced by
	20	a small identity layer.
	21	
	22	## Scope
	23	
	24	In scope:
	25	
	26	- A session module owning storage, retrieval, expiry, and clearing of the
	27	  authenticated identity.
	28	- A defined login response contract that the current stub honors and the real
	29	  endpoint must honor later.
	30	- Moving the page to ES modules so later forms can import the session module.
	31	- A logout affordance, required by the choice of durable storage.
	32	- Zero-dependency unit tests for the session module.
	33	
	34	Out of scope:
	35	
	36	- Wiring `login()` to `API_ENDPOINT`. The stub remains; swapping it for `fetch`
	37	  later is a change to one function.
	38	- Emitting analytics or tracking events. This work makes "track who logged in"
	39	  *possible* by establishing a durable identity; there is no telemetry system in
	40	  this repository to emit into. Adding one is a separate request.
	41	- Session tokens or credentials. See "Security notes" for why this boundary
	42	  matters.
	43	- Any change to `src/index.js` or `src/utils.js`, which are unrelated Node
	44	  CommonJS files.
	45	
	46	## Global Constraints
	47	
	48	- **Testing:** zero-dependency unit tests using the built-in `node:test` runner.
	49	  No new dependencies are added to `package.json`; a `test` script is added.
	50	  This was an explicit selection — the repository currently has no test
	51	  infrastructure at all.
	52	- **No bundler and no build step.** Native ES modules only.
	53	- **No new runtime dependencies.**
	54	- The page must be served over `http` rather than opened via `file://`, because
	55	  ES modules are subject to CORS. This is an accepted consequence of the module
	56	  decision.
	57	
	58	## Approach
	59	
	60	Selected: **read-through session module**. `localStorage` is the single source of
	61	truth. Every read hits storage and validates expiry; no copy is cached in
	62	memory, so two tabs cannot disagree and there is no cache to invalidate.
	63	
	64	Two alternatives were considered and rejected for now, both because they buy
	65	capability before a consumer needs it:
	66	
	67	- *Observable store* (in-memory cache, `subscribe()`, cross-tab `storage`
	68	  events) — adds live cross-tab reactivity at the cost of cache coherence and
	69	  subscription lifecycle. A `subscribe()` function can be added later without
	70	  changing any signature defined here.
	71	- *Pure rules + injected storage adapter* — best testability and the cleanest
	72	  seam for future token handling, but the most structure for an app this size.
	73	  Its pure-rules split can be extracted from this module's internals later.
	74	
	75	Neither is foreclosed by starting here.
	76	
	77	## Components
	78	
	79	### `session.js` (new)
	80	
	81	An ES module exporting exactly three functions. It is the only code in the app
	82	that touches `localStorage`.
	83	
	84	- `saveSession({ userId, username, expiresIn })` — writes the record, computing
	85	  absolute `issuedAt` and `expiresAt` from `expiresIn` (seconds) at write time.
	86	  Returns the stored record, or `null` if persistence failed. Rejects a missing
	87	  or empty `userId` by returning `null` without writing; this guard lives here,
	88	  not in the caller, so the partial-record rule holds for every future consumer
	89	  and is unit-testable. The submit handler is responsible only for checking
	90	  `success` before calling.
	91	- `getSession()` — returns the valid stored record, or `null`. Deletes the
	92	  stored key when the record is expired, malformed, or of an unrecognized
	93	  version.
	94	- `clearSession()` — removes the stored key. This is the logout path.
	95	
	96	Storage access goes through `globalThis.localStorage` rather than the bare
	97	`localStorage` global, so tests can substitute a fake. This is the minimum seam
	98	needed to make the module testable without a DOM harness.
	99	
	100	### `app.js` (modified)
	101	
	102	- Becomes an ES module; imports from `session.js`.
	103	- `login(username, password)` keeps its current two-parameter signature and
	104	  returns the login response contract below instead of
	105	  `{ success: true, user: username }`.
	106	- The submit handler persists the returned identity via `saveSession()` and
	107	  re-renders.
	108	- Page load reads `getSession()` and renders the corresponding state.
	109	- A logout handler calls `clearSession()` and re-renders.
	110	
	111	### `index.html` (modified)
	112	
	113	- `<script src="app.js">` becomes `<script type="module" src="app.js">`.
	114	- Adds a signed-in region: the identity display and a logout button. The page
	115	  currently has no logout control of any kind.
	116	
	117	## Data contracts
	118	
	119	### Stored record
	120	
	121	Key: `auth.session`. Value: JSON.
	122	
	123	```json
	124	{
	125	  "v": 1,
	126	  "userId": "usr_3f9c2a",
	127	  "username": "alice",
	128	  "issuedAt": 1789000000000,
	129	  "expiresAt": 1789043200000
	130	}
	131	```
	132	
	133	`issuedAt` and `expiresAt` are epoch milliseconds. The `v` field exists so this
	134	shape can change later without mis-reading records already sitting in users'
	135	browsers — with `localStorage`, old records genuinely persist indefinitely.
	136	
	137	### Login response contract
	138	
	139	The shape the stub returns today and the real endpoint must return later:
	140	
	141	```json
	142	{ "success": true, "userId": "usr_3f9c2a", "username": "alice", "expiresIn": 43200 }
	143	```
	144	
	145	Failure:
	146	
	147	```json
	148	{ "success": false, "error": "Invalid credentials" }
	149	```
	150	
	151	`expiresIn` is in seconds and is server-supplied, so session lifetime is the
	152	server's decision rather than a constant baked into the client. The stub
	153	defaults it to 43200 (12 hours).
	154	
	155	The stub derives its placeholder `userId` deterministically from the username,
	156	so repeated logins as the same person yield the same identifier — matching real
	157	server behavior. A random-per-login identifier would mask bugs in any consumer
	158	that compares IDs.
	159	
	160	## Data flow
	161	
	162	1. **Page load** — `getSession()`. A valid record renders the signed-in state
	163	   (identity shown, logout available, form hidden); `null` renders the login
	164	   form.
	165	2. **Submit** — `validateForm()` → `login()` → on `success`, `saveSession()` →
	166	   render signed-in state.
	167	3. **Logout** — `clearSession()` → render login form.
	168	4. **Expiry** — enforced at read time inside `getSession()`, not by a timer. No
	169	   background scheduling is needed, and a tab left open overnight cannot keep
	170	   using a dead session.
	171	
	172	## Error handling
	173	
	174	Every failure mode resolves to "no session" rather than a thrown exception.
	175	
	176	| Condition | Behavior |
	177	|---|---|
	178	| Corrupt or unparseable stored JSON | Catch, clear the key, return `null` |
	179	| Unrecognized `v` | Clear the key, return `null` |
	180	| Expired `expiresAt` | Clear the key, return `null` |
	181	| `localStorage` unavailable (private mode, storage disabled, quota exceeded) | Catch; degrade to no persistence. Login still works. |
	182	| `success: false` | No session written |
	183	| `success: true` with missing or empty `userId` | Treated as failure; no partial record written |
	184	
	185	The storage-unavailable case is the load-bearing one: losing persistence is an
	186	inconvenience, but a login form that throws on page load is an outage.
	187	
	188	## Security notes
	189	
	190	- `app.js:5` currently logs the username to the browser console, and the result
	191	  log at `app.js:23` would begin carrying a stable user ID. Both identity logs
	192	  are removed. This is not unrelated cleanup: it is the specific line this
	193	  feature would otherwise make worse.
	194	- A user ID is an identifier, not a credential, which is what makes web storage
	195	  an acceptable place for it. **That reasoning stops holding if the real
	196	  endpoint later returns a session token alongside the ID.** A token must not be
	197	  written into this record by default. When the stub is replaced with a real
	198	  `fetch`, token handling is a separate decision.
	199	- Durable storage means a stale identity can outlive its user on a shared
	200	  machine. The expiry stamp and the explicit logout path are the two mitigations
	201	  required by that choice.
	202	
	203	## Testing
	204	
	205	`node:test`, no dependencies, with a fake `globalThis.localStorage` injected per
	206	test. Cases:
	207	
	208	- `saveSession()` then `getSession()` returns the record with the expected
	209	  `userId` and `username`.
	210	- `expiresAt` is computed from `expiresIn` at write time.
	211	- A record past `expiresAt` reads back as `null` and the key is removed.
	212	- Corrupt JSON reads back as `null` and the key is removed.
	213	- An unrecognized `v` reads back as `null` and the key is removed.
	214	- `clearSession()` removes the record.
	215	- A throwing `localStorage` does not propagate: `saveSession()` returns `null`
	216	  and `getSession()` returns `null`.
	217	- A response missing `userId` writes nothing.
	218	
	219	DOM render paths are not unit-tested; that would require the jsdom dependency
	220	that the zero-dependency constraint rules out. Verified manually instead.
	221	
	222	## Manual verification
	223	
	224	Served over `http`: log in, confirm the signed-in state; reload and confirm the
	225	identity survives; open a second tab and confirm it reads the same identity;
	226	click logout and confirm both the key and the signed-in state are gone.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T023041Z-5318/home/.cache/hyperpowers/codex-review/7f40ad0e352bacc394581fc057631e956f97c55c/run-ZEDDSBjL/adjudications.md

	1	# Approved design decisions (brainstorming session, 2026-09-16)
	2	
	3	Original request, verbatim: "Add a userId parameter to the login function so we
	4	can track who logged in."
	5	
	6	Decisions the human partner explicitly made, in order:
	7	
	8	1. **What the identifier is.** "It should be a real user identifier, it should
	9	   persist, it should work across the app, and other forms will need it later
	10	   too." — This escalated the task from a bounded parameter change to an
	11	   architectural one.
	12	2. **Who mints it.** Server returns it on login. Consequence accepted:
	13	   `login()` returns the userId rather than accepting one, so the originally
	14	   requested parameter is not added.
	15	3. **Scope of the API call.** Keep the stub; define the response contract.
	16	   `login()` stays local but returns the exact shape the real endpoint will
	17	   use. Wiring `fetch` is explicitly deferred.
	18	4. **Persistence.** localStorage plus an explicit logout path, with a staleness
	19	   rule, chosen over sessionStorage and in-memory.
	20	5. **Module setup.** Move to ES modules (`<script type="module">`), no bundler.
	21	   Serving over http instead of `file://` accepted as a consequence.
	22	6. **Approach.** Read-through session module (localStorage as single source of
	23	   truth, no in-memory cache) chosen over an observable store and over a
	24	   pure-rules-plus-injected-adapter design.
	25	7. **Tooling.** Zero-dependency unit tests via `node:test` only. Vitest+jsdom
	26	   declined; lint/format not adopted. No new dependencies.
	27	8. **Design sections approved.** Architecture, components, and data contracts
	28	   approved ("looks good, go ahead"), then data flow, error handling, security
	29	   notes, and testing presented and approved.
	30	
	31	Out of scope by explicit decision: emitting analytics/tracking events, session
	32	tokens or credentials, wiring the real endpoint, and any change to `src/`.
	33	
	34	## Codebase facts
	35	
	36	The repository is a minimal fixture: `index.html`, `README.md`, `package.json`,
	37	`app.js`, `src/index.js`, `src/utils.js`. No tests, no dependencies, no lint, no
	38	build step. `app.js` is loaded as a classic script and defines `login` and
	39	`validateForm` as globals; `login()` is synchronous, never calls
	40	`API_ENDPOINT`, returns `{ success: true, user: username }`, logs the username
	41	to the console, and has exactly one call site. There is no logout control
	42	anywhere. `src/` is unrelated CommonJS Node code.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
