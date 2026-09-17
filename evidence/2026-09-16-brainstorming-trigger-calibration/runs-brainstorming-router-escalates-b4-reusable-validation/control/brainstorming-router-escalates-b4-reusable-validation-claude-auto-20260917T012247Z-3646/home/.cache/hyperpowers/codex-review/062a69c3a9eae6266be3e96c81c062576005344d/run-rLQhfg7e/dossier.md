# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T012247Z-3646/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-reusable-form-validation-design.md

	1	# Reusable Form Validation — Design
	2	
	3	Date: 2026-09-16
	4	Status: approved (in-chat design approved; spec pending user review)
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	`app.js` defines `validateForm(formData)` inline. It hardcodes the login form's
	10	two fields and returns a single error string:
	11	
	12	```js
	13	function validateForm(formData) {
	14	  if (!formData.username || !formData.password) {
	15	    return { valid: false, error: "Missing required fields" };
	16	  }
	17	  return { valid: true };
	18	}
	19	```
	20	
	21	Nothing about it can be reused by another form: the field names are baked in,
	22	it lives in the same file as the login submit handler, and it cannot report
	23	which field failed. A second form would copy it and edit the field names.
	24	
	25	## Goal
	26	
	27	Extract validation into a shared module that an arbitrary future form can reuse
	28	by declaring its own rules, without copying logic.
	29	
	30	## Non-goals
	31	
	32	These are deliberately excluded and should not be added while implementing:
	33	
	34	- Error display UI in the page. `index.html` has no element for messages;
	35	  failures continue to go to `console.error`. Adding error UI is a separate
	36	  task.
	37	- A second form. None exists or is planned.
	38	- Validators beyond `required` (no `email`, `minLength`, `pattern`, etc.).
	39	- A DOM binding layer that reads values off a form element automatically.
	40	- Converting `src/index.js` and `src/utils.js` from CommonJS to ES modules.
	41	- Linting or formatting tooling.
	42	
	43	## Context and constraints
	44	
	45	The repository is a six-file webapp. Relevant facts:
	46	
	47	- `app.js` is loaded by `index.html` as a plain `<script>` — no module system.
	48	- `src/utils.js` and `src/index.js` are CommonJS, run by Node, never loaded by
	49	  the browser.
	50	- `package.json` has no `scripts`, no dependencies, and no `"type"` field.
	51	  There is no test runner, linter, formatter, build step, or CI.
	52	- `index.html` contains exactly one form (`login-form`) with inputs carrying
	53	  `id` attributes and no `name` attributes.
	54	
	55	Decisions made with the user during brainstorming:
	56	
	57	1. **No specific second form exists.** The work is general future-proofing, so
	58	   speculative generality is treated as a cost, not a benefit.
	59	2. **ES modules**, native `import`/`export`, no build step. Accepted
	60	   consequence: `index.html` can no longer be opened over `file://` and must be
	61	   served (e.g. `npx serve .`).
	62	3. **Per-field error map** as the result shape, collecting every failing field
	63	   rather than stopping at the first.
	64	4. **Rule table** as the composition strategy, rather than a DOM binding helper
	65	   or bare primitives.
	66	
	67	## Architecture
	68	
	69	Three units with one responsibility each:
	70	
	71	| Unit | Responsibility | Depends on |
	72	|---|---|---|
	73	| `src/validation.mjs` | Evaluate values against rules; return a result. Pure; no DOM. | nothing |
	74	| `app.js` | Read login inputs from the DOM, declare login's rules, report failures. | `src/validation.mjs` |
	75	| `test/validation.test.mjs` | Verify the module's contract. | `src/validation.mjs`, `node:test` |
	76	
	77	The boundary that matters: `src/validation.mjs` never touches the DOM. Each
	78	form reads its own inputs and hands over a plain object. This is what lets the
	79	module be unit-tested in Node and reused by a form whose markup does not exist
	80	yet.
	81	
	82	## The module
	83	
	84	`src/validation.mjs` exports two things.
	85	
	86	**`required(message)`** returns a validator:
	87	
	88	```js
	89	export function required(message) {
	90	  return (value) =>
	91	    value == null || String(value).trim() === "" ? message : null;
	92	}
	93	```
	94	
	95	**`validate(values, rules)`** walks the rules and builds the error map:
	96	
	97	```js
	98	export function validate(values, rules) {
	99	  const errors = {};
	100	  for (const [field, validators] of Object.entries(rules)) {
	101	    for (const check of validators) {
	102	      const message = check(values[field]);
	103	      if (message) {
	104	        errors[field] = message;
	105	        break;
	106	      }
	107	    }
	108	  }
	109	  return { valid: Object.keys(errors).length === 0, errors };
	110	}
	111	```
	112	
	113	### Contracts
	114	
	115	- **Validator:** `(value) => string | null`. Returns the error message on
	116	  failure, `null` on success. This is the extension point — any function of
	117	  this shape composes, so new validators need no change to `validate`.
	118	- **`rules`:** `{ [field]: Validator[] }`. Field order in the object determines
	119	  iteration order; validators within a field run in array order.
	120	- **`values`:** a plain object. Keys not named in `rules` are ignored.
	121	- **Result:** `{ valid: boolean, errors: { [field]: string } }`. `errors` is
	122	  always present — `{}` when valid — so consumers never guard before reading
	123	  it.
	124	
	125	### Behavior decisions
	126	
	127	- **First error per field wins; all fields are collected.** A field displays
	128	  one message at a time, so evaluating further validators for a field that has
	129	  already failed adds nothing. Collecting across fields is the point of the
	130	  error map.
	131	- **`required` trims whitespace.** This is an intentional behavior change:
	132	  today `" "` passes validation because the current code uses a falsy check.
	133	  After this change it fails. Call it out in the implementation summary.
	134	- **A field named in `rules` but absent from `values`** yields `undefined`,
	135	  which `required` rejects. This is correct: a missing field is a missing
	136	  value.
	137	- **An empty `rules` object** produces `{ valid: true, errors: {} }`.
	138	- **No error handling inside `validate`.** Validators are plain functions; a
	139	  custom validator that throws propagates to the caller. Wrapping every call in
	140	  `try`/`catch` would hide bugs in validators for no present benefit.
	141	
	142	## Call site changes
	143	
	144	`app.js` becomes an ES module:
	145	
	146	```js
	147	import { validate, required } from "./src/validation.mjs";
	148	
	149	const loginRules = {
	150	  username: [required("Username is required")],
	151	  password: [required("Password is required")],
	152	};
	153	```
	154	
	155	The submit handler reads the two inputs as it does today, calls
	156	`validate({ username, password }, loginRules)`, and on failure logs one line
	157	per entry in `errors` via `console.error`. `login()` and `API_ENDPOINT` are
	158	unchanged. The old inline `validateForm` is deleted.
	159	
	160	`index.html` changes one line:
	161	
	162	```html
	163	<script type="module" src="app.js"></script>
	164	```
	165	
	166	`README.md` gains one line noting the app must now be served (`npx serve .`)
	167	rather than opened directly, because module scripts are blocked over `file://`.
	168	
	169	## Testing
	170	
	171	`package.json` gains `"scripts": { "test": "node --test" }`. No dependencies —
	172	`node:test` and `node:assert` are built in. The `.mjs` extension carries the
	173	module type, so no `"type"` field is added and the CommonJS files keep working.
	174	
	175	`test/validation.test.mjs` covers the contract:
	176	
	177	| Case | Expected |
	178	|---|---|
	179	| Both fields empty | `valid: false`, both fields in `errors` |
	180	| One field empty | `valid: false`, only that field in `errors` |
	181	| Whitespace-only value | `valid: false` — the trim behavior |
	182	| All fields present | `valid: true`, `errors` is `{}` |
	183	| Key in `values` not named in `rules` | Ignored; does not affect the result |
	184	| Field in `rules` missing from `values` | Treated as empty; error reported |
	185	| Empty `rules` object | `valid: true`, `errors` is `{}` |
	186	| Field with multiple validators, first fails | Only the first message recorded |
	187	
	188	Manual verification: serve the directory, submit the login form empty, and
	189	confirm two console errors naming both fields; submit it filled and confirm the
	190	login result logs.
	191	
	192	## Files touched
	193	
	194	| File | Change |
	195	|---|---|
	196	| `src/validation.mjs` | New — the shared module |
	197	| `test/validation.test.mjs` | New — unit tests |
	198	| `app.js` | Import the module, declare `loginRules`, delete inline `validateForm`, per-field error logging |
	199	| `index.html` | `type="module"` on the script tag |
	200	| `package.json` | Add `scripts.test` |
	201	| `README.md` | One line: serve rather than open directly |
	202	| `.gitignore` | New — ignores `docs/hyperpowers`, `docs/superpowers`, `node_modules/` |
	203	
	204	## Risks
	205	
	206	- **Assumption: the rule-table shape fits the forms that eventually arrive.**
	207	  No second form exists to check it against, so the API is an educated guess.
	208	  Validate via the first real second form: if its needs do not fit, adjust the
	209	  module then rather than widening it now. The module is small enough
	210	  (~25 lines) that this is cheap.
	211	- **`file://` regression.** Anyone opening `index.html` directly will get a
	212	  blank page and a CORS error in the console. Mitigated only by the README
	213	  line; accepted when ES modules were chosen.
	214	- **The whitespace behavior change** could surprise anyone relying on the
	215	  current falsy check. Judged a bug fix, but it is a behavior change and is
	216	  reported as one.
	217	
	218	## Future extension (not now)
	219	
	220	If several forms later prove they all read inputs the same way, a
	221	`validateFormElement(formEl, rules)` binding helper can be added on top of
	222	`validate` without changing the existing API. Deferred because it would require
	223	inventing a markup convention — the current inputs have `id` but no `name` —
	224	against forms that do not exist.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T012247Z-3646/home/.cache/hyperpowers/codex-review/062a69c3a9eae6266be3e96c81c062576005344d/run-8UYoPjkF/approach-context.md

	1	# Approach context
	2	
	3	## Original request (verbatim)
	4	
	5	> Make the form validation reusable across multiple forms.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	**Q: There's only one form in the repo right now (login). What are the other
	10	forms this needs to serve?**
	11	A: Unknown / general future-proofing. No specific second form exists or is
	12	planned yet; the goal is that adding forms later is easy.
	13	
	14	**Q: How should the shared validation module be loaded?**
	15	A: ES modules — native `import`/`export`, no build step. Accepted consequence:
	16	`index.html` can no longer be opened over `file://` and needs a local server.
	17	
	18	**Q: What should the validation result look like?**
	19	A: A per-field error map, `{ valid, errors: { field: message } }`, collecting
	20	every failure rather than stopping at the first. Updating the single existing
	21	call site is accepted.
	22	
	23	## Codebase facts
	24	
	25	Repository: a 6-file fixture webapp. Branch `feature/webapp-enhancement`,
	26	working tree clean.
	27	
	28	### `app.js` (28 lines, loaded by `index.html` as a plain `<script>`)
	29	
	30	```js
	31	// Simple webapp with login form handling
	32	const API_ENDPOINT = "https://api.example.com/login";
	33	
	34	function login(username, password) {
	35	  console.log("Logging in:", username);
	36	  // Stub: would POST to API_ENDPOINT in real app
	37	  return { success: true, user: username };
	38	}
	39	
	40	function validateForm(formData) {
	41	  if (!formData.username || !formData.password) {
	42	    return { valid: false, error: "Missing required fields" };
	43	  }
	44	  return { valid: true };
	45	}
	46	
	47	document.getElementById("login-form").addEventListener("submit", (e) => {
	48	  e.preventDefault();
	49	  const username = document.getElementById("username").value;
	50	  const password = document.getElementById("password").value;
	51	  const validation = validateForm({ username, password });
	52	  if (validation.valid) {
	53	    const result = login(username, password);
	54	    console.log("Login result:", result);
	55	  } else {
	56	    console.error("Validation error:", validation.error);
	57	  }
	58	});
	59	```
	60	
	61	### `index.html` (15 lines) — the only form in the repo
	62	
	63	```html
	64	<!DOCTYPE html>
	65	<html>
	66	<head>
	67	  <title>Simple Webapp</title>
	68	</head>
	69	<body>
	70	  <h1>Login</h1>
	71	  <form id="login-form">
	72	    <input type="text" id="username" placeholder="Username" />
	73	    <input type="password" id="password" placeholder="Password" />
	74	    <button type="submit">Log In</button>
	75	  </form>
	76	  <script src="app.js"></script>
	77	</body>
	78	</html>
	79	```
	80	
	81	There is no element for displaying error messages; failures currently go to
	82	`console.error`.
	83	
	84	### `src/utils.js` and `src/index.js` — CommonJS, unrelated to the page
	85	
	86	```js
	87	// src/utils.js
	88	function greet(name) {
	89	  return `Hello, ${name}!`;
	90	}
	91	module.exports = { greet };
	92	```
	93	
	94	```js
	95	// src/index.js
	96	const { greet } = require('./utils');
	97	function main() {
	98	  console.log(greet('world'));
	99	}
	100	main();
	101	```
	102	
	103	These are run by Node, never loaded by the browser. The repo therefore
	104	currently mixes a plain browser script with CommonJS modules.
	105	
	106	### `package.json` (6 lines)
	107	
	108	```json
	109	{
	110	  "name": "drill-test-project",
	111	  "version": "1.0.0",
	112	  "description": "Test project for Drill scenarios",
	113	  "main": "src/index.js"
	114	}
	115	```
	116	
	117	No `scripts`, no `dependencies`, no `devDependencies`, no `"type"` field. There
	118	is no test runner, no linter, no formatter, and no build step configured
	119	anywhere in the repo. No CI configuration exists.
	120	
	121	## What to propose approaches for
	122	
	123	Given the constraints above (ES modules; per-field error map; one existing
	124	login form; no known second form), propose approaches for how validation rules
	125	are declared and composed so that an arbitrary future form can reuse the
	126	module — i.e. the data model and API shape of the shared validation layer, and
	127	how a form's DOM fields are bound to it.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
