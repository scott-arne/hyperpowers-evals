# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260926T084619Z-fea6/coding-agent-workdir/docs/hyperpowers/specs/2026-09-26-logging-design.md

	1	# Logging Subsystem — Design
	2	
	3	Date: 2026-09-26
	4	Status: Approved design, pending implementation plan
	5	
	6	## Problem
	7	
	8	The app has no logging. It has four scattered `console.*` calls in `app.js`
	9	and one in `src/index.js`. When something fails in production there is no
	10	record of what happened, and no way to reconstruct what the user did before
	11	it failed.
	12	
	13	Two diagnostic needs drive this work:
	14	
	15	1. **Errors and failures** — unhandled exceptions, failed calls, rejected
	16	   input.
	17	2. **A behavioral trail** — the sequence of events leading up to a failure,
	18	   not just the failure itself.
	19	
	20	Performance/timing instrumentation is explicitly out of scope.
	21	
	22	One existing line is a live liability: `app.js:5` logs the raw username on
	23	every login attempt, and `password` is in scope at the same call sites. Any
	24	logging added around that form is one careless call away from writing
	25	credentials to production output. Redaction is therefore a first-class
	26	requirement of this design, not a follow-up.
	27	
	28	## Global Constraints
	29	
	30	- **Zero runtime dependencies.** The project currently has none, and this
	31	  subsystem does not introduce any.
	32	- **Unit-test infrastructure** using the built-in `node:test` runner, added
	33	  as part of this work, with an `npm test` script. No linter, formatter, or
	34	  end-to-end harness is being set up; that was considered and deferred.
	35	- **Console output only.** No network transport is built in this change.
	36	- The design document is a working file and is not committed.
	37	
	38	## Runtime Context
	39	
	40	Two runtimes, with different module systems and no build step:
	41	
	42	| | Entry point | Loading |
	43	|---|---|---|
	44	| Browser | `app.js` | plain `<script>` in `index.html`, no bundler, no modules |
	45	| Node | `src/index.js` | CommonJS `require` |
	46	
	47	The absence of a bundler is the binding constraint on how the logger is
	48	shared. Introducing one is out of scope.
	49	
	50	## Decisions
	51	
	52	Each of these was decided explicitly during design; the rationale is recorded
	53	because the alternatives were viable.
	54	
	55	| Decision | Chosen | Rejected alternative and why |
	56	|---|---|---|
	57	| Browser log destination | Console only, behind a pluggable sink | Buffer-and-ship-on-error, and a third-party service. The receiving endpoint does not exist — `app.js:6` shows the API call is still a stub — so shipping infrastructure would be built against nothing. The sink seam makes the transport addable later without touching call sites. |
	58	| Implementation | Hand-rolled, zero deps | pino/winston/debug. ~100 lines covers the need; a library adds a browser build story the project does not have. |
	59	| Module sharing | One dual-mode file | Two separate loggers. Duplicating redaction logic across runtimes is the specific risk being avoided. |
	60	| Browser trail retention | Bounded in-memory ring buffer | Console-only. Console output evaporates with the tab, which leaves the behavioral-trail requirement unmet. |
	61	| Username handling | Truncate to first 2 chars + length | Logging in full (PII in logs and in the buffer) and full redaction (loses session correlation). |
	62	
	63	## Architecture
	64	
	65	### Module
	66	
	67	A single file, `src/logger.js`, with a dual-mode export shim: `module.exports`
	68	when `module` is defined, otherwise assignment to `window.Logger`.
	69	`index.html` loads it via `<script src="src/logger.js">` before `app.js`.
	70	
	71	One implementation means one place where redaction lives, which is the
	72	property this structure exists to guarantee.
	73	
	74	### Public API
	75	
	76	Identical in both runtimes:
	77	
	78	```js
	79	log.error(event, data)
	80	log.warn(event, data)
	81	log.info(event, data)
	82	log.debug(event, data)
	83	
	84	Logger.setSink(fn)   // replace the output function; defaults to console writer
	85	Logger.dump()        // return the ring buffer contents (browser and Node)
	86	```
	87	
	88	- `event` is a short stable identifier (`"login.attempt"`,
	89	  `"form.validation_rejected"`). Stable names are what make a trail
	90	  greppable; free-text messages are not.
	91	- `data` is an optional plain object.
	92	
	93	### Record shape
	94	
	95	One structured record per call, `JSON.stringify`'d to the sink:
	96	
	97	```json
	98	{
	99	  "ts": "2026-09-26T08:46:19.000Z",
	100	  "level": "info",
	101	  "event": "login.attempt",
	102	  "runtime": "browser",
	103	  "data": { "username": "jo***(11)" }
	104	}
	105	```
	106	
	107	JSON on both sides: it makes Node stdout machine-readable, and it means
	108	browser records are already in the shape a future transport would send.
	109	
	110	### Sink
	111	
	112	`Logger.setSink(fn)` takes a function receiving the finished record. The
	113	default writes to `console[level]`. This is the single seam for future
	114	transports; adding buffer-and-ship later means writing a sink, not editing
	115	call sites.
	116	
	117	### Ring buffer
	118	
	119	A bounded in-memory array of the 50 most recent records, retrievable via
	120	`Logger.dump()`. It exists in both runtimes because there is one shared
	121	implementation; the browser is the case that motivated it.
	122	
	123	**The buffer records every level regardless of the console threshold.** The
	124	console respects the configured level; the buffer does not. When a user
	125	reports a problem, the dump carries the full trail including `debug` records
	126	that were never printed.
	127	
	128	Bounded at 50 so memory is constant.
	129	
	130	## Redaction
	131	
	132	Redaction runs inside the logger, before any sink sees the record. Call sites
	133	cannot opt out or forget.
	134	
	135	The `data` object is deep-cloned and walked. Three rules:
	136	
	137	1. **Key denylist.** Keys matching any of `password`, `passwd`, `pwd`,
	138	   `token`, `secret`, `apiKey`, `authorization`, `sessionId`, `creditCard`,
	139	   `ssn` are replaced with `"[REDACTED]"`. Matching is case-insensitive and
	140	   on substrings, so `newPassword` and `access_token` are caught. Applied
	141	   recursively through nested objects and arrays.
	142	
	143	2. **`data` must be a plain object.** A bare value (`log.info("x", password)`)
	144	   has no key for the denylist to match. Non-object `data` is replaced with
	145	   `"[INVALID_LOG_DATA]"`. This makes the unsafe call shape structurally
	146	   impossible rather than merely discouraged.
	147	
	148	3. **String values truncate at 200 characters.** Caps the blast radius of
	149	   anything that evades the denylist and keeps whole request bodies out of
	150	   the buffer.
	151	
	152	**Username.** Truncated to first 2 characters plus total length —
	153	`"jonathan@x.com"` becomes `"jo***(14)"`. Sufficient to correlate lines within
	154	a session and to confirm which account a reporting user meant, without
	155	storing the identifier. Applied to keys whose name contains `username`,
	156	`user`, or `email`, matched case-insensitively on substrings like rule 1.
	157	
	158	**Rule precedence:** the denylist is evaluated first. If a key matches both
	159	the denylist and the username list, it is fully redacted. Redaction always
	160	wins over truncation.
	161	
	162	A denylist is optimistic by nature; rules 2 and 3 exist because of that, and
	163	the test suite treats "a password reaches a sink" as the defining failure.
	164	
	165	## Level control
	166	
	167	Threshold defaults to `info`.
	168	
	169	- Node reads `LOG_LEVEL` from the environment.
	170	- Browser reads `localStorage["log.level"]`.
	171	
	172	The browser mechanism matters specifically because you cannot attach a
	173	debugger to a user's browser — it allows raising verbosity in a live
	174	production session without a deploy.
	175	
	176	Invalid or unrecognized values fall back to `info` rather than throwing. A
	177	logger that crashes on misconfiguration is worse than one that is too quiet.
	178	
	179	## Instrumentation
	180	
	181	### `app.js`
	182	
	183	The four existing `console.*` calls are replaced with logger calls using
	184	stable event names:
	185	
	186	| Location | Event | Level |
	187	|---|---|---|
	188	| `login()` entry | `login.attempt` | info |
	189	| `login()` success | `login.succeeded` | info |
	190	| `login()` failure | `login.failed` | error |
	191	| validation rejection | `form.validation_rejected` | warn |
	192	
	193	The raw-username line at `app.js:5` becomes compliant through the
	194	username-truncation rule.
	195	
	196	### Global error capture
	197	
	198	This is the part that catches failures nobody anticipated.
	199	
	200	- **Browser:** `window.addEventListener("error")` and
	201	  `window.addEventListener("unhandledrejection")` emit
	202	  `log.error("uncaught.error", {...})`. Because the ring buffer has been
	203	  filling beforehand, the dump carries the lead-up to the crash — this is
	204	  where the errors requirement and the trail requirement meet.
	205	- **Node:** `process.on("uncaughtException")` and
	206	  `process.on("unhandledRejection")` log, then re-throw or exit non-zero.
	207	  The handler must not swallow the crash; a logger that converts a fatal
	208	  error into a log line is worse than no logger.
	209	
	210	### `src/index.js`
	211	
	212	`app.start` at entry, plus installation of the uncaught handlers. `src/index.js`
	213	is a hello-world; there is nothing further there worth instrumenting, and no
	214	events will be invented for it.
	215	
	216	## Testing
	217	
	218	`node:test`, run via `npm test`. The logger is pure enough to test directly by
	219	installing a capturing sink via `setSink`.
	220	
	221	Coverage:
	222	
	223	- **Password never reaches a sink** — the defining test. Includes nested
	224	  objects, arrays, and substring keys such as `newPassword` and
	225	  `access_token`.
	226	- Non-object `data` is replaced with `"[INVALID_LOG_DATA]"`.
	227	- String values over 200 chars are truncated.
	228	- Username truncation produces the `xx***(n)` form for `username`, `user`,
	229	  and `email` keys.
	230	- Level thresholds gate console output; invalid level values fall back to
	231	  `info`.
	232	- Ring buffer is bounded at 50 and evicts oldest-first.
	233	- Ring buffer captures records below the console threshold.
	234	- `setSink` replaces the destination and receives the redacted record, not
	235	  the raw input.
	236	
	237	## Out of scope
	238	
	239	- Network transport / remote log collection (the sink seam is the hook).
	240	- Third-party error-reporting services.
	241	- Performance and timing instrumentation.
	242	- Linting, formatting, and end-to-end test infrastructure.
	243	- Any bundler or build step.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260926T084619Z-fea6/home/.cache/hyperpowers/codex-review/db5697db920dce372261216f4fda58bf8fb58dba/run-PX6dIMWz/adjudications.md

	1	# Approved design context — logging subsystem
	2	
	3	## Original user request (verbatim)
	4	
	5	"Add logging to the app so we can debug production issues."
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	1. **Where does the code that needs production logging actually run?**
	10	   Answer: **Both** — the browser (`app.js`) and Node (`src/index.js`).
	11	
	12	2. **What kind of production problem are you trying to diagnose right now?**
	13	   Answer: **Errors and failures** + **Behavioral trail**. Performance/timing
	14	   was offered and NOT selected — it is deliberately out of scope.
	15	
	16	3. **How far should this go on the browser side?** (console-only vs.
	17	   buffer-and-ship-on-error vs. third-party service)
	18	   Answer: **Console-only, transport-ready** — ship the logger and redaction
	19	   now with console output only, behind a pluggable sink so a transport can be
	20	   added later without changing call sites. Rationale accepted: the receiving
	21	   endpoint does not exist (the API call in `app.js` is a stub).
	22	
	23	4. **Hand-rolled logger or a library?**
	24	   Answer: **Hand-rolled, zero runtime dependencies.** pino/winston/debug
	25	   explicitly declined.
	26	
	27	5. **Structure review (presented in chat): one dual-mode `src/logger.js`,
	28	   level API, JSON records, pluggable sink, plus an optional ring buffer.**
	29	   Answer: "Structure looks right. Include the ring buffer."
	30	
	31	6. **Usernames are often email addresses — how should the logger treat them?**
	32	   Answer: **Truncate** to first 2 chars + length (e.g. `jo***(11)`).
	33	   Full logging and full redaction both declined.
	34	
	35	7. **Which tooling should be set up alongside this?**
	36	   Answer: **Unit tests via built-in `node:test` only.** Linting/formatting
	37	   and end-to-end tests were offered and NOT selected — deliberately deferred.
	38	
	39	## Codebase facts the design rests on
	40	
	41	- `app.js` is loaded by `index.html` via a plain `<script src="app.js">`.
	42	  There is no bundler and no module system on the browser side.
	43	- `src/index.js` uses CommonJS `require('./utils')`.
	44	- `package.json` has no dependencies, no devDependencies, and no scripts.
	45	- `app.js:5` currently logs the raw username: `console.log("Logging in:", username)`.
	46	- `app.js:6` marks the API call as a stub: "would POST to API_ENDPOINT in a real app".
	47	- `src/index.js` is a hello-world that calls `greet('world')` from `src/utils.js`.
	48	- Four `console.*` call sites exist in `app.js`; one in `src/index.js`.
	49	
	50	## Scope boundaries the human partner set
	51	
	52	Out of scope by explicit decision, not oversight: network transport, remote
	53	log collection, third-party error services, performance/timing
	54	instrumentation, linting/formatting, end-to-end tests, any bundler or build
	55	step.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
