# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T010914Z-df28/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-current-user-store-design.md

	1	# Current-User Store — Design
	2	
	3	Date: 2026-09-16
	4	Status: Approved for planning
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The original request was: "Add a `userId` parameter to the login function so we
	10	can track who logged in."
	11	
	12	Taken literally, that change cannot work. `login(username, password)` in
	13	`app.js` has exactly one call site — the form submit handler — and neither the
	14	form nor anything else in the application holds a user ID. The login form
	15	collects a username and a password (`index.html`), and `login` is the function
	16	that establishes identity in the first place. A `userId` parameter would
	17	therefore have `undefined` as its only possible argument.
	18	
	19	The identity travels the other way: `login` produces the ID, and a store
	20	records it. Clarifying the request established that the real need is broader
	21	than login — the identity must be readable across the application, must
	22	survive page reloads, and will be consumed by additional forms that do not
	23	exist yet.
	24	
	25	This document specifies that store. It deliberately does **not** add a `userId`
	26	parameter to `login`; see "Relationship to the original request" below.
	27	
	28	## Goals
	29	
	30	- One authoritative answer to "who is logged in right now", set at login.
	31	- Readable by any script on the page, including forms added later.
	32	- Survives page reload and in-application navigation.
	33	- Testable without a browser.
	34	- No new runtime dependencies.
	35	
	36	## Non-goals
	37	
	38	Each item below is something a reader could reasonably expect from "track who
	39	logged in". None of them is built here.
	40	
	41	- **No event or audit trail.** The store holds current identity, not a history
	42	  of logins or form submissions.
	43	- **No backend.** `API_ENDPOINT` remains unused; `login` remains a stub.
	44	- **No authentication or authorization.** See "Trust boundary".
	45	- **No logout UI.** A `clear()` function exists; nothing calls it yet.
	46	- **No ESLint, Prettier, or Playwright.**
	47	- **No ES-module or bundler migration.** The page stays on classic scripts.
	48	- **No changes to `src/index.js` or `src/utils.js`.** They are Node-only and
	49	  unreferenced by the page.
	50	
	51	## Trust boundary
	52	
	53	The stored `userId` is **self-asserted and untrusted**. It lives in the
	54	browser, where anything with devtools access can edit it and claim any value.
	55	
	56	This is acceptable for its intended uses — personalising UI, prefilling forms,
	57	attributing the user's own work back to them. It is **not** acceptable as a
	58	gate on access to anything, and stored IDs must not later be treated as
	59	trustworthy records. Any future feature that needs a trustworthy identity
	60	requires a server-issued session, which is out of scope here.
	61	
	62	This property is a consequence of the decision to avoid introducing a backend.
	63	It is recorded so it stays a deliberate choice rather than an accident.
	64	
	65	## Global constraints
	66	
	67	These apply to every task in the implementation plan.
	68	
	69	- **Zero runtime dependencies.** `package.json` currently has none; it gains a
	70	  `test` script only.
	71	- **Unit tests via Node's built-in `node:test` runner.** No other tooling is
	72	  configured — no linter, no formatter, no end-to-end tests.
	73	- **No build step.** No bundler, no transpiler.
	74	- **The page must keep working when opened directly from disk over `file://`.**
	75	  This is why classic scripts are retained rather than ES modules, which
	76	  browsers block on `file://`.
	77	- **Browser code is loaded as classic scripts.** `src/` is reserved for the
	78	  existing Node-only CommonJS files.
	79	
	80	## Decisions
	81	
	82	Settled during brainstorming. Recorded with the alternatives that were
	83	declined, so a later reader can see what was traded away.
	84	
	85	| Decision | Chosen | Declined |
	86	|---|---|---|
	87	| What persists | Current-user store (one live identity) | Append-only event trail; both together |
	88	| Where it lives | `sessionStorage` (per-tab, cleared on tab close) | `localStorage`; server-issued session cookie; in-memory with server rehydration |
	89	| What the ID is | Server-returned ID, stubbed with an obvious fake | The username as ID; a client-generated UUID |
	90	| Page wiring | Second classic script exposing one global | Native ES modules; a bundler |
	91	| Tooling | `node:test` unit tests only | ESLint + Prettier; Playwright; no tooling |
	92	| Store shape | Accessor over a versioned record | Observable store with `subscribe()`; bare key/value |
	93	
	94	Rationale for the two least obvious choices:
	95	
	96	- **Server-returned ID over username-as-ID.** Using the username fuses identity
	97	  with a display name. If usernames ever become editable, every previously
	98	  stored ID silently begins pointing at the wrong person, with no way to detect
	99	  it after the fact. Stubbing a returned ID costs about the same today and
	100	  keeps the interface correct for when a real backend arrives.
	101	- **Versioned record over bare key/value.** Additional forms will consume this
	102	  store later. The envelope makes adding a field a non-event rather than a
	103	  migration over data already sitting in users' browsers, and it allows corrupt
	104	  data to be distinguished from absent data.
	105	
	106	## Architecture
	107	
	108	### Component: `current-user.js`
	109	
	110	A new file at the repository root, alongside `app.js`. It is not placed in
	111	`src/`, which holds Node-only CommonJS files the page never loads.
	112	
	113	The file is **dual-mode**: an IIFE that attaches `CurrentUser` to `globalThis`
	114	for the browser, and additionally assigns `module.exports` when `module` is
	115	defined, so `node:test` can require it. `package.json` has no `"type"` field,
	116	so Node treats `.js` as CommonJS and this requires no configuration.
	117	
	118	This dual-mode wrapper is the load-bearing detail of the design: it is what
	119	makes "plain global script in the browser" and "unit tested in Node"
	120	compatible without a build step.
	121	
	122	### Public API
	123	
	124	Three functions, on the `CurrentUser` global:
	125	
	126	- `set({ userId, username })` — records the identity and stamps `loginAt`.
	127	  Throws when `userId` is absent or empty (see "Error handling").
	128	- `get()` — returns `{ userId, username, loginAt }`, or `null` when nobody is
	129	  logged in.
	130	- `clear()` — forgets the current identity.
	131	
	132	Internally the store is produced by a factory taking its storage object as an
	133	argument, defaulting to `sessionStorage`. Tests inject a fake. This injectable
	134	is required because `sessionStorage` does not exist in Node.
	135	
	136	### Stored format
	137	
	138	A single `sessionStorage` key, `currentUser`, holding JSON:
	139	
	140	```json
	141	{ "v": 1, "userId": "...", "username": "...", "loginAt": "..." }
	142	```
	143	
	144	`loginAt` is an ISO 8601 timestamp. `v` is the envelope version; only `1` is
	145	recognised.
	146	
	147	## Changes to existing files
	148	
	149	### `app.js`
	150	
	151	- Add a module-level constant for the stubbed ID — a single, obviously-fake
	152	  value, with a comment tying it to the unused `API_ENDPOINT` and to the point
	153	  where a real API response would supply it.
	154	
	155	  The constant is the same for every user **by design**. A plausible-looking
	156	  per-user fake is the variety that quietly reaches production unnoticed; one
	157	  conspicuous constant cannot.
	158	
	159	- `login(username, password)` returns `userId` alongside its existing fields:
	160	  `{ success: true, userId: STUB_USER_ID, user: username }`. Its parameter list
	161	  is unchanged. The existing `user` field is retained so nothing that reads it
	162	  breaks.
	163	
	164	- The submit handler, on a successful login, calls
	165	  `CurrentUser.set({ userId: result.userId, username })`.
	166	
	167	- Make `app.js` dual-mode, mirroring `current-user.js`. Today the file calls
	168	  `document.getElementById("login-form")` at top level, so requiring it in Node
	169	  throws before any test can run. Two changes make it importable:
	170	
	171	  - Guard the form wiring behind `typeof document !== "undefined"`. In the
	172	    browser this is always true, so behaviour is unchanged.
	173	  - Export `{ login, validateForm, STUB_USER_ID }` when `module` is defined.
	174	
	175	  Without this, `login`'s return value cannot be unit tested at all.
	176	
	177	### `index.html`
	178	
	179	Add `<script src="current-user.js"></script>` **before** the existing
	180	`<script src="app.js"></script>`. Order is required: `app.js` references
	181	`CurrentUser` at submit time, and loading it second guarantees the global
	182	exists.
	183	
	184	### `package.json`
	185	
	186	Add `"scripts": { "test": "node --test" }`. No dependencies are added.
	187	
	188	## Data flow
	189	
	190	1. The user submits the login form.
	191	2. The handler validates via the existing `validateForm`.
	192	3. On valid input, `login(username, password)` runs and returns
	193	   `{ success, userId, user }`.
	194	4. On success, the handler calls `CurrentUser.set({ userId, username })`, which
	195	   writes the versioned envelope to `sessionStorage`.
	196	5. Any later code — including forms added in future — calls `CurrentUser.get()`
	197	   to read the identity. Future forms read; they do not write.
	198	6. `CurrentUser.clear()` forgets the identity. Nothing calls it yet.
	199	
	200	## Error handling
	201	
	202	The governing rule: **a storage problem must never break login.**
	203	
	204	| Condition | Behaviour |
	205	|---|---|
	206	| `sessionStorage` unavailable, or a read/write throws | Catch, and fall back to an in-memory value for the life of the page. Identity still works; it does not survive a reload. Login proceeds normally. |
	207	| Stored value is unparseable JSON | Treat as no user; delete the key. |
	208	| Stored envelope has an unrecognised `v` | Treat as no user; delete the key. |
	209	| `set()` called without a usable `userId` | Throw. |
	210	
	211	Reasoning for the two non-obvious rows:
	212	
	213	- **Corrupt data is cleared rather than thrown on.** If a bad write threw, a
	214	  single corrupt value would leave the user permanently unable to log in, with
	215	  no remedy but clearing site data manually. Treating it as "no user" is
	216	  self-healing.
	217	- **A missing `userId` throws.** That is a contract violation at a call site we
	218	  control. Storing a null identity would produce a record that looks valid to
	219	  every reader.
	220	
	221	Storage failures are real rather than theoretical: Safari's private mode has
	222	historically thrown on `setItem`, and storage can be disabled by policy.
	223	
	224	## Testing
	225	
	226	Two test files, run with `node --test` via `npm test`. No dependencies, no DOM,
	227	no jsdom — the injectable storage and the dual-mode wrappers are what allow
	228	this.
	229	
	230	`test/current-user.test.js`:
	231	
	232	1. `get()` on empty storage returns `null`.
	233	2. `set()` then `get()` round-trips `userId`, `username`, and a `loginAt`.
	234	3. `clear()` removes the identity; a following `get()` returns `null`.
	235	4. Corrupt JSON in the key: `get()` returns `null` **and** the key is removed.
	236	5. Unrecognised `v`: `get()` returns `null` **and** the key is removed.
	237	6. A storage stub that throws on `setItem`: `set()` does not propagate the
	238	   error, and `get()` still yields the value within that page life.
	239	7. `set()` without a `userId` throws.
	240	
	241	`test/login.test.js`:
	242	
	243	8. `login()` returns a `userId` field, equal to `STUB_USER_ID`.
	244	9. `login()` still returns `success` and `user`, so existing readers are
	245	   unaffected.
	246	
	247	Case 9 exists because `app.js` is being edited to become importable; the test
	248	pins the parts of its contract that must not change.
	249	
	250	## Relationship to the original request
	251	
	252	The request asked for a `userId` **parameter** on `login`. This design adds a
	253	`userId` to `login`'s **return value** instead, and introduces a store to hold
	254	it.
	255	
	256	This is recorded explicitly so a later reader does not conclude the request was
	257	misread or partly dropped. The parameter form was examined and rejected because
	258	no caller has a user ID to supply: identity is an output of authentication, not
	259	an input to it. The underlying goal — being able to tell who logged in, across
	260	the application — is met in full.
	261	
	262	## Assumptions
	263	
	264	- `Assumption: per-tab lifetime is the intended meaning of "it should persist".`
	265	  `sessionStorage` clears when the tab closes, so a user who closes and reopens
	266	  the tab becomes anonymous again. Validate by confirming with the requester
	267	  before implementation; if persistence across browser restarts was intended,
	268	  the change is `localStorage` in place of `sessionStorage` and nothing else in
	269	  this design moves.
	270	
	271	## Open follow-ups (not in scope)
	272	
	273	Recorded so they are not rediscovered as surprises:
	274	
	275	- A logout affordance calling `CurrentUser.clear()`.
	276	- A real `API_ENDPOINT` call supplying a genuine `userId`, replacing the stub.
	277	- An event trail, should attribution history ever be required, layered on this
	278	  store rather than replacing it.
	279	- `subscribe()` on the store, if future forms need to react to identity changes
	280	  rather than read on demand. It can be added without changing the stored
	281	  format.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T010914Z-df28/home/.cache/hyperpowers/codex-review/b4883f73307633230eb6f7cdf31b946f87ecd9c3/run-dJ2aVHFh/adjudications.md

	1	# Approved design decisions (settled — do not relitigate)
	2	
	3	## Original user request (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Escalation
	8	
	9	The request was initially classified as a bounded change. The human partner's
	10	answer to the first clarifying question — "The login is just the first place. It
	11	should work across the app, it should persist, and other forms will need it
	12	later too." — escalated it to an architectural change, because it names a
	13	cross-cutting subsystem the repository does not have.
	14	
	15	## Decisions approved by the human partner
	16	
	17	1. **Subsystem type:** a current-user store (one live identity), not an
	18	   append-only event/audit trail.
	19	2. **Persistence:** `sessionStorage` — per-tab, cleared on tab close. No
	20	   backend. Server-issued session cookies and server rehydration were declined
	21	   as out of scope.
	22	3. **ID value:** a server-returned ID, stubbed with an obviously-fake constant
	23	   until a real API exists. Username-as-ID and a client-generated UUID were both
	24	   declined.
	25	4. **Page wiring:** a second classic `<script>` exposing one documented global.
	26	   Native ES modules and a bundler were declined; the page must keep working
	27	   over `file://`.
	28	5. **Tooling:** unit tests via Node's built-in `node:test` only. ESLint,
	29	   Prettier, and Playwright were declined. Zero dependencies.
	30	6. **Store shape:** an accessor (`set`/`get`/`clear`) over a versioned record.
	31	   An observable store with `subscribe()` and a bare key/value store were both
	32	   declined.
	33	
	34	## Design sections approved in chat
	35	
	36	Section 1 (architecture, components, data flow) and Section 2 (error handling,
	37	testing, scope boundaries) were each presented and approved before the spec was
	38	written.
	39	
	40	## Codex approach gate
	41	
	42	Fired and ran. The companion returned an empty payload (stub build,
	43	`codexVersion 0.0.0-stub`), so no independent approaches were folded in. Treated
	44	as an incomplete call per the gate: noted once, not retried.
	45	
	46	## Codebase facts
	47	
	48	Minimal static webapp. Branch `feature/webapp-enhancement`, tree clean before
	49	this work. Files: `index.html`, `app.js`, `README.md`, `package.json`,
	50	`src/index.js`, `src/utils.js`.
	51	
	52	- `app.js` is a classic script: `API_ENDPOINT` constant (unused), `login`
	53	  (stub returning `{ success: true, user: username }`), `validateForm`, and a
	54	  top-level `document.getElementById("login-form").addEventListener(...)`.
	55	- `index.html` loads only `<script src="app.js"></script>`.
	56	- `package.json`: no `scripts`, no dependencies, no `type` field (so Node treats
	57	  `.js` as CommonJS).
	58	- `src/index.js` / `src/utils.js` are a Node-only CommonJS pair, unreferenced by
	59	  the page.
	60	- No test runner, linter, formatter, or CI.
	61	- `sessionStorage` does not exist in Node.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
