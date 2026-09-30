# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T174733Z-2855/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-user-identity-design.md

	1	# User Identity Design
	2	
	3	Date: 2026-09-30
	4	Status: Approved (design), pending implementation plan
	5	
	6	## Problem
	7	
	8	The request was "add a `userId` parameter to the login function so we can track
	9	who logged in." Clarifying questions established that the intended `userId`
	10	identifies *the person*, persists across the app, and will be read by forms that
	11	do not exist yet.
	12	
	13	That is not a parameter change. A value that identifies the person cannot be an
	14	input to the function that authenticates the person — it does not exist until
	15	authentication succeeds. What the request actually needs is a small identity
	16	subsystem: the server issues a user ID at login, the client stores it, and other
	17	parts of the app read it.
	18	
	19	The literal `login(userId, username, password)` shape was presented to the human
	20	partner alongside the server-issued alternative. They chose server-issued,
	21	having been told explicitly that it means `login()` gains no `userId` parameter.
	22	
	23	## Decisions
	24	
	25	| Question | Decision |
	26	|---|---|
	27	| Where `userId` comes from | Server issues it; `login()` returns it |
	28	| Persistence | `sessionStorage`, cleared when the tab closes |
	29	| Scope of this increment | Availability to other code only; no login-event recording |
	30	| Consumption mechanism | ES module import of a dedicated `identity.js` |
	31	| `login()` synchrony | Becomes `async`, returning a Promise |
	32	| Code organization | `login`/`validateForm` move out of `app.js` into `auth.js` |
	33	
	34	### Rejected alternatives
	35	
	36	- **`userId` as a parameter to `login()`** — the value does not exist before
	37	  authentication. A client-minted ID would identify a browser, not a person.
	38	- **`localStorage`** — survives browser restarts, leaving identity on shared
	39	  machines with no clear-on-logout path in this app.
	40	- **Event bus over `sessionStorage`** — consumers would still agree on the
	41	  storage key by convention, giving the coupling without a module to enforce it.
	42	  Reconsider only if cross-tab synchronization becomes a requirement.
	43	- **Client-side login event log** — risks being mistaken for an audit trail.
	44	  Recording belongs with a real backend.
	45	
	46	## Architecture
	47	
	48	Three browser modules, each with one job:
	49	
	50	- **`identity.js`** — sole owner of the identity storage key and the only code
	51	  that touches `sessionStorage` for identity. Exports `setUserId`, `getUserId`,
	52	  `clearUserId`.
	53	- **`auth.js`** — authentication logic: `login` and `validateForm`. No DOM
	54	  access, so it is importable by a test runner.
	55	- **`app.js`** — DOM wiring only: reads the form, calls `auth.js`, hands the
	56	  resulting ID to `identity.js`.
	57	
	58	`index.html` loads `app.js` as an ES module; the imports pull in the other two.
	59	
	60	### Security boundary
	61	
	62	`getUserId()` returning a value means "this browser session previously completed
	63	a login." It does **not** mean the current request is authorized. Authorization
	64	remains the server's responsibility, checked per request against a credential
	65	the client cannot forge. This rule is stated as a comment in `identity.js`
	66	because it is the invariant most likely to be violated by later code.
	67	
	68	The stored ID is an identifier, not a credential. It is not a session token and
	69	must never be used as one.
	70	
	71	## Components
	72	
	73	### `identity.js`
	74	
	75	```js
	76	const STORAGE_KEY = "app.userId";
	77	```
	78	
	79	- `setUserId(userId)` — throws `TypeError` unless `userId` is a non-empty
	80	  string. Writes to `sessionStorage`.
	81	- `getUserId()` — returns the stored string, or `null` when absent.
	82	- `clearUserId()` — removes the stored value.
	83	
	84	When `sessionStorage` is unavailable, all three functions operate on an
	85	internal in-memory value instead, for the page lifetime. Callers see the same
	86	interface and the same semantics; only durability is lost.
	87	
	88	### `auth.js`
	89	
	90	- `async login(username, password)` — resolves to
	91	  `{ success: boolean, user: string, userId: string }`.
	92	
	93	  Currently a stub: it does not contact `API_ENDPOINT`. The stub builds its
	94	  `userId` by prefixing the username with `stub-`, so the placeholder is
	95	  recognizable if it ever reaches a log or a backend.
	96	
	97	- `validateForm(formData)` — unchanged behavior, moved verbatim.
	98	
	99	`API_ENDPOINT` moves to `auth.js` with `login`.
	100	
	101	### `app.js`
	102	
	103	The submit handler only. Reads the two inputs, calls `validateForm`, awaits
	104	`login`, and routes the result to `identity.js`.
	105	
	106	## Data flow
	107	
	108	1. User submits `#login-form`; the handler calls `preventDefault()`.
	109	2. `validateForm({ username, password })`. On invalid, report the error and
	110	   stop — no identity calls.
	111	3. `await login(username, password)` inside a `try/catch`.
	112	4. On `success === true` with a non-empty string `userId`: `setUserId(userId)`.
	113	5. On `success === false`: `clearUserId()`.
	114	6. On a successful response with a missing or non-string `userId`: log a
	115	   warning, `clearUserId()`, store nothing. This is a server contract violation.
	116	7. On a rejected promise: log the error, `clearUserId()`.
	117	
	118	Future forms read the value with `import { getUserId } from './identity.js'`.
	119	
	120	## Error handling
	121	
	122	Programmer errors fail loudly; environment errors degrade quietly.
	123	
	124	| Condition | Behavior |
	125	|---|---|
	126	| `setUserId` called with a non-string or empty value | Throw `TypeError` |
	127	| `sessionStorage` read or write throws | Catch, fall back to in-memory value for the page lifetime, log once |
	128	| Login returns `success: false` | `clearUserId()`; no ID stored |
	129	| Login succeeds without a usable `userId` | Warn, `clearUserId()`, store nothing |
	130	| `login()` rejects | Catch in the handler, log, `clearUserId()` |
	131	
	132	A `sessionStorage` failure must never break the login flow. A stale ID must
	133	never outlive a failed login attempt.
	134	
	135	## Testing
	136	
	137	`auth.js` and `identity.js` are both free of DOM access and directly importable
	138	by the test runner. `app.js` is DOM wiring and is not unit-tested; it is the
	139	reason the other two were split out.
	140	
	141	Planned coverage:
	142	
	143	- `identity.js`: round-trip set/get; `getUserId` returns `null` when unset;
	144	  `clearUserId` removes; `TypeError` on empty string, `null`, `undefined`, and
	145	  non-string input; graceful degradation when the storage object throws.
	146	- `auth.js`: `login` resolves with a non-empty `userId`; `validateForm` accepts
	147	  a complete form and rejects each missing field.
	148	
	149	Storage is injected or substituted in tests rather than relying on a browser
	150	environment.
	151	
	152	## Global constraints
	153	
	154	Tooling selected by the human partner, to be set up as part of this work:
	155	
	156	- **Unit tests** — node's built-in `node:test` runner. Zero dependencies, native
	157	  ES module support. Add a `test` script to `package.json` and a first passing
	158	  test.
	159	- **Lint and format** — ESLint plus Prettier with standard defaults, wired to
	160	  `package.json` scripts.
	161	
	162	Not selected: end-to-end tests (one form against a stubbed backend does not
	163	justify a browser harness yet), fuzz and mutation testing.
	164	
	165	`package.json` needs `"type": "module"` so the test runner treats the new files
	166	as ES modules. The existing `src/index.js` and `src/utils.js` are CommonJS and
	167	are **not** loaded by the browser app; the plan must confirm that flipping
	168	`"type"` does not break them, and rename them to `.cjs` if it does.
	169	
	170	## Out of scope
	171	
	172	- Login-event recording, locally or to a backend.
	173	- Cross-tab identity synchronization.
	174	- A logout flow or UI. `clearUserId()` exists, but nothing calls it outside the
	175	  failure paths above.
	176	- Replacing the `login()` stub with a real network call.
	177	- Changes to `src/index.js` and `src/utils.js` beyond whatever the `"type":
	178	  "module"` switch forces.
	179	
	180	## Assumptions
	181	
	182	- **Assumption**: the real authentication endpoint returns a stable, per-person
	183	  user identifier as a string field named `userId`. Validate by inspecting the
	184	  actual response from `API_ENDPOINT` before replacing the stub; the field name
	185	  and type in `auth.js` change to match whatever it actually returns.
	186	- **Assumption**: the app is served over HTTP rather than opened from the
	187	  filesystem. ES modules do not load over `file://`. Validate by confirming how
	188	  the page is opened today; if double-click-to-open is required, the design
	189	  falls back to the global-namespace variant (approach B) instead.
	190	- **Assumption**: flipping `package.json` to `"type": "module"` does not break
	191	  the unrelated CommonJS files in `src/`. Validate by running them after the
	192	  change.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T174733Z-2855/home/.cache/hyperpowers/codex-review/a076404bac9ffa057b59e0aea376ddc0a3597786/run-rM07hcjJ/approach-context.md

	1	# Approach Context
	2	
	3	## Original request (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	1. **Where should userId live on the login function — returned by it, passed as a parameter, or handled by a separate tracking call?**
	10	   Answer: passed as a parameter, as originally asked.
	11	
	12	2. **Where does the caller get the userId to pass in? (offered: client-generated correlation ID, a new form field, reuse the username)**
	13	   Answer, in their own words: "It should identify the person and work across the app — it should persist, and other forms will need it later."
	14	
	15	3. **Where does the persistent person-identifying userId originate — server-issued and stored by the client, supplied by the person at login, or a browser-scoped ID promoted at login?**
	16	   Answer: the server issues it. Noted explicitly to them that this means the value does not exist until login returns.
	17	
	18	4. **How long should the stored userId persist — sessionStorage, localStorage, or in-memory only?**
	19	   Answer: sessionStorage.
	20	
	21	5. **What should "track who logged in" deliver in this increment — availability to other forms only, plus a local event log, or plus sending events to a backend?**
	22	   Answer: availability only. No event recording in this increment.
	23	
	24	## Codebase facts
	25	
	26	Repository is a minimal test project. Current branch `feature/webapp-enhancement`, working tree clean.
	27	
	28	Complete file inventory (excluding `.git`): `index.html`, `app.js`, `README.md`, `package.json`, `src/index.js`, `src/utils.js`.
	29	
	30	`app.js` (28 lines, browser, loaded via a plain `<script src="app.js">` tag — no module system, no bundler, no imports/exports):
	31	
	32	```js
	33	// Simple webapp with login form handling
	34	const API_ENDPOINT = "https://api.example.com/login";
	35	
	36	function login(username, password) {
	37	  console.log("Logging in:", username);
	38	  // Stub: would POST to API_ENDPOINT in real app
	39	  return { success: true, user: username };
	40	}
	41	
	42	function validateForm(formData) {
	43	  if (!formData.username || !formData.password) {
	44	    return { valid: false, error: "Missing required fields" };
	45	  }
	46	  return { valid: true };
	47	}
	48	
	49	document.getElementById("login-form").addEventListener("submit", (e) => {
	50	  e.preventDefault();
	51	  const username = document.getElementById("username").value;
	52	  const password = document.getElementById("password").value;
	53	  const validation = validateForm({ username, password });
	54	  if (validation.valid) {
	55	    const result = login(username, password);
	56	    console.log("Login result:", result);
	57	  } else {
	58	    console.error("Validation error:", validation.error);
	59	  }
	60	});
	61	```
	62	
	63	`index.html` (15 lines): a single `#login-form` with `#username` (text) and `#password` (password) inputs and a submit button; loads `app.js` via a non-module script tag. No other pages or forms exist.
	64	
	65	`src/index.js` and `src/utils.js`: an unrelated Node/CommonJS pair (`require('./utils')`, `module.exports = { greet }`). They are not loaded by the browser app and share no code with `app.js`. `package.json` declares `"main": "src/index.js"`, has no `"type"` field, no dependencies, no scripts, and no test runner.
	66	
	67	There is no test infrastructure, no linter/formatter config, no build step, no state management, no storage layer, and no router in the repository.
	68	
	69	`login()` is a stub: it does not call `API_ENDPOINT`; it synchronously returns `{ success: true, user: username }`. There is no real backend to issue a user ID today. It has exactly one caller, the submit handler in the same file.
	70	
	71	## Constraints
	72	
	73	- The server-issued user ID must be persisted in `sessionStorage` and readable by other forms that do not exist yet.
	74	- This increment delivers availability of the ID only; no login-event recording.
	75	- The human partner asked for `userId` as a parameter to the login function, and was told the server-issued choice conflicts with that literal shape.
	76	
	77	## Your task
	78	
	79	Propose 2-3 genuinely different viable architectures for making a server-issued
	80	user identity available across this app, given the constraints above. Address
	81	how the stubbed, synchronous `login()` and the absent module system affect the
	82	design, and how the design should treat the human partner's original
	83	"userId as a parameter to login" framing.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
