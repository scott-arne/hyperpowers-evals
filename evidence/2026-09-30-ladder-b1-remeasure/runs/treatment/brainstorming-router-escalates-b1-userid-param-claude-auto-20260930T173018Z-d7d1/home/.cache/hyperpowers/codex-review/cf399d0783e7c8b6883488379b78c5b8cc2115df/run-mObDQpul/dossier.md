# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T173018Z-d7d1/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-client-identity-store-design.md

	1	# Client Identity Store — Design
	2	
	3	Date: 2026-09-30
	4	Status: Approved design, pending implementation plan
	5	
	6	## Origin
	7	
	8	The request was "add a userId parameter to the login function so we can track
	9	who logged in." Clarifying questions established that the identifier must
	10	persist and be readable by other forms across the app, that two distinct
	11	identifiers are wanted (a correlation id for analytics and an auth identity for
	12	anything that gates behavior), and that whether a real backend is coming is
	13	undecided. That makes this a shared identity store rather than a parameter
	14	change.
	15	
	16	## Problem
	17	
	18	`app.js` today defines `login(username, password)` as a stub that logs the
	19	username and returns a hardcoded `{ success: true, user: username }`. Its only
	20	call site is the form submit handler in the same file, which has access to
	21	nothing but the two form field values. Nothing in the repository reads or writes
	22	`localStorage`, `sessionStorage`, or cookies. There is no identifier of any kind
	23	to pass, and no place to keep one.
	24	
	25	What the app needs:
	26	
	27	1. A place where the current user's identity lives that survives navigation
	28	   between pages.
	29	2. A way `login` writes it there.
	30	3. A way other forms and pages read it.
	31	4. A lifetime rule and a teardown path.
	32	5. Two separate identifiers with different lifetimes and different levels of
	33	   trust.
	34	6. A seam so a future server can take over issuing the auth identity.
	35	
	36	## Deliberate departure from the original request
	37	
	38	**`login` does not gain a `userId` parameter.** The design returns the
	39	identifier instead of accepting one.
	40	
	41	The caller has no userId to supply. An identifier for "who logged in" is an
	42	output of authenticating, not an input to it; a parameter would force the submit
	43	handler to invent a value and hand it to the function that is better placed to
	44	determine it. The stated goal — tracking who logged in — is met by the returned
	45	identifier plus the store described below.
	46	
	47	This departure was presented explicitly and approved. It is recorded here so a
	48	later reader does not treat the missing parameter as an oversight.
	49	
	50	## Architecture
	51	
	52	### Component
	53	
	54	A single new file, `identity.js`, loaded before `app.js` on every page via a
	55	plain `<script src="identity.js">` tag. It is the only code in the application
	56	permitted to touch browser storage. This matches the repository's existing
	57	pattern: no build step, no bundler, classic scripts in global scope.
	58	
	59	Public surface:
	60	
	61	| Function | Behavior |
	62	|---|---|
	63	| `Identity.getCorrelationId()` | Returns the correlation id, creating and persisting one on first call. Never returns null: when storage is unavailable it returns an in-memory id valid for the page's lifetime. |
	64	| `Identity.setAuth(userId)` | Writes the auth identity. |
	65	| `Identity.getAuth()` | Returns the auth identity, or `null` when absent. |
	66	| `Identity.clearAuth()` | Removes the auth identity only. The logout path. |
	67	| `Identity.reset()` | Removes both identifiers. |
	68	
	69	### Storage
	70	
	71	| Identifier | Store | Key | Lifetime |
	72	|---|---|---|---|
	73	| Correlation id | `localStorage` | `app.cid.v1` | Survives browser restart and survives logout. |
	74	| Auth identity | `sessionStorage` | `app.auth.v1` | Survives navigation within the tab; cleared on tab close or logout. |
	75	
	76	Keys carry a `v1` suffix so a later format change cannot collide with values
	77	already sitting in users' browsers.
	78	
	79	The correlation id surviving logout is intentional, not an oversight: correlating
	80	one person's activity across sessions is the reason it exists. The auth identity
	81	must not survive logout.
	82	
	83	Identifiers are generated with `crypto.randomUUID()`, falling back to a
	84	`crypto.getRandomValues`-based generator where `randomUUID` is unavailable.
	85	`Math.random` is not used.
	86	
	87	### Data flow
	88	
	89	1. A page loads. `identity.js` defines `Identity`. Nothing is written to storage
	90	   until something asks for it.
	91	2. The submit handler validates the form, then calls
	92	   `login(username, password)`.
	93	3. On success, `login` produces a `userId` and returns
	94	   `{ success: true, user: username, userId }`.
	95	4. The handler calls `Identity.setAuth(result.userId)`.
	96	5. The handler calls `trackLoginEvent({ userId, correlationId, username })`,
	97	   a new function defined in `app.js` alongside `login`. The correlation id
	98	   comes from `Identity.getCorrelationId()`.
	99	6. Other pages read the current identity with `Identity.getAuth()`.
	100	
	101	### The backend seam
	102	
	103	With no server, step 3's `userId` is generated client-side. It is named in the
	104	code as a placeholder and sits at exactly the point where a server-issued
	105	identifier will later arrive, so adopting a real backend means changing what
	106	`login` assigns to `userId` and nothing else about the flow.
	107	
	108	`trackLoginEvent` is a single function with a single call site. Its body is a
	109	`console.log` today; replacing it with a network POST later does not touch
	110	`login` or `identity.js`.
	111	
	112	`API_ENDPOINT` in `app.js` is currently declared and unused. This work does not
	113	change that.
	114	
	115	## Error handling
	116	
	117	Browser storage throws more often than is commonly assumed: Safari private
	118	browsing, quota exhaustion, and storage disabled by enterprise policy all
	119	surface as exceptions on read or write.
	120	
	121	- Every storage access is wrapped. On failure, `Identity` degrades to an
	122	  in-memory store for the lifetime of the page and emits one warning. It does
	123	  not warn repeatedly.
	124	- Reads return `null` on failure rather than throwing. A login form that breaks
	125	  because storage is blocked is a worse outcome than one that loses correlation.
	126	- A stored value that is absent, empty, or not a well-formed identifier is
	127	  treated as absent and overwritten on next write.
	128	- `getAuth()` returning `null` is a normal state meaning "not logged in", not an
	129	  error. Consumers must handle it.
	130	
	131	## Security constraints
	132	
	133	These are binding on this work and on anything built on top of it.
	134	
	135	- **Nothing may gate access, authorization, or visibility of sensitive data on
	136	  `Identity.getAuth()`.** Until a server issues and validates the identifier, it
	137	  is client-asserted and editable in devtools. It is for display and correlation
	138	  only. This constraint is what prevents a placeholder from silently becoming a
	139	  security control.
	140	- No password, credential, or token is written to either store, ever.
	141	- The correlation id is a persistent tracking identifier tied to a browser. If a
	142	  privacy notice exists or is planned, it must cover it.
	143	
	144	## Known gap
	145	
	146	There is no logout UI in the application today, so `clearAuth()` ships with no
	147	caller. An auth identity with no teardown path is a half-built feature. The
	148	first page that introduces a logout affordance must call `clearAuth()`. This is
	149	recorded as a gap rather than resolved here because building logout UI is
	150	outside the approved scope.
	151	
	152	## Global Constraints
	153	
	154	Tooling to be established as part of this work, before `identity.js` is written:
	155	
	156	- **Linting and auto-formatting.** ESLint plus Prettier, the standard pairing
	157	  for this stack, as devDependencies. The repository currently has neither.
	158	- **Unit test infrastructure.** A test runner with `identity.js` covered:
	159	  lazy creation, the clear semantics of `clearAuth` versus `reset`, the
	160	  storage-failure fallback path, and malformed-value handling.
	161	- End-to-end test infrastructure is explicitly **not** set up. It is
	162	  disproportionate at this size.
	163	- Fuzz and mutation testing are not applicable here.
	164	
	165	Testing approach: use Node's built-in `node:test` runner with a hand-written
	166	storage stub, rather than adding a browser-environment test dependency. This
	167	keeps the test toolchain dependency-free and matches `src/*.js`, which already
	168	uses CommonJS. To make `identity.js` loadable under both the browser and the
	169	test runner, it attaches `Identity` to `globalThis` and additionally exports it
	170	through a guarded `typeof module !== 'undefined'` check.
	171	
	172	Assumption: `node:test` with a storage stub gives adequate confidence for this
	173	component, validate by writing the fallback-path test first and confirming it
	174	fails against a deliberately broken stub before the implementation exists.
	175	
	176	## Out of scope
	177	
	178	- Logout UI.
	179	- Any real network call, including activating `API_ENDPOINT`.
	180	- Server-side identity issuance or validation.
	181	- The additional forms and pages that motivated the store. This work provides
	182	  what they will read; it does not build them.
	183	- Converting `app.js` to ES modules.
	184	- Any change to `src/index.js` or `src/utils.js`, which are a separate Node
	185	  entry point unrelated to the browser page.
	186	
	187	## Approaches considered and rejected
	188	
	189	**ES modules.** `identity.js` as a real module with `app.js` converted to
	190	`<script type="module">` would give a browser-enforced import graph and no
	191	globals. Rejected for now: ES modules do not load over `file://`, so it would
	192	require serving the directory over HTTP to develop, which is a workflow change
	193	for a project with no dev server. It remains a cheap retrofit because the
	194	storage decisions are centralized either way.
	195	
	196	**Login event with a separate tracking subscriber.** `login` dispatching a
	197	`CustomEvent('auth:login', ...)` consumed by a `tracking.js` subscriber would
	198	decouple tracking's destination from login entirely. Rejected as premature: with
	199	tracking currently a single `console.log` and one call site, `trackLoginEvent`
	200	already isolates the destination at a fraction of the indirection. Worth
	201	revisiting when more than one thing needs to react to login.
	202	
	203	A Codex approach consultation was attempted for this design. The companion
	204	resolved to a stub build (`0.0.0-stub`) and returned an empty payload, so no
	205	independent approaches were folded in. The three approaches considered were
	206	developed without external input.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T173018Z-d7d1/home/.cache/hyperpowers/codex-review/cf399d0783e7c8b6883488379b78c5b8cc2115df/run-mObDQpul/adjudications.md

	1	# Approved design context
	2	
	3	## Original user request (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Clarifying questions and the human partner's recorded answers
	8	
	9	1. **Where should userId come from, given none exists in the codebase?**
	10	   "It should persist and work across the app — other forms will need it later."
	11	   (This answer triggered a re-classification from a bounded change to an
	12	   architectural one.)
	13	
	14	2. **What kind of identifier is this?**
	15	   Both, kept separate — a correlation id for analytics plus an auth identity
	16	   for anything that gates behavior.
	17	
	18	3. **Is a real backend coming?**
	19	   Unsure / not decided. Agreed to design client-only with an explicit seam and
	20	   record in the spec what changes when a server arrives.
	21	
	22	4. **How long should the auth identity survive?**
	23	   `sessionStorage` — survives navigation within the tab, cleared on tab close.
	24	   (The correlation id in `localStorage` was proposed rather than asked, and not
	25	   objected to.)
	26	
	27	5. **Which approach?**
	28	   Approach A: a global `identity.js` namespace object loaded by a classic
	29	   script tag. Rejected: ES modules (requires HTTP dev server), and a
	30	   CustomEvent + separate tracking subscriber (premature at one call site).
	31	
	32	6. **Where does tracking send data?**
	33	   Console now, an endpoint later. The design must isolate the destination so
	34	   swapping it does not touch `login`.
	35	
	36	7. **Design approval.**
	37	   The design was presented in chat and approved as presented, explicitly
	38	   including the decision that `login` does NOT gain a `userId` parameter and
	39	   instead returns the identifier. The alternative ("add the parameter anyway")
	40	   was offered and not chosen.
	41	
	42	8. **Tooling.**
	43	   Unit tests plus lint/format to be established before `identity.js` is
	44	   written. End-to-end testing explicitly declined as disproportionate.
	45	
	46	## Notes for the reviewer
	47	
	48	- The departure from the literal original request (no `userId` parameter) is a
	49	  deliberate, approved decision, not an oversight. Evaluate whether the spec
	50	  justifies and documents it adequately, not whether it should be reversed.
	51	- No backend exists. `login` is a stub returning a hardcoded object, and
	52	  `API_ENDPOINT` is declared but unused.
	53	- A Codex approach consultation was attempted earlier in this brainstorm and
	54	  returned an empty payload (companion resolved to a `0.0.0-stub` build).


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
