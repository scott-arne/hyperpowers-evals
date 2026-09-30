# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T225511Z-919d/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-user-identity-design.md

	1	# Persisted User Identity — Design
	2	
	3	Date: 2026-09-30
	4	Status: awaiting review
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The request was "add a `userId` parameter to the login function so we can
	10	track who logged in." The repository has no user identifier anywhere: the
	11	form collects `username` and `password`, and `login()` returns a canned
	12	`{ success: true, user: username }`.
	13	
	14	Clarification established that the identifier must identify the actual user,
	15	be readable across the app, persist, and be consumed by forms that do not
	16	exist yet. That is an identity layer, not a parameter — which is why this
	17	design exists rather than a one-line edit.
	18	
	19	## Decisions
	20	
	21	| Decision | Choice | Rationale |
	22	|---|---|---|
	23	| Identifier origin | Server-issued | Only a server-issued ID attests that the user authenticated. |
	24	| Client-stored contents | Identifier only (`userId`, `displayName`) | The session credential stays in an httpOnly cookie, unreadable by JavaScript, so an XSS cannot exfiltrate it. |
	25	| Module delivery | Native ES modules | Gives a real shared module without adding a bundler to a repo with no build step. |
	26	| Lifetime | `localStorage` | Must outlive a tab so future forms can read it. Paired with an explicit `clear()`. |
	27	| Structure | Identity store injected into `login()` | Satisfies the literal request for a third parameter in the only form coherent with a server-issued ID, and makes `login` testable without a DOM. |
	28	| Network | Labeled stub | `API_ENDPOINT` does not exist; a real fetch would break the form in this repo. |
	29	| Tooling | Unit tests only | Selected by the human partner; no linter, formatter, or e2e in scope. |
	30	
	31	### The parameter tension
	32	
	33	A server-issued identifier cannot be an *input* to `login()` — the ID is not
	34	known until the server has authenticated the credentials. The third parameter
	35	is therefore the identity **store**, a collaborator that `login` writes the
	36	server's answer into. This satisfies the request's shape while being coherent
	37	with its chosen origin. This was surfaced explicitly and approved.
	38	
	39	## Architecture
	40	
	41	Three files change, three are added, and `src/` is untouched.
	42	
	43	```
	44	index.html      -> script type="module"
	45	app.js          -> DOM wiring only
	46	auth.mjs        (new) login, validateForm, parseLoginResponse, stub transport
	47	identity.mjs    (new) the only code that touches localStorage
	48	test/           (new) unit tests
	49	package.json    -> add scripts.test
	50	src/            UNCHANGED (unrelated Node CommonJS greet demo)
	51	```
	52	
	53	### `identity.mjs`
	54	
	55	Exports a factory so the storage backend is injectable, which is what makes it
	56	testable under Node where `localStorage` does not exist:
	57	
	58	```js
	59	createIdentityStore(storage = globalThis.localStorage)
	60	```
	61	
	62	The returned store exposes:
	63	
	64	- `get()` -> `{ userId, displayName } | null`
	65	- `set({ userId, displayName })` -> persists and returns the stored record
	66	- `clear()` -> removes the record; this is what logout calls
	67	
	68	Rules:
	69	
	70	- One storage key, defined once in this module.
	71	- A stored value that is absent, unparseable, or missing a string `userId` is
	72	  treated as "no identity" rather than throwing. Hand-edited or truncated
	73	  storage must not break the app.
	74	- Storage failures (private mode, quota, disabled storage) are caught and the
	75	  store falls back to an in-memory record for the page's lifetime. Broken
	76	  storage degrades tracking; it never blocks login.
	77	- No DOM access, no network access. Swapping to `sessionStorage`, or adding
	78	  change notification later, is a change confined to this file.
	79	
	80	### `auth.mjs`
	81	
	82	Holds the logic currently inline in `app.js`, so it can be tested without a
	83	browser:
	84	
	85	- `validateForm(formData)` — moved unchanged.
	86	- `parseLoginResponse(body)` — the single place that knows the response shape.
	87	- `login(username, password, identity)` — `async`. Calls the transport,
	88	  parses the response, and on success calls `identity.set(...)` before
	89	  returning the result.
	90	
	91	### `app.js`
	92	
	93	Reduced to DOM wiring: read the fields, call `validateForm`, `await
	94	login(username, password, identity)` with the imported store, report the
	95	result. It does not touch `localStorage` and does not reach for a global.
	96	
	97	### `index.html`
	98	
	99	`<script src="app.js">` becomes `<script type="module" src="app.js">`.
	100	
	101	**Consequence:** the page stops working when opened as a `file://` URL, because
	102	module fetches fail CORS on that scheme. It must be served over http (for
	103	example `python3 -m http.server`). This is a real change to how the app is run
	104	today and is the accepted cost of the chosen module system.
	105	
	106	## Data flow
	107	
	108	1. Submit handler reads `username` and `password`.
	109	2. `validateForm` runs; on failure the handler reports and stops.
	110	3. `await login(username, password, identity)`.
	111	4. `login` calls the transport. `login` is written against the transport
	112	   seam, not against `fetch` — the stub occupies that seam today (see "Stub
	113	   transport"), and the real implementation will POST to `API_ENDPOINT` with
	114	   `credentials: "include"` so the backend's httpOnly session cookie is set
	115	   on the response and sent on later requests.
	116	5. `parseLoginResponse` extracts `userId` and `displayName`.
	117	6. On success `login` calls `identity.set(...)` and returns the result.
	118	7. Any later code calls `identity.get()` and sees the same record, in any tab,
	119	   after a restart.
	120	
	121	### Stub transport
	122	
	123	`API_ENDPOINT` (`https://api.example.com/login`) does not exist. The transport
	124	is therefore a single clearly-labeled function that returns a simulated
	125	server response containing a generated `userId`. It is marked as a stub in
	126	its own comment and is the only thing that must be replaced when a real
	127	backend appears — `parseLoginResponse` and everything downstream stay as they
	128	are.
	129	
	130	## Assumption to validate
	131	
	132	`Assumption: the login endpoint responds 200 with a JSON body containing a
	133	stable, server-generated userId and optionally a displayName, and sets an
	134	httpOnly session cookie — validate via the real endpoint's response before
	135	this ships.`
	136	
	137	`parseLoginResponse` is the sole reader of that shape, so a wrong guess is a
	138	one-function correction.
	139	
	140	## Error handling
	141	
	142	| Case | Behavior |
	143	|---|---|
	144	| Network failure or non-2xx | `login` returns a failure result; handler reports it; identity is not written. |
	145	| 200 with missing or non-string `userId` | Treated as failure. No partial write — half an identity is worse than none. |
	146	| Failed login while an identity is already stored | Existing identity is left untouched. A second person's failed attempt must not evict the first person's session. |
	147	| `localStorage` unavailable | `identity.set` catches and falls back to in-memory for the page's lifetime; login still succeeds. |
	148	
	149	## Testing
	150	
	151	Runner: Node's built-in `node --test`, added as `scripts.test` in
	152	`package.json`. Zero dependencies, which matches a repo that currently has
	153	none.
	154	
	155	Module format note: `package.json` has no `"type": "module"`, and `src/`
	156	uses CommonJS `require`. New modules therefore use the `.mjs` extension so
	157	Node loads them as ES modules without converting the unrelated `src/` files.
	158	The browser selects module semantics from the `type="module"` attribute, not
	159	the extension, so this costs nothing on the browser side.
	160	
	161	Coverage:
	162	
	163	- `identity.mjs`: store/read round-trip; absent record returns `null`;
	164	  malformed JSON returns `null`; record missing `userId` returns `null`;
	165	  `clear()` removes; storage that throws falls back to in-memory.
	166	- `auth.mjs`: `login` persists the server-issued `userId` into the injected
	167	  store on success; `login` does not write on transport failure; `login` does
	168	  not write on a malformed response; an existing identity survives a failed
	169	  login; `validateForm` keeps its current behavior.
	170	
	171	Tests inject a fake storage object and a fake transport, so no DOM and no
	172	network are required.
	173	
	174	## Out of scope
	175	
	176	- Logout UI. `identity.clear()` is provided; no button is added.
	177	- Change notification and cross-tab sync (the event-driven variant). The
	178	  store's interface is unchanged if this is added later.
	179	- Linting, formatting, and end-to-end tests.
	180	- `src/index.js` and `src/utils.js`, and the fact that `package.json` names
	181	  `src/index.js` as `main` while the browser app lives at the root. Noted, not
	182	  reconciled here.
	183	- Any real backend work.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T225511Z-919d/home/.cache/hyperpowers/codex-review/a56e32f9d2ab7b34a6cec1a6cdea125cd8222c97/run-BtQUdQsZ/approved-decisions.md

	1	# Approved design context
	2	
	3	## Original user request (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Escalation
	8	
	9	The request was initially classified as a bounded change. The human partner's
	10	answer to the first clarifying question — "It should identify the actual user,
	11	work across the app, and persist. Other forms will need it later." — named
	12	structure the repository does not have (a persisted identity layer shared
	13	across components that do not exist yet), so the task was upgraded to the
	14	architectural path. The upgrade was announced and accepted.
	15	
	16	## Decisions approved by the human partner
	17	
	18	1. **Identifier origin: server-issued.** The login response carries the account
	19	   ID; the client stores what it was given. The backend does not exist yet and
	20	   the response shape is an assumption to validate.
	21	2. **Client-stored contents: identifier only.** `userId` and optionally
	22	   `displayName`. The session credential is an httpOnly cookie owned by the
	23	   backend, never in JavaScript-readable storage.
	24	3. **Module delivery: native ES modules.** `<script type="module">`, no
	25	   bundler, no build step. The accepted cost is that `index.html` no longer
	26	   works over `file://`.
	27	4. **Lifetime: `localStorage`.** Survives restarts, shared across tabs, with an
	28	   explicit `clear()` for logout.
	29	5. **Structure: approach A — identity store injected as `login`'s third
	30	   parameter.** Chosen over (B) singleton import returning the id and (C) an
	31	   event-driven store with cross-tab subscriptions. C's subscription mechanism
	32	   was deliberately deferred.
	33	6. **Network: labeled stub.** `API_ENDPOINT` does not exist; a real fetch would
	34	   break the form in this repo. The stub sits behind a single seam.
	35	7. **Tooling: unit tests only.** Lint/format and end-to-end tests were offered
	36	   and not selected.
	37	
	38	## Surfaced tension, accepted
	39	
	40	A server-issued identifier cannot be an *input* to `login()`, because the ID is
	41	unknown until the server authenticates. The third parameter is therefore the
	42	identity store (a collaborator), not the user's ID. This was stated plainly to
	43	the human partner before approach selection and approach A was chosen with that
	44	understanding.
	45	
	46	## Section 1 approval
	47	
	48	The architecture section (module boundaries, `src/` left untouched, the
	49	`file://` consequence) was presented and approved with "looks good, go ahead".
	50	
	51	## Notes for the reviewer
	52	
	53	- The Codex approach gate ran earlier in this session and returned an empty
	54	  result, so no independent Codex approaches informed the design.
	55	- `src/index.js` and `src/utils.js` are an unrelated Node CommonJS demo and are
	56	  explicitly out of scope.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
