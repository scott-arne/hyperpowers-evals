# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T102102Z-2302/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-logging-subsystem-design.md

	1	# Logging Subsystem Design
	2	
	3	Date: 2026-09-17
	4	Status: Approved design, pending implementation plan
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	The application has no logging subsystem. The only diagnostic output is four
	10	ad-hoc `console` calls in `app.js`, which stay on the user's machine and are
	11	therefore invisible when a production issue is reported. There is no way to
	12	reconstruct what a session did before it failed.
	13	
	14	Two of those existing calls are actively harmful: `app.js:6` writes a username
	15	to the console on every login attempt, and `app.js:25` writes the full login
	16	result object. Instrumenting an authentication flow is precisely where
	17	credentials leak into log stores, so redaction is a first-class concern of this
	18	design rather than a later hardening pass.
	19	
	20	## Goals
	21	
	22	- Structured, machine-readable log records from both the browser webapp and the
	23	  Node `src/` module.
	24	- Records from the browser reach a place the team can query during an incident.
	25	- Records from one session can be reconstructed into a sequence.
	26	- Credentials and unclassified data cannot reach the log store by accident.
	27	- The logger cannot degrade the application it is instrumenting.
	28	
	29	## Non-Goals
	30	
	31	- Metrics, tracing, or performance instrumentation. Logs only.
	32	- A log query UI, dashboard, or alerting. This produces records; consuming them
	33	  is somebody else's system.
	34	- Cross-session user analytics. Explicitly excluded by the correlation decision
	35	  below.
	36	- Adopting a third-party error-tracking vendor. Rejected during brainstorming;
	37	  the sink interface leaves the door open.
	38	
	39	## Decisions
	40	
	41	These were settled during brainstorming and are fixed inputs to the plan.
	42	
	43	| # | Decision | Rationale |
	44	|---|---|---|
	45	| 1 | Cover both the browser webapp and Node `src/` | One subsystem, per-environment sinks |
	46	| 2 | Console sink plus a pluggable batching remote sink | Only option that makes browser-side failures visible; keeps the repo free of runtime dependencies; a vendor SDK can be added later behind the same sink interface |
	47	| 3 | Deny by default (allowlist), with a name scrubber as a second layer | A mistake costs a missing field, never a leaked credential. Tightening later would mean auditing every call site; loosening later is a one-line change. A credential already in the log store cannot be un-shipped |
	48	| 4 | Ephemeral session ID | Buys sequence reconstruction without creating a persistent tracking identifier and the consent and retention obligations that follow |
	49	| 5 | Convert the repo to ES modules | The repo runs two incompatible module systems (`src/` is CommonJS, `app.js` is a classic script). That split is the direct cause of the packaging awkwardness, so fixing it is targeted at this work rather than unrelated refactoring |
	50	| 6 | `username` field policy is `presence` | No PII reaches the log store. Accepted cost: logs alone cannot identify which account hit a bug |
	51	
	52	Alternatives considered and rejected: a single dual-mode UMD file (environment
	53	branching accumulates in the core), core-plus-adapters with UMD footers
	54	(introduces invisible `<script>` load-order coupling in `index.html`),
	55	console-only logging (does not solve browser-side visibility), a denylist
	56	redaction model (fails open), and a persistent `localStorage` device ID.
	57	
	58	The Codex approach gate was run and returned an empty response. No independent
	59	Codex approaches were folded in; the approaches above are the author's.
	60	
	61	## Architecture
	62	
	63	```
	64	logging/
	65	  index.js         public API, level config, sink wiring
	66	  record.js        levels, record construction, session ID
	67	  redact.js        field registry, allowlist projection, name scrubber
	68	  sink-console.js  console sink
	69	  sink-remote.js   batching remote sink and its own flush registration
	70	```
	71	
	72	`record.js` and `redact.js` are pure: no I/O, no environment access. `index.js`
	73	is the only module the rest of the repository imports.
	74	
	75	Both environments run the same core. Exactly two things differ, and both are
	76	confined to `sink-remote.js`:
	77	
	78	- Transport: `navigator.sendBeacon` when present for the unload flush,
	79	  `fetch(..., { keepalive: true })` otherwise. Node 18+ provides global `fetch`.
	80	- Flush trigger: `pagehide` in the browser, `process.on('beforeExit')` in Node.
	81	
	82	Keeping this feature detection in one leaf module, rather than in the core, is
	83	the reason approach C was chosen over a single dual-mode file.
	84	
	85	### Data flow
	86	
	87	```
	88	call site -> index.js (level filter)
	89	          -> record.js (build record, attach ts/level/sessionId/env)
	90	          -> redact.js (allowlist projection, then scrubber; returns scrubbedKeys)
	91	          -> each enabled sink (console; remote if configured)
	92	          -> sink-remote.js buffer -> batch -> transport
	93	```
	94	
	95	Redaction runs before any sink sees the record, so no sink can observe
	96	unprojected data.
	97	
	98	## Record Shape
	99	
	100	```js
	101	{
	102	  ts:        "2026-09-17T10:21:02.123Z",  // ISO 8601, UTC
	103	  level:     "info",                       // debug | info | warn | error
	104	  msg:       "login attempt",              // static string
	105	  sessionId: "9f2c...",                    // ephemeral, per page load / process
	106	  env:       "browser",                    // or "node"
	107	  ctx:       { /* allowlisted keys only */ },
	108	  err:       { name, message, stack }      // present on error records only
	109	}
	110	```
	111	
	112	**`msg` MUST be a static string literal.** All variable data goes in `ctx`,
	113	where the allowlist can inspect it. An interpolated message such as
	114	`` `Logging in: ${username}` `` would bypass deny-by-default in the most
	115	natural-looking way available, filling the log store with values no scrubber
	116	ever inspected. Static messages are also what make records groupable during an
	117	incident.
	118	
	119	Enforcement: the logger signature is `(msg, ctx)` and never accepts a template
	120	argument. A lint rule may reinforce this later; it is not required for the
	121	first implementation.
	122	
	123	`sessionId` is a single `crypto.randomUUID()` minted at module load. Available
	124	natively in Node 18+ and all current browsers, so no dependency and no fallback
	125	path.
	126	
	127	## Levels and Configuration
	128	
	129	Four levels, numerically ordered: `debug` < `info` < `warn` < `error`. Records
	130	below the configured minimum are discarded before record construction.
	131	
	132	- Node: reads `LOG_LEVEL`, defaulting to `info`.
	133	- Browser: defaults to `warn`, or `debug` when the hostname is `localhost`.
	134	  Overridable at runtime via a `logLevel` key in `localStorage`, so support can
	135	  ask a user to raise verbosity and reproduce. This is a settings value, not an
	136	  identifier, and does not conflict with decision 4.
	137	
	138	The remote sink is wired only when an endpoint URL is configured. With it
	139	unset, the subsystem is console-only, so local development requires no setup
	140	and cannot accidentally transmit records.
	141	
	142	## Redaction
	143	
	144	The allowlist is a **central field registry** in `redact.js`, not per-call-site
	145	declarations. Scattering allowlists through call sites would make the policy
	146	unreviewable: nobody could answer "what can leave the browser?" without
	147	grepping the whole codebase.
	148	
	149	```js
	150	export const FIELD_POLICY = {
	151	  errorCode:  'raw',
	152	  formValid:  'raw',
	153	  fieldCount: 'raw',
	154	  httpStatus: 'raw',
	155	  durationMs: 'raw',
	156	  username:   'presence',
	157	};
	158	```
	159	
	160	`project(ctx)` drops every key absent from the registry. Call sites stay clean:
	161	`log.info("login attempt", { username, formValid })`.
	162	
	163	Policies are synchronous only:
	164	
	165	- `raw` — the value passes through.
	166	- `presence` — emitted as a boolean recording whether the value was non-empty.
	167	- `length` — emitted as a character count.
	168	
	169	Hashing was deliberately excluded. `crypto.subtle` is asynchronous in browsers,
	170	and making the entire logging API asynchronous to support one transform is a
	171	bad trade.
	172	
	173	**Second layer.** Before any record reaches a sink, a scrubber walks it and
	174	replaces values whose key matches `/pass|token|secret|auth|cookie|credit|ssn/i`
	175	with `[REDACTED]`. Because projection already ran, this should never fire. That
	176	is the point: it is an alarm, not a filter.
	177	
	178	To keep `redact.js` pure, the scrubber does not emit the alarm itself. It
	179	returns `{ record, scrubbedKeys }`, and `index.js` emits a warning through the
	180	console sink only when `scrubbedKeys` is non-empty. Console-only is deliberate:
	181	routing the alarm to the remote sink would recurse through the same redaction
	182	path that just failed.
	183	
	184	**Residual risk.** `err.stack` is an opaque string the scrubber cannot
	185	meaningfully inspect. JavaScript stacks do not embed argument values the way
	186	Python tracebacks can, so exposure is small, but it is not zero. The pipeline
	187	is not airtight and should not be described as such.
	188	
	189	## Remote Sink and Self-Protection
	190	
	191	Records buffer in memory. A flush occurs when any of these is true:
	192	
	193	- 20 records are queued.
	194	- 5 seconds have elapsed since the last flush.
	195	- An `error`-level record arrives (flush immediately; the crash is the record
	196	  that matters most).
	197	- The page or process is terminating.
	198	
	199	Payload: `{ sessionId, env, records: [...] }` as JSON.
	200	
	201	A logger that degrades the application it is debugging is worse than no logger,
	202	so failure behavior is specified explicitly:
	203	
	204	- **Never throws into caller code.** Every sink invocation is wrapped. A sink
	205	  failure cannot break a login.
	206	- **No retry storm.** A failed batch is dropped, not requeued. A `dropped`
	207	  counter rides in the next successful envelope so consumers know the record
	208	  stream has holes.
	209	- **Bounded buffer** of 200 records, dropping oldest first. A long-lived tab
	210	  with a dead endpoint cannot grow memory without limit.
	211	- **Circuit breaker.** After 3 consecutive failures, stop attempting for 60
	212	  seconds. Without it, a down collector means every user's browser POSTs at it
	213	  every 5 seconds indefinitely — self-inflicted load during exactly the
	214	  incident being debugged.
	215	
	216	## Migration of Existing Code
	217	
	218	- `package.json`: add `"type": "module"`, a `scripts` block, and Biome as the
	219	  sole devDependency.
	220	- `src/utils.js`, `src/index.js`: convert `require`/`module.exports` to
	221	  `import`/`export`.
	222	- `index.html`: script tag becomes `<script type="module" src="app.js">`.
	223	- `app.js`: functions become real exports rather than script-scope globals.
	224	- `app.js:6` (`console.log("Logging in:", username)`) and `app.js:25` (full
	225	  login result) are **replaced**, not ported. Their replacements carry
	226	  `username` under the `presence` policy.
	227	- `app.js:27`'s validation `console.error` becomes a `warn`-level record with
	228	  `errorCode`.
	229	- `src/index.js:4`'s `console.log(greet('world'))` is program output, not
	230	  logging, and stays as-is.
	231	
	232	Known workflow regression: ES modules are blocked over `file://` by CORS, so
	233	opening `index.html` by double-clicking will stop working. Local viewing needs
	234	a static server. Accepted during brainstorming on the grounds that the remote
	235	sink needs a real origin regardless and production serves over HTTP.
	236	
	237	## Testing
	238	
	239	`record.js` and `redact.js` are pure and test directly.
	240	
	241	`sink-remote.js` takes its **transport and flush registration as injected
	242	parameters**, defaulting to environment detection. This is a design
	243	requirement, not only a testing convenience: it is what allows buffering, batch
	244	thresholds, drop counting, and the circuit breaker to be tested against a fake
	245	transport and a fake clock with no browser and no network.
	246	
	247	Required coverage:
	248	
	249	- A password placed in `ctx` never appears anywhere in the payload handed to
	250	  the transport. This is the assertion protecting the highest-consequence
	251	  failure and must exist.
	252	- Unregistered keys are dropped by projection.
	253	- `presence` never emits the underlying value.
	254	- The scrubber reports a sensitive key in `scrubbedKeys`, and `index.js` turns
	255	  that into a console-only warning that never reaches the remote sink.
	256	- Level filtering discards records below the configured minimum.
	257	- Flush triggers: count threshold, time threshold, error-level immediate,
	258	  termination.
	259	- Circuit breaker opens after 3 failures and closes after cooldown.
	260	- Bounded buffer drops oldest beyond 200.
	261	- A throwing sink does not propagate to the caller.
	262	
	263	## Global Constraints
	264	
	265	Every implementation task inherits these:
	266	
	267	- **Unit tests:** Node's built-in `node:test` and `node:assert`, run via
	268	  `node --test`. No test-framework dependency.
	269	- **Lint and format:** Biome, configured via a checked-in `biome.json`. The
	270	  only devDependency.
	271	- **Runtime dependencies:** none. The subsystem must remain dependency-free.
	272	- **End-to-end and fuzz/mutation testing:** out of scope for this work.
	273	- Comments explain why, not what. No attribution or AI-generated markers.
	274	- The spec document is not committed.
	275	
	276	## Assumptions
	277	
	278	- Assumption: a log collector endpoint accepting JSON POST bodies will be
	279	  available; validate by confirming the URL and payload contract with whoever
	280	  operates it before the remote sink is enabled in production.
	281	- Assumption: the Node deployment runs Node 18 or later, for global `fetch` and
	282	  `crypto.randomUUID`; validate by checking the deployment runtime and
	283	  recording it in an `engines` field.
	284	- Assumption: the supported browser matrix covers native ES modules,
	285	  `crypto.randomUUID`, and `navigator.sendBeacon`; validate by confirming the
	286	  matrix with the team.
	287	- Assumption: the "production issues" motivating this work are in the browser
	288	  webapp rather than `src/`, which is currently a hello-world module; validate
	289	  by asking which failures prompted the request.
	290	- Assumption: no consent or cookie-banner obligation is triggered, on the basis
	291	  that no persistent identifier is stored and no PII is transmitted; validate
	292	  with whoever owns privacy review before production rollout.
	293	
	294	## Open Risks
	295	
	296	- The collector endpoint does not exist yet, so the remote sink cannot be
	297	  verified end-to-end during implementation. It will be tested against a fake
	298	  transport only.
	299	- `presence` for `username` means a production report of "user X cannot log in"
	300	  cannot be matched to log records by account. If that proves limiting, the
	301	  registry is one line to change, but the earlier records stay unidentified.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T102102Z-2302/home/.cache/hyperpowers/codex-review/763ae8a38fe0f809ab952d38889edb5715e010be/run-PLOA8fCW/adjudications.md

	1	# Approved design context (brainstorming adjudications)
	2	
	3	## Original user request, verbatim
	4	
	5	> Add logging to the app so we can debug production issues.
	6	
	7	## Decisions the human partner explicitly approved
	8	
	9	1. **Scope** — the subsystem covers BOTH the browser webapp (`app.js`,
	10	   `index.html`) and the Node module (`src/`). Chosen over browser-only and
	11	   Node-only.
	12	2. **Destination** — console sink plus a pluggable batching remote sink. Chosen
	13	   over console-only and over adopting a third-party SDK (Sentry). No runtime
	14	   dependencies.
	15	3. **Redaction default** — deny by default (allowlist), with a name-based
	16	   scrubber as a second layer. Chosen over an allow-by-default denylist and over
	17	   messages-only-no-payloads.
	18	4. **Correlation** — ephemeral session ID, in memory, per page load / per
	19	   process start. Chosen over a persistent `localStorage` device ID and over no
	20	   correlation ID.
	21	5. **Packaging** — convert the repository to ES modules, then build the
	22	   subsystem with native `import`/`export`. Chosen over a single dual-mode UMD
	23	   file and over core-plus-adapters with UMD footers. The human partner accepted
	24	   the known cost that `file://` opening of `index.html` stops working.
	25	6. **Browser level override** — a `logLevel` key in `localStorage`. Chosen over
	26	   a build/page-injected constant only and over a URL query parameter.
	27	7. **`username` field policy** — `presence`. Chosen over `raw` and over
	28	   `length`. The human partner accepted that logs alone cannot identify which
	29	   account hit a bug.
	30	8. **Tooling** — set up unit tests (`node:test`) and lint/format (Biome) from
	31	   the start. End-to-end tests and fuzz/mutation testing were explicitly
	32	   excluded.
	33	
	34	## Design sections the human partner approved in chat
	35	
	36	- Sections 1-2 (module layout; record shape; the static-`msg` rule; levels and
	37	  configuration) — approved as presented.
	38	- Sections 3-4 (central field registry; scrubber-as-alarm; remote sink batching
	39	  and self-protection) — approved as presented.
	40	- Section 5 (testing approach; injected transport and flush registration;
	41	  tooling selections) — approved as presented.
	42	
	43	## Process note
	44	
	45	The Codex approach gate was run before the design was presented. It returned an
	46	empty response (`{}`), so no independent Codex approaches were folded in. This
	47	is recorded in the spec.
	48	
	49	## Repository facts the spec is written against
	50	
	51	- Four commits; branch `feature/webapp-enhancement`; working tree was clean.
	52	- Files: `README.md`, `app.js`, `index.html`, `package.json`, `src/index.js`,
	53	  `src/utils.js`.
	54	- `package.json` has no dependencies, no devDependencies, no scripts, no `type`.
	55	- No lockfile, no build step, no bundler, no test runner, no linter, no
	56	  formatter.
	57	- `src/` is CommonJS; `app.js` is a classic script loaded by a bare
	58	  `<script src="app.js">`.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
