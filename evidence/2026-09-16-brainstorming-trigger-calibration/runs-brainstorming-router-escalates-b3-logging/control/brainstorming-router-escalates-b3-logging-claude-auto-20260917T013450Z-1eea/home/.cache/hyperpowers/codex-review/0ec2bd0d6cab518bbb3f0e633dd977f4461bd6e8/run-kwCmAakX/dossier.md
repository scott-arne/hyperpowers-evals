# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T013450Z-1eea/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-logging-design.md

	1	# Application Logging — Design
	2	
	3	Date: 2026-09-16
	4	Status: Approved (design), pending implementation plan
	5	
	6	## Problem
	7	
	8	The app has no logging subsystem. Diagnostic output is four ad-hoc
	9	`console.*` calls spread across two runtimes:
	10	
	11	- `app.js:5` — `console.log("Logging in:", username)`
	12	- `app.js:24` — `console.log("Login result:", result)`
	13	- `app.js:26` — `console.error("Validation error:", ...)`
	14	- `src/index.js:4` — `console.log(greet('world'))`
	15	
	16	These cannot be filtered, cannot be silenced or amplified without editing
	17	source, carry no timestamp or severity, and cannot be routed anywhere other
	18	than the local console. `app.js:5` logs a username in a function whose
	19	signature also carries a plaintext password, so the current pattern is one
	20	careless edit away from writing a credential to the console.
	21	
	22	The goal is a logging module both runtimes share, with severity levels, a
	23	structured record, redaction of sensitive fields, and a transport boundary
	24	that allows remote log shipping to be added later without touching call
	25	sites.
	26	
	27	## Global Constraints
	28	
	29	- **No runtime dependencies.** The repo has no `node_modules`, no lockfile,
	30	  and no build step. The logger is hand-written and adds neither.
	31	- **No build step.** `index.html` loads `app.js` as a classic script;
	32	  `src/index.js` uses CommonJS. The logger must work in both without a
	33	  bundler or a module-system migration.
	34	- **Unit tests via `node:test`.** The built-in Node test runner, no
	35	  dependencies. Redaction, level filtering, and record shape are covered.
	36	  A `test` script is added to `package.json`.
	37	- **No linter or formatter** is introduced by this work.
	38	- **No end-to-end test infrastructure** is introduced by this work.
	39	- Out of scope: any remote log-ingest service, log retention policy, or
	40	  changes to the login flow's behavior.
	41	
	42	## Decisions
	43	
	44	Each of these was chosen over stated alternatives during design.
	45	
	46	| Decision | Chosen | Rejected |
	47	|---|---|---|
	48	| Surface | Both runtimes, one shared module | Browser only; Node only |
	49	| Destination | Console transport now, pluggable transport seam | Console only (no seam); remote shipping now |
	50	| Redaction | Denylist in the logger | Allowlist; caller responsibility |
	51	| Module format | UMD-style single file, no build | ESM migration; bundler + logging library |
	52	
	53	Remote shipping was rejected for now because no log-ingest endpoint exists —
	54	`API_ENDPOINT` in `app.js` points at `api.example.com`, a stub — and because
	55	shipping logs off-device raises retention and PII questions beyond the scope
	56	of this change. The transport seam exists so that decision stays cheap.
	57	
	58	## Architecture
	59	
	60	### `src/logger.js` (new)
	61	
	62	A single file wrapped UMD-style: it assigns to `module.exports` when
	63	`module` is defined, and otherwise attaches `Logger` to `window`. No other
	64	module system is involved.
	65	
	66	Public surface:
	67	
	68	```js
	69	Logger.create({ name, level, transport }) -> logger
	70	Logger.consoleTransport
	71	logger.debug(msg, fields)
	72	logger.info(msg, fields)
	73	logger.warn(msg, fields)
	74	logger.error(msg, fields)
	75	```
	76	
	77	`create` options:
	78	
	79	- `name` (string, required) — a stable tag identifying the call site's
	80	  subsystem, so one flow's output is filterable from the rest.
	81	- `level` (string, optional) — minimum severity to emit. Defaults to the
	82	  ambient level resolution below.
	83	- `transport` (function, optional) — defaults to `consoleTransport`.
	84	
	85	### Levels
	86	
	87	Ordered `debug(10) < info(20) < warn(30) < error(40)`. A call emits when its
	88	level's numeric value is greater than or equal to the configured threshold.
	89	
	90	Threshold resolution, in precedence order:
	91	
	92	1. The `level` passed to `create`.
	93	2. `process.env.LOG_LEVEL` when running under Node.
	94	3. `window.__LOG_LEVEL__` when running in a browser.
	95	4. `"info"`.
	96	
	97	Sources 2 and 3 exist so verbosity can be raised in production without a
	98	code change or a deploy. An unrecognized level string falls back to `"info"`
	99	rather than throwing; a logger that crashes the app it is instrumenting is
	100	worse than one that is too quiet.
	101	
	102	### Record shape
	103	
	104	Every emitting call constructs exactly one record and hands it to the
	105	transport:
	106	
	107	```js
	108	{
	109	  ts:    "2026-09-16T12:34:56.789Z",  // ISO 8601, new Date().toISOString()
	110	  level: "warn",                       // string, not numeric
	111	  name:  "auth",
	112	  msg:   "validation failed",
	113	  fields: { /* scrubbed; omitted when the caller passed nothing */ }
	114	}
	115	```
	116	
	117	The record is the contract between the logger and any transport. A future
	118	remote transport consumes this same shape.
	119	
	120	### Redaction
	121	
	122	`fields` is scrubbed before the record reaches the transport. A key is
	123	redacted when its *normalized* form matches any denylist entry exactly.
	124	Normalizing means lowercasing the key and removing `_` and `-`, so
	125	`API_KEY`, `api-key`, and `apiKey` all normalize to `apikey`. Without this
	126	step a naive lowercase comparison would miss the snake_case and kebab-case
	127	spellings that are most common in configuration objects.
	128	
	129	Denylist entries (already in normalized form): `password`, `passwd`,
	130	`secret`, `token`, `apikey`, `authorization`.
	131	
	132	Matching is exact against the normalized key, not a substring test. A
	133	substring test would redact `tokenCount` or `passwordResetRequested`, which
	134	are diagnostic fields worth keeping.
	135	
	136	A redacted value is replaced with the string `"[redacted]"`; the key itself
	137	is preserved so its presence remains visible in the log.
	138	
	139	The scrub recurses into plain objects and arrays with a depth cap of 4.
	140	Beyond the cap, the value is replaced with `"[truncated]"`. The cap bounds
	141	work on deep structures and prevents a cyclic object from hanging the
	142	logger.
	143	
	144	**Stated limitation:** the scrub applies to `fields` only. `msg` is a string
	145	the caller has already assembled, and the design does not attempt to scrub
	146	free text. `log.info("logging in " + password)` still leaks. This is why the
	147	integration below passes structured fields rather than interpolated strings,
	148	and why call sites should follow that pattern.
	149	
	150	### Transport seam
	151	
	152	A transport is a function with the signature `(record) => void`. The logger
	153	calls it once per emitted record and ignores its return value.
	154	
	155	`consoleTransport` is the only implementation shipped. It maps levels to
	156	`console.debug`, `console.info`, `console.warn`, and `console.error`
	157	respectively, and prints the record.
	158	
	159	A remote transport would implement the same signature, with batching,
	160	retry, and failure handling contained inside it. The logger does no
	161	buffering, no async work, and no error handling on the transport's behalf.
	162	No remote transport is built by this work.
	163	
	164	## Integration
	165	
	166	### `app.js`
	167	
	168	Create one logger: `const log = Logger.create({ name: "auth" })`.
	169	
	170	| Current | Replacement |
	171	|---|---|
	172	| `console.log("Logging in:", username)` | `log.info("login attempt", { username })` |
	173	| `console.log("Login result:", result)` | `log.info("login result", { success: result.success })` |
	174	| `console.error("Validation error:", validation.error)` | `log.warn("validation failed", { error: validation.error })` |
	175	
	176	Notes:
	177	
	178	- `username` is deliberately retained — it is the field production debugging
	179	  correlates on, and it is not a credential.
	180	- The password is never passed to a log call. The denylist is a backstop,
	181	  not the primary control.
	182	- The result log records `success` rather than spreading the whole result
	183	  object, so growth in that object does not silently widen log output.
	184	- Validation failure is `warn`, not `error`: a user mistyping a form is
	185	  expected behavior, and reserving `error` for genuine faults keeps
	186	  error-level filtering useful.
	187	
	188	### `src/index.js`
	189	
	190	Create `const log = Logger.create({ name: "cli" })` and add
	191	`log.debug("greeting generated", { name })`. This file has little to debug;
	192	the instrumentation exists to prove the module loads and behaves under
	193	CommonJS. The existing `console.log(greet('world'))` remains — it is the
	194	program's output, not a diagnostic, and routing it through the logger would
	195	suppress it at the default level.
	196	
	197	### `index.html`
	198	
	199	Add `<script src="src/logger.js"></script>` immediately before the existing
	200	`<script src="app.js"></script>`. Load order matters: `app.js` reads
	201	`window.Logger` at evaluation time.
	202	
	203	## Testing
	204	
	205	`test/logger.test.js`, run by `node --test`. A `"test": "node --test"` script
	206	is added to `package.json`.
	207	
	208	Tests inject a recording transport — an array-push function — so assertions
	209	run against the record objects themselves rather than captured console
	210	output.
	211	
	212	Coverage:
	213	
	214	1. **Level filtering** — a logger at `warn` emits `warn` and `error`,
	215	   suppresses `debug` and `info`. Boundary included: the configured level
	216	   itself emits.
	217	2. **Level resolution precedence** — explicit option beats `LOG_LEVEL`
	218	   beats the `"info"` default; an unrecognized string falls back to `"info"`
	219	   rather than throwing.
	220	3. **Record shape** — `ts` parses as a valid ISO 8601 date, `level` and
	221	   `name` match, `fields` is absent when the caller passed nothing.
	222	4. **Redaction** — each denylisted key is replaced at the top level; key
	223	   normalization matches `Password`, `API_KEY`, `api-key`, and `apiKey`;
	224	   near-miss keys (`tokenCount`, `username`) pass through unchanged,
	225	   confirming exact-match rather than substring semantics; the key is
	226	   preserved alongside the redacted value.
	227	5. **Nested redaction** — a denylisted key nested inside an object and
	228	   inside an array element is redacted.
	229	6. **Depth cap** — a structure deeper than 4 levels yields `"[truncated]"`
	230	   rather than recursing, and a cyclic object does not hang.
	231	7. **Transport contract** — the transport is called exactly once per
	232	   emitted record and not at all for a suppressed one.
	233	
	234	The UMD wrapper's browser branch is not unit tested; `node:test` has no DOM.
	235	It is verified by loading `index.html` and exercising the form manually.
	236	
	237	## Risks and Assumptions
	238	
	239	- **Assumption: no log-ingest endpoint is planned imminently.** Validate by
	240	  confirming with the user before implementation. If one exists, the remote
	241	  transport should be designed alongside this work rather than deferred,
	242	  since batching and failure semantics may constrain the record shape.
	243	- The denylist fails open: a sensitive field whose key nobody listed is
	244	  logged verbatim. Accepted deliberately in favor of an allowlist's call-site
	245	  friction. Revisit if real user data begins flowing through `fields`.
	246	- `msg` is unscrubbed free text, as stated above.
	247	- The UMD idiom is dated. It is the cost of supporting a classic script tag
	248	  and CommonJS with no build step, and it is contained in one wrapper at the
	249	  top of one file.
	250	- Browser logs remain on the user's device. Until a remote transport exists,
	251	  "debug production issues" in the browser still means obtaining the user's
	252	  console output.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T013450Z-1eea/home/.cache/hyperpowers/codex-review/0ec2bd0d6cab518bbb3f0e633dd977f4461bd6e8/run-kwCmAakX/adjudications.md

	1	# Approved design decisions — logging subsystem
	2	
	3	Original user request, verbatim:
	4	
	5	> Add logging to the app so we can debug production issues.
	6	
	7	The repository is a minimal two-runtime fixture: a browser login page
	8	(`index.html` + `app.js`, loaded as a classic script) and a CommonJS Node
	9	entry point (`src/index.js` + `src/utils.js`). No dependencies, no lockfile,
	10	no build step, no tests, no lint config.
	11	
	12	The following four decisions were each presented to the human partner as an
	13	explicit fork with alternatives and tradeoffs, and each was chosen by them.
	14	They are settled inputs to the spec, not open questions. A review finding
	15	that merely re-argues one of these choices is out of scope; a finding that
	16	shows a choice is internally inconsistent with the rest of the spec, or that
	17	the spec fails to implement the choice it claims, is in scope.
	18	
	19	1. **Surface — both runtimes, one shared module.**
	20	   Rejected: browser only; Node only.
	21	
	22	2. **Destination — console transport now, behind a pluggable transport seam.**
	23	   Rejected: console only with no seam; remote log shipping now.
	24	   Reason for rejecting remote shipping: no log-ingest endpoint exists
	25	   (`API_ENDPOINT` in `app.js` is the stub `https://api.example.com/login`),
	26	   and shipping logs off-device raises retention and PII questions outside
	27	   this change's scope.
	28	
	29	3. **Redaction — denylist inside the logger.**
	30	   Rejected: allowlist (call-site friction); caller responsibility (the repo
	31	   already logs a username beside a plaintext password, so review discipline
	32	   is not a reliable control here).
	33	
	34	4. **Module format — UMD-style single file, no build step.**
	35	   Rejected: migrating the repo to ESM; adding a bundler plus an npm logging
	36	   library (pino/loglevel).
	37	
	38	Tooling selected by the human partner for this work, recorded in the spec's
	39	Global Constraints:
	40	
	41	- Unit tests via the built-in `node:test` runner (zero dependencies).
	42	- NOT selected: ESLint/Prettier; end-to-end test infrastructure.
	43	
	44	Design approval: the human partner reviewed the architecture, record shape,
	45	redaction rule, transport seam, and integration plan in chat and approved
	46	them ("looks good, go ahead") before the spec was written.
	47	
	48	Process note: this review is the spec gate. The spec has had one Claude
	49	self-review pass, which found and fixed one contradiction (the redaction
	50	rule matched full lowercased key names while the test list expected
	51	`API_KEY` to match the entry `apikey`; the rule now normalizes keys by
	52	lowercasing and stripping `_` and `-`).


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
