# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T100253Z-e60d/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-settings-module-design.md

	1	# Settings Module Design
	2	
	3	Date: 2026-09-17
	4	Status: Approved design, pending implementation plan
	5	
	6	## Problem
	7	
	8	The API endpoint is a literal embedded in application code:
	9	
	10	```js
	11	// app.js line 2
	12	const API_ENDPOINT = "https://api.example.com/login";
	13	```
	14	
	15	Changing environments means editing application logic. There is no place in the
	16	repository that answers "what endpoint does each environment use?" and no way to
	17	run the same source against a different backend.
	18	
	19	## Goal
	20	
	21	Move the API endpoint configuration out of `app.js` into a dedicated settings
	22	module, so that switching environments is a single edit in an obvious location
	23	rather than a change to application code.
	24	
	25	## Non-goals
	26	
	27	- Implementing a real network request. `login()` remains a stub that logs and
	28	  returns `{ success: true, user: username }`. Its behavior does not change.
	29	- Introducing a bundler, transpiler, or build step.
	30	- Sharing configuration with the CommonJS `src/` tree. That half of the
	31	  repository has no configuration today and is out of scope.
	32	- Adding secrets management. The endpoints here are public URLs.
	33	
	34	## Context
	35	
	36	The repository contains two disjoint halves that do not interoperate:
	37	
	38	- **Browser half** (root): `index.html` loads `app.js` via a plain
	39	  `<script src="app.js">` tag. No module system, no `process.env`, no bundler.
	40	- **Node half** (`src/`): `index.js` and `utils.js` use CommonJS
	41	  (`require`/`module.exports`). Never loaded by the browser.
	42	
	43	`package.json` declares no dependencies, no scripts, and no test runner.
	44	
	45	The configuration to be moved lives in the browser half — the half with no
	46	module system. This constrains the design more than the size of the change
	47	suggests.
	48	
	49	## Decisions
	50	
	51	Each decision below was presented with alternatives and approved.
	52	
	53	### D1. Environment source: hostname detection
	54	
	55	The settings module maps `window.location.hostname` to an environment.
	56	
	57	Chosen because it requires no build tooling and no deploy choreography, and it
	58	keeps every environment's configuration visible in one readable file. The page
	59	remains a set of static files.
	60	
	61	Rejected alternatives:
	62	
	63	- *Deploy-time file swap* — correctness moves into the deploy process, and the
	64	  source no longer answers which environment is which.
	65	- *Build-time injection* — the standard answer at scale and the only one that
	66	  keeps non-production endpoints out of the shipped artifact, but it introduces
	67	  an entire toolchain for one string.
	68	- *Runtime injected global* — one artifact across environments, but
	69	  configuration lives partly outside the repository.
	70	
	71	Migration note: every rejected alternative also ends with `app.js` reading a
	72	named settings value rather than a literal. Switching later is a contained
	73	change to `settings.js` alone.
	74	
	75	### D2. Module format: plain global script
	76	
	77	`settings.js` loads via its own `<script>` tag and exposes one global. `app.js`
	78	reads it directly.
	79	
	80	Chosen because `app.js` is already global-scope script code, and because
	81	`type="module"` is fetched under CORS rules, which would break opening
	82	`index.html` from disk and require a local dev server.
	83	
	84	Accepted cost: one global, and load order in `index.html` becomes load-bearing.
	85	Mitigated by D5.
	86	
	87	### D3. Scope: browser only
	88	
	89	`src/index.js` and `src/utils.js` are not modified. Making `settings.js`
	90	reachable from CommonJS would require a dual-format file or a bundler, for
	91	configuration the Node half does not use.
	92	
	93	### D4. Unknown-hostname behavior: warn and fall back to local
	94	
	95	An unrecognized hostname emits a `console.warn` naming the hostname and resolves
	96	to the `local` environment.
	97	
	98	Chosen for asymmetry of harm: this is a login form. An unrecognized preview or
	99	test host silently authenticating against production is a materially bad
	100	outcome; an unreachable development endpoint is an immediate, obvious, cheap
	101	diagnosis.
	102	
	103	Accepted cost: a genuinely new production hostname would be quietly wrong rather
	104	than loudly broken. The `console.warn` is what makes this detectable, and is
	105	therefore required, not decorative.
	106	
	107	### D5. Config shape: `apiBaseUrl`, path owned by the caller
	108	
	109	Settings stores the host portion per environment. `app.js` owns the `/login`
	110	path.
	111	
	112	Chosen because the host is what varies across environments; the path does not.
	113	Storing complete URLs would duplicate `/login` across all three entries, which
	114	rots as soon as a second endpoint exists.
	115	
	116	## Design
	117	
	118	### File layout
	119	
	120	```
	121	settings.js      (new)  -- browser half, beside app.js
	122	app.js           (edit) -- constant removed, reads settings
	123	index.html       (edit) -- one script tag added
	124	test/settings.test.js (new) -- hostname resolution tests
	125	package.json     (edit) -- test script
	126	```
	127	
	128	### Loading
	129	
	130	`index.html` gains one tag, ordered before the existing one:
	131	
	132	```html
	133	<script src="settings.js"></script>
	134	<script src="app.js"></script>
	135	```
	136	
	137	### Module contract
	138	
	139	`settings.js` is an IIFE that assigns exactly one global, a frozen object:
	140	
	141	```js
	142	window.APP_SETTINGS = Object.freeze({
	143	  environment: "local" | "staging" | "production",
	144	  apiBaseUrl:  "https://..."
	145	});
	146	```
	147	
	148	`Object.freeze` is deliberate: settings are readable everywhere and writable
	149	nowhere. Runtime mutation of configuration is always a bug.
	150	
	151	Internally the module holds two tables, both at the top of the file so that
	152	changing an environment is a one-line edit in an obvious place:
	153	
	154	- `ENVIRONMENTS` — environment name to its configuration.
	155	- `HOSTNAMES` — hostname to environment name.
	156	
	157	### Resolution algorithm
	158	
	159	1. Read `window.location.hostname`.
	160	2. Look it up in `HOSTNAMES`.
	161	3. On a hit, resolve to that environment.
	162	4. On a miss, `console.warn` naming the unrecognized hostname, then resolve to
	163	   `local`.
	164	5. Freeze and assign the result to `window.APP_SETTINGS`.
	165	
	166	### `app.js` changes
	167	
	168	- Delete line 2, the `API_ENDPOINT` literal.
	169	- `login()` derives its URL from `window.APP_SETTINGS.apiBaseUrl` plus the
	170	  `/login` path. The function remains a stub; no network call is added.
	171	- Add a startup guard: if `window.APP_SETTINGS` is undefined — the script tag is
	172	  missing or failed to load — log a clear error naming the cause rather than
	173	  failing on an obscure property access. This is the direct cost of D2 and is
	174	  required, not optional.
	175	
	176	### Error handling summary
	177	
	178	| Condition | Behavior |
	179	|---|---|
	180	| Known hostname | Resolve to its environment |
	181	| Unknown hostname | `console.warn` with the hostname; resolve to `local` |
	182	| `settings.js` not loaded | `app.js` logs a clear startup error |
	183	| Attempted mutation of settings | Silently ignored (frozen object) |
	184	
	185	## Testing
	186	
	187	Hostname resolution is the only logic here, and a wrong fallback is precisely
	188	the class of bug that stays invisible until it is expensive. It gets tests.
	189	
	190	Browser-only scope (D3) means `settings.js` cannot be `require`d. Tests use
	191	Node's built-in `node:test` with `node:vm`, evaluating `settings.js` against a
	192	fabricated `window` object. Zero dependencies, no bundler.
	193	
	194	Cases:
	195	
	196	- Each hostname in `HOSTNAMES` resolves to its expected environment and
	197	  `apiBaseUrl`.
	198	- An unrecognized hostname resolves to `local`.
	199	- An unrecognized hostname emits a warning naming the hostname.
	200	- The exported settings object is frozen.
	201	
	202	`package.json` gains a `test` script invoking `node --test`.
	203	
	204	No linter or formatter is being added; that was considered and declined as
	205	broader than this task.
	206	
	207	## Assumptions
	208	
	209	- *Assumption:* the environments are `local` (`localhost`, `127.0.0.1`),
	210	  `staging`, and `production`. *Validate via:* user confirmation.
	211	- *Assumption:* the real staging and production hostnames are not derivable from
	212	  this repository and will ship as clearly-marked placeholders. *Validate via:*
	213	  user supplying the actual hostnames before deployment.
	214	- *Assumption:* `https://api.example.com` is the production API base, inferred
	215	  from the current literal. *Validate via:* user confirmation.
	216	
	217	## Risks
	218	
	219	- Placeholder hostnames left unfilled would cause staging and production to
	220	  silently resolve to `local` under D4. The `console.warn` is the mitigation,
	221	  and the placeholders are marked in-file.
	222	- Script ordering in `index.html` is load-bearing under D2. The startup guard in
	223	  `app.js` converts a silent failure into a clear one.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T100253Z-e60d/home/.cache/hyperpowers/codex-review/f163a817e7e78776f3846a8ec319f854ea73e9a3/run-2BiPd53E/adjudications.md

	1	# Approved design decisions (from brainstorming dialogue)
	2	
	3	Original user request, verbatim:
	4	"Move the API endpoint config into a new settings module so it's easier to change environments."
	5	
	6	Classification: architectural (request names a new module the repo does not have).
	7	
	8	Each decision below was presented to the user with alternatives and explicitly chosen by them:
	9	
	10	1. Environment source = hostname detection (window.location.hostname).
	11	   Alternatives offered and rejected: deploy-time file swap; build-time
	12	   injection; runtime injected global.
	13	2. Module format = plain global script (<script src="settings.js"> before app.js).
	14	   Alternative offered and rejected: ES modules (rejected because type="module"
	15	   breaks file:// dev).
	16	3. Scope = browser only. src/ (CommonJS Node half) stays untouched.
	17	   Alternative offered and rejected: shared across both halves.
	18	4. Unknown-hostname behavior = console.warn + fall back to local.
	19	   Alternatives offered and rejected: throw; fall back to production; warn + null.
	20	5. Config shape = apiBaseUrl per environment, /login path owned by app.js.
	21	   Alternative offered and rejected: full apiEndpoint URL per environment.
	22	6. Tooling = node:test + node:vm test for hostname resolution. User declined
	23	   adding a linter/formatter as broader than this task.
	24	
	25	User approved the design presentation and asked for the spec to be written.
	26	
	27	Repository facts the reviewer should know:
	28	- app.js is a plain browser script; index.html loads it with a bare <script> tag.
	29	- src/index.js and src/utils.js use CommonJS and are never loaded by the browser.
	30	- package.json has no dependencies, no scripts, no test runner.
	31	- The only configuration in the repo is app.js line 2:
	32	  const API_ENDPOINT = "https://api.example.com/login";
	33	- login() is a stub; it does not perform a network request today and must not
	34	  start doing so as part of this change.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
