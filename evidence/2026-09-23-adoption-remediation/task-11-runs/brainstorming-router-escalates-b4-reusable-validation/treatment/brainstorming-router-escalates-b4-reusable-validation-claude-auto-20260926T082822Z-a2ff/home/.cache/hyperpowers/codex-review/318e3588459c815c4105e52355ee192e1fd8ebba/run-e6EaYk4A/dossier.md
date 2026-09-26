# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260926T082822Z-a2ff/coding-agent-workdir/docs/hyperpowers/specs/2026-09-26-reusable-form-validation-design.md

	1	# Reusable Form Validation — Design
	2	
	3	Date: 2026-09-26
	4	Status: Approved design, pending spec review
	5	
	6	## Problem
	7	
	8	Validation currently lives in `app.js` as `validateForm(formData)`, hardcoded to
	9	the login form's two fields and returning a single flat error string. The
	10	submit listener separately reads field values by element id and reports failures
	11	with `console.error`. A second form cannot reuse any of this: the rules, the
	12	field list, and the error shape are all specific to login.
	13	
	14	The goal is a validation module that any form in this app can use, without that
	15	module dictating how a form displays its errors.
	16	
	17	## Scope
	18	
	19	In scope:
	20	
	21	- A new `src/validation.js` providing rules, a `validate` entry point, and a
	22	  helper that reads values out of a `<form>` element.
	23	- Converting the existing login form to use it.
	24	- Unit tests for the module.
	25	
	26	Out of scope:
	27	
	28	- Error display. Each form decides how to surface messages; the login form
	29	  keeps logging to the console, as it does today.
	30	- Submit interception and form wiring. Forms keep their own listeners.
	31	- Converting `src/utils.js` or `src/index.js` to a different module style.
	32	- Linting and formatting configuration.
	33	- Any second form. This work makes reuse possible; it does not add consumers.
	34	
	35	## Global Constraints
	36	
	37	- **Zero runtime dependencies.** `package.json` currently declares none, and
	38	  this work adds none.
	39	- **Test infrastructure: `node:test`**, Node's built-in runner. `package.json`
	40	  gains `"scripts": { "test": "node --test" }`. No test framework dependency.
	41	- **`index.html` must remain openable as a `file://` URL.** This rules out ES
	42	  module scripts, which are CORS-restricted under `file://`.
	43	- **No linter or formatter** is introduced; unrelated files are not reformatted.
	44	
	45	## Architecture
	46	
	47	### Module style
	48	
	49	`src/validation.js` is a classic script that ends with a dual export:
	50	
	51	```js
	52	if (typeof module !== "undefined" && module.exports) {
	53	  module.exports = { required, validate, readFormValues };
	54	} else {
	55	  window.FormValidation = { required, validate, readFormValues };
	56	}
	57	```
	58	
	59	This is the only style that satisfies two constraints at once: the browser loads
	60	it as a plain `<script>` with no dev server, and Node imports it directly so the
	61	module can be unit-tested without a DOM library.
	62	
	63	`src/utils.js` already uses CommonJS, so the Node half of this is consistent with
	64	existing repo style. `app.js` already relies on globals, so the browser half is
	65	consistent with that.
	66	
	67	### Public interface
	68	
	69	```js
	70	required(message?)        // -> (value, allValues) => string | null
	71	validate(values, schema)  // -> { valid: boolean, errors: { field: message } }
	72	readFormValues(formEl)    // -> { fieldName: value }
	73	```
	74	
	75	**Rule contract.** A rule is a function `(value, allValues) => string | null`.
	76	It returns `null` when the value passes and an error message when it fails. The
	77	`allValues` argument exists so cross-field rules (confirm-password, date ranges)
	78	are possible later without an interface change.
	79	
	80	Because the contract is just a function, a one-off rule is written inline at the
	81	call site and needs no module change:
	82	
	83	```js
	84	const schema = {
	85	  username: [required("Username is required")],
	86	  password: [required(), (v) => (v.length < 8 ? "Too short" : null)],
	87	};
	88	```
	89	
	90	**`required(message?)`** returns a rule that fails when the value is absent,
	91	empty, or whitespace-only — a string value is trimmed before the emptiness
	92	check, so `"   "` fails. This is a deliberate behavior change from the current
	93	`validateForm`, which accepts a space-only username. `message` defaults to
	94	`"This field is required"`.
	95	
	96	Trimming applies only to the check. Validation never mutates the `values`
	97	object, so the form submits whatever the user actually typed; if a form wants
	98	trimmed input it trims at its own call site.
	99	
	100	Non-string values (`undefined`, `null`, and any future non-text control) are
	101	tested for emptiness without trimming, so `required` never throws on a value
	102	that has no `trim` method.
	103	
	104	**`validate(values, schema)`** iterates the schema's fields. For each field it
	105	runs that field's rules in order and records the **first** failure only, so one
	106	field never accumulates multiple messages. It does not stop at the first failing
	107	field — every failing field appears in `errors`, which is what allows a form to
	108	mark all bad inputs in a single pass. `valid` is `true` exactly when `errors`
	109	has no keys. A field named in the schema but missing from `values` is validated
	110	as `undefined`, so `required` fails it rather than the field being skipped.
	111	
	112	**`readFormValues(formEl)`** collects `input`, `select`, and `textarea`
	113	descendants of the form and returns an object keyed by each control's `name`,
	114	falling back to its `id` when `name` is absent. The fallback exists so markup
	115	that predates this change keeps working. Controls with neither `name` nor `id`
	116	are skipped.
	117	
	118	### Rule set
	119	
	120	Version one ships `required` and nothing else. Built-ins such as `minLength`,
	121	`email`, and `pattern` are each a few lines and are added when a form actually
	122	needs one; the custom-function escape hatch means no form is ever blocked
	123	waiting for a built-in. Shipping a speculative rule library is how a reusable
	124	module accumulates rules nobody calls.
	125	
	126	## Data flow
	127	
	128	1. The form's submit listener calls `readFormValues(formEl)` to get a plain
	129	   values object.
	130	2. It passes those values and its own schema to `validate`.
	131	3. On `valid: false` it does whatever that form does with `errors` — for the
	132	   login form, one `console.error`.
	133	4. On `valid: true` it proceeds with submission.
	134	
	135	The module never touches the DOM except to read values, and never renders.
	136	
	137	## Changes to existing files
	138	
	139	### `app.js`
	140	
	141	`validateForm` is deleted. Nothing else in the repo references it —
	142	`src/index.js` and `src/utils.js` do not. The submit listener becomes:
	143	
	144	```js
	145	const loginSchema = { username: [required()], password: [required()] };
	146	
	147	document.getElementById("login-form").addEventListener("submit", (e) => {
	148	  e.preventDefault();
	149	  const form = e.currentTarget;
	150	  const values = readFormValues(form);
	151	  const { valid, errors } = validate(values, loginSchema);
	152	  if (!valid) {
	153	    console.error("Validation errors:", errors);
	154	    return;
	155	  }
	156	  console.log("Login result:", login(values.username, values.password));
	157	});
	158	```
	159	
	160	`login()` and `API_ENDPOINT` are untouched.
	161	
	162	### `index.html`
	163	
	164	- Add `name="username"` and `name="password"` to the two inputs, so the form is
	165	  standards-correct and `readFormValues` keys on `name` rather than the `id`
	166	  fallback.
	167	- Add `<script src="src/validation.js"></script>` before the existing
	168	  `<script src="app.js"></script>`, so `required`/`validate`/`readFormValues`
	169	  exist as globals when `app.js` runs.
	170	
	171	### `package.json`
	172	
	173	Add `"scripts": { "test": "node --test" }`.
	174	
	175	## Behavior changes
	176	
	177	These are intended and were approved:
	178	
	179	| Before | After |
	180	|---|---|
	181	| One flat `error` string | Per-field `errors` object |
	182	| `"   "` passes as a username | Whitespace-only fails `required` |
	183	| Console shows `"Missing required fields"` | Console names the failing fields |
	184	
	185	Unchanged: an empty username or password still blocks the `login()` call, and
	186	failures still go to the console rather than the page.
	187	
	188	## Testing
	189	
	190	`test/validation.test.js`, run with `node --test`:
	191	
	192	- `required` fails on `undefined`, `""`, and `"   "`; passes on `"a"`.
	193	- `required` uses the custom message when given one, the default otherwise.
	194	- `validate` returns `valid: true` and empty `errors` when all rules pass.
	195	- `validate` reports every failing field at once, not just the first.
	196	- `validate` keeps only the first failure per field when a field has two
	197	  failing rules.
	198	- `validate` fails a schema field that is absent from `values`.
	199	- A custom function rule is honored, and receives `allValues` as its second
	200	  argument.
	201	- `readFormValues` prefers `name` over `id`, falls back to `id`, and skips
	202	  controls with neither.
	203	
	204	`readFormValues` is tested against a small hand-rolled fake exposing
	205	`querySelectorAll`, rather than a DOM library. The function's only DOM
	206	dependency is that one call, so the fake stays a few lines and the repo keeps
	207	zero dependencies.
	208	
	209	The login form's wiring in `app.js` is not unit-tested — it is DOM event glue
	210	with no logic left in it once validation moves out. It is verified by opening
	211	`index.html` and submitting the form empty, then with values.
	212	
	213	## Error handling
	214	
	215	- `validate` with a schema field whose rule list is empty treats the field as
	216	  passing.
	217	- A rule that throws is not caught; a throwing rule is a programming error and
	218	  should surface loudly rather than silently mark a field valid.
	219	- `readFormValues` on a form with no controls returns `{}`, and `validate` then
	220	  fails every `required` field — the correct outcome.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260926T082822Z-a2ff/home/.cache/hyperpowers/codex-review/318e3588459c815c4105e52355ee192e1fd8ebba/run-e6EaYk4A/approved-design.md

	1	# Approved design context — reusable form validation
	2	
	3	Original user request, verbatim: "Make the form validation reusable across
	4	multiple forms."
	5	
	6	Repository state at brainstorming time (4 source files, no dependencies, no
	7	test runner, no bundler, no linter):
	8	
	9	- `index.html` — one form, `#login-form`, with `<input id="username">` and
	10	  `<input type="password" id="password">`; loads `app.js` as a classic script.
	11	- `app.js` — classic script (browser globals). Holds `API_ENDPOINT`, a stubbed
	12	  `login(username, password)`, `validateForm(formData)` hardcoded to username
	13	  and password returning `{valid, error}`, and an inline submit listener that
	14	  reads values by element id and reports failures with `console.error`.
	15	- `src/index.js`, `src/utils.js` — CommonJS, Node-only, unrelated to the page.
	16	  Nothing in them references `validateForm`.
	17	- `package.json` — name/version/description/main only. No `scripts`, no
	18	  dependencies.
	19	
	20	## Decisions the user explicitly approved during brainstorming
	21	
	22	Each was presented as a comparison with alternatives and chosen by the user.
	23	These are settled inputs, not open questions — review the spec against them
	24	rather than relitigating them.
	25	
	26	1. **Module scope: rules + field reading.** The shared module owns the rule
	27	   predicates, a `validate(values, schema)` entry point, and a helper that reads
	28	   values out of a `<form>` element. It does NOT own submit interception or
	29	   error display. Alternatives offered and declined: "rules only" (no DOM
	30	   knowledge at all) and "rules + wiring + display" (an `attachValidation` that
	31	   renders messages). Rationale the user accepted: error display differs per
	32	   form, the current code only logs, and committing to a display convention
	33	   before a second form exists is the guess most likely to be wrong.
	34	
	35	2. **Module style: dual CommonJS + global.** `src/validation.js` ends with a
	36	   conditional `module.exports` / `window.FormValidation` assignment.
	37	   Alternatives offered and declined: ES modules (rejected because
	38	   `type="module"` scripts are CORS-restricted under `file://`, so the page
	39	   would need a dev server) and a browser-only global (rejected because it is
	40	   not importable from Node, so the module could not be unit-tested without a
	41	   DOM shim).
	42	
	43	3. **Rule set: minimal plus a custom-function escape hatch.** Ship `required`
	44	   only. A rule is any `(value, allValues) => string | null`, so one-off rules
	45	   are written inline at the call site. Alternatives offered and declined: a
	46	   "common set" shipping `minLength`, `maxLength`, `pattern`, `email`, and
	47	   `matches` up front. Rationale accepted: YAGNI — built-ins get added when a
	48	   form needs one.
	49	
	50	4. **Test infrastructure: `node:test`.** Node's built-in runner; `package.json`
	51	   gains `"test": "node --test"`. Alternatives offered and declined: no tests
	52	   at all, and a real framework (Jest/Vitest, rejected because it would add the
	53	   repo's first dependencies and a config file).
	54	
	55	5. **`required` trims before the emptiness check**, so a whitespace-only value
	56	   fails. The user was told explicitly that this changes current behavior
	57	   (today `"   "` passes) and chose it over preserving the existing behavior.
	58	
	59	Also approved in the design walkthrough, stated to the user before the spec was
	60	written:
	61	
	62	- The return shape changes from `{valid, error}` (one flat string) to
	63	  `{valid, errors: {field: message}}`, and `validateForm` is deleted as a page
	64	  global.
	65	- `index.html` gains `name` attributes on both inputs and a
	66	  `<script src="src/validation.js">` tag before `app.js`.
	67	
	68	## Constraints the user set
	69	
	70	- No linter or formatter is introduced; unrelated files are not reformatted.
	71	- Zero runtime dependencies.
	72	- `index.html` must stay openable as a `file://` URL.
	73	- No second form is built as part of this work.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
