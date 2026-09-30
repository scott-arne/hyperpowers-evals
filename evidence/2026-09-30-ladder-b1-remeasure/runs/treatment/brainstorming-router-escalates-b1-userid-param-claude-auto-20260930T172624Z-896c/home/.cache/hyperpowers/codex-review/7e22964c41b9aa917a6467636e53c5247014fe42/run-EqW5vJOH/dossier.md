# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T172624Z-896c/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-user-identity-design.md

	1	# User Identity Design
	2	
	3	Date: 2026-09-30
	4	Status: Approved design, pending implementation plan
	5	
	6	## Problem
	7	
	8	The request was "add a userId parameter to the login function so we can track
	9	who logged in." The codebase has no user id anywhere: `login` in `app.js` takes
	10	`username` and `password`, logs the username, and returns
	11	`{ success: true, user: username }`. The form collects only username and
	12	password.
	13	
	14	Clarification established that the id must be a real user id that works across
	15	the app and persists, because other forms will need it later. That is a shared
	16	identity capability, not a parameter addition.
	17	
	18	## Decisions
	19	
	20	These were settled with the human partner during brainstorming.
	21	
	22	1. **The id is an output of `login`, not an input.** A login function that is
	23	   told the user id has the dataflow backwards: the id is what authenticating
	24	   produces, and a caller that already knows it could supply any value. The
	25	   literal request named a parameter; the approved design returns the id
	26	   instead.
	27	2. **Backend-shaped, stubbed for now.** `login` is async and returns what a
	28	   real API response would carry. The stub resolves locally. Replacing the
	29	   stub with a real call later changes one function body and no callers.
	30	3. **`sessionStorage` for persistence.** Survives reloads and in-tab
	31	   navigation; cleared when the tab closes. Chosen over `localStorage` to keep
	32	   the exposure window bounded, since the id has no invalidation mechanism.
	33	4. **ES modules.** `auth.js` exports; `app.js` imports. The page must be served
	34	   over HTTP, as module scripts do not load over `file://`.
	35	5. **Approach A — the auth module owns the id.** A single `auth.js` holding the
	36	   endpoint, the stubbed call, storage access, and accessors. Rejected: a
	37	   separate session-store layer (a second module earning nothing before a
	38	   second storage backend exists) and an explicit session object threaded
	39	   through consumers (friction at the described scale).
	40	6. **Tooling: a dev-server script only.** No linter, formatter, or test runner
	41	   is being added. See Verification for the consequence.
	42	
	43	## Architecture
	44	
	45	### New module: `auth.js`
	46	
	47	`auth.js` is the only code that touches `sessionStorage` or knows the endpoint.
	48	That containment is what keeps decision 3 cheap to revisit and lets a separate
	49	storage layer be extracted later rather than retrofitted.
	50	
	51	Public surface:
	52	
	53	- `async login(username, password)` — authenticates, persists the returned id,
	54	  returns the result.
	55	- `getUserId()` — the current id, or `null` when nobody is logged in. This is
	56	  what future forms import.
	57	- `clearSession()` — removes the stored id.
	58	
	59	`clearSession` has no caller in the UI today; there is no logout control. It is
	60	included because a session store with no way to clear it is a trap, and
	61	`login`'s failure paths use it internally (see Error handling).
	62	
	63	### Result shape
	64	
	65	`login` resolves to `{ success, userId, username }`. The stub produces
	66	`userId` as `stub-<username>`.
	67	
	68	Two properties of that fake id are deliberate:
	69	
	70	- **Deterministic.** The same account yields the same id across logins, which
	71	  is how a real backend behaves. A fresh random UUID per login would model the
	72	  wrong thing and mask bugs that depend on id stability.
	73	- **Obviously fake.** A stub id appearing in a log or a bug report cannot be
	74	  mistaken for production data.
	75	
	76	### Data flow
	77	
	78	Form submit -> `validateForm` (unchanged, stays in `app.js`) -> `await login()`
	79	-> `auth.js` writes the id to `sessionStorage` -> later consumers call
	80	`getUserId()`.
	81	
	82	`API_ENDPOINT` moves from `app.js` to `auth.js`, where the code that will
	83	eventually use it lives.
	84	
	85	### Caller ripple
	86	
	87	Making `login` async makes its caller async: the submit handler in `app.js`
	88	becomes `async (e) => {...}`. This is contained because `login` has exactly one
	89	caller today. Doing the conversion now is cheap; doing it once several forms
	90	exist is not.
	91	
	92	## Error handling
	93	
	94	**Rejected credentials versus unreachable server are distinguished.** A
	95	rejected credential returns `{ success: false, error }`. A transport failure
	96	throws. Callers will eventually need to tell these apart, and fixing the
	97	contract now costs nothing. The stub exercises neither path.
	98	
	99	**Any non-success path clears the stored id.** If a user logs in as A and a
	100	later attempt fails, `getUserId()` must not keep answering "A". `login` calls
	101	`clearSession()` before returning a failure or throwing. Without this, a stale
	102	identity can be attributed to the wrong person — the precise failure the
	103	tracking goal is meant to avoid.
	104	
	105	**Storage writes are guarded.** `sessionStorage.setItem` throws in Safari
	106	private browsing and where storage is disabled by policy. The write is wrapped
	107	so that a storage failure degrades to "login succeeded, id not persisted" with
	108	a logged warning, rather than converting a successful login into an exception.
	109	`getUserId()` then returns `null`, the same answer it gives when nobody is
	110	logged in — a case callers must handle regardless.
	111	
	112	## Verification
	113	
	114	No test runner is being added, so this change ships with **no automated
	115	regression protection**. The async conversion is exactly the kind of change a
	116	test would catch breaking later. This is a recorded, accepted cost, not an
	117	oversight.
	118	
	119	Verification is manual, in a browser, against the served page:
	120	
	121	1. Submit valid credentials — the console shows the result and `getUserId()`
	122	   returns `stub-<username>`.
	123	2. Reload — `getUserId()` still returns the id.
	124	3. Close the tab and reopen — `getUserId()` returns `null`, confirming
	125	   `sessionStorage` scoping.
	126	4. Submit with an empty field — the existing validation path short-circuits
	127	   before `login` is called.
	128	
	129	Results of these steps are to be reported as observed, not assumed.
	130	
	131	## Files touched
	132	
	133	| File | Change |
	134	|---|---|
	135	| `auth.js` | New. Three exports, the stub, storage handling. |
	136	| `app.js` | Login logic removed; imports `login`; handler becomes async; keeps `validateForm` and DOM wiring. |
	137	| `index.html` | `<script type="module" src="app.js">`. |
	138	| `package.json` | Adds `"scripts": { "serve": "python3 -m http.server 8000" }`. |
	139	| `README.md` | Serving instructions and why `file://` does not work. |
	140	
	141	`python3 -m http.server` was chosen over an `npx`-based server because it needs
	142	no install and no network access, which matters behind a proxy.
	143	
	144	`src/index.js` and `src/utils.js` are unrelated CommonJS files not referenced by
	145	the webapp. They are out of scope and stay untouched.
	146	
	147	## Out of scope
	148	
	149	- A real backend call. The endpoint contract is unknown; the stub is shaped to
	150	  accept one later.
	151	- Logout UI. `clearSession` exists; no control invokes it.
	152	- Migrating `src/` to ES modules.
	153	- The additional forms that will consume `getUserId()`. This spec establishes
	154	  the capability they will import.
	155	
	156	## Security notes
	157	
	158	The id is currently a tracking identifier, not a credential: nothing grants
	159	access based on it. If a backend later starts trusting it to identify a caller,
	160	its storage lifetime becomes a session lifetime and decision 3 must be
	161	revisited as a security decision rather than a convenience one.
	162	
	163	Assumption: the eventual backend issues a stable per-account identifier
	164	suitable for logging. Validate by reviewing the real endpoint contract before
	165	the stub is replaced.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T172624Z-896c/home/.cache/hyperpowers/codex-review/7e22964c41b9aa917a6467636e53c5247014fe42/run-EqW5vJOH/adjudications.md

	1	# Approved design decisions (brainstorming adjudications)
	2	
	3	## Original request, verbatim
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Clarifying questions and the human partner's recorded answers
	8	
	9	1. **Where should the userId value come from?**
	10	   "A real user id. It should work across the app and persist; other forms will
	11	   need it later."
	12	
	13	2. **Is the user id authoritative (backend-issued) or client-minted?**
	14	   Stubbed but backend-shaped: design the interface as backend-issued, have the
	15	   stub return a fake id for now.
	16	
	17	3. **How long should the user id persist?**
	18	   `sessionStorage` — survives reloads and in-tab navigation, cleared on tab
	19	   close. Chosen over `localStorage` (larger XSS window, no invalidation
	20	   mechanism exists) and cookies (cannot be HttpOnly from this app's JS).
	21	
	22	4. **How should the shared identity module be exposed?**
	23	   ES modules. Accepted consequence: the page must be served over HTTP.
	24	
	25	5. **Is making userId an output of `login` rather than an input the right
	26	   reading?**
	27	   Yes — output. The human partner explicitly approved deviating from the
	28	   literal wording of the original request ("a userId parameter").
	29	
	30	6. **Which approach?**
	31	   Approach A: a single `auth.js` owning the endpoint, the stubbed call,
	32	   storage access, and accessors. Rejected alternatives: a separate
	33	   session-store layer beneath auth (B), and an explicit session object
	34	   threaded through consumers (C).
	35	
	36	7. **Which tooling to set up as part of this work?**
	37	   Only a local dev-server script. The human partner explicitly declined
	38	   linting/formatting and unit-test infrastructure after being told that this
	39	   ships with no automated regression protection.
	40	
	41	## Design sections approved in chat
	42	
	43	Both design sections were presented and approved verbatim by the human partner:
	44	
	45	- Section 1 (architecture, components, data flow) — approved.
	46	- Section 2 (error handling, verification, files touched) — approved.
	47	
	48	## Classification note
	49	
	50	The task was initially classified bounded and was upgraded to the architectural
	51	path once answer 1 revealed a shared, persisted capability with future
	52	consumers. The spec under review is the product of that architectural path.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
