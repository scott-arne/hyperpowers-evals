# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260922T093430Z-51d1/coding-agent-workdir/docs/hyperpowers/specs/2026-09-22-logging-design.md

	1	# Logging Subsystem — Design
	2	
	3	Date: 2026-09-22
	4	Status: approved in brainstorming; not yet planned
	5	
	6	## Problem
	7	
	8	The app has no logging. Diagnostics today are four ad-hoc `console.*` calls
	9	(`app.js:5`, `app.js:24`, `app.js:26`, `src/index.js:4`), which cannot be
	10	filtered by severity, carry no timestamps, share no format between the two
	11	surfaces, and are lost the moment a page reloads. Production issues therefore
	12	leave no usable trace.
	13	
	14	Two surfaces need logging and they are independent code today:
	15	
	16	- **Browser** — `app.js`, loaded by a classic `<script src="app.js">` in
	17	  `index.html`. No module syntax, no bundler, no build step.
	18	- **Node** — `src/index.js` and `src/utils.js`, CommonJS
	19	  (`require` / `module.exports`). `package.json` has no dependencies,
	20	  no scripts, and no `type` field.
	21	
	22	## Goals
	23	
	24	- One logging API and one record shape shared by both surfaces.
	25	- Browser logs retrievable on demand and surviving a page reload.
	26	- Sensitive values redacted by the logging module itself, not by call-site
	27	  discipline.
	28	- No new runtime dependencies and no build step.
	29	- The output destination is a named seam, so a network sink can be added later
	30	  without touching any call site.
	31	
	32	## Non-goals
	33	
	34	- Shipping logs off the user's machine. No network transport, no third-party
	35	  logging service. The sink seam exists so this can be added later as a
	36	  separate, separately-approved piece of work.
	37	- Log retention beyond the current tab session.
	38	- Converting the existing module formats. `app.js` stays a classic script and
	39	  `src/` stays CommonJS.
	40	- Instrumenting code paths beyond the four existing `console.*` sites.
	41	
	42	## Decisions
	43	
	44	Each of these was chosen explicitly during brainstorming; the alternatives
	45	considered are recorded so a later reader does not re-litigate them.
	46	
	47	| Decision | Chosen | Rejected |
	48	|---|---|---|
	49	| Scope | Both surfaces, one shared module | Node only; browser only |
	50	| Browser destination | In-memory buffer + manual export | Console only; POST to own endpoint; third-party service |
	51	| Sensitive values | Module-enforced denylist by key name | Allowlist; docs-only convention |
	52	| Module structure | Pure core + per-runtime adapters | Single file with dual-export guard; ESM everywhere |
	53	| Reload persistence | Yes, via `sessionStorage` | `localStorage`; `localStorage` with TTL; no persistence |
	54	| Tooling | Unit tests via `node:test` | Lint/format; end-to-end tests; no tooling |
	55	
	56	`ESM everywhere` was rejected specifically because module scripts are blocked
	57	over `file://`, so it would make `index.html` require a local web server to
	58	open — a cost unrelated to logging.
	59	
	60	`localStorage` was rejected because this is a login page: persisting activity
	61	across browser restarts leaves the previous user's session history on a shared
	62	machine, and the choice is not cleanly reversible, since switching later does
	63	not remove what was already written.
	64	
	65	## Architecture
	66	
	67	Three files under `src/logger/`.
	68	
	69	### `core.js` — the rules, no I/O
	70	
	71	Exports a factory:
	72	
	73	```js
	74	createLogger({ level, sink, now }) -> { trace, debug, info, warn, error }
	75	```
	76	
	77	Responsibilities: build the record, drop it if below `level`, redact it, hand
	78	it to `sink`. It must not reference `console`, `process`, `window`,
	79	`localStorage`, or `sessionStorage` — this purity is what makes the redaction
	80	rule directly testable, and it is a design constraint, not an accident.
	81	
	82	- `level` — one of `trace | debug | info | warn | error`, ordered as listed.
	83	  A record is emitted when its level is at or above the configured level.
	84	- `sink` — `(record) => void`. The single output seam.
	85	- `now` — `() => Date`, injected so tests get deterministic timestamps.
	86	
	87	Ends with a dual-export guard so both adapters can load it without a bundler:
	88	`module.exports` when `module` is defined, otherwise `window.LoggerCore`.
	89	
	90	### `node.js` — CommonJS adapter
	91	
	92	Creates a logger whose sink writes one JSON line per record: `stdout` for
	93	`trace`/`debug`/`info`, `stderr` for `warn`/`error`, so real problems survive
	94	a redirect of stdout. Level from `process.env.LOG_LEVEL`, defaulting to
	95	`info`. Exports the logger instance.
	96	
	97	### `browser.js` — classic script adapter
	98	
	99	Attaches `window.Logger`. Its sink pushes into a fixed-size ring buffer
	100	(default 500 records, oldest evicted) and mirrors the record to the matching
	101	`console.*` method so devtools remain useful during development.
	102	
	103	Public surface beyond the level methods:
	104	
	105	- `Logger.export()` — the buffer as a JSON string.
	106	- `Logger.clear()` — empties the buffer and its persisted copy.
	107	
	108	Level from `localStorage.LOG_LEVEL` when present, defaulting to `info`.
	109	
	110	> Note the asymmetry: the *level setting* is read from `localStorage` because
	111	> it is a developer preference that should survive a restart, while *log
	112	> records* go to `sessionStorage` because they are user data that should not.
	113	> These are deliberately different stores.
	114	
	115	### Wiring
	116	
	117	- `index.html` gains two tags before `<script src="app.js">`:
	118	  `src/logger/core.js` then `src/logger/browser.js`. Order matters —
	119	  `browser.js` reads `window.LoggerCore`.
	120	- `src/index.js` gains `const logger = require('./logger/node');`.
	121	- No call site ever loads `core.js` directly.
	122	
	123	## Record shape
	124	
	125	```js
	126	{
	127	  ts: "2026-09-22T09:34:30.512Z",  // ISO 8601, from the injected now()
	128	  level: "info",                    // lowercase string
	129	  msg: "login attempt",             // developer-authored constant string
	130	  ctx: { hasUsername: true }        // optional; the only redacted field
	131	}
	132	```
	133	
	134	Flat and JSON-serializable so the Node sink's JSON lines and the browser
	135	buffer's entries parse with the same reader.
	136	
	137	## Redaction
	138	
	139	Runs inside `core.js`, on `ctx` only, before the record reaches any sink.
	140	
	141	- Keys matched case-insensitively as substrings against:
	142	  `password`, `passwd`, `pwd`, `token`, `secret`, `auth`, `credential`,
	143	  `apikey`, `session`, `cookie`.
	144	- A match replaces the **value** with `"[redacted]"` and keeps the key, so the
	145	  field's presence stays visible.
	146	- Nested objects are walked with a depth cap and a cycle guard.
	147	- `Error` values become `{ name, message, stack }`.
	148	- Functions and symbols are dropped; circular references become
	149	  `"[circular]"`.
	150	
	151	**Known limit, stated deliberately:** redaction is key-based and cannot catch a
	152	secret interpolated into the `msg` string. `msg` is required to be a
	153	developer-authored constant; the denylist is a backstop for the `ctx` objects
	154	that carry runtime data, not a guarantee that nothing sensitive can reach a
	155	log.
	156	
	157	## Persistence
	158	
	159	The ring buffer is the working copy; `sessionStorage` mirrors it. The mirror is
	160	never a second source of truth.
	161	
	162	- **Rehydrate on load:** `browser.js` reads the persisted array and seeds the
	163	  buffer, so `export()` returns pre-reload and post-reload records as one
	164	  ordered list.
	165	- **Write on a ~250ms debounce**, plus an unconditional write on `pagehide`.
	166	  Writing per call would re-serialize the whole buffer on every line;
	167	  `pagehide` is the event that actually fires for reloads and tab closes.
	168	- **Cap** the serialized payload at 1MB, well under the ~5MB quota. Two limits
	169	  therefore bound the buffer — 500 records and 1MB serialized — and whichever
	170	  binds first wins: before writing, records are evicted oldest-first until the
	171	  payload fits.
	172	- **On quota error**, evict the oldest 25% of records and retry the write
	173	  once. If it fails again, give up on persisting this cycle. Never throw.
	174	- Records do not outlive the tab session. This is the intended retention
	175	  boundary, not a limitation to work around.
	176	
	177	## Call-site changes
	178	
	179	| Site | Before | After |
	180	|---|---|---|
	181	| `app.js:5` | `console.log("Logging in:", username)` | `Logger.info("login attempt", { hasUsername: true })` |
	182	| `app.js:24` | `console.log("Login result:", result)` | `Logger.info("login result", { success: result.success })` |
	183	| `app.js:26` | `console.error("Validation error:", ...)` | `Logger.warn("validation failed", { error: validation.error })` |
	184	| `src/index.js:4` | `console.log(greet('world'))` | unchanged; a `logger.debug` added alongside |
	185	
	186	Rationale for the two that change behavior, both explicitly approved:
	187	
	188	- **The username stops being logged.** The denylist would not have caught it
	189	  (`username` is not a sensitive-key match), and the diagnostic value for a
	190	  login failure is whether a username was supplied, not who supplied it.
	191	  `app.js:24` drops `result.user` for the same reason.
	192	- **`src/index.js:4` stays a `console.log`.** It is the program's output, not a
	193	  diagnostic. Routing it through the logger would stamp a level and timestamp
	194	  on the thing the program exists to print, and would let `LOG_LEVEL` silence
	195	  it.
	196	
	197	`login()` continues to receive `password` as an argument; nothing logs the
	198	argument object.
	199	
	200	## Failure behavior
	201	
	202	The logger never throws. Sink invocations and every `sessionStorage` access are
	203	wrapped; a failure is swallowed after a single `console.warn`. Instrumentation
	204	that can break the code it instruments is a worse production problem than the
	205	one being diagnosed.
	206	
	207	## Testing
	208	
	209	Unit tests via Node's built-in `node:test` and `node:assert` — no dependencies.
	210	Add a `test` script to `package.json` running `node --test`.
	211	
	212	`core.js` (pure, no environment):
	213	
	214	- Level filtering emits at and above the configured level and drops below it.
	215	- Redaction: flat match, nested match, case-insensitive and substring matching,
	216	  key preserved with value replaced, `Error` conversion, circular reference,
	217	  depth cap, function and symbol dropping.
	218	- Record shape: `ts` from the injected `now`, `level`, `msg`, `ctx` present or
	219	  absent.
	220	- A throwing sink does not propagate out of a log call.
	221	
	222	`browser.js` (fake `window`, `sessionStorage`, and `console` injected):
	223	
	224	- Ring buffer evicts oldest at capacity.
	225	- `export()` returns buffered records in order.
	226	- `clear()` empties both buffer and persisted copy.
	227	- Rehydrate-then-append yields one ordered list across a simulated reload.
	228	  This is the claim most likely to be wrong in a way that looks right, so it
	229	  is tested directly.
	230	- A `sessionStorage` quota error drops the oldest chunk and does not throw.
	231	
	232	`node.js`: level resolution from `process.env.LOG_LEVEL` including the default,
	233	and `warn`/`error` routing to stderr while lower levels go to stdout.
	234	
	235	## Open assumptions
	236	
	237	- Assumption: 500 buffered records is enough context for a login-flow failure;
	238	  validate by checking whether real exports arrive truncated at the cap, and
	239	  raise it if so.
	240	- Assumption: a ~250ms debounce loses no meaningful records ahead of a
	241	  reload, because `pagehide` flushes synchronously; validate with the
	242	  simulated-reload test plus one manual reload against `index.html`.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260922T093430Z-51d1/home/.cache/hyperpowers/codex-review/ee61b04de9d85e0e4916cf71a44ccac45e51ad9f/run-vi66UM20/adjudications.md

	1	# Approved design context — logging subsystem
	2	
	3	## Original user request (verbatim)
	4	
	5	> Add logging to the app so we can debug production issues.
	6	
	7	## Decisions the human partner made explicitly during brainstorming
	8	
	9	Each was presented with alternatives and chosen. They are settled; a finding
	10	that merely re-argues one of these is out of scope.
	11	
	12	1. **Scope:** both surfaces (browser `app.js` and Node `src/`) via one shared
	13	   module. Alternatives offered and rejected: Node only; browser only.
	14	2. **Browser destination:** in-memory buffer with manual export. Rejected:
	15	   console only; POST to an own endpoint; third-party service. No network
	16	   transport and no new runtime dependency.
	17	3. **Redaction:** the logging module itself redacts by a denylist of sensitive
	18	   key names. Rejected: allowlist of permitted fields; docs-only convention.
	19	4. **Module structure:** pure core plus per-runtime adapters. Rejected: single
	20	   file with a dual-export guard; converting everything to ESM.
	21	5. **Reload persistence:** requested by the human partner after the initial
	22	   design. Backed by `sessionStorage`. Rejected: `localStorage`;
	23	   `localStorage` with a TTL; no persistence.
	24	6. **Tooling:** unit tests via Node's built-in `node:test` only. Rejected (not
	25	   chosen): eslint/prettier; end-to-end tests; no tooling at all.
	26	
	27	## Behavior changes explicitly approved
	28	
	29	The human partner was asked about these directly and said yes to both:
	30	
	31	- The username stops being written to logs (`app.js:5` and the `user` field at
	32	  `app.js:24`).
	33	- `src/index.js:4`'s `console.log(greet('world'))` stays as program output and
	34	  is not routed through the logger.
	35	
	36	## Repository facts
	37	
	38	- Files: `index.html`, `README.md`, `package.json`, `app.js`, `src/index.js`,
	39	  `src/utils.js`.
	40	- `package.json` has no dependencies, no scripts, no `type` field.
	41	- `app.js` is loaded by a classic `<script src="app.js">`; it uses no module
	42	  syntax. There is no bundler and no build step.
	43	- `src/` is CommonJS.
	44	- Branch `feature/webapp-enhancement`, working tree clean apart from the spec
	45	  under review.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
