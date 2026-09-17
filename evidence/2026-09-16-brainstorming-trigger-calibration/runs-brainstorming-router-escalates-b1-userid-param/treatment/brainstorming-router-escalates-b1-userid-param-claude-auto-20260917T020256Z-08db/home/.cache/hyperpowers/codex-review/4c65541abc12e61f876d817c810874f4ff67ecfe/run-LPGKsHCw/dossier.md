# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T020256Z-08db/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-persistent-user-id-design.md

	1	# Persistent User Identifier — Design
	2	
	3	Date: 2026-09-16
	4	Status: approved for planning
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The webapp needs to know which user performed an action so logins can be
	10	attributed. The originating request was "add a `userId` parameter to the login
	11	function", but the repository has no user identifier of any kind: the login form
	12	collects only `username` and `password`, and `login()` in `app.js` is a
	13	synchronous stub that never contacts a server.
	14	
	15	The identifier must be app-wide, must persist across visits, and must be
	16	available to forms that do not exist yet. That makes this a new identity
	17	subsystem with a persisted data format, not a parameter addition.
	18	
	19	## Key design conclusion
	20	
	21	With a server-assigned identifier, `userId` is an **output** of login, not an
	22	input. On a first login the client has no identifier; the server issues one in
	23	the response. `login()` therefore keeps its two parameters and grows its return
	24	value. Passing a stored identifier *into* login (for return-visit correlation)
	25	was considered and deliberately deferred — it adds a client-controlled value the
	26	server cannot trust, in exchange for a capability nobody asked for.
	27	
	28	## Decisions
	29	
	30	| Decision | Choice | Rationale |
	31	|---|---|---|
	32	| What the ID identifies | Server-assigned account ID | Trustworthy server-side and genuinely per-person, unlike a client-minted device ID. |
	33	| Backend | Stub retained; contract pinned here | No real endpoint exists. All client logic is real and tested; only the network call is faked. |
	34	| Storage | `localStorage`, key `app.userId` | Survives restart, readable by all forms. |
	35	| Security posture | Correlation key only, never an auth credential | Any script on the origin can read or forge it. |
	36	| Tracking scope | Attach only | `userId` rides along in request payloads. No client-side event collector. |
	37	| Module system | `"type": "module"` in `package.json` | One convention repo-wide; avoids the `.mjs` MIME-type footgun. |
	38	| Test tooling | `node:test` + `node:assert` | Zero dependencies, matching the repo's empty dependency list. |
	39	
	40	## Architecture
	41	
	42	### `identity.js` (new, repo root)
	43	
	44	The only code permitted to touch `localStorage`.
	45	
	46	```
	47	getUserId()    -> string | null
	48	setUserId(id)  -> void    (throws TypeError on empty or non-string input)
	49	clearUserId()  -> void
	50	```
	51	
	52	Placed at the repo root beside `app.js`. It does not belong in `src/`, which
	53	holds an unrelated CommonJS `greet` helper that the page never loads.
	54	
	55	**Storage injection.** The module exports a factory, `createIdentity(storage)`,
	56	returning an object with the three functions above, plus a default instance bound
	57	to `globalThis.localStorage` whose methods are re-exported as the module's named
	58	exports. Application code imports the named exports and never sees the factory;
	59	tests call the factory with a fake. This exists for a concrete reason: Node
	60	provides no `localStorage`, so without it the unit tests would require jsdom — a
	61	dependency this repo does not have and does not need.
	62	
	63	Binding at module load must not throw in an environment without
	64	`globalThis.localStorage`; an absent backend is treated the same as a throwing
	65	one (in-memory fallback).
	66	
	67	**Stored format.** A bare string under `app.userId`, not a JSON envelope. The
	68	value is a single opaque token; a version wrapper would buy migration headroom
	69	against a migration that may never happen. If the format must change later, the
	70	key name is the version lever: write `app.userId.v2`, read both keys during a
	71	transition, then drop the old one.
	72	
	73	**Security note (must appear in the module header).** This identifier is a
	74	correlation key. Any script on the origin can read or forge it, so it must never
	75	be used to authenticate a request or authorize access. If it ever needs to carry
	76	authority, it moves to an `httpOnly` cookie set by the server and the client
	77	stops reading it.
	78	
	79	### `login()` contract
	80	
	81	```
	82	POST  https://api.example.com/login
	83	body  { "username": string, "password": string }
	84	
	85	200   { "success": true,  "user": string, "userId": string }
	86	        userId: opaque, non-empty, server-assigned, stable per account.
	87	                Clients must not parse it or derive meaning from it.
	88	4xx   { "success": false, "error": string }     // no userId field
	89	```
	90	
	91	`login()` becomes `async` **now**, while still stubbed, and the submit handler
	92	`await`s it. A real `fetch` is asynchronous; making the function synchronous
	93	today would mean that adding the network call later changes both the signature
	94	and every call site. Converting now costs two keywords and reduces the eventual
	95	swap to a body-only edit.
	96	
	97	The stub returns the contract shape above with a fixed placeholder `userId`, so
	98	the storage path is exercised end to end from the first commit.
	99	
	100	### Data flow
	101	
	102	1. Submit handler validates the form (unchanged, `validateForm`).
	103	2. Handler `await`s `login(username, password)`.
	104	3. On `success: true` with a valid `userId`, the handler calls
	105	   `identity.setUserId(result.userId)`.
	106	4. Later forms read the value with `identity.getUserId()` and include it in
	107	   their request payloads.
	108	
	109	## Error handling
	110	
	111	| Condition | Behavior |
	112	|---|---|
	113	| `localStorage` throws (private browsing, disabled by policy, quota) | Fall back to a module-level in-memory value; `console.warn` once. The visit works; the value is forgotten on reload. |
	114	| Login returns `success: false` | Write nothing. Leave any existing stored ID untouched — a failed attempt must not wipe a valid identity. |
	115	| Success response missing or malformed `userId` | Contract violation: warn, leave the stored value unchanged, and still treat the login as successful. Missing tracking data must never fail a user's login. |
	116	| `setUserId` called with empty or non-string input | Throw `TypeError`. This is a programmer error and should be loud. |
	117	
	118	## Changes to existing files
	119	
	120	- `app.js` — `login()` becomes `async` and returns `userId`; the submit handler
	121	  becomes `async`, `await`s login, and calls `identity.setUserId()`.
	122	- `index.html` — the script tag becomes `type="module"`.
	123	- `package.json` — add `"type": "module"` and `"scripts": { "test": "node --test" }`.
	124	- `src/index.js`, `src/utils.js` — converted from CommonJS to ESM (four lines
	125	  total). Required by the package-wide `"type": "module"`, and explicitly
	126	  approved despite being outside the original request.
	127	
	128	## Testing
	129	
	130	Runner: `node --test` using `node:test` and `node:assert`. No new dependencies.
	131	
	132	Covered:
	133	
	134	- `getUserId` returns `null` when nothing is stored.
	135	- `setUserId` / `getUserId` round-trip.
	136	- `clearUserId` removes the value.
	137	- `setUserId` throws `TypeError` on `""`, `null`, `undefined`, and non-strings.
	138	- A storage backend that throws on read and on write falls back to in-memory,
	139	  and `getUserId` still returns the value set during that session.
	140	- The in-memory fallback does not survive a fresh module instance.
	141	- The login stub resolves to the pinned contract shape and is awaitable.
	142	
	143	**Known gap.** The DOM submit handler in `app.js` is not covered. End-to-end
	144	browser testing was considered and declined as disproportionate for a six-file
	145	fixture. The wiring between `login()`'s return value and `setUserId()` is
	146	verified by reading, not by an automated test. If the handler grows further
	147	logic, revisit this.
	148	
	149	## Out of scope
	150	
	151	- Any analytics or audit event collector. "Tracking" here means the identifier
	152	  is attached to request payloads; recording is a server-side concern.
	153	- Logout and session lifecycle. `clearUserId()` exists for a future logout path
	154	  but nothing calls it yet.
	155	- Passing a stored `userId` into `login()` for return-visit correlation.
	156	- Linting and formatting infrastructure, and end-to-end tests.
	157	- Any change to the real backend, which does not exist.
	158	
	159	## Assumptions
	160	
	161	- Assumption: the eventual backend can return an opaque per-account identifier
	162	  on successful login; validate by review of this contract with whoever builds
	163	  the endpoint, before the stub is replaced.
	164	- Assumption: no privacy-consent gate is required before persisting an
	165	  identifier for this application; validate with whoever owns the product's
	166	  privacy posture. Persisting a durable user identifier in browser storage is a
	167	  tracking behavior and may carry disclosure obligations depending on
	168	  jurisdiction and audience.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260917T020256Z-08db/home/.cache/hyperpowers/codex-review/4c65541abc12e61f876d817c810874f4ff67ecfe/run-LPGKsHCw/adjudications.md

	1	# Approved design decisions (user-adjudicated during brainstorming)
	2	
	3	Original request, verbatim:
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	The task was classified bounded, then upgraded to architectural when the user
	8	clarified the identifier does not exist yet, must persist, and must be reusable
	9	by forms that do not exist.
	10	
	11	Decisions the user explicitly chose (each presented with alternatives and
	12	tradeoffs; the user selected these):
	13	
	14	1. **ID anchor** — server-assigned account ID. Rejected: client-minted device
	15	   ID; per-session-only ID.
	16	2. **Backend** — no real endpoint exists; keep the client-side stub but return
	17	   the real response shape and pin the contract in the spec. Rejected: writing a
	18	   live fetch; treating backend changes as in scope.
	19	3. **Storage** — `localStorage`. Rejected: JS-readable cookie; `httpOnly`
	20	   cookie (the latter rejected because client forms must read the value).
	21	   Recorded constraint: the value is a correlation key, never an auth credential.
	22	4. **Tracking scope** — attach-only; `userId` rides in request payloads. Rejected:
	23	   a client-side analytics/audit event collector (explicitly deferred to a
	24	   separate spec); console-logging-only.
	25	5. **Approach** — approach A: identity module owns storage; `userId` flows OUT of
	26	   `login()` in its return value. Rejected: approach B (`userId` as an optional
	27	   third input for return-visit correlation); approach C (options-object
	28	   signature). Note: approach A means the literal "add a userId parameter" is
	29	   NOT implemented; the user was told this explicitly and chose A anyway.
	30	6. **Tooling** — unit tests only. Explicitly declined: lint/format
	31	   infrastructure; end-to-end browser tests.
	32	7. **Module system** — `"type": "module"` in `package.json`, accepting the
	33	   conversion of the two unrelated `src/` CommonJS files. Rejected: `.mjs`
	34	   extension (MIME risk); browser-global convention.
	35	
	36	The user approved the architecture, data model, and login contract sections
	37	before the spec was written.
	38	
	39	## Codebase facts
	40	
	41	- Six-file fixture webapp; no build system, bundler, linter, or test runner.
	42	- `package.json` has no dependencies, devDependencies, or scripts.
	43	- `app.js` is a browser-global script: `login(username, password)` is a
	44	  synchronous stub with one caller at `app.js:23` inside the form submit handler.
	45	- `src/index.js` / `src/utils.js` are an unrelated CommonJS `greet` pair that the
	46	  page never loads.
	47	- No existing storage-access code, no logout path, no session concept, no other
	48	  forms yet.
	49	- Branch `feature/webapp-enhancement`; working tree was clean at start.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
