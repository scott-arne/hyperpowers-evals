# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T005201Z-7ee4/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-shared-logging-design.md

	1	# Shared Logging Module — Design
	2	
	3	Date: 2026-09-16
	4	Status: Approved (design), not yet implemented
	5	
	6	## Problem
	7	
	8	Production issues in this app cannot be debugged. Diagnostics today are three
	9	ad-hoc `console.log` / `console.error` calls in `app.js` and one `console.log`
	10	in `src/index.js`. They carry no timestamp, no severity, no structure, and no
	11	way to raise or lower verbosity. Browser-side output never leaves the user's
	12	machine, so any failure that cannot be reproduced locally is invisible.
	13	
	14	One of those calls, `console.log("Logging in:", username)`, sits directly
	15	beside a password field. Any future decision to ship logs off the client turns
	16	careless log calls into a credential-disclosure path, so the rule about what
	17	may be logged has to be part of the logging contract from the start rather
	18	than retrofitted.
	19	
	20	## Goals
	21	
	22	- One logging module shared by the browser (`app.js`) and Node (`src/`) halves.
	23	- Structured, levelled records with timestamps.
	24	- Verbosity adjustable in a live session without a redeploy.
	25	- Credentials cannot reach a log record, even when a call site is careless.
	26	- A documented attachment point for a remote log sink, so shipping logs later
	27	  does not require reworking call sites.
	28	
	29	## Non-Goals
	30	
	31	- No remote collector, batching, retry, or endpoint contract. No collector
	32	  exists to target; guessing its shape now is the part most likely to be
	33	  discarded. The seam is built; the sink is not.
	34	- No log rotation, sampling, or correlation/request IDs.
	35	- No change to the `https://api.example.com/login` stub or the login flow's
	36	  behavior.
	37	- No migration of the project to ES modules.
	38	
	39	## Context
	40	
	41	The repository is six files with no dependencies, no build step, and no tests.
	42	
	43	- `app.js` — browser login form handler, loaded by `index.html` as a classic
	44	  `<script>`. No module system.
	45	- `src/index.js`, `src/utils.js` — an unrelated Node entry point using
	46	  CommonJS (`require` / `module.exports`). `package.json` `main` points here.
	47	- `package.json` — no dependencies, no `scripts`.
	48	
	49	The two halves share no code and use incompatible module systems, which
	50	constrains how a shared module can be loaded.
	51	
	52	## Decisions
	53	
	54	Each decision below was presented with alternatives and chosen by the project
	55	owner during brainstorming.
	56	
	57	### D1. Shared module, both surfaces
	58	
	59	One module serves both the browser and Node halves rather than separate
	60	loggers per surface.
	61	
	62	### D2. Console output plus a transport seam
	63	
	64	Records are written to the console now, and the module exposes one documented
	65	hook where a remote sink can be attached later.
	66	
	67	Rejected: shipping to a remote collector immediately (blocked — no endpoint
	68	exists); console-only with no seam (leaves browser-side production failures
	69	permanently invisible).
	70	
	71	### D3. UMD wrapper for module loading
	72	
	73	`src/logger.js` detects `module.exports` and otherwise attaches to `window`.
	74	
	75	Rejected: converting the project to ES modules (edits `package.json`,
	76	`src/index.js`, `src/utils.js`, and `index.html` — files unrelated to logging —
	77	and breaks `file://` loading of the page); a shared core with per-environment
	78	adapters (more files than a six-file repo warrants).
	79	
	80	### D4. Central redaction denylist
	81	
	82	The logger redacts sensitive values itself rather than trusting call sites.
	83	Call-site discipline remains the convention; the denylist is the backstop.
	84	
	85	Rejected: call-site discipline alone (one slip publishes plaintext passwords);
	86	strict allowlisting (under-logs during an incident, which defeats the purpose).
	87	
	88	### D5. Unit tests via `node:test`
	89	
	90	Node's built-in test runner, chosen because it keeps the project at zero
	91	dependencies. No linter or formatter is being introduced.
	92	
	93	## Architecture
	94	
	95	### Module: `src/logger.js`
	96	
	97	A single UMD-wrapped file. Node consumes it with `require('./logger')`. The
	98	browser loads it from a `<script src="src/logger.js">` tag placed in
	99	`index.html` before `app.js`, which exposes `window.logger`.
	100	
	101	Public API:
	102	
	103	```
	104	logger.debug(message, context)
	105	logger.info(message, context)
	106	logger.warn(message, context)
	107	logger.error(message, context)
	108	logger.setLevel(level)   // 'debug' | 'info' | 'warn' | 'error'
	109	logger.setSink(fn)       // transport seam; fn(record)
	110	```
	111	
	112	`context` is optional. `message` is a plain string.
	113	
	114	### Record shape
	115	
	116	Every call builds one record before anything is emitted:
	117	
	118	```js
	119	{
	120	  ts: "2026-09-16T12:00:00.000Z",  // ISO 8601, UTC
	121	  level: "warn",
	122	  msg: "Validation failed",
	123	  env: "browser" | "node",
	124	  ctx: { /* redacted context, omitted when no context was passed */ }
	125	}
	126	```
	127	
	128	`env` is present because browser and Node records are expected to land in the
	129	same store once a sink is attached, and they must be distinguishable there.
	130	
	131	### Levels
	132	
	133	Ordered `debug < info < warn < error`. A record below the active threshold is
	134	discarded before redaction and before emission, so suppressed logging costs
	135	nothing beyond the comparison.
	136	
	137	Default threshold: `info`.
	138	
	139	- Node reads `process.env.LOG_LEVEL` at module load.
	140	- Browser reads `localStorage.logLevel` at module load, wrapped in a
	141	  `try`/`catch` because `localStorage` access throws in some privacy modes.
	142	- `setLevel()` overrides either at runtime.
	143	
	144	An unrecognized level value is ignored and the default retained.
	145	
	146	### Redaction
	147	
	148	Applied to `ctx` after level filtering and before the record reaches the
	149	console or the sink.
	150	
	151	- Key denylist, stored lowercased: `password`, `passwd`, `pwd`, `token`,
	152	  `secret`, `authorization`, `apikey`, `api_key`, `cookie`, `sessionid`. A
	153	  context key matches when its lowercased form equals a denylist entry —
	154	  exact match, not substring. So `apiKey` and `API_KEY` both match, while
	155	  `passwordHint` does not.
	156	- Matched values are replaced with the string `"[redacted]"`.
	157	- Traversal recurses through plain objects and arrays.
	158	- Depth is capped (limit 4); content beyond the cap is replaced with
	159	  `"[truncated]"`.
	160	- A `WeakSet` guards against circular references, so passing a DOM node or a
	161	  self-referencing object cannot hang the page.
	162	- `Error` values are converted to `{ name, message, stack }`; a raw `Error`
	163	  otherwise serializes to `{}` and loses the diagnostic entirely.
	164	- Redaction operates on a copy. The caller's object is never mutated.
	165	
	166	### Console emission
	167	
	168	Both surfaces emit the same record, formatted for its reader:
	169	
	170	- Node: `JSON.stringify(record)` written as one line per record, since log
	171	  collectors consume line-delimited JSON.
	172	- Browser: the record object passed to `console.debug` / `info` / `warn` /
	173	  `error`, so devtools keeps it expandable and inspectable.
	174	
	175	### Transport seam
	176	
	177	`setSink(fn)` registers a single function, replacing any previous one.
	178	
	179	- The sink is called with the finished, already-redacted record, after console
	180	  output. Console output never depends on the sink succeeding.
	181	- Exceptions thrown by the sink are caught and swallowed. A broken log
	182	  collector must never break the login flow.
	183	- One sink at a time. Fan-out, batching, and retry are the sink
	184	  implementation's concern, not the logger's.
	185	
	186	## Call Site Changes
	187	
	188	### `app.js`
	189	
	190	The three existing `console.*` calls become logger calls:
	191	
	192	- `login()` — `logger.info` on the login attempt, with `{ username }` only.
	193	  The password is never passed into a log call.
	194	- `login()` result — `logger.info` with the result.
	195	- Validation failure — `logger.warn` with the validation error.
	196	
	197	### `index.html`
	198	
	199	Add `<script src="src/logger.js"></script>` before the existing `app.js` tag.
	200	
	201	### `src/index.js`
	202	
	203	`console.log(greet('world'))` is the program's output, not a diagnostic.
	204	Routing it through the logger would wrap the greeting in a JSON envelope and
	205	change what the program prints. That line stays as it is. `logger.debug` calls
	206	are added around `main()` entry and exit instead.
	207	
	208	### `package.json`
	209	
	210	Add `"scripts": { "test": "node --test" }`.
	211	
	212	## Testing
	213	
	214	`test/logger.test.js`, run with `npm test` (`node --test`). No dependencies.
	215	
	216	Coverage:
	217	
	218	- Records below the active level produce no console output and no sink call.
	219	- `setLevel` changes the threshold at runtime; an invalid level is ignored.
	220	- Denylisted keys are redacted at the top level, nested in objects, and inside
	221	  arrays.
	222	- Key matching is case-insensitive (`Password`, `API_KEY`).
	223	- The caller's context object is not mutated by redaction.
	224	- The record carries `ts`, `level`, `msg`, and `env`.
	225	- A registered sink receives the redacted record, not the raw context.
	226	- A sink that throws does not propagate the exception to the caller, and
	227	  console output still happens.
	228	- A circular context object terminates rather than hanging.
	229	- Depth beyond the cap is truncated.
	230	- An `Error` in context is serialized with `name`, `message`, and `stack`.
	231	
	232	Node-surface behavior is tested directly. Browser-surface behavior (the
	233	`window` branch of the UMD wrapper, `localStorage` level reading) is verified
	234	by exercising the module's exported functions under a stubbed global rather
	235	than in a real browser; no browser test infrastructure is being introduced.
	236	
	237	## Risks and Assumptions
	238	
	239	- Assumption: log volume from the login flow is low enough that no sampling or
	240	  rate limiting is needed. Validate by observing console volume once the
	241	  logger is in place; revisit before a remote sink is attached, since sampling
	242	  matters much more when records cost bandwidth.
	243	- The key denylist catches conventionally-named fields only. A secret stored
	244	  under an unconventional key still reaches the log. The call-site convention
	245	  remains necessary; the denylist is a backstop, not a guarantee.
	246	- `localStorage.logLevel` is user-writable. It controls verbosity only, never
	247	  what redaction does, so raising it cannot expose credentials.
	248	- The UMD wrapper is a dated pattern. It is confined to the top of one file
	249	  and converts cleanly if the project later moves to ES modules.
	250	
	251	## Files Touched
	252	
	253	New:
	254	
	255	- `src/logger.js`
	256	- `test/logger.test.js`
	257	
	258	Modified:
	259	
	260	- `app.js`
	261	- `index.html`
	262	- `src/index.js`
	263	- `package.json`


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T005201Z-7ee4/home/.cache/hyperpowers/codex-review/989d1ac06d0fa58907ce88ddbd714968230245c6/run-lUHEMN5w/approved-design-context.md

	1	# Approved design context — shared logging module
	2	
	3	## Original user request (verbatim)
	4	
	5	> Add logging to the app so we can debug production issues.
	6	
	7	## Repository facts at time of design
	8	
	9	Six files, no dependencies, no build step, no tests, no linter.
	10	
	11	- `index.html` — login form; loads `app.js` via a classic `<script>` tag.
	12	- `app.js` — browser login handler. Three `console.*` calls today:
	13	  `console.log("Logging in:", username)`, `console.log("Login result:", result)`,
	14	  `console.error("Validation error:", validation.error)`. Contains
	15	  `const API_ENDPOINT = "https://api.example.com/login"` and a stubbed `login()`
	16	  that returns `{ success: true, user: username }` without making a request.
	17	- `src/index.js` — Node entry point, CommonJS, `console.log(greet('world'))`.
	18	- `src/utils.js` — CommonJS, exports `greet`.
	19	- `package.json` — `main: src/index.js`, no dependencies, no scripts.
	20	- Git branch `feature/webapp-enhancement`; working tree clean at design time.
	21	
	22	## Clarifying questions and the project owner's answers
	23	
	24	1. **Which part of the app needs logging?** — *Both, via a shared module.*
	25	   (Alternatives offered: browser only; Node only.)
	26	
	27	2. **Where should the logs go?** — *Console output now, plus a documented
	28	   transport seam for attaching a remote sink later.*
	29	   (Alternatives offered: console + remote sink built now — declined because no
	30	   collector endpoint exists and `api.example.com` is a stub; console only with
	31	   no seam — declined.)
	32	
	33	3. **How should the shared module be loaded by both environments?** — *UMD
	34	   wrapper.* (Alternatives offered: convert the project to ES modules — declined
	35	   because it edits files unrelated to logging and breaks `file://` loading;
	36	   shared core plus per-environment adapters — declined as over-engineered at
	37	   this size.)
	38	
	39	4. **How should credentials be handled?** — *Central denylist inside the logger*,
	40	   with call-site discipline retained as a convention.
	41	   (Alternatives offered: call-site discipline alone; strict allowlisting.)
	42	
	43	5. **What tooling should be set up alongside?** — *Unit tests via Node's built-in
	44	   `node:test` runner only.* No linter or formatter. This keeps the project at
	45	   zero dependencies.
	46	
	47	## Additional decision made during design presentation and approved
	48	
	49	`src/index.js`'s `console.log(greet('world'))` is program output rather than a
	50	diagnostic, so it stays as a plain `console.log`; `logger.debug` calls are added
	51	around `main()` entry and exit instead. The project owner was asked specifically
	52	about this point and approved it.
	53	
	54	## Standing project constraints (from CLAUDE.md)
	55	
	56	- Minimal, focused changes; do not touch files unrelated to the task.
	57	- No emojis, and no attribution lines implying AI assistance, anywhere.
	58	- Design documents are not committed unless explicitly requested.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
