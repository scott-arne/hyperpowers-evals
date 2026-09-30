# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T220603Z-8582/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-login-identity-tracking-design.md

	1	# Login Identity and Tracking — Design
	2	
	3	Date: 2026-09-30
	4	Status: awaiting review
	5	
	6	## Problem
	7	
	8	The request that started this: "Add a userId parameter to the login function so we can track who logged in."
	9	
	10	The literal change is not implementable as stated. `login(username, password)` in `app.js` is called from exactly one place — the form submit handler in the same file — and that handler has only the two form fields to work with. There is no user id anywhere in the application to pass. Establishing identity is what logging in is *for*, so a user id cannot be an input to it.
	11	
	12	Clarifying the intent produced a larger requirement than a parameter:
	13	
	14	- The identifier must work across the whole app, not just this form; other forms will consume it.
	15	- It must persist, so there is a record of who logged in.
	16	
	17	Neither an identity layer nor any persistence exists in this codebase today. This document designs both.
	18	
	19	## Current state
	20	
	21	- `index.html` — a static page, no build step, one classic `<script src="app.js">` (not `type="module"`). A `<form id="login-form">` with `#username` and `#password` inputs.
	22	- `app.js` — 28 lines. `login(username, password)` is synchronous, logs to the console, never contacts `API_ENDPOINT` (declared and unused), and unconditionally returns `{ success: true, user: username }`. `validateForm` checks for empty fields. The submit handler wires them together.
	23	- No bundler, no module system in the browser code, no browser dependencies.
	24	- No test runner, no linter, no formatter anywhere in the repo.
	25	- `src/index.js` and `src/utils.js` are an unrelated Node hello-world and are not touched by this work.
	26	
	27	## Decisions taken
	28	
	29	Settled with the requester during brainstorming:
	30	
	31	1. **A backend is planned but not built.** The client-side identity module is designed against the interface the future server will satisfy, with storage behind a swappable seam.
	32	2. **Both a current identity and an event log persist.** Other forms read the identity; the log is a capped buffer that ships to the backend at cutover.
	33	3. **The identifier minted now is an opaque device id, named as such.** A browser cannot know who a person is — anything minted client-side identifies a browser profile, not a user. `Identity` exposes `deviceId` (available now) and `userId` (null until the server issues one) so consumers code against the real shape from the start and nothing has to be renamed at cutover.
	34	4. **Successful logins only are recorded**, as `{ username, at, deviceId }`. Failed attempts are not logged: a client-side failure log is near-worthless for spotting attacks (an attacker's browser simply never reports), and it captures mistyped usernames, which are sometimes passwords typed into the wrong box. Passwords are never stored under any circumstances.
	35	5. **Approach A — a global IIFE module** — over ES modules, because `<script type="module">` is blocked by CORS on `file://` and would require a local dev server to open the page. Globals also match the existing idiom, where `login` and `validateForm` are already globals.
	36	
	37	## Global Constraints
	38	
	39	- **Unit test infrastructure is set up as part of this work**: Node's built-in runner (`node --test`), zero dependencies, consistent with a repo that currently declares none. Every later task inherits it.
	40	- No linter or formatter is being configured; this was offered and declined. Do not add one as a side effect.
	41	- No end-to-end test infrastructure.
	42	- No new runtime dependencies, in the browser or in Node.
	43	- The browser app must continue to open directly from the filesystem (`file://`). Any change requiring a dev server is out of bounds.
	44	- Tracking must never break login. A storage failure degrades tracking; it never propagates to the caller.
	45	
	46	## Architecture
	47	
	48	One new browser file, `identity.js`, an IIFE assigning a single `Identity` global. `index.html` loads it before `app.js`. The storage seam lives inside `identity.js` rather than in a separate file, injected through `Identity.configure({ storage })`, avoiding a load-order dependency between two new scripts.
	49	
	50	Files changed:
	51	
	52	| File | Change |
	53	|---|---|
	54	| `identity.js` | New. The identity module and its storage adapter. |
	55	| `app.js` | `login` becomes async and takes a third parameter; the submit handler awaits it. |
	56	| `index.html` | One added `<script src="identity.js">`, before `app.js`. |
	57	| `test/identity.test.js` | New. Unit tests for the module. |
	58	| `test/login.test.js` | New. Unit tests for `login` with a fake identity. |
	59	| `package.json` | Add `"scripts": { "test": "node --test" }`. |
	60	
	61	`identity.js` ends with a guarded export so the Node test runner can import it without a bundler or a DOM:
	62	
	63	```js
	64	if (typeof module !== "undefined" && module.exports) { module.exports = Identity; }
	65	```
	66	
	67	`app.js` needs the same guard for its own tests to import `login`. In the browser both guards are inert.
	68	
	69	## The `Identity` surface
	70	
	71	```js
	72	Identity.configure({ storage })          // defaults to a localStorage adapter
	73	Identity.getDeviceId()                   // mints + persists a UUID on first call
	74	Identity.getUserId()                     // null until the backend issues one
	75	Identity.setUserId(id)                   // cutover: called from the login response
	76	Identity.recordLogin({ username })       // appends a success entry, enforces the cap
	77	Identity.getLoginRecords()               // read the buffer
	78	Identity.drainLoginRecords()             // read + clear, for shipping to the backend
	79	Identity.clear()                         // logout: drops userId and the log, keeps deviceId
	80	Identity.forgetDevice()                  // privacy reset: drops everything, deviceId included
	81	```
	82	
	83	The split between `clear` and `forgetDevice` is deliberate. Logging out should not discard the device id — the id identifies the browser, not the session, and re-minting it on every logout would destroy the correlation it exists to provide. Dropping it is a distinct, rarer action, so it gets a distinct name.
	84	
	85	`getUserId()` returns `null` today, and every consumer must handle null. This is deliberate: consumers written against the real shape need no changes when the backend starts populating it.
	86	
	87	The `storage` object passed to `configure` is the seam. Its contract is three methods — `getItem(key)`, `setItem(key, value)`, `removeItem(key)` — matching the `Storage` interface so the browser default is `window.localStorage` itself, and tests inject a plain in-memory object.
	88	
	89	## Data model
	90	
	91	Storage keys are namespaced to avoid collisions with anything else on the origin:
	92	
	93	- `app.identity.deviceId` — a UUID string
	94	- `app.identity.userId` — a string; absent until the backend issues one
	95	- `app.identity.loginLog` — a JSON array of entries
	96	
	97	A log entry:
	98	
	99	```json
	100	{ "username": "alice", "at": "2026-09-30T14:03:11.482Z", "deviceId": "f81d4fae-..." }
	101	```
	102	
	103	`at` is ISO-8601 from `new Date().toISOString()`. The cap is **50 entries**; on overflow the oldest is dropped. The cap exists because `localStorage` is a small, shared, origin-wide budget and an uncapped append-only log will eventually exhaust it and start throwing for unrelated code.
	104	
	105	The device id is minted **lazily, on first login** — never on page load. Someone who visits and never logs in is never assigned a persistent identifier. It uses `crypto.randomUUID()`, falling back to a UUIDv4 assembled from `crypto.getRandomValues`. If neither is available the module throws. There is deliberately no `Math.random` fallback: a predictable identifier is worse than an absent one, because it carries the appearance of uniqueness without the property.
	106	
	107	## Data flow
	108	
	109	1. User submits the form. The handler reads `#username` and `#password` and calls `validateForm` as it does today.
	110	2. On valid input, the handler calls `await login(username, password, Identity)`.
	111	3. `login` obtains `identity.getDeviceId()` and includes it in the payload it would POST to `API_ENDPOINT`. The POST remains stubbed; this work does not implement authentication.
	112	4. On success, `login` calls `identity.recordLogin({ username })`.
	113	5. `login` returns `{ success, user, deviceId, userId }`.
	114	
	115	Recording happens inside `login`, not in the submit handler, so the other forms that will call `login` cannot forget to do it. The identity object is passed as a parameter rather than read from the global, which keeps `login` testable with a fake and makes its dependency visible in its signature.
	116	
	117	`login` is given its async shape now even though the stub has nothing to await. The real backend will make it async, and doing it now means the call site is written once instead of twice.
	118	
	119	## Error handling
	120	
	121	- **Storage throws.** `localStorage` throws when disabled, in some private-browsing modes, and on quota exhaustion. Every access is wrapped. On first failure the module warns once and degrades to an in-memory store for the rest of the session. Tracking is lost; login is unaffected.
	122	- **Corrupt log.** If `app.identity.loginLog` does not parse as an array, it is reset to `[]` rather than throwing. A malformed value must not wedge login.
	123	- **No crypto.** Throws with an explicit message, per the data model above.
	124	- **Rejected login.** The submit handler becomes `async` and catches, so a failure surfaces in the console rather than leaving an unhandled rejection and a form that appears to have done nothing.
	125	
	126	## Security and privacy
	127	
	128	Recorded here because these properties are easy to lose in later edits:
	129	
	130	- `localStorage` is readable by any script on the origin. An XSS on this page reads every username in the log and the device id. Nothing secret goes in — **no passwords, no tokens, ever**.
	131	- The device id is a persistent tracking identifier and carries the obligations that implies. It is minted lazily and cleared by `Identity.clear()`.
	132	- The login log is **not an audit trail**. It lives on the client, where the user can edit or delete it freely. It is a staging buffer until the server owns the record. `identity.js` carries a header comment saying so, because a file named like this one is exactly what someone later mistakes for an audit log.
	133	
	134	## Cutover to the backend
	135	
	136	Three changes, and nothing else:
	137	
	138	1. `login` calls `Identity.setUserId(...)` with the id from the real response.
	139	2. `drainLoginRecords()` ships the buffered entries to the backend.
	140	3. The storage adapter is swapped, or supplemented with server sync.
	141	
	142	Assumption: the future backend will accept a client-supplied device id on the login request and return a stable user id; validate against the backend API design once it is specified. If it does not, the device id becomes a purely local correlation key and step 1 is the only part that changes — consumers already handle a null `userId`.
	143	
	144	## Testing
	145	
	146	`node --test`, with an injected in-memory storage object.
	147	
	148	`test/identity.test.js`:
	149	
	150	- `getDeviceId` mints a UUID on first call and returns the same value on subsequent calls
	151	- the device id survives a fresh module instance reading the same storage
	152	- no device id is written to storage until `getDeviceId` is called
	153	- `getUserId` returns null before `setUserId`, and the set value after
	154	- `recordLogin` appends an entry with `username`, `at`, and `deviceId`
	155	- entries are capped at 50: after 51 records, length is 50 and the oldest is gone
	156	- `drainLoginRecords` returns the entries and leaves the buffer empty
	157	- a corrupt `loginLog` value is recovered as an empty array
	158	- a storage whose `setItem` throws degrades to in-memory instead of propagating
	159	- `clear` removes the user id and the log but leaves the device id intact
	160	- `forgetDevice` removes all three keys, and the next `getDeviceId` mints a different id
	161	
	162	`test/login.test.js`:
	163	
	164	- `login` passes the device id through to its result
	165	- `login` calls `recordLogin` once on success with the submitted username
	166	- no recorded entry contains the password, under any field name
	167	
	168	## Out of scope
	169	
	170	- Real authentication and the actual POST to `API_ENDPOINT`
	171	- Tokens, sessions, and session lifetime
	172	- Logout UI
	173	- Failure logging — reconsidered once the server can see attempts across all browsers
	174	- Wiring the other forms; this design exists to make that cheap, but does not do it
	175	- Linting and formatting; offered and declined


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T220603Z-8582/home/.cache/hyperpowers/codex-review/645c20b9303969376daac6d090b0f5c458b2870c/run-aBRsTkaS/approach-context.md

	1	# Approach Context
	2	
	3	## Original request (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	**Q: What value should flow into `userId`? The login form only has username and password today.**
	10	A: "A real user id that works across the app, not just this form. Other forms will need it later."
	11	
	12	**Q: What should "track" actually do with it?**
	13	A: "It should persist, so we have a record of who logged in."
	14	
	15	**Q: Is there a backend that will authenticate users and store the login record, or is this browser-only?**
	16	A: Backend planned, but not built. Design a client-side identity module against the interface the future server will satisfy, with storage behind a swappable seam.
	17	
	18	**Q: What should persist — the current identity, a log of login events, or both?**
	19	A: Both. A current identity other forms can read, plus a capped buffer of recent login events that ships to the backend at cutover.
	20	
	21	**Q: Before the backend exists, what identifier do we actually have?**
	22	A: Mint an opaque id named for what it is (`deviceId`/`clientId`). The module also exposes a `userId` that stays null until the server issues one.
	23	
	24	**Q: What should each login record contain?**
	25	A: Successful logins only: username + timestamp + device id. Failed attempts are not recorded (avoids storing mistyped credentials). Passwords are never stored.
	26	
	27	## Codebase facts
	28	
	29	Repository root contains: `index.html`, `app.js`, `README.md`, `package.json`, and an unrelated Node hello-world under `src/` (`src/index.js` requires `src/utils.js`, which exports `greet`). Git branch `feature/webapp-enhancement`, clean tree.
	30	
	31	`index.html` (15 lines): static page, no build step. A `<form id="login-form">` with `<input id="username">`, `<input type="password" id="password">`, and a submit button. Loads exactly one script: `<script src="app.js"></script>` — a classic script tag, not `type="module"`.
	32	
	33	`app.js` (28 lines), in full:
	34	
	35	```js
	36	// Simple webapp with login form handling
	37	const API_ENDPOINT = "https://api.example.com/login";
	38	
	39	function login(username, password) {
	40	  console.log("Logging in:", username);
	41	  // Stub: would POST to API_ENDPOINT in real app
	42	  return { success: true, user: username };
	43	}
	44	
	45	function validateForm(formData) {
	46	  if (!formData.username || !formData.password) {
	47	    return { valid: false, error: "Missing required fields" };
	48	  }
	49	  return { valid: true };
	50	}
	51	
	52	document.getElementById("login-form").addEventListener("submit", (e) => {
	53	  e.preventDefault();
	54	  const username = document.getElementById("username").value;
	55	  const password = document.getElementById("password").value;
	56	  const validation = validateForm({ username, password });
	57	  if (validation.valid) {
	58	    const result = login(username, password);
	59	    console.log("Login result:", result);
	60	  } else {
	61	    console.error("Validation error:", validation.error);
	62	  }
	63	});
	64	```
	65	
	66	Facts that constrain the design:
	67	
	68	- `login` is synchronous, never contacts `API_ENDPOINT`, and unconditionally returns `{ success: true, user: username }`. `API_ENDPOINT` is declared and unused.
	69	- `login` has exactly one caller: the submit handler in the same file (line 23).
	70	- There is no module system in the browser code, no bundler, no dependency manifest for the browser app (`package.json` declares no dependencies, no scripts, and points `main` at the unrelated `src/index.js`).
	71	- There is no test infrastructure, no test runner, no linter, and no formatter configured anywhere in the repo.
	72	- There is only one HTML page today, but the human partner states other forms will need the identity later.
	73	- `package.json` has no `"type"` field.
	74	
	75	## Output required
	76	
	77	Approaches (2-3, each genuinely different):
	78	- name: ...
	79	  how-it-works: ...
	80	  tradeoffs: ...
	81	  when-it-wins: ...
	82	  rough-complexity: trivial|moderate|high


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
