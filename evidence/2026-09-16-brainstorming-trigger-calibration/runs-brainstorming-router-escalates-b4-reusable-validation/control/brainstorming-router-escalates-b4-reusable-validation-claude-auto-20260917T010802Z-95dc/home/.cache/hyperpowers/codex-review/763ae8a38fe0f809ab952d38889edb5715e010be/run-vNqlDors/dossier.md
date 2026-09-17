# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T010802Z-95dc/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-reusable-form-validation-design.md

	1	# Reusable Form Validation — Design
	2	
	3	Date: 2026-09-16
	4	Status: Approved (design sections 1-3 approved in brainstorming)
	5	
	6	## Problem
	7	
	8	`app.js` contains a `validateForm` function that hardcodes the field names
	9	`username` and `password`:
	10	
	11	```js
	12	function validateForm(formData) {
	13	  if (!formData.username || !formData.password) {
	14	    return { valid: false, error: "Missing required fields" };
	15	  }
	16	  return { valid: true };
	17	}
	18	```
	19	
	20	It cannot validate any other form, it reports one error string for the whole
	21	form rather than per field, and it supports only a presence check. Several
	22	additional forms are planned, so the validation logic needs to move into a
	23	shared module with a per-form schema.
	24	
	25	## Scope
	26	
	27	In scope:
	28	
	29	- A new ES module exposing a pure `validate(values, schema)` function and a set
	30	  of rule factories covering presence and format checks.
	31	- Migration of the existing login form to the new module.
	32	- Unit tests for the new module, using Node's built-in test runner.
	33	
	34	Explicitly out of scope (decided during brainstorming):
	35	
	36	- **Cross-field rules** (password confirmation, date ranges, "one of these is
	37	  required"). Not needed by the planned forms.
	38	- **Async rules** (server round-trips such as "is this username taken"). These
	39	  would make the entire interface promise-based; deferred until a form needs
	40	  one.
	41	- **Form binding** — the shared layer does not take a form element, does not
	42	  listen for `submit`, and does not render error messages. Each form owns its
	43	  own submit handler and its own error display.
	44	- **Live validation** on blur or input.
	45	- **Error display for the login form.** It keeps today's console-only
	46	  behavior. Inventing a display convention before the other forms exist would
	47	  constrain them for no present benefit.
	48	- Linting, formatting, and end-to-end test infrastructure. Not required by this
	49	  change.
	50	- `src/index.js` and `src/utils.js`. They are an unrelated CommonJS Node island
	51	  and are not modified.
	52	
	53	## Global Constraints
	54	
	55	- **Module format: ES modules.** `import`/`export`, with `index.html` loading
	56	  `app.js` via `<script type="module">`. Consequence, accepted by the project
	57	  owner: `index.html` must be served over HTTP; opening it via `file://` will
	58	  no longer work.
	59	- **Zero runtime dependencies, zero build step.** `package.json` currently has
	60	  no dependencies and no scripts; the only addition is a `test` script using
	61	  Node's built-in runner.
	62	- **Test infrastructure: `node --test`.** Ships with Node, so the dependency
	63	  count stays at zero. No linter or formatter is configured as part of this
	64	  work.
	65	- **The validator is pure.** No DOM access, no I/O, no mutation of its
	66	  arguments, fully synchronous.
	67	
	68	## Architecture
	69	
	70	### New module: `src/validation.js`
	71	
	72	An ES module placed alongside the existing `src/` files. It shares no code with
	73	`src/index.js` or `src/utils.js` (those are CommonJS and unrelated); the
	74	location is for tidiness only.
	75	
	76	Exports:
	77	
	78	- `validate(values, schema)` — the only entry point.
	79	- Rule factories: `required()`, `minLength(n)`, `maxLength(n)`, `email()`,
	80	  `pattern(re, message)`, `range(min, max)`.
	81	
	82	### The rule contract
	83	
	84	A **rule** is a function `(value) => string | null`, returning an error message
	85	when the value fails and `null` when it passes.
	86	
	87	A **rule factory** is a function returning a rule. Every built-in factory takes
	88	a `message` as its last argument, overriding the default text. It is optional
	89	for every factory except `pattern`, which has no meaningful default wording and
	90	requires one:
	91	
	92	```js
	93	required("Pick a username")
	94	minLength(8, "Passwords must be 8+ characters")
	95	```
	96	
	97	Because a rule is just a function of that shape, a form-specific rule needs no
	98	change to `src/validation.js`:
	99	
	100	```js
	101	const hasDigit = (value) =>
	102	  /[0-9]/.test(value) ? null : "Must contain a digit";
	103	
	104	const signupSchema = {
	105	  password: [required(), minLength(8), hasDigit],
	106	};
	107	```
	108	
	109	This extensibility is the reason for choosing rule factories over a
	110	plain-data schema (`{ required: true, minLength: 3 }`): a closed rule
	111	vocabulary would force edits to shared code every time a single form needs a
	112	one-off check.
	113	
	114	### The schema
	115	
	116	A schema is a plain object mapping a field name to an array of rules:
	117	
	118	```js
	119	const loginSchema = {
	120	  username: [required(), minLength(3)],
	121	  password: [required(), minLength(8)],
	122	};
	123	```
	124	
	125	### The result
	126	
	127	```js
	128	{ valid: boolean, errors: { [fieldName]: string } }
	129	```
	130	
	131	- `errors` contains an entry only for fields that failed.
	132	- `valid` is exactly `Object.keys(errors).length === 0`.
	133	- At most one message per field: the first failing rule for a field wins, and
	134	  the remaining rules for that field are skipped.
	135	
	136	This replaces the current `{ valid, error }` shape, which cannot represent two
	137	bad fields simultaneously.
	138	
	139	## Behavior Rules
	140	
	141	These are the decisions that are otherwise left implicit and cause bugs later.
	142	They are normative.
	143	
	144	### Presence and short-circuiting
	145	
	146	- `required()` treats these as empty: `undefined`, `null`, `""`, a
	147	  whitespace-only string, an empty array, and `false` (an unchecked checkbox).
	148	- `0` is **not** empty. It is a real value and passes `required()`.
	149	- **When a field is empty and its rule list includes `required()`**, the
	150	  `required()` message is the only error reported for that field. A user never
	151	  sees "Required" and "Must be a valid email address" at the same time.
	152	- **When a field is empty and its rule list does not include `required()`**,
	153	  the field passes: all other rules are skipped. This makes optional fields
	154	  behave correctly without extra ceremony — an optional email is only format
	155	  checked when the user actually typed something.
	156	
	157	### Value handling
	158	
	159	- `validate()` never mutates `values`, and never trims or coerces the values it
	160	  is given. `required()` ignores surrounding whitespace when deciding
	161	  emptiness, but the value itself is untouched.
	162	- Fields present in `values` but absent from `schema` are ignored. Forms often
	163	  carry state that is not user input.
	164	- Fields present in `schema` but absent from `values` are validated as
	165	  `undefined`, so `required()` catches them.
	166	
	167	### Failing loudly on schema bugs
	168	
	169	The following throw a `TypeError` whose message names the offending field:
	170	
	171	- A schema entry that is not an array of functions.
	172	- A length or format rule applied to a value of an incompatible type — for
	173	  example `minLength(3)` against a number.
	174	
	175	These are programming errors in the schema, not user input errors. Throwing
	176	means a test catches them, whereas silently passing would let a form accept
	177	anything.
	178	
	179	## Built-in Rules
	180	
	181	| Factory | Passes when | Default message |
	182	|---|---|---|
	183	| `required()` | Value is not empty (see the emptiness list above) | `"Required"` |
	184	| `minLength(n)` | String or array length >= `n` | `"Must be at least n characters"` |
	185	| `maxLength(n)` | String or array length <= `n` | `"Must be at most n characters"` |
	186	| `email()` | Value matches a basic address shape (non-empty local part, `@`, dotted domain) | `"Must be a valid email address"` |
	187	| `pattern(re, message)` | `re.test(value)` | The supplied `message` (required for this factory, since no generic wording is meaningful) |
	188	| `range(min, max)` | Value is a finite number within `[min, max]` inclusive | `"Must be between min and max"` |
	189	
	190	Type expectations, per the "fail loudly" rule above: `minLength`, `maxLength`
	191	accept a string or an array; `email` and `pattern` accept a string; `range`
	192	accepts a number. Anything else throws a `TypeError` naming the field rather
	193	than being coerced. In particular `range` does not accept the numeric strings
	194	that DOM inputs produce — the caller converts before validating.
	195	
	196	`email()` deliberately uses a permissive shape check rather than attempting
	197	RFC 5322. Strict address validation is a known trap; the server is the
	198	authority on deliverability.
	199	
	200	## Migration of the Login Form
	201	
	202	`app.js`:
	203	
	204	- Delete `validateForm`.
	205	- Add `import { validate, required, minLength } from "./src/validation.js";`
	206	- Add a `loginSchema` const.
	207	- The submit handler calls `validate({ username, password }, loginSchema)` and,
	208	  on failure, logs the per-field errors to the console — the same channel the
	209	  code uses today, updated for the new result shape.
	210	- `login()` and `API_ENDPOINT` are unchanged.
	211	
	212	`index.html`:
	213	
	214	- `<script src="app.js"></script>` becomes
	215	  `<script type="module" src="app.js"></script>`.
	216	- No other markup changes. No error-display elements are added.
	217	
	218	## Testing
	219	
	220	`test/validation.test.js`, run via `node --test`, wired as
	221	`"scripts": { "test": "node --test test/" }` in `package.json`.
	222	Implementation is test-driven: tests are written before the implementation.
	223	
	224	Cases:
	225	
	226	1. **Each factory** — `required`, `minLength`, `maxLength`, `email`, `pattern`,
	227	   `range`: a passing value, a failing value, and the custom-message override.
	228	2. **Short-circuiting** — empty value with `required()` present reports only
	229	   `"Required"`; empty value with `required()` absent passes all other rules;
	230	   the first failing rule wins when several would fail.
	231	3. **Result shape** — a fully valid input yields `{ valid: true, errors: {} }`;
	232	   two bad fields are reported together; fields in `values` but not `schema`
	233	   are ignored; a field in `schema` but missing from `values` is caught by
	234	   `required()`.
	235	4. **Emptiness table** — `undefined`, `null`, `""`, `"   "`, `[]`, and `false`
	236	   each fail `required()`; `0` passes it.
	237	5. **Throwing** — `minLength(3)` against a number throws `TypeError`; a schema
	238	   entry that is not an array of functions throws `TypeError`; both messages
	239	   name the field.
	240	6. **No mutation** — `values` is deep-equal to its original after `validate()`.
	241	
	242	### Manual verification
	243	
	244	`app.js` accesses `document` and there is no DOM test infrastructure; adding
	245	jsdom would introduce the project's first dependency, which this change does
	246	not justify. The login form is therefore verified by hand:
	247	
	248	1. Serve the directory over HTTP (for example `python3 -m http.server`) and
	249	   open `index.html`. Serving is required because `app.js` is now a module.
	250	2. Submit the form empty. Expect per-field errors in the console.
	251	3. Submit with a 2-character username. Expect only the username error.
	252	4. Submit with valid values. Expect the login path to run as before.
	253	
	254	This is a manual step and will be reported as such — the automated suite covers
	255	`src/validation.js` only.
	256	
	257	## Risks and Assumptions
	258	
	259	- **Assumption: the project owner does not open `index.html` directly from the
	260	  filesystem.** Validate by confirming the manual verification steps above are
	261	  workable; if `file://` turns out to be required, the fallback is a classic
	262	  script exporting a `window.Validation` global, which costs the ability to
	263	  unit-test without a shim.
	264	- **Assumption: the planned forms need only per-field, synchronous rules.**
	265	  Validate when the next form is specified. Cross-field and async rules were
	266	  deliberately excluded; adding async later changes `validate()` to return a
	267	  promise, which is a breaking change for every call site.
	268	- The result-shape change from `{ valid, error }` to `{ valid, errors }` is
	269	  breaking, but `validateForm` has exactly one caller, inside `app.js`.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T010802Z-95dc/home/.cache/hyperpowers/codex-review/763ae8a38fe0f809ab952d38889edb5715e010be/run-uoOIgD8v/approach-context.md

	1	# Approach Context
	2	
	3	## Original request (verbatim)
	4	
	5	> Make the form validation reusable across multiple forms.
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	**Q: What's driving this — is there a concrete second form coming, or is this
	10	cleanup ahead of future forms?**
	11	A: Several forms planned. Multiple forms are coming and the shared layer should
	12	be in place first, designed for the common cases across them.
	13	
	14	**Q: Which forms are planned, and what kinds of rules do they need beyond
	15	"required"?**
	16	A: Required + format — required, plus built-in formats such as email,
	17	min/max length, numeric range, pattern match. Cross-field rules (password
	18	confirmation, date ranges) and async/server-side rules (username-taken checks)
	19	were explicitly NOT selected.
	20	
	21	**Q: How much should the shared layer own?**
	22	A: Validator only — a pure function that computes validation results. Each form
	23	keeps its own submit handler and its own error display. The shared layer does
	24	not bind to form elements, does not listen for submit, and does not render
	25	error messages.
	26	
	27	**Q: How should the validation module be loaded?**
	28	A: ES modules — `import`/`export` with `<script type="module">`. Serving
	29	`index.html` over HTTP instead of `file://` is accepted. No bundler.
	30	
	31	## Codebase facts
	32	
	33	Repository root contains: `index.html`, `app.js`, `README.md`, `package.json`,
	34	`src/index.js`, `src/utils.js`. Git branch `feature/webapp-enhancement`, clean
	35	working tree.
	36	
	37	### `package.json` (complete)
	38	
	39	```json
	40	{
	41	  "name": "drill-test-project",
	42	  "version": "1.0.0",
	43	  "description": "Test project for Drill scenarios",
	44	  "main": "src/index.js"
	45	}
	46	```
	47	
	48	No dependencies, no devDependencies, no scripts. No test runner, no linter, no
	49	formatter, no build step configured anywhere in the repo. No lockfile.
	50	
	51	### `app.js` (complete)
	52	
	53	```js
	54	// Simple webapp with login form handling
	55	const API_ENDPOINT = "https://api.example.com/login";
	56	
	57	function login(username, password) {
	58	  console.log("Logging in:", username);
	59	  // Stub: would POST to API_ENDPOINT in real app
	60	  return { success: true, user: username };
	61	}
	62	
	63	function validateForm(formData) {
	64	  if (!formData.username || !formData.password) {
	65	    return { valid: false, error: "Missing required fields" };
	66	  }
	67	  return { valid: true };
	68	}
	69	
	70	document.getElementById("login-form").addEventListener("submit", (e) => {
	71	  e.preventDefault();
	72	  const username = document.getElementById("username").value;
	73	  const password = document.getElementById("password").value;
	74	  const validation = validateForm({ username, password });
	75	  if (validation.valid) {
	76	    const result = login(username, password);
	77	    console.log("Login result:", result);
	78	  } else {
	79	    console.error("Validation error:", validation.error);
	80	  }
	81	});
	82	```
	83	
	84	Facts about the existing validation: it hardcodes the field names `username`
	85	and `password`; it returns `{valid: false, error: "<single string>"}` or
	86	`{valid: true}`; one error string for the whole form, not per field; errors are
	87	only written to the console, never to the DOM.
	88	
	89	### `index.html` (complete)
	90	
	91	```html
	92	<!DOCTYPE html>
	93	<html>
	94	<head>
	95	  <title>Simple Webapp</title>
	96	</head>
	97	<body>
	98	  <h1>Login</h1>
	99	  <form id="login-form">
	100	    <input type="text" id="username" placeholder="Username" />
	101	    <input type="password" id="password" placeholder="Password" />
	102	    <button type="submit">Log In</button>
	103	  </form>
	104	  <script src="app.js"></script>
	105	</body>
	106	</html>
	107	```
	108	
	109	One form only. Inputs carry `id` attributes but no `name` attributes. No
	110	elements exist for displaying validation errors. `app.js` is loaded as a
	111	classic script (not `type="module"`).
	112	
	113	### `src/index.js` and `src/utils.js` (complete)
	114	
	115	```js
	116	// src/index.js
	117	const { greet } = require('./utils');
	118	
	119	function main() {
	120	  console.log(greet('world'));
	121	}
	122	
	123	main();
	124	```
	125	
	126	```js
	127	// src/utils.js
	128	function greet(name) {
	129	  return `Hello, ${name}!`;
	130	}
	131	
	132	module.exports = { greet };
	133	```
	134	
	135	`src/` is a CommonJS Node island unrelated to the browser app. Nothing in
	136	`src/` is referenced by `index.html` or `app.js`.
	137	
	138	## Question for you
	139	
	140	Given the above, propose approaches for how the reusable validation layer
	141	should be structured — in particular how validation rules are declared per
	142	form, how the validator is invoked, and what shape the result takes.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
