# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T112043Z-57b9/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-settings-module-design.md

	1	# Settings Module Design
	2	
	3	Date: 2026-09-17
	4	Status: Approved design, pending implementation plan
	5	
	6	## Problem
	7	
	8	The API endpoint is hardcoded in `app.js`:
	9	
	10	```js
	11	const API_ENDPOINT = "https://api.example.com/login";
	12	```
	13	
	14	Changing environments means editing application code, and there is no
	15	mechanism for pointing a locally served page at a non-production API. The
	16	endpoint is also stored as a complete URL, so adding a second endpoint would
	17	duplicate the host in a second hardcoded string.
	18	
	19	## Goals
	20	
	21	- Move environment-dependent API configuration out of `app.js` into a single
	22	  module.
	23	- Select the active environment at runtime, so one deployed artifact works in
	24	  every environment with no edit-before-deploy step.
	25	- Allow a developer to force a specific environment without editing files.
	26	- Cover the environment-resolution logic with unit tests.
	27	
	28	## Non-Goals
	29	
	30	- No bundler, transpiler, or build step. The repository currently has zero
	31	  dependencies and the page is opened directly; both properties are preserved.
	32	- No change to `src/index.js` or `src/utils.js`. They are a separate CommonJS
	33	  Node entry point that never references the API endpoint.
	34	- No secrets in configuration. Every environment's values ship to the browser,
	35	  so `settings.js` is only ever appropriate for non-sensitive values such as
	36	  base URLs.
	37	- No linting, formatting, or end-to-end test infrastructure in this change.
	38	
	39	## Global Constraints
	40	
	41	These apply to every task in the implementation plan.
	42	
	43	- **Module style:** browser global via a second `<script>` tag. No ES modules;
	44	  `file://` access to `index.html` must keep working.
	45	- **Dependencies:** none may be added. `package.json` stays dependency-free.
	46	- **Test infrastructure:** Node's built-in `node:test` runner. Test command is
	47	  `npm test`, wired to `node --test test/`. Node 26 is the local runtime.
	48	  `settings.js` uses `var` and function declarations rather than the `const`
	49	  and arrow functions used in `app.js`, so the same file is loadable both as a
	50	  browser script and via CommonJS `require` without a wrapper.
	51	- **No unrelated refactoring.** `src/`, `README.md`, and the existing form
	52	  handling in `app.js` are out of scope.
	53	
	54	## Design
	55	
	56	### New file: `settings.js` (repository root)
	57	
	58	An IIFE that computes configuration at load time and assigns it to
	59	`window.AppSettings`. It lives at the repository root alongside `app.js`,
	60	because `index.html` loads scripts from the root.
	61	
	62	Internal structure:
	63	
	64	- `ENVIRONMENTS` — the environment table. Each entry holds an `apiBaseUrl`:
	65	  - `dev`: `http://localhost:3000`
	66	  - `staging`: `https://staging-api.example.com`
	67	  - `prod`: `https://api.example.com`
	68	- `HOSTNAME_ENVIRONMENTS` — hostname to environment name:
	69	  - `localhost` → `dev`
	70	  - `127.0.0.1` → `dev`
	71	  - `staging.example.com` → `staging`
	72	- `DEFAULT_ENVIRONMENT` — `prod`.
	73	- `OVERRIDE_KEY` — the `localStorage` key, `appEnv`.
	74	
	75	Assumption: the dev and staging base URLs and the staging hostname are
	76	placeholders. Validate by confirming the real values with the repository owner
	77	before the first deployment that relies on them. The `prod` value is not an
	78	assumption — it is the URL currently in `app.js`.
	79	
	80	### Resolution order
	81	
	82	`resolveEnvironment(hostname, storage)` returns an environment name:
	83	
	84	1. Read `storage.getItem("appEnv")`. If it names a key in `ENVIRONMENTS`,
	85	   return it.
	86	2. If it is a non-empty value that does not name a known environment, emit
	87	   `console.warn` identifying the bad value and the known names, then continue
	88	   to step 3. An unrecognized override must never select an environment and
	89	   must never throw.
	90	3. Look the hostname up in `HOSTNAME_ENVIRONMENTS`. If present, return the
	91	   mapped name.
	92	4. Return `DEFAULT_ENVIRONMENT`.
	93	
	94	The `storage.getItem` call is wrapped in try/catch. Accessing `localStorage`
	95	throws outright — rather than returning `null` — when storage is disabled or
	96	blocked by a privacy mode, and that must degrade to hostname detection rather
	97	than break the page.
	98	
	99	Both lookups use `Object.prototype.hasOwnProperty.call` so that inherited
	100	`Object.prototype` names (`toString`, `constructor`) cannot be mistaken for
	101	environment names.
	102	
	103	### Unknown-hostname default
	104	
	105	An unrecognized hostname resolves to `prod`. The development hostnames are
	106	enumerable and short; unknown hostnames in practice are real deployments —
	107	preview URLs, CDN domains, a new production alias. Defaulting those to `prod`
	108	fails toward a working page, whereas defaulting to `dev` would silently point a
	109	live deployment at a development server.
	110	
	111	The accepted cost: an unlisted internal host silently uses production. The
	112	mitigation is that `AppSettings.environment` is exposed, so the active
	113	environment is inspectable from the console.
	114	
	115	### Exported shape
	116	
	117	```js
	118	window.AppSettings = {
	119	  environment: "prod",
	120	  apiBaseUrl: "https://api.example.com",
	121	  endpoints: { login: "https://api.example.com/login" },
	122	};
	123	```
	124	
	125	Endpoints are derived from `apiBaseUrl` rather than stored as complete URLs, so
	126	adding a second endpoint does not re-introduce a duplicated host. For `prod`
	127	this reproduces the current string `https://api.example.com/login` exactly.
	128	
	129	### Node export tail
	130	
	131	To make resolution testable without a DOM, `settings.js` ends with:
	132	
	133	```js
	134	if (typeof module !== "undefined" && module.exports) {
	135	  module.exports = { ENVIRONMENTS, resolveEnvironment, buildSettings };
	136	}
	137	```
	138	
	139	`resolveEnvironment(hostname, storage)` and `buildSettings(hostname, storage)`
	140	take their inputs as arguments rather than reading `window` directly; the
	141	browser assignment is the only place that touches `window.location.hostname`
	142	and `window.localStorage`. The global assignment itself is guarded so that
	143	requiring the file under Node does not throw.
	144	
	145	## Changes to existing files
	146	
	147	### `index.html`
	148	
	149	Add `<script src="settings.js"></script>` immediately before the existing
	150	`<script src="app.js"></script>`. Load order is now load-bearing: `app.js`
	151	reads `window.AppSettings` at parse time.
	152	
	153	### `app.js`
	154	
	155	Replace:
	156	
	157	```js
	158	const API_ENDPOINT = "https://api.example.com/login";
	159	```
	160	
	161	with:
	162	
	163	```js
	164	const API_ENDPOINT = window.AppSettings.endpoints.login;
	165	```
	166	
	167	The identifier is unchanged, so no other line in the file is affected. No
	168	"settings failed to load" guard is added: if the script tag is missing or fails
	169	to load, this line throws a clear `Cannot read properties of undefined` naming
	170	`AppSettings`, which is more diagnostic than a hand-written fallback that would
	171	let the page run against no endpoint at all.
	172	
	173	### `package.json`
	174	
	175	Add:
	176	
	177	```json
	178	"scripts": { "test": "node --test test/" }
	179	```
	180	
	181	## Testing
	182	
	183	New file `test/settings.test.js`, using `node:test` and `node:assert/strict`.
	184	It requires `../settings.js` and exercises the pure functions with a fake
	185	storage object.
	186	
	187	Cases:
	188	
	189	1. Unknown hostname with no override resolves to `prod`.
	190	2. `localhost` resolves to `dev`; `127.0.0.1` resolves to `dev`.
	191	3. `staging.example.com` resolves to `staging`.
	192	4. A valid override wins over the hostname mapping (`appEnv = "staging"` on
	193	   `localhost` yields `staging`).
	194	5. An unrecognized override value falls back to hostname detection and does not
	195	   throw.
	196	6. A storage object whose `getItem` throws falls back to hostname detection.
	197	7. A `null`/absent storage argument falls back to hostname detection.
	198	8. `buildSettings` for a prod hostname produces
	199	   `endpoints.login === "https://api.example.com/login"` — a regression lock on
	200	   the exact URL that exists in `app.js` today.
	201	9. An inherited property name as an override (`"toString"`) does not resolve to
	202	   an environment.
	203	
	204	Manual verification, since no DOM test infrastructure is in scope: open
	205	`index.html`, confirm the console-logged flow works and `AppSettings.environment`
	206	reads `prod`; set `localStorage.appEnv = "staging"`, reload, confirm it reads
	207	`staging`; set a garbage value, confirm the warning and the fallback.
	208	
	209	## Risks
	210	
	211	- **The placeholder dev and staging URLs are wrong until corrected.** They are
	212	  inert until someone browses from a matching hostname or sets the override, so
	213	  the failure mode is a failed request, not a wrong-environment write.
	214	- **Load-order coupling in `index.html`.** Reordering or removing the settings
	215	  script breaks `app.js` immediately and loudly. Accepted as the cost of the
	216	  no-bundler constraint.
	217	- **All environment URLs are visible in the delivered page.** Acceptable for
	218	  base URLs; this module must not be extended to hold credentials.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T112043Z-57b9/home/.cache/hyperpowers/codex-review/44b899475e3e48fdaa5c55c83ca5929fab1714ad/run-89JiOggi/adjudications.md

	1	# Approved design decisions (brainstorming)
	2	
	3	Original request, verbatim:
	4	
	5	> Move the API endpoint config into a new settings module so it's easier to
	6	> change environments.
	7	
	8	Repository facts at the time of the request:
	9	
	10	- `app.js` (repo root) is a plain browser script loaded by `index.html` via
	11	  `<script src="app.js">`. It contains
	12	  `const API_ENDPOINT = "https://api.example.com/login";`.
	13	- `src/index.js` and `src/utils.js` are a separate CommonJS Node entry point
	14	  (`greet`/`main`); neither references the API endpoint.
	15	- `package.json` has no dependencies and no scripts.
	16	- No bundler, no linter, no formatter, no test framework, no `.gitignore`.
	17	- Local Node is v26.8.2.
	18	
	19	Decisions the human partner made, each chosen from presented alternatives:
	20	
	21	1. **Environment selection: runtime selection.** The settings module holds all
	22	   environments and picks one on load (hostname detection plus a manual
	23	   override). Rejected: single flat config edited per environment; build-time
	24	   injection (would add a toolchain the repo does not have).
	25	2. **Module format: browser global via a second `<script>` tag.** `settings.js`
	26	   loads before `app.js` and exposes `window.AppSettings`. Rejected: ES modules
	27	   (would break `file://` access to `index.html`); dual browser/CommonJS export
	28	   as the primary consumption path.
	29	3. **Environments: `dev` / `staging` / `prod`.** Prod keeps the existing
	30	   `api.example.com` URL; dev and staging use placeholder hosts that the owner
	31	   will correct.
	32	4. **Override mechanism: `localStorage`.** Key `appEnv`. Rejected: URL query
	33	   param; both-with-precedence; no override at all.
	34	5. **Tooling: unit tests via Node's built-in `node:test` only.** Explicitly
	35	   declined for this change: eslint/prettier, Playwright e2e. No dependencies
	36	   may be added. This decision is why `settings.js` carries a guarded
	37	   `module.exports` tail despite decision 2 — it is the testability affordance,
	38	   not a change of module strategy.
	39	
	40	Explicitly out of scope by agreement: `src/index.js`, `src/utils.js`,
	41	`README.md`, and the existing form-handling logic in `app.js`.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
