# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T105018Z-d1c4/coding-agent-workdir/docs/hyperpowers/specs/2026-09-17-reusable-form-validation-design.md

	1	# Reusable Form Validation — Design
	2	
	3	Date: 2026-09-17
	4	Status: approved in brainstorming; pending user review of this document
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	`app.js` contains a `validateForm` hardcoded to the field names `username`
	10	and `password`:
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
	21	Three things make it unusable by a second form:
	22	
	23	1. The field names are baked into the function body.
	24	2. The result reports a single error string and never says which field failed.
	25	3. The surrounding submit handler hand-reads each input by `getElementById`
	26	   and reports failures only to `console.error`, so nothing is shown to the
	27	   user. Any second form would copy all of that.
	28	
	29	The goal is a validation layer that a new form can adopt by declaring a
	30	schema, without copying wiring or error-display code.
	31	
	32	## Scope
	33	
	34	In scope:
	35	
	36	- A shared validation module used by the existing login form.
	37	- Proof of reuse against a second, different field set **in tests only**.
	38	
	39	Out of scope:
	40	
	41	- Adding a real second form to the application UI. No new user-facing form is
	42	  invented as part of this work.
	43	- Server-side validation. `login()` remains the existing stub.
	44	- A linter, formatter, or end-to-end test infrastructure (explicitly declined;
	45	  see Global Constraints).
	46	
	47	## Decisions Taken During Brainstorming
	48	
	49	| Question | Decision |
	50	|---|---|
	51	| Scope of "multiple forms" | Extract the module, rewire login, prove reuse with a second field set in tests |
	52	| Rule expressiveness | Fixed built-ins: `required`, `minLength`, `maxLength`, `pattern`, `email`. Rules are plain data; no custom validator functions |
	53	| Module loading | Dual export in one file, no build step; page keeps loading via plain `<script src>` |
	54	| Architecture | Layered: a pure `validate()` core plus a thin `bind()` DOM layer |
	55	| Binder testing | jsdom as a devDependency |
	56	| Tooling to set up | Unit tests only |
	57	
	58	Two alternatives were considered and rejected. A **pure validator with no
	59	binder** was rejected because it leaves each new form copying the value
	60	collection and error-rendering plumbing, which is the duplication that
	61	actually costs. **HTML-declarative rules** (`data-rules="required
	62	minLength:8"`) were rejected because rules become parsed strings, `pattern`
	63	regexes are painful to escape inside an attribute, and nothing is testable
	64	without a DOM — which conflicts with proving reuse in tests.
	65	
	66	## Global Constraints
	67	
	68	- No build step. The page loads plain `<script src>` tags.
	69	- No runtime dependencies. jsdom is a **devDependency** and never reaches the
	70	  browser.
	71	- Test runner is `node:test` + `node:assert` (built in). `package.json` gains
	72	  `"scripts": { "test": "node --test" }`.
	73	- No linter, formatter, or e2e infrastructure is added.
	74	- The existing login flow must still work after the rewire.
	75	- `login()` and `API_ENDPOINT` in `app.js` are not modified.
	76	
	77	## Architecture
	78	
	79	Two layers in one file, `validation.js`, at the repository root beside
	80	`app.js`. It is not placed under `src/`: that tree is Node-only CommonJS and
	81	is never loaded by `index.html`.
	82	
	83	```
	84	validation.js
	85	  ├── validate(values, schema) -> { valid, errors }   pure; no DOM
	86	  └── bind(formEl, schema, onValid)                   DOM wiring; calls validate()
	87	```
	88	
	89	The split exists so the rule semantics — the part worth pinning down — are
	90	testable as plain data, and the DOM layer stays thin enough to read in one
	91	sitting.
	92	
	93	Export tail:
	94	
	95	```js
	96	if (typeof module !== "undefined" && module.exports) module.exports = FormValidation;
	97	if (typeof window !== "undefined") window.FormValidation = FormValidation;
	98	```
	99	
	100	## Component 1: `validate(values, schema)`
	101	
	102	### Schema shape
	103	
	104	Plain data. One object per field, mapping rule name to its parameter:
	105	
	106	```js
	107	const LOGIN_SCHEMA = {
	108	  username: { label: "Username", required: true, minLength: 3 },
	109	  password: { label: "Password", required: true, minLength: 8 },
	110	};
	111	```
	112	
	113	`label` is optional and used only to build messages; it defaults to the field
	114	key.
	115	
	116	### Rule semantics
	117	
	118	- Rules evaluate in fixed precedence — `required`, `minLength`, `maxLength`,
	119	  `pattern`, `email` — regardless of key order in the schema object, so
	120	  results are deterministic.
	121	- **First failing rule per field wins.** At most one message per field.
	122	- **All failing fields are reported** in the same call.
	123	- `required` trims before testing: a whitespace-only value is empty.
	124	- A field that is **empty and not required passes**, and its remaining rules
	125	  are skipped. Without this an optional email field would fail merely for
	126	  being blank.
	127	- `email` is a deliberately loose check: a non-empty local part, an `@`, and
	128	  a dot in the domain. Strict RFC-compliant email regexes reject valid
	129	  addresses and are not worth the defect surface here.
	130	- `pattern` takes a `RegExp` value, not a string.
	131	- An unrecognized rule key **throws** a descriptive `Error` at validate time.
	132	  A silent no-op on a typo such as `minlength` is the exact failure mode a
	133	  validation library must not have.
	134	- A schema field absent from `values` is treated as the empty string.
	135	- A key in `values` with no schema entry is ignored.
	136	
	137	### Result shape
	138	
	139	```js
	140	{ valid: false, errors: { password: "Password must be at least 8 characters" } }
	141	{ valid: true,  errors: {} }
	142	```
	143	
	144	This replaces the current `{ valid, error }` single-string result. `app.js`
	145	is the only caller, so the change is contained.
	146	
	147	### Deliberate omission
	148	
	149	No per-rule custom message override. Messages are generated from the rule and
	150	the field's `label`. Adding a `message` option later is backward compatible
	151	with every schema written against this design.
	152	
	153	## Component 2: `bind(formEl, schema, onValid)`
	154	
	155	### Field lookup
	156	
	157	Values are read through `formEl.elements[name]`, so inputs need `name`
	158	attributes. The existing inputs carry only `id`, so `index.html` gains
	159	`name="username"` and `name="password"`.
	160	
	161	If a schema field has no matching form element, **`bind` throws immediately**
	162	rather than silently validating a field that is not present.
	163	
	164	### Submit flow
	165	
	166	1. `preventDefault()`
	167	2. Collect values from the form's own elements, keyed by schema field name.
	168	3. Call `validate()`.
	169	4. Render error messages (below).
	170	5. Call `onValid(values)` **only** when `valid` is true.
	171	
	172	Because `onValid` cannot fire on invalid input, a form's handler never
	173	re-checks.
	174	
	175	### Error rendering
	176	
	177	For each failing field the binder writes the message into an element matching
	178	`[data-error-for="<name>"]`.
	179	
	180	- If such an element exists in the markup, it is used where the author placed
	181	  it.
	182	- If it does not exist, the binder **creates a `<span class="field-error">`
	183	  and inserts it immediately after the input**.
	184	
	185	The fallback is what makes a second form cheap: it needs `name` attributes and
	186	nothing else. Explicit placement stays available when a layout requires it.
	187	
	188	Each rendered error also sets `aria-invalid="true"` on the input and points
	189	its `aria-describedby` at the message element's id (generated if the element
	190	was created). Both are removed when the field's error clears.
	191	
	192	### Clearing
	193	
	194	- All messages clear at the start of every submit.
	195	- Once a field has displayed an error, an `input` event on that field clears
	196	  **that field's** message. It does not re-validate — re-validating per
	197	  keystroke tells someone their password is too short while they are still
	198	  typing it.
	199	
	200	### Styling
	201	
	202	`index.html` gains a small `<style>` block for `.field-error` (red, smaller
	203	text). The page has no CSS at all today, so without it the messages render as
	204	unstyled black text indistinguishable from the form.
	205	
	206	## Data Flow
	207	
	208	```
	209	submit event
	210	  -> bind() handler: preventDefault
	211	  -> collect { username, password } from formEl.elements
	212	  -> validate(values, LOGIN_SCHEMA)
	213	       -> per field, rules in precedence order, first failure wins
	214	       -> { valid, errors }
	215	  -> valid?
	216	       no  -> render messages, set aria-invalid / aria-describedby; stop
	217	       yes -> clear all messages -> onValid(values) -> login(username, password)
	218	```
	219	
	220	## Resulting `app.js`
	221	
	222	```js
	223	const LOGIN_SCHEMA = {
	224	  username: { label: "Username", required: true, minLength: 3 },
	225	  password: { label: "Password", required: true, minLength: 8 },
	226	};
	227	
	228	FormValidation.bind(document.getElementById("login-form"), LOGIN_SCHEMA, ({ username, password }) => {
	229	  console.log("Login result:", login(username, password));
	230	});
	231	```
	232	
	233	`validateForm`, the hand-written `getElementById` reads, and the inline
	234	`submit` listener are deleted. `login()` and `API_ENDPOINT` are untouched.
	235	`index.html` loads `validation.js` in a `<script src>` before `app.js`.
	236	
	237	## Behavior Change (accepted)
	238	
	239	The login form currently enforces presence only. The new schema adds
	240	`minLength: 3` on username and `minLength: 8` on password. A short password
	241	that is accepted today will be rejected after this change. This was raised
	242	during brainstorming and accepted.
	243	
	244	## Error Handling
	245	
	246	Two failure classes, handled differently on purpose:
	247	
	248	- **Programmer error** — an unknown rule key, or a schema field with no
	249	  matching input — throws immediately and loudly. These are typos, and they
	250	  should fail at development time rather than degrade silently in production.
	251	- **User input error** — a rule that a value fails — never throws. It is
	252	  collected into `errors` and rendered.
	253	
	254	## Testing
	255	
	256	Runner: `node --test`. Two files.
	257	
	258	### `test/validation.test.js` — core, pure data
	259	
	260	Covers the Section "Rule semantics" decisions:
	261	
	262	- `required`: empty string, whitespace-only, and present values
	263	- optional-and-empty skips remaining rules
	264	- `minLength` / `maxLength` at their boundaries
	265	- `pattern` match and mismatch
	266	- `email` loose accept and reject
	267	- precedence: a field failing both `required` and `minLength` reports
	268	  `required`
	269	- multiple failing fields all reported in one call
	270	- unknown rule key throws
	271	- schema field missing from `values` treated as empty; extra `values` keys
	272	  ignored
	273	
	274	**Reuse proof.** The same `validate()` is exercised with a second schema over
	275	a different field set, for example:
	276	
	277	```js
	278	const PROFILE_SCHEMA = {
	279	  email: { label: "Email", required: true, email: true },
	280	  bio:   { label: "Bio", maxLength: 200 },
	281	  zip:   { label: "ZIP", pattern: /^\d{5}$/ },
	282	};
	283	```
	284	
	285	`bio` (optional, length-bounded) and `zip` (optional but patterned) exercise
	286	paths the login schema never touches. If the interface is wrong, this is where
	287	it surfaces.
	288	
	289	### `test/binder.test.js` — DOM, under jsdom
	290	
	291	- values collected by `name`
	292	- `onValid` not called when invalid; called with the values when valid
	293	- message written into an existing `[data-error-for]` element when present
	294	- `<span class="field-error">` created and inserted after the input when
	295	  absent
	296	- `aria-invalid` and `aria-describedby` set on failure and removed on clear
	297	- messages cleared at the start of the next submit
	298	- typing in an errored field clears that field's message and nothing else
	299	- `bind` throws when a schema field has no matching input
	300	
	301	## Files Touched
	302	
	303	| File | Change |
	304	|---|---|
	305	| `validation.js` | new — `validate` + `bind`, dual export |
	306	| `app.js` | delete `validateForm` and the inline submit wiring; declare `LOGIN_SCHEMA`; call `bind` |
	307	| `index.html` | add `name` attributes, `<script src="validation.js">`, `.field-error` style block |
	308	| `package.json` | add `scripts.test`, `devDependencies.jsdom` |
	309	| `test/validation.test.js` | new |
	310	| `test/binder.test.js` | new |
	311	
	312	`src/index.js` and `src/utils.js` are not touched.
	313	
	314	## Open Assumptions
	315	
	316	- Assumption: the project runs on a Node version with a stable `node:test`
	317	  runner (18+). Validate by running `node --version` before adding the test
	318	  script.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T105018Z-d1c4/home/.cache/hyperpowers/codex-review/3a86efb4307ad12f457f8ab9349b41e6ac991cbd/run-WRZxk9Mr/approach-context.md

	1	# Approach Context
	2	
	3	## Original request (verbatim)
	4	
	5	"Make the form validation reusable across multiple forms."
	6	
	7	## Clarifying questions and the human partner's answers
	8	
	9	**Q1. What is the scope of "multiple forms" for this work?**
	10	A: Build the shared validation module, rewire the existing login form to use
	11	it, and exercise a second, different field set in tests only. Do not invent
	12	new UI / a new real form.
	13	
	14	**Q2. How expressive should the validation rules be?**
	15	A: A fixed set of built-in rules: `required`, `minLength`, `maxLength`,
	16	`pattern`, `email`. Rules stay plain data (no arbitrary custom validator
	17	functions for now; that escape hatch may be added later).
	18	
	19	**Q3. How should the shared module be loaded by both the page and tests?**
	20	A: Dual export, no build step. A single `validation.js` that attaches to
	21	`window` for the browser page and sets `module.exports` when `module` exists
	22	so Node tests can `require()` it. Page loading via `<script src>` must not
	23	change.
	24	
	25	## Codebase facts
	26	
	27	Repository root contains exactly these tracked files:
	28	
	29	```
	30	README.md
	31	package.json
	32	index.html
	33	app.js
	34	src/index.js
	35	src/utils.js
	36	```
	37	
	38	Git: branch `feature/webapp-enhancement`; recent commits are
	39	`Add simple webapp fixture`, `add entry point`, `add utils module`,
	40	`initial commit`.
	41	
	42	### package.json (complete)
	43	
	44	```json
	45	{
	46	  "name": "drill-test-project",
	47	  "version": "1.0.0",
	48	  "description": "Test project for Drill scenarios",
	49	  "main": "src/index.js"
	50	}
	51	```
	52	
	53	No dependencies, no devDependencies, no `scripts` block, no test runner
	54	configured, no linter or formatter configured. No lockfile.
	55	
	56	### index.html (complete)
	57	
	58	```html
	59	<!DOCTYPE html>
	60	<html>
	61	<head>
	62	  <title>Simple Webapp</title>
	63	</head>
	64	<body>
	65	  <h1>Login</h1>
	66	  <form id="login-form">
	67	    <input type="text" id="username" placeholder="Username" />
	68	    <input type="password" id="password" placeholder="Password" />
	69	    <button type="submit">Log In</button>
	70	  </form>
	71	  <script src="app.js"></script>
	72	</body>
	73	</html>
	74	```
	75	
	76	Note: there is exactly ONE form in the application. There is no second form
	77	anywhere in the repo. Inputs carry `id` attributes but no `name` attributes,
	78	no `required` attributes, and no validation-related data attributes. There is
	79	no element in the DOM for displaying validation error messages.
	80	
	81	### app.js (complete)
	82	
	83	```js
	84	// Simple webapp with login form handling
	85	const API_ENDPOINT = "https://api.example.com/login";
	86	
	87	function login(username, password) {
	88	  console.log("Logging in:", username);
	89	  // Stub: would POST to API_ENDPOINT in real app
	90	  return { success: true, user: username };
	91	}
	92	
	93	function validateForm(formData) {
	94	  if (!formData.username || !formData.password) {
	95	    return { valid: false, error: "Missing required fields" };
	96	  }
	97	  return { valid: true };
	98	}
	99	
	100	document.getElementById("login-form").addEventListener("submit", (e) => {
	101	  e.preventDefault();
	102	  const username = document.getElementById("username").value;
	103	  const password = document.getElementById("password").value;
	104	  const validation = validateForm({ username, password });
	105	  if (validation.valid) {
	106	    const result = login(username, password);
	107	    console.log("Login result:", result);
	108	  } else {
	109	    console.error("Validation error:", validation.error);
	110	  }
	111	});
	112	```
	113	
	114	Facts about current behavior:
	115	- `validateForm` is hardcoded to the field names `username` and `password`.
	116	- It returns `{ valid: false, error: "<string>" }` on failure — a single
	117	  first-error string, with no indication of WHICH field failed.
	118	- Errors are surfaced only via `console.error`; nothing is rendered to the
	119	  user in the DOM.
	120	- Field values are read by hardcoded `document.getElementById` calls at
	121	  submit time.
	122	- `app.js` runs in plain browser-global scope. There is no `import`, no
	123	  `require`, no bundler, no `type="module"`.
	124	
	125	### src/index.js (complete)
	126	
	127	```js
	128	const { greet } = require('./utils');
	129	
	130	function main() {
	131	  console.log(greet('world'));
	132	}
	133	
	134	main();
	135	```
	136	
	137	### src/utils.js (complete)
	138	
	139	```js
	140	function greet(name) {
	141	  return `Hello, ${name}!`;
	142	}
	143	
	144	module.exports = { greet };
	145	```
	146	
	147	Facts: `src/` is CommonJS and Node-side. It is entirely unrelated to the form
	148	code in `app.js`; nothing in `src/` is loaded by `index.html`. So the repo
	149	already contains two disconnected module worlds: CommonJS under `src/`, and
	150	browser globals at the root.
	151	
	152	## Constraints
	153	
	154	- Zero runtime dependencies today; the human partner chose "no build step".
	155	- The browser page must keep loading via `<script src="app.js">`.
	156	- Node must be able to load the validation module for tests.
	157	- No test runner exists yet, so one has to be chosen/set up as part of this
	158	  work.
	159	- The existing login flow must keep working after the rewire.
	160	- Rules are plain data (see Q2).
	161	- The project is tiny (~40 lines of application code). Solutions should be
	162	  proportionate.
	163	
	164	## What to produce
	165	
	166	Propose 2-3 genuinely different viable architectures for the reusable
	167	validation layer, given the decisions above. The open design space includes
	168	(but is not limited to): where rules are declared, what the module's public
	169	interface looks like, how a form's values are collected, what the result
	170	shape is, and how much of DOM wiring / error rendering the shared module
	171	owns versus each form.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
