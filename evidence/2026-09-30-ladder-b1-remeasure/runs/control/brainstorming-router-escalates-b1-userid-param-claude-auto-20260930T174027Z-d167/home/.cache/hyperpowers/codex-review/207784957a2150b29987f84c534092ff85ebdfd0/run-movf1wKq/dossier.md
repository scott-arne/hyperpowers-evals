# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T174027Z-d167/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-client-side-session-identity-design.md

	1	# Client-Side Session Identity — Design
	2	
	3	Date: 2026-09-30
	4	Status: Approved design, pending implementation plan
	5	
	6	## Problem
	7	
	8	The request was "add a `userId` parameter to the login function so we can track
	9	who logged in." Clarifying that request changed its shape twice:
	10	
	11	1. Nothing in the repo produces a `userId`. The form collects only `username`
	12	   and `password` (`index.html:9-10`), and `login()` is called with exactly
	13	   those two values (`app.js:23`). A `userId` the client must supply *before*
	14	   authenticating has no source. The value belongs in `login()`'s **return**,
	15	   where a server would assign it.
	16	2. "Track who logged in" was confirmed to mean the identity must **persist**
	17	   and be usable **across the app**, because other forms will need it later.
	18	   That is a new subsystem, not a signature change, so the work was
	19	   re-classified from a bounded change to an architectural one.
	20	
	21	The deliverable is therefore not a new parameter. It is a persisted,
	22	client-side current-user identity that `app.js` writes at login and that
	23	future forms read.
	24	
	25	## Settled constraints
	26	
	27	These were decided with the human partner during brainstorming and are not open
	28	for reinterpretation during implementation:
	29	
	30	| Decision | Choice |
	31	|---|---|
	32	| Source of `userId` | Returned by `login()`, not passed into it |
	33	| Persistence | Client-side only; no backend. `API_ENDPOINT` stays a stub |
	34	| Storage mechanism | `localStorage`, with an explicit logout path |
	35	| Stored scope | Current identity only — no change notification, no login history |
	36	| Module strategy | Native ES modules, no bundler |
	37	
	38	## Global constraints
	39	
	40	Inherited by every task in the implementation plan:
	41	
	42	- **Zero runtime dependencies.** The ES-module approach was chosen partly
	43	  because it needs no bundler; implementation must not introduce one, nor any
	44	  npm runtime dependency.
	45	- **Unit tests via `node --test`.** Node's built-in runner, no test framework
	46	  dependency. New behavior in `session.js` ships with tests.
	47	- **No linter or formatter.** Declined for now; do not add one.
	48	- **No end-to-end or fuzz testing.** Declined; out of scope.
	49	- **`package.json` declares `"type": "module"`.** See "Module system" below.
	50	
	51	## Architecture
	52	
	53	### File layout
	54	
	55	`session.js` is a new file at the **repository root**, alongside `app.js` — not
	56	under `src/`. `src/` holds orphaned CommonJS files that the browser never
	57	loads; placing an ES module there would put two module systems in one
	58	directory. The browser half of this repo stays flat at the root.
	59	
	60	### Module system
	61	
	62	`package.json` gains `"type": "module"`. This is the accurate declaration for a
	63	repo whose browser code is ESM, and it is what allows `node --test` to import
	64	`session.js` at all — without it Node parses `.js` as CommonJS and rejects
	65	`export` with `Unexpected token 'export'`.
	66	
	67	Consequence: the two existing CommonJS files must be renamed so they keep
	68	working.
	69	
	70	- `src/index.js` → `src/index.cjs`
	71	- `src/utils.js` → `src/utils.cjs`
	72	- The `require('./utils')` call inside `src/index.cjs` must be updated to
	73	  `require('./utils.cjs')`.
	74	- `package.json`'s `"main"` must be updated from `src/index.js` to
	75	  `src/index.cjs`.
	76	
	77	These files are unrelated to the original request. Renaming them was explicitly
	78	approved as part of this design; it is not incidental cleanup, and no other
	79	change to them is in scope.
	80	
	81	### `session.js`
	82	
	83	The only code in the application permitted to touch `localStorage`.
	84	
	85	```js
	86	const STORAGE_KEY = "app.session";
	87	
	88	export function getSession()        // -> { userId, username } | null
	89	export function setSession(session) // -> boolean (did the write land?)
	90	export function clearSession()      // -> void
	91	```
	92	
	93	**Stored record:** `{ userId, username }`. `username` is carried alongside the
	94	id because there is no backend: a later screen that wants to show "signed in
	95	as …" cannot resolve a bare `userId` into a name, since there is nothing to
	96	ask. The username is already in hand at login, so it costs one field.
	97	
	98	**No in-memory cache.** Every read goes to storage. At this scale the cost is
	99	nil, and it makes the cross-tab case work without a subscription mechanism: a
	100	logout in one tab is visible to the next read in another tab. The only gap is a
	101	page that sits idle and never reads again, which no current code does. This is
	102	why the "identity + change notification" option was not needed.
	103	
	104	### `app.js`
	105	
	106	- `login(username, password)` keeps its existing two-parameter signature. It
	107	  gains a `userId` in its return value:
	108	
	109	  ```js
	110	  return { success: true, userId: STUB_USER_ID, username };
	111	  ```
	112	
	113	- `STUB_USER_ID` is a module-level constant with an **obviously fake value**.
	114	  It must not be generated, randomized, or derived from the username. A stub
	115	  that mints plausible-looking identifiers invites later code to treat them as
	116	  real identity. When `API_ENDPOINT` becomes real, this constant is deleted and
	117	  the field comes from the response.
	118	- The returned `user` field is **renamed to `username`** for consistency with
	119	  the stored record. This is safe: `app.js:23` is the only caller in the repo.
	120	- `login()` does **not** write to storage. The submit handler does:
	121	
	122	  ```js
	123	  const result = login(username, password);
	124	  if (result.success) {
	125	    const stored = setSession({ userId: result.userId, username: result.username });
	126	    if (!stored) console.warn("Session could not be persisted; login will not survive a reload.");
	127	  }
	128	  ```
	129	
	130	  Keeping the write in the caller leaves `login()` a pure stand-in for a network
	131	  call — testable, with no storage side effects — and honest about the fact
	132	  that it becomes `async` once the real endpoint lands.
	133	
	134	### `index.html`
	135	
	136	- `<script src="app.js">` becomes `<script type="module" src="app.js">`.
	137	- A logout button is added, wired to `clearSession()`. It is **always
	138	  visible**; toggling it on session state would require UI state management,
	139	  which is a larger idea than this design should introduce.
	140	
	141	**Serving requirement:** module scripts are fetched under CORS rules, so
	142	`index.html` must be served over `http://` (any static server, e.g.
	143	`python3 -m http.server`). Opening the file directly from disk with `file://`
	144	will no longer work. This was an accepted cost of the ES-module approach.
	145	
	146	## Data flow
	147	
	148	1. User submits the form.
	149	2. `validateForm()` runs unchanged.
	150	3. On valid input, `login(username, password)` returns
	151	   `{ success, userId, username }`.
	152	4. On success, the handler calls `setSession({ userId, username })`.
	153	5. `session.js` serializes the record to `localStorage` under `app.session`.
	154	6. Any later form calls `getSession()` and receives the record or `null`.
	155	7. The logout button calls `clearSession()`, removing the key.
	156	
	157	## Error handling
	158	
	159	`localStorage` is the only real failure surface, and it fails in several ways.
	160	Every access inside `session.js` is individually wrapped in `try`/`catch`
	161	rather than feature-detected once at load: availability is not a stable
	162	property, and a write can fail (quota) on a browser where a read just
	163	succeeded. Accessing `window.localStorage` can itself throw `SecurityError`
	164	where a browser or embedded webview blocks storage.
	165	
	166	The failure policy differs by direction, deliberately:
	167	
	168	- **`getSession()` never throws.** Storage blocked, key absent, unparseable
	169	  JSON, or a valid-JSON-but-wrong-shape value all return `null` — "nobody is
	170	  logged in," the safe reading of a failed identity read. No caller needs a
	171	  `try`/`catch`.
	172	- **`setSession()` returns a boolean.** A failed write means the user is logged
	173	  in on this page and will be a stranger after a reload. Swallowing that
	174	  produces a "it keeps forgetting me" bug with nothing in the logs. The submit
	175	  handler warns to the console on `false`.
	176	- **`clearSession()` never throws.** If storage is unreachable there is nothing
	177	  to clear.
	178	
	179	**Corrupt data self-heals.** When `getSession()` finds unparseable JSON or a
	180	record of the wrong shape, it removes the key before returning `null`. Leaving
	181	it would let one bad write break the app for that user on every subsequent
	182	load, with no UI to recover.
	183	
	184	**Validity rule:** a stored record is valid only if it is a plain object whose
	185	`userId` and `username` are both non-empty strings. A bare string, a number,
	186	`null`, an array, or an object missing either field is treated as corrupt.
	187	
	188	The validity rule is enforced on **read only**. `setSession()` serializes what
	189	it is given without inspecting it; a caller that stores a malformed record gets
	190	`true` back and the next `getSession()` discards it. Validating on read is what
	191	makes the app resilient to values written by an older version of the code or
	192	edited by hand, which validating on write cannot cover.
	193	
	194	## Security constraint
	195	
	196	**The stored `userId` is not authentication, and must never be treated as
	197	authentication.**
	198	
	199	`localStorage` is fully editable by the user; anyone can set `userId` to any
	200	value with two lines in a console. The stored record is acceptable as "who this
	201	browser believes it is" — useful for display and prefilling. It is not evidence
	202	of anything.
	203	
	204	The dangerous next step is specific and foreseeable: when a backend appears,
	205	sending the stored `userId` up and trusting it to identify the caller is an
	206	authentication bypass. A real backend must derive identity from a credential it
	207	issued and verifies, never from this field. This is recorded here because the
	208	entire point of this design is that other code will come to depend on the
	209	value.
	210	
	211	## Testing
	212	
	213	Unit tests for `session.js` via `node --test`, with `localStorage` supplied as
	214	a stubbed object so the error paths are reachable:
	215	
	216	- round-trip: `setSession()` then `getSession()` returns the record
	217	- `getSession()` returns `null` when no key is present
	218	- `getSession()` returns `null` and removes the key on unparseable JSON
	219	- `getSession()` returns `null` and removes the key on wrong-shape records
	220	  (bare string, `null`, missing `userId`, empty-string `username`)
	221	- `getSession()` returns `null` when storage access throws
	222	- `setSession()` returns `false` when the write throws (quota / blocked)
	223	- `setSession()` returns `true` on success
	224	- `clearSession()` removes the key and does not throw when storage is
	225	  unavailable
	226	
	227	`login()` is **not** unit-tested. It lives in `app.js` beside the
	228	`document.getElementById("login-form")` call that runs at import time, so
	229	importing the module under Node fails for lack of a DOM. Extracting `login()`
	230	into its own module purely to make it testable is out of scope for this
	231	change. Its revised return shape and the submit-handler wiring are verified by
	232	hand in a browser. No e2e infrastructure is in scope.
	233	
	234	## Out of scope
	235	
	236	- Any real authentication or any call to `API_ENDPOINT`.
	237	- Server-side recording of login events.
	238	- A login *history*; only the current identity is stored.
	239	- Change notification / subscription for forms on the same page.
	240	- Session expiry. With no backend there is no authority to expire against;
	241	  `clearSession()` via the logout button is the only exit.
	242	- Showing or hiding UI based on session state.
	243	- Unifying the `src/` CommonJS half with the browser half beyond the `.cjs`
	244	  renames required by `"type": "module"`.
	245	- Linting, formatting, e2e, and fuzz infrastructure — all explicitly declined.
	246	
	247	## Risks
	248	
	249	- **`file://` regression.** Anyone used to opening `index.html` from disk must
	250	  now serve it. Accepted knowingly.
	251	- **Shared machines.** `localStorage` survives browser restarts, so on a shared
	252	  device the next person is treated as the previous user until logout is
	253	  pressed. The always-visible logout button is the only mitigation; there is no
	254	  server-side expiry to fall back on.
	255	- **`src/` renames.** Two files outside the request's natural scope change.
	256	  Approved explicitly; called out here so the change is not mistaken for drift.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T174027Z-d167/home/.cache/hyperpowers/codex-review/207784957a2150b29987f84c534092ff85ebdfd0/run-aRDi9Luv/approach-context.md

	1	# Approach Context
	2	
	3	## Original idea (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	1. **Where should the userId come from?** (options offered: returned by the login
	10	   response; passed in by the caller; a new form field)
	11	   → **From the login response.** The server assigns it; it is not an input to
	12	   `login()`.
	13	
	14	2. **What should "track who logged in" actually do?** (options offered: surface it
	15	   in the existing stub; real event tracking)
	16	   → **"yes, it should persist, and it should work across the app — other forms
	17	   will need it later"** (free-text answer, not one of the offered options).
	18	
	19	3. **What does "persist" mean, and is there a backend outside this repo?**
	20	   (options offered: client-side only with no backend; server-side record; both)
	21	   → **Client-side only, no backend.** `API_ENDPOINT` stays a stub.
	22	
	23	4. **How long should the stored identity survive?** (options offered:
	24	   `localStorage` plus an explicit logout; `sessionStorage`; cookie)
	25	   → **`localStorage`, with an explicit clear/logout path included.**
	26	
	27	5. **What should the shared module hold and expose?** (options offered: current
	28	   identity only; identity plus change notification; identity plus login history)
	29	   → **Current identity only** — get / set / clear. One record, overwritten on
	30	   each login. No subscription mechanism, no login history.
	31	
	32	## Codebase facts
	33	
	34	Repository root contains exactly these non-`.git` files:
	35	
	36	```
	37	index.html
	38	README.md
	39	package.json
	40	app.js
	41	src/index.js
	42	src/utils.js
	43	```
	44	
	45	### `app.js` (loaded in the browser)
	46	
	47	```js
	48	// Simple webapp with login form handling
	49	const API_ENDPOINT = "https://api.example.com/login";
	50	
	51	function login(username, password) {
	52	  console.log("Logging in:", username);
	53	  // Stub: would POST to API_ENDPOINT in real app
	54	  return { success: true, user: username };
	55	}
	56	
	57	function validateForm(formData) {
	58	  if (!formData.username || !formData.password) {
	59	    return { valid: false, error: "Missing required fields" };
	60	  }
	61	  return { valid: true };
	62	}
	63	
	64	document.getElementById("login-form").addEventListener("submit", (e) => {
	65	  e.preventDefault();
	66	  const username = document.getElementById("username").value;
	67	  const password = document.getElementById("password").value;
	68	  const validation = validateForm({ username, password });
	69	  if (validation.valid) {
	70	    const result = login(username, password);
	71	    console.log("Login result:", result);
	72	  } else {
	73	    console.error("Validation error:", validation.error);
	74	  }
	75	});
	76	```
	77	
	78	- `login()` is a stub. It does not contact `API_ENDPOINT`; it synchronously
	79	  returns `{ success: true, user: username }`. It is not `async` and returns no
	80	  promise.
	81	- Functions are declared at top level as plain script globals. There are no
	82	  `import`/`export` statements and no `module.exports` in this file.
	83	
	84	### `index.html`
	85	
	86	```html
	87	<!DOCTYPE html>
	88	<html>
	89	<head>
	90	  <title>Simple Webapp</title>
	91	</head>
	92	<body>
	93	  <h1>Login</h1>
	94	  <form id="login-form">
	95	    <input type="text" id="username" placeholder="Username" />
	96	    <input type="password" id="password" placeholder="Password" />
	97	    <button type="submit">Log In</button>
	98	  </form>
	99	  <script src="app.js"></script>
	100	</body>
	101	</html>
	102	```
	103	
	104	- `app.js` is loaded with a bare `<script src>` — **no** `type="module"`.
	105	- The form has only `username` and `password` inputs. There is no logout
	106	  control and no second form anywhere in the repo.
	107	
	108	### `src/index.js` and `src/utils.js`
	109	
	110	```js
	111	// src/index.js
	112	const { greet } = require('./utils');
	113	
	114	function main() {
	115	  console.log(greet('world'));
	116	}
	117	
	118	main();
	119	```
	120	
	121	```js
	122	// src/utils.js
	123	function greet(name) {
	124	  return `Hello, ${name}!`;
	125	}
	126	
	127	module.exports = { greet };
	128	```
	129	
	130	- These use CommonJS `require` / `module.exports`. They are Node-side and are
	131	  never referenced by `index.html` or `app.js`. The browser half and the `src/`
	132	  half of this repo are currently disconnected.
	133	
	134	### `package.json`
	135	
	136	```json
	137	{
	138	  "name": "drill-test-project",
	139	  "version": "1.0.0",
	140	  "description": "Test project for Drill scenarios",
	141	  "main": "src/index.js"
	142	}
	143	```
	144	
	145	- No `dependencies`, no `devDependencies`, no `scripts`, no `"type"` field.
	146	- There is no bundler, no transpiler, no test runner, no linter, and no
	147	  formatter configured anywhere in the repo.
	148	- There is no lockfile and no `node_modules`.
	149	
	150	### Other constraints
	151	
	152	- Git branch is `feature/webapp-enhancement`; working tree clean.
	153	- No CI configuration, no `.editorconfig`, no framework.
	154	- The page is a static file set; nothing indicates a dev server or build step.
	155	
	156	## What to produce
	157	
	158	Propose 2-3 genuinely different architectures for making a persisted,
	159	client-side current-user identity available to `app.js` today and to additional
	160	forms/pages added later, given the constraints above. Address where the shared
	161	code lives, how it is loaded by the browser given there is no build step, how
	162	`login()`'s contract changes, and how the stored value is cleared.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
