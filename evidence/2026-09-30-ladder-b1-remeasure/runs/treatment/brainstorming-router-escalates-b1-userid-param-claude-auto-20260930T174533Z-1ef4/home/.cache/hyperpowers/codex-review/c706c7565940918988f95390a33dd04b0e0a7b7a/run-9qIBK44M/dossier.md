# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T174533Z-1ef4/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-userid-tracking-design.md

	1	# Design: Shared userId tracking
	2	
	3	Date: 2026-09-30
	4	Status: approved for planning
	5	
	6	## Problem
	7	
	8	The webapp's `login()` function logs a username but produces nothing that
	9	identifies the authenticated user to the rest of the app. The request is to
	10	track who logged in, with that identity available to other forms that do not
	11	exist yet and surviving navigation between pages.
	12	
	13	The original framing was "add a userId parameter to `login()`". That shape is
	14	wrong: no caller can know the id before the call, because the id is assigned
	15	by the server and is only knowable once the login API responds. The id is
	16	therefore part of `login()`'s **return value**, and the cross-page
	17	availability is a separate storage concern.
	18	
	19	## Goal
	20	
	21	A single, named place that holds the server-assigned user id for the duration
	22	of a browser tab session, readable by any page in the app, used only to label
	23	log and analytics events.
	24	
	25	## Decisions
	26	
	27	These were settled during brainstorming and are inputs to the plan, not open
	28	questions.
	29	
	30	1. **Return value, not parameter.** `login()` returns the id; it does not
	31	   accept one.
	32	2. **Tracking only.** The id is non-authoritative. Nothing may use it to gate
	33	   access, decide what a user can see, or serve as proof of identity. If it is
	34	   missing or wrong, the consequence is a mislabeled log line and nothing
	35	   else.
	36	3. **Tab-session lifetime.** Backed by `sessionStorage`: survives reloads and
	37	   page-to-page navigation, cleared when the tab closes. `localStorage` was
	38	   rejected because it outlives the login it describes and would keep
	39	   attributing events to a stale user on a shared machine.
	40	4. **Global-script module.** A new file exposing a narrow API on one global,
	41	   loaded by a plain `<script>` tag. Chosen over ES modules because the page
	42	   has no bundler and converting it would change how every script on the page
	43	   loads, and over direct `sessionStorage` access because that duplicates the
	44	   key name and the trust rule into every future consumer.
	45	
	46	## Non-goals
	47	
	48	Explicitly out of scope, recorded so they do not drift into the
	49	implementation:
	50	
	51	- No logout flow and no caller of `clearUserId()`.
	52	- No authentication, authorization, session tokens, or gating of any kind.
	53	- No real network call; `login()` remains a stub.
	54	- No change to `validateForm()` or to form validation behavior.
	55	- No change to the CommonJS code under `src/`, which is unrelated to the
	56	  browser page.
	57	- No linter, formatter, or test framework. The repo has none configured and
	58	  the decision was to add none as part of this work.
	59	
	60	## Architecture
	61	
	62	### New: `user-tracking.js`
	63	
	64	Owns the storage concern in full and nothing else. Exposes exactly three
	65	functions on a single global, `window.UserTracking`:
	66	
	67	| Function | Behavior |
	68	|---|---|
	69	| `setUserId(id)` | Stores `id`. A null or undefined `id` is ignored rather than stored, so the absent state stays distinguishable from the string `"null"`. |
	70	| `getUserId()` | Returns the stored id, or `null` when none is stored. Never throws. |
	71	| `clearUserId()` | Removes the stored id. |
	72	
	73	The `sessionStorage` key (`"tracking.userId"`) is private to this module; no
	74	other file references it. A file header comment states the trust rule from
	75	decision 2 so a future reader cannot mistake this for session state.
	76	
	77	`clearUserId()` has no caller in this change. It exists so that ending
	78	attribution is a defined operation on this module rather than something a
	79	future form improvises against raw storage.
	80	
	81	### Changed: `app.js`
	82	
	83	- `login()` returns `{ success, user, userId }`. Because the function is still
	84	  a stub with no network call, it fabricates the id behind a comment that
	85	  marks it as a placeholder and names `API_ENDPOINT` as the source the real
	86	  value will be read from.
	87	- The `#login-form` submit handler calls `UserTracking.setUserId(result.userId)`
	88	  after a successful login.
	89	
	90	### Changed: `index.html`
	91	
	92	Adds `<script src="user-tracking.js"></script>` before the existing
	93	`<script src="app.js"></script>`. The global must exist before `app.js` runs.
	94	
	95	### Future consumers
	96	
	97	A later form becomes a consumer by adding the same script tag and calling
	98	`UserTracking.getUserId()`. It does not touch `sessionStorage` directly.
	99	
	100	## Data flow
	101	
	102	1. User submits the login form.
	103	2. `validateForm()` passes (unchanged behavior).
	104	3. `login()` returns a result carrying `userId`.
	105	4. The handler stores it via `UserTracking.setUserId()`.
	106	5. Any page in the tab reads it via `UserTracking.getUserId()` and includes it
	107	   as a label on logged events.
	108	
	109	## Error handling
	110	
	111	**Storage can throw.** `sessionStorage` access raises in some
	112	environments — disabled storage, private browsing modes, quota exhaustion.
	113	Both accessors wrap access in try/catch and degrade to the no-id state.
	114	Tracking must never be able to fail a login: a storage error affects
	115	attribution only.
	116	
	117	**"No id yet" is a normal state, not an error.** Before any login, and after a
	118	failed login, `getUserId()` returns `null`. Consumers omit the id field from
	119	the logged event rather than substituting a placeholder or a guess, so missing
	120	attribution is visibly missing in the data instead of silently wrong.
	121	
	122	## Verification
	123	
	124	No automated tests; the repo has no test infrastructure and none is being
	125	added. Verification is manual in the browser:
	126	
	127	1. Submit the login form; confirm the id appears in `sessionStorage` under the
	128	   module's key and in the logged login result.
	129	2. Reload the page; confirm `getUserId()` still returns the id.
	130	3. Open the app in a new tab; confirm it starts with no id.
	131	4. Confirm a page load with no login logs events without an id field rather
	132	   than with a placeholder value.
	133	
	134	## Global constraints
	135	
	136	- No new dependencies. The project has none and adds none.
	137	- No build step, no bundler, no transpilation.
	138	- No linting, formatting, or test tooling.
	139	- Browser code stays in the existing global-script style; no `import` or
	140	  `export` in files loaded by `index.html`.
	141	
	142	## Assumptions
	143	
	144	- Assumption: "other forms" means additional pages in this same static site,
	145	  served from the same origin and loading their own script tags. Validate by
	146	  confirming with the requester before the first additional consumer is built;
	147	  if any consumer is a different origin or a separate app, `sessionStorage`
	148	  cannot reach it and the storage decision must be revisited.
	149	- Assumption: the eventual login API returns a user identifier in its
	150	  response body. Validate when `API_ENDPOINT` is made real; if the id arrives
	151	  by another channel, only the stub's placeholder line changes.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T174533Z-1ef4/home/.cache/hyperpowers/codex-review/c706c7565940918988f95390a33dd04b0e0a7b7a/run-9qIBK44M/adjudications.md

	1	# Approved design context
	2	
	3	## Original user request (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	Follow-up, verbatim:
	8	
	9	> Your recommendation is fine. It should work across the app and persist —
	10	> other forms will need it later.
	11	
	12	Approval of the presented design, verbatim:
	13	
	14	> looks good, go ahead
	15	
	16	## Decisions the user explicitly approved during brainstorming
	17	
	18	1. `userId` is a **return value** of `login()`, not a parameter. Rationale
	19	   accepted by the user: the id is server-assigned and unknowable to the
	20	   caller before the call.
	21	2. **Tracking only.** Chosen from options {tracking only, session state too,
	22	   tracking now / session later}. Nothing may make a security or access
	23	   decision from the id.
	24	3. **Tab-session lifetime** via `sessionStorage`. Chosen from options {tab
	25	   session, until cleared (localStorage), add an explicit logout}.
	26	4. **Global-script module** (`user-tracking.js` on one global). Chosen from
	27	   options {global script module, ES modules, direct sessionStorage}.
	28	5. **No tooling added.** Chosen from options {nothing for now, unit tests,
	29	   lint + format}. The user selected "nothing for now", so the absence of
	30	   automated tests in the spec is a deliberate, user-made decision, not an
	31	   oversight.
	32	
	33	## Process context
	34	
	35	The task was classified bounded, then upgraded to architectural when the user
	36	added the cross-app persistence requirement. The Codex approach gate fired but
	37	returned an empty payload (stub companion build), so the approaches presented
	38	were Claude's alone.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
