# Approved design decisions (brainstorming)

Original user request, verbatim: "Make the form validation reusable across
multiple forms."

Decisions the human partner made and approved during brainstorming. These are
settled inputs to the spec, not open questions:

1. **Driver:** general reuse. No second form exists or is scheduled.
2. **Scope of capability:** a minimal engine — declarative field-to-rules map,
   per-field error results, only the `required` rule. A starter rule library
   (minLength, email, pattern, custom predicates) and a third-party validation
   library (zod/yup/valibot) were both considered and explicitly rejected.
3. **Module loading:** dual export — CommonJS `module.exports` when available,
   otherwise a browser global. Native ES modules and browser-global-only were
   both considered and explicitly rejected (ESM breaks `file://` and clashes
   with the CommonJS in `src/`; global-only would make the engine untestable
   in Node).
4. **Display:** out of scope. Validation logic only; the login form's on-page
   behavior is unchanged.
5. **Tooling:** unit tests via Node's built-in `node:test` with
   `"test": "node --test"`. ESLint/Prettier explicitly not adopted in this
   change. No end-to-end, fuzz, or mutation testing.
6. **Accepted behavior change:** the human partner was shown, and accepted,
   that failure logging changes from the single generic string
   `Validation error: Missing required fields` to field-specific messages. No
   on-page behavior changes.

The design was presented in two sections in chat and approved by the human
partner ("looks good, go ahead") before the spec was written.

## Codebase facts

- `index.html` (15 lines): one form `#login-form`, inputs `#username`,
  `#password`; loads `app.js` via a bare `<script src="app.js">` at line 13.
- `app.js` (28 lines): `API_ENDPOINT`, stub `login()`, file-local
  `validateForm()` (only call site is the submit handler in the same file),
  and the `submit` listener. Failures go to `console.error` only.
- `src/index.js`, `src/utils.js`: CommonJS, unrelated to forms.
- `package.json`: `"main": "src/index.js"`, no scripts, no dependencies, no
  devDependencies.
- No bundler, transpiler, test runner, linter, or formatter anywhere.
- Git branch `feature/webapp-enhancement`, working tree clean.
