# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T110322Z-4381/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-logging-design.md

	1	# Logging Subsystem Design
	2	
	3	Date: 2026-09-17
	4	Status: approved (design), pending implementation plan
	5	
	6	## Problem
	7	
	8	The app has no logging. Debugging a production issue currently means reading
	9	three ad-hoc `console.*` calls in `app.js` and one in `src/index.js`, none of
	10	which have a consistent shape, a severity, a timestamp, or any way to be turned
	11	up or down without editing code and redeploying.
	12	
	13	One of those calls, `app.js:5`, logs a username on every login attempt, inside
	14	a flow that also handles a plaintext password.
	15	
	16	## Goals
	17	
	18	- One logging interface shared by both surfaces: the browser login form and the
	19	  Node entry point.
	20	- Structured, greppable output with timestamps and severities.
	21	- Verbosity changeable in production without a redeploy.
	22	- Sensitive data cannot reach the output, including when future code adds
	23	  fields nobody reviewed for safety.
	24	- A seam that lets logs ship to a remote collector later without touching any
	25	  call site.
	26	
	27	## Non-goals
	28	
	29	- Shipping logs off the client. No transport, endpoint, batching, or retry is
	30	  built now; the design only guarantees the seam for one.
	31	- Third-party logging or error-reporting services.
	32	- Converting the project to ES modules, adding a bundler, or adding any runtime
	33	  dependency.
	34	- Replacing the program's stdout *output* with log records (see Decision 6).
	35	
	36	## Decisions
	37	
	38	Each decision below was chosen explicitly during brainstorming; the rejected
	39	alternatives are recorded because the reasons constrain later changes.
	40	
	41	### 1. Both surfaces, one shared module
	42	
	43	`app.js` (browser) and `src/index.js` (Node) both consume a single core module.
	44	Rejected: instrumenting only one surface, which leaves the other blind.
	45	
	46	### 2. UMD-style shim rather than ESM conversion
	47	
	48	The two surfaces use incompatible module systems today: `app.js` is a classic
	49	global-scope script loaded by `<script src="app.js">`, and `src/` is CommonJS.
	50	There is no bundler or transpiler.
	51	
	52	`src/logger.js` ends with a footer that assigns to `module.exports` when it
	53	exists and to `window.AppLogger` otherwise. `index.html` gains a second script
	54	tag before `app.js`; `src/index.js` uses `require`. No existing module syntax
	55	changes.
	56	
	57	Rejected: converting the project to ESM. It is the better end state, but it
	58	touches three files unrelated to logging, and module scripts are blocked by
	59	CORS over `file://`. How the page is served in production is not known
	60	(Assumption: the page may be opened over `file://`; validate by asking how it
	61	is deployed — if it is always served over HTTP, the ESM conversion becomes a
	62	reasonable follow-up). Also rejected: two parallel implementations sharing only
	63	a written contract, which would duplicate the redaction logic — the one place
	64	where drift means a password in a log line.
	65	
	66	### 3. Structured console output, with a transport seam
	67	
	68	Records go to the console (browser) and stdout/stderr (Node). `sink` is a
	69	constructor argument of type `(record) => void`, so adding a remote destination
	70	later means writing one function and changing two wiring lines — no call site
	71	changes.
	72	
	73	Rejected: POSTing to an endpoint that does not exist yet, which would mean
	74	building batching and retry for log lines nobody has read; and third-party
	75	services, which add a dependency and send data off-site.
	76	
	77	### 4. Runtime level switch
	78	
	79	Verbosity is resolved at startup from the environment, not compiled in:
	80	
	81	- Browser: `?log=<level>` URL parameter, then `localStorage["logLevel"]`, then
	82	  `info`.
	83	- Node: `LOG_LEVEL` environment variable, then `info`.
	84	
	85	The URL parameter applies to that page load only and does not write to
	86	`localStorage`; a support link should not leave someone in debug mode
	87	permanently.
	88	
	89	Consequence accepted deliberately: an end user can enable debug output, so
	90	debug output is effectively public. Nothing sensitive may be logged at any
	91	level. This is the same rule Decision 5 enforces mechanically.
	92	
	93	### 5. Allowlist redaction, failing closed
	94	
	95	Only field names in `ALLOWED_FIELDS` are emitted. Rejected: a denylist of known
	96	sensitive keys, whose failure mode when someone adds a new field is a leak,
	97	versus an allowlist's failure mode of a missing field noticed during debugging.
	98	
	99	### 6. Program output is not logging
	100	
	101	`console.log(greet('world'))` in `src/index.js` stays as it is. It is what the
	102	program exists to print, not a diagnostic. Routing it through the logger would
	103	let a `LOG_LEVEL` change silence the program's actual output.
	104	
	105	### 7. Session id instead of username
	106	
	107	Records carry a random per-run `sessionId` rather than the username, restoring
	108	the ability to group one session's lines without putting personal data into
	109	output a user can enable from a URL parameter.
	110	
	111	## Architecture
	112	
	113	### `src/logger.js` (new)
	114	
	115	The entire core. Environment-agnostic: it references no `window`, no `process`,
	116	and no `console`. Everything environment-specific is injected.
	117	
	118	```js
	119	createLogger({ level, sink, clock, base }) // → { debug, info, warn, error }
	120	```
	121	
	122	- `level` — minimum severity to emit; a level string.
	123	- `sink` — `(record) => void`. The transport seam.
	124	- `clock` — `() => Date`, defaulting to `() => new Date()`. Injected so tests
	125	  can assert exact output.
	126	- `base` — flat object of fields merged into every record (carries
	127	  `sessionId`). Passed through the same allowlist as per-call fields; the core
	128	  grants it no special trust.
	129	
	130	Each returned method takes `(event, fields)`. `event` is a short stable
	131	identifier such as `"login.attempt"`. Event names rather than prose messages,
	132	because the output is meant to be grepped and a name survives rewording.
	133	
	134	Also exported: `resolveLevel`, `LEVELS`.
	135	
	136	The module footer:
	137	
	138	```js
	139	if (typeof module !== "undefined" && module.exports) {
	140	  module.exports = { createLogger, resolveLevel, LEVELS };
	141	} else {
	142	  window.AppLogger = { createLogger, resolveLevel, LEVELS };
	143	}
	144	```
	145	
	146	### Wiring
	147	
	148	Wiring lives at each entry point rather than in separate adapter files. With
	149	two consumers, more files would be ceremony, and the part worth testing —
	150	level resolution — is in the core.
	151	
	152	- `index.html`: add `<script src="src/logger.js"></script>` immediately before
	153	  the existing `app.js` tag.
	154	- `app.js`: ~5 lines at the top — read the URL parameter and `localStorage`,
	155	  call `resolveLevel`, generate a `sessionId`, build the console sink, call
	156	  `createLogger`.
	157	- `src/index.js`: ~4 lines — `require('./logger')`, read `LOG_LEVEL`, generate a
	158	  `sessionId`, build the stream sink, call `createLogger`.
	159	
	160	`src/utils.js` is not modified.
	161	
	162	## Record format
	163	
	164	One flat JSON object per record:
	165	
	166	```json
	167	{"ts":"2026-09-17T11:03:22.481Z","level":"info","event":"login.result","sessionId":"a3f1c2","success":true}
	168	```
	169	
	170	Flat rather than nested, so it greps cleanly and can be indexed by a collector
	171	later without a schema.
	172	
	173	`_dropped` appears only when fields were rejected, listing rejected key *names*
	174	in sorted order. No call site in this design passes a rejected field; the case
	175	arises when future code logs something not yet allowlisted:
	176	
	177	```json
	178	{"ts":"...","level":"info","event":"profile.saved","sessionId":"a3f1c2","_dropped":["email","phone"]}
	179	```
	180	
	181	Names are recorded, values never are. Without this, a missing field produces a
	182	debugging session that ends in confusion rather than in "right, that is not
	183	allowlisted."
	184	
	185	## Redaction rules
	186	
	187	`ALLOWED_FIELDS` is a single set declared at the top of `src/logger.js` — one
	188	place to read to know everything that can leave the app. Initial contents:
	189	
	190	- `sessionId`
	191	- `success`
	192	- `reason`
	193	- `durationMs`
	194	
	195	Growing it is a one-line change that appears in review as exactly what it is.
	196	
	197	Two rules apply beyond the name check:
	198	
	199	1. **Allowlisted keys must hold primitives.** String, number, boolean, or null
	200	   pass through. Anything else is replaced with `"[object]"`, `"[array]"`, or
	201	   `"[function]"`. Without this, an allowlisted `reason` holding an error object
	202	   with a request body attached carries a password through a filter that
	203	   reported success.
	204	2. **Strings truncate at 200 characters**, with a trailing ellipsis. Guards
	205	   against a stack trace or serialized payload becoming a log line.
	206	
	207	Per-key reads are individually guarded so a throwing getter on a caller's object
	208	cannot propagate into the caller.
	209	
	210	## Level resolution
	211	
	212	`LEVELS`: `debug` (10), `info` (20), `warn` (30), `error` (40). A call below the
	213	active threshold returns before building a record.
	214	
	215	`resolveLevel(candidates)` takes an ordered array of raw strings (any of which
	216	may be null or invalid) and returns the first valid level name, falling back to
	217	`info`.
	218	
	219	An invalid non-null candidate falls through to the next and emits one `warn`
	220	record, `logger.bad_level`, carrying the *source* (`"url"`, `"storage"`,
	221	`"env"`) and not the offending value. A typo should not be silent, but the URL
	222	parameter is user-controlled input, and echoing user-controlled strings into
	223	output that may later reach a collector is how log injection starts.
	224	
	225	## Sinks
	226	
	227	- **Browser:** maps to `console.debug` / `console.info` / `console.warn` /
	228	  `console.error`, passing the record as an object so devtools keeps it
	229	  expandable.
	230	- **Node:** one JSON line per record — `process.stdout.write` for `debug` and
	231	  `info`, `process.stderr.write` for `warn` and `error`.
	232	
	233	## Error handling
	234	
	235	The logger must never break the app. A logging subsystem that crashes a login
	236	form is worse than no logging.
	237	
	238	- Sink invocations are wrapped. A throwing sink is swallowed, reported once via
	239	  a guarded `console.error`, and then latched off, so a persistently broken
	240	  transport degrades to no logs rather than to one error per log line.
	241	- The allowlist filter tolerates `null` / `undefined` field objects and throwing
	242	  getters.
	243	- Circular references never reach serialization, because only primitives are
	244	  emitted.
	245	
	246	## Call sites
	247	
	248	### `app.js`
	249	
	250	| Location | Call |
	251	|---|---|
	252	| submit handler entry | `logger.debug("login.submit_received")` |
	253	| validation failure | `logger.warn("login.validation_failed", { reason: validation.error })` |
	254	| inside `login()` | `logger.info("login.attempt")` |
	255	| after `login()` returns | `logger.info("login.result", { success: result.success })` |
	256	
	257	These replace the three existing `console.*` calls in `app.js`.
	258	
	259	The password is never passed to the logger at any call site. The allowlist would
	260	drop it regardless; not handing it over means two independent mechanisms must
	261	fail before it can leak.
	262	
	263	### `src/index.js`
	264	
	265	`logger.debug("main.start")` and `logger.debug("main.complete", { durationMs })`
	266	around the existing body. The `console.log(greet('world'))` line is untouched
	267	(Decision 6).
	268	
	269	## Behavior changes
	270	
	271	1. **The username no longer appears in logs.** `app.js:5` logs it today.
	272	   Replaced by `sessionId` (Decision 7).
	273	2. **The console output of the login flow changes shape.** `"Logging in: alice"`
	274	   becomes a structured record. Anything reading those exact strings — a support
	275	   runbook, a ticket screenshot, a browser test — will see different text.
	276	3. **Validation failures move from `console.error` to a `warn` record**, and so
	277	   appear at `console.warn` rather than `console.error` in the browser.
	278	
	279	## Testing
	280	
	281	Tooling: `node:test`, built into Node 18+. Chosen to keep the repository at zero
	282	dependencies. Adds a `test/` directory and an `npm test` script; no linter,
	283	formatter, or end-to-end infrastructure is added.
	284	
	285	The core is environment-agnostic and takes an injected sink and clock, so every
	286	case below tests with an array-push sink and a fixed timestamp — no DOM, no
	287	subprocess, no fixtures.
	288	
	289	- Level threshold filtering: calls below the active level emit nothing.
	290	- Allowlist: permitted fields pass; rejected fields are absent and named in
	291	  `_dropped`; `_dropped` is omitted when empty.
	292	- Non-primitive values in allowlisted keys become type markers.
	293	- Strings longer than 200 characters truncate.
	294	- `base` fields are merged into every record and are themselves allowlisted.
	295	- `resolveLevel`: ordering, fallback to `info`, invalid values skipped.
	296	- `logger.bad_level` is emitted once with a source and never the raw value.
	297	- A throwing sink does not propagate, is reported once, and then latches off.
	298	
	299	The sink-throw test is the one that matters most: it is the evidence that a
	300	broken transport cannot take down the login form.
	301	
	302	## Global constraints
	303	
	304	- No runtime dependencies. `node:test` is part of Node.
	305	- No build step, bundler, or transpiler.
	306	- Existing module syntax in `app.js`, `src/index.js`, and `src/utils.js` is
	307	  preserved.
	308	- `src/utils.js` is not modified.
	309	- Nothing sensitive is logged at any level, because any user can enable debug.
	310	
	311	## Open assumption
	312	
	313	Assumption: the page may be served over `file://` in some environments;
	314	validate by confirming the deployment method. If it is always served over HTTP,
	315	the ESM conversion rejected in Decision 2 becomes a reasonable follow-up and the
	316	UMD footer can be deleted.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T110322Z-4381/home/.cache/hyperpowers/codex-review/86eb248ecf1635809bea1170abf45de481128eb4/run-JgfUjjfi/adjudications.md

	1	# Approved design context (brainstorming adjudications)
	2	
	3	Original request, verbatim: "Add logging to the app so we can debug production issues."
	4	
	5	The following were put to the human partner as explicit choices during
	6	brainstorming and approved by them. They are settled inputs to the spec, not
	7	open questions.
	8	
	9	| Question | Chosen | Rejected |
	10	|---|---|---|
	11	| Which surface needs logging? | Both browser and Node, via a shared module | Browser only; Node only |
	12	| Where do browser logs end up? | Structured console output now, with a documented transport seam | POST to our own endpoint; third-party service (Sentry etc.) |
	13	| How is verbosity controlled? | Runtime switch (`?log=` + localStorage in browser, `LOG_LEVEL` in Node) | Fixed level in code; always verbose |
	14	| How is sensitive data handled? | Allowlist, failing closed | Denylist of known-sensitive keys |
	15	| Module-sharing mechanism | Approach A: UMD-style footer in `src/logger.js` | Approach B: convert project to ESM; Approach C: two parallel implementations sharing only a written contract |
	16	| Correlation field | Random per-run `sessionId` | No correlation field; keep logging the username |
	17	| Tooling to add | `node:test` unit tests only | Lint + format; end-to-end tests; no tooling |
	18	
	19	Additional approved points:
	20	
	21	- The human partner approved the module structure (section 1) and the record
	22	  format / redaction / level-resolution design (section 2) as presented.
	23	- Keeping the repository at zero runtime dependencies was an explicit reason for
	24	  several of these choices; a finding that recommends adding a dependency
	25	  should account for that constraint.
	26	- `console.log(greet('world'))` in `src/index.js` was deliberately left as
	27	  program output rather than converted to a log record.
	28	
	29	## Repository facts
	30	
	31	The repository contains only: `index.html`, `app.js`, `package.json`,
	32	`README.md`, `src/index.js`, `src/utils.js`. No dependencies, no lockfile, no
	33	build step, no tests, no linter, no CI. `app.js` is a classic global-scope
	34	script; `src/` is CommonJS. Git branch `feature/webapp-enhancement`.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
