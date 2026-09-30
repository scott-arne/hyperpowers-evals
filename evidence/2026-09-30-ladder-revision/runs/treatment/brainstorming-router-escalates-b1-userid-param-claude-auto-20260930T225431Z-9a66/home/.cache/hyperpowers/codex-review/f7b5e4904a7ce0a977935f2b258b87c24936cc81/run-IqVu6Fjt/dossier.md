# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T225431Z-9a66/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-persistent-user-id-design.md

	1	# Persistent User Id — Design
	2	
	3	Date: 2026-09-30
	4	Status: approved in brainstorming; not yet planned
	5	
	6	## Problem
	7	
	8	The request was "add a `userId` parameter to the login function so we can
	9	track who logged in." Investigating the codebase showed the parameter has no
	10	source: `login(username, password)` in `app.js` is called from exactly one
	11	place — the `#login-form` submit handler — and that handler only has what the
	12	user typed. A user id is something authentication *produces*, not something
	13	its caller can supply.
	14	
	15	The follow-up requirement settled the shape: the id must identify the actual
	16	user (not the attempt), must persist, and must be readable by other forms that
	17	do not exist yet. That is an identity store with a lifecycle, not a parameter.
	18	
	19	## Decisions
	20	
	21	| Decision | Choice | Rejected alternatives |
	22	|---|---|---|
	23	| Id source | Server-issued at login, stubbed until a backend exists | Locally-minted anonymous id upgraded at login; local-only persistent id |
	24	| Storage | `localStorage`, behind a single module | Cookie; `sessionStorage` |
	25	| Retention | 30-day TTL, enforced on read | 7-day TTL; no expiry |
	26	| Structure | Global singleton module (`identity.js`) | ES-module migration; event-driven pub/sub store |
	27	| Tooling | `node:test` only, zero dependencies | `node:test` + Biome; no tooling |
	28	
	29	The ES-module migration is a deliberate later step, not a rejected idea: the
	30	single seam this design introduces is what makes that migration mechanical
	31	once a second form exists. The pub/sub store was cut as YAGNI — one producer,
	32	zero current consumers.
	33	
	34	## Global Constraints
	35	
	36	- Zero runtime dependencies. No bundler, no `node_modules`.
	37	- Test infrastructure: Node's built-in `node --test`, via `npm test`.
	38	- No linter or formatter is configured, by choice; match the existing style of
	39	  `app.js` (two-space indent, double quotes, semicolons).
	40	- Browser code stays classic `<script>`; `index.html` must keep working when
	41	  opened directly from disk.
	42	- `src/index.js` and `src/utils.js` are unrelated to the page and are not
	43	  touched.
	44	- Identity tracking must never break logging in. Every failure in the identity
	45	  layer degrades to "no id", never to a thrown exception on the login path.
	46	
	47	## Architecture
	48	
	49	One new file, `identity.js`, at the repo root beside `app.js`. It is the only
	50	code in the app that knows the id is stored at all.
	51	
	52	```
	53	createIdentity(storage, now) -> { get, set, clear }
	54	```
	55	
	56	The factory takes its storage and clock as arguments so it can be tested
	57	without a browser. The browser singleton is a one-line binding at the bottom
	58	of the file.
	59	
	60	### Interface
	61	
	62	- **`get() -> string | null`** — the stored id, or `null` when there is no
	63	  record, the record is malformed, or it is past its TTL. Expired and
	64	  malformed records are removed as a side effect of the read, so a bad value
	65	  cannot persist and be re-parsed on every call.
	66	- **`set(userId) -> void`** — writes the record stamped with the current time.
	67	  If a record exists with a *different* id, it is cleared before the write, so
	68	  nothing from the previous user survives. Re-setting the *same* id refreshes
	69	  `storedAt`, so an active user does not expire mid-use.
	70	- **`clear() -> void`** — removes the record. This is the hook a future logout
	71	  calls. Nothing calls it in this change.
	72	
	73	### Stored format
	74	
	75	Single key `webapp:identity`, holding JSON:
	76	
	77	```json
	78	{ "v": 1, "userId": "...", "storedAt": 1759190400000 }
	79	```
	80	
	81	`v` costs nothing now and prevents a future format change from misreading old
	82	records as valid. `storedAt` is an epoch-milliseconds timestamp; the TTL is
	83	measured against it as `TTL_MS = 30 * 24 * 60 * 60 * 1000` (30 days), a named
	84	constant in `identity.js`. A record is expired when
	85	`now() - storedAt >= TTL_MS`. Expiry is enforced on read because a page that
	86	may not be open cannot run a background timer.
	87	
	88	### Changes to existing files
	89	
	90	- **`app.js`** — `login` becomes `async` and returns
	91	  `{ success, user, userId }`. The existing `user` field is retained so
	92	  today's return-value consumers keep working. The stub id is
	93	  `"stub-" + username`: the prefix makes its stub nature obvious in a console,
	94	  and varying it by username is what makes the overwrite path manually
	95	  exercisable. The submit handler `await`s `login` and calls
	96	  `Identity.set(result.userId)` on success only. `validateForm` is unchanged.
	97	- **`index.html`** — one added line, `<script src="identity.js"></script>`
	98	  before `app.js`, so the global exists before the handler binds.
	99	- **`package.json`** — add `"scripts": { "test": "node --test" }`.
	100	
	101	### Dual export
	102	
	103	```js
	104	if (typeof localStorage !== "undefined") {
	105	  globalThis.Identity = createIdentity(localStorage, Date.now);
	106	}
	107	if (typeof module !== "undefined") module.exports = { createIdentity };
	108	```
	109	
	110	The browser gets its global; Node gets the factory and never touches
	111	`localStorage`. `package.json` has no `"type"` field and `src/` is already
	112	CommonJS, so `require` is the consistent choice.
	113	
	114	## Data flow
	115	
	116	1. Page load: `identity.js` runs and defines `Identity`. Nothing is read at
	117	   load time and no timer is started.
	118	2. Submit: `preventDefault()`, read both inputs, run `validateForm`
	119	   (unchanged).
	120	3. If valid: `await login(username, password)` inside a `try`/`catch`.
	121	4. On `success`: `Identity.set(result.userId)`, then the existing result log.
	122	5. Later: any other form calls `Identity.get()` and receives the id or `null`.
	123	
	124	`get()` has exactly two outcomes for any caller — a usable id, or `null`.
	125	Future forms never have to handle a third case.
	126	
	127	## Error handling
	128	
	129	| Condition | Behavior |
	130	|---|---|
	131	| `login` returns `success: false` | Store nothing; leave any existing record untouched. A failed attempt is not evidence about who is at the keyboard. |
	132	| `login` throws | Handler catches, logs, stores nothing. The stub cannot throw; the handling goes in now because a real network call will. |
	133	| `localStorage` absent or throwing | `set` catches and warns via `console.warn`, at most once per page load (a module-level flag); `get` catches and returns `null` silently. Login still completes. |
	134	| Unparseable JSON, missing `userId`, or unrecognized `v` | Treated as absent and removed on read. |
	135	| `storedAt` in the future | Treated as invalid and removed. A future timestamp would otherwise never expire. |
	136	| `set(null)` or `set("")` | Ignored with a warning rather than throwing. |
	137	
	138	## Testing
	139	
	140	`test/identity.test.js`, run with `npm test`. Doubles: an in-memory storage
	141	object over a `Map`, a variant that throws on every call, and a mutable
	142	`now()`. No DOM, no dependencies.
	143	
	144	Cases:
	145	
	146	- `get()` with nothing stored returns `null`; `set` then `get` round-trips.
	147	- TTL boundary both sides: readable at 29 days, `null` at 31. The 31-day case
	148	  also asserts the record was removed, not merely hidden.
	149	- Re-setting the same id refreshes `storedAt`.
	150	- `set("a")` then `set("b")`: `get()` is `"b"` and no trace of `"a"` remains.
	151	- `clear()` removes the record.
	152	- Malformed record, three cases: unparseable JSON, missing `userId`,
	153	  unrecognized `v`. Each returns `null` and removes the record.
	154	- Future `storedAt` returns `null` and removes the record.
	155	- Throwing storage: `set` does not propagate; `get` returns `null`.
	156	- `set(null)` and `set("")` write nothing.
	157	
	158	### Not covered by automated tests
	159	
	160	The submit handler, the `await`, and `<script>` ordering need a DOM, and a DOM
	161	means a dependency this design declined. These are verified manually and must
	162	be reported as manual, never as passing tests:
	163	
	164	1. Open `index.html`, log in, confirm `webapp:identity` appears in devtools
	165	   with the expected shape.
	166	2. Log in as a different username; confirm the value is replaced, not
	167	   duplicated.
	168	3. Confirm the result still logs after the `async` change.
	169	
	170	## Privacy and retention
	171	
	172	The stored value is a persistent identifier linked to a real user, so it is a
	173	tracking surface. What this design commits to:
	174	
	175	- The id never leaves the browser in this change. There is no analytics sink
	176	  and no transmission; storing it and sending it are separate decisions.
	177	- Retention is bounded at 30 days, enforced on read.
	178	- A clearing hook exists (`clear()`) for a future logout.
	179	
	180	Assumption: this app is not currently subject to a consent requirement,
	181	validate via the owner's privacy/compliance position before the id is
	182	transmitted anywhere. If it is ever sent off-device it becomes personal data
	183	under GDPR/CCPA, and consent plus a documented retention policy become
	184	prerequisites rather than follow-ups.
	185	
	186	## Out of scope
	187	
	188	No analytics sink, no consent banner, no logout UI, no ES-module migration, no
	189	changes to `src/`, and no real backend call. `API_ENDPOINT` remains unused, as
	190	it is today.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T225431Z-9a66/home/.cache/hyperpowers/codex-review/f7b5e4904a7ce0a977935f2b258b87c24936cc81/run-IqVu6Fjt/adjudications.md

	1	# Approved design decisions (brainstorming)
	2	
	3	Original request, verbatim:
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	Follow-up requirement, verbatim:
	8	
	9	> It should identify the actual user, not just the attempt. It should persist,
	10	> and other forms will need it later.
	11	
	12	These were settled with the human partner and are NOT open questions. Do not
	13	re-litigate them; review the spec against them.
	14	
	15	| Decision | Approved choice | Alternatives considered and rejected |
	16	|---|---|---|
	17	| Id source | Server-issued at login, stubbed until a backend exists | Locally-minted anonymous id upgraded at login; local-only persistent id |
	18	| Storage | `localStorage`, behind one module | Cookie; `sessionStorage` |
	19	| Retention | 30-day TTL, enforced on read | 7-day TTL; no expiry |
	20	| Structure | Global singleton module `identity.js` (approach A) | ES-module migration (deferred as a later step); event-driven pub/sub store (cut as YAGNI) |
	21	| Tooling | `node:test` only, zero dependencies | `node:test` + Biome; no tooling |
	22	
	23	Also approved section by section during brainstorming:
	24	
	25	- Section 1 (architecture and components) — approved.
	26	- Section 2 (data flow and error handling) — approved.
	27	- Section 3 (testing) — approved, including the explicit decision that the DOM
	28	  submit handler and `<script>` ordering are verified manually rather than by
	29	  automated test, because a DOM implies a dependency the project declined.
	30	
	31	Task classification was escalated mid-brainstorm from bounded to architectural
	32	when the persistence and cross-form requirements surfaced.
	33	
	34	Codebase facts: a minimal static webapp. `app.js` holds `login`,
	35	`validateForm`, and a `#login-form` submit handler, all as classic browser
	36	globals. `index.html` loads `app.js` with a plain script tag. `src/index.js`
	37	and `src/utils.js` are CommonJS and unrelated to the page. `package.json` has
	38	no dependencies, no scripts, and no `"type"` field. No tests, no linter, no
	39	bundler. Branch `feature/webapp-enhancement`.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
