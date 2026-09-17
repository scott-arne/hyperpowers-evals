# Global Constraints (verbatim from the plan; binding on every task)

- No new dependencies. `package.json` stays dependency-free.
- No linter, formatter, or test-runner infrastructure is added by this work. This is an explicit decision recorded in the spec, not an oversight.
- `src/index.js` and `src/utils.js` are not modified.
- Style: two-space indentation, double-quoted strings, semicolons.
- Commit messages contain no attribution or `Co-Authored-By` lines.
- Work lands on the current branch, `feature/webapp-enhancement`.

# Spec requirements this project demands (from the design doc)

- `settings.js` lives at the repository root, NOT in `src/`. `src/` is CommonJS
  and Node-side; browser ES modules there would mix two module systems in one
  directory.
- The exported `settings` object is frozen with `Object.freeze`, and its nested
  `endpoints` object is frozen too.
- `endpoints.login` is derived from `apiBaseUrl` by string interpolation, not
  written out as a second full URL. The whole point of the chosen shape is that
  a host change touches one line per environment.
- `resolveEnvironmentName` is exported separately from `settings` so it can be
  exercised without a browser.
- An unrecognized hostname resolves to `production`. This asymmetry is
  deliberate and is documented in the spec's Error Handling section.
- Import specifiers keep the `.js` extension. Native browser ES modules do not
  resolve extensionless specifiers.

# Stated relationships

- `app.js` consumes `settings.endpoints.login`; it must not reintroduce a local
  endpoint constant.
- `index.html` loads `app.js` as `type="module"`, and the script tag stays in
  its existing position after the form markup.
