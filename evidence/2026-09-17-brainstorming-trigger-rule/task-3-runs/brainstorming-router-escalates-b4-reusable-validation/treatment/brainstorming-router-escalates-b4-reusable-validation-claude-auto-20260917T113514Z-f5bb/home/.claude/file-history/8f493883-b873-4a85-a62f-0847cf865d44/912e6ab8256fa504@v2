# Approved design context — reusable form validation

Original user request, verbatim: "Make the form validation reusable across
multiple forms."

Repository state at the time of the request: a static webapp with one form.
`index.html` holds a single login form; `app.js` holds `API_ENDPOINT`, a stub
`login()`, a hardcoded `validateForm()`, and a submit listener. `src/index.js`
and `src/utils.js` are unrelated CommonJS scratch code. No build step, no
tests, no linter.

The following decisions were made by the user during brainstorming and are
settled. They are inputs to the review, not open questions.

1. **No second form exists yet.** The user was asked which other forms the
   layer must serve and answered "none concretely yet" — they want the login
   validation factored out so the next form is cheap, with no second consumer
   in hand. The design is therefore deliberately minimal and biased toward
   being cheap to replace.

2. **Declarative field schema** chosen for rule declaration, over a per-form
   validator function and over HTML constraint attributes.

3. **ES modules, web code only.** `app.js` and `validation.js` use ESM;
   `index.html` uses `<script type="module">`. `src/` stays CommonJS and is
   explicitly out of scope. The user accepted that the page must now be served
   over HTTP rather than opened from `file://`.

4. **Core plus a thin DOM binder**, with live/on-blur validation explicitly
   excluded. The user chose this over a pure core with no DOM involvement.

5. **Tooling:** unit tests only, using Node's built-in `node --test` runner
   with no dependencies. The user was offered lint+format and end-to-end tests
   alongside, and declined both. Consequently the binder's submit-event wiring
   has no automated coverage; the spec states this gap rather than hiding it.

Review guidance: findings that re-litigate decisions 1-5 above are out of
scope unless the decision makes the spec internally inconsistent or
unbuildable as written.
