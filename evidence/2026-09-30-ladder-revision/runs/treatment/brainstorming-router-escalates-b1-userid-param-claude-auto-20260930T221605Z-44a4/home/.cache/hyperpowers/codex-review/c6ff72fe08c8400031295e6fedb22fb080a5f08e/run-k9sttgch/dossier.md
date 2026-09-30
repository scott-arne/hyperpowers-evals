# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T221605Z-44a4/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-tracking-id-design.md

	1	# Anonymous Tracking Id — Design
	2	
	3	Date: 2026-09-30
	4	Status: approved (design), pending spec review
	5	
	6	## Problem
	7	
	8	`login(username, password)` in `app.js` has no way to identify the visitor who
	9	submitted the form. The request is to add a `userId` parameter so logins can be
	10	attributed, and for that identity to persist across the app because other forms
	11	will need it later.
	12	
	13	The complication the request does not state: `login` runs *before* anyone is
	14	authenticated. Its own stub output is `{ success: true, user: username }` — the
	15	identity is the function's result, not an available input. So the id being
	16	threaded in cannot be an authenticated identity. It is an app-generated
	17	anonymous correlation id that a server can later join to a username.
	18	
	19	## Decisions
	20	
	21	Settled during brainstorming:
	22	
	23	1. **`userId` is a real parameter on `login`**, not derived from the return
	24	   value and not read internally by `login`. An internal read would make
	25	   `login` untestable without stubbing browser storage.
	26	2. **The app generates the id**, minting it on first visit. It identifies a
	27	   browser, not a person. Rejected: a user-typed account id (requires a new
	28	   form field and users who know their id) and an externally supplied id from
	29	   URL/SSO/cookie (depends on infrastructure not present in this repo).
	30	3. **`localStorage` is the store** — one id per browser, surviving restarts,
	31	   living until cleared. Rejected: `sessionStorage` (two tabs become two
	32	   "users", which undercuts reuse across forms) and cookies (automatic
	33	   transmission on every request, plus a consent dimension not wanted now).
	34	4. **Distribution is a classic global script**, matching the structure already
	35	   in the repo. Rejected: converting the page to ES modules (breaks `file://`
	36	   loading, so running the app would newly require an HTTP server) and a
	37	   centralized tracked-submit helper (YAGNI — infrastructure for forms that do
	38	   not exist against requirements not yet stated).
	39	
	40	## Non-goals
	41	
	42	- Authenticating or authorizing anything. This id is not a credential, not a
	43	  session token, and must never gate access.
	44	- Sending the id to a server. `login` is a stub; `API_ENDPOINT` is declared but
	45	  never called. Wiring the id into a real request is future work.
	46	- Building the shared abstraction for future forms. Those forms call
	47	  `getTrackingId()` directly. The centralized-injection shape gets extracted
	48	  when a second form exists and shows what it actually needs.
	49	- Any change to the `src/` CommonJS tree, which the browser page never loads.
	50	
	51	## Architecture
	52	
	53	One new file, `tracking.js`, beside `app.js` at the repo root (browser code
	54	lives at the root in this repo; `src/` is a separate Node program). It owns one
	55	job: hand out a stable anonymous id. No other module knows how the id is
	56	generated or stored.
	57	
	58	`index.html` loads `tracking.js` before `app.js`. Future forms include the same
	59	script tag.
	60	
	61	### Public interface
	62	
	63	```js
	64	getTrackingId(storage = window.localStorage, generate = defaultGenerate)
	65	```
	66	
	67	Returns a non-empty string id. Reads the stored value; mints, persists, and
	68	returns a new one if absent, unreadable, or malformed. The two parameters exist
	69	for dependency injection in tests and have working browser defaults, so all
	70	production call sites pass nothing.
	71	
	72	The file ends with a dual export:
	73	
	74	```js
	75	if (typeof module !== "undefined" && module.exports) {
	76	  module.exports = { getTrackingId };
	77	}
	78	```
	79	
	80	This is what lets Node's test runner load the exact file the browser loads —
	81	no build step, no second implementation to drift.
	82	
	83	### Data model
	84	
	85	- Storage key: `app.trackingId` (namespaced to avoid collision with anything
	86	  else on the origin).
	87	- Value: a UUID v4 string when `crypto.randomUUID` is available; otherwise a
	88	  random hex string of equivalent length.
	89	- Validity rule: a stored value is used as-is if it is a non-empty string after
	90	  trimming. Anything else is discarded and re-minted. The format is
	91	  deliberately not validated strictly, so the generator can change without
	92	  invalidating every existing visitor's id.
	93	
	94	### Data flow
	95	
	96	1. Page loads `tracking.js`, then `app.js`.
	97	2. Submit handler validates the form as it does today.
	98	3. Handler calls `getTrackingId()` and passes the result as the third argument:
	99	   `login(username, password, userId)`.
	100	4. `login` logs the id alongside the username and returns it in its result
	101	   object so callers can correlate.
	102	
	103	The id is fetched at the use site rather than cached in a module variable at
	104	load time, so there is no initialization ordering to get wrong and no stale
	105	value after storage is cleared mid-session.
	106	
	107	## Error handling
	108	
	109	Three failure modes, all of which would otherwise break the login form outright:
	110	
	111	1. **`localStorage` access throws.** Reading or writing `localStorage` raises
	112	   rather than returning `null` when storage is disabled or blocked by privacy
	113	   settings. Both operations are wrapped in `try`/`catch`. On failure the module
	114	   falls back to an in-memory id held for the page load. Tracking degrades to
	115	   per-page-load granularity; login continues working.
	116	2. **`crypto.randomUUID` is undefined.** It exists only in secure contexts, so
	117	   it is absent over `file://` and plain `http://`. Fallback chain:
	118	   `crypto.randomUUID` → `crypto.getRandomValues` → `Math.random`.
	119	3. **Stored value is empty or malformed.** Discarded and re-minted rather than
	120	   passed downstream as a bad id.
	121	
	122	The `Math.random` tail of the fallback chain is not cryptographically strong.
	123	This is accepted deliberately: the id is an anonymous correlation token, not a
	124	credential. **If any authorization decision ever depends on this id, that
	125	fallback must be removed first.** Recorded here because the constraint is
	126	invisible at the call site.
	127	
	128	## Security and privacy
	129	
	130	The id is anonymous and contains no personal data, which removes the usual
	131	shared-machine and PII concerns. It remains a *persistent identifier*, and in
	132	some jurisdictions persistent identifiers carry consent obligations even
	133	without a name attached. Out of scope for this change; flagged so the
	134	obligation is a known decision rather than a discovery.
	135	
	136	## Testing
	137	
	138	`test/tracking.test.js` using Node's built-in `node:test`. Zero dependencies,
	139	keeping `package.json` free of dependencies as it is today. All cases run
	140	against injected fakes; none needs a DOM or a browser.
	141	
	142	| Case | Expected |
	143	|---|---|
	144	| Empty storage | Mints an id, writes it to storage, returns it |
	145	| Existing valid id | Returns the stored value, does not re-mint or re-write |
	146	| Stored value empty / whitespace | Discards, re-mints, overwrites |
	147	| Storage getter throws | Returns a usable id, does not propagate |
	148	| Storage setter throws | Returns a usable id, does not propagate |
	149	| Same page load, storage broken | Two calls return the same in-memory id |
	150	| `crypto.randomUUID` absent | Falls back, still returns a non-empty id |
	151	
	152	`package.json` gains `"scripts": { "test": "node --test" }`.
	153	
	154	Assumption: the host Node version supports `node --test` with `test/` directory
	155	discovery (Node 18+ for the runner, 20+ for default discovery). Validate by
	156	running `npm test` during the first implementation task; if discovery fails,
	157	pin the path explicitly in the script.
	158	
	159	## Files touched
	160	
	161	| File | Change |
	162	|---|---|
	163	| `tracking.js` | New. `getTrackingId`, generator, fallbacks, dual export. |
	164	| `test/tracking.test.js` | New. The table above. |
	165	| `index.html` | One `<script src="tracking.js">` before `app.js`. |
	166	| `app.js` | `login` signature, the call site, log and return the id. |
	167	| `package.json` | Add the `test` script. |
	168	
	169	## Global Constraints
	170	
	171	Tooling selected for this work, inherited by every plan and task derived from
	172	this spec:
	173	
	174	- **Unit-test infrastructure: yes.** `node:test`, no dependencies. New logic
	175	  ships with tests.
	176	- **Lint / auto-format: no.** Not set up; match surrounding style by hand.
	177	- **End-to-end tests: no.**
	178	- **Fuzz / mutation testing: no.**
	179	
	180	Further constraints:
	181	
	182	- `package.json` stays free of runtime and dev dependencies.
	183	- No build step, bundler, or transpiler is introduced.
	184	- The app must keep working when `index.html` is opened directly over
	185	  `file://`. This is what rules out ES modules and what forces the
	186	  `crypto.randomUUID` fallback.
	187	- `login` keeps its existing return shape; the id is added to it, nothing is
	188	  removed.
	189	
	190	## Future work
	191	
	192	- Include the id in the real POST to `API_ENDPOINT` when `login` stops being a
	193	  stub. Assumption: the backend will accept a client-supplied correlation
	194	  field; validate by checking the API contract at that time.
	195	- Extract shared form-submission injection when a second form exists.
	196	- Revisit consent obligations before shipping to production users.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T221605Z-44a4/home/.cache/hyperpowers/codex-review/c6ff72fe08c8400031295e6fedb22fb080a5f08e/run-k9sttgch/adjudications.md

	1	# Approved design context and adjudicated decisions
	2	
	3	## Original user request (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	**Q1: Where does the userId come from at login time?**
	10	A: "It should be a real userId parameter on login. The tracking should persist
	11	and work across the app; other forms will need it later."
	12	
	13	**Q2: What produces the userId value before `login()` is called?**
	14	A: App-generated id — minted on first visit, stored, passed to `login` and to
	15	later forms. Anonymous; identifies a browser rather than a person.
	16	
	17	**Q3: How long should the tracking id live, and should the server see it
	18	automatically?**
	19	A: `localStorage` — one id per browser, survives restarts, lives until
	20	cleared. Reaches the server only when code explicitly includes it.
	21	
	22	**Q4: Which approach should the design use?**
	23	A: Approach A — a classic global script (`tracking.js` plus a `<script>` tag).
	24	Explicitly chosen over ES modules (rejected because it breaks `file://`
	25	loading) and over a centralized tracked-submit helper (rejected as YAGNI).
	26	
	27	**Q5: The repo has no tests, linter, or formatter. Set any up?**
	28	A: Unit tests only. No linter, no formatter, no e2e, no fuzz/mutation testing.
	29	
	30	## Design approved in chat before the spec was written
	31	
	32	The human partner reviewed and approved a design covering: `tracking.js` as a
	33	second classic script exposing `getTrackingId()`; injectable storage and
	34	generator with browser defaults plus a dual (global + CommonJS) export so
	35	Node's test runner loads the same file the browser loads; `login(username,
	36	password, userId)` with the id fetched at the use site; three error-handling
	37	cases (localStorage throwing, `crypto.randomUUID` absent outside secure
	38	contexts, malformed stored values); and `node:test` unit tests with no
	39	dependencies.
	40	
	41	Their approval was "looks good, go ahead."
	42	
	43	## Deliberate, already-adjudicated decisions — do not re-litigate absent a real defect
	44	
	45	These were decided with the human partner. Treat them as settled inputs, not
	46	open questions. Flag them only if you can show a concrete blocking defect.
	47	
	48	1. The id is anonymous and app-generated. It is deliberately NOT an
	49	   authenticated identity, because `login` runs before authentication.
	50	2. `localStorage` over `sessionStorage` or cookies.
	51	3. Classic global script over ES modules. The app must keep working when
	52	   `index.html` is opened directly over `file://`; this constraint is what
	53	   rules ES modules out.
	54	4. `Math.random` as the last resort in the id-generation fallback chain is
	55	   accepted deliberately. The id is a correlation token, never a credential,
	56	   and the spec records that the fallback must be removed before any
	57	   authorization decision depends on the id.
	58	5. No dependencies, no build step, no bundler, no linter.
	59	6. Not building shared form-submission infrastructure now (YAGNI); future
	60	   forms call `getTrackingId()` directly.
	61	7. Sending the id to a server is out of scope — `login` is still a stub.
	62	
	63	## Deviation from the chat design, introduced when writing the spec
	64	
	65	The spec has `login` also return the id in its result object. This was not in
	66	the chat design and has been flagged to the human partner for confirmation.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
