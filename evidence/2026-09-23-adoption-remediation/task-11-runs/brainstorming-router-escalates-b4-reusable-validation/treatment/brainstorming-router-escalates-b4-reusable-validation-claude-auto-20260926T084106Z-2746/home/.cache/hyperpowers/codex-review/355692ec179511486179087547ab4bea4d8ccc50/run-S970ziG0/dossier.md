# Review dossier

Gate: spec

## Documents under review

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260926T084106Z-2746/coding-agent-workdir/docs/hyperpowers/specs/2026-09-26-reusable-form-validation-design.md

	1	# Reusable Form Validation — Design
	2	
	3	**Date:** 2026-09-26
	4	**Status:** Approved design, pending implementation plan
	5	
	6	## Problem
	7	
	8	Validation lives inline in `app.js` as a single `validateForm` function that
	9	hardcodes the login form's two fields and returns one error string. A signup
	10	form is coming, and further forms after it. Three things would be copied into
	11	each new form: the rule logic, the per-field `getElementById` reading, and the
	12	error reporting — which today goes only to `console.error`, so validation
	13	failures are invisible to the user.
	14	
	15	## Goals
	16	
	17	- One shared validation module usable by any form in the app.
	18	- Rules composable enough to cover signup (email format, password length,
	19	  confirm-password matching) without reworking the interface.
	20	- Validation errors displayed on the page rather than logged to the console.
	21	- Validation logic unit-tested.
	22	
	23	## Non-Goals
	24	
	25	- Building the signup form. It is the motivating second consumer, but this work
	26	  delivers the module and converts login only; signup is built later against a
	27	  proven interface.
	28	- Async or server-side validation (uniqueness checks, etc.).
	29	- A linter or formatter for the repo.
	30	- Automated DOM tests. `bindForm` is verified manually in a browser.
	31	
	32	## Decisions
	33	
	34	| Decision | Choice | Rationale |
	35	|---|---|---|
	36	| Module system | ES modules | Only option where a new page imports the validator without re-learning a script load-order convention; also makes plain Node unit tests possible with no DOM harness. |
	37	| Rule declaration | Arrays of rule functions per field | Least machinery; a custom rule is just a function, needing no framework buy-in. Cross-field rules fall out naturally. |
	38	| Module scope | `validate()` + rules + a thin `bindForm` | Rules alone solve only a third of what is duplicated across forms; input reading and error display are the rest. |
	39	| Error collection | First failing rule per field | Only one message per field is displayed; "required" plus "too short" on one blank field is noise. |
	40	| Test runner | `node:test` | Built in, ESM-native, adds no dependencies to a dependency-free repo. |
	41	
	42	## Architecture
	43	
	44	New directory `src/validation/`, split along one boundary — pure logic versus
	45	DOM access:
	46	
	47	| File | Responsibility | Depends on |
	48	|---|---|---|
	49	| `rules.js` | Rule factories: `required`, `minLength`, `pattern`, `email`, `matches` | nothing |
	50	| `validate.js` | `validate(values, schema)` | nothing |
	51	| `bind-form.js` | `bindForm(formEl, schema, onValid, options)` | DOM, `validate.js` |
	52	| `index.js` | Public surface re-export | the other three |
	53	
	54	`bind-form.js` is the only file that touches the document. That is what lets
	55	`rules.js` and `validate.js` be tested in plain Node with no browser harness,
	56	and it is the reason for the split.
	57	
	58	Consumers import from `src/validation/index.js` and do not reach into the
	59	individual files, so rule implementations remain free to change.
	60	
	61	## API
	62	
	63	### Rule contract
	64	
	65	A rule is `(value, allValues) => string | null` — an error message, or `null`
	66	if it passes. Rule factories produce rules, so a schema reads as data:
	67	
	68	```js
	69	const loginSchema = {
	70	  username: [required()],
	71	  password: [required(), minLength(8)],
	72	};
	73	```
	74	
	75	The `allValues` argument is what makes cross-field rules ordinary:
	76	
	77	```js
	78	confirmPassword: [required(), matches('password', 'Passwords must match')],
	79	```
	80	
	81	Every factory takes an optional custom message as its last argument and
	82	defaults to a sensible one.
	83	
	84	**Empty-value convention:** every rule except `required` passes on an empty
	85	value. Without this, one blank required field produces both a `required` and a
	86	`minLength` error for a single mistake. It also makes "optional, but must be
	87	valid if present" expressible as a schema that simply omits `required()`.
	88	
	89	### `validate(values, schema)`
	90	
	91	Returns `{ valid: boolean, errors: Record<string, string> }`, where `errors`
	92	maps a field name to the message of its *first* failing rule. Rule order within
	93	an array is therefore meaningful: most fundamental first.
	94	
	95	`valid` is `true` exactly when `errors` is empty.
	96	
	97	### `bindForm(formEl, schema, onValid, options)`
	98	
	99	On submit: prevents the default, reads values from the form's inputs,
	100	validates, and either renders errors or clears them and calls
	101	`onValid(values)`.
	102	
	103	- **Reads inputs by `name`.** The existing inputs carry only `id`, so `name`
	104	  attributes are added.
	105	- **Validation timing:** on submit; and after the first *failed* submit, a
	106	  field re-validates on input so its error clears as the user corrects it. No
	107	  errors are shown before the first submit.
	108	- **Default rendering:** for field `x`, sets the text of `[data-error-for="x"]`
	109	  within the form, and sets `aria-invalid` and `aria-describedby` on the input.
	110	  Form-level errors go to `[data-error-for="_form"]`.
	111	- **`options.renderErrors`** replaces the display strategy entirely.
	112	
	113	`validate()` stays usable standalone, so a form wanting none of `bindForm`'s
	114	opinions can call it directly.
	115	
	116	## Error Handling
	117	
	118	Wiring mistakes fail loudly at bind time; user mistakes render as messages.
	119	
	120	- A missing form element, or a schema field with no matching input, throws at
	121	  bind time. A typo'd field name that silently validates nothing is the
	122	  dangerous failure — a hard error on page load beats a signup form that
	123	  accepts anything.
	124	- A missing `[data-error-for]` container throws at bind time when the default
	125	  renderer is in use, since otherwise errors are computed and displayed
	126	  nowhere. Passing `options.renderErrors` opts out of this check.
	127	- If `onValid` throws or returns a rejected promise, `bindForm` catches it and
	128	  renders the message as the form-level error. This gives a failed login
	129	  somewhere to surface.
	130	
	131	## Changes to Existing Code
	132	
	133	- **`app.js`** — `validateForm` is deleted; the login schema plus a `bindForm`
	134	  call replace it and the hand-written submit handler. `login()` is unchanged
	135	  and is called from the `onValid` callback. Deleting `validateForm` is
	136	  observationally safe: its only caller is the handler being replaced.
	137	- **`index.html`** — `<script type="module" src="app.js">`; `name` attributes
	138	  on the inputs; a `[data-error-for]` container per field plus one for
	139	  `_form`.
	140	- **`src/index.js`, `src/utils.js`** — converted from CommonJS to ESM so the
	141	  repo has one module system.
	142	- **`package.json`** — add `"type": "module"` and a `test` script running
	143	  `node --test`.
	144	- **`README.md`** — document that the page must be served over HTTP (ES modules
	145	  do not load from `file://`), with the command to do it.
	146	
	147	`"type": "module"` is repo-wide: every future `.js` file in this repo is an ES
	148	module by default.
	149	
	150	## Testing
	151	
	152	Unit tests with `node:test`, covering the pure modules:
	153	
	154	- Each rule factory: passing and failing cases, and the custom-message path.
	155	- The empty-value convention: non-`required` rules pass on empty input.
	156	- `matches` resolving against another field's value.
	157	- First-error-wins ordering within a field's rule array.
	158	- `validate` over a whole schema, valid and invalid.
	159	
	160	`bind-form.js` is verified manually in a browser: submit empty, submit
	161	partially filled, correct a field and confirm its error clears, and a
	162	successful submit reaching `onValid`.
	163	
	164	## Risks and Assumptions
	165	
	166	- Assumption: signup's rules are covered by `required`, `email`, `minLength`,
	167	  and `matches`. Validate when signup is actually built; the rule contract
	168	  accepts new factories without interface change if not.
	169	- Serving over HTTP is a workflow change for anyone who opened `index.html`
	170	  directly. Mitigated by the README note.
	171	- `bindForm`'s lack of automated coverage means its submit and render behavior
	172	  is only as verified as the manual pass. Adding jsdom later is a contained
	173	  change, as `bind-form.js` is the sole DOM-touching file.


## Adjudicated decisions

### /Users/johnss51/Development/agents/hyperpowers/evals/results/brainstorming-router-escalates-b4-reusable-validation-claude-auto-20260926T084106Z-2746/home/.cache/hyperpowers/codex-review/355692ec179511486179087547ab4bea4d8ccc50/run-S970ziG0/adjudications.md

	1	# Approved design decisions (brainstorming session, 2026-09-26)
	2	
	3	Original user request: "Make the form validation reusable across multiple forms."
	4	
	5	Repository starting state: a 4-file toy webapp. `index.html` has one login form
	6	(username, password, `id` attributes only, no `name`). `app.js` is a plain
	7	browser script with a hardcoded `validateForm` and a hand-written submit
	8	handler that reports errors via `console.error` only. `src/index.js` and
	9	`src/utils.js` are unrelated CommonJS Node files. `package.json` has no
	10	dependencies and no scripts.
	11	
	12	The following were each put to the user as an explicit choice and approved:
	13	
	14	1. **Scope driver.** "Other forms will need it later - signup at least. Should
	15	   work across the app." Signup is the motivating next consumer.
	16	
	17	2. **Module system: ES modules.** Chosen over (a) a second script tag exposing
	18	   a global and (b) a dual window/CommonJS export. User was told the costs: the
	19	   page must be served over HTTP, and `src/index.js` / `src/utils.js` convert
	20	   from CommonJS.
	21	
	22	3. **Rule declaration: arrays of rule functions per field.** Chosen over a
	23	   fluent builder and over a config object of rule names.
	24	
	25	4. **Module scope: validation + a thin form binder.** Chosen over pure
	26	   validation only, and over validation plus a render-only helper. `validate()`
	27	   remains usable standalone.
	28	
	29	5. **Deliverable: module + convert login only.** The signup form is explicitly
	30	   NOT built in this work, and no signup schema is written. Signup is built
	31	   later against the proven interface.
	32	
	33	6. **Tooling: `node:test` only.** The user was offered ESLint+Prettier and
	34	   jsdom DOM tests for `bindForm` and selected neither. `bindForm` is therefore
	35	   verified manually in a browser by deliberate choice, not by oversight.
	36	
	37	Design sections approved in chat before the spec was written: architecture and
	38	file layout; the API surface (including first-error-wins and the convention
	39	that only `required` fires on an empty value); error handling, testing, and
	40	tooling.
	41	
	42	Post-approval edit made during spec self-review: the `maxLength` rule factory
	43	was dropped from `rules.js` as speculative (nothing in scope needs it).


## Test evidence

NOT APPLICABLE: document gates carry no executed-test evidence

## Changed surfaces

NOT APPLICABLE: document gates have no commit range

## Review package

not applicable (document gate; the documents above ARE the artifact)
