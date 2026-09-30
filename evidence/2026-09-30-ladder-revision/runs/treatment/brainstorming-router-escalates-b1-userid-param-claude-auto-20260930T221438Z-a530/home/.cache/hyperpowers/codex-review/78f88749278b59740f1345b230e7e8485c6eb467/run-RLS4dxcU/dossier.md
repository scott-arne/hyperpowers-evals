# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T221438Z-a530/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-user-identity-layer-design.md

	1	# User Identity Layer — Design
	2	
	3	Date: 2026-09-30
	4	Status: Awaiting review
	5	
	6	## Summary
	7	
	8	Add a shared, persisted user-identity layer to the browser app so that the
	9	userId established at login is available to other code, including forms that
	10	do not exist yet.
	11	
	12	**There is no authentication in this deliverable.** `login()` remains a stub
	13	that performs no network call and fabricates a userId. The server half of the
	14	design — issuing the userId, setting an `HttpOnly` session cookie, and
	15	re-verifying on every request — is specified here as a contract but is not
	16	implemented. Nothing in this change makes the app secure, and no code written
	17	against it should treat a stored userId as proof of anything.
	18	
	19	## Background
	20	
	21	The repository is a six-file zero-dependency project. The browser app is
	22	`index.html` plus `app.js`, loaded by a bare `<script src="app.js">` tag; all
	23	of `app.js` is top-level globals. `src/index.js` and `src/utils.js` are an
	24	unrelated CommonJS Node entry point sharing no code with the browser app.
	25	
	26	Current state of the login path:
	27	
	28	- `app.js:4` — `function login(username, password)`, a stub returning
	29	  `{ success: true, user: username }` with no network call.
	30	- `app.js:23` — the only caller, inside the form submit handler.
	31	- `app.js:2` — `API_ENDPOINT` points at the placeholder
	32	  `https://api.example.com/login` and is never used.
	33	
	34	Nothing in the repository references `userId`, sessions, cookies, storage, or
	35	authentication. There is no test framework, linter, bundler, or build step.
	36	
	37	## Requirements
	38	
	39	Established with the requester:
	40	
	41	1. The userId identifies the actual user, persists across the app, and will be
	42	   consumed by other forms later.
	43	2. The **server issues** the userId on successful login; the client stores what
	44	   the server vouched for. The client never mints an identity.
	45	3. Persistence model: an `HttpOnly; Secure; SameSite` session cookie is the
	46	   real credential; the userId lives in `localStorage` as a **non-secret label**
	47	   the server re-verifies.
	48	4. Scope includes the identity module, `login()` returning the userId, logout /
	49	   explicit clear, and handling a stored userId whose session has expired.
	50	5. Backend is out of scope. The stub stays a stub; the cookie contract is
	51	   documented, not built.
	52	
	53	## Global Constraints
	54	
	55	- **Unit tests are required** for the identity layer, using Node's built-in
	56	  `node --test`. No test dependency may be added; the repository's
	57	  zero-dependency property is preserved.
	58	- **No linter or formatter** is introduced (considered and declined).
	59	- **No end-to-end tests** are introduced (considered and declined).
	60	- **No bundler, transpiler, or build step** is introduced.
	61	- `src/index.js` and `src/utils.js` are not modified.
	62	
	63	## Architecture
	64	
	65	Approach: **global namespace module**. A new `identity.js` is loaded by its own
	66	`<script>` tag before `app.js` and attaches one frozen object to
	67	`window.AppIdentity`.
	68	
	69	This was chosen over ES modules and over introducing a bundler:
	70	
	71	- **ES modules** (`<script type="module">`) would give real encapsulation, but
	72	  modules are blocked over `file://` by CORS, so development would require
	73	  running a local server — a workflow change disproportionate to this module.
	74	- **A bundler** would scale further but converts a zero-dependency six-file
	75	  repository into a toolchain to solve a problem the project does not yet have.
	76	
	77	The public interface is identical under all three, so migrating later is a
	78	mechanical change that does not touch consumers.
	79	
	80	### Files
	81	
	82	| File | Change |
	83	|---|---|
	84	| `identity.js` | New. The entire identity layer. |
	85	| `index.html` | One added `<script src="identity.js">` before the `app.js` tag. |
	86	| `app.js` | `login()` returns `userId`; submit handler stores it. |
	87	| `package.json` | Add `"scripts": { "test": "node --test" }`. |
	88	| `test/identity.test.js` | New. Unit tests for the identity layer. |
	89	| `src/**` | Untouched. |
	90	
	91	### Load order
	92	
	93	`identity.js` must be loaded before `app.js`. This is the one fragile property
	94	of the global-namespace approach and is called out in a comment at the top of
	95	`identity.js`.
	96	
	97	## Component: `identity.js`
	98	
	99	### Public interface
	100	
	101	`window.AppIdentity` is a frozen object with four methods:
	102	
	103	- **`get()` → `string | null`**
	104	  Returns the stored userId, or `null` if absent, malformed, or expired.
	105	  Malformed and expired records are removed as a side effect of the read, so a
	106	  stale identity cannot linger. There is no third state: callers get a valid
	107	  userId or `null`, and `get()` never throws.
	108	
	109	- **`set(userId, options?)` → `boolean`**
	110	  Writes the identity record and notifies subscribers. `options.ttlMs` defaults
	111	  to `DEFAULT_TTL_MS` (24 hours). Returns `false` when persistence failed and
	112	  the value is held only in memory (see Error Handling); returns `true`
	113	  otherwise. Never throws.
	114	  Called with a `userId` that is not a non-empty string, `set()` writes nothing,
	115	  notifies nobody, and returns `false` — the same validation rule applied to
	116	  stored records, applied at the boundary.
	117	
	118	- **`clear()` → `void`**
	119	  Removes the record and notifies subscribers. This is logout.
	120	
	121	- **`onChange(fn)` → `() => void`**
	122	  Subscribes to identity changes; returns an unsubscribe function. This is what
	123	  makes the layer reusable by future forms — they react rather than poll.
	124	  The callback receives the current identity: the userId string after a
	125	  successful `set()`, `null` after `clear()`.
	126	
	127	### Notification rules
	128	
	129	Stated explicitly because each has two defensible implementations:
	130	
	131	- A successful `set()` and every `clear()` notify **unconditionally**, even when
	132	  the value did not change. Subscribers get "a login/logout happened", not "the
	133	  value differs"; de-duplicating is the subscriber's business.
	134	- A failed `set()` (invalid input, or storage write that fell back to memory
	135	  — the latter returns `false` but still updates the in-memory value) notifies
	136	  only when the in-memory value actually changed, so a rejected call is silent.
	137	- **`get()` never notifies**, including when it clears an expired or malformed
	138	  record. A read reports pre-existing state rather than causing a transition,
	139	  and firing subscribers from a getter invites reentrancy through any consumer
	140	  that calls `get()` inside its own handler.
	141	
	142	Private to the module: the storage key, the record shape, parse/validation
	143	logic, the in-memory fallback, and the TTL default.
	144	
	145	### Stored record
	146	
	147	One `localStorage` key, `appIdentity`, holding JSON:
	148	
	149	```json
	150	{ "userId": "stub-user-id", "issuedAt": 1790000000000, "expiresAt": 1790086400000 }
	151	```
	152	
	153	A record, not a bare string: a bare string cannot answer "is this still good?".
	154	
	155	A record is **valid** only if it parses, is a non-null object, `userId` is a
	156	non-empty string, and `expiresAt` is a finite number. Anything else is treated
	157	as absent.
	158	
	159	### Testability seam
	160	
	161	The module is a factory wired to the browser at the bottom of the file:
	162	
	163	```js
	164	function createIdentity({ storage, now }) { /* ... */ }
	165	
	166	if (typeof window !== "undefined") {
	167	  window.AppIdentity = createIdentity({ storage: window.localStorage, now: Date.now });
	168	}
	169	if (typeof module !== "undefined" && module.exports) {
	170	  module.exports = { createIdentity };
	171	}
	172	```
	173	
	174	Injecting `storage` and `now` lets tests run under plain Node with an
	175	in-memory fake and a controllable clock — no DOM emulation, and expiry is
	176	asserted synchronously rather than by sleeping. The CommonJS export matches the
	177	convention already used in `src/utils.js`.
	178	
	179	### Deliberately omitted
	180	
	181	Cross-tab synchronization via the `storage` event. Nothing in scope requires it,
	182	and it would change `onChange`'s contract (subscribers would fire for changes
	183	they did not cause). The hook is straightforward to add later.
	184	
	185	## Data Flow
	186	
	187	### Login
	188	
	189	1. Submit handler reads `username` and `password` from the form.
	190	2. `validateForm` runs unchanged.
	191	3. `login(username, password)` is called.
	192	4. On `result.success`, the handler calls `AppIdentity.set(result.userId)`.
	193	5. Subscribers fire.
	194	
	195	### `login()` signature
	196	
	197	The original request asked for a `userId` **parameter**. This design instead
	198	adds `userId` to the **return value**:
	199	
	200	```js
	201	function login(username, password) // unchanged inputs
	202	// returns { success, userId, user } — was { success, user }
	203	```
	204	
	205	Rationale: since the server issues the userId, the caller has no userId to pass
	206	at call time. An input parameter would mean the client asserting its own
	207	identity, which is the spoofable design that requirement 2 rules out. Confirmed
	208	with the requester.
	209	
	210	A correlation id for tracing a login *attempt* would be a legitimate separate
	211	input, but it is out of scope here and must not be named `userId`.
	212	
	213	### Page load
	214	
	215	`identity.js` does nothing eager beyond defining the object. The first `get()`
	216	reads and validates. Nothing auto-redirects or auto-renders: `index.html` has no
	217	logged-in UI, and adding one is out of scope.
	218	
	219	### Logout
	220	
	221	`AppIdentity.clear()` is implemented and tested but has no caller. `index.html`
	222	has no logout button and this change does not add one. "Logout is in scope"
	223	means the capability exists in the layer, not that logout UI ships.
	224	
	225	### Stub boundary
	226	
	227	`login()` performs no network call and returns the literal `"stub-user-id"` —
	228	deliberately not a random UUID, which would look like real data. The
	229	fabrication site carries a comment stating that no authentication occurs.
	230	
	231	## Error Handling
	232	
	233	### Malformed or foreign storage
	234	
	235	`localStorage` is shared across the origin and the key may hold anything —
	236	truncated JSON, a value from an older version, a string where an object belongs.
	237	All reads go through one private `readRecord()` that wraps `JSON.parse` in
	238	try/catch and validates the shape. Any record failing validation is treated as
	239	absent and the key is removed. A bad record never throws out of `get()` and
	240	never half-loads.
	241	
	242	### Storage unavailable
	243	
	244	`localStorage` access throws in Safari private mode and when the quota is
	245	exceeded — including on **write**. `set()` catches, retains the userId in an
	246	in-memory fallback for the page's lifetime, and returns `false` so the caller
	247	knows persistence did not happen. `get()` catches read failures and returns
	248	`null`. Degrading to "works until the tab closes" is preferable to an uncaught
	249	exception inside a submit handler.
	250	
	251	### Expiry
	252	
	253	`get()` compares `now()` against `expiresAt`; past it, the record is cleared and
	254	`null` is returned. `DEFAULT_TTL_MS` is 24 hours, as a named constant.
	255	
	256	**This is a cleanliness mechanism, not a security boundary**, for three
	257	reasons: the clock belongs to the user and can be changed; the record lives in
	258	`localStorage` where any XSS or devtools session can rewrite `expiresAt`; and
	259	the TTL is the client's guess at a session lifetime only the server knows. The
	260	expiry that actually matters is the `HttpOnly` cookie's, which this code cannot
	261	read by design.
	262	
	263	### The contract
	264	
	265	> `AppIdentity.get()` returning a userId means "this browser recently saw a
	266	> login". It never means "this request is authorized."
	267	
	268	Authorization is the server re-checking the session cookie on every request.
	269	
	270	## Known Limitations
	271	
	272	1. **Stale-identity window.** Between the session cookie expiring and the TTL
	273	   lapsing, `get()` returns a userId for a dead session. With no backend this is
	274	   undetectable client-side. **Resolution when the real API lands:** every
	275	   non-2xx authentication response calls `AppIdentity.clear()`. Recorded here so
	276	   the TTL is not mistaken for correctness it does not provide.
	277	
	278	2. **No authentication exists.** See Summary.
	279	
	280	3. **Global namespace.** `window.AppIdentity` can be clobbered by other code,
	281	   and load order is load-bearing. Accepted as the cost of the chosen approach.
	282	
	283	4. **Untested wiring.** The DOM submit handler in `app.js` is not covered by
	284	   unit tests (see Testing).
	285	
	286	## Server Contract (not implemented)
	287	
	288	Documented so the client is built against the right shape. When a real backend
	289	is introduced:
	290	
	291	- `POST /login` authenticates and responds with the userId in its body.
	292	- The same response sets the session cookie with `HttpOnly`, `Secure`, and
	293	  `SameSite`, so client JavaScript cannot read it.
	294	- Every subsequent authenticated request is authorized by the server from that
	295	  cookie. The client-supplied userId is treated as a non-authoritative label and
	296	  re-verified server-side; it never grants access on its own.
	297	- Any non-2xx authentication response causes the client to call
	298	  `AppIdentity.clear()`.
	299	
	300	Assumption: the eventual backend will use cookie-based sessions rather than a
	301	bearer token held in JavaScript. Validate by confirming with whoever builds the
	302	API before the client's storage model is relied upon; a bearer-token design
	303	would change where the credential lives.
	304	
	305	## Testing
	306	
	307	Runner: `node --test` via `npm test`. Tests `require` `createIdentity` and
	308	inject an in-memory storage fake plus a controllable `now`.
	309	
	310	`test/identity.test.js` covers:
	311	
	312	**Round-trip** — `set` then `get` returns the userId; `get` with nothing stored
	313	returns `null`.
	314	
	315	**Rejecting bad records** — each asserting both `get() === null` and that the
	316	key was removed: unparseable JSON; valid JSON of the wrong shape; missing
	317	`userId`; empty-string `userId`; non-finite `expiresAt`.
	318	
	319	**Expiry** — valid one millisecond before `expiresAt`; `null` one millisecond
	320	after, with the key removed.
	321	
	322	**Clearing** — `clear()` removes the key; `get()` afterwards returns `null`.
	323	
	324	**Rejected input** — `set()` with a non-string, an empty string, `null`, or
	325	`undefined` returns `false`, writes nothing, and notifies nobody.
	326	
	327	**Subscribers** — `onChange` fires on `set` and on `clear`; the callback
	328	receives the userId after `set` and `null` after `clear`; `set` with an
	329	unchanged value still notifies; `get()` clearing an expired record does **not**
	330	notify; the returned unsubscribe stops delivery; a subscriber that throws does
	331	not prevent other subscribers from running and does not break `set()`.
	332	
	333	**Storage failure** — a fake whose `setItem` throws: `set()` returns `false`
	334	rather than propagating, and `get()` still returns the userId from the in-memory
	335	fallback. A fake whose `getItem` throws: `get()` returns `null` rather than
	336	propagating.
	337	
	338	### Not covered by tests
	339	
	340	The DOM submit handler in `app.js` and the `login()` stub's literal return.
	341	Covering the handler requires jsdom, the dependency this design avoids, and it
	342	amounts to three lines of wiring. It will be verified by hand in a browser, and
	343	that manual verification will be reported as such rather than counted as test
	344	coverage.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T221438Z-a530/home/.cache/hyperpowers/codex-review/78f88749278b59740f1345b230e7e8485c6eb467/run-RLS4dxcU/adjudications.md

	1	# Approved design decisions (requester-confirmed)
	2	
	3	Original request, verbatim: "Add a userId parameter to the login function so we
	4	can track who logged in."
	5	
	6	Decisions reached during brainstorming, each explicitly approved by the
	7	requester:
	8	
	9	1. **userId semantics** — "It should identify the actual user across the app and
	10	   persist; other forms will need it later." This escalated the work from a
	11	   one-function change to an identity layer.
	12	2. **Issuer** — Server issues the userId on successful login. The client never
	13	   mints an identity (a client-minted value identifies a browser, not a person,
	14	   and is spoofable).
	15	3. **Persistence** — `HttpOnly; Secure; SameSite` session cookie is the real
	16	   credential; userId lives in `localStorage` as a non-secret label the server
	17	   re-verifies. Explicitly rejected: localStorage-only, sessionStorage-only.
	18	4. **Scope** — identity module + `login()` returning userId + logout/clear +
	19	   stale-identity handling. Explicitly rejected: module-only (leaves a known
	20	   stale-identity gap), and adding a second consumer form.
	21	5. **Backend** — frontend-only. The stub stays a stub; the cookie/session
	22	   contract is documented but not implemented. The spec must state plainly that
	23	   no real auth exists.
	24	6. **Module architecture** — approach A, global namespace module
	25	   (`window.AppIdentity` via an added script tag). Explicitly rejected: ES
	26	   modules (`file://` CORS forces a dev server) and introducing a bundler
	27	   (disproportionate for a zero-dependency six-file repo). Approved by the
	28	   requester with "Yes, A reads right."
	29	7. **Tooling** — unit tests only, via Node's built-in `node --test`, with no new
	30	   dependencies. Explicitly declined: lint/format, end-to-end tests.
	31	8. **`login()` signature** — userId is added to the RETURN VALUE, not as an
	32	   input parameter, because the server is the issuer. This intentionally departs
	33	   from the literal wording of the original request; the requester was told so
	34	   explicitly and approved with "Yes, return value is fine."
	35	9. **Error handling** — approved as written, including the explicit statement
	36	   that the TTL is a cleanliness mechanism and not a security boundary, and the
	37	   named stale-identity limitation.
	38	10. **Testing plan** — approved, including the decision NOT to test the DOM
	39	    submit handler (would require jsdom, the dependency being avoided) and to
	40	    report that as manual verification rather than coverage.
	41	
	42	Notes for the reviewer:
	43	
	44	- The absence of authentication is an accepted, documented constraint, not an
	45	  oversight. Do not raise "there is no authentication" as a defect; DO raise it
	46	  if the spec fails to disclose it clearly, or if any part of the design would
	47	  invite a reader to treat the stored userId as authoritative.
	48	- The zero-dependency constraint is deliberate and requester-chosen.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
