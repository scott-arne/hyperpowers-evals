# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T012824Z-c37d/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-settings-module-design.md

	1	# Settings Module Design
	2	
	3	Date: 2026-09-16
	4	Status: approved, not yet implemented
	5	
	6	## Problem
	7	
	8	The browser app hardcodes its API endpoint. `app.js:2` holds:
	9	
	10	```js
	11	const API_ENDPOINT = "https://api.example.com/login";
	12	```
	13	
	14	Pointing the app at a different environment means editing that line, which is
	15	manual and easy to ship by mistake. The endpoint should live in a dedicated
	16	settings module that resolves the right environment automatically.
	17	
	18	## Current State
	19	
	20	- `index.html` loads `app.js` through a plain `<script src="app.js">` tag. No
	21	  bundler, no module system, no build step.
	22	- `app.js` is a global-scope browser script. `API_ENDPOINT` is referenced only
	23	  by the `login()` stub at `app.js:4-8`; nothing performs a real request yet.
	24	- `src/index.js` and `src/utils.js` are a separate CommonJS Node demo
	25	  (`greet()`). They do not touch the endpoint and are out of scope.
	26	- `package.json` declares no dependencies and no scripts. No test runner, no
	27	  linter.
	28	
	29	## Decisions
	30	
	31	These were settled during brainstorming and are the premises of the design.
	32	
	33	1. **Environment selection is hostname detection, not a manual edit.** The
	34	   module maps the current hostname to an environment at load time. A `?env=`
	35	   query parameter overrides detection for local testing against another
	36	   environment. Build-time injection was rejected: it would require adding a
	37	   bundler or substitution script to a repo that has neither.
	38	2. **Packaging is a browser-only global.** `settings.js` is loaded by a
	39	   `<script>` tag before `app.js` and publishes `window.SETTINGS`. Sharing
	40	   config with the CommonJS code under `src/` was rejected as speculative —
	41	   that tree has no network concerns and no consumer for settings.
	42	3. **Three environments: `local`, `staging`, `production`.**
	43	4. **Unit tests via `node:test`.** Zero dependencies. No linter is being added.
	44	
	45	## Architecture
	46	
	47	One new module, `settings.js`, at the repo root beside `app.js`. It owns three
	48	responsibilities:
	49	
	50	- the per-environment table,
	51	- a pure resolver from location inputs to an environment name,
	52	- the assembled config object published to the browser.
	53	
	54	`app.js` becomes a consumer. It reads a resolved endpoint and knows nothing
	55	about hostnames, environments, or overrides.
	56	
	57	### Environment table
	58	
	59	Each environment carries a base URL rather than a full endpoint URL. The host
	60	is the part that varies per environment; the `/login` path does not. This
	61	avoids repeating the path across rows and makes a second endpoint a one-line
	62	addition.
	63	
	64	```js
	65	const ENVIRONMENTS = {
	66	  local:      { apiBaseUrl: "http://localhost:3000" },
	67	  staging:    { apiBaseUrl: "https://api.staging.example.com" },
	68	  production: { apiBaseUrl: "https://api.example.com" },
	69	};
	70	```
	71	
	72	Assumption: the `local` and `staging` base URLs above are placeholders; the
	73	real values were not available at design time. Validate by confirming them
	74	with the project owner before or during implementation. The `production` base
	75	URL is not an assumption — it preserves the host currently in `app.js:2`
	76	exactly.
	77	
	78	### Resolution order
	79	
	80	`resolveEnvironmentName(hostname, search)` is a pure function of two strings,
	81	with no access to globals, so it is directly unit-testable. Order:
	82	
	83	1. If `search` contains an `env` parameter naming a key of `ENVIRONMENTS`,
	84	   return that key.
	85	2. If `search` contains an `env` parameter that is not a known key, emit
	86	   `console.warn` and continue to step 3.
	87	3. If `hostname` is `localhost`, `127.0.0.1`, `[::1]`, or the empty string
	88	   (a `file://` load), return `local`.
	89	4. If `hostname` begins with `staging.` or contains `.staging.`, return
	90	   `staging`.
	91	5. Otherwise return `production`.
	92	
	93	### Published config
	94	
	95	```js
	96	window.SETTINGS = {
	97	  environment,   // resolved name, e.g. "production"
	98	  apiBaseUrl,    // from the table
	99	  loginEndpoint, // apiBaseUrl + "/login"
	100	};
	101	```
	102	
	103	`environment` is exposed because knowing which environment resolved is useful
	104	when debugging an unexpected endpoint, and it costs one property.
	105	
	106	### Node-import guards
	107	
	108	Two guards keep `settings.js` importable by the test suite without side
	109	effects, while leaving it a browser-first global script:
	110	
	111	- the `window.SETTINGS` assignment is wrapped in
	112	  `typeof window !== "undefined"`,
	113	- a `module.exports` block at the bottom, guarded by
	114	  `typeof module !== "undefined" && module.exports`, exports `ENVIRONMENTS`,
	115	  `resolveEnvironmentName`, and the config builder.
	116	
	117	This is the only concession to dual-format loading. It exists for testability,
	118	not for consumers; `src/` is still not expected to import settings.
	119	
	120	## Data Flow
	121	
	122	1. The browser parses `index.html` and loads `settings.js` first.
	123	2. `settings.js` reads `window.location.hostname` and
	124	   `window.location.search`, resolves the environment, and assigns
	125	   `window.SETTINGS`.
	126	3. The browser loads `app.js`, whose line 2 becomes
	127	   `const API_ENDPOINT = window.SETTINGS.loginEndpoint;`.
	128	4. `login()` is unchanged. Its stub comment referring to `API_ENDPOINT` stays
	129	   accurate.
	130	
	131	Script ordering in `index.html` is load-bearing and gets a brief comment
	132	saying so.
	133	
	134	## Error Handling
	135	
	136	- **Unrecognized hostname** falls back to `production` rather than throwing. A
	137	  page pointing at production is a better failure than a page that cannot log
	138	  in at all.
	139	- **Unrecognized `?env=` value** is ignored with a `console.warn`, and
	140	  hostname detection proceeds. A typo should not silently pin the app to a
	141	  fallback with no signal.
	142	- **`settings.js` missing or failing to load** throws when `app.js` is parsed,
	143	  because `window.SETTINGS` is undefined. This is intentional and not guarded:
	144	  a missing endpoint should fail loudly, and correct script ordering makes it
	145	  a setup error rather than a runtime condition.
	146	
	147	## Testing
	148	
	149	`test/settings.test.js` using `node:test`, with `"test": "node --test"` added
	150	to `package.json` scripts.
	151	
	152	Cases:
	153	
	154	- `localhost`, `127.0.0.1`, `[::1]`, and `""` each resolve to `local`.
	155	- `api.staging.example.com` and `staging.example.com` resolve to `staging`.
	156	- An unlisted hostname resolves to `production`.
	157	- `?env=staging` on a `localhost` load resolves to `staging`.
	158	- `?env=nonsense` falls back to hostname detection rather than throwing.
	159	- The production base URL matches the host previously hardcoded in `app.js`,
	160	  guarding against a silent endpoint change during the move.
	161	- Importing `settings.js` under Node does not throw and does not require a
	162	  `window` global.
	163	
	164	Manual verification in addition to the suite: load `index.html` in a browser,
	165	confirm `window.SETTINGS.environment` and `window.SETTINGS.loginEndpoint`
	166	report production values, then confirm `?env=local` flips both.
	167	
	168	## Files Touched
	169	
	170	| File | Change |
	171	|---|---|
	172	| `settings.js` | New. Table, resolver, published config, Node guards. |
	173	| `test/settings.test.js` | New. Resolver unit tests. |
	174	| `app.js` | Line 2 reads from `window.SETTINGS` instead of a literal. |
	175	| `index.html` | Adds the `settings.js` script tag before `app.js`. |
	176	| `package.json` | Adds the `test` script. |
	177	| `.gitignore` | New. Ignores `docs/hyperpowers`. |
	178	
	179	## Out of Scope
	180	
	181	- `src/index.js` and `src/utils.js`. They have no endpoint concerns.
	182	- Making `login()` perform a real request. It stays a stub.
	183	- Linting or formatting tooling.
	184	- Build-time configuration injection.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T012824Z-c37d/home/.cache/hyperpowers/codex-review/71f66b16ed7af431acb5053b49db10cb8542c24b/run-AX2pEc2m/approved-design-context.md

	1	# Approved design context
	2	
	3	## Original request (verbatim)
	4	
	5	> Move the API endpoint config into a new settings module so it's easier to change environments.
	6	
	7	## Repository facts
	8	
	9	- Working directory is a minimal JS fixture repo: `app.js`, `index.html`,
	10	  `package.json`, `README.md`, `src/index.js`, `src/utils.js`.
	11	- `index.html` loads `app.js` with a plain `<script src="app.js">` tag. No
	12	  bundler, no module system, no build step.
	13	- `app.js:2` is `const API_ENDPOINT = "https://api.example.com/login";`. It is
	14	  referenced only by the `login()` stub at `app.js:4-8`, which performs no real
	15	  request.
	16	- `src/index.js` and `src/utils.js` are a separate CommonJS Node demo
	17	  (`greet()`), unrelated to the endpoint.
	18	- `package.json` has no dependencies and no scripts. No test runner, no linter.
	19	
	20	## Decisions made with the user, and what was rejected
	21	
	22	Each of these was presented as an explicit choice with tradeoffs and chosen by
	23	the user. They are settled premises, not open questions.
	24	
	25	1. **Environment selection: hostname detection with a `?env=` override.**
	26	   Rejected: a single manually edited value (too manual); build-time injection
	27	   (would require adding a bundler or substitution script to a repo with
	28	   neither).
	29	2. **Packaging: browser-only global script.** `settings.js` loaded before
	30	   `app.js`, publishing `window.SETTINGS`. Rejected: ES modules (would make
	31	   `app.js` a module and require a local server); dual-format sharing with the
	32	   CommonJS `src/` tree (speculative — no consumer exists).
	33	3. **Environments covered: `local`, `staging`, `production`.** Rejected:
	34	   local+production only; a four-tier local/dev/staging/production split.
	35	4. **Tooling: unit tests via `node:test` only.** Zero dependencies. The user
	36	   declined ESLint/Prettier. The user accepted that testing requires a small
	37	   `module.exports` guard in `settings.js`.
	38	
	39	## Design details approved in chat before the spec was written
	40	
	41	- Per-environment value is a **base URL**, with the login endpoint derived as
	42	  `apiBaseUrl + "/login"`, rather than a full endpoint URL per row.
	43	- Unrecognized hostname falls back to `production` rather than throwing.
	44	- Unrecognized `?env=` value is ignored with a `console.warn`, and hostname
	45	  detection proceeds.
	46	- A missing `settings.js` is intentionally left unguarded: `app.js` throws.
	47	- `local` and `staging` base URLs are placeholders; real values were not
	48	  available. The `production` base URL must preserve the host currently in
	49	  `app.js:2`.
	50	
	51	## Out of scope (agreed)
	52	
	53	- `src/index.js`, `src/utils.js`.
	54	- Making `login()` perform a real request.
	55	- Linting/formatting tooling.
	56	- Build-time configuration injection.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
