# Approved design context — reusable form validation

Original user request, verbatim: "Make the form validation reusable across
multiple forms."

Repository state at brainstorming time (4 source files, no dependencies, no
test runner, no bundler, no linter):

- `index.html` — one form, `#login-form`, with `<input id="username">` and
  `<input type="password" id="password">`; loads `app.js` as a classic script.
- `app.js` — classic script (browser globals). Holds `API_ENDPOINT`, a stubbed
  `login(username, password)`, `validateForm(formData)` hardcoded to username
  and password returning `{valid, error}`, and an inline submit listener that
  reads values by element id and reports failures with `console.error`.
- `src/index.js`, `src/utils.js` — CommonJS, Node-only, unrelated to the page.
  Nothing in them references `validateForm`.
- `package.json` — name/version/description/main only. No `scripts`, no
  dependencies.

## Decisions the user explicitly approved during brainstorming

Each was presented as a comparison with alternatives and chosen by the user.
These are settled inputs, not open questions — review the spec against them
rather than relitigating them.

1. **Module scope: rules + field reading.** The shared module owns the rule
   predicates, a `validate(values, schema)` entry point, and a helper that reads
   values out of a `<form>` element. It does NOT own submit interception or
   error display. Alternatives offered and declined: "rules only" (no DOM
   knowledge at all) and "rules + wiring + display" (an `attachValidation` that
   renders messages). Rationale the user accepted: error display differs per
   form, the current code only logs, and committing to a display convention
   before a second form exists is the guess most likely to be wrong.

2. **Module style: dual CommonJS + global.** `src/validation.js` ends with a
   conditional `module.exports` / `window.FormValidation` assignment.
   Alternatives offered and declined: ES modules (rejected because
   `type="module"` scripts are CORS-restricted under `file://`, so the page
   would need a dev server) and a browser-only global (rejected because it is
   not importable from Node, so the module could not be unit-tested without a
   DOM shim).

3. **Rule set: minimal plus a custom-function escape hatch.** Ship `required`
   only. A rule is any `(value, allValues) => string | null`, so one-off rules
   are written inline at the call site. Alternatives offered and declined: a
   "common set" shipping `minLength`, `maxLength`, `pattern`, `email`, and
   `matches` up front. Rationale accepted: YAGNI — built-ins get added when a
   form needs one.

4. **Test infrastructure: `node:test`.** Node's built-in runner; `package.json`
   gains `"test": "node --test"`. Alternatives offered and declined: no tests
   at all, and a real framework (Jest/Vitest, rejected because it would add the
   repo's first dependencies and a config file).

5. **`required` trims before the emptiness check**, so a whitespace-only value
   fails. The user was told explicitly that this changes current behavior
   (today `"   "` passes) and chose it over preserving the existing behavior.

Also approved in the design walkthrough, stated to the user before the spec was
written:

- The return shape changes from `{valid, error}` (one flat string) to
  `{valid, errors: {field: message}}`, and `validateForm` is deleted as a page
  global.
- `index.html` gains `name` attributes on both inputs and a
  `<script src="src/validation.js">` tag before `app.js`.

## Constraints the user set

- No linter or formatter is introduced; unrelated files are not reformatted.
- Zero runtime dependencies.
- `index.html` must stay openable as a `file://` URL.
- No second form is built as part of this work.
