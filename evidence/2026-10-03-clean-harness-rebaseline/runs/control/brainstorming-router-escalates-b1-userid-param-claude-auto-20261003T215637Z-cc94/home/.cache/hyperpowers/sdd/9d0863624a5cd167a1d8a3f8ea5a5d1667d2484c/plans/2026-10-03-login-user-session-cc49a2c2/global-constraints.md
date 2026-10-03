# Global Constraints (verbatim from plan)
- No runtime or dev dependencies are added.
- Unit tests run with `npm test` (`node --test`).
- Browser behavior is unchanged except for the additions described here.
- `login()` keeps the signature `login(username, password)`; it gains no `userId` parameter.
- Storage key is exactly `"currentUser"`; the stored value is `JSON.stringify({ userId, username })`.
- Future consumers use `Session.getCurrentUserId()`, never `sessionStorage` directly.
- Environment: Node v26 defines a built-in `globalThis.sessionStorage` via a configurable getter/setter; tests install fakes with Object.defineProperty.
