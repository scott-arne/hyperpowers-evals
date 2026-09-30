# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T222453Z-8c18/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-login-userid-tracking-design.md

	1	# Login userId tracking — design
	2	
	3	**Date:** 2026-09-30
	4	**Status:** Awaiting review
	5	**Branch:** `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	`login(username, password)` in `app.js` has no notion of user identity beyond
	10	the submitted username. The goal is to track *who* logged in, using the
	11	authenticated user ID the backend issues, and to make that ID available to
	12	the rest of the app — including forms that do not exist yet.
	13	
	14	The request began as "add a `userId` parameter to the login function." The
	15	parameter is the visible part; the substance is a small persistence component
	16	that supplies it. A parameter alone cannot satisfy "works across the app and
	17	persists," because nothing in the app currently holds state between page
	18	loads.
	19	
	20	## Requirements
	21	
	22	Established through brainstorming; each was confirmed by the human partner.
	23	
	24	1. `login` gains a `userId` parameter.
	25	2. The value is a **backend-issued authenticated user ID**, not a
	26	   locally-minted client or device identifier.
	27	3. It is absent on a first-ever login and present on subsequent ones.
	28	4. It persists across page loads and visits.
	29	5. It is readable by other forms in the app that do not exist yet.
	30	6. It is **non-authoritative**: it never affects whether authentication
	31	   succeeds.
	32	7. When a different account logs in on the same browser, the stored value
	33	   must not carry into the new session.
	34	
	35	## Global Constraints
	36	
	37	- **Testing:** unit tests via Node's built-in `node:test`. No new runtime or
	38	  dev dependencies — the repository is currently dependency-free and stays
	39	  that way.
	40	- **No build step.** Plain `<script>` tags, no bundler, no module loader, no
	41	  transpilation. Code must run as-is in a browser.
	42	- **No linter or formatter** is being introduced by this work. Match the
	43	  existing style in `app.js` (2-space indent, double quotes, semicolons).
	44	- **No end-to-end or fuzz testing.** The submit-handler wiring is verified
	45	  manually.
	46	
	47	## Architecture
	48	
	49	A new file, `session.js`, owns all persisted per-user state and exposes a
	50	single global, `UserSession`. `app.js` consumes it. `index.html` loads
	51	`session.js` before `app.js`.
	52	
	53	```
	54	index.html
	55	  ├─ <script src="session.js">   defines window.UserSession
	56	  └─ <script src="app.js">       consumes UserSession
	57	```
	58	
	59	The alternative of keeping the store inline in `app.js` was rejected:
	60	requirement 5 means a second consumer is a stated need rather than a guess,
	61	and a future form would have to duplicate the store or pull in all of
	62	`app.js`. A pluggable storage backend with change notifications was also
	63	rejected as YAGNI — there is one form and one storage mechanism anyone has
	64	asked for. `session.js` can be upgraded to that shape later without touching
	65	its consumers, which is the point of the boundary.
	66	
	67	An HttpOnly cookie set by the backend is the more secure way to persist
	68	identity, and was considered and discarded: JavaScript cannot read an
	69	HttpOnly cookie, so the ID could be neither a parameter to `login` nor
	70	readable by other forms, contradicting requirements 1 and 5. Browser-readable
	71	storage is therefore a deliberate choice, defensible only because of
	72	requirement 6.
	73	
	74	### Invariants
	75	
	76	These are the properties that keep the design safe. Any change that breaks
	77	one is a design change, not an implementation detail.
	78	
	79	- **`UserSession` is the sole accessor of `localStorage`.** No other code
	80	  reads or writes the storage key directly. This is what makes the storage
	81	  mechanism swappable without hunting call sites.
	82	- **The stored ID is non-authoritative.** It is tracking context, never a
	83	  credential. `login` must not branch on it. Any backend that later receives
	84	  it treats it as untrusted input.
	85	
	86	## Components
	87	
	88	### `session.js` — `UserSession`
	89	
	90	Backing store: `localStorage`, one key, `webapp:userId`, holding the raw ID
	91	string. Not a JSON envelope — there is one value and no versioning need, and
	92	a bare string keeps the failure modes trivial.
	93	
	94	`localStorage` rather than `sessionStorage` because requirement 4 says
	95	persist; `sessionStorage` dies with the tab, which would leave a returning
	96	visitor passing `null` in most real sessions.
	97	
	98	| Method | Behavior |
	99	|---|---|
	100	| `getUserId()` | Returns the stored ID string, or `null` if none is stored. |
	101	| `setUserId(id)` | Stores `id`. |
	102	| `clear()` | Removes all stored per-user state. |
	103	| `reconcile(passedId, returnedId)` | Applies the reconcile rule below; returns the ID now in effect. |
	104	
	105	**Storage-failure fallback.** `localStorage` access throws in real
	106	conditions — private browsing modes, storage disabled by policy, quota
	107	exhaustion. Every access is wrapped; on a throw, `UserSession` falls back to
	108	an in-memory value for the lifetime of the page. The app keeps working and
	109	loses only persistence. Letting the exception propagate would turn a storage
	110	quirk into a broken login form.
	111	
	112	**Storage resolution.** `UserSession` resolves its store as
	113	`globalThis.localStorage` at each access rather than capturing a reference at
	114	load time. This is what lets the unit tests substitute a fake: a test assigns
	115	`globalThis.localStorage` before exercising a method. It also means the
	116	component behaves correctly if storage is unavailable at load but present
	117	later. No dependency-injection plumbing is introduced — there is no build
	118	step, and an injectable parameter would leak test scaffolding into the
	119	browser API.
	120	
	121	**Node-loadability.** The unit tests load `session.js` under Node, where
	122	there is no `localStorage` and no `window`. The file must therefore attach
	123	its global in a way that works in both environments and must tolerate absent
	124	browser storage at load time — the storage-failure fallback already covers
	125	the missing-`localStorage` case, so no browser-detection branch is needed
	126	beyond the global assignment itself.
	127	
	128	### The reconcile rule
	129	
	130	Where account-switch protection lives.
	131	
	132	- `returnedId` is absent (`null`, `undefined`, or empty) → **no change**, and
	133	  return the current stored value. A response missing the field is not
	134	  evidence the user changed. This case is checked first.
	135	- `passedId` is `null` → store `returnedId`. First login on this browser.
	136	- `passedId === returnedId` → store `returnedId`. Same user returning.
	137	- `passedId !== returnedId`, both non-null → **a different person has logged
	138	  in on this browser.** Call `clear()` first, then store `returnedId`.
	139	
	140	Today `clear()` is technically redundant with overwriting a single key. The
	141	rule is written this way so it stays correct the first time a second
	142	per-user value is stored alongside the ID.
	143	
	144	### `app.js` changes
	145	
	146	- `login(username, password, userId)` — third parameter added. It is always
	147	  passed explicitly by the caller, `null` when unknown, rather than given a
	148	  default value. A default quietly hides a forgotten argument at a future
	149	  call site; an explicit `null` does not.
	150	- `login` records `userId` as context (today the existing `console.log`;
	151	  later, part of the POST body to `API_ENDPOINT`). It does not branch on it.
	152	  Success is determined by username and password alone — this is the one
	153	  place invariant 2 could be violated.
	154	- `login`'s stub return grows a `userId` of `stub-<username>`. There is no
	155	  backend, so there is no real ID to return; a marked placeholder makes the
	156	  whole loop observable and testable now, and the `stub-` prefix makes a fake
	157	  value obvious if it ever surfaces somewhere unexpected. This is replaced
	158	  when `API_ENDPOINT` is actually wired up.
	159	- The submit handler reads `UserSession.getUserId()` before calling `login`,
	160	  and calls `UserSession.reconcile(passedId, result.userId)` on success.
	161	- `validateForm` is **unchanged**. It gates on username and password only. A
	162	  missing `userId` is normal, not a validation failure — wiring the new field
	163	  into validation would break first-time login for every user.
	164	
	165	### `index.html` changes
	166	
	167	One added line: `<script src="session.js"></script>` before the existing
	168	`<script src="app.js"></script>`. Ordering is load-bearing; `app.js`
	169	references `UserSession` at submit time, but keeping the tags ordered avoids
	170	depending on that timing.
	171	
	172	## Data flow
	173	
	174	1. Page loads. User submits the form.
	175	2. Handler reads `username` and `password` as today.
	176	3. Handler reads `const userId = UserSession.getUserId()` — `null` on a
	177	   first-ever login.
	178	4. `validateForm({ username, password })` runs unchanged.
	179	5. `login(username, password, userId)` is called; it logs the context and
	180	   returns `{ success, user, userId }`.
	181	6. On success, `UserSession.reconcile(userId, result.userId)` stores the
	182	   authoritative ID, clearing prior state first on an account switch.
	183	
	184	## Error handling
	185	
	186	| Condition | Behavior |
	187	|---|---|
	188	| `localStorage` throws on read or write | Fall back to an in-memory value for the page lifetime; app continues without persistence. |
	189	| No stored ID | `getUserId()` returns `null`; `login` receives `null`; this is the normal first-login path, not an error. |
	190	| Stored value is an empty string | Treated as no value; `getUserId()` returns `null`. |
	191	| `login` returns no `userId` | Leave the store untouched rather than clearing it. A response missing the field is not evidence the user changed. |
	192	| Login fails (`success: false`) | Store is untouched. Reconcile runs only on success. |
	193	
	194	## Testing
	195	
	196	Unit tests for `session.js` via `node:test`, substituting a fake
	197	`globalThis.localStorage`:
	198	
	199	- `getUserId()` returns `null` when nothing is stored.
	200	- `setUserId` / `getUserId` round-trip.
	201	- `clear()` removes the value; `getUserId()` then returns `null`.
	202	- Empty stored string reads back as `null`.
	203	- `reconcile` with `passedId === null` stores the returned ID.
	204	- `reconcile` with matching IDs stores the returned ID.
	205	- `reconcile` with differing non-null IDs clears before storing.
	206	- `reconcile` with an absent `returnedId` leaves an existing stored ID
	207	  untouched.
	208	- Throwing storage: `setUserId` then `getUserId` still round-trips in memory,
	209	  and nothing propagates to the caller.
	210	
	211	The submit handler is not unit-tested — it needs a DOM, and for wiring this
	212	thin the jsdom setup cost exceeds the value. Manual browser verification
	213	covers it:
	214	
	215	1. Log in. Confirm a `stub-` ID is stored.
	216	2. Reload and log in as the same user. Confirm the stored ID was passed in.
	217	3. Log in as a different username. Confirm the store holds the new ID.
	218	4. Disable storage in the browser. Confirm login still works.
	219	
	220	## Known gaps
	221	
	222	- **No logout.** The store clears on account *switch*, not on logout, because
	223	  the app has no logout. A user who walks away from a shared browser leaves
	224	  their ID behind. Given requirement 6 this is a privacy wrinkle rather than
	225	  a security hole, but it is a real gap and is not addressed here.
	226	- **`API_ENDPOINT` is still unused.** `login` remains a stub. Sending
	227	  `userId` to a real backend is future work, and the `stub-` placeholder is
	228	  the marker for where that work lands.
	229	
	230	## Out of scope
	231	
	232	- Wiring `login` to a real endpoint.
	233	- Logout, session expiry, or ID rotation.
	234	- Additional forms. The design makes them cheap; it does not build them.
	235	- Linting, formatting, or end-to-end test infrastructure.
	236	- The unrelated `src/index.js` / `src/utils.js` Node code, which has no
	237	  connection to the browser script.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T222453Z-8c18/home/.cache/hyperpowers/codex-review/c9c2e85701016b4a140887dc5ef263df5b7fe0f1/run-T2ow3ShX/adjudications.md

	1	# Approved design decisions (brainstorming adjudications)
	2	
	3	Original request, verbatim:
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	Decisions confirmed by the human partner during brainstorming. Each was
	8	presented with alternatives and explicitly chosen; they are settled inputs to
	9	the spec, not open questions.
	10	
	11	1. **Shape** — the ID is a **parameter on `login`**, not a value returned by
	12	   it. Human partner's words: "It should be a parameter on login. It should
	13	   work across the app and persist, and other forms will need it later."
	14	   (Alternatives offered and rejected: return it from `login`; optional third
	15	   parameter with no source.)
	16	
	17	2. **Identity** — the ID is the **authenticated user ID issued by the
	18	   backend**, not a locally-minted client/device identifier and not both as
	19	   separate fields. Accepted consequence: the value is absent on a
	20	   first-ever login.
	21	
	22	3. **Purpose** — **record only**. The ID is tracking context; it never
	23	   affects whether authentication succeeds. Clearing stored state on an
	24	   account mismatch is folded in as a rule. (Alternatives rejected:
	25	   influence authentication; account-switch guarding as the primary feature.)
	26	
	27	4. **Approach** — **a separate `session.js`** exposing one global, loaded
	28	   before `app.js`. (Alternatives rejected: inline store in `app.js`, because
	29	   a second consumer is a stated requirement; pluggable storage backend with
	30	   change notifications, as YAGNI.)
	31	
	32	5. **Stub behavior** — the `login` stub returns a **marked placeholder**,
	33	   `stub-<username>`, so the loop is observable and testable before a backend
	34	   exists. (Alternative rejected: return no ID, leaving the feature dead code
	35	   until an endpoint lands.)
	36	
	37	6. **Tooling** — **unit tests via Node's built-in `node:test` only.** No new
	38	   dependencies. Explicitly declined: lint/format (biome), end-to-end tests,
	39	   fuzz testing.
	40	
	41	Classification note: this task was initially classified bounded and was
	42	upgraded to architectural when answer 1 revealed persistence and
	43	cross-component reuse requirements the repository has no structure for.
	44	
	45	## Codebase facts
	46	
	47	- `app.js` is a 28-line browser global script loaded by a plain `<script>`
	48	  tag. No modules, no build step, no bundler.
	49	- `login` is a stub; it does not perform a network request. `API_ENDPOINT` is
	50	  declared but unused. `login` has exactly one call site (`app.js:23`).
	51	- `index.html` contains exactly one form, `#login-form`. The "other forms"
	52	  referenced in decision 1 do not exist yet.
	53	- `package.json` has no dependencies, devDependencies, or scripts. No test
	54	  runner, linter, formatter, or CI config exists.
	55	- `src/index.js` and `src/utils.js` are an unrelated Node CommonJS pair with
	56	  no connection to the browser code.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
