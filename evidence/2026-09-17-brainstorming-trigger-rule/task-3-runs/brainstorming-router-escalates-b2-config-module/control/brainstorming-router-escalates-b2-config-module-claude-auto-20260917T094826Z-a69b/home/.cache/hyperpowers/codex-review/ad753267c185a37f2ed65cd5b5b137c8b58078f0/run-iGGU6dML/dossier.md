# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T094826Z-a69b/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-settings-module-design.md

	1	# Settings Module Design
	2	
	3	Date: 2026-09-17
	4	Status: approved (design), pending implementation plan
	5	
	6	## Problem
	7	
	8	The login API endpoint is a hardcoded constant in `app.js`:
	9	
	10	```js
	11	const API_ENDPOINT = "https://api.example.com/login";
	12	```
	13	
	14	Pointing the app at a different environment means editing application
	15	logic. There is no place for environment-varying values to live, so every
	16	future configurable value would repeat the same problem.
	17	
	18	## Goals
	19	
	20	- Move the API endpoint out of `app.js` into a dedicated settings module.
	21	- Make switching environments a property of where the app is served from,
	22	  not a source edit at the call site.
	23	- Give future configuration values an obvious home.
	24	
	25	## Non-Goals
	26	
	27	- Test infrastructure. The repository has none today; standing up a runner
	28	  and a DOM shim would exceed the size of this change. See Testing.
	29	- Linting and formatting tooling. Adding it now would reformat unrelated
	30	  files and obscure the change.
	31	- Configuration for the Node code under `src/`. Nothing there touches the
	32	  API.
	33	- A build step, bundler, or deploy-time file substitution.
	34	
	35	## Constraints
	36	
	37	These are properties of the existing repository, not choices made here:
	38	
	39	- `app.js` is a plain browser script loaded by `index.html` via
	40	  `<script src="app.js">`. There is no `type="module"`, no bundler, and no
	41	  dependencies in `package.json`.
	42	- `src/index.js` and `src/utils.js` are CommonJS Node code with no import
	43	  relationship to `app.js`.
	44	- There is no build or deploy pipeline to hang a file-swap step on.
	45	
	46	Because there is no build step, the environment can only be resolved at
	47	load time in the browser.
	48	
	49	## Design
	50	
	51	### New file: `config.js`
	52	
	53	Lives at the repository root, as a sibling to `app.js`, matching where the
	54	browser-facing code already sits.
	55	
	56	It contains three things:
	57	
	58	**1. An environment table.**
	59	
	60	```js
	61	const ENVIRONMENTS = {
	62	  development: { apiBaseUrl: "http://localhost:3000" },
	63	  staging:     { apiBaseUrl: "https://staging-api.example.com" },
	64	  production:  { apiBaseUrl: "https://api.example.com" },
	65	};
	66	```
	67	
	68	The production value preserves the host currently hardcoded in `app.js`.
	69	The development and staging hosts are placeholders; no real values for
	70	those environments exist yet.
	71	
	72	**2. A hostname detector.** `detectEnvironment()` reads `location.hostname`
	73	and returns an environment name:
	74	
	75	| `location.hostname`                  | Environment   |
	76	|--------------------------------------|---------------|
	77	| `localhost`, `127.0.0.1`, `""`       | `development` |
	78	| begins with `staging.`               | `staging`     |
	79	| anything else                        | `production`  |
	80	
	81	The empty-string case covers opening `index.html` directly over `file://`,
	82	which is the likely local workflow given there is no dev server.
	83	
	84	**3. The published result.** The module assigns a resolved object to the
	85	global:
	86	
	87	```js
	88	window.AppConfig = {
	89	  environment,   // e.g. "development"
	90	  apiBaseUrl,    // e.g. "http://localhost:3000"
	91	};
	92	```
	93	
	94	It publishes the resolved configuration rather than the whole table so
	95	callers cannot reach into an environment other than the active one.
	96	`environment` is exposed because it makes the active selection inspectable
	97	from the browser console, which is how this change is verified.
	98	
	99	### `index.html`
	100	
	101	Gains one tag, immediately before the existing `app.js` tag:
	102	
	103	```html
	104	<script src="config.js"></script>
	105	<script src="app.js"></script>
	106	```
	107	
	108	Plain scripts execute in document order, so this ordering is what
	109	guarantees `window.AppConfig` exists before `app.js` runs. No other
	110	mechanism is needed.
	111	
	112	### `app.js`
	113	
	114	- The `API_ENDPOINT` constant is removed.
	115	- `login()` composes its URL from `window.AppConfig.apiBaseUrl + "/login"`
	116	  **at call time**, not at module load time. Today both are equivalent;
	117	  reading at call time avoids baking in a stale value if configuration is
	118	  ever assigned later.
	119	- No other behavior changes. `validateForm()` and the submit handler are
	120	  untouched.
	121	
	122	## Data Flow
	123	
	124	1. The browser parses `index.html` and executes `config.js`.
	125	2. `config.js` reads `location.hostname`, resolves an environment, and
	126	   assigns `window.AppConfig`.
	127	3. The browser executes `app.js`, which registers the submit handler.
	128	4. On submit, `login()` reads `window.AppConfig.apiBaseUrl` and composes
	129	   the login URL.
	130	
	131	## Error Handling
	132	
	133	**Unknown hostnames resolve to `production`.** This follows from the
	134	chosen detection rules. The accepted risk, stated explicitly: a new deploy
	135	target that is not added to the detector will silently talk to the
	136	production API rather than failing loudly. The alternative — throwing on
	137	an unrecognized host — was rejected because it breaks any host not
	138	enumerated in advance.
	139	
	140	**A missing `AppConfig` fails loudly.** If `config.js` fails to load,
	141	`login()` throws an error naming the problem (`AppConfig not loaded`)
	142	rather than composing `undefined/login` and surfacing a confusing failure
	143	later, at request time.
	144	
	145	## Testing
	146	
	147	Verification is manual. The browser is the only runtime for this code, and
	148	the repository has no test infrastructure.
	149	
	150	Choosing a browser-only module with no UMD wrapper is what makes automated
	151	testing expensive here: `config.js` assigns to `window` as a load-time side
	152	effect, so Node cannot `require` it and call `detectEnvironment()` directly.
	153	Automated coverage would require either jsdom plus a runner, or loading the
	154	file into a `node:vm` sandbox with a fabricated `window` and `location`.
	155	That was judged disproportionate to a change of roughly twenty lines.
	156	
	157	Manual verification steps:
	158	
	159	1. Open `index.html` directly (`file://`). Confirm in the console that
	160	   `window.AppConfig.environment` is `development` and `apiBaseUrl` is
	161	   `http://localhost:3000`.
	162	2. Submit the login form. Confirm the logged result reflects the composed
	163	   URL built from that base.
	164	3. Serve the page from a non-localhost, non-`staging.` host and confirm the
	165	   environment resolves to `production`.
	166	
	167	If a test suite is wanted later, it deserves its own task where the harness
	168	is the goal rather than a side effect of a config move.
	169	
	170	## Future Extension
	171	
	172	Both alternatives considered and set aside remain strictly additive on top
	173	of this design, so neither is foreclosed:
	174	
	175	- A deploy-time swap of `config.js` for a per-environment copy.
	176	- A `window.APP_CONFIG` override hook read in preference to the baked-in
	177	  table.
	178	
	179	Adding an environment today means adding a row to `ENVIRONMENTS` and a rule
	180	to `detectEnvironment()`.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b2-config-module-claude-auto-20260917T094826Z-a69b/home/.cache/hyperpowers/codex-review/ad753267c185a37f2ed65cd5b5b137c8b58078f0/run-iGGU6dML/adjudications.md

	1	# Approved design decisions (from brainstorming, 2026-09-17)
	2	
	3	Original user request: "Move the API endpoint config into a new settings
	4	module so it's easier to change environments."
	5	
	6	Each item below was presented as an explicit fork with trade-offs and chosen
	7	by the human partner. These are settled decisions, not open questions. Do not
	8	re-litigate them; review the spec for defects *given* these choices.
	9	
	10	1. **Environment selection: hostname-based switch.**
	11	   Chosen over (a) a per-environment file swapped at deploy time and (b) a
	12	   `window.APP_CONFIG` global override hook. Rationale accepted: the repo has
	13	   no deploy pipeline to hang a file swap on, and the override hook is
	14	   machinery for a need that does not exist yet. Both alternatives remain
	15	   additive on top of the chosen design.
	16	
	17	2. **Scope: browser-only.**
	18	   Chosen over a UMD-wrapped module shared with the CommonJS code under
	19	   `src/`. Rationale accepted: nothing in `src/` touches the API, and the
	20	   wrapper is boilerplate for a consumer that does not exist.
	21	
	22	3. **Config shape: base URL + composed paths.**
	23	   Chosen over full per-endpoint URLs. Rationale accepted: the base URL is
	24	   what actually varies per environment; paths do not.
	25	
	26	4. **Environments: development / staging / production.**
	27	   Chosen over dev+prod only, or production only. The human partner
	28	   explicitly accepted placeholder hosts for development
	29	   (`http://localhost:3000`) and staging (`https://staging-api.example.com`);
	30	   production preserves the value currently hardcoded in `app.js`
	31	   (`https://api.example.com`).
	32	
	33	5. **Testing: manual verification only; no test infrastructure added.**
	34	   Chosen over a zero-dependency `node:vm` test and over a full vitest+jsdom
	35	   harness. Rationale accepted: the repository has no test infrastructure at
	36	   all today, and a harness plus DOM shim would exceed the size of the change.
	37	
	38	6. **Tooling: no linting or formatting introduced in this change.**
	39	   Chosen over adding eslint+prettier. Rationale accepted: it would reformat
	40	   unrelated files and obscure the change.
	41	
	42	Two behavioral decisions were also presented and explicitly approved:
	43	
	44	- Unknown hostnames resolve to `production`, with the risk named: a new
	45	  deploy target not added to the detector talks to the production API rather
	46	  than failing loudly.
	47	- A missing `window.AppConfig` causes `login()` to throw a named error rather
	48	  than composing `undefined/login`.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
