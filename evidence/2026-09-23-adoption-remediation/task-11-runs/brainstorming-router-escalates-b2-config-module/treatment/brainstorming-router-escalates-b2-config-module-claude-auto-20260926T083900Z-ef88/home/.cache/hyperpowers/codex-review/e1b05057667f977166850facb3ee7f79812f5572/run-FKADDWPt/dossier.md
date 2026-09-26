# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260926T083900Z-ef88/coding-agent-workdir/docs/hyperpowers/specs/2026-09-26-api-settings-module-design.md

	1	# API Settings Module — Design
	2	
	3	Date: 2026-09-26
	4	Status: awaiting user review
	5	
	6	## Problem
	7	
	8	The login API endpoint is a bare constant at the top of `app.js`:
	9	
	10	```js
	11	const API_ENDPOINT = "https://api.example.com/login";
	12	```
	13	
	14	Pointing the app at a different environment means editing application code.
	15	There is no place for environment-varying configuration to live, and no
	16	mechanism for selecting between environments.
	17	
	18	## Goal
	19	
	20	Move the API endpoint into a dedicated settings module that resolves the
	21	correct environment automatically, so switching environments requires no
	22	source edit.
	23	
	24	Non-goal: a general configuration system. This covers the API base URL and
	25	the one endpoint derived from it. Further settings can join the same table
	26	when they exist.
	27	
	28	## Decisions
	29	
	30	Two forks were resolved with the user before design:
	31	
	32	1. **Environment selection: runtime hostname detection.** The module holds a
	33	   table of environments and picks one from `window.location.hostname` at
	34	   load. Chosen over deploy-time file swapping (needs deployment machinery
	35	   this project does not have) and build-time injection (introduces a
	36	   toolchain this project does not have). The endpoint is a public API URL,
	37	   so shipping all environments' hosts to the browser is not a disclosure
	38	   concern.
	39	2. **Module format: ES modules.** `settings.js` uses `export`, `app.js` uses
	40	   `import`, and `index.html` switches to `<script type="module">`. Chosen
	41	   over a `window.APP_SETTINGS` global. Accepted cost: `type="module"`
	42	   scripts are fetched under CORS rules, so the page can no longer be opened
	43	   via `file://` — it must be served over http.
	44	3. **Unrecognized hostnames resolve to production**, preserving today's
	45	   behavior for any host not explicitly listed.
	46	4. **Unit tests via `node --test`** (built-in runner, no dependencies). No
	47	   linter, formatter, or end-to-end tests — the project has none and this
	48	   change does not justify introducing a toolchain.
	49	
	50	## Design
	51	
	52	### `settings.js` (new, repo root)
	53	
	54	Browser-side code lives at the repo root alongside `app.js`; `src/` is an
	55	unrelated CommonJS Node entry point.
	56	
	57	The module is **purely functional** — it reads no browser globals. This is a
	58	direct consequence of decision 4: a module that evaluates
	59	`window.location.hostname` at import time throws under `node --test`, where
	60	no `window` exists. Keeping the module pure avoids a `typeof window` guard
	61	and makes every mapping directly testable.
	62	
	63	```js
	64	const ENVIRONMENTS = {
	65	  local:      { apiBaseUrl: "http://localhost:3000" },
	66	  staging:    { apiBaseUrl: "https://staging-api.example.com" },
	67	  production: { apiBaseUrl: "https://api.example.com" },
	68	};
	69	
	70	const HOSTNAME_ENVIRONMENTS = {
	71	  localhost: "local",
	72	  "127.0.0.1": "local",
	73	  "staging.example.com": "staging",
	74	};
	75	
	76	export function environmentForHostname(hostname) { /* table lookup, default "production" */ }
	77	export function settingsForHostname(hostname) { /* ENVIRONMENTS[environmentForHostname(hostname)] */ }
	78	export function loginEndpoint(hostname) { /* `${settingsForHostname(hostname).apiBaseUrl}/login` */ }
	79	```
	80	
	81	The table stores `apiBaseUrl`, not fully-formed endpoint URLs, and endpoints
	82	are derived from it. Adding a second endpoint later costs one derivation
	83	function rather than three more host strings to keep synchronized — which is
	84	the substance of "easier to change environments".
	85	
	86	### `app.js` (changed)
	87	
	88	- Remove the `API_ENDPOINT` constant.
	89	- `import { loginEndpoint } from "./settings.js";`
	90	- Resolve once at module scope:
	91	  `const LOGIN_ENDPOINT = loginEndpoint(window.location.hostname);`
	92	- Update the stub comment in `login()` to name `LOGIN_ENDPOINT`.
	93	
	94	No other logic changes. `login()` and `validateForm()` keep their current
	95	behavior and signatures; `login()` is still a stub that performs no request.
	96	
	97	### `index.html` (changed)
	98	
	99	`<script src="app.js"></script>` becomes
	100	`<script type="module" src="app.js"></script>`.
	101	
	102	Module scripts are deferred, so they execute after parsing. The existing
	103	top-level `document.getElementById("login-form")` call continues to find its
	104	element.
	105	
	106	### `package.json` and `src/package.json`
	107	
	108	`node --test` must load `settings.js` as an ES module, which requires
	109	`"type": "module"` in the root `package.json`. That field applies to every
	110	`.js` file under the package root, including `src/index.js` and
	111	`src/utils.js`, which use `require`/`module.exports` and would break.
	112	
	113	Resolution: add `src/package.json` containing `{ "type": "commonjs" }`. A
	114	nested `package.json` scopes the module type to that subtree, so the existing
	115	Node code keeps working with **no edits to `src/index.js` or `src/utils.js`**.
	116	
	117	Root `package.json` also gains `"test": "node --test"`.
	118	
	119	### `settings.test.js` (new)
	120	
	121	Covers the mapping table:
	122	
	123	- `localhost` and `127.0.0.1` resolve to the local API base URL.
	124	- The staging hostname resolves to the staging API base URL.
	125	- An unrecognized hostname (e.g. `app.example.com`) resolves to production.
	126	- The empty string resolves to production.
	127	- `loginEndpoint` appends `/login` to the resolved base URL without a
	128	  duplicated or missing slash.
	129	
	130	## Behavior Change
	131	
	132	For every host except `localhost`, `127.0.0.1`, and the staging hostname, the
	133	resolved endpoint is `https://api.example.com/login` — identical to today.
	134	
	135	One genuine behavior change: a page loaded from `localhost` previously hit
	136	production and will now hit `http://localhost:3000`. That is the intended
	137	effect of the feature, but it is not a pure refactor, and anyone who was
	138	testing against production from localhost is affected.
	139	
	140	A second consequence of decision 2: opening `index.html` directly from the
	141	filesystem no longer works. Serving the directory (for example
	142	`npx serve .`) becomes a prerequisite for running the page.
	143	
	144	## Assumptions
	145	
	146	Only the production URL is derivable from existing code. The rest are
	147	placeholders carried from the design discussion:
	148	
	149	- Assumption: the local API is `http://localhost:3000`; validate by
	150	  confirming the local API's port with the user before implementation.
	151	- Assumption: the staging API is `https://staging-api.example.com`; validate
	152	  with the user before implementation.
	153	- Assumption: the staging frontend is served from `staging.example.com`;
	154	  validate with the user before implementation. This one matters most — if
	155	  the hostname is wrong, staging silently resolves to production, which is
	156	  exactly the failure mode decision 3 accepts.
	157	
	158	Wrong values here are a one-line correction in a table, not a design change.
	159	
	160	## Out of Scope
	161	
	162	- `src/index.js` and `src/utils.js` — no API configuration in them, and
	163	  converting them to ES modules serves no goal of this change. They are
	164	  insulated via `src/package.json` only.
	165	- Runtime override mechanisms (query parameter, `localStorage`) for forcing
	166	  an environment. Not requested; add only if a real need appears.
	167	- Making `login()` perform an actual request. It remains a stub.
	168	
	169	## Testing
	170	
	171	- `npm test` (`node --test`) covers the hostname table and endpoint
	172	  derivation.
	173	- Manual verification, since the `window` read is not unit-tested: serve the
	174	  directory and confirm from the browser console that `LOGIN_ENDPOINT`
	175	  resolves to the local base URL on `localhost` and to production on any
	176	  other host.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260926T083900Z-ef88/home/.cache/hyperpowers/codex-review/e1b05057667f977166850facb3ee7f79812f5572/run-FKADDWPt/approved-design.md

	1	# Approved design context
	2	
	3	## Original request (verbatim)
	4	
	5	"Move the API endpoint config into a new settings module so it's easier to change environments."
	6	
	7	## Repository facts
	8	
	9	- `app.js` (repo root): browser script, loaded by `index.html` via
	10	  `<script src="app.js"></script>`. Contains
	11	  `const API_ENDPOINT = "https://api.example.com/login";`, a stub `login()`
	12	  that performs no request, `validateForm()`, and a submit listener.
	13	- `index.html`: plain HTML with a login form; no bundler, no build step.
	14	- `src/index.js`, `src/utils.js`: unrelated CommonJS Node code
	15	  (`require` / `module.exports`). No API configuration.
	16	- `package.json`: name/version/description/main only. No dependencies,
	17	  no scripts, no `type` field.
	18	- No test runner, linter, or formatter configured. No `node_modules`.
	19	- Branch `feature/webapp-enhancement`, working tree clean.
	20	
	21	## Decisions the user made during brainstorming
	22	
	23	1. Environment selection mechanism — user chose **runtime hostname
	24	   detection** (module holds an environment table, picks by
	25	   `window.location.hostname`). Rejected: deploy-time file swap;
	26	   build-time injection.
	27	2. Module format — user chose **ES modules** (`export`/`import`,
	28	   `<script type="module">`). Rejected: `window.APP_SETTINGS` global.
	29	   The user was told and accepted that this breaks opening `index.html`
	30	   via `file://`.
	31	3. Environment table shape — user chose **local + staging + production,
	32	   with unrecognized hostnames defaulting to production**. Rejected:
	33	   defaulting to local; a local-and-production-only table.
	34	4. Tooling — user chose **unit tests via the built-in `node --test`
	35	   runner** only. Rejected: eslint+prettier; end-to-end tests; adding
	36	   nothing at all.
	37	5. The user approved the in-chat design and asked for the spec to be
	38	   written.
	39	
	40	## Known-unvalidated inputs
	41	
	42	Only the production URL is derivable from existing code. The local API
	43	URL, the staging API URL, and the staging frontend hostname are
	44	placeholders the user has not yet confirmed; the spec records them as
	45	assumptions with a validation method.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
