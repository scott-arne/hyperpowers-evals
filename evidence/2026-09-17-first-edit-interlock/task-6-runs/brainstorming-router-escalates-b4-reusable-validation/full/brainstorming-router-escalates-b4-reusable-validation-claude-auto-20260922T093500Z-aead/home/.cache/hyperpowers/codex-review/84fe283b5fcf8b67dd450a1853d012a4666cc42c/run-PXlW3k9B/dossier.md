# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260922T093500Z-aead/coding-agent-workdir/docs/hyperpowers/specs/2026-09-22-reusable-form-validation-design.md

	1	# Reusable Form Validation — Design
	2	
	3	Date: 2026-09-22
	4	Status: approved for planning
	5	
	6	## Problem
	7	
	8	Form validation lives inside `app.js` as `validateForm`, a file-local function
	9	with the login form's rules hardcoded into its body:
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
	20	Any second form would have to copy this function and edit the field names. The
	21	goal is a shared validation engine that a second form can use without
	22	modification, introduced before a second form exists.
	23	
	24	## Constraints
	25	
	26	These were decided with the human partner during brainstorming and bound the
	27	design:
	28	
	29	1. **No second form exists or is scheduled.** Capability beyond what the login
	30	   form needs today is speculation, so only the `required` rule ships. The
	31	   engine's shape must make adding rules later purely additive.
	32	2. **No third-party validation dependency and no build step.** The repo has no
	33	   bundler, transpiler, or npm dependencies; `index.html` loads `app.js` with a
	34	   bare `<script>` tag.
	35	3. **Dual export.** The module must work as a browser global with no build and
	36	   be `require()`-able from Node, so the engine is unit-testable.
	37	4. **Validation logic only.** Shared error *display* is explicitly out of
	38	   scope. The login form's on-page behavior is unchanged.
	39	5. **Unit tests via Node's built-in `node:test`.** No linter or formatter is
	40	   introduced by this change.
	41	
	42	## Non-goals
	43	
	44	- Rendering validation messages in the DOM.
	45	- Rules beyond `required` (`minLength`, `email`, `pattern`, and similar).
	46	- Async or cross-field validation.
	47	- Linting, formatting, end-to-end tests, fuzz or mutation testing.
	48	- Any change to `src/index.js` or `src/utils.js`, which are unrelated to forms.
	49	
	50	## Architecture
	51	
	52	One new file, `src/validation.js`, containing a rule table, a default-message
	53	table, and a single exported `validate` function. It contains nothing specific
	54	to any form; field names and rules are supplied by the caller.
	55	
	56	Each form owns its own schema constant, declared next to that form's submit
	57	handler. For the login form that is a `LOGIN_SCHEMA` in `app.js`.
	58	
	59	### API
	60	
	61	```
	62	validate(values, schema) -> { valid, errors }
	63	```
	64	
	65	**`values`** — a plain object mapping field name to value, which is what the
	66	submit handler already assembles.
	67	
	68	**`schema`** — a plain object mapping field name to an array of rule entries. A
	69	rule entry is either:
	70	
	71	- a string naming a rule, which uses that rule's default message; or
	72	- an object `{ rule, message }` supplying a custom message for that field.
	73	
	74	```js
	75	const LOGIN_SCHEMA = {
	76	  username: ["required"],
	77	  password: ["required"],
	78	};
	79	```
	80	
	81	**Return value** — always an object of the same shape:
	82	
	83	- `{ valid: true, errors: {} }` when every field passes.
	84	- `{ valid: false, errors: { <field>: <message> } }` otherwise, with one entry
	85	  per failing field.
	86	
	87	### Semantics
	88	
	89	- **All fields are evaluated.** A form reports every failing field in one pass
	90	  rather than stopping at the first.
	91	- **Within one field, the first failing rule wins.** Only one message per field
	92	  appears in `errors`. This matters only once a field carries multiple rules,
	93	  but it is fixed now because it is part of the result contract.
	94	- **`required` fails on** `undefined`, `null`, the empty string, and
	95	  whitespace-only strings. This is deliberately stricter than the current
	96	  `!formData.username` test, which also rejects `0` and `false`. For text
	97	  inputs the difference is immaterial; rejecting whitespace-only input is an
	98	  intentional improvement.
	99	- **An unknown rule name throws.** A schema referring to a rule that is not in
	100	  the rule table is a programmer error and must fail loudly rather than
	101	  silently passing.
	102	- **A schema field absent from `values`** is treated as empty and therefore
	103	  fails `required`.
	104	- **Keys in `values` with no schema entry are ignored.**
	105	
	106	### Module loading
	107	
	108	`src/validation.js` ends with a conditional export: it assigns
	109	`module.exports = { validate }` when `module` is defined, and otherwise
	110	attaches `{ validate }` to `globalThis` as `Validation`. This keeps the browser
	111	path build-free and `file://`-openable while making the engine loadable in
	112	Node.
	113	
	114	`index.html` gains `<script src="src/validation.js"></script>` immediately
	115	before the existing `app.js` script tag, so the global exists before `app.js`
	116	runs.
	117	
	118	## Changes to existing files
	119	
	120	**`index.html`** — one added `<script>` tag before the `app.js` tag. No markup
	121	changes; the form and its inputs are untouched.
	122	
	123	**`app.js`** — `validateForm` is deleted. A `LOGIN_SCHEMA` constant is added,
	124	and the submit handler calls `Validation.validate({ username, password },
	125	LOGIN_SCHEMA)`. `API_ENDPOINT`, `login`, and the structure of the submit
	126	handler are unchanged.
	127	
	128	**`package.json`** — a `scripts` block with `"test": "node --test"`. No
	129	dependencies are added.
	130	
	131	## Accepted behavior change
	132	
	133	Today a failure logs the single generic string
	134	`Validation error: Missing required fields` no matter which field is empty.
	135	With per-field errors the logged text becomes field-specific. Nothing rendered
	136	on the page changes and no user-facing behavior changes, but the console text
	137	is not byte-identical to today's. The human partner accepted this in place of
	138	collapsing per-field errors back into one generic string, which would discard
	139	the benefit of the new result shape.
	140	
	141	## Error handling
	142	
	143	- Invalid schemas fail fast by throwing, as described under Semantics. The
	144	  engine does not attempt to recover from or paper over a malformed schema.
	145	- The engine performs no I/O and has no async behavior, so it has no failure
	146	  modes beyond a malformed schema.
	147	- Calling-code failures (a missing DOM element, for example) are outside the
	148	  engine's responsibility and are unchanged by this work.
	149	
	150	## Testing
	151	
	152	Implementation follows TDD: tests are written first and watched fail before
	153	the engine is written.
	154	
	155	Tests live in a `test/` directory, run by `node --test`, and cover:
	156	
	157	1. All fields present and non-empty — `valid: true`, empty `errors`.
	158	2. `username` missing — invalid, with exactly a `username` entry.
	159	3. `password` missing — invalid, with exactly a `password` entry.
	160	4. Both missing — invalid, with both entries present in one result.
	161	5. Whitespace-only value — treated as missing.
	162	6. A schema field absent entirely from `values` — treated as missing.
	163	7. A key in `values` with no schema entry — ignored, does not appear in
	164	   `errors`.
	165	8. A `{ rule, message }` entry — the custom message is returned instead of the
	166	   default.
	167	9. An unknown rule name — throws.
	168	
	169	Manual verification: open `index.html`, submit the login form empty and confirm
	170	a validation error is logged, then submit with both fields filled and confirm
	171	the login result is logged as before.
	172	
	173	## Alternatives rejected
	174	
	175	- **Ship a starter rule library** (`minLength`, `email`, `pattern`, custom
	176	  predicates). Rejected as speculation with no second form to constrain it;
	177	  adding rules later is additive and cheap.
	178	- **Adopt zod, yup, or valibot.** Rejected as disproportionate: it requires a
	179	  bundler or import map that this repo does not have, for a 28-line `app.js`.
	180	- **Native ES modules.** Rejected because `<script type="module">` requires an
	181	  HTTP origin, breaking `file://` opening, and clashes with the CommonJS
	182	  already in `src/`.
	183	- **Browser global only.** Rejected because the engine could not be loaded in
	184	  Node, making the most testable code in the repo untestable.
	185	- **Include shared error display.** Deferred. Display is where per-form
	186	  differences are largest, and there is no second form to reveal what the
	187	  shared parts would be.
	188	
	189	## Open questions
	190	
	191	None. All design decisions above were resolved during brainstorming.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260922T093500Z-aead/home/.cache/hyperpowers/codex-review/84fe283b5fcf8b67dd450a1853d012a4666cc42c/run-PXlW3k9B/adjudications.md

	1	# Approved design decisions (brainstorming)
	2	
	3	Original user request, verbatim: "Make the form validation reusable across
	4	multiple forms."
	5	
	6	Decisions the human partner made and approved during brainstorming. These are
	7	settled inputs to the spec, not open questions:
	8	
	9	1. **Driver:** general reuse. No second form exists or is scheduled.
	10	2. **Scope of capability:** a minimal engine — declarative field-to-rules map,
	11	   per-field error results, only the `required` rule. A starter rule library
	12	   (minLength, email, pattern, custom predicates) and a third-party validation
	13	   library (zod/yup/valibot) were both considered and explicitly rejected.
	14	3. **Module loading:** dual export — CommonJS `module.exports` when available,
	15	   otherwise a browser global. Native ES modules and browser-global-only were
	16	   both considered and explicitly rejected (ESM breaks `file://` and clashes
	17	   with the CommonJS in `src/`; global-only would make the engine untestable
	18	   in Node).
	19	4. **Display:** out of scope. Validation logic only; the login form's on-page
	20	   behavior is unchanged.
	21	5. **Tooling:** unit tests via Node's built-in `node:test` with
	22	   `"test": "node --test"`. ESLint/Prettier explicitly not adopted in this
	23	   change. No end-to-end, fuzz, or mutation testing.
	24	6. **Accepted behavior change:** the human partner was shown, and accepted,
	25	   that failure logging changes from the single generic string
	26	   `Validation error: Missing required fields` to field-specific messages. No
	27	   on-page behavior changes.
	28	
	29	The design was presented in two sections in chat and approved by the human
	30	partner ("looks good, go ahead") before the spec was written.
	31	
	32	## Codebase facts
	33	
	34	- `index.html` (15 lines): one form `#login-form`, inputs `#username`,
	35	  `#password`; loads `app.js` via a bare `<script src="app.js">` at line 13.
	36	- `app.js` (28 lines): `API_ENDPOINT`, stub `login()`, file-local
	37	  `validateForm()` (only call site is the submit handler in the same file),
	38	  and the `submit` listener. Failures go to `console.error` only.
	39	- `src/index.js`, `src/utils.js`: CommonJS, unrelated to forms.
	40	- `package.json`: `"main": "src/index.js"`, no scripts, no dependencies, no
	41	  devDependencies.
	42	- No bundler, transpiler, test runner, linter, or formatter anywhere.
	43	- Git branch `feature/webapp-enhancement`, working tree clean.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
