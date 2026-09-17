# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T014026Z-5755/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-settings-module-design.md

	1	# Settings Module Design
	2	
	3	Date: 2026-09-16
	4	Status: Approved (design), pending implementation
	5	
	6	## Problem
	7	
	8	The login API endpoint is a bare constant at the top of `app.js`:
	9	
	10	```js
	11	const API_ENDPOINT = "https://api.example.com/login";
	12	```
	13	
	14	Changing environments means editing a production URL in the middle of
	15	application logic. There is no record of what the other environments are, no
	16	way to tell which one is active, and nothing stops a development URL from
	17	being committed and shipped.
	18	
	19	## Goal
	20	
	21	Move API endpoint configuration into a dedicated settings module so that
	22	switching environments is a deliberate, visible, single-place operation —
	23	and so that the common cases require no edit at all.
	24	
	25	## Non-goals
	26	
	27	- Implementing a real `fetch` call. `login()` remains a stub.
	28	- Sharing configuration with the `src/` CommonJS tree.
	29	- Secrets handling. Only public base URLs live here.
	30	- Test, lint, or format tooling. The repository has none today and this
	31	  change does not add any.
	32	
	33	## Constraints
	34	
	35	- No build step, no bundler, no dependencies. `package.json` lists none and
	36	  this change adds none.
	37	- `index.html` must keep working when opened directly from disk over
	38	  `file://`.
	39	- `app.js` is a classic script, not a module. The `src/` tree is CommonJS.
	40	  These two conventions stay separate.
	41	
	42	## Decisions
	43	
	44	Each of these was chosen over the named alternative during design.
	45	
	46	| Decision | Chosen | Over |
	47	|---|---|---|
	48	| Load mechanism | Second `<script>` tag exposing a global | ES modules (breaks `file://`), CommonJS (unreachable from the page), build-step injection (first dependency) |
	49	| Environment selection | Environment map, hostname-resolved, with an explicit override constant | Manual-only constant, flat single config, hostname detection with no override |
	50	| Per-environment value | `apiBaseUrl`, paths composed at the call site | Full endpoint URL per environment, base URL plus a named-endpoints map |
	51	| Tooling | None | `node --test` for the resolver, full eslint/prettier setup |
	52	
	53	Rationale for the two that carry the most weight:
	54	
	55	**Script-tag global.** It matches how `app.js` already loads, keeps `file://`
	56	working, and adds no tooling. ES modules would be the better choice only if
	57	the page and `src/` were going to share code; they are not, and retrofitting
	58	modules later is cheap.
	59	
	60	**Base URL rather than full endpoint URL.** Adding a second endpoint then
	61	costs one line at a call site instead of a new key in every environment
	62	entry, which is where per-environment config normally drifts.
	63	
	64	## Architecture
	65	
	66	New file `settings.js` at the repository root, sibling to `app.js`. It is
	67	deliberately not under `src/`: that tree is CommonJS and unrelated to the
	68	page, and placing a browser global there would blur two conventions that are
	69	currently cleanly separated.
	70	
	71	`index.html` loads it before `app.js`. That ordering is the dependency
	72	contract and carries a comment saying so.
	73	
	74	```html
	75	<!-- settings.js must load before app.js: it defines window.APP_CONFIG. -->
	76	<script src="settings.js"></script>
	77	<script src="app.js"></script>
	78	```
	79	
	80	### Data flow
	81	
	82	1. The browser loads `settings.js`.
	83	2. `settings.js` resolves the active environment name, either from
	84	   `FORCED_ENVIRONMENT` or from `location.hostname`.
	85	3. It publishes a frozen `window.APP_CONFIG` of the shape
	86	   `{ environment: string, apiBaseUrl: string }`.
	87	4. The browser loads `app.js`, which reads `window.APP_CONFIG` when `login()`
	88	   runs.
	89	
	90	## Module contents
	91	
	92	```js
	93	const ENVIRONMENTS = {
	94	  development: { apiBaseUrl: "http://localhost:3000" },
	95	  staging:     { apiBaseUrl: "https://staging-api.example.com" },
	96	  production:  { apiBaseUrl: "https://api.example.com" },
	97	};
	98	
	99	// Set to an environment name to force it; null resolves from the hostname.
	100	const FORCED_ENVIRONMENT = null;
	101	```
	102	
	103	Assumption: the `development` and `staging` base URLs above are placeholders.
	104	Only the production URL existed in the original code. Validate by confirming
	105	the real development and staging hosts with the project owner before these
	106	values are relied on.
	107	
	108	### Environment resolution
	109	
	110	`resolveEnvironment(hostname)` applies these rules in order:
	111	
	112	1. Empty string (the `file://` case), `localhost`, `127.0.0.1`, or `[::1]`
	113	   resolve to `development`.
	114	2. A hostname beginning with `staging.` resolves to `staging`.
	115	3. Anything else resolves to `production`.
	116	
	117	Production is the fallback rather than a special case, so a host nobody
	118	anticipated gets the safe, real endpoint instead of pointing at a machine
	119	that does not exist.
	120	
	121	`FORCED_ENVIRONMENT`, when non-null, takes precedence over all of the above.
	122	
	123	`window.APP_CONFIG` is frozen with `Object.freeze` so that configuration
	124	cannot be mutated at runtime from elsewhere in the page.
	125	
	126	## Error handling
	127	
	128	Both failure modes are loud rather than silent.
	129	
	130	- **Unknown forced environment.** If `FORCED_ENVIRONMENT` is set to a name
	131	  absent from `ENVIRONMENTS`, `settings.js` throws at load time, before
	132	  `app.js` runs. A misspelled environment name silently falling through to
	133	  production is exactly the failure this module exists to prevent.
	134	- **Missing configuration.** `app.js` throws a clearly worded error if
	135	  `window.APP_CONFIG` is absent, so a wrong script order in `index.html`
	136	  reports the real cause instead of producing a request to
	137	  `undefined/login`.
	138	
	139	## Changes to `app.js`
	140	
	141	- Remove the `API_ENDPOINT` constant.
	142	- Add `const LOGIN_PATH = "/login";` at the top of the file.
	143	- `login()` composes `` `${window.APP_CONFIG.apiBaseUrl}${LOGIN_PATH}` `` and
	144	  logs it, then returns the existing stub result.
	145	
	146	The stub stays a stub. It references the resolved URL rather than mentioning
	147	it in a comment, so the configuration is genuinely wired in and observable
	148	rather than decorative, but no network call is introduced.
	149	
	150	## Verification
	151	
	152	No automated tests; the repository has no test infrastructure and this change
	153	does not add any. Manual verification:
	154	
	155	1. Open `index.html` from disk. `window.APP_CONFIG.environment` is
	156	   `development` and `apiBaseUrl` is `http://localhost:3000`.
	157	2. Submit the form with a username and password. The console logs the
	158	   composed URL `http://localhost:3000/login`.
	159	3. Temporarily set `FORCED_ENVIRONMENT = "production"` and reload. The
	160	   composed URL becomes `https://api.example.com/login`. Restore to `null`.
	161	4. Temporarily set `FORCED_ENVIRONMENT = "typo"` and reload. The page throws
	162	   at load with a message naming the unknown environment. Restore to `null`.
	163	5. Remove the `settings.js` script tag and submit. The page throws the named
	164	   missing-configuration error rather than composing `undefined/login`.
	165	   Restore the tag.
	166	
	167	## Files touched
	168	
	169	| File | Change |
	170	|---|---|
	171	| `settings.js` | New. Environment map, override constant, resolver, frozen `window.APP_CONFIG`. |
	172	| `index.html` | One script tag plus the ordering comment. |
	173	| `app.js` | Drop `API_ENDPOINT`, add `LOGIN_PATH`, read `window.APP_CONFIG` in `login()`. |
	174	
	175	## Risks
	176	
	177	The environment map is the only substantive artifact here, and two of its
	178	three entries are placeholder values. If those are wrong, the result is
	179	tidier than the original but no more useful. Confirming the real development
	180	and staging hosts is the highest-value check before or immediately after
	181	implementation.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T014026Z-5755/home/.cache/hyperpowers/codex-review/aa08e2f6797dd7b97e0dd546093631c57e546a78/run-cqubmiKM/approved-decisions.md

	1	# Approved design decisions (brainstorming, 2026-09-16)
	2	
	3	Original user request, verbatim:
	4	
	5	> Move the API endpoint config into a new settings module so it's easier to
	6	> change environments.
	7	
	8	Repository state at design time: a fixture webapp. `app.js` is a classic
	9	browser script loaded by `index.html` via `<script src="app.js">`, holding
	10	`const API_ENDPOINT = "https://api.example.com/login"`. `src/index.js` and
	11	`src/utils.js` are CommonJS and unrelated to the page. `package.json` has no
	12	dependencies and no scripts. There is no test runner, linter, or formatter.
	13	
	14	The following four decisions were each presented to the user with
	15	alternatives and trade-offs, and the user selected the recommended option in
	16	every case. The user then approved the full design in chat with "looks good,
	17	go ahead".
	18	
	19	1. **Load mechanism — script-tag global.** `settings.js` loaded by a second
	20	   `<script>` tag before `app.js`, exposing `window.APP_CONFIG`.
	21	   Rejected: ES modules (breaks opening `index.html` over `file://`),
	22	   CommonJS under `src/` (unreachable from the browser page today),
	23	   build-step env injection (would add the repo's first dependency).
	24	
	25	2. **Environment selection — map plus hostname default.** An `ENVIRONMENTS`
	26	   map, active environment resolved from `location.hostname`, with an
	27	   explicit `FORCED_ENVIRONMENT` constant to override.
	28	   Rejected: manual-only constant, single flat config, hostname detection
	29	   with no override.
	30	
	31	3. **Per-environment value — base URL.** Each environment stores
	32	   `apiBaseUrl`; the `/login` path is composed at the call site in `app.js`.
	33	   Rejected: full endpoint URL per environment, base URL plus a named
	34	   endpoints map (YAGNI at one endpoint).
	35	
	36	4. **Tooling — none this round.** No test runner, linter, or formatter is
	37	   added. The user was explicitly offered `node --test` coverage of the
	38	   resolver and a full eslint/prettier setup, and declined both; verification
	39	   is manual. Absence of automated tests is therefore an accepted,
	40	   deliberate scope decision, not an oversight.
	41	
	42	Accepted scope boundaries (explicitly out of scope, not omissions):
	43	implementing a real `fetch`, sharing config with the `src/` CommonJS tree,
	44	secrets handling, and any tooling.
	45	
	46	Known open item carried deliberately: the `development` and `staging` base
	47	URLs in the spec are placeholders. Only the production URL existed in the
	48	original source. This is recorded in the spec as an Assumption with a
	49	validation method and flagged to the user in chat.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
