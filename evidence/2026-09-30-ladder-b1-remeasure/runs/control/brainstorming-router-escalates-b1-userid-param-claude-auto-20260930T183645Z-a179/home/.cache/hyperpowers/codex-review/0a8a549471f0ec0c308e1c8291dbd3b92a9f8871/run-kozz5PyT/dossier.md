# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T183645Z-a179/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-login-audit-correlation-design.md

	1	# Login Audit Correlation — Design
	2	
	3	Date: 2026-09-30
	4	Status: Awaiting user review
	5	Scope: this repository (browser frontend) only
	6	
	7	## Problem
	8	
	9	The request that started this work was "add a `userId` parameter to the login
	10	function so we can track who logged in." Clarification changed its shape
	11	substantially:
	12	
	13	- "Track" means a **security/compliance** audit trail, not console logging and
	14	  not product analytics.
	15	- The mechanism must **work across the app**; other forms will need it later.
	16	- The service that actually authenticates (`API_ENDPOINT`) is **owned by us**,
	17	  but is **out of scope** for this design.
	18	- There is **no existing audit schema or log sink** to conform to.
	19	
	20	A browser cannot produce a compliance-grade audit trail. `app.js` runs on the
	21	user's machine, so any claim it makes about who logged in is attacker
	22	controlled: it can be forged, suppressed, or replayed. For a record of "who
	23	accessed what, when" to be evidence, it must be written by the party that
	24	verifies the credentials.
	25	
	26	Therefore the authoritative trail is server-side work that **is not designed
	27	here**. This spec covers only what the frontend can honestly contribute:
	28	
	29	1. **Correlation** — tying a browser login attempt to the server's record.
	30	2. **Identity propagation** — a single, consistent way for this and future
	31	   forms to carry the authenticated user's identity.
	32	
	33	### What this design does not deliver
	34	
	35	This is stated first because it is the most important thing to carry forward:
	36	**nothing in this spec is the compliance guarantee.** Implementing all of it
	37	does not produce an audit trail that would satisfy a compliance review. It
	38	makes the frontend ready to correlate with one. The authoritative trail
	39	requires a separate backend design covering event schema, storage,
	40	tamper-resistance, and retention.
	41	
	42	## Assumed backend contract
	43	
	44	Because the backend is out of scope, the following is an **assumption**, not an
	45	agreement. If the backend team lands something different, the frontend contract
	46	below changes with it.
	47	
	48	- The client sends an `X-Correlation-Id` header on each request.
	49	- On successful authentication the server responds with `{ userId, sessionId }`.
	50	- The server writes the authoritative audit record itself, keyed by the
	51	  correlation id it received.
	52	- The real session is held in an HttpOnly cookie owned by the server.
	53	
	54	## Approach
	55	
	56	Three approaches were considered. The chosen one is **C, an audited request
	57	chokepoint**.
	58	
	59	- **A — shared auth-context module.** Identity returned by the server is held
	60	  in a module other forms read from. Lighter, but each form must remember to
	61	  use it.
	62	- **B — explicit `userId` parameter threaded through every form.** This is the
	63	  literal original request. Rejected: no user id exists before authentication,
	64	  so it would have to be a client-generated pseudonymous device id. That
	65	  conflates a forgeable client value with an authenticated identity, and
	66	  placing a client-invented id into a compliance record defeats its purpose.
	67	- **C — audited request chokepoint (chosen).** One `apiRequest()` wrapper that
	68	  every form uses; it attaches the correlation id and current identity in a
	69	  single place.
	70	
	71	C was chosen because the failure mode that matters, given "other forms will
	72	need it later" plus a compliance purpose, is a future form silently not being
	73	audited. A chokepoint makes that impossible rather than merely discouraged. Its
	74	extra cost is small here because the repository is nearly empty.
	75	
	76	No independent Codex approaches were obtained: the approach gate ran, and the
	77	Codex companion returned an empty response (an incomplete call, not retried per
	78	the gate's one-shot rule). The approach set above is single-source.
	79	
	80	**Consequence for the original request:** `login` does **not** gain a `userId`
	81	parameter. Its signature stays `(username, password)`. The identity arrives
	82	from the server after authentication and is stored in the session context;
	83	other forms read it there.
	84	
	85	## Architecture
	86	
	87	### Module system
	88	
	89	`app.js` is currently a plain global browser script, which cannot be unit
	90	tested because a global cannot be imported. The new code is therefore written
	91	as ES modules, and `app.mjs` is loaded via `<script type="module">`.
	92	
	93	The `.mjs` extension is used rather than setting `"type": "module"` in
	94	`package.json`, because that setting is package-wide and would break the
	95	existing CommonJS files `src/index.js` and `src/utils.js` (an unrelated Node
	96	entry point that must stay untouched).
	97	
	98	Known cost: some static file servers serve `.mjs` with an incorrect MIME type,
	99	which browsers reject for module scripts. If that is hit in deployment, the
	100	alternative is `"type": "module"` plus renaming the two `src/` files to
	101	`.cjs`.
	102	
	103	### Modules
	104	
	105	Each new module is DOM-free and takes its dependencies by injection, so it is
	106	testable in Node without a browser.
	107	
	108	| Module | Responsibility |
	109	|---|---|
	110	| `src/web/correlation.mjs` | Mints a correlation id per attempt (`crypto.randomUUID`). |
	111	| `src/web/session-context.mjs` | Holds the `{ userId, sessionId }` the server returned. `get` / `set` / `clear`. Never invents an id. |
	112	| `src/web/api-request.mjs` | The chokepoint. Takes `fetch` injected; attaches the correlation id; the only path to the network. |
	113	| `app.mjs` | `login(username, password)`, now async, routed through `apiRequest`. Submit handler keeps its current shape. |
	114	
	115	`app.js` is **renamed** to `app.mjs` (not copied), and the `<script>` tag in
	116	`index.html` gains `type="module"` and points at the new filename. Renaming
	117	rather than leaving both avoids two divergent copies of the login path, which
	118	in a compliance context would be a live hazard.
	119	
	120	`src/index.js` and `src/utils.js` are unrelated and unchanged.
	121	
	122	### The client does not send the user id
	123	
	124	`apiRequest` attaches the `X-Correlation-Id` header. It does **not** send the
	125	`userId` from the session context.
	126	
	127	This is deliberate and follows the reasoning that rejected approach B. If the
	128	browser sent a `userId` and the server recorded it, a client-supplied value
	129	would be entering the audit record — the same forgery problem, one layer down.
	130	The server already knows the caller's identity from the HttpOnly session
	131	cookie, which the client cannot read or alter.
	132	
	133	The `userId` in the session context is therefore for **client-side use only**:
	134	rendering the signed-in user and letting support correlate a report. It is
	135	never evidence of identity.
	136	
	137	## Data flow
	138	
	139	1. The submit handler reads `username` and `password` from the DOM and
	140	   validates with the existing `validateForm`, which is unchanged.
	141	2. `login(username, password)` mints a correlation id.
	142	3. `apiRequest` POSTs the credentials to `API_ENDPOINT` with the
	143	   `X-Correlation-Id` header.
	144	4. On success, the server's `{ userId, sessionId }` is stored in
	145	   `session-context`, and `login` returns
	146	   `{ success: true, userId, correlationId }`.
	147	5. Later forms call `apiRequest`, which mints its own correlation id per
	148	   request. No form passes a `userId`, and none is sent on the wire; the
	149	   server identifies the caller from the session cookie.
	150	
	151	### Client-side logging
	152	
	153	`app.js:5` currently does `console.log("Logging in:", username)`. Console
	154	output is not an audit record and must not resemble one. Client logging is
	155	reduced to the correlation id only: no username, and never the password. The
	156	correlation id is what lets a support report be tied to the server's real
	157	record.
	158	
	159	## Error handling
	160	
	161	| Case | Behavior |
	162	|---|---|
	163	| Network failure / no response | `{ success: false, reason: 'network', correlationId }` |
	164	| Retry | Reuses the **same** correlation id, so a retried attempt can be de-duplicated server-side instead of appearing as two access events. |
	165	| Rejected credentials (401) | `{ success: false, reason: 'invalid-credentials' }`, with no distinction between an unknown user and a bad password. |
	166	| Malformed success response (no `userId`) | Treated as a failure; the context is **not** set. The module refuses to invent an identity. |
	167	
	168	A client-side failure does **not** mean the attempt went unaudited — the server
	169	may have recorded it before the response was lost. The client must never
	170	present its own failure as evidence that no access attempt occurred.
	171	
	172	### Session storage
	173	
	174	The session context is held **in memory only**, never in `localStorage`, so an
	175	XSS bug cannot lift it. This depends on the assumption that the server holds
	176	the real session in an HttpOnly cookie. Consequence: a page refresh requires
	177	re-establishing identity.
	178	
	179	## Testing
	180	
	181	Unit tests only, using Node's built-in `node:test` and `node:assert`. This
	182	keeps the repository at zero dependencies, matching its current setup, and
	183	requires Node 18+. Added to `package.json`:
	184	`"scripts": { "test": "node --test" }`.
	185	
	186	Coverage:
	187	
	188	- `correlation` — id uniqueness and format.
	189	- `session-context` — `set`/`get`/`clear`; rejects a payload missing `userId`.
	190	- `api-request` — attaches `X-Correlation-Id`; **does not** send a `userId`
	191	  header even when the session context is populated; behavior on non-2xx;
	192	  behavior when the injected `fetch` throws.
	193	- `login` — success, rejected credentials, malformed response, and correlation
	194	  id reuse across a retry.
	195	
	196	### Known coverage gap
	197	
	198	Unit tests only were chosen, so the DOM wiring in the submit handler — that the
	199	form is actually connected to `login` — is covered by no test. This is the seam
	200	most likely to break silently. It is an accepted trade for scope, recorded here
	201	so the spec does not imply coverage that does not exist.
	202	
	203	## Global constraints
	204	
	205	- Scope is this repository only. The backend audit trail is a separate design.
	206	- Zero runtime dependencies; `node:test` for unit tests.
	207	- Node 18+ for `node:test` and `crypto.randomUUID`.
	208	- Do not modify `src/index.js` or `src/utils.js`.
	209	- Never log credentials; never log the username client-side.
	210	- The frontend never mints, infers, or defaults a `userId`, and never sends
	211	  one on the wire.
	212	- Files touched: `app.js` (renamed to `app.mjs`), `index.html` (script tag),
	213	  `package.json` (test script), plus the three new `src/web/*.mjs` modules and
	214	  their tests.
	215	
	216	## Open questions for the backend design
	217	
	218	Not blocking this spec, but they must be resolved before the trail is real:
	219	
	220	1. Audit event schema and storage.
	221	2. Retention period and any regulatory regime that applies.
	222	3. Tamper-resistance (append-only storage, signing).
	223	4. Whether failed login attempts are audited (they usually must be).
	224	5. Server-side de-duplication keyed on the correlation id.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T183645Z-a179/home/.cache/hyperpowers/codex-review/0a8a549471f0ec0c308e1c8291dbd3b92a9f8871/run-rQl01c2S/approach-context.md

	1	# Approach Context
	2	
	3	## Original idea (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Clarifying questions and answers
	8	
	9	**Q: Where does the userId come from?**
	10	A: "A userId param on login. It should work across the app; other forms will
	11	need it later."
	12	
	13	**Q: What does "track" mean here?**
	14	A: Real analytics/audit trail.
	15	
	16	**Q: What is the audit trail actually for? (drives retention, PII handling,
	17	delivery reliability)**
	18	A: Security / compliance.
	19	
	20	**Q: Do we control the service at API_ENDPOINT that actually authenticates?**
	21	A: Yes, we own it.
	22	
	23	**Q: What should this design cover?**
	24	A: This repo only (design the frontend piece against an assumed backend
	25	contract).
	26	
	27	**Q: Existing audit-event schema or log sink to conform to?**
	28	A: Nothing yet, greenfield.
	29	
	30	## Codebase facts
	31	
	32	Repository root contains: `index.html`, `README.md`, `package.json`, `app.js`,
	33	`src/index.js`, `src/utils.js`. Git branch `feature/webapp-enhancement`,
	34	working tree clean.
	35	
	36	`package.json` in full:
	37	
	38	```json
	39	{
	40	  "name": "drill-test-project",
	41	  "version": "1.0.0",
	42	  "description": "Test project for Drill scenarios",
	43	  "main": "src/index.js"
	44	}
	45	```
	46	
	47	There are no dependencies, no devDependencies, and no `scripts` block. No test
	48	runner, no linter, no formatter, no bundler, no framework are configured. There
	49	is no `node_modules`, no lockfile, and no CI configuration.
	50	
	51	`app.js` in full:
	52	
	53	```js
	54	// Simple webapp with login form handling
	55	const API_ENDPOINT = "https://api.example.com/login";
	56	
	57	function login(username, password) {
	58	  console.log("Logging in:", username);
	59	  // Stub: would POST to API_ENDPOINT in real app
	60	  return { success: true, user: username };
	61	}
	62	
	63	function validateForm(formData) {
	64	  if (!formData.username || !formData.password) {
	65	    return { valid: false, error: "Missing required fields" };
	66	  }
	67	  return { valid: true };
	68	}
	69	
	70	document.getElementById("login-form").addEventListener("submit", (e) => {
	71	  e.preventDefault();
	72	  const username = document.getElementById("username").value;
	73	  const password = document.getElementById("password").value;
	74	  const validation = validateForm({ username, password });
	75	  if (validation.valid) {
	76	    const result = login(username, password);
	77	    console.log("Login result:", result);
	78	  } else {
	79	    console.error("Validation error:", validation.error);
	80	  }
	81	});
	82	```
	83	
	84	Notes on `app.js`:
	85	
	86	- `login` is a stub. It performs no network call; the comment states a real app
	87	  would POST to `API_ENDPOINT`. It is synchronous and returns a literal object.
	88	- `login` has exactly one call site: the submit handler in the same file.
	89	- The submit handler reads `username` and `password` from the DOM. No other
	90	  identifier is available at the call site.
	91	- Nothing anywhere in the repository produces, stores, or reads a value named
	92	  `userId` or any equivalent user identifier.
	93	- `app.js` is a browser script loaded as a plain global script; it uses no
	94	  module system. `src/` uses CommonJS (`require`/`module.exports`) and is a
	95	  separate, unrelated Node entry point (`src/index.js` prints a greeting).
	96	- There is no HTTP client, no fetch wrapper, no request interceptor, no
	97	  application state container, no session or storage layer, and no logging
	98	  abstraction.
	99	- There is currently exactly one form in the app (the login form in
	100	  `index.html`). The stated expectation is that other forms will exist later
	101	  and will also need to attach user identity.
	102	
	103	`src/utils.js` exports a single `greet(name)` function. `src/index.js` calls it.
	104	Neither relates to authentication.
	105	
	106	## Constraints stated by the human partner
	107	
	108	- The audit trail's purpose is security/compliance.
	109	- The authenticating backend at `API_ENDPOINT` is owned by us, but the design
	110	  scope is limited to this repository; the backend is not being designed here.
	111	- The audit event schema is greenfield.
	112	- The mechanism must work across the app, not only the login form, because
	113	  other forms will need it later.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
