# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T005413Z-5a53/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-reusable-form-validation-design.md

	1	# Reusable Form Validation — Design
	2	
	3	Date: 2026-09-16
	4	Status: approved in brainstorming, pending implementation plan
	5	
	6	## Problem
	7	
	8	`app.js` contains a single `validateForm(formData)` that hardcodes knowledge of two
	9	fields, `username` and `password`. It returns `{ valid, error }` — one message for the
	10	whole form, stopping at the first problem — and the caller writes failures to
	11	`console.error`, so nothing appears on the page. The form's submit handler reads each
	12	input by `id` by hand.
	13	
	14	Nothing here can serve a second form. Adding a signup form today means copying the
	15	submit handler, copying the field reading, and writing a second bespoke validation
	16	function whose error wording drifts from the first.
	17	
	18	## Goal
	19	
	20	A validation module that both the existing login form and a new signup form consume,
	21	where adding a form is "declare a schema, call one function" rather than "copy the
	22	plumbing".
	23	
	24	## Global Constraints
	25	
	26	These apply to every task in the implementation plan.
	27	
	28	- **ES modules throughout.** The new modules use `export`/`import`. `index.html` loads
	29	  its entry script with `<script type="module">`. No bundler and no build step is
	30	  introduced.
	31	- **The rule and engine layers are DOM-free.** `rules.js` and `validate.js` must not
	32	  reference `document`, `window`, or any DOM type, so they are unit-testable in plain
	33	  Node. Only `bind.js` touches the DOM.
	34	- **Unit tests with `node:test`.** Node's built-in runner plus `node:assert`. A `test`
	35	  script is added to `package.json`. Tests live in `test/`.
	36	- **jsdom is the one permitted devDependency**, used solely so `bind.js` can be tested
	37	  against a real DOM rather than a hand-rolled fake element.
	38	- **No linter or formatter** is configured as part of this work (considered and
	39	  declined).
	40	- The existing CommonJS files `src/index.js` and `src/utils.js` are unrelated to the web
	41	  page and are not touched.
	42	
	43	## Architecture
	44	
	45	Three new files under `src/validation/`, in dependency order:
	46	
	47	### `src/validation/rules.js`
	48	
	49	Exported rule factories. Each returns a plain descriptor:
	50	
	51	```js
	52	{ name: string, message: string, test(value, allValues) => boolean }
	53	```
	54	
	55	`test` returns `true` when the value is acceptable. Factories to provide:
	56	
	57	| Factory | Rule |
	58	|---|---|
	59	| `required()` | Value is present and not whitespace-only |
	60	| `minLength(n)` | Length is at least `n` |
	61	| `maxLength(n)` | Length is at most `n` |
	62	| `email()` | Value looks like an email address |
	63	| `matches(otherField)` | Value equals `allValues[otherField]` |
	64	| `pattern(re, message)` | Value matches `re` |
	65	| `custom(fn, message)` | `fn(value, allValues)` returns truthy |
	66	
	67	Each factory carries a sensible default message. The factories whose signature does not
	68	already end in a message — `required`, `minLength`, `maxLength`, `email`, `matches` —
	69	accept an optional trailing `message` argument overriding that default, so a form can
	70	reword a rule without writing a new one. `pattern` and `custom` already take their
	71	message as a required argument, since no useful default exists for them.
	72	
	73	`test` receives `allValues` as well as `value` specifically so cross-field rules like
	74	`matches` fit the same shape as every other rule. This signature is the hardest thing
	75	here to change later — every rule would need rewriting — so it is fixed deliberately
	76	rather than discovered.
	77	
	78	### `src/validation/validate.js`
	79	
	80	```js
	81	validate(values, schema) => { valid: boolean, errors: { [field]: string } }
	82	```
	83	
	84	A schema maps a field name to an ordered array of rule descriptors. `validate` runs each
	85	field's rules in order and records that field's **first** failing message, then continues
	86	to the remaining fields. So a form reports at most one message per field but reports all
	87	bad fields at once. `errors` is an empty object when `valid` is `true`.
	88	
	89	The engine does not import `rules.js`. It only calls `test`, so a schema may freely mix
	90	built-in factories with inline `custom` rules; the engine cannot tell them apart.
	91	
	92	A field named in the schema but absent from `values` is validated as `undefined` — which
	93	`required()` fails and most other rules pass — rather than being skipped or throwing.
	94	
	95	### `src/validation/bind.js`
	96	
	97	```js
	98	bindForm(formElement, schema, onValid) => void
	99	```
	100	
	101	The only file that touches the DOM. It attaches a `submit` listener that:
	102	
	103	1. calls `preventDefault()`,
	104	2. builds a values object from `new FormData(formElement)`,
	105	3. calls `validate(values, schema)`,
	106	4. on failure, renders each message into that field's error element and returns,
	107	5. on success, calls `onValid(values)`.
	108	
	109	## DOM contract
	110	
	111	`FormData` keys off the `name` attribute, and the current inputs have only `id`. So:
	112	
	113	- Every validated input carries a `name` attribute, and **the schema keys on `name`**.
	114	  For the login form the two strings coincide with the existing ids.
	115	- Every validated field has a sibling error element declaring which field it serves:
	116	  `<span class="error" data-error-for="username" role="alert"></span>`. `bindForm` finds
	117	  it by `data-error-for` and sets `textContent`.
	118	
	119	Error elements are declared in markup rather than injected by `bindForm`. A helper that
	120	injects DOM dictates markup and styling to every consumer and is fiddly to test; a
	121	declared element is visible in the HTML, stylable, and easy to assert against. The cost
	122	is two lines of markup per field.
	123	
	124	## Error handling
	125	
	126	| Situation | Behavior |
	127	|---|---|
	128	| A field's error element is missing | Log a warning naming the field; continue validating. A markup omission must not break submission, nor fail silently. |
	129	| Schema names a field with no matching input in the form | Throw from `bindForm` at bind time, not at submit time. This is a programmer error and belongs on page load. Distinct from the engine's missing-value case below: the input exists here or it does not, which `bindForm` can see by inspecting `formElement.elements` before any submit. |
	130	| Schema field whose input exists but contributes no value at submit (e.g. an unchecked checkbox) | Not an error. `validate` receives `undefined` for it and applies the rules normally. |
	131	| Stale messages | Every error element is cleared at the start of each submit, so corrected fields stop showing old messages. |
	132	| Invalid input accessibility | Invalid inputs get `aria-invalid="true"`; it is removed when the field passes. Error elements carry `role="alert"`. |
	133	| `onValid` throws | Not caught. Swallowing an application error inside the validation layer would hide real bugs. |
	134	
	135	Validation runs on submit only. A user correcting a field sees the message persist until
	136	the next submit. On-blur revalidation is a purely additive later change and is out of
	137	scope.
	138	
	139	## Changes to existing files
	140	
	141	- **`index.html`** — add `name` attributes to the login inputs; add an error `<span>` per
	142	  field; change `<script src="app.js">` to `<script type="module" src="app.js">`; add the
	143	  signup form markup.
	144	- **`app.js`** — delete `validateForm`. Import `bindForm` and the rules, declare the login
	145	  schema `{ username: [required()], password: [required()] }`, and call
	146	  `bindForm(loginForm, loginSchema, values => login(values.username, values.password))`.
	147	  `login()` and `API_ENDPOINT` are unchanged.
	148	- **`package.json`** — add a `test` script and a `devDependencies` entry for jsdom.
	149	
	150	## Signup form
	151	
	152	The signup form is built as part of this work, not deferred. Without a real second
	153	consumer, "reusable" is an untested claim.
	154	
	155	Fields and schema:
	156	
	157	| Field | Rules |
	158	|---|---|
	159	| `username` | `required()`, `minLength(3)` |
	160	| `email` | `required()`, `email()` |
	161	| `password` | `required()`, `minLength(8)` |
	162	| `confirmPassword` | `required()`, `matches('password')` |
	163	| `terms` (checkbox) | `required()` |
	164	
	165	Its submit handler is a stub in the same spirit as `login()`.
	166	
	167	**The acceptance condition for the abstraction: adding the signup form requires no change
	168	to `rules.js` or `validate.js`.** If either needs editing to accommodate it, the design is
	169	wrong and should be revised rather than patched.
	170	
	171	Note: `terms` is a checkbox, and `FormData` omits unchecked checkboxes entirely rather
	172	than reporting them as `false`. This is exactly the "field absent from `values`" case the
	173	engine handles by validating `undefined`, which `required()` fails — the intended
	174	outcome. The implementation must confirm this rather than assume it.
	175	
	176	## Testing
	177	
	178	Runner: `node:test` + `node:assert`. The `rules.js` and `validate.js` suites need no
	179	dependencies at all — the payoff for keeping those layers pure.
	180	
	181	- **`rules.js`** — each factory's `test` in isolation, at the boundaries that bite:
	182	  `required()` against `""`, `"   "`, and `undefined`; `minLength(n)` exactly at `n`;
	183	  `email()` against strings that look valid but are not; `matches()` when the referenced
	184	  field is absent from `allValues`; message overrides taking effect.
	185	- **`validate.js`** — a field stopping at its first failing rule while other fields still
	186	  report; the empty-`errors` shape when valid; a schema field missing from `values`; a
	187	  schema mixing built-in and `custom` rules.
	188	- **`bind.js`** (jsdom) — messages rendered into the right elements; stale messages
	189	  cleared on resubmit; `onValid` called with the parsed values only when valid and not
	190	  called when invalid; `preventDefault` applied; the missing-error-element warning path;
	191	  the bind-time throw for an unknown schema field; `aria-invalid` set and removed.
	192	
	193	## Out of scope
	194	
	195	- On-blur or on-input live validation.
	196	- Async or server-side validation.
	197	- Real network submission — `login()` stays the existing stub.
	198	- Any change to `src/index.js` or `src/utils.js`.
	199	- Linting and formatting configuration.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T005413Z-5a53/home/.cache/hyperpowers/codex-review/763ae8a38fe0f809ab952d38889edb5715e010be/run-ucW2CkvF/approach-context.md

	1	# Approach Context
	2	
	3	## The original idea, verbatim
	4	
	5	> Make the form validation reusable across multiple forms.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	**Q: What other forms should this validation serve?**
	10	A: Login plus signup. Signup implies fields beyond username/password — e.g. email,
	11	password confirmation, possibly a terms checkbox — including at least one rule that
	12	compares two fields against each other.
	13	
	14	**Q: Which module format for the shared validation module?**
	15	A: ES modules. `index.html` will load the entry script with `<script type="module">`.
	16	No bundler and no build step is to be introduced.
	17	
	18	**Q: How much should the validation module own — pure logic, or logic plus DOM binding?**
	19	A: Logic plus form binding. The module exposes a rule/validation engine AND a helper
	20	that attaches to a `<form>` element, reads its fields, validates on submit, and renders
	21	per-field error messages. Adding a new form should be approximately "declare the fields
	22	and rules, then make one call". The rule-evaluation core itself is to stay DOM-free so it
	23	can be unit-tested in plain Node without a DOM.
	24	
	25	## Codebase facts
	26	
	27	Repository: a minimal static webapp fixture. Git branch `feature/webapp-enhancement`,
	28	clean tree.
	29	
	30	Files (complete list, excluding `.git`):
	31	
	32	- `index.html`
	33	- `app.js`
	34	- `package.json`
	35	- `README.md`
	36	- `src/index.js`
	37	- `src/utils.js`
	38	
	39	`index.html` in full:
	40	
	41	```html
	42	<!DOCTYPE html>
	43	<html>
	44	<head>
	45	  <title>Simple Webapp</title>
	46	</head>
	47	<body>
	48	  <h1>Login</h1>
	49	  <form id="login-form">
	50	    <input type="text" id="username" placeholder="Username" />
	51	    <input type="password" id="password" placeholder="Password" />
	52	    <button type="submit">Log In</button>
	53	  </form>
	54	  <script src="app.js"></script>
	55	</body>
	56	</html>
	57	```
	58	
	59	Note: the inputs carry `id` attributes but no `name` attributes, and there are no
	60	elements in the markup for displaying error messages.
	61	
	62	`app.js` in full:
	63	
	64	```js
	65	// Simple webapp with login form handling
	66	const API_ENDPOINT = "https://api.example.com/login";
	67	
	68	function login(username, password) {
	69	  console.log("Logging in:", username);
	70	  // Stub: would POST to API_ENDPOINT in real app
	71	  return { success: true, user: username };
	72	}
	73	
	74	function validateForm(formData) {
	75	  if (!formData.username || !formData.password) {
	76	    return { valid: false, error: "Missing required fields" };
	77	  }
	78	  return { valid: true };
	79	}
	80	
	81	document.getElementById("login-form").addEventListener("submit", (e) => {
	82	  e.preventDefault();
	83	  const username = document.getElementById("username").value;
	84	  const password = document.getElementById("password").value;
	85	  const validation = validateForm({ username, password });
	86	  if (validation.valid) {
	87	    const result = login(username, password);
	88	    console.log("Login result:", result);
	89	  } else {
	90	    console.error("Validation error:", validation.error);
	91	  }
	92	});
	93	```
	94	
	95	So today: validation is a single hardcoded function knowing only `username` and
	96	`password`; it returns `{ valid, error }` with a single message for the whole form and
	97	stops at the first problem; failures are written to `console.error` and nothing is
	98	rendered into the page.
	99	
	100	`src/utils.js` and `src/index.js` use CommonJS (`module.exports` / `require`) and are
	101	unrelated to the web page — `src/index.js` is a Node entry point that prints a greeting.
	102	So the repo currently mixes a browser global script with CommonJS Node files.
	103	
	104	`package.json` in full:
	105	
	106	```json
	107	{
	108	  "name": "drill-test-project",
	109	  "version": "1.0.0",
	110	  "description": "Test project for Drill scenarios",
	111	  "main": "src/index.js"
	112	}
	113	```
	114	
	115	There are no dependencies, no devDependencies, no `scripts` block, no test runner, no
	116	linter or formatter config, and no existing tests anywhere in the repo. No CI config.
	117	
	118	## What to propose approaches for
	119	
	120	Given the fixed constraints above (ES modules, no build step, rule engine plus a DOM
	121	binding helper, DOM-free rule core), propose 2-3 genuinely different designs for how
	122	validation rules and per-field results are represented and composed — the data model and
	123	its extension points — and how the binding helper connects that model to a real `<form>`
	124	and its error display, including how a cross-field rule such as "password confirmation
	125	must match password" fits the model.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
