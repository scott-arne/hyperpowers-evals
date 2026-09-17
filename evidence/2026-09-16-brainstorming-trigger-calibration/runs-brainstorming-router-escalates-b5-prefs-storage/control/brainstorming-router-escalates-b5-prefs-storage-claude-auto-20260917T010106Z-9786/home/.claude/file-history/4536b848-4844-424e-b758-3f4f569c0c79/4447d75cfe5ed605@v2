# Approved design decisions (brainstorming session, 2026-09-16)

Original request, verbatim:

> Add user preferences storage so settings persist across sessions.

Decisions the user explicitly made. These are settled; do not re-litigate them
as findings unless the spec is internally inconsistent with one of them.

1. **Storage location — device-local `localStorage`, single shared key.**
   Chosen over (a) `localStorage` namespaced by logged-in username and
   (b) server-backed per-account storage. Rationale accepted by the user:
   `login()` is a stub with no session or token, so there is no authenticated
   identity to scope preferences to; username-keying would imply a guarantee
   the code cannot make.

2. **Preferences in scope — remember-username AND theme (light/dark).**
   Chosen over a generic store with no settings wired. This means user-visible
   UI is in scope, not only a storage module.

3. **Module approach — approach A: classic global script + single JSON blob.**
   Chosen over (B) flat per-setting `localStorage` keys and (C) an
   injectable-storage CommonJS core under `src/` with a browser adapter.
   Rationale accepted by the user: A matches the existing `app.js` style
   (plain globals, no module system); B was rejected because defaults would be
   restated at each call site and drift, with no versioning story; C was
   rejected because coupling the browser app to the currently-unrelated `src/`
   CLI tree is a larger structural commitment than two preferences justify.

4. **Tooling — unit tests via Node's built-in `node:test` only.**
   The user explicitly declined a linter/formatter and declined end-to-end
   tests. Zero new dependencies is a hard constraint. Note the consequence the
   user accepted: the pre-paint theme flash is a rendering-timing property no
   Node test can observe, so it is verified by hand.

5. **Out of scope, confirmed:** `login()` stays a stub; no authentication
   work; `src/index.js` and `src/utils.js` are untouched; no backend or
   network calls.

Design sections presented in chat and approved individually by the user:
module/data-model/error-handling (section 1), UI behavior (section 2), and
tooling/testing (section 3). The spec is the written form of those three
approved sections.
