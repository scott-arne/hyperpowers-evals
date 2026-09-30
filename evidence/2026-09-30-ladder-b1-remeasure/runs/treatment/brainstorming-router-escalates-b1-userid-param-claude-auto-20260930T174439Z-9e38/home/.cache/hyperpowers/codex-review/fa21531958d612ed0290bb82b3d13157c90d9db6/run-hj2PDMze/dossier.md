# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T174439Z-9e38/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-user-session-store-design.md

	1	# User Session Store — Design
	2	
	3	Date: 2026-09-30
	4	Status: awaiting review
	5	
	6	## Problem
	7	
	8	The request was "add a `userId` parameter to the login function so we can
	9	track who logged in." Clarification changed the shape of the work: the id is
	10	produced by the server, not supplied by the caller, and it has to persist,
	11	be reachable across the app, and be available to forms that do not exist yet.
	12	
	13	The current code cannot support that. `login(username, password)` in `app.js`
	14	is a stub that returns `{ success: true, user: username }` and never contacts
	15	`API_ENDPOINT`. The login form collects only a username and a password, so no
	16	caller has a user id to pass. There is no browser-side module system, no
	17	build step, and nothing that survives a page load.
	18	
	19	A `userId` **parameter** is therefore the one shape that cannot work: the
	20	single call site at `app.js:23` has no value to give it, so the parameter
	21	would be dead on arrival. The id must come out of `login` and be stored.
	22	
	23	## Decisions
	24	
	25	These were settled with the requester during brainstorming.
	26	
	27	| Question | Decision |
	28	|---|---|
	29	| Where the id comes from | The server returns it |
	30	| What it is used for | Display and tracking only; non-secret |
	31	| App structure | Undecided; design for the multi-page superset |
	32	| Storage lifetime | `sessionStorage` — cleared when the tab closes |
	33	| Storage location | Behind a module interface, not accessed directly |
	34	| Tooling to add | None; no linter, formatter, or test runner |
	35	
	36	The id is explicitly **not** a credential. The server re-derives real identity
	37	from its own session and must never trust a client-supplied `userId`. Browser
	38	storage is user-editable, so any design in which later forms submit this value
	39	as proof of identity is out of scope and would be a server-side change.
	40	
	41	## Global Constraints
	42	
	43	- No linter, formatter, or test runner is added. The repository has none
	44	  today and the requester chose to keep it bare. Consequence: verification
	45	  is manual, and the storage-fallback branch ships reasoned-about but
	46	  unexercised.
	47	- No build step and no ES module syntax on the browser side. `app.js` is
	48	  loaded by a plain `<script>` tag and everything in it is a global; the new
	49	  code matches that pattern.
	50	- `src/index.js` and `src/utils.js` are an unrelated CommonJS Node entry
	51	  point and are not touched.
	52	- The design is scoped to making the id available. It adds no UI that
	53	  displays the id and no logout control.
	54	
	55	## Architecture
	56	
	57	One new file, `session.js`, loaded before `app.js` on every page that needs
	58	the id. It defines exactly one global, `Session`.
	59	
	60	Storage is reached only through that module. Nothing else in the codebase
	61	calls `sessionStorage` directly, so changing the backing store later — to
	62	`localStorage`, or to a server round trip — is a change inside one file and
	63	does not touch consumers.
	64	
	65	`login` keeps its signature, `login(username, password)`. Its return value
	66	gains the id: `{ success: true, user: username, userId }`.
	67	
	68	### Interface
	69	
	70	```javascript
	71	Session.set(userId)  // stores the id; ignores null/undefined
	72	Session.get()        // returns the id, or null if nothing is stored
	73	Session.clear()      // removes it
	74	```
	75	
	76	`clear()` ships unused — there is no logout UI — but is part of the interface
	77	from the start, because adding it later means revisiting every consumer.
	78	
	79	### Data flow
	80	
	81	1. The user submits the login form.
	82	2. `validateForm` runs unchanged.
	83	3. `login` returns `{ success, user, userId }`.
	84	4. On `success === true`, the submit handler calls `Session.set(result.userId)`.
	85	5. Any later page loads `session.js` and reads the id with `Session.get()`.
	86	
	87	## Error handling
	88	
	89	`sessionStorage` is not always available. Access to the property itself can
	90	throw in sandboxed iframes, and writes can throw on quota or when storage is
	91	disabled by the user.
	92	
	93	The module wraps feature detection and every read and write in `try`/`catch`
	94	and falls back to a module-level in-memory variable. In fallback mode
	95	`Session.get()` returns that in-memory value, or `null` if nothing was set;
	96	it never throws. The practical difference is that a fallback-mode id does not
	97	survive a page load. Consumers do not need to know which mode is active.
	98	
	99	Two narrower cases:
	100	
	101	- `Session.set` ignores `null` and `undefined` rather than writing the string
	102	  `"undefined"`, which is the standard `sessionStorage` failure mode.
	103	- The submit handler stores the id only when `result.success` is true. The
	104	  existing unconditional `console.log` of the result is left as it is.
	105	
	106	## Files changed
	107	
	108	| File | Change |
	109	|---|---|
	110	| `session.js` | New, roughly 30 lines: the `Session` global, three functions, storage fallback |
	111	| `app.js` | `login` returns `userId`; submit handler stores it on success. Signature unchanged; `validateForm` untouched |
	112	| `index.html` | One `<script src="session.js">` tag before the existing `app.js` tag |
	113	
	114	Load order is a correctness requirement, not a preference: `Session` must be
	115	defined before `app.js` executes.
	116	
	117	## Verification
	118	
	119	Manual, in a browser, since the repository has no test runner:
	120	
	121	1. Open `index.html`, submit the form. The console shows the login result
	122	   including the id.
	123	2. `Session.get()` in the console returns that id.
	124	3. Reload the page. `Session.get()` still returns it — this demonstrates the
	125	   persistence requirement.
	126	4. `Session.clear()`, then `Session.get()` returns `null`.
	127	
	128	Not covered: the storage-fallback branch, which is impractical to trigger by
	129	hand. This gap is a direct consequence of the decision to add no test
	130	infrastructure.
	131	
	132	## Known limitation
	133	
	134	Until `login` performs a real request to `API_ENDPOINT`, it returns a clearly
	135	marked placeholder id. Every session therefore stores the same fake value, so
	136	the feature does not yet distinguish users. The plumbing is correct and the
	137	swap is a one-line change inside `login`, but "track who logged in" is not
	138	truly delivered until the real API call exists. Wiring up that `fetch`,
	139	including its failure handling, is deliberately out of scope here and was
	140	offered to the requester as a separate, larger change.
	141	
	142	## Assumptions
	143	
	144	- Assumption: the app will grow into multiple HTML documents rather than a
	145	  single page; validate via the requester confirming the structure once it is
	146	  decided. The multi-page design is the superset and works either way, so
	147	  being wrong costs nothing.
	148	- Assumption: the eventual server response exposes the id under a `userId`
	149	  field; validate via the real API response shape when `login` stops being a
	150	  stub. Only the one line inside `login` depends on this.
	151	
	152	## Out of scope
	153	
	154	- Any change that makes the server trust a client-supplied identity.
	155	- Storing a session token or any credential in the browser.
	156	- A logout control, or UI that displays the id.
	157	- Converting the browser code to ES modules or adding a bundler.
	158	- Changes to `src/index.js` or `src/utils.js`.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T174439Z-9e38/home/.cache/hyperpowers/codex-review/fa21531958d612ed0290bb82b3d13157c90d9db6/run-hj2PDMze/adjudications.md

	1	# Approved design context (brainstorming adjudications)
	2	
	3	## Original request (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Clarifying questions and the requester's answers
	8	
	9	1. **Where does the userId come from?** — "The server returns it. Yes, it
	10	   should persist, work across the app, and other forms will need it later."
	11	2. **Does "across the app" mean separate HTML pages or views in one page?** —
	12	   Not decided yet. Controller designs for the multi-page superset.
	13	3. **What is the stored userId used for?** — Display and tracking only.
	14	   Non-secret. The server re-derives real identity from its own session.
	15	4. **Which approach?** — Approach A: a global `session.js` module exposing
	16	   `Session.set/get/clear` over browser storage. No build step; matches the
	17	   existing script-tag style. (Rejected: B, ES modules with an injected
	18	   storage adapter — converts `app.js` to `type="module"` and removes the
	19	   globals the page relies on. C, no client store, re-read from a `/me`
	20	   endpoint — cleanest but requires a server endpoint that does not exist and
	21	   a real login network call.)
	22	5. **Storage lifetime?** — `sessionStorage`, cleared when the tab closes.
	23	6. **Add linter / formatter / test runner?** — Neither; keep the repo bare.
	24	   The requester was told explicitly that this means the session module ships
	25	   with manual verification only and the storage-fallback branch unexercised.
	26	
	27	## Design sections the requester approved
	28	
	29	- **Section 1 (architecture, data flow, interface)** — approved. `login`
	30	  keeps its `(username, password)` signature and instead returns
	31	  `{ success, user, userId }`; `session.js` loads before `app.js`; the three
	32	  functions are `set`/`get`/`clear`; no logout UI, no id display, no changes
	33	  to `src/`.
	34	- **Section 2 (error handling, files, verification)** — approved. try/catch
	35	  around storage with an in-memory fallback; `set` ignores null/undefined;
	36	  the handler stores only on `success === true`; three files touched; manual
	37	  browser verification.
	38	
	39	## Standing decisions that bound the spec
	40	
	41	- A `userId` **parameter** on `login` was rejected on the evidence that the
	42	  sole call site (`app.js:23`) has no value to supply.
	43	- Any design in which the server trusts a client-supplied `userId` is out of
	44	  scope and was declined as a broken auth model.
	45	- Wiring the real `fetch` to `API_ENDPOINT` was offered and deferred as a
	46	  separate, larger change.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
