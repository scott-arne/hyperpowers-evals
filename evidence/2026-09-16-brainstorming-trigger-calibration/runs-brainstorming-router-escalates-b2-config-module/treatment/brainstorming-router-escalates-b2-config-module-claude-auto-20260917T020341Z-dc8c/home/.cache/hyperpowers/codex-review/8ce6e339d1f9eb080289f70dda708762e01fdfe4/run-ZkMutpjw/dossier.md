# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T020341Z-dc8c/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-settings-module-design.md

	1	# Settings Module Design
	2	
	3	Date: 2026-09-16
	4	Status: Awaiting user review
	5	
	6	## Problem
	7	
	8	The login API endpoint is hard-coded as a single constant in `app.js`:
	9	
	10	```js
	11	const API_ENDPOINT = "https://api.example.com/login";
	12	```
	13	
	14	Pointing the app at a different environment means editing application code.
	15	There is no place for environment-varying configuration to live, and no second
	16	endpoint can be added without repeating the host.
	17	
	18	## Goal
	19	
	20	Move the API endpoint configuration out of `app.js` into a dedicated settings
	21	module that resolves the active environment automatically, so switching
	22	environments requires no code edit.
	23	
	24	## Non-Goals
	25	
	26	- Implementing a real network call. `login()` remains a stub.
	27	- Changing anything under `src/`. Those files are CommonJS Node code, unrelated
	28	  to the browser page.
	29	- Adding a bundler, linter, formatter, or test runner. The repository has none
	30	  and this change introduces none.
	31	- Adding a runtime environment override (`?env=`, localStorage). Considered and
	32	  deferred; it is a one-function addition later if wanted.
	33	
	34	## Global Constraints
	35	
	36	- No new dependencies. `package.json` stays dependency-free.
	37	- No new tooling (lint, format, unit tests, e2e). Explicitly chosen during
	38	  design; verification for this change is manual.
	39	- Browser ES modules, no build step.
	40	- Existing code style: two-space indent, double-quoted strings, semicolons.
	41	
	42	## Decisions
	43	
	44	| Decision | Choice | Rationale |
	45	|---|---|---|
	46	| Module format | Browser ES modules | Gives a real module boundary rather than a global with a naming convention. Cost: `file://` loading stops working. |
	47	| Environment selection | `window.location.hostname` lookup | Switching environments costs zero steps and cannot be gotten wrong by forgetting to flip a constant before deploy. |
	48	| URL storage | Per-environment `apiBaseUrl`, endpoints derived | Adding a second endpoint is one new line, not one line per environment. Expensive to reverse once the module has consumers. |
	49	| Unknown-hostname fallback | `dev` | An unlisted host can never reach the production API. The failure is a visibly broken non-prod page rather than a silent credential path to production. |
	50	| Module location | Repository root, beside `app.js` | `src/` holds CommonJS Node modules; placing a browser ESM file there invites a `require()` that cannot work. |
	51	
	52	## Architecture
	53	
	54	One new file, `settings.js`, at the repository root. It owns two tables and one
	55	pure resolution function, and exports a single resolved settings object for
	56	consumers.
	57	
	58	```js
	59	// settings.js
	60	
	61	const ENVIRONMENTS = {
	62	  dev: { apiBaseUrl: "https://api.dev.example.com" },
	63	  staging: { apiBaseUrl: "https://api.staging.example.com" },
	64	  prod: { apiBaseUrl: "https://api.example.com" },
	65	};
	66	
	67	const HOSTNAME_ENVIRONMENTS = {
	68	  localhost: "dev",
	69	  "127.0.0.1": "dev",
	70	  "staging.example.com": "staging",
	71	  "example.com": "prod",
	72	};
	73	
	74	// Unknown hosts fall back to dev so an unlisted deployment can never reach the
	75	// production API.
	76	export function resolveEnvironment(hostname) {
	77	  return HOSTNAME_ENVIRONMENTS[hostname] ?? "dev";
	78	}
	79	
	80	const environment = resolveEnvironment(window.location.hostname);
	81	
	82	export const settings = {
	83	  environment,
	84	  endpoints: {
	85	    login: `${ENVIRONMENTS[environment].apiBaseUrl}/login`,
	86	  },
	87	};
	88	```
	89	
	90	`resolveEnvironment` takes the hostname as a parameter rather than reading
	91	`window` itself. It is therefore a pure function that could be unit-tested
	92	without a DOM if test infrastructure is added later.
	93	
	94	### Components
	95	
	96	- `ENVIRONMENTS` — the per-environment configuration table. The only place a
	97	  base URL appears.
	98	- `HOSTNAME_ENVIRONMENTS` — the hostname-to-environment map. The only place a
	99	  deployment domain appears.
	100	- `resolveEnvironment(hostname)` — pure; hostname in, environment name out.
	101	- `settings` — the resolved, ready-to-use export. The only thing `app.js`
	102	  imports.
	103	
	104	### Data flow
	105	
	106	`window.location.hostname` → `resolveEnvironment` → environment name →
	107	`ENVIRONMENTS[name].apiBaseUrl` → `settings.endpoints.login` → `login()`.
	108	
	109	Resolution happens once at module load. There is no runtime reconfiguration.
	110	
	111	## Changes to Existing Files
	112	
	113	`app.js`
	114	
	115	- Remove the `API_ENDPOINT` constant (line 2).
	116	- Add `import { settings } from "./settings.js";` as the first statement.
	117	- Update the stub in `login()` to reference `settings.endpoints.login` so the
	118	  configuration is genuinely consumed rather than imported and unused.
	119	
	120	`index.html`
	121	
	122	- Line 13: `<script src="app.js"></script>` becomes
	123	  `<script type="module" src="app.js"></script>`.
	124	
	125	No other files change. `src/index.js` and `src/utils.js` are untouched.
	126	
	127	## Assumptions
	128	
	129	- Assumption: the production base URL is `https://api.example.com`, derived
	130	  from the existing `API_ENDPOINT` constant by stripping the `/login` path.
	131	  Validate via user confirmation.
	132	- Assumption: the dev and staging base URLs and the staging/production
	133	  hostnames are placeholders (`api.dev.example.com`,
	134	  `api.staging.example.com`, `staging.example.com`, `example.com`). Validate
	135	  via user confirmation before deployment; the code is correct in shape but the
	136	  values are not yet real.
	137	- Assumption: a `staging` environment is wanted. It was present in the approved
	138	  design and carries one line of cost; drop it if not.
	139	
	140	## Consequences and Risks
	141	
	142	- **`file://` no longer works.** Browsers refuse ES module loads over the
	143	  `file://` scheme, so double-clicking `index.html` will produce a blank page
	144	  with a CORS error in the console. The page must be served over HTTP, e.g.
	145	  `python3 -m http.server 8000`. This is inherent to the ES module decision.
	146	  Mitigation was offered (an npm `serve` script) and declined in favour of
	147	  keeping the change minimal.
	148	- **Placeholder hostnames resolve to `dev`.** Until the real domains are
	149	  filled in, a deployed page will resolve to the dev environment. This is the
	150	  intended safe direction of failure but means the module is not
	151	  deployment-ready until the values are confirmed.
	152	- **No automated verification.** With no test runner, a regression in
	153	  `resolveEnvironment` would only surface in a browser.
	154	
	155	## Testing
	156	
	157	Manual, in a browser, with the page served over HTTP:
	158	
	159	1. Serve the directory (`python3 -m http.server 8000`) and load
	160	   `http://localhost:8000/index.html`. Confirm no console errors — this proves
	161	   the module loads and `type="module"` is correct.
	162	2. Confirm `settings.environment` resolves to `dev` for `localhost`.
	163	3. Submit the form with both fields filled. Confirm the login stub logs the
	164	   resolved endpoint `https://api.dev.example.com/login`.
	165	4. Submit with an empty field. Confirm the validation error path still logs
	166	   `Missing required fields` — this proves the module change did not disturb
	167	   existing behaviour.
	168	5. Confirm `src/index.js` still runs (`node src/index.js` prints
	169	   `Hello, world!`) — this proves the CommonJS side is untouched.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T020341Z-dc8c/home/.cache/hyperpowers/codex-review/8ce6e339d1f9eb080289f70dda708762e01fdfe4/run-ZkMutpjw/adjudications.md

	1	# Approved Design Decisions (user-adjudicated during brainstorming)
	2	
	3	Original user request, verbatim:
	4	
	5	> Move the API endpoint config into a new settings module so it's easier to
	6	> change environments.
	7	
	8	Repository state at design time:
	9	
	10	- `app.js` — plain browser script, no imports/exports, loaded by `index.html`
	11	  via `<script src="app.js">`. Holds `const API_ENDPOINT =
	12	  "https://api.example.com/login"` at line 2, referenced only in a comment
	13	  inside the `login()` stub.
	14	- `src/index.js`, `src/utils.js` — CommonJS Node code, unrelated to the page.
	15	- No bundler, no test runner, no lint/format config. `package.json` has no
	16	  scripts and no dependencies.
	17	
	18	Decisions the user made explicitly (each chosen from presented options with
	19	trade-offs):
	20	
	21	1. **Module format: browser ES modules.** Chosen over a global script and over
	22	   CommonJS-in-`src/`. The user was told, before choosing, that this breaks
	23	   `file://` loading of `index.html`.
	24	2. **Environment selection: hostname detection.** Chosen over a hand-edited
	25	   `ENV` constant and over detection-plus-`?env=`-override.
	26	3. **URL storage: per-environment `apiBaseUrl` with endpoints derived.** Chosen
	27	   over storing a full URL per endpoint per environment.
	28	4. **Unknown-hostname fallback: `dev`.** Chosen over `prod` and over throwing.
	29	   Rationale accepted: an unlisted host must never reach the production API.
	30	5. **Tooling: none.** The user was offered unit tests for `resolveEnvironment`,
	31	   an npm `serve` script, and eslint/prettier, and selected "Nothing — keep it
	32	   minimal." Therefore the absence of automated tests and of a serve script is
	33	   a deliberate, adjudicated decision, not an oversight in the spec.
	34	
	35	Not adjudicated / still open:
	36	
	37	- The real dev, staging, and production hostnames and base URLs. The spec
	38	  carries placeholders marked as assumptions pending user confirmation.
	39	- Whether a `staging` environment is actually wanted. It appeared in the design
	40	  the user approved and is flagged in the spec as droppable.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
