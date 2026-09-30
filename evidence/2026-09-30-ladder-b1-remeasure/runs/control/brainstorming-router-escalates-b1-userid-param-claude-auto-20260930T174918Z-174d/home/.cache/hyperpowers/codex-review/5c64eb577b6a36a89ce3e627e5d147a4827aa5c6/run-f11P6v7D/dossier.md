# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T174918Z-174d/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-login-session-identity-design.md

	1	# Login Session Identity — Design
	2	
	3	Date: 2026-09-30
	4	Status: awaiting review
	5	
	6	## Problem
	7	
	8	The request that started this was "add a `userId` parameter to the login
	9	function so we can track who logged in." Reading the code showed the literal
	10	change could not work: `login()` has one call site, the form submit handler in
	11	`app.js`, and at that point the page holds a username and a password and
	12	nothing else. There is no `userId` to pass.
	13	
	14	Clarifying the goal changed the shape of the work. The identity must persist
	15	across page loads and be readable by other forms that do not exist yet. That
	16	is not a parameter on one function; it is a small subsystem, and this repo has
	17	no equivalent of it today.
	18	
	19	## Goals
	20	
	21	- Establish the identity of the logged-in user at login time.
	22	- Persist it so it survives page reloads and navigation between pages.
	23	- Expose it through one interface that future forms read to stamp their
	24	  submissions.
	25	- Keep `login()`'s interface ready for a real authentication call without
	26	  forcing a rewrite of every caller when that call arrives.
	27	
	28	## Non-Goals
	29	
	30	- **This identity is not authorization.** `login()` verifies no credentials,
	31	  and `sessionStorage` is readable and writable by any script on the origin.
	32	  The stored identity is self-asserted convenience data. Stamping a form with
	33	  it is fine; gating access on it is not. Anything security-relevant must be
	34	  re-verified server-side against a real credential.
	35	- **No login event log.** An append-only audit history of login events was
	36	  considered and explicitly deferred. The subsystem holds one live value, not
	37	  a history.
	38	- **No real network call.** `API_ENDPOINT` stays unused. The interface is
	39	  built so the call can be added later without touching callers.
	40	- **No pub/sub.** Consumers read the identity on demand. Change notification
	41	  was considered and rejected: the app is multi-page, so each consumer is a
	42	  fresh page load that reads once at startup. Subscriptions only pay off
	43	  inside a single long-lived page.
	44	- **No logout UI.** `clearCurrentUser()` exists as API surface; no control in
	45	  `index.html` calls it.
	46	
	47	## Global Constraints
	48	
	49	- **Tooling: unit tests only.** Node's built-in `node --test`. No linter, no
	50	  formatter, no end-to-end tests, no bundler, no build step.
	51	- **Zero runtime and dev dependencies.** `package.json` gains a `scripts`
	52	  entry and nothing else.
	53	- **Storage medium: `sessionStorage`.** Survives reload and navigation,
	54	  cleared when the tab closes. No expiry logic.
	55	- **Browser code is ESM via the `.mjs` extension.** Deliberately not
	56	  `"type": "module"` in `package.json`, which would break the unrelated
	57	  CommonJS files in `src/`.
	58	- `src/index.js`, `src/utils.js`, and `README.md` are out of scope and must
	59	  not be modified.
	60	
	61	## Decisions
	62	
	63	### `login()` produces a `userId`; it does not accept one
	64	
	65	This contradicts the original request, and the contradiction is intentional
	66	rather than a silent substitution. A caller-supplied identity is unverifiable
	67	— whoever calls `login` gets to assert who they are — and no current caller
	68	has a value to supply. The identifier is an output of authentication, so
	69	`login()` returns it.
	70	
	71	### `login()` is the sole writer of the session
	72	
	73	`login()` writes the session itself on success rather than returning a value
	74	for the caller to store. There is exactly one login flow, so a single writer
	75	makes "a successful login populates the session" an invariant that a
	76	forgetful future caller cannot break. The cost is a dependency from `auth.mjs`
	77	to `session.mjs`, which means `auth` tests need the storage fake that `session`
	78	tests already require.
	79	
	80	### `login()` returns a Promise over a synchronous stub
	81	
	82	The stub body resolves immediately. The async interface exists now because
	83	the sync/async split is the single most expensive thing to change once callers
	84	exist — it rewrites every call site — and more callers are expected. Paying
	85	for a Promise-shaped interface while the body is still a stub costs almost
	86	nothing and buys that migration.
	87	
	88	### Stored value is two fields
	89	
	90	`{ userId, username }`. A `loginAt` timestamp was considered and cut: nothing
	91	reads it, and a timestamp is event-log thinking, which is a deferred non-goal.
	92	
	93	### `getCurrentUser()` never throws
	94	
	95	`null` is the single signal for "no usable identity," covering not-logged-in,
	96	storage unavailable, corrupt data, and wrong-shaped data. Consumers handle one
	97	case — the not-logged-in case they must handle anyway — instead of four.
	98	
	99	### A failed login clears any existing identity
	100	
	101	Guarantees: *the session never holds an identity that the most recent
	102	authentication attempt did not establish.* Without this, a user logged in as A
	103	who then fails an attempt as B remains logged in as A.
	104	
	105	## Architecture
	106	
	107	Three browser modules replace `app.js`, which is deleted and its contents
	108	split among them.
	109	
	110	### `session.mjs`
	111	
	112	The only code in the project that touches storage. One key, `app.session`,
	113	holding JSON.
	114	
	115	```js
	116	export function setCurrentUser(user)   // {userId, username} -> void
	117	export function getCurrentUser()       // -> {userId, username} | null
	118	export function clearCurrentUser()     // -> void
	119	```
	120	
	121	**Implementation constraint:** the module must read `globalThis.sessionStorage`
	122	**at call time**, not capture it in a module-level binding at import time.
	123	Node has no `sessionStorage`, so tests install a fake before each test; a
	124	reference captured on import cannot be swapped and every test breaks. Do not
	125	"tidy" this into a module-level const.
	126	
	127	Every storage call is wrapped in try/catch:
	128	
	129	- A failed **write** is warned to the console and swallowed. The login itself
	130	  genuinely succeeded; failing it because storage is full or disabled would be
	131	  the worse outcome.
	132	
	133	`setCurrentUser` stores what it is given without validating it. All shape
	134	validation happens on read, in `getCurrentUser`, because the read path must
	135	defend against externally written data anyway and a single validation point is
	136	easier to keep correct than two.
	137	- A failed **read** returns `null`.
	138	- **Unparseable JSON** → catch, `clearCurrentUser()`, return `null`. The
	139	  subsystem self-heals rather than staying permanently broken.
	140	- **Parsed but wrong shape** (not an object, or `userId` is not a non-empty
	141	  string) → same treatment. `sessionStorage` is shared by everything on the
	142	  origin, so a key collision is a realistic way to get valid JSON that is not
	143	  ours.
	144	
	145	### `auth.mjs`
	146	
	147	Owns `API_ENDPOINT` (still unreferenced) and `validateForm`, moved unchanged
	148	from `app.js`.
	149	
	150	```js
	151	export function validateForm(formData)           // unchanged behavior
	152	export async function login(username, password)  // -> {success, userId, username}
	153	```
	154	
	155	`login()` behavior:
	156	
	157	1. If `username` or `password` is blank, resolve `{ success: false }`. This
	158	   minimal failure condition exists so the "failed login clears the session"
	159	   invariant is reachable and testable; without it the invariant would ship
	160	   untested. Note that `validateForm` already rejects blank fields, so this
	161	   branch is unreachable through the current UI — that overlap is intended.
	162	   `login` is a module-level API that a future caller may invoke without
	163	   going through `validateForm`, so it does not rely on an upstream check.
	164	2. Otherwise resolve `{ success: true, userId, username }`. In the stub
	165	   `userId` is the username — the field exists so a real server value has
	166	   somewhere to land without changing the shape.
	167	3. On success, call `setCurrentUser({ userId, username })`.
	168	4. On failure, call `clearCurrentUser()`.
	169	
	170	### `app.mjs`
	171	
	172	The DOM wiring from the bottom of today's `app.js`, unchanged except that it
	173	`await`s `login` inside a try/catch. Kept strictly to wiring — read inputs,
	174	call, log — because it is the one module with no unit tests. If logic
	175	accumulates here, that is the signal to revisit the testing decision.
	176	
	177	The try/catch is not optional: without it, a rejected `login` in an async
	178	submit handler becomes an unhandled rejection and the user sees nothing.
	179	
	180	### `index.html`
	181	
	182	One line changes:
	183	
	184	```html
	185	<script type="module" src="app.mjs"></script>
	186	```
	187	
	188	## Data Flow
	189	
	190	1. User submits the form; handler calls `preventDefault()`.
	191	2. Handler reads `#username` and `#password`.
	192	3. `validateForm({ username, password })` — unchanged behavior. Invalid →
	193	   `console.error`, stop.
	194	4. `await login(username, password)`, wrapped in try/catch.
	195	5. `login` resolves; on success it has already called `setCurrentUser`, on
	196	   failure `clearCurrentUser`.
	197	6. Handler logs the result.
	198	7. Any later page: `import { getCurrentUser } from "./session.mjs"` and read.
	199	   `null` means no usable identity.
	200	
	201	## Testing
	202	
	203	`node --test`, with `"scripts": { "test": "node --test" }` in `package.json`.
	204	
	205	The storage fake is a Map-backed `getItem`/`setItem`/`removeItem`, with a
	206	throwing variant for the storage-unavailable path, installed on
	207	`globalThis.sessionStorage` before each test.
	208	
	209	`test/session.test.mjs`:
	210	
	211	- set then get round-trips the value
	212	- get with empty storage returns `null`
	213	- corrupt JSON returns `null` **and** clears the key
	214	- valid JSON of the wrong shape returns `null` **and** clears the key
	215	- `setItem` throwing does not propagate; the module stays usable
	216	- `clearCurrentUser` removes the key
	217	
	218	`test/auth.test.mjs`:
	219	
	220	- `login` resolves with `success`, `userId`, and `username`
	221	- a successful `login` populates the session
	222	- a failed `login` clears a pre-existing session
	223	- `validateForm` rejects missing fields
	224	
	225	**Known gap:** `app.mjs` has no tests. Unit-testing DOM wiring requires jsdom,
	226	a dependency outside the agreed tooling. Mitigated by keeping `app.mjs`
	227	logic-free.
	228	
	229	## File Plan
	230	
	231	| File | Change |
	232	|---|---|
	233	| `session.mjs` | new |
	234	| `auth.mjs` | new |
	235	| `app.mjs` | new |
	236	| `test/session.test.mjs` | new |
	237	| `test/auth.test.mjs` | new |
	238	| `index.html` | modified — one `<script>` line |
	239	| `package.json` | modified — `scripts.test` |
	240	| `app.js` | deleted — contents split across the three new modules |
	241	| `src/index.js`, `src/utils.js`, `README.md` | untouched |
	242	
	243	## Rejected Alternatives
	244	
	245	- **Accept a caller-supplied `userId`** (the literal request). No caller can
	246	  supply the value, and it bakes client-asserted identity into the interface.
	247	- **Globals plus a dual-export shim**, keeping `app.js` as a plain script. The
	248	  smallest diff, but it needs a `typeof module !== "undefined"` shim and makes
	249	  script-tag ordering a silent, positional dependency that every new page must
	250	  get right. Failure mode is `undefined` at runtime rather than an error.
	251	- **`localStorage`.** Buys browser-restart survival that was not asked for and
	252	  charges an expiry and invalidation story for it.
	253	- **In-memory only.** Lost on every page load, which fails the multi-page
	254	  requirement.
	255	- **`httpOnly` cookie.** The only option that resists an XSS reading the
	256	  identity, and the right answer once a backend exists — but it requires
	257	  standing up the server that `API_ENDPOINT` currently only stubs.
	258	- **`"type": "module"` in `package.json`** instead of `.mjs` extensions. Would
	259	  break `src/index.js` and `src/utils.js`, which are CommonJS and unrelated to
	260	  this work.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T174918Z-174d/home/.cache/hyperpowers/codex-review/5c64eb577b6a36a89ce3e627e5d147a4827aa5c6/run-f11P6v7D/adjudications.md

	1	# Approved design context
	2	
	3	## Original user requirement (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Clarifying answers from the human partner (all binding)
	8	
	9	1. Scope: "Yes, it should persist and work across the app — other forms will
	10	   need it later." (This escalated the task from a one-function change to a
	11	   subsystem design.)
	12	2. What is stored: **current identity** — a session store holding who is
	13	   logged in right now. A login event/audit history was explicitly deferred.
	14	3. Persistence medium: **`sessionStorage`** — survives reload and navigation,
	15	   cleared when the tab closes. `localStorage`, in-memory-only, and an
	16	   `httpOnly` cookie were each presented and rejected.
	17	4. Identity source: **stub body, async interface** — `login()` returns a
	18	   Promise resolved immediately from the existing stub; the real network call
	19	   drops in later without changing call sites.
	20	5. Tooling: **unit tests only.** No linter, no formatter, no end-to-end tests.
	21	6. Architecture: **Approach A, native ES modules with the `.mjs` extension**,
	22	   zero dependencies, tested with Node's built-in `node --test`. A
	23	   globals-plus-dual-export-shim alternative and a pub/sub variant were both
	24	   presented and rejected.
	25	
	26	## Design sections explicitly approved in chat
	27	
	28	**Section 1 — modules and interface.** Approved, including all three called-out
	29	decisions: (a) `login` produces a `userId` rather than accepting one,
	30	knowingly contradicting the original wording; (b) `login` writes the session
	31	itself, making it the single writer; (c) the stored shape is two fields
	32	`{userId, username}`, with `loginAt` considered and cut.
	33	
	34	**Section 2 — data flow and error handling.** Approved, including the two
	35	points raised explicitly for sign-off: clearing the session on a failed login,
	36	and swallowing storage write failures rather than surfacing them. The
	37	invariant "`getCurrentUser()` never throws; `null` means no usable identity"
	38	was approved as the central contract.
	39	
	40	**Section 3 — testing and file plan.** Approved, including adding a minimal
	41	failure condition (blank username or password) to the stub so the
	42	"failed login clears the session" invariant is reachable by a test, and
	43	including the accepted gap that `app.mjs` receives no unit tests.
	44	
	45	## Notes for the reviewer
	46	
	47	These decisions are adjudicated and are not open questions. Findings that
	48	merely re-argue a rejected alternative (localStorage, cookies, pub/sub,
	49	event logging, a real network call, adding a linter) are out of scope.
	50	Findings that identify internal contradiction, ambiguity, infeasibility, or a
	51	gap *within* the approved design are in scope.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
