# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T183645Z-8b8c/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-client-identity-design.md

	1	# Client Identity Design
	2	
	3	Date: 2026-09-30
	4	Status: Approved design, pending implementation plan
	5	
	6	## Problem
	7	
	8	The request was "add a `userId` parameter to the `login` function so we can
	9	track who logged in", extended with "it should work across the app and
	10	persist — other forms will need it later".
	11	
	12	Taken literally the request is not implementable. `login` lives at `app.js:4`
	13	and its only caller is the submit handler at `app.js:23`, which reads the two
	14	fields the form has: `username` and `password` (`index.html:9-10`). No
	15	`userId` exists anywhere in the repository for that caller to pass. More
	16	fundamentally, a user ID is something authentication *establishes*; a client
	17	that supplies one before the call is asserting an identity nothing has
	18	verified.
	19	
	20	What the request actually needs is an identity capability: the server
	21	establishes who the user is, that identity survives navigation, any part of
	22	the app can read it, and logins are recorded.
	23	
	24	## Decisions
	25	
	26	Five decisions were settled with the human partner before this document was
	27	written. They are fixed inputs, not open questions.
	28	
	29	1. **Identity is server-held; the client copy is non-authoritative.** Login
	30	   sets an httpOnly session cookie. JavaScript keeps `userId` only for display
	31	   and never as a credential.
	32	2. **Scope is client plus contract plus test fake.** No backend is built in
	33	   this repository. This document specifies what the backend must do.
	34	3. **Login events are recorded server-side only.** No client tracking module,
	35	   no analytics endpoint.
	36	4. **The client re-learns `userId` via a `GET /me` call.** No `localStorage`
	37	   mirror of the identity.
	38	5. **Consumers read identity through a memoized promise.** `Auth.getUser()`
	39	   returns a shared promise; the not-yet-known window is unrepresentable
	40	   because the value cannot be read without awaiting it.
	41	
	42	## Global Constraints
	43	
	44	- **Unit tests.** `node:test` as the runner, with `scripts` added to
	45	  `package.json`. Every behaviour in "Error Handling" and "Test Coverage"
	46	  below has a test.
	47	- **Lint and format.** ESLint + Prettier, the stack standard, configured
	48	  before the new code is written.
	49	- No end-to-end tests: with no backend, they would exercise the same fake the
	50	  unit tests use.
	51	- No fuzz or mutation testing at this size.
	52	- The repository has no bundler and `index.html` loads scripts with plain
	53	  `<script src>` tags. New browser code follows that idiom — a window global,
	54	  not an ES module.
	55	
	56	## Architecture
	57	
	58	### `auth.js` (new)
	59	
	60	The identity module, attached as `window.Auth`, loaded before `app.js`.
	61	
	62	| Member | Signature | Behaviour |
	63	|---|---|---|
	64	| `Auth.login` | `async (username, password)` | `POST` to the login endpoint with `credentials: "include"`. Resolves `{success: true, userId, username}` or `{success: false, error}`. Updates the memo on success. |
	65	| `Auth.getUser` | `async ()` | Resolves `{userId, username}` or `null`. Memoized per page. When the memo is already determined — including immediately after a successful `login` — it resolves from the memo and issues no request. |
	66	| `Auth.logout` | `async ()` | `POST` to logout, then resets the memo to `null`. On transport failure it throws, and the memo is still reset to `null`: the client must not keep displaying an identity the user has asked to drop. |
	67	
	68	Internal state is two variables:
	69	
	70	- `cachedUser` — three states: `undefined` (not yet determined), `null`
	71	  (determined: anonymous), object (determined: known). The three-state cache
	72	  is what allows `null` to mean a real answer rather than "haven't asked".
	73	- `inFlight` — the shared `/me` promise, so N concurrent callers produce one
	74	  request.
	75	
	76	### `app.js` (modified)
	77	
	78	The local `login` stub is deleted. The submit handler becomes `async` and
	79	awaits `Auth.login(...)`. `validateForm` is unchanged. `API_ENDPOINT` moves
	80	into `auth.js` to sit alongside the other endpoint constants.
	81	
	82	Note that `login` gains **no `userId` parameter**. It returns one. This
	83	inverts the original request and is the point of decision 1.
	84	
	85	### `index.html` (modified)
	86	
	87	One added line: `<script src="auth.js"></script>` before `app.js`.
	88	
	89	## Invariants
	90	
	91	1. **`userId` is display data, never a credential.** The cookie proves
	92	   identity. A future form that attaches `userId` to a request as
	93	   authorization has broken the model.
	94	2. **A successful `login` overwrites the memo.** A page that called
	95	   `getUser()` while logged out has cached `null`; without the overwrite the
	96	   user stays invisibly anonymous after logging in.
	97	3. **A failed login never clobbers an existing valid memo.** A bad re-auth
	98	   attempt must not discard a session that is still good.
	99	4. **Cache lifetime is exactly the page's lifetime.** Nothing is written to
	100	   `localStorage`, `sessionStorage`, or any readable cookie.
	101	
	102	## Data Flow
	103	
	104	1. **Page load** — nothing fires. `/me` is lazy, issued on the first
	105	   `Auth.getUser()`.
	106	2. **Login** — submit → `validateForm` (unchanged) → `await Auth.login(u, p)`
	107	   → server sets the cookie, writes the audit record, returns
	108	   `{userId, username}` → memo updated → handler logs the result.
	109	3. **Reload or another page** — first consumer calls `Auth.getUser()` →
	110	   `GET /me` carries the cookie → `{userId, username}` or `401` → memo
	111	   updated → all waiting consumers resolve.
	112	4. **Logout** — `POST /logout` → server clears the session → memo reset to
	113	   `null`.
	114	
	115	## Backend Contract
	116	
	117	Not built here. Stated so that whoever builds it can satisfy it exactly.
	118	
	119	| Endpoint | Request | Success | Failure |
	120	|---|---|---|---|
	121	| `POST /login` | `{username, password}` | `200` `{userId, username}` + `Set-Cookie` | `401` `{error}` |
	122	| `GET /me` | cookie only | `200` `{userId, username}` | `401`, body ignored |
	123	| `POST /logout` | cookie only | `204`, cookie cleared | idempotent, never errors |
	124	
	125	Session cookie: `HttpOnly; Secure; Path=/`, server-chosen lifetime.
	126	
	127	**Audit clause.** The server records every login *attempt*: `userId` on
	128	success or the attempted username on failure, timestamp, outcome, source IP,
	129	and user agent. Recording failures is the more important half — a log of only
	130	successful logins cannot reveal a brute-force attempt. This clause is the
	131	entire fulfilment of "track who logged in".
	132	
	133	### Assumption: same-origin API
	134	
	135	`API_ENDPOINT` currently points at `https://api.example.com/login`, a
	136	different origin from the page. Cross-origin cookies require `SameSite=None`
	137	plus CORS `Access-Control-Allow-Credentials: true` and an exact-origin
	138	`Access-Control-Allow-Origin` — the `*` wildcard is rejected when credentials
	139	are involved.
	140	
	141	**This design assumes the API is served same-origin, reverse-proxied under
	142	`/api`, so the session cookie is first-party with `SameSite=Lax`.**
	143	
	144	*Risk if that assumption does not hold:* `SameSite=None` cookies are
	145	third-party cookies, and browsers are actively restricting them. A
	146	cross-origin deployment would work today and degrade without warning as that
	147	tightens. The client code is identical either way — only the endpoint
	148	constants change — so this is a deployment decision owned by whoever builds
	149	the backend. It is recorded here to make that decision visible rather than
	150	implicit.
	151	
	152	## Error Handling
	153	
	154	The governing distinction: a wrong password is a normal outcome, a dead
	155	network is not.
	156	
	157	- `Auth.login` resolves `{success: false, error}` on `401`. It **throws** only
	158	  on transport failure or `5xx`.
	159	- `Auth.getUser` resolves `null` on `401`. That is an answer, not an error.
	160	- `Auth.getUser` on network failure **rejects and clears `inFlight` without
	161	  caching**. If a transient blip were cached as `null`, every consumer on the
	162	  page would render logged-out until reload, and the UI would misreport a
	163	  session that is alive. Failure must stay retryable.
	164	- Concurrent `getUser()` callers during a failure share the rejection, and the
	165	  memo is left unset so the next call retries.
	166	
	167	## Test Coverage
	168	
	169	The **test fake** is a `fetch` stub holding a fake session store that honours
	170	`credentials: "include"` as a browser would. Required cases:
	171	
	172	1. `login` success returns `{success: true, userId, username}` and sets the memo.
	173	2. `login` credential rejection returns `{success: false, error}`.
	174	3. `login` transport failure throws.
	175	4. `login` failure leaves an existing valid memo intact (invariant 3).
	176	5. `login` after a `null`-cached `getUser()` overwrites the memo (invariant 2).
	177	6. `getUser` rehydrates `{userId, username}` after a simulated reload.
	178	7. `getUser` resolves `null` when unauthenticated.
	179	8. N concurrent `getUser()` callers produce exactly one request.
	180	9. `getUser` network failure rejects, caches nothing, and the next call retries.
	181	10. Concurrent `getUser()` callers during a network failure all share the one
	182	    rejection.
	183	11. `getUser` after a successful `login` resolves from the memo and issues no
	184	    request.
	185	12. `logout` resets the memo to `null`.
	186	13. `logout` transport failure throws and still resets the memo to `null`.
	187	
	188	## Out of Scope
	189	
	190	- Building the backend, session store, or audit sink.
	191	- Client-side analytics or behavioural tracking (decision 3).
	192	- Reacting to mid-session expiry. The subscription model was considered and
	193	  declined; expiry is discovered on the next request. Migrating to a
	194	  subscription model later would touch consumers — this cost was accepted
	195	  knowingly.
	196	- The additional forms and pages. None exist yet; this design exists so they
	197	  have something to consume.
	198	- `src/index.js` and `src/utils.js`, a separate CommonJS Node entry point
	199	  unconnected to the webapp.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T183645Z-8b8c/home/.cache/hyperpowers/codex-review/af0fdf4d50bbf7fbb8ab2e5ffcc2af0ca98104d9/run-7CopyFjg/approach-context.md

	1	# Approach Context
	2	
	3	## Original idea (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	Follow-up from the same partner, verbatim:
	8	
	9	> Go with your recommendation. It should work across the app and persist — other forms will need it later.
	10	
	11	## Clarifying questions and answers
	12	
	13	**Q1. Should the persisted user ID be authoritative (sent as proof of identity) or a non-authoritative convenience copy?**
	14	A: Server-held session with a client display copy. Login sets an httpOnly cookie; the browser attaches it to later requests. JavaScript keeps the `userId` only for display and audit purposes, never as a credential.
	15	
	16	**Q2. Does this work include building the backend, or defining its contract and building the client against it?**
	17	A: Client plus contract plus test fake. Build the client-side identity module, `login` returning the server's `userId`, and a fake that emulates cookie behaviour so the client is testable now. The spec documents what the real backend must do. No backend is built in this repo.
	18	
	19	**Q3. Where should login events be recorded?**
	20	A: Server-side audit only. One clause in the backend contract. No client-side tracking module, no analytics endpoint.
	21	
	22	**Q4. How should the client re-learn the userId after a page reload?**
	23	A: A `/me` call on page load. The server is the single source of truth; no `localStorage` mirror of the identity.
	24	
	25	## Codebase facts
	26	
	27	Repository root contains:
	28	
	29	- `index.html` — single page. One form, `id="login-form"`, with `<input id="username">`, `<input id="password">`, and a submit button. Loads the script with a plain `<script src="app.js"></script>` tag. No module type attribute, no bundler, no framework, no import map.
	30	- `app.js` — the whole webapp, 28 lines, browser globals only (no `import`/`export`, no `require`). Contents:
	31	  - `const API_ENDPOINT = "https://api.example.com/login";` (module-level constant, never used)
	32	  - `function login(username, password)` — a stub. Body is `console.log("Logging in:", username);` then `return { success: true, user: username };`. It performs no network call and is synchronous.
	33	  - `function validateForm(formData)` — returns `{valid:false,error:"Missing required fields"}` when username or password is empty, else `{valid:true}`.
	34	  - A `submit` listener registered directly at top level via `document.getElementById("login-form").addEventListener(...)`. It preventDefaults, reads both input values, calls `validateForm`, and on success calls `login(username, password)` and `console.log`s the result. This is the only call site of `login`.
	35	- `src/index.js` and `src/utils.js` — a separate CommonJS Node entry point (`require('./utils')`, `module.exports`). `src/index.js` calls `greet('world')` and logs it. Not referenced by `index.html` and unconnected to the webapp.
	36	- `package.json` — `{"name":"drill-test-project","version":"1.0.0","main":"src/index.js"}`. No `scripts` field, no `dependencies`, no `devDependencies`, no `"type"` field.
	37	- `README.md` — three lines, no build or run instructions.
	38	
	39	Other facts:
	40	
	41	- No test framework, test directory, or test file exists anywhere in the repo.
	42	- No linter, formatter, or CI configuration exists.
	43	- No server, no API code, no session handling, no storage access (`localStorage`/`sessionStorage`/`document.cookie` appear nowhere).
	44	- Git working tree is clean; branch `feature/webapp-enhancement`; 4 commits, most recent `df69c0e Add simple webapp fixture`.
	45	
	46	## Constraints
	47	
	48	- The partner stated the identity must "work across the app and persist", and that "other forms will need it later". Only one form exists today; the additional forms and additional pages do not exist yet.
	49	- Because the session cookie is httpOnly, client JavaScript cannot read it. The client can learn the `userId` only from a server response.
	50	- The backend does not exist and is not being built here, so anything requiring a live server must be exercised through the test fake.
	51	
	52	## What to produce
	53	
	54	Propose 2-3 genuinely different ways to structure the **client-side** identity capability given the above: how the `userId` is obtained and held, how `login` and the existing submit handler change, and — importantly — how forms and pages that do not exist yet consume the current identity.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
