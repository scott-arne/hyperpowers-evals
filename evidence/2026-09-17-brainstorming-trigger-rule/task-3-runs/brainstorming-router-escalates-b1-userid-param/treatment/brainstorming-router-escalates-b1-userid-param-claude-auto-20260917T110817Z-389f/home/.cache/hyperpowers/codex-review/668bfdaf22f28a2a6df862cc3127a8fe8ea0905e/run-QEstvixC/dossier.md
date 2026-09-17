# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T110817Z-389f/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-user-identity-design.md

	1	# User Identity Design
	2	
	3	Date: 2026-09-17
	4	Status: Approved for planning
	5	
	6	## Problem
	7	
	8	The app needs to know who logged in, and that knowledge needs to outlive the
	9	login form. Today `login(username, password)` in `app.js` fabricates
	10	`{ success: true, user: username }`, logs it to the console, and the value is
	11	discarded by the only call site. Nothing in the repository records a user
	12	identifier, and no other code can ask who is logged in.
	13	
	14	The originating request was to add a `userId` parameter to `login`. That
	15	framing does not survive the decision that the identifier is server-issued: a
	16	parameter is supplied by the caller, but the caller cannot know an ID that only
	17	the server can issue. `userId` is therefore an output of login, not an input.
	18	`login` does gain a new parameter under this design, but it is an injected
	19	transport for testability, not the identifier.
	20	
	21	## Goals
	22	
	23	- A single, server-issued user identifier established at login.
	24	- The identifier persists across page reloads and in-tab navigation.
	25	- Any part of the app, including code that does not exist yet, can read the
	26	  current identifier through one documented interface.
	27	- The identifier's storage mechanism can be changed later without touching
	28	  consumers.
	29	- A defined response contract the real backend must honor, so `login` does not
	30	  change again when the endpoint ships.
	31	
	32	## Non-Goals
	33	
	34	- Authentication or authorization logic. The identifier is a correlation value,
	35	  not a credential.
	36	- A logout control in the UI. `clearUserId()` ships unused, ready for one.
	37	- Change notification or subscription for consumers. Reads are synchronous.
	38	- Automatic attachment of the identifier to outbound requests.
	39	- A bundler or any runtime dependency.
	40	- Any change to the behavior of `src/index.js` or `src/utils.js` beyond the
	41	  module-syntax conversion required by the `"type": "module"` decision.
	42	
	43	## Decisions
	44	
	45	These were settled during brainstorming and are inputs to the design, not open
	46	questions.
	47	
	48	| Decision | Choice | Rationale |
	49	|---|---|---|
	50	| Identifier origin | Server-issued | The only option that is trustworthy and matches server-side records. |
	51	| Persistence | `sessionStorage` | Survives reloads, self-expires on tab close, so a stale identity cannot outlive the visit. |
	52	| Module system | Native ES modules | Explicit imports make reuse by future forms legible; no bundler, no dependencies. |
	53	| Module surface | Minimal: set / get / clear | Everything larger is additive later and wants a consumer that does not exist yet. |
	54	| Storage write owner | `login` itself | One place establishes identity; callers cannot forget to store it. |
	55	| Test tooling | Node built-in `node --test` | Adds test coverage without adding a dependency. |
	56	
	57	## Architecture
	58	
	59	Three modules, one new concept.
	60	
	61	### `identity.js` (new)
	62	
	63	The entire identity concept. Nothing else in the app touches `sessionStorage`
	64	directly; that containment is what makes the persistence decision reversible.
	65	
	66	```js
	67	setUserId(id)   // stores; throws TypeError on non-string or empty input
	68	getUserId()     // returns string | null
	69	clearUserId()   // removes the stored identifier
	70	```
	71	
	72	- Storage key: `app.userId`.
	73	- Reads `globalThis.sessionStorage` lazily at call time rather than capturing it
	74	  at import time, so tests can install a fake storage object.
	75	- Every storage access is wrapped in try/catch. When storage is unavailable
	76	  (Safari private mode, storage disabled by policy), the module falls back to a
	77	  module-level variable so the app degrades to in-memory identity rather than
	78	  throwing at load.
	79	- `setUserId` rejects non-string and empty input. This guards the failure mode
	80	  where `undefined` is coerced to the literal string `"undefined"` on write, after
	81	  which every `getUserId()` returns truthy garbage.
	82	
	83	### `auth-transport.js` (new)
	84	
	85	One function, `requestLogin(username, password)`, holding the `API_ENDPOINT`
	86	call. Today it returns the stubbed response shape below. When the backend
	87	lands, this is the only file that changes.
	88	
	89	### `app.js` (modified)
	90	
	91	`login` becomes `async`, calls the transport, and on success calls `setUserId`.
	92	`validateForm` is unchanged. The submit handler awaits `login` inside a
	93	try/catch.
	94	
	95	```js
	96	async function login(username, password, { transport = requestLogin } = {})
	97	```
	98	
	99	The injected transport exists solely so tests can supply a fake without module
	100	mocking machinery.
	101	
	102	## Server Response Contract
	103	
	104	The stub returns the shape the real endpoint must honor. Defining it now is the
	105	purpose of keeping the stub.
	106	
	107	```js
	108	// success
	109	{ success: true, userId: "usr_...", username: "alice" }
	110	
	111	// failure
	112	{ success: false, error: "Invalid credentials" }
	113	```
	114	
	115	`userId` is an opaque, non-empty string. Consumers must not parse it or derive
	116	meaning from its format.
	117	
	118	## Data Flow
	119	
	120	1. Form submit fires; `validateForm` runs unchanged.
	121	2. On valid input, the handler awaits `login(username, password)`.
	122	3. `login` awaits `requestLogin`.
	123	4. On `success: true`, `login` calls `setUserId(response.userId)`.
	124	5. `login` returns the response to the caller.
	125	6. Any later code calls `getUserId()` and receives the identifier or `null`.
	126	
	127	A failed login leaves any existing stored identifier untouched. Mistyping a
	128	password on a re-login attempt must not silently clear the current identity.
	129	
	130	## Error Handling
	131	
	132	| Condition | Behavior |
	133	|---|---|
	134	| Transport throws or rejects | `login` rejects. The submit handler catches and logs via `console.error`, matching the existing style. No identifier is stored. |
	135	| Response has `success: false` | `login` returns the response. No identifier is stored. Existing stored identifier is left untouched. |
	136	| `setUserId` given non-string or empty input | Throws `TypeError`. |
	137	| `sessionStorage` access throws | Caught; the module falls back to an in-memory variable for the page's lifetime. |
	138	
	139	## Security Considerations
	140	
	141	- `sessionStorage` is readable by any script on the origin. An XSS flaw exposes
	142	  the identifier. It is an identifier, not a credential; session tokens must not
	143	  be stored here under this design.
	144	- The server must never accept a client-supplied `userId` as proof of identity.
	145	  Authorization remains server-side against the authenticated session.
	146	- The identifier is cleared when the tab closes. On a shared machine, no
	147	  explicit action is required to prevent the next visitor from reading it.
	148	
	149	## Testing
	150	
	151	Runner: Node's built-in test runner via `node --test`. No dependency added.
	152	
	153	`identity.js`:
	154	- set/get round trip returns the stored value.
	155	- `getUserId()` with nothing stored returns `null`.
	156	- `clearUserId()` removes the value; a subsequent `getUserId()` returns `null`.
	157	- `setUserId` throws `TypeError` for empty string, `null`, `undefined`, and
	158	  non-string values.
	159	- When the injected fake storage throws on access, the module falls back to
	160	  in-memory behavior and set/get still round-trips.
	161	
	162	`login`:
	163	- On a `success: true` transport response, the identifier is stored.
	164	- On a `success: false` transport response, nothing is stored and a
	165	  previously stored identifier is unchanged.
	166	- On a rejecting transport, `login` rejects and nothing is stored.
	167	
	168	## Files Touched
	169	
	170	| File | Change |
	171	|---|---|
	172	| `identity.js` | New. |
	173	| `auth-transport.js` | New. |
	174	| `app.js` | `login` becomes async, injects transport, stores the ID; imports added; submit handler awaits. |
	175	| `index.html` | `<script src="app.js">` becomes `<script type="module" src="app.js">`. |
	176	| `package.json` | Add `"type": "module"` and a `test` script. |
	177	| `src/utils.js` | CommonJS to ESM. Behavior unchanged. |
	178	| `src/index.js` | CommonJS to ESM. Behavior unchanged. |
	179	| `test/identity.test.js` | New. |
	180	| `test/login.test.js` | New. |
	181	
	182	## Consequences Accepted
	183	
	184	- **Repo-wide module conversion.** `export` in a `.js` file requires
	185	  `"type": "module"` in `package.json`, which breaks the two CommonJS files
	186	  under `src/`. Converting them is roughly three lines and does not change their
	187	  behavior. This touches files unrelated to login and was explicitly approved.
	188	- **The page must be served over HTTP.** Module scripts do not load from
	189	  `file://`. `python3 -m http.server` in the repo root is sufficient for local
	190	  use.
	191	
	192	## Global Constraints
	193	
	194	- No runtime dependencies. No bundler.
	195	- Unit-test infrastructure is set up as part of this work (`node --test`); every
	196	  task that adds logic adds tests. No linter or formatter is configured, by
	197	  decision.
	198	- No consumer outside `identity.js` may access `sessionStorage` directly.
	199	- Assumption: the backend will be able to return an opaque non-empty string
	200	  `userId` on successful authentication. Validate via review of the response
	201	  contract with whoever builds the endpoint, before the stub in
	202	  `auth-transport.js` is replaced.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T110817Z-389f/home/.cache/hyperpowers/codex-review/668bfdaf22f28a2a6df862cc3127a8fe8ea0905e/run-Wumjq9cO/approach-context.md

	1	# Approach Context
	2	
	3	## Original request (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	**Q: What should `userId` actually be, given the form has no user identifier
	10	before authentication?**
	11	
	12	A (verbatim): "A real user identifier that identifies who logged in. It should
	13	work across the app, it should persist, and other forms will need it later."
	14	
	15	**Q: Where does the persistent user identifier come from?**
	16	
	17	A: Server-issued — the backend authenticates and returns the canonical user ID
	18	on successful login. The endpoint does not exist yet, so the response contract
	19	has to be defined against a stub.
	20	
	21	**Q: How long should the stored user identifier persist?**
	22	
	23	A: `sessionStorage` — survives page reloads and in-tab navigation, cleared when
	24	the tab closes, not shared between tabs.
	25	
	26	**Q: How should the shared identity module be wired into the browser app?**
	27	
	28	A: ES modules — `export`/`import` with `<script type="module">`. No bundler, no
	29	new dependencies. Accepted consequence: the page must be served over HTTP
	30	rather than opened via `file://`.
	31	
	32	**Q: What surface should the identity module expose?**
	33	
	34	A: Minimal — set on login, get synchronously, clear on logout. No change
	35	notification/subscription, no automatic attachment of the ID to outbound
	36	requests.
	37	
	38	## Codebase facts
	39	
	40	Repository root contains: `index.html`, `app.js`, `package.json`, `README.md`,
	41	`src/index.js`, `src/utils.js`. Total ~64 lines of code. Git branch
	42	`feature/webapp-enhancement`, working tree clean.
	43	
	44	`package.json` in full:
	45	
	46	```json
	47	{
	48	  "name": "drill-test-project",
	49	  "version": "1.0.0",
	50	  "description": "Test project for Drill scenarios",
	51	  "main": "src/index.js"
	52	}
	53	```
	54	
	55	No dependencies, no devDependencies, no scripts, no build step, no test runner,
	56	no linter or formatter config anywhere in the repo.
	57	
	58	`app.js` in full (28 lines, plain browser script, no module system):
	59	
	60	```javascript
	61	// Simple webapp with login form handling
	62	const API_ENDPOINT = "https://api.example.com/login";
	63	
	64	function login(username, password) {
	65	  console.log("Logging in:", username);
	66	  // Stub: would POST to API_ENDPOINT in real app
	67	  return { success: true, user: username };
	68	}
	69	
	70	function validateForm(formData) {
	71	  if (!formData.username || !formData.password) {
	72	    return { valid: false, error: "Missing required fields" };
	73	  }
	74	  return { valid: true };
	75	}
	76	
	77	document.getElementById("login-form").addEventListener("submit", (e) => {
	78	  e.preventDefault();
	79	  const username = document.getElementById("username").value;
	80	  const password = document.getElementById("password").value;
	81	  const validation = validateForm({ username, password });
	82	  if (validation.valid) {
	83	    const result = login(username, password);
	84	    console.log("Login result:", result);
	85	  } else {
	86	    console.error("Validation error:", validation.error);
	87	  }
	88	});
	89	```
	90	
	91	Facts about `login`: it is synchronous, performs no network call, and
	92	fabricates its return value. `API_ENDPOINT` is referenced only in the comment.
	93	There is exactly one call site, at `app.js:23`. Nothing reads the return value
	94	beyond a `console.log`.
	95	
	96	`index.html` in full (15 lines):
	97	
	98	```html
	99	<!DOCTYPE html>
	100	<html>
	101	<head>
	102	  <title>Simple Webapp</title>
	103	</head>
	104	<body>
	105	  <h1>Login</h1>
	106	  <form id="login-form">
	107	    <input type="text" id="username" placeholder="Username" />
	108	    <input type="password" id="password" placeholder="Password" />
	109	    <button type="submit">Log In</button>
	110	  </form>
	111	  <script src="app.js"></script>
	112	</body>
	113	</html>
	114	```
	115	
	116	There is no `userId` field in the form, and the string `userId` does not appear
	117	anywhere in the repository. There is no logout control anywhere in the UI.
	118	
	119	`src/index.js` and `src/utils.js` are CommonJS Node files using
	120	`require`/`module.exports`; `src/utils.js` exports a `greet(name)` function and
	121	`src/index.js` calls it from a `main()`. They share no code with `app.js` and
	122	are not loaded by `index.html`.
	123	
	124	## The design question
	125	
	126	Given the decisions above, propose approaches for introducing a persistent,
	127	server-issued user identity that is established at login, stored in
	128	`sessionStorage`, exposed through a minimal ES-module interface, and consumable
	129	by browser forms that do not exist yet — including how `login` itself should
	130	change shape, how the not-yet-existing server response contract should be
	131	represented while the endpoint remains a stub, and how this should be tested in
	132	a repo that currently has no test infrastructure.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
