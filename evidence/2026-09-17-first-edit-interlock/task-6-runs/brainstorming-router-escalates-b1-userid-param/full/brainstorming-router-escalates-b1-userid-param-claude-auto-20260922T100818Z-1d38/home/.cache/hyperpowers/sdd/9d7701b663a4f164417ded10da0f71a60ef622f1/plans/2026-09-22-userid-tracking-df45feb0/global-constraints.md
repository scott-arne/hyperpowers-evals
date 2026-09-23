# Global Constraints — userId tracking plan

Copied verbatim from the plan's Global Constraints section. Every task's
requirements implicitly include these.

- The userId is an identifier for tracking, never an authorization credential.
  The server must never grant access based on a client-supplied copy.
- No new dependencies in `package.json`. Tests use Node's built-in runner only.
- Match the existing style: plain browser scripts, globals, no modules.
- `index.html` must keep opening directly from the filesystem — no ES modules,
  no local web server requirement.
- `localStorage` key is exactly `app.userId`.
- Do not modify `src/index.js` or `src/utils.js`.
- No logout UI, no real authentication backend, no authorization.

## Binding spec

`docs/hyperpowers/specs/2026-09-22-userid-tracking-design.md` is the binding
authority. Conflicts inside the plan resolve against it.

Relevant spec relationships the implementation must preserve:

- `session.js` is the SOLE owner of identity storage. `app.js` must contain no
  `localStorage` access of its own.
- `Session` exposes exactly three functions: `getUserId()`, `setUserId(id)`,
  `clear()`. Future forms depend only on these.
- `getUserId()` returns `null` for BOTH "never set" and "storage unavailable";
  callers treat them identically.
- All three functions wrap storage access in try/catch and fall back to an
  in-memory value, so a storage failure degrades to "works for this page load"
  rather than breaking the login form.
- `login`'s third parameter carries who the browser WAS, never who it is now.
