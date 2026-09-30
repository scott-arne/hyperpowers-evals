# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T211159Z-ab12/coding-agent-workdir/docs/hyperpowers/specs/2026-09-30-client-session-identity-design.md

	1	# Client-Side Session Identity — Design
	2	
	3	Date: 2026-09-30
	4	Status: Approved for planning
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The webapp has no notion of who is using it. `login` (`app.js:4`) is a stub
	10	that logs the typed username to the console and returns it; nothing outlives
	11	the function call. The originating request was "add a `userId` parameter to the
	12	login function so we can track who logged in," but the requirement behind it is
	13	broader: the identity must **identify who logged in, persist, and be readable
	14	across the app**, because forms that do not exist yet will need it.
	15	
	16	A parameter cannot satisfy that. A parameter is an input, and the only caller
	17	(`app.js:23`) has no identifier to pass that it did not already type into the
	18	username field. The identity is something login *establishes*, and the missing
	19	piece is somewhere to put it.
	20	
	21	## Scope
	22	
	23	In scope:
	24	
	25	- A persistent, app-wide client-side identity store.
	26	- Recording the identity when login succeeds.
	27	- An explicit logout path that clears it.
	28	- Unit-test infrastructure and coverage for the store.
	29	
	30	Out of scope:
	31	
	32	- Real authentication. `login` remains a stub; `API_ENDPOINT` is still not
	33	  contacted.
	34	- Changing the `login` signature. It stays `login(username, password)`.
	35	- Server-side session management, tokens, or cookies.
	36	- Lint/format tooling and end-to-end tests (considered and declined).
	37	
	38	## Global Constraints
	39	
	40	1. **The stored identity is self-asserted, not authenticated.** It is whatever
	41	   the user typed into a text input. No server vouches for it, and any user can
	42	   set it to any value via devtools. It is suitable for display, greeting, and
	43	   client-side convenience. It must not gate authorization, and it must not be
	44	   treated as an audit trail, until a backend is vouching for the value. Every
	45	   future consumer is bound by this.
	46	2. **No new runtime dependencies.** `package.json` has none today; the design
	47	   keeps it that way. The test runner is Node's built-in `node:test`
	48	   (Node v26 confirmed present).
	49	3. **No build step and no bundler.** Browser code is loaded as classic scripts,
	50	   as it is today.
	51	4. **`file://` development keeps working.** Opening `index.html` directly must
	52	   continue to function; this is why ES modules were rejected.
	53	5. **`AppSession` methods never throw.** Failure is reported as `null`, never
	54	   as an exception.
	55	6. Testing scope for this work: **unit tests only** (chosen from lint/format,
	56	   unit, e2e, fuzz).
	57	
	58	## Approaches Considered
	59	
	60	Three approaches to how shared code reaches future pages, given that
	61	`index.html:13` loads `app.js` as a classic script with no bundler:
	62	
	63	| Approach | Buys | Costs | Verdict |
	64	|---|---|---|---|
	65	| **A. Namespaced global, classic scripts** | No tooling change; works from `file://`; matches existing code | One global; implicit script load order | **Chosen** |
	66	| **B. Native ES modules** | Real module boundaries; no globals | Module scripts are blocked over `file://`, forcing a local HTTP server; adds a third module convention beside CommonJS `src/` | Rejected — workflow cost without a matching benefit at this size |
	67	| **C. Build toolchain (npm + bundler)** | Conventional; easy deps and runners | A build step, `node_modules`, and config for a page with one form | Rejected — disproportionate today |
	68	
	69	The session module's public interface is identical under all three, so
	70	migrating A → B or A → C later changes how the file is *loaded*, not what it
	71	does. That reversibility is why the lightest option is not a trap.
	72	
	73	A Codex approach consultation was attempted per the brainstorming approach
	74	gate. Preflight reported `ok`, but the resolved companion was a `0.0.0-stub`
	75	build (version `0.0.0-stub`) and the call returned an empty payload. Per the
	76	gate, an incomplete call degrades as absence: no independent approaches were
	77	obtained, and the shortlist above is unaided.
	78	
	79	## Architecture
	80	
	81	A new `session.js`, loaded before `app.js`:
	82	
	83	```html
	84	<script src="session.js"></script>
	85	<script src="app.js"></script>
	86	```
	87	
	88	It is an IIFE exposing a single namespaced global, `window.AppSession`.
	89	
	90	### Interface
	91	
	92	| Method | Returns | Behavior |
	93	|---|---|---|
	94	| `set(username)` | record, or `null` if rejected | Writes the identity record, replacing any existing one |
	95	| `get()` | record or `null` | Reads and validates the record |
	96	| `getUserId()` | string or `null` | Convenience accessor for `record.userId` |
	97	| `clear()` | `void` | Removes the record — this is logout |
	98	| `onChange(fn)` | unsubscribe fn | Invokes `fn` on cross-tab `storage` events for this key |
	99	
	100	### Stored representation
	101	
	102	Key: `appSession.identity`. Value: a JSON record, not a bare string.
	103	
	104	```json
	105	{
	106	  "v": 1,
	107	  "userId": "alice",
	108	  "loginAt": "2026-09-30T14:02:11.000Z",
	109	  "source": "client-asserted"
	110	}
	111	```
	112	
	113	Two fields carry weight beyond the obvious:
	114	
	115	- **`v`** — `localStorage` outlives deploys. Without a version, the first schema
	116	  change meets records written by the previous code with no way to distinguish
	117	  them. Unrecognized versions are treated as absent rather than coerced.
	118	- **`source`** — records in the data itself that no server vouched for this
	119	  value. When real authentication lands it writes `"server"`, and consumers
	120	  that care about trust can discriminate. This is the seam for the backend
	121	  swap.
	122	
	123	`set` rejects a username that is not a non-empty string after trimming: it
	124	stores nothing, leaves any existing record untouched, and returns `null`. This
	125	keeps a record from ever holding an empty or non-string `userId`, which would
	126	otherwise force every consumer to re-validate what it reads. `validateForm`
	127	already blocks empty submissions today, so this is defense in depth rather than
	128	the primary guard.
	129	
	130	### Storage access
	131	
	132	The module reads storage through an injectable reference defaulting to
	133	`globalThis.localStorage`, and ends with a guarded CommonJS export tail
	134	(`if (typeof module !== "undefined") module.exports = ...`). These are the only
	135	two concessions the production file makes to testability, and together they let
	136	the suite run under `node:test` with a fake store rather than jsdom.
	137	
	138	## Data Flow
	139	
	140	1. The submit handler validates input via `validateForm` (unchanged).
	141	2. `login(username, password)` runs — still the stub, still returns
	142	   `{ success, user }`.
	143	3. On success, **the submit handler** calls `AppSession.set(result.user)`.
	144	4. Any later form reads `AppSession.getUserId()`.
	145	5. A logout control calls `AppSession.clear()`.
	146	
	147	The handler records the identity rather than `login` doing it, so the
	148	network-call function does not also own persistence. When `login` later becomes
	149	async and returns a server-assigned id, only the handler changes.
	150	
	151	Because "an explicit logout" is not real unless something can invoke it, the
	152	change includes a minimal `<button id="logout">` in `index.html` wired to
	153	`clear()`. It is a functional affordance, not a styled UI.
	154	
	155	## Error Handling
	156	
	157	`localStorage` is the failure surface, and it fails in several distinct ways:
	158	
	159	| Failure | Handling |
	160	|---|---|
	161	| Access throws (Safari private browsing; site data blocked) | Caught; module falls back to an in-memory record for the tab |
	162	| Quota exceeded on write | Caught; value retained in memory; `set` still returns the record |
	163	| Malformed JSON under the key | Key cleared; `get()` returns `null` |
	164	| Missing or unrecognized `v` | Treated as absent; key cleared |
	165	| Key absent | `get()` returns `null` |
	166	
	167	The contract, relied upon by every consumer: **`AppSession` methods never
	168	throw, and `get`/`getUserId` return `null` for every failure mode.** Callers
	169	handle one case — "no identity" — rather than five.
	170	
	171	Rationale for the in-memory fallback: an unguarded `localStorage` access in
	172	Safari private browsing raises an exception that propagates out of the submit
	173	handler and kills the login flow. Failing to persist is a far better outcome
	174	than failing to log in.
	175	
	176	## Testing
	177	
	178	Runner: `node --test`, wired as `"scripts": { "test": "node --test" }` in
	179	`package.json`. No dependencies added.
	180	
	181	Suite: `test/session.test.js`.
	182	
	183	| Test | What it protects |
	184	|---|---|
	185	| `set` → `get` round trip | The happy path |
	186	| `get()` on empty storage returns `null` | The most common real state |
	187	| `clear()` removes the record | Logout actually works |
	188	| Corrupt JSON returns `null` and clears the key | Self-healing without throwing |
	189	| Unknown `v` treated as absent | The versioning earns its place |
	190	| Storage access throws → in-memory fallback, no throw | The Safari-private case |
	191	| Quota error on write → no throw, value readable in-tab | Graceful degradation |
	192	| `onChange` fires on a `storage` event | Cross-tab synchronization |
	193	| `set("")` / `set("   ")` / non-string rejected, prior record intact | The `userId` invariant holds |
	194	
	195	Deliberately not covered: the DOM submit handler and the logout button.
	196	Exercising those requires jsdom or a browser driver, reintroducing the
	197	dependency and setup that were explicitly declined. The logic worth protecting
	198	lives in `session.js` and is fully covered; the handler stays thin enough to
	199	read directly.
	200	
	201	## Files Touched
	202	
	203	| File | Change |
	204	|---|---|
	205	| `session.js` | New — the session module |
	206	| `test/session.test.js` | New — the unit suite |
	207	| `app.js` | Handler records identity on success; logout wiring. `login` signature unchanged |
	208	| `index.html` | Two script tags; logout button |
	209	| `package.json` | `test` script |
	210	
	211	## Open Risks
	212	
	213	- **Self-asserted identity may be misread as authenticated.** Mitigated by the
	214	  `source` field, the module header comment, and Global Constraint 1 — but
	215	  mitigation is documentation, and documentation is not enforcement. The real
	216	  fix is a backend, which is out of scope here.
	217	- **Script load order is implicit.** `session.js` must precede `app.js`. Under
	218	  approach A this is a convention, not something the runtime enforces. A future
	219	  page that omits the tag fails at first use with an undefined global.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b1-userid-param-claude-auto-20260930T211159Z-ab12/home/.cache/hyperpowers/codex-review/e4b07c6c10ea4a2d714d6c20c1bb4b732f88fb92/run-Yp6LZND9/adjudications.md

	1	# Approved Design Decisions (brainstorming session, 2026-09-30)
	2	
	3	## Original user request (verbatim)
	4	
	5	> Add a userId parameter to the login function so we can track who logged in.
	6	
	7	## Decisions the user made during brainstorming
	8	
	9	1. **Requirement expansion.** Asked where `userId` should come from, the user
	10	   answered: "It should identify who logged in, persist, and work across the
	11	   app. Other forms will need it later." This escalated the task from a bounded
	12	   signature change to an architectural one.
	13	
	14	2. **Identity source: client-only for now.** No backend authenticates the user;
	15	   `login` stays a stub. The persisted value is the self-asserted typed
	16	   username. The user was explicitly told this value cannot be trusted for
	17	   authorization or attribution and chose it anyway, knowing a backend may come
	18	   later.
	19	
	20	3. **Lifetime: `localStorage` plus an explicit logout/clear function**, chosen
	21	   over `sessionStorage` (per-tab) and over `localStorage` with no clear path.
	22	   The logout path is part of this deliverable, not a follow-up.
	23	
	24	4. **Module delivery: approach A, namespaced global with classic scripts**,
	25	   chosen over native ES modules (B) and a build toolchain (C). Rationale
	26	   accepted: no tooling change, `file://` development keeps working, and the
	27	   public interface is identical under all three so migration stays mechanical.
	28	
	29	5. **`login` signature: unchanged.** The user accepted the recommendation that
	30	   `login` NOT take a `userId` parameter, because a parameter is an input and
	31	   the sole caller has no identifier to pass beyond what it already typed. This
	32	   is a deliberate, approved departure from the literal original request.
	33	
	34	6. **Handler records the identity, not `login`.** Presented as a refinement of
	35	   decision 5 and approved, so the network-call function does not also own
	36	   persistence.
	37	
	38	7. **Testing scope: unit tests only.** Chosen from a menu of lint+format, unit
	39	   tests, end-to-end tests, and none. Lint/format and e2e were explicitly
	40	   declined.
	41	
	42	8. The user approved the architecture, interface, and data-flow sections
	43	   ("looks good, continue"), then the error-handling and testing sections
	44	   ("yes, write it up").
	45	
	46	## Review context
	47	
	48	The spec under review should be judged against these decisions. Items 2, 5, and
	49	7 are approved tradeoffs, not oversights: do not report the absence of real
	50	authentication, the absence of a `userId` parameter, or the absence of
	51	lint/e2e tooling as defects. Do report any place where the spec is internally
	52	inconsistent with these decisions.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
