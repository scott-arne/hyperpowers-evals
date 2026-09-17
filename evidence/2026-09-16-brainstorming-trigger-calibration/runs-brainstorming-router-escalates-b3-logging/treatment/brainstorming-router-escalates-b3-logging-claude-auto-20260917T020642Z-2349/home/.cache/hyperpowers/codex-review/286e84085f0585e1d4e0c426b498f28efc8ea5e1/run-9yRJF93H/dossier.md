# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T020642Z-2349/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-logging-subsystem-design.md

	1	# Logging Subsystem Design
	2	
	3	Date: 2026-09-16
	4	Status: approved for planning
	5	
	6	## Problem
	7	
	8	The app has no logging subsystem. It has four bare `console` calls in `app.js`
	9	and one in `src/index.js`. Console output on a user's machine is invisible to
	10	us, so production failures currently cannot be diagnosed unless they reproduce
	11	locally.
	12	
	13	## Goals
	14	
	15	- A single shared logging core serving both the browser app and the Node entry
	16	  point.
	17	- Browser records delivered to a collector endpoint we own, reliably enough to
	18	  survive tab close and collector downtime.
	19	- No credential or raw personal data may ever reach a log record.
	20	- Redaction correctness enforced by unit tests, not by review.
	21	
	22	## Non-goals
	23	
	24	- Third-party log/APM services. Ruled out to keep the project dependency-free
	25	  and log data in-house.
	26	- Lint/format tooling and end-to-end tests. Explicitly declined.
	27	- Metrics, tracing, or alerting. Logging only.
	28	- Instrumenting `src/utils.js`, which is a pure function with nothing to
	29	  diagnose.
	30	
	31	## Decisions
	32	
	33	| Decision | Choice | Rationale |
	34	|---|---|---|
	35	| Scope | Browser and Node, shared core | Consistent record shape; one place to change redaction rules |
	36	| Browser sink | Self-owned endpoint, batched POST | No dependencies; log data stays in-house |
	37	| Redaction | Field allowlist | Failure mode is a missing log line, not a leaked credential |
	38	| User identity | Random per-session id | Log store holds no personal data, not even pseudonymous |
	39	| Module strategy | Dual-mode adapters, no ESM migration | Avoids bundling a module-system migration into this task |
	40	| Tooling | `node --test` unit tests only | Redaction is security-critical and must be test-enforced |
	41	
	42	## Architecture
	43	
	44	Three new files; `src/utils.js` is untouched.
	45	
	46	### `src/logger.js` — the core
	47	
	48	Pure record construction. No I/O, no environment detection, no globals. Owns:
	49	
	50	- the record schema,
	51	- the field allowlist and the hard deny list,
	52	- the level threshold,
	53	- handing finished records to an injected sink.
	54	
	55	Keeping the core free of environment branching is what makes it directly unit
	56	testable under `node --test` with no DOM or network stubs.
	57	
	58	### `src/logger-node.js` — Node adapter
	59	
	60	Wires the core to a stdout JSON-lines sink. Reads `LOG_LEVEL` from the
	61	environment. No endpoint, no HTTP, no buffering, no circuit breaker: the
	62	platform collects stdout.
	63	
	64	### `src/logger-browser.js` — browser adapter
	65	
	66	Wires the core to the buffered HTTP sink, attaches page context, assigns
	67	`window.log`, and installs `window.onerror` and `unhandledrejection` handlers.
	68	
	69	Dual-mode export lives only in these two adapters (`module.exports` versus
	70	assignment to `window`), never in the core.
	71	
	72	### Wiring
	73	
	74	- `index.html` gains a small inline `window.__LOG_CONFIG__` block plus
	75	  `<script>` tags for `src/logger.js` and `src/logger-browser.js`, all before
	76	  `app.js`.
	77	- `src/index.js` gains a `require` of `src/logger-node.js`.
	78	- `app.js`: the existing `console` calls at lines 5, 24, and 26 become `log.*`
	79	  calls, and `login()` gains failure-path logging. `validateForm` logs which
	80	  field was missing, never its value.
	81	
	82	## Record schema
	83	
	84	```json
	85	{
	86	  "ts": "2026-09-16T14:22:31.004Z",
	87	  "level": "info",
	88	  "event": "login.attempt",
	89	  "msg": "Login attempt started",
	90	  "runtime": "browser",
	91	  "session": "b7f2c9a1e4d8",
	92	  "ctx": { "field": "password", "reason": "missing" },
	93	  "app": { "name": "drill-test-project", "version": "1.0.0" }
	94	}
	95	```
	96	
	97	- `event` is the stable machine-readable key queries are written against
	98	  (`login.attempt`, `login.failure`, `validation.rejected`).
	99	- `msg` is prose for humans and carries no structural guarantees.
	100	- **All variable data goes in `ctx` and nowhere else.** This single funnel is
	101	  what makes the allowlist enforceable.
	102	- `session` is a random per-session identifier, not derived from the username
	103	  and not stable across sessions. It is the only identity field; there is no
	104	  separate user reference. This is the value the error UI surfaces for users to
	105	  quote in support tickets.
	106	
	107	Levels: `debug`, `info`, `warn`, `error`. Default threshold `info`.
	108	
	109	## Redaction
	110	
	111	A module-level allowlist constant in the core. Any `ctx` key not on it is
	112	dropped before the record is constructed; the record carries
	113	`droppedFields: <n>` so withheld information is visible as a count without
	114	exposing its content.
	115	
	116	Initial allowlist: `field`, `reason`, `status`, `errorCode`, `durationMs`,
	117	`attempt`.
	118	
	119	A hard deny list — `password`, `token`, `secret` — cannot be added to the
	120	allowlist; attempting to do so throws, and a test asserts it.
	121	
	122	The browser adapter logs `location.pathname` only. Query strings and fragments
	123	are never logged, because they carry tokens and reset codes.
	124	
	125	Error messages captured from `window.onerror` and `unhandledrejection` are
	126	truncated to 500 characters.
	127	
	128	**Residual risk:** `msg` is unfiltered prose, so a call site that interpolates
	129	a secret into the message string defeats the allowlist. The convention is that
	130	`msg` must be a static string literal, with variable data in `ctx`. This is
	131	enforced by convention and review only — no linter is in scope to check it.
	132	
	133	### Identity rationale
	134	
	135	A synchronous hash of a username was considered and rejected. A cryptographic
	136	hash in the browser requires `crypto.subtle.digest`, which is async and would
	137	force the entire log API to be async. The synchronous alternative (salted
	138	FNV-1a) is brute-forceable against low-entropy usernames and remains personal
	139	data under GDPR-style regimes.
	140	
	141	The random session id inverts the correlation direction: the error UI surfaces
	142	the session id and the user quotes it in a support ticket. Cross-session
	143	user history is lost; that was accepted.
	144	
	145	## Delivery and buffering (browser)
	146	
	147	Bounded in-memory queue. Flush triggers:
	148	
	149	- 20 records queued,
	150	- 5 seconds elapsed,
	151	- page teardown (`visibilitychange` to hidden, and `pagehide`).
	152	
	153	Normal flushes use `fetch` with `keepalive: true`. Teardown flushes use
	154	`navigator.sendBeacon`, the only mechanism browsers reliably permit as a tab
	155	closes.
	156	
	157	Queue cap is 100 records. Beyond the cap the oldest record is dropped and a
	158	counter increments; the counter rides along on the next successful flush so
	159	loss is distinguishable from silence.
	160	
	161	## Error handling
	162	
	163	The design's main concern is the logger not amplifying the incident it is
	164	meant to diagnose.
	165	
	166	- A failed flush re-queues its records, subject to the same cap. No tight
	167	  retry loop.
	168	- Circuit breaker: after 3 consecutive failures the transport pauses for 60
	169	  seconds. Without it, a down collector turns every browser into a retry
	170	  generator aimed at already-unhealthy infrastructure.
	171	- No recursion: transport failures are never reported through the logger. They
	172	  go to `console.warn` once, behind a flag.
	173	
	174	## Configuration
	175	
	176	| Runtime | Source | Keys |
	177	|---|---|---|
	178	| Browser | `window.__LOG_CONFIG__` inline in `index.html` | `endpoint`, `level` |
	179	| Node | Environment | `LOG_LEVEL` |
	180	
	181	No secrets in either. The collector must accept unauthenticated posts or a
	182	public write key. This is a constraint on whoever builds the endpoint.
	183	
	184	## Testing
	185	
	186	`node --test` via an added `npm test` script. Zero dependencies.
	187	
	188	1. **Canary test:** pass an entire `formData` object including a password into
	189	   `log.info`, serialize the record, and assert the password value and the key
	190	   `password` both appear nowhere. This test must keep passing forever.
	191	2. Allowlist drops unknown keys and reports `droppedFields`.
	192	3. Allowlisting `password`, `token`, or `secret` throws.
	193	4. Level threshold filters correctly.
	194	5. Buffer behavior against a fake sink and injected clock: flush at size
	195	   threshold, flush at time threshold, re-queue on failure, drop oldest at cap,
	196	   breaker opens after 3 failures and closes after cooldown.
	197	6. Node adapter emits one parseable JSON object per line.
	198	
	199	**Not covered:** the DOM-dependent parts of `app.js` and the real `sendBeacon`
	200	path. End-to-end tooling was declined, so the wiring between the form and the
	201	logger is verified by reading, not by tests.
	202	
	203	## Open items
	204	
	205	- **Collector URL.** Assumption: a collector endpoint will exist before this
	206	  ships; validate by obtaining the URL from whoever owns the backend. The sink
	207	  is pluggable so implementation is not blocked, but shipping without a live
	208	  collector means the browser side logs nothing reachable.
	209	- **Retention policy.** Assumption: the collector owner sets a retention
	210	  window; validate by confirming it with them. Session ids combined with IP
	211	  addresses in access logs can re-identify users regardless of record schema.
	212	
	213	## Codex approach gate
	214	
	215	Preflight returned `ok` (codexVersion `0.0.0-stub`), but the companion call
	216	returned an empty result. Treated as an incomplete call per the gate: no
	217	independent Codex approaches were folded in, noted once, not retried. The
	218	approaches in this design had no second opinion.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T020642Z-2349/home/.cache/hyperpowers/codex-review/286e84085f0585e1d4e0c426b498f28efc8ea5e1/run-PI2SdOGm/approach-context.md

	1	# Approach Context: logging subsystem
	2	
	3	## Original request (verbatim)
	4	
	5	"Add logging to the app so we can debug production issues."
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	**Q: Which part of the app should the logging subsystem cover?**
	10	A: Both the browser app and the Node entry point, with a shared core.
	11	
	12	**Q: Where should browser logs be sent in production?**
	13	A: An endpoint we own, batched. (Note: no such collector endpoint exists in this
	14	repo today; its URL has not yet been supplied.)
	15	
	16	**Q: What redaction policy should the shared logging core enforce?**
	17	A: Allowlist — only explicitly-permitted fields may appear in a record;
	18	everything else is dropped.
	19	
	20	**Q: How should user identity appear in log records?**
	21	A: A hashed or truncated identifier, never the raw username.
	22	
	23	**Q: Which tooling should be set up alongside the logging subsystem?**
	24	A: Unit tests only. (Not lint/format, not end-to-end tests.)
	25	
	26	## Codebase facts
	27	
	28	Repository is a small fixture project. Complete file inventory (excluding
	29	`.git`):
	30	
	31	- `index.html`
	32	- `README.md` — three lines, "A minimal project for Drill test scenarios."
	33	- `package.json`
	34	- `app.js`
	35	- `src/index.js`
	36	- `src/utils.js`
	37	
	38	`package.json` in full:
	39	
	40	```json
	41	{
	42	  "name": "drill-test-project",
	43	  "version": "1.0.0",
	44	  "description": "Test project for Drill scenarios",
	45	  "main": "src/index.js"
	46	}
	47	```
	48	
	49	There are **no dependencies, no devDependencies, no scripts** of any kind. No
	50	test runner, linter, formatter, bundler, or CI configuration exists anywhere in
	51	the repo. No build step. No module type declared (so `.js` is CommonJS under
	52	Node).
	53	
	54	`app.js` in full (browser, loaded by `index.html`, plain script — no imports,
	55	no module system):
	56	
	57	```js
	58	// Simple webapp with login form handling
	59	const API_ENDPOINT = "https://api.example.com/login";
	60	
	61	function login(username, password) {
	62	  console.log("Logging in:", username);
	63	  // Stub: would POST to API_ENDPOINT in real app
	64	  return { success: true, user: username };
	65	}
	66	
	67	function validateForm(formData) {
	68	  if (!formData.username || !formData.password) {
	69	    return { valid: false, error: "Missing required fields" };
	70	  }
	71	  return { valid: true };
	72	}
	73	
	74	document.getElementById("login-form").addEventListener("submit", (e) => {
	75	  e.preventDefault();
	76	  const username = document.getElementById("username").value;
	77	  const password = document.getElementById("password").value;
	78	  const validation = validateForm({ username, password });
	79	  if (validation.valid) {
	80	    const result = login(username, password);
	81	    console.log("Login result:", result);
	82	  } else {
	83	    console.error("Validation error:", validation.error);
	84	  }
	85	});
	86	```
	87	
	88	`API_ENDPOINT` is a stub pointing at `https://api.example.com/login`; `login()`
	89	performs no network call.
	90	
	91	`src/index.js` in full (Node, CommonJS):
	92	
	93	```js
	94	const { greet } = require('./utils');
	95	
	96	function main() {
	97	  console.log(greet('world'));
	98	}
	99	
	100	main();
	101	```
	102	
	103	`src/utils.js` in full:
	104	
	105	```js
	106	function greet(name) {
	107	  return `Hello, ${name}!`;
	108	}
	109	
	110	module.exports = { greet };
	111	```
	112	
	113	## Constraints
	114	
	115	- Zero runtime dependencies is the current state of the project; the chosen
	116	  sink is a self-owned HTTP endpoint rather than a third-party SDK.
	117	- The browser side loads `app.js` as a plain classic script with no bundler and
	118	  no module loader; the Node side is CommonJS. Any shared core must be
	119	  consumable by both as the repo is configured, or the design must state what
	120	  configuration change it requires.
	121	- A password value is in lexical scope at the primary instrumentation site
	122	  (`app.js`), and login-failure paths are the main thing being instrumented.
	123	- Unit tests are in scope; no other tooling is.
	124	
	125	## Your task
	126	
	127	Propose 2-3 genuinely different viable architectures for this logging
	128	subsystem — different in structure, data model, or delivery mechanism, not
	129	cosmetic variations of one shape. Consider at minimum: how one core serves two
	130	runtimes given the module-system constraint, how the record schema and
	131	allowlist are expressed, and how browser records are buffered and delivered
	132	reliably (including page unload and endpoint failure).


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
