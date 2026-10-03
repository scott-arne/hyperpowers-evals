Global Constraints (verbatim from plan/spec):
- No build step, no bundler; scripts stay classic `<script src>` tags.
- No new dependencies. Tests use Node's built-in `node:test`.
- `session.js` is the only code that touches `localStorage`.
- The password is never logged.
