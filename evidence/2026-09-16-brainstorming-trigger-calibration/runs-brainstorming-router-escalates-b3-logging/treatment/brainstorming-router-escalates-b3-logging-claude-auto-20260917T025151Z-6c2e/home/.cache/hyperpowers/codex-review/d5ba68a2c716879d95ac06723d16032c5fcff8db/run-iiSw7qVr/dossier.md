# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T025151Z-6c2e/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-logging-subsystem-design.md

	1	# Logging Subsystem Design
	2	
	3	Date: 2026-09-16
	4	Status: approved design, pending implementation plan
	5	
	6	## Problem
	7	
	8	The application has no logging subsystem. Diagnostics today are four ad-hoc
	9	`console` calls (`app.js:5`, `app.js:24`, `app.js:26`, `src/index.js:4`). Output is
	10	transient, unstructured, and unavailable after the page or process ends, so a
	11	production issue cannot be investigated after the fact.
	12	
	13	Two of those call sites are also a disclosure risk. `app.js:5` logs a username from
	14	inside `login(username, password)`, and `app.js:24` logs the full return value of
	15	`login()`. Both execute in the scope holding a plaintext password.
	16	
	17	## Goals
	18	
	19	- Structured, levelled logging available on both runtimes in this repository.
	20	- Records persist on the user's device and survive page reload and process exit.
	21	- Sensitive values cannot reach a persisted record through structured context.
	22	- A logging failure can never break the application.
	23	- A defined way to retrieve persisted logs during a support interaction.
	24	
	25	## Non-goals
	26	
	27	- Shipping logs to a backend. No service under this project's control exists to
	28	  receive them. The sink boundary is shaped so a shipping sink can be added later
	29	  without changing the core.
	30	- Changing what the application does. `API_ENDPOINT` remains an uncontacted stub.
	31	- Converting the repository's module system or introducing a bundler or build step.
	32	
	33	## Decisions
	34	
	35	| Decision | Choice | Rationale |
	36	|---|---|---|
	37	| Scope | Both browser and Node surfaces | Requested: logging "across the app". |
	38	| Persistence | On-device | No backend exists; sink seam permits shipping later. |
	39	| Redaction | Allow-list | Fails closed. A newly added sensitive field is invisible by default. |
	40	| Structure | Dual-mode core, per-runtime sinks | Shares the security-critical code without a bundler or an ESM conversion. |
	41	| `username` | Permitted | Logs stay on the user's own device; required to read a login-flow log. |
	42	
	43	### Why the dual-mode core
	44	
	45	`app.js` is a plain `<script>` using globals; `src/index.js` and `src/utils.js` are
	46	CommonJS. Two rejected alternatives:
	47	
	48	- **Independent per-runtime loggers.** Simplest, but duplicates the allow-list. An
	49	  allow-list's value is that it cannot silently fall out of date; two copies
	50	  reintroduce exactly that failure.
	51	- **Convert the repository to ES modules.** Cleanest sharing, but rewrites
	52	  `src/index.js` and `src/utils.js` for reasons unrelated to logging, and
	53	  `<script type="module">` is blocked by CORS over `file://`, so opening
	54	  `index.html` directly would stop working.
	55	
	56	## Architecture
	57	
	58	```
	59	src/logger/
	60	  core.js          # levels, record construction, dispatch to sink
	61	  redact.js        # PERMITTED set and redact()
	62	  sink-browser.js  # capped ring buffer in localStorage
	63	  sink-node.js     # NDJSON append with size rotation
	64	```
	65	
	66	`core.js` exports `createLogger({ sink, level, name })` — a factory, not a singleton,
	67	so tests construct an instance with a fake sink and no global state.
	68	
	69	Each file ends with a dual-mode export footer so the same source loads under both
	70	`require()` and a `<script>` tag:
	71	
	72	```js
	73	if (typeof module !== "undefined" && module.exports) {
	74	  module.exports = { createLogger };
	75	} else {
	76	  window.Logger = { createLogger };
	77	}
	78	```
	79	
	80	### Wiring
	81	
	82	- `index.html`: three `<script>` tags before `app.js`, in order — `redact.js`,
	83	  `core.js`, `sink-browser.js`. The ordering requirement is load-bearing and gets a
	84	  comment in the HTML.
	85	- `src/index.js`: requires the core and the Node sink, constructs its logger at
	86	  startup.
	87	
	88	### Call-site migration
	89	
	90	The three diagnostic `console` calls are replaced, not supplemented — leaving them
	91	beside a redacting logger would make the redaction decorative:
	92	
	93	| Site | Replacement |
	94	|---|---|
	95	| `app.js:5` | `log.info("login attempt", { username })` |
	96	| `app.js:24` | `log.info("login result", { username, status })` |
	97	| `app.js:26` | `log.warn("validation failed", { formField, errorCode })` |
	98	
	99	`src/index.js:4` stays `console.log`. It is program output, not a diagnostic;
	100	printing and logging are different jobs.
	101	
	102	## Record shape
	103	
	104	```js
	105	{
	106	  ts: "2026-09-16T14:03:11.204Z",  // ISO 8601
	107	  level: "warn",                   // debug | info | warn | error
	108	  name: "auth",                    // logger name
	109	  msg: "login rejected",           // static description
	110	  ctx: { }                         // redacted structured context
	111	}
	112	```
	113	
	114	ISO timestamps rather than epoch millis: these records are read by a human out of a
	115	file or a devtools dump, not by a parser.
	116	
	117	This shape is the one part of the design that is expensive to change. Anything that
	118	later reads a persisted log depends on it.
	119	
	120	## Redaction
	121	
	122	`redact.js` exports `PERMITTED` (a `Set` of key names) and `redact(ctx)`.
	123	
	124	Initial `PERMITTED`: `username`, `userId`, `event`, `durationMs`, `status`,
	125	`errorCode`, `formField`.
	126	
	127	Rules:
	128	
	129	- Any key not in `PERMITTED` has its value replaced with the string `"[redacted]"`.
	130	  The key is retained. A scrubbed field that vanished entirely is indistinguishable
	131	  from a code path that never ran, which costs debugging time; revealing the key
	132	  name while never revealing the value resolves that.
	133	- Redaction recurses to every depth, so a permitted key holding a nested object does
	134	  not become a hole in the policy.
	135	- A depth cap and a total serialized-size cap apply, so one bad call site cannot fill
	136	  the buffer with a single record. Truncation is marked in the output.
	137	- `Error` values are special-cased to `{ name, message, stack }`. A logging layer that
	138	  swallows stack traces is not worth having.
	139	
	140	### Known limitation
	141	
	142	The allow-list governs `ctx` only. `log.info("password is " + password)` cannot be
	143	caught by any redactor, because the value is an opaque string by the time it arrives.
	144	Mitigation is convention — `msg` is a static description, all variable data goes in
	145	`ctx` — plus review. The allow-list does not make the logger leak-proof and this
	146	document does not claim it does.
	147	
	148	## Persistence
	149	
	150	### Browser
	151	
	152	Records buffer in memory and flush to a single `localStorage` key, debounced ~1s and
	153	forced on `visibilitychange → hidden`.
	154	
	155	- Not a write per log call: reserializing the whole array on every call is O(n)
	156	  main-thread work during form submission.
	157	- `visibilitychange`, not `beforeunload`: the latter does not fire reliably on mobile.
	158	- The buffer is capped by both record count and total bytes, evicting oldest first.
	159	  `localStorage` is a shared ~5MB origin quota, not this feature's private budget.
	160	
	161	### Node
	162	
	163	NDJSON appended to `logs/app.log`, rotated at 5MB, keeping 3 generations.
	164	
	165	Writes are synchronous. At this scale the blocking cost is irrelevant, and it buys
	166	guaranteed ordering and no loss when the process exits abruptly — which is when the
	167	log matters most.
	168	
	169	`logs/` is added to `.gitignore`.
	170	
	171	## Retrieval
	172	
	173	On-device persistence is useless without an extraction path.
	174	
	175	- **Browser:** `window.__appLogs` exposing `dump()` (returns records), `copy()`
	176	  (NDJSON to clipboard), and `clear()`. No UI affordance: this is a support tool, not
	177	  a product feature. The trade-off is that it is undiscoverable unless someone is
	178	  told it exists — acceptable for support-guided retrieval, unsuitable for
	179	  self-service.
	180	- **Node:** the rotated file is the interface.
	181	
	182	## Level control
	183	
	184	| Runtime | Source | Default |
	185	|---|---|---|
	186	| Node | `LOG_LEVEL` environment variable | `info` |
	187	| Browser | `localStorage["app.logLevel"]` | `info` |
	188	
	189	`localStorage` rather than a query parameter, because it survives reloads. The real
	190	support workflow is "set this, then reproduce the bug", and a query parameter is lost
	191	on the first navigation.
	192	
	193	## Failure behavior
	194	
	195	**The logger never throws into the application.** Every sink write is wrapped. On
	196	failure — `QuotaExceededError`, read-only filesystem, corrupt stored JSON — the sink
	197	evicts and retries once, then falls back to `console` and disables itself for the
	198	remainder of the session, reporting the failure exactly once.
	199	
	200	A logging subsystem that can break the login form is a worse defect than the one it
	201	was added to diagnose.
	202	
	203	## Tooling
	204	
	205	The repository has no linter, formatter, test runner, or npm scripts. Establishing
	206	them before the code exists is cheaper than retrofitting.
	207	
	208	- ESLint + Prettier, as `npm run lint` and `npm run format`.
	209	- `node:test` as the test runner, as `npm test`. Built into Node, so the repository
	210	  stays dependency-free for unit testing.
	211	- `fast-check` for property tests over the redactor — one dev dependency, aimed at
	212	  the security-critical code.
	213	- End-to-end testing (Playwright) is out of scope: disproportionate for one form.
	214	
	215	## Testing strategy
	216	
	217	| Target | Coverage |
	218	|---|---|
	219	| `core.js` | Level filtering, record shape, logger naming, dual-mode export under both loaders |
	220	| `redact.js` | Example tests; `fast-check` property that no non-permitted key's value survives at any depth; depth and size cap truncation; `Error` serialization |
	221	| `sink-browser.js` | Fake `localStorage`; debounce and forced flush; count and byte eviction; `QuotaExceededError` recovery; corrupt stored JSON recovery |
	222	| `sink-node.js` | Temp directory; NDJSON format; rotation at threshold; generation retention; unwritable-path fallback |
	223	| Call sites | `redact` receives no password-bearing context from the `app.js` login path |
	224	
	225	## Risks
	226	
	227	- **Script ordering in `index.html`** is load-bearing and unenforced without a
	228	  bundler. Mitigation: a comment in the HTML, and `core.js` failing loudly at
	229	  construction if its dependencies are absent.
	230	- **Dual-mode footer** is a non-standard pattern a future contributor may
	231	  "clean up". Mitigation: a comment stating why it exists.
	232	- **Persisted usernames on a shared device.** Accepted deliberately; revisit if the
	233	  application's deployment context changes.
	234	- **Assumption:** the browser surface runs in contexts where `localStorage` is
	235	  available and not disabled. Validate via the sink's failure path, which must degrade
	236	  to console-only rather than throw.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T025151Z-6c2e/home/.cache/hyperpowers/codex-review/d5ba68a2c716879d95ac06723d16032c5fcff8db/run-DOc0c7wL/approach-context.md

	1	# Approach Context: logging subsystem
	2	
	3	## Original request (verbatim)
	4	
	5	> Add logging to the app so we can debug production issues.
	6	
	7	## Clarifying questions and answers
	8	
	9	**Q1. Which surface needs logging, and do logs need to leave the user's machine?**
	10	A: "It should work across the app, and the logs should persist so we can look at them later."
	11	Interpreted as: both the browser surface and the Node surface.
	12	
	13	**Q2. Where should the persisted logs live?**
	14	Options offered: on-device persistence; central collection to a backend endpoint; both tiered; Node file only.
	15	A: On-device persistence. Browser side persists locally; Node side persists to disk. No backend
	16	exists to receive logs. The adapter boundary should permit adding a shipping adapter later.
	17	
	18	**Q3. How should the logger handle sensitive fields in structured context?**
	19	Options offered: allow-list (drop context fields unless explicitly declared loggable);
	20	deny-list (scrub known-sensitive key patterns); call-site discipline only (no redaction code).
	21	A: Allow-list.
	22	
	23	## Codebase facts
	24	
	25	Repository is a minimal fixture project. Complete file list (excluding `.git`):
	26	
	27	```
	28	index.html
	29	README.md
	30	package.json
	31	app.js
	32	src/index.js
	33	src/utils.js
	34	```
	35	
	36	`package.json`:
	37	
	38	```json
	39	{
	40	  "name": "drill-test-project",
	41	  "version": "1.0.0",
	42	  "description": "Test project for Drill scenarios",
	43	  "main": "src/index.js"
	44	}
	45	```
	46	
	47	No dependencies, no devDependencies, no scripts. No lockfile. No test runner, no linter,
	48	no formatter, no CI configuration, no build step, no bundler, no TypeScript.
	49	
	50	`app.js` (browser surface, loaded by `index.html`, plain script — not a module):
	51	
	52	```js
	53	// Simple webapp with login form handling
	54	const API_ENDPOINT = "https://api.example.com/login";
	55	
	56	function login(username, password) {
	57	  console.log("Logging in:", username);
	58	  // Stub: would POST to API_ENDPOINT in real app
	59	  return { success: true, user: username };
	60	}
	61	
	62	function validateForm(formData) {
	63	  if (!formData.username || !formData.password) {
	64	    return { valid: false, error: "Missing required fields" };
	65	  }
	66	  return { valid: true };
	67	}
	68	
	69	document.getElementById("login-form").addEventListener("submit", (e) => {
	70	  e.preventDefault();
	71	  const username = document.getElementById("username").value;
	72	  const password = document.getElementById("password").value;
	73	  const validation = validateForm({ username, password });
	74	  if (validation.valid) {
	75	    const result = login(username, password);
	76	    console.log("Login result:", result);
	77	  } else {
	78	    console.error("Validation error:", validation.error);
	79	  }
	80	});
	81	```
	82	
	83	`src/index.js` (Node surface, CommonJS):
	84	
	85	```js
	86	const { greet } = require('./utils');
	87	
	88	function main() {
	89	  console.log(greet('world'));
	90	}
	91	
	92	main();
	93	```
	94	
	95	`src/utils.js` (CommonJS):
	96	
	97	```js
	98	function greet(name) {
	99	  return `Hello, ${name}!`;
	100	}
	101	
	102	module.exports = { greet };
	103	```
	104	
	105	Relevant constraints and facts:
	106	
	107	- Two distinct runtimes in one repository: a browser page using plain `<script>` globals
	108	  (no module system, no bundler) and a Node CommonJS entry point. They currently share no code.
	109	- Existing logging is four ad-hoc `console.log` / `console.error` call sites: `app.js:5`,
	110	  `app.js:24`, `app.js:26`, `src/index.js:4`.
	111	- `app.js:5` logs a username inside a function whose parameters include a plaintext password.
	112	  `app.js:24` logs the full return value of `login()`.
	113	- The login network call is a stub; `API_ENDPOINT` is never contacted.
	114	- There is no backend under this repository's control.
	115	- Git branch is `feature/webapp-enhancement`; working tree clean.
	116	
	117	## Output required
	118	
	119	Propose approaches for the structure of this logging subsystem: how the shared core and the
	120	two runtime adapters are factored given the no-bundler/plain-globals browser constraint, how
	121	records are persisted on each side, how the allow-list redaction is enforced, how persisted
	122	logs are retrieved for debugging, and how log level is controlled at runtime in production.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
