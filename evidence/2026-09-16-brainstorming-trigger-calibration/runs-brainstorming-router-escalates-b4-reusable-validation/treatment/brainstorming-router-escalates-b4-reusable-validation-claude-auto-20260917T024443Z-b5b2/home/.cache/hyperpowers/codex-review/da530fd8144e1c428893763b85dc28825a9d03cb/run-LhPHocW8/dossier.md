# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T024443Z-b5b2/coding-agent-workdir/docs/hyperpowers/specs/2026-09-16-reusable-form-validation-design.md

	1	# Reusable Form Validation — Design
	2	
	3	Date: 2026-09-16
	4	Status: approved in brainstorming, pending user review of this document
	5	
	6	## Problem
	7	
	8	`app.js` contains a `validateForm` that checks two hardcoded fields
	9	(`username`, `password`) and returns a single form-level error string. The
	10	submit handler reads each field with its own `document.getElementById` call and
	11	reports failures with `console.error`, so a validation failure produces no
	12	user-visible output at all.
	13	
	14	There is exactly one form in the repository today. Additional forms are
	15	anticipated. As written, every new form would duplicate the field reads, the
	16	ad-hoc checks, and the (currently nonexistent) error display.
	17	
	18	## Goal
	19	
	20	A shared module that any form can use to validate its fields and display the
	21	resulting messages, so adding a form means declaring its rules rather than
	22	rewriting the mechanics.
	23	
	24	## Scope
	25	
	26	In scope:
	27	
	28	- Per-field rules: required, and format rules (email, min/max length, numeric
	29	  range, regex pattern).
	30	- Rendering error messages into the DOM next to the offending field, with
	31	  accessible markup.
	32	- Migrating the existing login form onto the shared module.
	33	
	34	Explicitly out of scope:
	35	
	36	- Cross-field rules (password confirmation, date ordering). No hooks are built
	37	  for them.
	38	- Asynchronous or server-side rules (username-taken, coupon-valid). The API is
	39	  synchronous throughout.
	40	- Live validation on blur or keystroke. Validation runs on submit only.
	41	- Submit wiring. The module never attaches a submit listener; each form keeps
	42	  its own handler and calls the module from it.
	43	
	44	## Global Constraints
	45	
	46	- **Module format: ES modules.** The shared module uses `export`;
	47	  `index.html` loads the app with `<script type="module" src="app.js">`.
	48	  Consequence: the page must be served over HTTP (`npx serve .` or equivalent);
	49	  opening `index.html` via `file://` no longer works.
	50	- **File extension `.mjs` for the shared module.** `package.json` has no
	51	  `"type"` field, so Node treats `.js` as CommonJS and could not import an ESM
	52	  `validation.js` in a test. Setting `"type": "module"` would break the
	53	  unrelated CommonJS files `src/index.js` and `src/utils.js`. The `.mjs`
	54	  extension is read as ESM by Node and is irrelevant to browsers.
	55	- **Testing: `node:test`, zero dependencies.** The repository takes no new
	56	  dependencies as part of this work. Unit tests cover the pure layer only; the
	57	  DOM layer is verified manually in a browser (see Testing).
	58	- **No linter or formatter** is introduced. Match the existing file style:
	59	  two-space indent, double-quoted strings, semicolons.
	60	- The CommonJS tree under `src/` is not touched.
	61	
	62	## Architecture
	63	
	64	New file `validation.mjs` at the repository root, next to `app.js`. Three
	65	layers in one file, each usable independently:
	66	
	67	### Layer 1 — Rule factories (pure, no DOM)
	68	
	69	Each factory returns a validator `(value) => string | null`, returning the
	70	error message on failure and `null` on pass. Each accepts an optional custom
	71	message as its final argument so a form can override the default wording
	72	without authoring a new rule.
	73	
	74	- `required(message?)`
	75	- `email(message?)`
	76	- `minLength(n, message?)`
	77	- `maxLength(n, message?)`
	78	- `range(min, max, message?)`
	79	- `pattern(regexp, message)` — message is required here; there is no sensible
	80	  default wording for an arbitrary pattern.
	81	
	82	A custom rule needs no registration: any `(value) => string | null` function
	83	may appear in a schema.
	84	
	85	### Layer 2 — Pure validation (no DOM)
	86	
	87	```
	88	validate(values, schema) -> { valid: boolean, errors: { [field]: string } }
	89	```
	90	
	91	`schema` maps a field name to an array of validators. Rules run in array order
	92	and evaluation of a field stops at its first failure, so each field yields at
	93	most one message. `errors` contains only failing fields; `valid` is
	94	`errors` being empty.
	95	
	96	### Layer 3 — DOM integration
	97	
	98	- `showErrors(formEl, errors)` — renders messages (see Error Rendering).
	99	- `clearErrors(formEl)` — removes all rendered messages and ARIA attributes.
	100	- `validateForm(formEl, schema) -> { valid, values, errors }` — the function
	101	  forms call. It clears existing errors, reads the values, runs `validate`,
	102	  renders any errors, and returns the result including `values` so the caller
	103	  need not read the DOM again.
	104	
	105	### Consumer shape
	106	
	107	```js
	108	import { validateForm, required, minLength } from "./validation.mjs";
	109	
	110	const loginSchema = {
	111	  username: [required(), minLength(3)],
	112	  password: [required(), minLength(8)],
	113	};
	114	
	115	document.getElementById("login-form").addEventListener("submit", (e) => {
	116	  e.preventDefault();
	117	  const { valid, values } = validateForm(e.target, loginSchema);
	118	  if (!valid) return;
	119	  console.log("Login result:", login(values.username, values.password));
	120	});
	121	```
	122	
	123	## Data Flow
	124	
	125	1. The form's own submit handler calls `preventDefault()` and then
	126	   `validateForm(formEl, schema)`.
	127	2. `validateForm` calls `clearErrors(formEl)`.
	128	3. For each field name in the schema, it resolves the element via
	129	   `formEl.elements[name]` and reads its value.
	130	4. It calls `validate(values, schema)`.
	131	5. If there are errors, it calls `showErrors(formEl, errors)`.
	132	6. It returns `{ valid, values, errors }` to the caller, which proceeds with
	133	   submission only when `valid` is true.
	134	
	135	## Error Rendering Convention
	136	
	137	This convention is a contract shared by every form; changing it later means
	138	touching all of them.
	139	
	140	For each invalid field:
	141	
	142	- Find-or-create `<span class="field-error" data-error-for="<name>"
	143	  id="<formId>-<name>-error">` positioned immediately after the input, and set
	144	  its text content to the message.
	145	- Set `aria-invalid="true"` on the input.
	146	- Set `aria-describedby` on the input to the span's id, so assistive
	147	  technology announces the message rather than only marking the field invalid.
	148	
	149	`clearErrors` removes created spans, empties pre-placed ones, and removes both
	150	ARIA attributes from every input in the form.
	151	
	152	Find-or-create rather than always-create, for two reasons: repeated submits
	153	must not stack duplicate spans, and a form needing the message in a specific
	154	position for layout can pre-place the span in its own HTML and have the module
	155	fill it in.
	156	
	157	The id is prefixed with the form's `id` because `aria-describedby` requires a
	158	page-unique target and two forms on one page may both contain an `email`
	159	field. When a form has no `id`, the module substitutes a generated
	160	per-page counter.
	161	
	162	Styling: `index.html` gains a small inline `<style>` block giving
	163	`.field-error` a red color and a smaller font size. Without it the messages
	164	render as ordinary black body text, indistinguishable from labels. There is no
	165	CSS file in the repository and this work does not add one.
	166	
	167	## Edge Cases and Error Handling
	168	
	169	- **Schema names a field absent from the DOM** — throw an `Error` naming the
	170	  field. This condition is always a typo or a stale schema; skipping it
	171	  silently would ship a field with no validation and no signal.
	172	- **A grouped control (`RadioNodeList`) or multi-value input is named in the
	173	  schema** — throw an `Error` naming the field. v1 supports single-value
	174	  inputs only; half-supporting groups is worse than refusing them clearly.
	175	- **Whitespace-only input** — `required()` treats `"   "` as empty. No value is
	176	  trimmed globally and `values` is returned exactly as typed: trimming every
	177	  value would silently alter passwords, which is a correctness bug rather than
	178	  a convenience. A form wanting trimmed input adds a rule for it.
	179	- **A field present in the DOM but absent from the schema** — ignored, not an
	180	  error. Forms legitimately contain fields needing no validation.
	181	- **Empty schema** — valid, no errors.
	182	- **Non-string values** — rules coerce with `String(value ?? "")` before
	183	  testing, except `range`, which parses with `Number` and fails with its
	184	  message when the result is `NaN`.
	185	
	186	## Testing
	187	
	188	Unit tests in `validation.test.mjs`, run with `node --test` via a `"test"`
	189	script added to `package.json`. No dependencies.
	190	
	191	Written test-first, driving the implementation.
	192	
	193	Coverage:
	194	
	195	- Each rule factory: passing value, failing value, custom message override,
	196	  boundary values for `minLength` / `maxLength` / `range`.
	197	- `required()` against `""`, `"   "`, and a valid value.
	198	- `validate()`: first-failure-wins ordering, multiple failing fields, empty
	199	  schema, a field in the schema with an empty rule array.
	200	- Non-string coercion and the `range` `NaN` path.
	201	
	202	**Known coverage gap, accepted:** layer 3 (`showErrors`, `clearErrors`,
	203	`validateForm`) is not unit-tested, because testing it requires a DOM and the
	204	repository is taking no new dependencies such as `jsdom`. That layer is
	205	verified manually in a browser against the login form: an empty submit shows
	206	both messages, fixing one field and resubmitting clears only that message, a
	207	valid submit renders no messages, and repeated submits never duplicate a span.
	208	The find-or-create logic and the ARIA wiring are the highest-risk untested
	209	code; adding `jsdom` later is the remedy if this layer grows.
	210	
	211	## Files Changed
	212	
	213	- `validation.mjs` — new. The shared module.
	214	- `validation.test.mjs` — new. Unit tests for layers 1 and 2.
	215	- `app.js` — import the module, delete the local `validateForm`, take field
	216	  values from the `validateForm` return rather than `getElementById`.
	217	- `index.html` — add `name` attributes to the two inputs, switch to
	218	  `<script type="module" src="app.js">`, add the `.field-error` style block.
	219	- `package.json` — add `"scripts": { "test": "node --test" }`.
	220	- `.gitignore` — new. Ignore `docs/hyperpowers`.
	221	
	222	## Assumptions
	223	
	224	- Assumption: the anticipated forms are conventional text-input forms
	225	  (signup, contact) with no grouped controls requiring validation; validate by
	226	  confirming the next form added fits the single-value-input constraint before
	227	  building on v1.
	228	- Assumption: serving the page over HTTP is acceptable in whatever workflow
	229	  currently opens `index.html`; validate by confirming no tooling or
	230	  documentation depends on `file://` access.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260917T024443Z-b5b2/home/.cache/hyperpowers/codex-review/da530fd8144e1c428893763b85dc28825a9d03cb/run-PIyqRNcE/approach-context.md

	1	# Approach Context
	2	
	3	## Original idea (verbatim)
	4	
	5	> Make the form validation reusable across multiple forms.
	6	
	7	## Clarifying questions and answers
	8	
	9	**Q: What forms are actually coming, and what kinds of rules do they need?**
	10	A: Required + format rules only — signup/contact-style forms: required fields,
	11	email format, min length, numeric ranges. Field-by-field, each rule
	12	independent. Explicitly NOT chosen: cross-field rules (password confirmation,
	13	date ordering) and async/server rules (username-taken, coupon-valid).
	14	
	15	**Q: How much should the shared layer own?**
	16	A: Validate AND render errors. The shared module validates and displays
	17	messages next to each field on a fixed markup convention. Explicitly NOT
	18	chosen: validate-only (returning errors for each form to display itself), and
	19	validate + render + submit wiring (the module attaching the submit listener
	20	and invoking the success handler).
	21	
	22	**Q: How should the shared validation module be loaded?**
	23	A: ES modules — the shared file uses `export`, `index.html` switches to
	24	`<script type="module" src="app.js">`. Accepted cost: the page must be served
	25	over HTTP rather than opened via `file://`. Explicitly NOT chosen: a global on
	26	`window` via a second plain script tag, and adding a bundler (esbuild/Vite).
	27	
	28	## Codebase facts
	29	
	30	Repository is a minimal fixture webapp. Full file inventory (excluding .git):
	31	`index.html`, `app.js`, `README.md`, `package.json`, `src/index.js`,
	32	`src/utils.js`.
	33	
	34	`app.js` (28 lines) — the entire browser app. Current contents:
	35	
	36	```js
	37	// Simple webapp with login form handling
	38	const API_ENDPOINT = "https://api.example.com/login";
	39	
	40	function login(username, password) {
	41	  console.log("Logging in:", username);
	42	  // Stub: would POST to API_ENDPOINT in real app
	43	  return { success: true, user: username };
	44	}
	45	
	46	function validateForm(formData) {
	47	  if (!formData.username || !formData.password) {
	48	    return { valid: false, error: "Missing required fields" };
	49	  }
	50	  return { valid: true };
	51	}
	52	
	53	document.getElementById("login-form").addEventListener("submit", (e) => {
	54	  e.preventDefault();
	55	  const username = document.getElementById("username").value;
	56	  const password = document.getElementById("password").value;
	57	  const validation = validateForm({ username, password });
	58	  if (validation.valid) {
	59	    const result = login(username, password);
	60	    console.log("Login result:", result);
	61	  } else {
	62	    console.error("Validation error:", validation.error);
	63	  }
	64	});
	65	```
	66	
	67	`index.html` (15 lines) — one form, `id="login-form"`, with
	68	`<input type="text" id="username">`, `<input type="password" id="password">`,
	69	and a submit button. Loads `app.js` with a plain `<script src="app.js">` tag.
	70	No CSS file, no classes on any element, no elements for error messages.
	71	
	72	`src/utils.js` and `src/index.js` — Node-side CommonJS
	73	(`module.exports` / `require`), unrelated to the browser app.
	74	`src/utils.js` exports a single `greet(name)` function.
	75	
	76	`package.json` — name `drill-test-project`, version 1.0.0,
	77	`"main": "src/index.js"`. No `"type"` field. No dependencies, no
	78	devDependencies, no scripts.
	79	
	80	Notable state:
	81	- Exactly ONE form exists in the repo today. Additional forms are anticipated
	82	  but not yet written.
	83	- The current validation returns a single form-level `error` string, not
	84	  per-field errors.
	85	- Validation failures currently produce NO user-visible output — only
	86	  `console.error`.
	87	- There is no test runner, no linter, no formatter, and no build step
	88	  configured anywhere in the repo.
	89	- Two module conventions coexist: plain browser globals in `app.js`, CommonJS
	90	  under `src/`.
	91	- Field values are read via hardcoded `document.getElementById` calls, one per
	92	  field, in the submit handler.
	93	
	94	## What to produce
	95	
	96	Independent approaches for how reusable, per-field, required+format validation
	97	with built-in error rendering should be structured for this codebase —
	98	specifically how validation rules are declared and associated with form fields,
	99	and how the rendered error messages attach to the DOM.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
