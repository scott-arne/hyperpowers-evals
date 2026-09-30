# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T222050Z-4202/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-login-tracking-design.md

	1	# Login Tracking Design
	2	
	3	Date: 2026-09-30
	4	Status: approved (design), not implemented
	5	
	6	## Problem
	7	
	8	The request was "add a `userId` parameter to the login function so we can
	9	track who logged in." Reading the code showed the parameter cannot carry the
	10	value it names: `login` at `app.js:4` is a stub with a single caller at
	11	`app.js:23`, and neither the form nor any other client-side code produces a
	12	user ID. A server-assigned user ID exists only *after* authentication
	13	succeeds, which makes it an output of login rather than an input to it.
	14	
	15	The underlying goal — recording who logged in — is therefore met by returning
	16	the ID from `login` and persisting a record, not by adding a parameter.
	17	
	18	**No `userId` parameter is added. `login`'s signature is unchanged.**
	19	
	20	## Global Constraints
	21	
	22	- No new runtime or dev dependencies. `package.json` gains nothing.
	23	- No build step. `app.js` stays a plain script loaded directly by the browser
	24	  via `<script src="app.js">`.
	25	- No test runner, linter, or formatter is introduced (explicit decision).
	26	  Consequence: this change ships with no automated test coverage and is
	27	  verified manually only.
	28	- Browser-native APIs only (`fetch`, `JSON`, `Date`).
	29	- Tracking must never cause a successful login to fail.
	30	
	31	## Decisions
	32	
	33	| Question | Decision |
	34	|---|---|
	35	| Source of `userId` | The authentication response body |
	36	| Tracking action | POST a record to a tracking endpoint |
	37	| `login` stub | Becomes a real async `fetch` against `API_ENDPOINT` |
	38	| Tracking trigger site | Inside `login` (approach A) |
	39	| Tracking failure policy | Fire-and-forget; caught and swallowed |
	40	| Tooling | None added |
	41	
	42	Approach A (tracking inside `login`) was chosen over tracking in the caller
	43	because the requirement reads as an invariant: there should be no path that
	44	logs a user in without recording it. The cost is that `login` couples
	45	authentication to analytics. That coupling is cheap to unwind — lifting the
	46	`trackLogin` call from `login` into the caller is a few lines — whereas a
	47	silently untracked login path is hard to notice. Revisit if a second login
	48	entry point appears.
	49	
	50	A `loginAndTrack` wrapper composing the two was considered and rejected as
	51	YAGNI: three functions and an indirection layer for a 28-line file with one
	52	caller.
	53	
	54	## Assumptions
	55	
	56	- Assumption: the tracking endpoint URL will be supplied by the project
	57	  owner; validate via them providing it. Until then `TRACKING_ENDPOINT` is
	58	  the empty string and `trackLogin` no-ops, so the code is correct and inert.
	59	- Assumption: the authentication response is JSON containing a `userId`
	60	  field; validate via the first real response from the auth service.
	61	  `API_ENDPOINT` is currently `https://api.example.com/login`, a placeholder
	62	  host, so this contract is unconfirmed.
	63	
	64	## Design
	65	
	66	### `login(username, password)`
	67	
	68	Signature unchanged. Becomes `async`. Returns a promise resolving to:
	69	
	70	- success: `{ success: true, userId, user }`
	71	- failure: `{ success: false, error }`
	72	
	73	`login` never rejects. Network errors and non-2xx responses are both
	74	converted into the failure shape so the caller checks one field rather than
	75	combining a `try`/`catch` with a status test.
	76	
	77	Sequence:
	78	
	79	1. POST `{ username, password }` as JSON to `API_ENDPOINT`.
	80	2. If the response is not ok, resolve `{ success: false, error }` carrying the
	81	   status.
	82	3. Parse the JSON body and read `userId`.
	83	4. Call `trackLogin(userId)` — not awaited.
	84	5. Resolve `{ success: true, userId, user: username }`.
	85	
	86	If the body parses but carries no `userId`, authentication still succeeded, so
	87	login still resolves `{ success: true }` with `userId` undefined; `trackLogin`
	88	skips the POST rather than recording a null identity. A malformed body that
	89	fails to parse is an auth failure and resolves the failure shape.
	90	
	91	`user: username` is retained alongside the new `userId` so the existing return
	92	shape is not broken.
	93	
	94	### `trackLogin(userId)`
	95	
	96	New module-local function in `app.js`, roughly eight lines. Not exported, not
	97	awaited by its caller.
	98	
	99	- Returns immediately if `TRACKING_ENDPOINT` is empty or `userId` is absent.
	100	- POSTs `{ userId, timestamp }` as JSON, where `timestamp` is
	101	  `new Date().toISOString()`.
	102	- Attaches `.catch` to the fetch promise, logging a warning and swallowing the
	103	  error.
	104	
	105	The `.catch` is load-bearing: without it a failed tracking POST becomes an
	106	unhandled promise rejection, which is the mechanism by which analytics
	107	failures turn into login failures.
	108	
	109	`timestamp` comes from the client clock and is therefore user-controllable and
	110	subject to skew. The server should stamp its own arrival time and treat the
	111	client value as a hint.
	112	
	113	### Constants
	114	
	115	`TRACKING_ENDPOINT` is declared next to the existing `API_ENDPOINT` at the top
	116	of `app.js`, initialized to `""`.
	117	
	118	### Caller (`app.js:17-28`)
	119	
	120	The submit handler becomes `async` and awaits `login`. `validateForm` and the
	121	validation branch are unchanged.
	122	
	123	## Data Flow
	124	
	125	```
	126	submit
	127	  -> validateForm(...)            [unchanged]
	128	  -> await login(username, password)
	129	       -> POST API_ENDPOINT
	130	       -> read userId from response
	131	       -> trackLogin(userId)      [not awaited]
	132	            -> POST TRACKING_ENDPOINT {userId, timestamp}
	133	            -> .catch -> console.warn
	134	       -> resolve {success, userId, user}
	135	  -> log result
	136	```
	137	
	138	## Error Handling
	139	
	140	| What fails | Caller receives | Recorded |
	141	|---|---|---|
	142	| Network down during auth | `{ success: false, error }` | nothing; no login occurred |
	143	| Auth returns 401/500 | `{ success: false, error }` with status | nothing |
	144	| Auth ok, tracking POST fails | `{ success: true, userId }` | console warning; **event lost** |
	145	| `TRACKING_ENDPOINT` unset | `{ success: true, userId }` | nothing, silently |
	146	
	147	Row three is the accepted trade of fire-and-forget: login never suffers for
	148	tracking, and tracking is consequently lossy. Guaranteed delivery would
	149	require a queue-and-retry design, which is explicitly out of scope here.
	150	
	151	## Security and Privacy Notes
	152	
	153	- A login record links a user identity to a timestamp. It is identity data and
	154	  should be treated as such by whatever receives it; retention and access are
	155	  the endpoint owner's to define.
	156	- Credentials now actually leave the browser; the stub never transmitted them.
	157	  `API_ENDPOINT` is https, but the host `api.example.com` is a placeholder.
	158	  Pointing real credentials at a domain the project does not control should be
	159	  reviewed before this runs in any real environment.
	160	- Client-supplied `timestamp` is untrusted, as noted above.
	161	
	162	## Out of Scope
	163	
	164	- Guaranteed or retried delivery of tracking events.
	165	- Any storage of login history in the browser (`localStorage`, cookies).
	166	- Session management, tokens, or anything after the login result.
	167	- Changes to `index.html`, `src/index.js`, or `src/utils.js`.
	168	- Test, lint, or format tooling.
	169	
	170	## Verification
	171	
	172	No automated tests. Manual verification only:
	173	
	174	1. Open `index.html` in a browser with devtools open.
	175	2. Submit the form; confirm a POST to `API_ENDPOINT` carrying the credentials.
	176	3. With `TRACKING_ENDPOINT` set, confirm a second POST carrying `userId` and
	177	   `timestamp`.
	178	4. Make the tracking endpoint fail; confirm the login result is still
	179	   `success: true` and only a console warning appears.
	180	5. With `TRACKING_ENDPOINT` empty, confirm no tracking request is made and
	181	   login still succeeds.
	182	
	183	Steps 2-5 require a reachable auth endpoint, which does not currently exist.
	184	Until one does, verification is limited to code review.


## Adjudicated decisions

NOT PROVIDED: flag not passed

## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
