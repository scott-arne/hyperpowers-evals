# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T005143Z-1551/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-client-identity-design.md

	1	# Client-Generated Persistent User Identity
	2	
	3	Date: 2026-09-16
	4	Status: Awaiting review
	5	
	6	## Problem
	7	
	8	The request was "add a `userId` parameter to the login function so we can track
	9	who logged in." The literal change is one parameter on one function, but the
	10	purpose behind it is not: the identifier must work across the app, persist
	11	across sessions, and be available to forms that do not exist yet.
	12	
	13	No such identifier exists today. `login(username, password)` in `app.js`
	14	receives a username and nothing else; the only identity-shaped value in the
	15	codebase is the user-entered username string. Adding a `userId` parameter
	16	without deciding what a `userId` *is* would bake a placeholder into an
	17	interface that other forms are expected to depend on.
	18	
	19	This spec designs that identifier and threads it into `login`. It does not
	20	design where login events ultimately go.
	21	
	22	## Decisions Already Made
	23	
	24	These were settled during brainstorming and are inputs, not open questions.
	25	
	26	| Decision | Choice | Rationale |
	27	|---|---|---|
	28	| Identity source | Client-generated | No auth backend exists; `API_ENDPOINT` is an unfetched stub. A client-minted id works today and exists before login. |
	29	| Persistence | `localStorage` | Survives browser restart, shared across tabs. A cookie's automatic transmission buys nothing against a stub backend. |
	30	| Consent | Required, designed in | A persistent app-wide identifier created for tracking is subject to GDPR/ePrivacy-style consent regardless of storage mechanism. |
	31	| Scope | Identity only | Event recording is additive and better designed once a real endpoint exists. |
	32	| Consent UI | Simple in-page banner | Without one, nothing can ever grant consent. |
	33	| Structure | Namespaced global (`AppIdentity`) | Matches the existing script-tag, top-level-scope pattern. |
	34	
	35	The identifier identifies a **browser, not a person**. Clearing storage or
	36	switching devices produces a new id. This is an accepted consequence of the
	37	client-generated choice, not an oversight.
	38	
	39	## Global Constraints
	40	
	41	- **Zero runtime dependencies.** The repo has none today and gains none here.
	42	- **Unit tests** via Node's built-in runner (`node --test`). No test framework
	43	  dependency. This was an explicit tooling selection.
	44	- **No linter or formatter.** Explicitly declined; match surrounding style by hand.
	45	- **No build step.** Plain `<script>` tags; the page must keep opening from
	46	  `file://` without a server.
	47	- The spec file is a working document and is not committed unless requested.
	48	
	49	## Architecture
	50	
	51	One new file, `identity.js`, loaded in `index.html` before `app.js`. It wraps
	52	its internals in an IIFE and exposes one global:
	53	
	54	```js
	55	var AppIdentity = (function () { /* ... */ })();
	56	```
	57	
	58	`app.js` consumes it through that global. Nothing else changes structurally.
	59	
	60	**`identity.js` touches no DOM.** It reads and writes storage and nothing else.
	61	All DOM work — including the consent banner's wiring — lives in `app.js`, which
	62	already owns every DOM reference in the codebase. This boundary is load-bearing
	63	rather than stylistic: the test strategy below loads `identity.js` in Node,
	64	where `document` does not exist, so a DOM reference at module scope would throw
	65	on import.
	66	
	67	### Why not ES modules
	68	
	69	`type="module"` forces CORS rules on, which stops `index.html` from opening
	70	over `file://`, and converts `app.js` to deferred module scope — a behavior
	71	change to code outside this request. Rejected for now; the five-function
	72	interface below is identical under modules, so the conversion stays cheap if
	73	the app later gains a build step.
	74	
	75	### Why not a pluggable storage adapter
	76	
	77	Indirection for a second storage backend that does not exist and a live
	78	consent-change subscription that nothing currently needs. Rejected as YAGNI.
	79	
	80	## Interface
	81	
	82	`AppIdentity` exposes exactly five functions. This is the contract future
	83	forms depend on; everything else is private.
	84	
	85	| Function | Returns | Behavior |
	86	|---|---|---|
	87	| `getConsent()` | `"granted"` \| `"denied"` \| `"unset"` | Current consent state. `"unset"` means never asked. |
	88	| `getUserId()` | `string` \| `null` | The identifier, or `null` whenever consent is not `"granted"`. |
	89	| `grantConsent()` | `string` | Records consent, mints the id if absent, returns it. Idempotent. |
	90	| `revokeConsent()` | `void` | Records `"denied"` and deletes the id. |
	91	| `clear()` | `void` | Removes the record entirely; state returns to `"unset"`. |
	92	
	93	Consent is tri-state rather than boolean because "not yet asked" and "declined"
	94	require different behavior: the first shows the banner, the second must not
	95	re-prompt.
	96	
	97	`revokeConsent()` and `clear()` differ deliberately. Revoking is a user
	98	decision to record and honor; clearing is a reset that allows re-prompting.
	99	The deletion path the consent requirement calls for is `revokeConsent()`.
	100	
	101	`grantConsent()` called while consent is `"denied"` mints a **new** id rather
	102	than restoring the old one — the previous id was deleted at revocation and is
	103	not recoverable. Only `grantConsent()` on an `"unset"` state, or on an already
	104	`"granted"` state, is a no-op-or-reuse. Stated because "idempotent" alone does
	105	not settle the denied-then-granted path.
	106	
	107	## Data Model
	108	
	109	A single `localStorage` key, `app.identity`, holding one JSON object:
	110	
	111	```json
	112	{
	113	  "v": 1,
	114	  "consent": "granted",
	115	  "userId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
	116	  "createdAt": "2026-09-16T12:00:00.000Z"
	117	}
	118	```
	119	
	120	- `v` — schema version. One place to handle format change when server-issued
	121	  ids eventually arrive.
	122	- `consent` — `"granted"` or `"denied"`. Absence of the whole record is what
	123	  represents `"unset"`; `"unset"` is never written.
	124	- `userId` — present only when `consent` is `"granted"`.
	125	- `createdAt` — ISO 8601, set when the id is minted. Diagnostic only; nothing
	126	  reads it for logic.
	127	
	128	**One key, not two.** Separate `consent` and `userId` keys can desync into
	129	"consent revoked, identifier still stored" if a write fails between them —
	130	exactly the state a consent gate exists to prevent. A single object makes the
	131	write atomic from the app's perspective.
	132	
	133	### Identifier generation
	134	
	135	`crypto.randomUUID()` when available; otherwise a v4 UUID assembled from
	136	`crypto.getRandomValues()`. `randomUUID` is restricted to secure contexts while
	137	`getRandomValues` is not, so the fallback preserves the `file://` constraint.
	138	`Math.random()` is not used — it is not a suitable source for identifiers.
	139	
	140	## Error Handling
	141	
	142	| Condition | Behavior |
	143	|---|---|
	144	| `localStorage` throws (Safari private mode, storage disabled, quota) | Degrade to an in-memory record for the page lifetime. The app works; the id does not survive reload. |
	145	| Stored JSON is unparseable | Treat as `"unset"`. Do not throw. |
	146	| Stored `v` is unrecognized | Treat as `"unset"`. Do not throw. |
	147	| `grantConsent()` called when already granted | Return the existing id. Do not mint a new one. |
	148	| `getUserId()` with consent `"denied"` or `"unset"` | Return `null`. Not an error. |
	149	
	150	The governing rule: a storage or consent problem must never break the login
	151	form. Every failure degrades toward "no identifier," never toward an exception.
	152	
	153	## Consent Banner
	154	
	155	A `<div id="consent-banner">` in `index.html`, above the form, hidden by
	156	default. On load, **`app.js`** reveals it only when `getConsent() === "unset"`
	157	— the banner is DOM work, so it belongs with the other DOM work, and
	158	`identity.js` stays loadable in Node.
	159	
	160	- One line of text stating what is stored and why.
	161	- **Accept** → `AppIdentity.grantConsent()`, hide banner.
	162	- **Decline** → `AppIdentity.revokeConsent()`, hide banner.
	163	
	164	A `"denied"` state does not re-show the banner on later loads; only a genuinely
	165	`"unset"` state does. Re-prompting a user who declined is the behavior the
	166	tri-state exists to prevent.
	167	
	168	Styling is minimal and inline. The page has no stylesheet and this spec does
	169	not introduce one.
	170	
	171	## `login` Integration
	172	
	173	```js
	174	function login(username, password, userId = null) {
	175	  console.log("Logging in:", username, "userId:", userId);
	176	  // Stub: would POST to API_ENDPOINT in real app
	177	  return { success: true, user: username, userId };
	178	}
	179	```
	180	
	181	The call site at `app.js:23` becomes:
	182	
	183	```js
	184	const result = login(username, password, AppIdentity.getUserId());
	185	```
	186	
	187	`userId` is third and optional so existing and future callers without an id
	188	keep working. A `null` `userId` is logged as `null` and is not an error — it is
	189	the ordinary state for a user who declined, and a consent decision that broke
	190	login would be no decision at all.
	191	
	192	`validateForm` is unchanged. The identifier is not a form field and must not
	193	become a required one.
	194	
	195	## Testing
	196	
	197	`node --test`, wired as `"test": "node --test"` in `package.json`.
	198	
	199	`identity.js` gains a two-line tail so it loads in both browser and test:
	200	
	201	```js
	202	if (typeof module !== "undefined") { module.exports = AppIdentity; }
	203	```
	204	
	205	Tests inject a fake `localStorage` on `globalThis`. The "reload" case is
	206	simulated by deleting the module from `require.cache` and re-requiring it
	207	against the same fake storage object — that re-runs the IIFE exactly as a fresh
	208	page load would, which is the behavior under test.
	209	
	210	| Case | Expected |
	211	|---|---|
	212	| No stored record | `getConsent() === "unset"`, `getUserId() === null` |
	213	| `grantConsent()` | Returns a non-empty id; `getConsent() === "granted"` |
	214	| Reload with same storage | `getUserId()` returns the same id (persistence) |
	215	| `grantConsent()` twice | Same id both times (idempotent) |
	216	| `revokeConsent()` | `getUserId() === null`, `getConsent() === "denied"` |
	217	| `grantConsent()` after `revokeConsent()` | Returns a new id, different from the revoked one |
	218	| `clear()` | `getConsent() === "unset"` |
	219	| Corrupt JSON in storage | Reads as `"unset"`, no throw |
	220	| Unknown `v` in storage | Reads as `"unset"`, no throw |
	221	| Storage throws on every access | `grantConsent()` still returns a usable id |
	222	
	223	**Not unit-tested:** the banner and DOM wiring. Covering those needs a DOM
	224	harness, which means the dependency that was explicitly declined. They will be
	225	verified manually in a browser, and this gap is stated rather than implied.
	226	
	227	## Out of Scope
	228	
	229	- Event recording — where login events accumulate. Separate spec, once a real
	230	  endpoint exists.
	231	- Any network call. `API_ENDPOINT` remains an unused stub.
	232	- Server-issued identity and reconciliation with client-minted ids. The `v`
	233	  field is the forward hook; no migration is designed here.
	234	- Cross-device or cross-browser identity. Out of reach by construction.
	235	- Linting and formatting configuration.
	236	
	237	## Open Assumptions
	238	
	239	- Assumption: an in-page banner is sufficient consent for this app's
	240	  jurisdiction and audience; validate with whoever owns privacy requirements
	241	  before this reaches real users.
	242	- Assumption: `package.json` declaring `main: src/index.js` while `index.html`
	243	  loads only `app.js` is pre-existing and intentional; validate by asking
	244	  before touching `src/`. Nothing in this spec changes `src/`.
	245	
	246	## Files Touched
	247	
	248	| File | Change |
	249	|---|---|
	250	| `identity.js` | New. The module. DOM-free. |
	251	| `index.html` | Add banner markup; add `<script src="identity.js">` before `app.js`. |
	252	| `app.js` | `login` gains optional third parameter; call site passes `AppIdentity.getUserId()`; banner show/hide and button wiring. |
	253	| `package.json` | Add `"scripts": { "test": "node --test" }`. |
	254	| `test/identity.test.js` | New. The cases above. |


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T005143Z-1551/home/.cache/hyperpowers/codex-review/727249acbfc7b6fe83da151efc90583530b40f73/run-KMsoDKwx/approach-context.md

	1	# Approach Context
	2	
	3	## The original idea, verbatim
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	**Q: What does "track who logged in" need to actually do here?**
	10	A: "It should work across the app, and it should persist. Other forms will need it later too."
	11	
	12	**Q: Where should the userId come from?** (options offered: client-generated / server-issued / derived from username / client-now-server-later)
	13	A: Client-generated — the app mints an opaque id and reuses it.
	14	
	15	**Q: How should the userId persist?** (options offered: localStorage / cookie / sessionStorage)
	16	A: localStorage.
	17	
	18	**Q: Does this need a consent gate and a way to clear the id?** (options offered: design it in / note it as a gap / out of scope)
	19	A: Yes, design it in — no id is created before consent, and there must be a documented way to clear it.
	20	
	21	**Q: What should this first spec cover?** (options offered: identity only / identity + event recording)
	22	A: Identity only. Event recording stays as-is and gets its own spec once a real endpoint exists.
	23	
	24	**Q: How does the user give consent?** (options offered: simple banner / API only / reuse existing mechanism)
	25	A: A simple accept/decline banner in the existing page.
	26	
	27	## Codebase facts
	28	
	29	Repository is a small static webapp fixture. Full file inventory (excluding `.git`):
	30	`index.html`, `README.md`, `package.json`, `app.js`, `src/index.js`, `src/utils.js`.
	31	
	32	No build step, no bundler, no module system in use. `index.html` loads `app.js`
	33	with a plain `<script src="app.js">` tag. No `type="module"` anywhere.
	34	
	35	No test framework, no test files, no test script. `package.json` is:
	36	
	37	```json
	38	{
	39	  "name": "drill-test-project",
	40	  "version": "1.0.0",
	41	  "description": "Test project for Drill scenarios",
	42	  "main": "src/index.js"
	43	}
	44	```
	45	
	46	Note `package.json` declares `main: src/index.js`, but `index.html` does not
	47	load anything from `src/`. The browser app is `app.js` only.
	48	
	49	No dependencies of any kind. No linter or formatter configured.
	50	
	51	`app.js` in full (29 lines):
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
	84	`index.html` in full (15 lines):
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
	104	`API_ENDPOINT` is never fetched; `login` is a stub returning a hardcoded object.
	105	There is no server component in this repository and no auth backend.
	106	
	107	`login` is called exactly once, from the submit handler above. Nothing else in
	108	the repo references it. The submit handler reads only `username` and `password`
	109	from the DOM; no identifier distinct from the username exists anywhere today.
	110	
	111	All functions in `app.js` are declared at top-level script scope (implicit
	112	globals), which is the existing pattern.
	113	
	114	## Constraints derived from the answers
	115	
	116	- The identifier must be readable and writable from anywhere in the app, and
	117	  future forms (which do not exist yet) are expected consumers.
	118	- It must survive page reload and browser restart.
	119	- It must not exist before consent is granted, which means consumers must
	120	  handle the "no identifier" state.
	121	- There must be a way to clear it.
	122	- Only the identity mechanism plus threading it into `login` is in scope.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
