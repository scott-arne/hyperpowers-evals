# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b3-logging-claude-auto-20260917T114922Z-9a2b/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-logging-design.md

	1	# Logging Subsystem Design
	2	
	3	Date: 2026-09-17
	4	Status: Approved in chat; pending written-spec review
	5	
	6	## Problem
	7	
	8	The app has no logging subsystem. Diagnostic output is four scattered
	9	`console.log` / `console.error` calls in `app.js` and `src/index.js` with no
	10	levels, no structure, no way to raise verbosity in production, and no record of
	11	what happened before a failure. When a user reports a login problem there is
	12	nothing to ask them for.
	13	
	14	A further hazard already exists: `app.js` logs the username on every login
	15	attempt, and `login(username, password)` holds a password one scope away from a
	16	log call. Any logging work has to address what may be recorded before it
	17	increases how much gets recorded.
	18	
	19	## Goals
	20	
	21	- One logging API usable from both the browser app and the Node entry point.
	22	- Levels, with verbosity changeable at runtime without a redeploy.
	23	- Retained history of the events leading up to a failure, exportable on demand.
	24	- Secrets structurally excluded from anything the logger retains.
	25	- No new runtime dependencies and no build step.
	26	
	27	## Non-Goals
	28	
	29	- Shipping logs to a remote collector. Rejected for now: this repo has no
	30	  backend, and an endpoint is an interface plus a data-retention commitment.
	31	  The ring buffer is the seam a collector would attach to later.
	32	- Global `window.onerror` / `unhandledRejection` handlers, or auto-dumping the
	33	  buffer on crash.
	34	- Migrating the repository to ES modules. Worthwhile, but unrelated to logging
	35	  and deserving of its own approval.
	36	- Adding lint or formatting tooling.
	37	
	38	## Decisions
	39	
	40	Each was chosen against alternatives during brainstorming.
	41	
	42	| Decision | Chosen | Rejected alternatives |
	43	|---|---|---|
	44	| Scope | Shared module serving both browser and Node | Browser only; Node only |
	45	| Transport | Console plus in-memory ring buffer | Console only; POST to a collector |
	46	| Secrets | Key-name denylist applied inside the logger | Caller convention; field allowlist |
	47	| Module format | Single dual-mode file | Repo-wide ESM conversion; core plus shims |
	48	| Tooling | Unit tests via `node:test` | Adding ESLint/Prettier; no tooling |
	49	
	50	## Architecture
	51	
	52	### `logger.js` (new, repository root)
	53	
	54	Root placement lets the browser load it with a relative `<script src>` next to
	55	`app.js` and lets Node reach it as `require('../logger')`.
	56	
	57	Dual-mode export: assign to `module.exports` when `module` is defined, otherwise
	58	assign to `globalThis.log`. No bundler, no `package.json` type change, no edits
	59	to files that do not otherwise need them.
	60	
	61	### API
	62	
	63	```js
	64	log.debug(msg, ctx?);
	65	log.info(msg, ctx?);
	66	log.warn(msg, ctx?);
	67	log.error(msg, ctx?);
	68	log.dump();      // array copy of retained entries
	69	```
	70	
	71	An entry is `{ ts, level, msg, ctx }`, where `ts` is an ISO 8601 string and
	72	`ctx` is the redacted form of the caller's context object.
	73	
	74	Redaction happens at capture, not at dump. A secret therefore never occupies the
	75	buffer, so exporting the buffer cannot leak one even if the export path changes
	76	later.
	77	
	78	### Levels and the runtime switch
	79	
	80	Ordering: `debug` < `info` < `warn` < `error`. Default: `info`.
	81	
	82	Resolution order:
	83	
	84	- Browser: `?log=<level>` query parameter, else `localStorage.logLevel`, else
	85	  the default. The query parameter wins so a user can be asked to reload one URL.
	86	- Node: the `LOG_LEVEL` environment variable, else the default.
	87	
	88	Level resolution is factored into a pure function taking a search string and a
	89	storage-like object, so browser behavior is testable under Node without a DOM.
	90	
	91	An unrecognized level value falls back to the default rather than throwing; a
	92	logger that crashes the app it instruments is worse than a verbose one.
	93	
	94	### The ring buffer
	95	
	96	Fixed capacity, default 200 entries, oldest evicted on overflow.
	97	
	98	The console is filtered by the active level; the buffer records every entry down
	99	to `debug` regardless of that level. This asymmetry is the point of the design —
	100	the buffer's value is the history approaching a failure, and history filtered
	101	out before storage does not exist when the failure arrives.
	102	
	103	`log.dump()` returns a copy of the retained entries. In the browser the logger
	104	also exposes `globalThis.__appLogs()`, the command a user is asked to run and
	105	paste into a bug report.
	106	
	107	### Redaction
	108	
	109	A recursive walk of the context object. Keys matching
	110	`/pass(word)?|token|secret|auth|credential|cookie|api[_-]?key/i` have their
	111	values replaced with the string `'[REDACTED]'`.
	112	
	113	- Depth-capped at 4 levels; deeper structures are replaced with `'[DEPTH]'`.
	114	- Cycle-safe via a seen-set, so a circular object or a DOM node cannot hang the
	115	  logger.
	116	- Key-based only. Values are not pattern-scanned.
	117	
	118	`username` is deliberately not on the denylist. Correlating a report with a
	119	session needs an identifier, and the username is normally that identifier; the
	120	password is the value that must never be recorded, and it is covered.
	121	
	122	## Integration
	123	
	124	### Browser
	125	
	126	`index.html` gains `<script src="logger.js"></script>` immediately before the
	127	existing `app.js` tag, so `globalThis.log` exists when `app.js` executes.
	128	
	129	Call-site changes in `app.js`:
	130	
	131	| Current | Becomes |
	132	|---|---|
	133	| `console.log("Logging in:", username)` | `log.info('login attempt', { username })` |
	134	| `console.log("Login result:", result)` | `log.info('login result', { result })` |
	135	| `console.error("Validation error:", validation.error)` | `log.warn('validation failed', { error: validation.error })` |
	136	
	137	A `log.debug('form submitted', ...)` is added at the top of the submit handler so
	138	the buffer records the approach to a failure rather than starting at it.
	139	
	140	Validation failure moves from `error` to `warn`: a blank field is expected user
	141	behavior, and logging it at `error` dilutes the level that should mean something
	142	is broken.
	143	
	144	### Node
	145	
	146	`src/index.js` requires the logger and adds `log.debug('main start')`.
	147	
	148	`console.log(greet('world'))` is left unchanged. It is program output, not a
	149	diagnostic; routing it through the logger would corrupt stdout for any consumer
	150	parsing it.
	151	
	152	`src/utils.js` is untouched.
	153	
	154	## Testing
	155	
	156	`package.json` gains `"scripts": { "test": "node --test" }`. Tests live in
	157	`test/logger.test.js` and use the built-in `node:test` runner, adding no
	158	dependencies.
	159	
	160	Cases:
	161	
	162	- Redaction masks `password` and `token`, including nested occurrences and
	163	  mixed-case keys, and leaves `username` intact.
	164	- Redaction terminates on a circular object and honors the depth cap.
	165	- The buffer evicts the oldest entry past capacity.
	166	- `dump()` returns a copy; mutating the result does not affect retained state.
	167	- The buffer captures `debug` entries while the console filter sits at `info` —
	168	  the central claim of the design.
	169	- Level resolution: `LOG_LEVEL=warn` suppresses `info` console output; an
	170	  unrecognized value falls back to `info`.
	171	- Browser level resolution: the query parameter takes precedence over the
	172	  storage value.
	173	
	174	## Files
	175	
	176	New:
	177	
	178	- `logger.js`
	179	- `test/logger.test.js`
	180	- `.gitignore` (added during design to keep spec documents uncommitted)
	181	
	182	Modified:
	183	
	184	- `index.html` — one script tag
	185	- `app.js` — four call sites
	186	- `src/index.js` — require plus one debug line
	187	- `package.json` — test script
	188	
	189	Untouched: `src/utils.js`, `README.md`.
	190	
	191	## Risks and Open Questions
	192	
	193	- The denylist is a maintained list. A future field named, say, `pin` or
	194	  `ssn` would not be masked. Mitigation: the list lives in one place and is
	195	  covered by tests, so tightening it is a one-line change.
	196	- Assumption: browser log collection by asking a user to run `__appLogs()` is
	197	  operationally acceptable for this app's support flow. Validate by using it on
	198	  the first real production report; if it proves impractical, the buffer is
	199	  already the attachment point for a collector.
	200	- The buffer is memory-resident and lost on reload. A failure that reloads the
	201	  page takes its history with it. Accepted as the cost of having no backend.


## Adjudicated decisions

NOT PROVIDED: flag not passed

## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
