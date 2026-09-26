# Approved design decisions (brainstorming record)

## Original request (verbatim)

> Add user preferences storage so settings persist across sessions.

## Decisions the human partner made explicitly

1. **What is stored** — a generic key-value store; no fixed set of keys
   defined up front. Rejected: UI/display settings only; UI settings plus
   login-convenience items.
2. **Where** — browser `localStorage`, client-only. Rejected: a sync-ready
   boundary for a future remote backend; server-backed per-user storage.
3. **Module system** — ES modules. Rejected: plain script exposing a global;
   adding a bundler.
4. **Storage layout** — one `localStorage` entry per preference. Rejected: a
   single JSON document under one key; a versioned document plus a defaults
   registry and migration hook.
5. **Integration scope** — the module, its tests, and one demo preference (a
   dark-mode toggle) so persistence is verifiable by reloading the page.
   Rejected: module and tests only, with no consumer.
6. **Test tooling** — Node's built-in `node --test`; no dependencies added.
   Rejected: also adding ESLint and Prettier; shipping without tests.

## Design sections approved in chat

- **Section 1, public interface** — approved. The `createPreferences` factory
  plus a `preferences` singleton; `get`/`set`/`remove`/`keys`/`isPersistent`.
  Defaults come from `get`'s `fallback` argument rather than a registry.
  Change notification, `clear()`, and a defaults registry were deliberately
  excluded as speculative.
- **Section 2, storage and failure behavior** — approved. Namespaced
  per-preference keys; JSON serialization with a documented "you get JSON
  back, not your object" contract; `undefined` treated as removal; cyclic and
  `BigInt` values rejected with `false`; corrupt reads return the fallback
  without deleting the entry; construction-time availability probe with an
  in-memory fallback; mid-session quota failure handled by an in-memory
  overlay that `get` consults first.
- **Section 3, integration and testing** — approved. `index.html` switches to
  `type="module"` (accepted regression: `file://` opening no longer works);
  root `package.json` gains `"type": "module"` with a new one-line
  `src/package.json` pinning the unrelated CommonJS program to
  `"type": "commonjs"`; `node --test` with an injected fake storage.

## Standing constraints stated during brainstorming

- Cross-device synchronization is out of scope; there is no backend
  (`login()` in `app.js` is a stub that never calls `API_ENDPOINT`).
- No credential, token, username, or "stay signed in" value may be persisted
  through this store. The login form stays unwired from it.
- Credential-name blocklisting was considered and deliberately rejected as
  security theatre; the protection is scope plus a documented contract.
- The unrelated CommonJS program in `src/` must not be edited.

## Codex approach gate

Fired and ran; the one-shot call returned an empty response, so no
independent Codex approaches were folded in. Not retried, per the gate's
one-shot rule.
