# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260926T081434Z-5f1d/coding-agent-workdir/docs/hyperpowers/specs/2026-09-26-reusable-form-validation-design.md

	1	# Reusable Form Validation — Design
	2	
	3	Date: 2026-09-26
	4	Status: Approved (design); not yet planned
	5	Branch: `feature/webapp-enhancement`
	6	
	7	## Problem
	8	
	9	`app.js` contains a `validateForm` function hardcoded to the login form's two
	10	fields, returning a single aggregate error string that is reported only via
	11	`console.error`. A second form cannot reuse any of it. Beyond the rule logic,
	12	the submit handler itself (`app.js:17-28`) is boilerplate every new form would
	13	copy: read each input by id, call validate, branch, report.
	14	
	15	Additional forms are anticipated but not yet specified, so the mechanism must
	16	be general rather than fitted to two known forms.
	17	
	18	## Goals
	19	
	20	- A shared validation mechanism usable by any form in the app.
	21	- A rule vocabulary covering the common cases, with an escape hatch so an
	22	  unanticipated rule is never blocked.
	23	- Per-field error messages rendered to the user, replacing console-only output.
	24	- The validation core independently usable and testable without a DOM.
	25	
	26	## Non-Goals
	27	
	28	- Async / server-side rules (username availability). Explicitly deferred; they
	29	  introduce pending state, debouncing, and race handling, and would change the
	30	  module's shape. Addable later as a separate concern over the same core.
	31	- Live revalidation on blur/input, touched-state tracking, submit-button
	32	  disabling. A form controller can be layered on the same core if wanted.
	33	- Numeric range rules. Expressible via the custom escape hatch until a real
	34	  case appears.
	35	- Linting, formatting, and end-to-end test infrastructure.
	36	
	37	## Global Constraints
	38	
	39	- **Module convention:** ES modules throughout. `package.json` gains
	40	  `"type": "module"`; `src/index.js` and `src/utils.js` convert from CommonJS.
	41	- **Dependencies:** `jsdom` as the single devDependency, for binder tests.
	42	  No runtime dependencies.
	43	- **Test infrastructure:** Node's built-in `node:test` / `node:assert`.
	44	  `npm test` runs `node --test`. Unit tests only.
	45	- **No build step.** Plain static files; the browser loads ES modules directly.
	46	
	47	## Architecture
	48	
	49	Four files under `src/validation/`. The dependency arrow runs one way —
	50	`bind → validate → rules` — and nothing points back.
	51	
	52	### `rules.js`
	53	
	54	Rule factories. Each returns `{ test(value, allValues), message }`.
	55	
	56	| Factory | Fails when |
	57	|---|---|
	58	| `required()` | value is empty or whitespace-only |
	59	| `minLength(n)` | value shorter than `n` |
	60	| `maxLength(n)` | value longer than `n` |
	61	| `email()` | value lacks a non-empty local part, exactly one `@`, or a domain containing a dot |
	62	| `pattern(re, message)` | value does not match `re` |
	63	| `matches(otherField)` | value differs from `allValues[otherField]` |
	64	
	65	Every factory accepts an optional trailing message override so a form can
	66	supply field-specific wording.
	67	
	68	`email()` deliberately does not attempt RFC 5322 conformance. The check exists
	69	to catch typos before a submit, not to prove deliverability, which only sending
	70	mail can establish.
	71	
	72	This file imports nothing and knows nothing about forms or the DOM.
	73	
	74	**Escape hatch:** a custom rule is any object with `test` and `message`. No
	75	registration API exists or is needed:
	76	
	77	```js
	78	[required(), { test: v => v !== 'admin', message: 'Reserved name' }]
	79	```
	80	
	81	### `validate.js`
	82	
	83	```js
	84	validate(data, schema) -> { valid: boolean, errors: { [field]: string } }
	85	```
	86	
	87	A pure function over plain objects. `schema` maps a field name to an array of
	88	rules. For each field, rules run in order and the **first failure wins** — one
	89	message per field. A field missing from `data` is treated as the empty string
	90	so `required()` catches it. Fields present in `data` but absent from `schema`
	91	are ignored.
	92	
	93	Rule order is therefore meaningful; `required()` goes first by convention.
	94	
	95	Rationale for first-failure-wins: showing "Required" and "Must be at least 8
	96	characters" together is noise, and the second is a consequence of the first.
	97	
	98	### `bind.js`
	99	
	100	```js
	101	attachValidation(formEl, schema, onValid) -> void
	102	```
	103	
	104	The only file that touches the DOM. Registers a `submit` listener that:
	105	
	106	1. Calls `preventDefault()`.
	107	2. Clears all existing error state from a prior submit.
	108	3. Collects values with `new FormData(formEl)`, keyed by input `name`.
	109	4. Calls `validate(data, schema)`.
	110	5. Valid → calls `onValid(data)`. Invalid → renders errors and stops.
	111	
	112	**Error rendering.** For each field with an error, insert (or reuse) a
	113	`<span class="field-error" data-error-for="<name>">` immediately after the
	114	input, set its `textContent`, and set `aria-invalid="true"` plus
	115	`aria-describedby` on the input. Reusing by `data-error-for` keeps repeated
	116	submits from stacking duplicate spans.
	117	
	118	Accessibility lives here deliberately: wiring it once in the binder means every
	119	form inherits it, which is a large part of the justification for having a
	120	binder at all.
	121	
	122	### `index.js`
	123	
	124	Re-exports the public surface (`validate`, `attachValidation`, and the rule
	125	factories) so callers write a single import.
	126	
	127	## Error Handling
	128	
	129	| Situation | Behavior | Why |
	130	|---|---|---|
	131	| Schema names a field the form lacks | `attachValidation` throws an `Error` naming the field, at attach time | A typo'd field name is a wiring bug. Failing on page load beats a rule that silently never runs while the form silently accepts bad input. |
	132	| Form input absent from schema | Allowed, ignored | Submit buttons and hidden fields exist; demanding a rule per input would be hostile. |
	133	| `matches('x')` where `x` is absent | Rule fails with its message | `test` receives `allValues` and cannot assume the key exists. Throwing here would be disproportionate. |
	134	| Repeated field names (checkbox groups, multi-select) | First value kept; values treated as strings | Documented limitation for v1 rather than half-handled. |
	135	
	136	## Migrating the Login Form
	137	
	138	- `index.html`: add `name="username"` / `name="password"` to the inputs
	139	  (existing `id`s retained); `<script src="app.js">` becomes
	140	  `<script type="module" src="app.js">`.
	141	- `app.js`: delete `validateForm`; replace the submit handler with a schema
	142	  plus `attachValidation(form, loginSchema, ({ username, password }) =>
	143	  login(username, password))`. `login` and `API_ENDPOINT` are unchanged.
	144	- `package.json`: add `"type": "module"`, a `test` script, and the `jsdom`
	145	  devDependency.
	146	- `src/index.js`, `src/utils.js`: convert `require`/`module.exports` to
	147	  `import`/`export`. Otherwise untouched — they are unrelated to this feature
	148	  and change only to satisfy the single module convention.
	149	
	150	**User-visible behavior change, intended:** login validation errors currently
	151	reach only the console, so a user gets no feedback. After this change they
	152	appear next to the offending field.
	153	
	154	## Testing Strategy
	155	
	156	Unit tests with `node:test` / `node:assert`.
	157	
	158	- **`rules`** — each factory: passing value, failing value, message override.
	159	  Boundary values for `minLength` / `maxLength`. Whitespace-only for
	160	  `required()`.
	161	- **`validate`** — first-failure-wins ordering; multiple fields each with their
	162	  own error; missing key treated as empty; extra data keys ignored; the
	163	  `valid: true` path returns an empty `errors` object; cross-field `matches`
	164	  via `allValues`; a custom `{test, message}` object works with no special
	165	  handling.
	166	- **`bind`** (jsdom) — valid submit calls `onValid` with the collected data and
	167	  renders no errors; invalid submit does not call `onValid`; error spans are
	168	  inserted with correct text and `data-error-for`; `aria-invalid` and
	169	  `aria-describedby` are set and later cleared; a second submit replaces rather
	170	  than duplicates spans; a schema naming an absent field throws at attach time.
	171	
	172	## Open Assumptions
	173	
	174	- Assumption: the anticipated future forms need no async or numeric-range
	175	  rules at introduction; validate by revisiting this spec when the second form
	176	  is specified. The custom escape hatch covers numeric ranges in the interim.
	177	- Assumption: no framework adoption is planned that would supply its own form
	178	  layer; validate by confirming before the binder grows further. The pure core
	179	  survives such a change regardless — only `bind.js` would be displaced.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260926T081434Z-5f1d/home/.cache/hyperpowers/codex-review/8483a5c4b35c3e518e26d46bddef82a105114adb/run-Ago2EGWd/approach-context.md

	1	# Approach Context
	2	
	3	## Original request (verbatim)
	4	
	5	> Make the form validation reusable across multiple forms.
	6	
	7	## Clarifying questions and answers
	8	
	9	**Q1: What forms will actually use this validation, beyond the existing login form?**
	10	A: "Forms aren't decided yet, but yes — other forms will need it later, and it should work across the whole app."
	11	
	12	**Q2: Which validation rules should ship in the shared module?**
	13	A: Core set plus a custom escape hatch — `required`, `minLength`/`maxLength`, `email`, `pattern`, `matches` (confirm-field), plus caller-supplied custom functions. Async/server-side rules are explicitly out of scope.
	14	
	15	**Q3: How much should the shared validation own?**
	16	A: A pure validation core plus an optional thin DOM-binding layer that reads inputs and renders error messages, kept as two separate layers.
	17	
	18	## Codebase facts
	19	
	20	Repository is a minimal static webapp. Total source is 64 lines across 6 files.
	21	Branch: `feature/webapp-enhancement`.
	22	
	23	### Files
	24	
	25	- `index.html` (15 lines) — single page, one form:
	26	  - `<form id="login-form">` containing `<input type="text" id="username">` and
	27	    `<input type="password" id="password">`, and a submit button.
	28	  - Inputs carry `id` attributes only; **no `name` attributes**.
	29	  - Loads `app.js` via a plain `<script src="app.js">` tag — no module type, no bundler.
	30	- `app.js` (28 lines) — browser script, not a module. Contents:
	31	  - `const API_ENDPOINT = "https://api.example.com/login";`
	32	  - `function login(username, password)` — stub, logs and returns `{ success: true, user: username }`.
	33	  - `function validateForm(formData)` — returns `{ valid: false, error: "Missing required fields" }`
	34	    when `!formData.username || !formData.password`, otherwise `{ valid: true }`.
	35	    Single aggregate error string; no per-field errors.
	36	  - A `submit` listener on `#login-form` that calls `preventDefault()`, reads both
	37	    values via `document.getElementById(...).value`, calls `validateForm`, then either
	38	    calls `login()` or `console.error`s the validation error. Errors are logged to the
	39	    console only — nothing is rendered into the DOM.
	40	- `src/index.js` (7 lines) — CommonJS: `require('./utils')`, calls `main()` which logs a greeting.
	41	- `src/utils.js` (5 lines) — CommonJS: `greet(name)`, `module.exports = { greet }`.
	42	- `package.json` (6 lines) — name/version/description and `"main": "src/index.js"`.
	43	  **No dependencies, no devDependencies, no scripts.**
	44	- `README.md` (3 lines) — placeholder description.
	45	
	46	### Constraints and existing patterns
	47	
	48	- Two different module conventions coexist: `src/` uses CommonJS (`require`/`module.exports`);
	49	  `app.js` is a classic browser script with globals and no module system.
	50	- No build step, no bundler, no transpiler, no framework. Plain HTML + JS served as files.
	51	- No test runner, no test files, no linter, no formatter configured anywhere.
	52	- No CI configuration present.
	53	- No existing shared/common module directory beyond `src/`.
	54	- Only one form exists today; additional forms are anticipated but unspecified.


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
