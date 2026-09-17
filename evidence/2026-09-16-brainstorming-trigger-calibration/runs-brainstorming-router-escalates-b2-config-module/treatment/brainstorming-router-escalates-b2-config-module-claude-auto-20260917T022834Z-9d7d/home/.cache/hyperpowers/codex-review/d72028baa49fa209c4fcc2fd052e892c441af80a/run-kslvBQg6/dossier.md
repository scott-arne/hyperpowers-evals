# Review dossier

Gate: plan

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T022834Z-9d7d/coding-agent-workdir/docs/hyperpowers/plans/2026-09-16-api-settings-module.md

	1	# API Settings Module Implementation Plan
	2	
	3	> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
	4	
	5	**Spec:** `docs/hyperpowers/specs/2026-09-16-api-settings-module-design.md`
	6	
	7	**Goal:** Move the hardcoded API endpoint out of `app.js` into a dedicated ES module that resolves the environment from the browser hostname.
	8	
	9	**Architecture:** A new root-level `settings.js` maps `location.hostname` to an environment, exposes a frozen `settings` object carrying `apiBaseUrl` and an `endpoints` map derived from it, and exports the hostname resolver separately so it can be exercised without a browser. `app.js` imports from it and `index.html` switches to `<script type="module">`.
	10	
	11	**Tech Stack:** Plain browser JavaScript, native ES modules, no build step. Node 26 is available for syntax and behavior checks only — it is not a runtime dependency of the app.
	12	
	13	## Global Constraints
	14	
	15	- No new dependencies. `package.json` stays dependency-free.
	16	- No linter, formatter, or test-runner infrastructure is added by this work. This is an explicit decision recorded in the spec, not an oversight.
	17	- `src/index.js` and `src/utils.js` are not modified.
	18	- Style: two-space indentation, double-quoted strings, semicolons.
	19	- Commit messages contain no attribution or `Co-Authored-By` lines.
	20	- Work lands on the current branch, `feature/webapp-enhancement`.
	21	
	22	## Grounding
	23	
	24	- Naming and style: `app.js:1-15` — `camelCase` functions (`login`, `validateForm`), `SCREAMING_SNAKE_CASE` module constant (`API_ENDPOINT` at line 2), two-space indent, double quotes, semicolons.
	25	- Error handling: `app.js:10-15` — `validateForm` returns a result object (`{ valid, error }`) instead of throwing; `app.js:26` reports via `console.error`. The codebase signals failure through returned values and console output, never exceptions.
	26	- Module exports: `src/utils.js:1-5` shows the only existing export pattern, and it is CommonJS (`module.exports = { greet }`) for Node. `none: no existing ES-module pattern in this repository` — `settings.js` introduces the first one, so there is nothing to imitate for `export` syntax.
	27	- Script loading: `index.html:13` — `<script src="app.js"></script>`, a classic script placed after the form markup.
	28	- Test shape: `none: no test runner, no test files, and no test script in package.json`. Verification in this plan is executable Node checks plus a scripted manual browser check, per the spec's Testing section.
	29	
	30	---
	31	
	32	### Task 1: Settings module
	33	
	34	**Risk tier:** standard — introduces a new module whose exported interface later code consumes, and establishes the repository's first ES-module pattern.
	35	
	36	**Files:**
	37	- Create: `settings.js`
	38	
	39	**Interfaces:**
	40	- Consumes: nothing from earlier tasks.
	41	- Produces:
	42	  - `resolveEnvironmentName(hostname: string) => "development" | "production"` — named export, pure.
	43	  - `settings` — named export, frozen object of shape `{ environment: "development" | "production", apiBaseUrl: string, endpoints: { login: string } }`. `endpoints` is frozen as well.
	44	
	45	**Mirror:** `app.js:1-15` — imitate the comment-at-top style, two-space indent, double-quoted strings, semicolons, and the habit of returning plain values rather than throwing.
	46	
	47	- [ ] **Step 1: Create `settings.js` with the complete content below**
	48	
	49	```javascript
	50	// Environment-specific API configuration. The environment is resolved once at
	51	// load from the hostname, so switching environments needs no build step and no
	52	// edit to application code.
	53	
	54	const ENVIRONMENTS = {
	55	  development: { apiBaseUrl: "https://api.dev.example.com" },
	56	  production: { apiBaseUrl: "https://api.example.com" },
	57	};
	58	
	59	const DEV_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);
	60	
	61	// An unrecognized hostname resolves to production. An unknown host is far more
	62	// likely to be a real deployment than an unconfigured dev machine, and pointing
	63	// a real user's login at the development API is the worse of the two failures.
	64	export function resolveEnvironmentName(hostname) {
	65	  return DEV_HOSTNAMES.has(hostname) ? "development" : "production";
	66	}
	67	
	68	const environment = resolveEnvironmentName(window.location.hostname);
	69	const { apiBaseUrl } = ENVIRONMENTS[environment];
	70	
	71	export const settings = Object.freeze({
	72	  environment,
	73	  apiBaseUrl,
	74	  endpoints: Object.freeze({
	75	    login: `${apiBaseUrl}/login`,
	76	  }),
	77	});
	78	```
	79	
	80	- [ ] **Step 2: Verify the file parses as a module**
	81	
	82	Run: `node --check settings.js`
	83	
	84	Expected: exit status 0 with no output. (A syntax error exits 1 and prints the offending line.)
	85	
	86	- [ ] **Step 3: Verify the development branch resolves correctly**
	87	
	88	`settings.js` reads `window.location.hostname` at import time, so Node needs a `window` stub installed before the module is imported. A dynamic `import()` after assigning `globalThis.window` achieves that with no dependencies.
	89	
	90	Run:
	91	
	92	```bash
	93	node --input-type=module -e "globalThis.window = { location: { hostname: 'localhost' } }; const m = await import('./settings.js'); console.log(m.settings.environment, m.settings.apiBaseUrl, m.settings.endpoints.login);"
	94	```
	95	
	96	Expected exactly:
	97	
	98	```
	99	development https://api.dev.example.com https://api.dev.example.com/login
	100	```
	101	
	102	- [ ] **Step 4: Verify the production branch and the unknown-host fallback**
	103	
	104	Run:
	105	
	106	```bash
	107	node --input-type=module -e "globalThis.window = { location: { hostname: 'app.example.com' } }; const m = await import('./settings.js'); console.log(m.settings.environment, m.settings.endpoints.login); console.log(m.resolveEnvironmentName('127.0.0.1'), m.resolveEnvironmentName('[::1]'), m.resolveEnvironmentName('totally-unknown-host'));"
	108	```
	109	
	110	Expected exactly:
	111	
	112	```
	113	production https://api.example.com/login
	114	development development production
	115	```
	116	
	117	The third value on the second line is the fallback: an unrecognized host resolves to `production`.
	118	
	119	- [ ] **Step 5: Verify the settings object is frozen**
	120	
	121	Run:
	122	
	123	```bash
	124	node --input-type=module -e "globalThis.window = { location: { hostname: 'localhost' } }; const m = await import('./settings.js'); try { m.settings.apiBaseUrl = 'mutated'; console.log('no throw'); } catch (e) { console.log('threw:', e.constructor.name); } console.log(m.settings.apiBaseUrl);"
	125	```
	126	
	127	Expected exactly:
	128	
	129	```
	130	threw: TypeError
	131	https://api.dev.example.com
	132	```
	133	
	134	ES modules always run in strict mode, so writing to a frozen property throws rather than failing silently. Both lines matter: the `TypeError` proves the write was rejected, and the unchanged URL proves nothing was mutated. `no throw` on the first line means the `Object.freeze` call is missing.
	135	
	136	- [ ] **Step 6: Commit**
	137	
	138	```bash
	139	git add settings.js
	140	git commit -m "feat: add settings module for environment-specific API config"
	141	```
	142	
	143	---
	144	
	145	### Task 2: Consume settings from the app
	146	
	147	**Risk tier:** standard — multi-file integration that changes how the page loads its script, and a wrong edit breaks the page silently.
	148	
	149	**Files:**
	150	- Modify: `app.js:1-8`
	151	- Modify: `index.html:13`
	152	
	153	**Interfaces:**
	154	- Consumes: the `settings` named export from Task 1 — `settings.endpoints.login` is the property referenced here.
	155	- Produces: nothing later tasks rely on. This is the final task.
	156	
	157	**Mirror:** `index.html:13` — keep the existing two-space indentation and the tag's position after the form markup; only the `type` attribute is added.
	158	
	159	- [ ] **Step 1: Replace the top of `app.js`**
	160	
	161	Replace lines 1-2, which currently read:
	162	
	163	```javascript
	164	// Simple webapp with login form handling
	165	const API_ENDPOINT = "https://api.example.com/login";
	166	```
	167	
	168	with:
	169	
	170	```javascript
	171	// Simple webapp with login form handling
	172	import { settings } from "./settings.js";
	173	```
	174	
	175	The import must keep the `.js` extension: native browser ES modules do not resolve extensionless specifiers.
	176	
	177	- [ ] **Step 2: Update the stub comment inside `login()`**
	178	
	179	In `app.js`, the line that currently reads:
	180	
	181	```javascript
	182	  // Stub: would POST to API_ENDPOINT in real app
	183	```
	184	
	185	becomes:
	186	
	187	```javascript
	188	  // Stub: would POST to settings.endpoints.login in real app
	189	```
	190	
	191	`login()` stays a stub; this task introduces no network call.
	192	
	193	- [ ] **Step 3: Confirm no reference to the old constant survives**
	194	
	195	Run: `grep -rn "API_ENDPOINT" . --exclude-dir=.git --exclude-dir=docs`
	196	
	197	Expected: no output, exit status 1. Any hit is a leftover reference that must be updated before continuing.
	198	
	199	- [ ] **Step 4: Verify `app.js` parses as a module**
	200	
	201	Run: `node --check app.js`
	202	
	203	Expected: exit status 0 with no output. This confirms the `import` statement is syntactically valid. It does not execute the file — `app.js` touches `document` at top level and cannot run under Node.
	204	
	205	- [ ] **Step 5: Switch `index.html` to a module script**
	206	
	207	`index.html:13` currently reads:
	208	
	209	```html
	210	  <script src="app.js"></script>
	211	```
	212	
	213	Change it to:
	214	
	215	```html
	216	  <script type="module" src="app.js"></script>
	217	```
	218	
	219	- [ ] **Step 6: Confirm the script tag changed and nothing else did**
	220	
	221	Run: `git diff --stat index.html`
	222	
	223	Expected: `1 file changed, 1 insertion(+), 1 deletion(-)`.
	224	
	225	- [ ] **Step 7: Verify the page in a browser**
	226	
	227	Module scripts are blocked by CORS over `file://`, so the page must be served over HTTP.
	228	
	229	Start a server: `python3 -m http.server 8000`
	230	
	231	Then open `http://localhost:8000` and, with the browser console open:
	232	
	233	1. Submit the form with both fields empty. Expected: `Validation error: Missing required fields` logged via `console.error`.
	234	2. Fill both fields and submit. Expected: `Logging in: <username>` followed by `Login result: { success: true, user: "<username>" }`.
	235	3. Confirm the console shows no module-resolution or CORS errors.
	236	
	237	Stop the server with Ctrl-C when done.
	238	
	239	If the console reports a bare-specifier or 404 error for `./settings.js`, the import path in Step 1 lost its `.js` extension.
	240	
	241	- [ ] **Step 8: Commit**
	242	
	243	```bash
	244	git add app.js index.html
	245	git commit -m "refactor: read API endpoint from the settings module"
	246	```
	247	
	248	---
	249	
	250	## Assumptions carried into execution
	251	
	252	The spec records three assumptions. None of them gates a task — the values below
	253	were approved as written, so every task can execute as specified. Their deadline
	254	is deployment, not a task boundary, which is why they appear here rather than as
	255	blocking unknowns.
	256	
	257	- **Assumption:** `https://api.dev.example.com` is a placeholder for the real
	258	  development API host. **Validate via** asking the repository owner for the
	259	  actual development host and substituting it in `ENVIRONMENTS.development`,
	260	  **before the first deployment to a real development environment.** Implement
	261	  Task 1 with the placeholder as written; do not guess a different host.
	262	- **Assumption:** `https://api.example.com` is still the correct production base
	263	  URL. **Validate via** confirming with the repository owner that the value
	264	  carried over from `app.js:2` is current, **before the first production
	265	  deployment.**
	266	- **Assumption:** no deployment opens `index.html` over `file://`. **Validate
	267	  via** confirming with the repository owner that the page is always served over
	268	  HTTP. This one has teeth: `type="module"` breaks a `file://` workflow outright,
	269	  and the failure appears as a CORS error in the console.
	270	
	271	## Notes for the implementer
	272	
	273	- `.gitignore` already excludes `docs/hyperpowers`, so the spec and this plan are not committed. Do not `git add` them.
	274	- Step 7 of Task 2 is the only step needing a human at a browser. If you cannot run it, say so plainly in your report and state that browser verification was not performed — do not report it as passed.

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T022834Z-9d7d/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-api-settings-module-design.md

	1	# API Settings Module — Design
	2	
	3	Date: 2026-09-16
	4	Status: Approved (design), pending implementation plan
	5	
	6	## Problem
	7	
	8	The API endpoint is a bare constant in application code:
	9	
	10	```js
	11	// app.js:2
	12	const API_ENDPOINT = "https://api.example.com/login";
	13	```
	14	
	15	Changing environments therefore means editing application logic, and the value
	16	is embedded in the same file as DOM wiring and form validation. There is no
	17	place for a second endpoint to go, and no way to point the app at a development
	18	API without a code edit that must be reverted before shipping.
	19	
	20	## Goal
	21	
	22	Move endpoint configuration into a dedicated settings module so that switching
	23	environments requires no edit to application code, and so that adding a second
	24	endpoint touches one place.
	25	
	26	## Current State
	27	
	28	- `app.js` — browser script holding `API_ENDPOINT`, `login()`, `validateForm()`,
	29	  and the submit handler. `API_ENDPOINT` is currently unreferenced; `login()` is
	30	  a stub that logs and returns a canned success object.
	31	- `index.html:13` — loads `app.js` as a classic `<script>`. No `type="module"`.
	32	- `src/index.js`, `src/utils.js` — CommonJS, Node-side. Never executed in the
	33	  browser and unrelated to the API endpoint.
	34	- `package.json` — no dependencies, no scripts. No bundler, linter, or test
	35	  runner exists in the repository.
	36	
	37	The browser side has no module system at all. That is the reason this is a new
	38	module rather than a moved constant.
	39	
	40	## Decisions
	41	
	42	Each was settled during brainstorming; the rejected alternatives are recorded
	43	because the reasoning matters more than the outcome.
	44	
	45	### Environment selection: hostname detection
	46	
	47	`settings.js` reads `window.location.hostname` at load and resolves the
	48	environment itself.
	49	
	50	- Rejected — injected config script: requires deploy-time placement of a
	51	  per-environment file and a second script tag.
	52	- Rejected — build-time substitution: introduces a bundler and a build step to a
	53	  repository with zero dependencies.
	54	
	55	Consequence: every environment's base URL ships to the browser. Acceptable here
	56	because API base URLs are not secrets. Moving to an injected config script later
	57	is a small, localized edit if that changes.
	58	
	59	### Module style: native ES modules
	60	
	61	`index.html` uses `<script type="module">`; `app.js` imports from `settings.js`.
	62	
	63	- Rejected — global namespace object (`window.AppSettings`): a global with
	64	  silent load-order coupling, and not meaningfully a module.
	65	
	66	Consequence: ES modules are blocked by CORS over `file://`, so the page must be
	67	opened through a local HTTP server (for example `python3 -m http.server`) rather
	68	than by opening the file directly. This is a workflow change, not a code
	69	constraint.
	70	
	71	### Configuration shape: base URL plus derived paths
	72	
	73	Settings expose `apiBaseUrl` and an `endpoints` map built from it.
	74	
	75	- Rejected — full URLs per endpoint: repeats the host across every endpoint in
	76	  every environment, making a host change an N x M edit.
	77	
	78	## Design
	79	
	80	### New file: `settings.js` (repository root)
	81	
	82	Placed beside `app.js`, not in `src/`. `src/` is CommonJS and Node-side; putting
	83	browser ES modules there would mix two module systems in one directory.
	84	
	85	Structure:
	86	
	87	- `ENVIRONMENTS` — map of environment name to `{ apiBaseUrl }`. Two entries:
	88	  `development` and `production`.
	89	- `DEV_HOSTNAMES` — the set of hostnames treated as development:
	90	  `localhost`, `127.0.0.1`, `[::1]`.
	91	- `resolveEnvironmentName(hostname)` — exported pure function returning
	92	  `"development"` when the hostname is in `DEV_HOSTNAMES`, otherwise
	93	  `"production"`. Exported separately so it can be exercised without a browser.
	94	- `settings` — the exported frozen object:
	95	  `{ environment, apiBaseUrl, endpoints: { login } }`, where
	96	  `endpoints.login` is `` `${apiBaseUrl}/login` ``. Frozen with `Object.freeze`
	97	  so callers cannot mutate shared configuration at runtime.
	98	
	99	### Changes to `app.js`
	100	
	101	- Remove `const API_ENDPOINT`.
	102	- Add `import { settings } from "./settings.js";` at the top.
	103	- Update the stub comment in `login()` to reference `settings.endpoints.login`.
	104	
	105	No behavior changes. `login()` remains a stub; this design does not introduce a
	106	network call.
	107	
	108	### Changes to `index.html`
	109	
	110	Line 13 becomes `<script type="module" src="app.js"></script>`.
	111	
	112	Note that module scripts are deferred, so the submit-handler registration in
	113	`app.js` runs after the document is parsed. The current code registers the
	114	handler at top level and relies on the script tag sitting after the form; under
	115	`type="module"` that ordering remains satisfied, so no restructuring is needed.
	116	
	117	### Not in scope
	118	
	119	`src/index.js` and `src/utils.js` are untouched. They do not reference the API
	120	endpoint, and converting them would be unrelated refactoring.
	121	
	122	## Error Handling
	123	
	124	An unrecognized hostname falls back to `production`.
	125	
	126	This is a deliberate asymmetry. An unknown host is far more likely to be a real
	127	deployment than an unconfigured dev machine, and pointing a real user's login at
	128	a development API is the worse of the two failures. The accepted cost is that a
	129	mistyped development hostname degrades silently to production rather than
	130	raising an error.
	131	
	132	`ENVIRONMENTS` lookups cannot miss, because `resolveEnvironmentName` returns only
	133	keys that exist in the map.
	134	
	135	## Testing
	136	
	137	The repository has no test runner and no established testing pattern, and the
	138	decision during brainstorming was not to add one as part of this change.
	139	
	140	Verification is therefore by inspection plus a manual check:
	141	
	142	1. Serve the directory over HTTP and load `index.html`.
	143	2. Confirm the form still submits and logs a validation error when fields are
	144	   empty and a login result when they are filled.
	145	3. Confirm `settings.environment` resolves to `development` when served from
	146	   `localhost`.
	147	
	148	Any report on this work must state plainly that no automated tests were run,
	149	because none exist.
	150	
	151	If a test runner is added later, `resolveEnvironmentName` is the natural first
	152	target: it is pure, takes a string, and returns a string.
	153	
	154	## Assumptions
	155	
	156	- Assumption: `https://api.dev.example.com` is a placeholder for the real
	157	  development API host; validate by confirming the actual host with the
	158	  repository owner and substituting it before this ships.
	159	- Assumption: `https://api.example.com` remains the correct production base URL;
	160	  validate by confirming that the existing `API_ENDPOINT` value is current.
	161	- Assumption: no deployment currently opens `index.html` over `file://`;
	162	  validate by confirming the page is always served over HTTP.
	163	
	164	## Global Constraints
	165	
	166	- No new dependencies. The repository stays zero-dependency.
	167	- No linter, formatter, or test infrastructure is added by this work.
	168	- `src/` is not modified.
	169	- Match existing style: two-space indentation, double-quoted strings, semicolons.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T022834Z-9d7d/home/.cache/hyperpowers/codex-review/d72028baa49fa209c4fcc2fd052e892c441af80a/run-kslvBQg6/adjudications.md

	1	# Plan Review Context
	2	
	3	## Risk Tier Rubric (verbatim — use this to check each task's declared tier)
	4	
	5	Assign every task a risk tier on the line under its heading (rationale
	6	mandatory for `low`):
	7	
	8	- **high** — touches approval-authority code (verdict-normalize,
	9	  gate-round, ungated-ledger, or any script whose output other machinery
	10	  trusts), concurrency/locking, security surfaces, destructive git
	11	  operations, or durable-record writers.
	12	- **standard** — multi-file integration, new scripts, behavior-shaping
	13	  skill/doc surgery, anything not clearly low or high. The default.
	14	- **low** — single-file mechanical transcription where the plan contains
	15	  the complete content to write; doc-reference or typo fixes; test-needle
	16	  additions whose strings appear verbatim in the plan.
	17	
	18	A mis-tiered task is a blocking-eligible finding.
	19	
	20	## Approved design decisions (settled, not open for re-litigation)
	21	
	22	Original request, verbatim: "Move the API endpoint config into a new settings
	23	module so it's easier to change environments."
	24	
	25	1. Environment selection: **hostname detection** (chosen over an injected config
	26	   script and over build-time substitution).
	27	2. Module style: **native ES modules** (chosen over a global namespace object).
	28	3. Configuration shape: **base URL plus derived paths** (chosen over full URLs
	29	   per endpoint).
	30	4. Tooling: **none added**. No linter, no formatter, no test runner. The
	31	   repository stays zero-dependency. This is an explicit decision by the human
	32	   partner, so "the plan adds no tests" is NOT a finding on its own; a finding
	33	   that the plan's chosen verification steps do not actually verify what they
	34	   claim IS in scope.
	35	
	36	Findings that merely prefer one of the already-rejected alternatives are out of
	37	scope. Findings identifying a genuine defect in the chosen design are in scope.
	38	
	39	## Codebase facts
	40	
	41	- `app.js:2` holds `const API_ENDPOINT = "https://api.example.com/login";`, currently unreferenced.
	42	- `app.js` is 29 lines: top comment, the constant, `login()` stub, `validateForm()`, and a top-level submit-handler registration.
	43	- `index.html:13` is `<script src="app.js"></script>`.
	44	- `src/index.js` and `src/utils.js` are CommonJS, Node-side, unrelated to the endpoint.
	45	- `package.json` has no dependencies and no scripts.
	46	- Node 26.8.2 is available on the host for syntax/behavior checks.
	47	
	48	## Verification commands already confirmed working by the plan author
	49	
	50	- `node --check <file.js>` exits 0 on valid ES-module syntax, 1 on a syntax error.
	51	- Stubbing `globalThis.window` before a dynamic `import()` allows `settings.js` to be
	52	  exercised under Node despite its top-level `window.location.hostname` read.
	53	- Writing to the frozen `settings` object throws `TypeError` under ES-module strict mode.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
