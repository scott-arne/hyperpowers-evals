# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260922T094522Z-a26b/coding-agent-workdir/docs/hyperpowers/specs/2026-09-22-settings-module-design.md

	1	# Settings Module for API Endpoint Configuration
	2	
	3	Date: 2026-09-22
	4	Status: Approved design, not yet implemented
	5	
	6	## Problem
	7	
	8	`app.js` hardcodes the API endpoint as a single full URL:
	9	
	10	```js
	11	const API_ENDPOINT = "https://api.example.com/login";
	12	```
	13	
	14	Pointing the webapp at a different environment means editing feature code, and
	15	there is no single place that answers "which API is this page talking to". The
	16	goal is to move environment configuration out of `app.js` into a dedicated
	17	module so switching environments is a config edit rather than a code edit.
	18	
	19	## Constraints
	20	
	21	These come from the existing repository, not from preference:
	22	
	23	- `index.html` loads `app.js` as a plain global script (`<script src="app.js">`).
	24	  There is no bundler, no build step, and no server — `index.html` is static.
	25	- `src/index.js` and `src/utils.js` are a separate CommonJS Node entry point
	26	  (`package.json` `main`). They share no code with the webapp and are out of
	27	  scope.
	28	- `package.json` declares no dependencies and no `scripts`. There is no test
	29	  runner, linter, or formatter configured, and this change does not add any
	30	  (decided during brainstorming).
	31	- `login()` is a stub that does not perform a network request. `API_ENDPOINT` is
	32	  currently referenced only by a comment.
	33	
	34	## Decisions
	35	
	36	Each was chosen explicitly during brainstorming; the rejected alternatives are
	37	recorded so they do not get re-litigated.
	38	
	39	### Environment selection: runtime hostname detection
	40	
	41	`settings.js` carries every environment and picks one from
	42	`window.location.hostname` at load time.
	43	
	44	Rejected: *deploy-time file swap* (one settings file per environment, copied in
	45	by the deploy) — requires a deploy pipeline this project does not have, and
	46	makes `settings.js` a build artifact rather than source. Rejected:
	47	*server-injected global* (`window.APP_CONFIG` written into `index.html`) —
	48	requires adding a server.
	49	
	50	Consequence accepted: every environment's API host is visible in the shipped
	51	source. This is acceptable because these are public API base URLs, not secrets.
	52	
	53	### Consumption: global script, not ES modules
	54	
	55	`settings.js` assigns `window.APP_SETTINGS`, and `index.html` loads it before
	56	`app.js`.
	57	
	58	Rejected: *ES modules* (`export`/`import` with `<script type="module">`) — module
	59	scripts are CORS-restricted, so the page could no longer be opened over
	60	`file://` without a local HTTP server. The exported interface
	61	(`apiBaseUrl`) is identical under either, so migrating later is mechanical.
	62	
	63	### Config shape: base URL only
	64	
	65	Settings exposes `apiBaseUrl`; the `/login` path stays with the feature code
	66	that uses it.
	67	
	68	Rejected: *full URLs per endpoint* — the table would grow by environments ×
	69	endpoints. Rejected: *base URL plus a shared path map* — structure bought for a
	70	second endpoint that does not exist yet. Promoting `apiBaseUrl` to a
	71	base-plus-paths shape later is additive, not breaking.
	72	
	73	### Environments: local, staging, production
	74	
	75	Unknown hostnames resolve to `production`.
	76	
	77	This default is deliberate and is the one piece of behavior worth defending: an
	78	unrecognized host should reach the real API rather than silently reach a
	79	developer's laptop or staging. A misrouted production user is a visible error;
	80	a production page quietly talking to staging is not.
	81	
	82	## Design
	83	
	84	### New file: `settings.js` (repo root)
	85	
	86	Placed beside `app.js`, not under `src/` — `src/` is the unrelated Node entry
	87	point.
	88	
	89	```js
	90	// API host per environment. Resolved at load time from the page's hostname so a
	91	// single set of files can be served to every environment without a build step.
	92	const ENVIRONMENTS = {
	93	  local:      { apiBaseUrl: "http://localhost:3000" },
	94	  staging:    { apiBaseUrl: "https://api-staging.example.com" },
	95	  production: { apiBaseUrl: "https://api.example.com" },
	96	};
	97	
	98	const HOSTNAME_ENVIRONMENTS = {
	99	  "localhost": "local",
	100	  "127.0.0.1": "local",
	101	  "staging.example.com": "staging",
	102	};
	103	
	104	// Unmapped hosts fall through to production: reaching the real API from an
	105	// unrecognized host is a visible failure, whereas silently reaching staging is
	106	// not.
	107	function resolveEnvironment(hostname) {
	108	  return HOSTNAME_ENVIRONMENTS[hostname] || "production";
	109	}
	110	
	111	const environment = resolveEnvironment(window.location.hostname);
	112	
	113	window.APP_SETTINGS = {
	114	  environment,
	115	  apiBaseUrl: ENVIRONMENTS[environment].apiBaseUrl,
	116	};
	117	```
	118	
	119	Adding an environment is a two-line edit; repointing one is a one-line edit.
	120	
	121	### Changed file: `index.html`
	122	
	123	Add one tag immediately before the existing `app.js` tag:
	124	
	125	```html
	126	<script src="settings.js"></script>
	127	<script src="app.js"></script>
	128	```
	129	
	130	### Changed file: `app.js`
	131	
	132	`API_ENDPOINT` keeps its name and position at the top of the file; only its
	133	value changes, plus a guard:
	134	
	135	```js
	136	if (!window.APP_SETTINGS) {
	137	  throw new Error("settings.js must load before app.js");
	138	}
	139	
	140	const API_ENDPOINT = `${window.APP_SETTINGS.apiBaseUrl}/login`;
	141	```
	142	
	143	Nothing inside `login()`, `validateForm()`, or the submit handler changes.
	144	
	145	### Error handling
	146	
	147	The only new failure mode is load order. `app.js` reads `window.APP_SETTINGS` at
	148	top level, so if the script tags are reordered or `settings.js` fails to load,
	149	the naive result is the string `"undefined/login"` — a URL that looks plausible
	150	in a log and fails confusingly at request time. The explicit throw converts that
	151	into a named error at page load. This guard is the reason the change is not a
	152	pure copy-paste move.
	153	
	154	No other error handling is added. `ENVIRONMENTS[environment]` cannot be
	155	undefined because `resolveEnvironment` only ever returns a key that exists in
	156	it.
	157	
	158	## Testing
	159	
	160	There is no test runner in this repository and none is being added, so
	161	verification is manual:
	162	
	163	1. Open `index.html` from `localhost` and confirm
	164	   `window.APP_SETTINGS.environment === "local"` and `API_ENDPOINT` is
	165	   `http://localhost:3000/login`.
	166	2. Confirm `resolveEnvironment("app.example.com")` returns `"production"`, so an
	167	   unmapped host yields today's URL, `https://api.example.com/login`.
	168	3. Temporarily remove the `settings.js` script tag and confirm the page throws
	169	   `"settings.js must load before app.js"` rather than producing
	170	   `undefined/login`.
	171	
	172	Behavior is otherwise unchanged: `login()` remains a stub that performs no
	173	network request, so there is no request-path regression to test for.
	174	
	175	## Assumptions
	176	
	177	Only `https://api.example.com` is drawn from the existing code. The rest were
	178	inferred and need confirmation before anyone relies on them:
	179	
	180	- Assumption: the local API runs at `http://localhost:3000`; validate by
	181	  confirming the local API server's port with whoever runs it.
	182	- Assumption: the staging API is `https://api-staging.example.com` and the
	183	  staging site is served from `staging.example.com`; validate against the
	184	  staging deployment's actual hostnames.
	185	
	186	If any is wrong, the fix is editing the corresponding line in `ENVIRONMENTS` or
	187	`HOSTNAME_ENVIRONMENTS`; no other code changes.
	188	
	189	## Out of Scope
	190	
	191	- Lint, format, and test tooling (explicitly declined during brainstorming).
	192	- `src/index.js` and `src/utils.js`.
	193	- Making `login()` perform a real request.
	194	- Any configuration beyond the API base URL.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260922T094522Z-a26b/home/.cache/hyperpowers/codex-review/2bb7110eb75573f892302d3eb08154cd3683a7ce/run-XHneQKG3/approved-design.md

	1	# Approved design context (brainstorming adjudications)
	2	
	3	## Original request, verbatim
	4	
	5	> Move the API endpoint config into a new settings module so it's easier to
	6	> change environments.
	7	
	8	## Repository facts
	9	
	10	- `app.js` (repo root) is a plain browser global script, loaded by `index.html`
	11	  as `<script src="app.js"></script>`. No bundler, no build step, no server.
	12	- `app.js` currently contains `const API_ENDPOINT = "https://api.example.com/login";`
	13	  referenced only by a comment inside the `login()` stub, which performs no
	14	  network request.
	15	- `src/index.js` and `src/utils.js` are a separate CommonJS Node entry point
	16	  (`package.json` `main`), unrelated to the browser code.
	17	- `package.json` has no dependencies and no `scripts`. No test runner, linter,
	18	  or formatter is configured.
	19	
	20	## Decisions the human partner made (each a direct answer to a posed question)
	21	
	22	1. **Environment selection** — runtime hostname detection. Rejected: deploy-time
	23	   file swap; server-injected `window.APP_CONFIG`.
	24	2. **Consumption style** — global script setting `window.APP_SETTINGS`, loaded
	25	   before `app.js`. Rejected: ES modules (would break `file://` loading).
	26	3. **Config shape** — base URL only (`apiBaseUrl`); the `/login` path stays in
	27	   feature code. Rejected: full URLs per endpoint; base URL plus shared path map.
	28	4. **Environments** — local, staging, production, identified by hostname.
	29	5. **Tooling** — none added. Lint, format, and test tooling were offered and
	30	   explicitly declined for this change.
	31	
	32	## Design approved in chat before the spec was written
	33	
	34	New `settings.js` at repo root with an `ENVIRONMENTS` table, a
	35	`HOSTNAME_ENVIRONMENTS` map, a `resolveEnvironment()` defaulting to
	36	`production`, and a `window.APP_SETTINGS` assignment; a new script tag in
	37	`index.html` before `app.js`; and in `app.js`, a guard that throws when
	38	`window.APP_SETTINGS` is absent plus `API_ENDPOINT` recomposed from
	39	`apiBaseUrl`.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
