# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T093542Z-08d5/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-settings-module-design.md

	1	# Settings Module Design
	2	
	3	Date: 2026-09-17
	4	Status: Approved design, pending implementation plan
	5	
	6	## Problem
	7	
	8	`app.js` hardcodes the API endpoint at line 2:
	9	
	10	```js
	11	const API_ENDPOINT = "https://api.example.com/login";
	12	```
	13	
	14	Pointing the app at a different backend means editing source. There is no
	15	notion of an environment anywhere in the repo, so there is nowhere for a
	16	second backend URL to live.
	17	
	18	## Goal
	19	
	20	Move the API endpoint into a dedicated settings module that resolves the
	21	correct backend for the environment the page is running in, so switching
	22	environments is a configuration lookup rather than a source edit.
	23	
	24	## Current State
	25	
	26	- `app.js` — browser global script, loaded by `index.html` via a plain
	27	  `<script src="app.js">` tag. Holds `API_ENDPOINT`, `login()`,
	28	  `validateForm()`, and the submit handler. `login()` is a stub that logs and
	29	  returns a canned success; it does not yet issue a request.
	30	- `index.html` — static login form; one script tag.
	31	- `src/index.js`, `src/utils.js` — CommonJS Node modules (`require` /
	32	  `module.exports`), unrelated to `app.js` and not loaded by the page.
	33	- `package.json` — no dependencies, no scripts, no build step.
	34	
	35	The repo therefore carries two incompatible module conventions, and no
	36	test runner, linter, or formatter.
	37	
	38	## Design Decisions
	39	
	40	Each was chosen explicitly during brainstorming.
	41	
	42	| Decision | Choice | Rejected alternatives |
	43	|---|---|---|
	44	| Environment source | `location.hostname` lookup, overridable by `window.APP_ENV` | Explicit HTML marker only; build-time substitution |
	45	| Module shape | Browser global script exposing `window.AppSettings` | ES module (`type="module"`); dual CommonJS/browser file |
	46	| Stored value | `apiBaseUrl` per environment; callers compose paths | Full endpoint URLs per environment |
	47	| Environments | `local`, `staging`, `production` | Two-tier; four-tier |
	48	| Unknown hostname | Falls back to `production` | Fail loudly |
	49	| Tooling | `node:test` unit tests, no linter | Manual verification; ESLint + Prettier |
	50	| Test seam | CommonJS export guard | `node:vm` file loading |
	51	
	52	A runtime-fetched `config.json` (ops edits JSON per host, no JS redeploy)
	53	was surfaced and declined in favor of hostname detection.
	54	
	55	## Architecture
	56	
	57	A new root-level `settings.js` is loaded by `index.html` immediately before
	58	`app.js`. It self-executes on load, resolves the environment once, and
	59	publishes `window.AppSettings`. By the time `app.js` evaluates, the settings
	60	are populated — there is no async step and no initialization call, so the
	61	only ordering requirement is script order in the HTML.
	62	
	63	Resolution order:
	64	
	65	1. `window.APP_ENV`, if set and naming a known environment.
	66	2. `location.hostname`, looked up in the hostname map.
	67	3. The `production` default.
	68	
	69	## Components
	70	
	71	### `settings.js` (new, repo root)
	72	
	73	An IIFE so that nothing leaks into the global scope except `AppSettings`.
	74	
	75	Internal tables:
	76	
	77	- `ENVIRONMENTS` — maps environment name to `{ apiBaseUrl }`.
	78	- `HOSTNAME_ENVIRONMENTS` — maps hostname to environment name.
	79	- `DEFAULT_ENVIRONMENT` — `"production"`.
	80	
	81	Resolver: `detectEnvironment(global)` implements the three-step order above.
	82	An `APP_ENV` value that names no known environment is ignored and resolution
	83	continues to the hostname step, so a typo cannot produce an undefined config.
	84	
	85	Public surface:
	86	
	87	- `window.AppSettings.apiBaseUrl` — base URL for the current environment.
	88	- `window.AppSettings.environment` — the resolved environment name, for
	89	  logging and for test assertions.
	90	
	91	The object is frozen so a later script cannot mutate the resolved endpoint
	92	after the fact.
	93	
	94	The file ends with a test-only CommonJS export guard:
	95	
	96	```js
	97	if (typeof module !== "undefined" && module.exports) {
	98	  module.exports = { detectEnvironment, ENVIRONMENTS, HOSTNAME_ENVIRONMENTS };
	99	}
	100	```
	101	
	102	Browsers ignore it; `node:test` uses it.
	103	
	104	### `index.html` (modified)
	105	
	106	One line added above the existing `app.js` tag:
	107	
	108	```html
	109	<script src="settings.js"></script>
	110	```
	111	
	112	### `app.js` (modified)
	113	
	114	Line 2 becomes:
	115	
	116	```js
	117	const API_ENDPOINT = `${window.AppSettings.apiBaseUrl}/login`;
	118	```
	119	
	120	The `API_ENDPOINT` name and the stub comment inside `login()` are preserved,
	121	so `login()`, `validateForm()`, and the submit handler are untouched.
	122	
	123	### Unchanged
	124	
	125	`src/index.js`, `src/utils.js`, and `package.json` are not modified. They
	126	share no code with `app.js`.
	127	
	128	## Configuration Values
	129	
	130	Assumption: staging's base URL is `https://staging-api.example.com` and its
	131	hostname is `staging.example.com`; validate by confirming the real staging
	132	host before implementation lands.
	133	
	134	Assumption: local development serves the API at `http://localhost:3000`;
	135	validate by confirming the local dev server port.
	136	
	137	`production` is `https://api.example.com`, derived from the existing
	138	hardcoded value and therefore not an assumption.
	139	
	140	`localhost` and `127.0.0.1` both map to `local`.
	141	
	142	## Error Handling
	143	
	144	An unrecognized hostname resolves to `production` rather than throwing. The
	145	consequence worth stating plainly: opening `index.html` directly from disk
	146	gives `location.hostname === ""`, which falls through to `production` and
	147	yields `https://api.example.com/login` — byte-identical to today's behavior.
	148	Preserving that is the point of the choice.
	149	
	150	The tradeoff is that a deploy to an unenumerated host silently talks to
	151	production instead of failing visibly. This is acceptable while `login()` is
	152	a stub that issues no request, and should be revisited when it starts making
	153	real calls.
	154	
	155	`window.APP_ENV` provides the escape hatch for any case the hostname map does
	156	not cover.
	157	
	158	## Testing
	159	
	160	`node:test` (Node standard library, no dependencies). A `test` script is
	161	added to `package.json`.
	162	
	163	`detectEnvironment` is the only branching logic and gets full branch
	164	coverage:
	165	
	166	1. `APP_ENV` set to a known environment wins over the hostname.
	167	2. `APP_ENV` set to an unknown value is ignored; hostname resolution proceeds.
	168	3. A mapped hostname (`localhost`, `127.0.0.1`, the staging host) resolves to
	169	   its environment.
	170	4. An unmapped hostname, and the empty hostname of `file://`, resolve to
	171	   `production`.
	172	
	173	A further test asserts that `ENVIRONMENTS.production.apiBaseUrl` composes to
	174	exactly `https://api.example.com/login`, pinning the no-regression property.
	175	
	176	Manual verification: load the page and confirm `window.AppSettings` reports
	177	the expected environment.
	178	
	179	## Out of Scope
	180	
	181	- Making `login()` issue a real request.
	182	- Any change to `src/` or sharing configuration with the Node entry point.
	183	- A bundler, linter, or formatter.
	184	- Secrets handling. Everything here is a public base URL; nothing secret
	185	  belongs in a browser-delivered file.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T093542Z-08d5/home/.cache/hyperpowers/codex-review/a557751961828f792c40a057b57f802d079e02ea/run-4q6VVILB/approved-design.md

	1	# Approved Design Context — Settings Module
	2	
	3	## Original user request (verbatim)
	4	
	5	"Move the API endpoint config into a new settings module so it's easier to change environments."
	6	
	7	## Brainstorming classification
	8	
	9	Classified architectural (the request names a new module and a new notion of
	10	environments — structure the repo does not have), not bounded.
	11	
	12	## Clarifying questions and the user's answers
	13	
	14	1. **How should the app determine which environment it's running in?**
	15	   Answer: **Hostname + override** — settings maps `location.hostname` to an
	16	   endpoint set; `window.APP_ENV` overrides it when set.
	17	   Declined: explicit HTML marker only; build-time substitution.
	18	
	19	2. **What module shape should the settings module use?**
	20	   Answer: **Browser global** — `settings.js` loaded before `app.js` in
	21	   `index.html`, exposing `window.AppSettings`. Still works from `file://`.
	22	   Declined: ES module (`type="module"`); dual CommonJS/browser file in `src/`.
	23	
	24	3. **What should settings store per environment?**
	25	   Answer: **Base URL** — settings holds `apiBaseUrl`; callers compose
	26	   `${apiBaseUrl}/login`.
	27	   Declined: full endpoint URLs per environment.
	28	
	29	4. **Which environments should the settings module define?**
	30	   Answer: **local, staging, production.**
	31	   Declined: two-tier; four-tier.
	32	
	33	5. **What tooling should we set up as part of this change?**
	34	   Answer: **`node:test` unit tests** (zero dependency).
	35	   Declined: manual verification only; ESLint + Prettier.
	36	
	37	6. **How should the tests reach into settings.js?**
	38	   Answer: **CommonJS export guard** — test-only lines at the bottom of
	39	   `settings.js`, ignored by browsers.
	40	   Declined: loading the file via `node:vm`.
	41	
	42	7. **Is the design settled enough to write the spec?**
	43	   Answer: **Approved — write the spec.**
	44	   The user did NOT choose "change the production fallback" and did NOT choose
	45	   "reopen runtime-fetched config.json", so the quiet production fallback and
	46	   hostname detection both stand as approved.
	47	
	48	## Codex approach gate
	49	
	50	Skipped. The architectural alternatives were enumerated in chat and settled by
	51	the user's explicit choices above. A runtime-fetched `config.json` approach was
	52	surfaced to the user and declined.
	53	
	54	## Codebase facts
	55	
	56	- Repo root contains: `README.md`, `app.js`, `index.html`, `package.json`, `src/`.
	57	- `app.js` line 2: `const API_ENDPOINT = "https://api.example.com/login";`
	58	  `app.js` also defines `login()` (a stub that logs and returns a canned
	59	  success; it issues no request), `validateForm()`, and a submit handler.
	60	- `index.html` loads `app.js` via a plain `<script src="app.js">` tag; there is
	61	  no `type="module"`.
	62	- `src/index.js` and `src/utils.js` are CommonJS (`require` / `module.exports`)
	63	  and are not loaded by the page. They share no code with `app.js`.
	64	- `package.json` has no dependencies and no scripts.
	65	- No test runner, linter, formatter, or build step exists in the repo.
	66	- Git branch `feature/webapp-enhancement`, working tree clean at brainstorm start.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
