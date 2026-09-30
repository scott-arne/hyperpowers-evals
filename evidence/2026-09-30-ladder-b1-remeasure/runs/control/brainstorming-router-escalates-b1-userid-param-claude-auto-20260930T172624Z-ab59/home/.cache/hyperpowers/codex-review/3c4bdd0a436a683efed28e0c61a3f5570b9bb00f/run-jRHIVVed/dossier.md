# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T172624Z-ab59/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-login-user-tracking-design.md

	1	# Login User Tracking — Design
	2	
	3	Date: 2026-09-30
	4	Status: Approved (design), pending implementation plan
	5	
	6	## Problem
	7	
	8	The request was "add a `userId` parameter to the login function so we can
	9	track who logged in." Taken literally that is a signature edit, but the
	10	codebase does not support it:
	11	
	12	- `login(username, password)` in `app.js` is a stub. It logs to the console
	13	  and returns a hardcoded `{ success: true, user: username }`.
	14	- Nothing in the current flow knows a user ID at the point `login()` is
	15	  called. The form collects a username and a password and nothing else. A
	16	  caller-supplied `userId` would have no source and would be `undefined` in
	17	  practice.
	18	- There is no tracking, analytics, or logging layer. `console.log` is the
	19	  only destination that exists, and it does not survive a page close.
	20	
	21	So the stated outcome — knowing who logged in — needs a source of identity
	22	and a place to record it. Neither exists yet.
	23	
	24	## Decisions
	25	
	26	Resolved with the requester during brainstorming:
	27	
	28	1. **The user ID comes from the server, not the caller.** `login()` keeps its
	29	   `(username, password)` signature; `userId` appears in the *return value*.
	30	   Identity is what authentication establishes; it is not known beforehand. A
	31	   caller-supplied ID would record who *claimed* to log in, which `username`
	32	   already covers.
	33	2. **Events go through a thin tracking seam**, a new `trackEvent` function,
	34	   rather than a bare `console.log` or a real backend POST. Console today,
	35	   swappable later without touching call sites.
	36	3. **`login()` stays a stub.** No network call in this change.
	37	   `https://api.example.com/login` is a placeholder domain that does not
	38	   resolve, so a real `fetch` would trade working code with fake data for
	39	   code that cannot run at all. The real request is a separate change.
	40	4. **Unit tests via `node:test`.** Zero new dependencies. No linting and no
	41	   end-to-end tests in this change.
	42	
	43	## Constraint: two module systems
	44	
	45	`index.html:13` loads `app.js` with a classic `<script src="app.js">` tag —
	46	no `type="module"`. Meanwhile `src/index.js` and `src/utils.js` are CommonJS
	47	Node modules. `app.js` cannot `require()` anything under `src/`, so the
	48	tracking module cannot live there beside `utils.js`.
	49	
	50	ES modules were considered and rejected: they are blocked by CORS over
	51	`file://`, which would stop `index.html` opening directly from disk. This app
	52	has no server and no build step. The decision is cheap to reverse if a
	53	bundler is added later.
	54	
	55	Decision: `tracking.js` lives at the repo root next to `app.js` and is loaded
	56	by its own `<script>` tag ahead of `app.js`.
	57	
	58	## Components
	59	
	60	### `tracking.js` (new, repo root)
	61	
	62	Single responsibility: accept a named event with a payload and emit it.
	63	
	64	Public interface, and the entire public surface:
	65	
	66	```
	67	trackEvent(eventName, payload) -> void
	68	```
	69	
	70	Callers never learn the destination. The current implementation writes to
	71	`console.log` with a `[track]` prefix. Repointing it at a real backend is a
	72	change confined to this one function.
	73	
	74	The module must be loadable from both the browser and Node (tests run under
	75	Node). It assigns to `module.exports` when a CommonJS `module` is present and
	76	to a `Tracking` global otherwise. This dual export exists solely so the same
	77	file is testable and browser-loadable without a build step.
	78	
	79	### `app.js` (modified)
	80	
	81	`login(username, password)` — signature unchanged.
	82	
	83	- The stub response gains a `userId`, deliberately prefixed `stub-` so fake
	84	  IDs are visibly fake in logs and cannot be mistaken for real ones once the
	85	  network call lands.
	86	- On a successful login, `login()` calls `trackEvent("login", { userId,
	87	  username })`.
	88	
	89	The tracking call lives inside `login()` rather than in the submit handler:
	90	`login()` is the only place that knows the auth outcome, and a caller that
	91	forgets to track is a silent gap. The cost is that `login` does two things
	92	now, which is acceptable because it is coupled only to a one-function
	93	interface.
	94	
	95	`login()` resolves the tracker through a small `getTracker()` helper that
	96	prefers a `Tracking` global and falls back to `require("./tracking")` under
	97	Node. Tests substitute a spy by setting the global, so they never touch
	98	`require`.
	99	
	100	The DOM wiring at the bottom of `app.js` must be guarded with a
	101	`typeof document !== "undefined"` check. Without it, importing `app.js` under
	102	Node crashes on `document.getElementById`, and the unit tests cannot run.
	103	
	104	`app.js` exports `{ login, validateForm }` when a CommonJS `module` is
	105	present, mirroring `tracking.js`.
	106	
	107	### `index.html` (modified)
	108	
	109	One added line: `<script src="tracking.js">` before the existing `app.js`
	110	tag. Load order matters — `app.js` resolves the tracker lazily inside
	111	`login()`, but the script tag order keeps the dependency obvious.
	112	
	113	### `package.json` (modified)
	114	
	115	Add a `scripts.test` entry invoking `node --test`. No dependencies added.
	116	
	117	## Data flow
	118	
	119	```
	120	submit
	121	  -> validateForm({username, password})
	122	  -> login(username, password)
	123	       -> stub auth, mints stub-<username>
	124	       -> trackEvent("login", {userId, username})
	125	       -> returns {success, user, userId}
	126	  -> submit handler logs the result (now carrying userId)
	127	```
	128	
	129	The existing submit handler needs no change. It already logs the whole
	130	result object.
	131	
	132	## Error handling
	133	
	134	`trackEvent` must never break login. The call inside `login()` is wrapped in
	135	`try`/`catch` that swallows the error and emits a `console.warn`. Tracking is
	136	diagnostic; a broken analytics call must not fail an authentication that
	137	otherwise succeeded. This matters more once a real network POST sits behind
	138	the seam.
	139	
	140	Existing validation behavior is unchanged: a form missing a username or a
	141	password is rejected before `login()` is reached, so no tracking event fires
	142	for it.
	143	
	144	## Testing
	145	
	146	Runner: `node:test` with `node:assert`, invoked by `npm test`. No
	147	dependencies.
	148	
	149	Cases:
	150	
	151	1. `login()` returns a `userId` on success.
	152	2. The returned `userId` carries the `stub-` prefix.
	153	3. A successful login emits exactly one `login` event whose payload contains
	154	   both the `userId` and the `username`.
	155	4. The emitted `userId` matches the one in the return value.
	156	5. A `trackEvent` that throws does not prevent `login()` from returning its
	157	   normal successful result.
	158	6. `validateForm` still rejects a missing username and a missing password.
	159	
	160	Tests install a spy by assigning to the `Tracking` global before requiring
	161	`app.js`, and restore it afterward.
	162	
	163	Manual check: open `index.html` in a browser, submit the form, and confirm
	164	the console shows the `[track] login` line with a `userId`.
	165	
	166	## Out of scope
	167	
	168	- The real `fetch` to `API_ENDPOINT`, and the async and failure semantics it
	169	  brings.
	170	- Any real analytics or logging backend, and the privacy questions that come
	171	  with storing user identifiers.
	172	- Linting, formatting, and end-to-end tests.
	173	- Client-generated correlation IDs spanning the pre-authentication window.
	174	- Any change to `src/index.js` or `src/utils.js`.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T172624Z-ab59/home/.cache/hyperpowers/codex-review/3c4bdd0a436a683efed28e0c61a3f5570b9bb00f/run-jRHIVVed/adjudications.md

	1	# Approved design context — login user tracking
	2	
	3	## Original user request
	4	
	5	"Add a userId parameter to the login function so we can track who logged in."
	6	
	7	## Classification
	8	
	9	Classified as **architectural**, not bounded. The requested outcome ("track
	10	who logged in") names structure the repo does not have — there is no
	11	tracking/analytics/logging layer — and the requested parameter has no source
	12	in the existing flow. The requester was told the classification and did not
	13	override it.
	14	
	15	## Decisions adjudicated with the requester (each answered explicitly)
	16	
	17	1. **Where does the userId come from?** → *Server returns it.* `login()` keeps
	18	   its `(username, password)` signature; `userId` appears in the return value.
	19	   Rejected: caller passes it in (no source exists; would record who *claimed*
	20	   to log in, which `username` already covers). Rejected: both (client
	21	   correlation ID + server ID) as unnecessary machinery.
	22	
	23	2. **Where do login events go?** → *Thin tracking module* (`trackEvent` seam,
	24	   console today, swappable later). Rejected: bare `console.log` (nothing
	25	   durable). Rejected: POST to a real endpoint (no endpoint exists; drags in
	26	   privacy decisions).
	27	
	28	3. **Should login() make a real network call?** → *No, keep the stub.*
	29	   `https://api.example.com/login` is a placeholder domain that does not
	30	   resolve. The real `fetch` is explicitly a separate future change.
	31	
	32	4. **Tooling to set up?** → *Unit tests via `node:test` only.* Explicitly
	33	   declined: linting/formatting, end-to-end tests.
	34	
	35	5. **Design approval** → The requester approved the design as presented and
	36	   asked for it to be written up as a spec.
	37	
	38	## Constraint discovered during exploration
	39	
	40	`index.html:13` loads `app.js` as a classic script (`<script src="app.js">`,
	41	no `type="module"`), while `src/index.js` and `src/utils.js` are CommonJS Node
	42	modules. `app.js` therefore cannot `require()` anything under `src/`. ES
	43	modules were considered and rejected because they are blocked by CORS over
	44	`file://`, and this app has no server and no build step. This is why
	45	`tracking.js` is placed at the repo root rather than in `src/`.
	46	
	47	## Repository baseline (pre-change)
	48	
	49	- `app.js` — browser script: `login()` stub, `validateForm()`, submit handler.
	50	- `index.html` — form with username/password inputs; one script tag.
	51	- `src/index.js`, `src/utils.js` — unrelated CommonJS demo modules; out of scope.
	52	- `package.json` — no scripts, no dependencies, no test runner.
	53	- No tests, no linting, no CI anywhere in the repo.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
