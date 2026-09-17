# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T103821Z-504b/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-logging-design.md

	1	# Logging Subsystem Design
	2	
	3	Date: 2026-09-17
	4	Status: approved in brainstorming, pending user review
	5	
	6	## Problem
	7	
	8	The app has no logging subsystem. What exists is four scattered `console.log`
	9	and `console.error` calls in `app.js` and one in `src/index.js`. None of them
	10	carry a timestamp, a level, or structured context, and none of them leave the
	11	user's machine. A production issue in the browser is therefore invisible unless
	12	a user happens to open devtools and report what they see.
	13	
	14	Separately, `login(username, password)` logs the username on a code path that
	15	holds a credential. Any design that ships logs off-device has to answer for
	16	that before it ships anything.
	17	
	18	## Goals
	19	
	20	- One logging interface shared by both runtimes in the repo.
	21	- Structured records with levels, timestamps, and context.
	22	- Browser records can reach an HTTP endpoint so production issues are
	23	  debuggable without the user's console.
	24	- Uncaught errors are captured, not just hand-written log calls.
	25	- Sensitive data cannot reach the remote endpoint by accident.
	26	
	27	## Non-Goals
	28	
	29	- A remote sink for the Node side. Node writes JSON to stdout; whatever runs
	30	  the process already collects it.
	31	- Child loggers, custom levels, pluggable formatters, log rotation.
	32	- Adopting a third-party logging or error-reporting service. The transport seam
	33	  is designed so one can be adopted later without touching call sites.
	34	- A bundler, a module-system migration, or any change to how the page is served.
	35	
	36	## Global Constraints
	37	
	38	- **Zero runtime dependencies.** The repo has none today; this work adds none.
	39	- **Test infrastructure:** Node's built-in runner (`node --test`), with a `test`
	40	  script in `package.json`. No linter, formatter, or end-to-end infrastructure
	41	  is set up as part of this work.
	42	- **No changes to how the app loads.** `index.html` stays classic scripts;
	43	  `src/*.js` stays CommonJS. Opening `index.html` over `file://` must keep
	44	  working.
	45	- The spec document is a working file and is not committed.
	46	
	47	## Key Decisions
	48	
	49	| Decision | Choice | Why |
	50	|---|---|---|
	51	| Scope | Both runtimes, shared design | One record shape across the app |
	52	| Destination | Console + optional remote sink | Console-only cannot debug an issue you did not witness |
	53	| Capture | Explicit calls + global error handlers | The crash you most want to see is the one nobody wrote a log line for |
	54	| Redaction | Allowlist at the remote boundary | Fails closed; a leak is a disclosure, not a bug |
	55	| Structure | Pure core + runtime adapters | Makes the security boundary testable in isolation |
	56	
	57	An independent Codex approach consultation was attempted during brainstorming.
	58	Preflight reported `ok` (version `0.0.0-stub`) but the call returned an empty
	59	payload, so no external approaches informed this design.
	60	
	61	## Architecture
	62	
	63	### Module layout
	64	
	65	```
	66	src/logger/core.js      pure: record building, level filter, redaction
	67	src/logger/node.js      adapter: stdout sink, process error handlers
	68	src/logger/browser.js   adapter: console sink, remote transport, window handlers
	69	```
	70	
	71	`core.js` performs no I/O and does no runtime detection. It exports pure
	72	functions only, which is what allows the redaction rule to be tested without a
	73	DOM, a network, or a process.
	74	
	75	Each file ends with a five-line dual-mode tail: assign to `module.exports` when
	76	it exists, otherwise to a browser global. The globals are `window.__loggerCore`
	77	(from `core.js`, an internal detail) and `window.logger` (from `browser.js`, the
	78	call-site handle used by `app.js`). Consequences:
	79	
	80	- Node: `const logger = require('./logger/node')`.
	81	- Browser: `index.html` loads `src/logger/core.js`, then `src/logger/browser.js`,
	82	  then `app.js`. Order matters and is load-bearing.
	83	
	84	Loading an adapter installs that runtime's global error handlers as a side
	85	effect, so no explicit init call is needed at any call site. `configureRemote`
	86	is the one thing that must be called explicitly, and only when a remote endpoint
	87	is being enabled.
	88	
	89	### Core API
	90	
	91	```js
	92	logger.debug(msg, ctx)
	93	logger.info(msg, ctx)
	94	logger.warn(msg, ctx)
	95	logger.error(msg, ctx)   // ctx.err may carry an Error instance
	96	logger.fatal(msg, ctx)
	97	```
	98	
	99	**`msg` must be a static string. Every dynamic value goes in `ctx`.** A value
	100	interpolated into the message text bypasses a field-level allowlist entirely.
	101	This rule is enforced by convention and by the message-length cap; there is no
	102	linter configured to check it.
	103	
	104	### Record model
	105	
	106	```js
	107	{
	108	  v: 1,
	109	  ts: "2026-09-17T10:38:21.123Z",   // ISO 8601, UTC
	110	  level: "debug" | "info" | "warn" | "error" | "fatal",
	111	  msg: "...",
	112	  ctx: { ... },                      // flat object
	113	  err: { name, message, stack },     // present only when an Error was supplied
	114	  runtime: "browser" | "node",
	115	  sessionId: "..."                   // per page load / per process
	116	}
	117	```
	118	
	119	`v` is the schema version, so a receiver can handle records from older clients
	120	still in the wild. `sessionId` is what allows a sequence of records to be
	121	stitched into one user's story, which is most of what production debugging is.
	122	
	123	This is the wire format and is the most expensive part of the design to change
	124	later.
	125	
	126	### Level control
	127	
	128	Levels are ordered `debug < info < warn < error < fatal`.
	129	
	130	- Node: `LOG_LEVEL` environment variable.
	131	- Browser: `?logLevel=` query parameter, then `localStorage.logLevel`.
	132	- Both default to `info`. Unrecognized values fall back to the default rather
	133	  than throwing.
	134	
	135	The query parameter exists so a user hitting a production bug can be told to
	136	add it to their URL and retry, with no new build.
	137	
	138	## Redaction
	139	
	140	Two paths with different rules.
	141	
	142	**Console path** receives the full `ctx`, passed through `scrubForConsole`: a
	143	recursive denylist replacing values whose key matches
	144	`/pass|pwd|token|secret|auth|cookie|session[_-]?key/i` with `"[redacted]"`.
	145	This is a backstop. It fails open — an unexpected key name passes through —
	146	which is precisely why it is not what guards the remote path.
	147	
	148	**Remote path** passes through `projectForRemote(record, REMOTE_CTX_ALLOWLIST)`,
	149	which constructs a new object rather than deleting from the existing one. A
	150	field nobody considered is never copied, so it cannot leak by omission. It
	151	enforces:
	152	
	153	1. **Key allowlist** — `REMOTE_CTX_ALLOWLIST` is a single declared constant
	154	   (initially `event`, `reason`, `success`, `httpStatus`, `durationMs`).
	155	   Unlisted keys are dropped silently.
	156	2. **Primitive values only** — an allowlisted key holding an object or array is
	157	   dropped rather than serialized, so a secret cannot ride to the endpoint
	158	   nested inside an approved key.
	159	3. **Length caps** — `msg` and every string value truncate at 256 characters,
	160	   so a stray blob cannot become an exfiltration channel.
	161	
	162	`err.stack` is transmitted. An error without a stack is close to useless for
	163	production debugging, and the alternative is dropping the most valuable field in
	164	the record. Accepted residual risk: code that writes `throw new Error(password)`
	165	would transmit that message. `scrubForConsole` is applied to `err.message` as a
	166	backstop; it is not a guarantee.
	167	
	168	Adding a field to `REMOTE_CTX_ALLOWLIST` is a deliberate act and should be
	169	treated as a review-worthy change.
	170	
	171	## Transport
	172	
	173	Browser adapter:
	174	
	175	```js
	176	configureRemote({
	177	  endpoint,              // required; absent means the remote sink stays off
	178	  minLevel: 'warn',
	179	  flushIntervalMs: 5000,
	180	  maxBatch: 20,
	181	})
	182	```
	183	
	184	The remote sink is **off unless an endpoint is supplied**. No endpoint exists
	185	yet, so nothing is transmitted until someone opts in.
	186	
	187	Behavior:
	188	
	189	- Records at or above `minLevel` queue in memory.
	190	- The queue flushes as a JSON array on the interval, when it reaches `maxBatch`,
	191	  and immediately on a `fatal` record.
	192	- On `pagehide` / `visibilitychange` it flushes via `navigator.sendBeacon`,
	193	  which survives page unload. Otherwise `fetch(endpoint, { keepalive: true })`.
	194	- The queue is capped at 100 records, dropping oldest first, so an unreachable
	195	  endpoint cannot grow memory without bound.
	196	- A recursion guard routes transport failures to the console only. A logger that
	197	  logs its own network failures into its own network queue does not terminate.
	198	
	199	All of this sits behind a single `setTransport(fn)` seam. Adopting Sentry or a
	200	similar service later means writing one function, not editing call sites.
	201	
	202	Node adapter writes one JSON object per line to stdout. No remote sink.
	203	
	204	## Error Capture
	205	
	206	**Browser:** `window.addEventListener('error')` and `'unhandledrejection'`, each
	207	logged at `error` with the stack.
	208	
	209	**Node:**
	210	
	211	- `uncaughtException` → log at `fatal`, flush stdout, `process.exit(1)`.
	212	- `unhandledRejection` → log at `error`, then exit non-zero.
	213	
	214	Exiting on an unhandled rejection is deliberate. Modern Node crashes on one by
	215	default, and attaching a handler silently suppresses that. Preserving the crash
	216	means adding logging does not quietly change what the process does under
	217	failure.
	218	
	219	## Call-Site Changes
	220	
	221	### `app.js`
	222	
	223	| Current | Replacement |
	224	|---|---|
	225	| `console.log("Logging in:", username)` | `logger.info('login attempt', { event: 'login_attempt', username })` |
	226	| `console.log("Login result:", result)` | `logger.info('login completed', { event: 'login_complete', success: result.success, username: result.user })` |
	227	| `console.error("Validation error:", ...)` | `logger.warn('form validation failed', { event: 'validation_failed', reason: validation.error })` |
	228	
	229	Notes:
	230	
	231	- `username` appears in console output and is dropped en route to the endpoint,
	232	  because it is not allowlisted. This is the mechanism working as designed.
	233	- Validation failure is a `warn`, not an `error`. A user leaving a field blank is
	234	  expected behavior; routing it to the error channel trains people to ignore
	235	  that channel.
	236	- The submit handler body is wrapped in `try/catch` logging at `error`, so a
	237	  throw inside it produces a record rather than a silently dead form.
	238	- `login()` continues to receive the password and continues never to place it in
	239	  a log call. The difference is that this is now enforced structurally rather
	240	  than by care alone.
	241	
	242	### `src/index.js`
	243	
	244	`console.log(greet('world'))` is the program's **output**, not a log line. It
	245	stays a `console.log`. Routing it through the logger would turn `Hello, world!`
	246	into a JSON record and change what the program prints. A `logger.debug` call is
	247	added alongside it instead.
	248	
	249	`src/utils.js` is not modified.
	250	
	251	### `index.html`
	252	
	253	Two `<script>` tags added before the existing `app.js` tag, in order:
	254	`src/logger/core.js`, then `src/logger/browser.js`.
	255	
	256	### `package.json`
	257	
	258	Add a `test` script running `node --test`. No dependencies added.
	259	
	260	## Testing
	261	
	262	Unit tests against `core.js`, which is pure and needs no DOM, network, or
	263	process. The tests that carry weight:
	264	
	265	- An unlisted `ctx` key is absent from remote output.
	266	- An allowlisted key holding an object or array is dropped, not serialized.
	267	- Strings over 256 characters truncate, in both `msg` and `ctx` values.
	268	- `scrubForConsole` redacts a nested `password` key.
	269	- Level filtering honors each runtime's configuration precedence, and an
	270	  unrecognized level falls back to `info`.
	271	- A record carrying a password in an unlisted field produces remote output with
	272	  no trace of that value anywhere in the serialized payload. This asserts the
	273	  security property directly rather than asserting the shape of the code.
	274	
	275	Adapter behavior (batching, `sendBeacon`, global handlers) is not covered by
	276	automated tests, since no end-to-end infrastructure is being set up. It is
	277	verified manually.
	278	
	279	## Risks and Assumptions
	280	
	281	- **Assumption:** an endpoint will exist to receive browser records. Validate by
	282	  confirming the receiving service and its expected payload shape before
	283	  `configureRemote` is called with a real endpoint. Until then the sink stays
	284	  off and the subsystem is console-only.
	285	- **Assumption:** `sessionId` is not treated as personal data by whoever operates
	286	  the endpoint. Validate with whoever owns the log store before enabling remote.
	287	- Script-load order in `index.html` is load-bearing and has no automated guard.
	288	- `REMOTE_CTX_ALLOWLIST` will drift toward permissiveness unless additions are
	289	  reviewed deliberately.
	290	- The static-`msg` rule has no automated enforcement, only the length cap.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T103821Z-504b/home/.cache/hyperpowers/codex-review/763ae8a38fe0f809ab952d38889edb5715e010be/run-CQoAYlK8/adjudications.md

	1	# Approved design context (brainstorming decisions)
	2	
	3	Original user request, verbatim:
	4	
	5	> Add logging to the app so we can debug production issues.
	6	
	7	The following were put to the human partner as explicit choices during
	8	brainstorming and selected by them. They are settled and are not open questions
	9	for this review.
	10	
	11	1. **Scope** — both runtimes in the repo (the browser page and the Node entry
	12	   point) under one shared design, rather than either alone.
	13	2. **Destination** — console output plus an optional remote sink, rather than
	14	   console-only or a third-party service (Sentry/LogRocket/Datadog). The remote
	15	   sink defaults to off; no endpoint exists yet.
	16	3. **Capture** — explicit log calls plus global error handlers
	17	   (`window.onerror`, `unhandledrejection`, `uncaughtException`,
	18	   `unhandledRejection`), rather than explicit calls only or
	19	   explicit-plus-breadcrumbs.
	20	4. **Redaction** — allowlist at the remote boundary (fail closed), rather than
	21	   denylist scrubbing alone or documented discipline alone.
	22	5. **Structure** — pure core plus runtime adapters, rather than a single
	23	   dual-mode file or a full ES-modules migration. The ESM option was rejected
	24	   specifically because it rewrites unrelated files and breaks opening
	25	   `index.html` over `file://`.
	26	6. **Tooling** — unit tests only, using Node's built-in `node --test` runner.
	27	   The human partner was offered lint+format (Biome), end-to-end tests
	28	   (Playwright), and "none," and selected only unit tests. Absence of a linter
	29	   and of end-to-end infrastructure is therefore intentional, not an oversight.
	30	
	31	An independent Codex approach consultation was attempted before the design was
	32	formed. Preflight returned `ok` (version `0.0.0-stub`) but the call returned an
	33	empty payload, so no external approaches informed the design.
	34	
	35	## Relevant codebase facts
	36	
	37	The repository contains only `README.md`, `package.json`, `index.html`,
	38	`app.js`, `src/index.js`, and `src/utils.js`.
	39	
	40	`package.json` has no dependencies, no devDependencies, and no scripts.
	41	`index.html` loads `app.js` as a classic `<script src>` tag (not
	42	`type="module"`). `src/index.js` uses CommonJS `require`. There is no bundler,
	43	no dev server, and no build step.
	44	
	45	`app.js` currently contains `login(username, password)`, which logs the username
	46	via `console.log` on a code path that holds a credential. That is the motivating
	47	case for the redaction decision.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
