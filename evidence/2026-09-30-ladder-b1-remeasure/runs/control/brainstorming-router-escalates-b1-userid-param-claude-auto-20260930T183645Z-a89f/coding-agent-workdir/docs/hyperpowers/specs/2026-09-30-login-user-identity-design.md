# Login User Identity — Design

Date: 2026-09-30
Status: Awaiting review
Branch: `feature/webapp-enhancement`

## Problem

The original request was "add a `userId` parameter to the login function so we
can track who logged in." Clarification changed its shape: the identifier must
name the **actual user account**, must be readable from elsewhere in the app,
and must persist, because forms that do not exist yet will need it.

That makes the literal request impossible as stated. An account id is issued by
authentication, so `login()` must **return** it, not receive it. The call site
has nothing to pass — the form collects only a username and a password. This
design delivers the stated intent (a real account identity, available
app-wide) rather than the original wording.

## Current state

`app.js` is a single classic script holding three script-scoped globals:
`API_ENDPOINT` (declared, never used), `login(username, password)` (no network
call, hardcoded `{ success: true, user: username }`, no failure path), and
`validateForm`. Its only consumer is the submit handler in the same file.
`index.html` loads it with `<script src="app.js">`.

`src/index.js` and `src/utils.js` use CommonJS and are unrelated to the browser
app. `package.json` declares no `scripts`, no dependencies, and no `"type"`.
The repo has no test runner, linter, formatter, or build step.

## Decisions taken

These were settled with the human partner during brainstorming and constrain
everything below.

1. **Identity is a real account id**, not a per-attempt correlation id.
2. **Authentication stays stubbed but real-shaped.** `login()` makes no network
   call; it returns the shape a real response would, so the swap later touches
   one function. Defining a backend contract is out of scope.
3. **Persistence is `sessionStorage`**, behind an accessor that keeps the
   backing store swappable. No "remember me", no logout UI, no expiry policy —
   none were requested.
4. **ES modules, page served over http.** Losing `file://` double-click support
   is accepted. No bundler.
5. **Unit tests only.** No linter, no formatter, no end-to-end tests.
6. Approach A (layered) was chosen over a storage-only variant and an
   observable-store variant.

## Global constraints

- No third-party runtime or dev dependencies. Tests use Node's built-in runner.
- `src/index.js` and `src/utils.js` are not edited.
- No UI/markup changes beyond adding `type="module"` to the existing script tag.
- Reporting stays on `console.log` / `console.error`, as today.

## Architecture

Four modules, one responsibility each.

| File | Responsibility | Depends on |
|---|---|---|
| `auth.js` | Authenticate; own the stub and, later, the real `fetch` to `API_ENDPOINT`. Issues the account id. | nothing |
| `session.js` | Persist and expose the current identity. Sole owner of the storage key and the stored JSON shape. | `sessionStorage` |
| `validate.js` | Validate form field values. Pure; no DOM access. | nothing |
| `app.js` | DOM wiring: read the form, validate, call auth, hand the result to session, report. | the three above |

`validateForm` moves from `app.js` into `validate.js` unchanged. It is pure —
it takes a `{ username, password }` object and returns a verdict — so leaving
it in `app.js` would make it untestable for no benefit: `app.js` calls
`document.getElementById` at module scope, so Node cannot import it at all.

The two seams are deliberate and correspond to the two changes already known to
be coming: replacing the stub with real auth touches only `auth.js`; replacing
`sessionStorage` with another store touches only `session.js`.

### Auth response contract

```js
// success
{ ok: true,  user: { id: "u_3f9a2c", username: "alice" } }
// failure — the stub never returns this, but the shape is defined
{ ok: false, error: "Invalid credentials" }
```

`login` is `async` from the start. Real authentication is a network call; if
the stub were synchronous, every call site would have to change when `fetch`
arrives. One `await` now keeps that swap confined to one function.

The stub derives `id` deterministically from the username, so the same username
yields the same id within and across sessions, and different usernames yield
different ids. The derivation is a non-cryptographic hash of the username
rendered as a `u_`-prefixed hex string; it is a placeholder for a
server-assigned id and carries no security property.

### Storage contract

One namespaced key holding one JSON object:

```js
sessionStorage["webapp.session"] = '{"userId":"u_3f9a2c","username":"alice"}'
```

A single key rather than parallel keys, so identity is written and cleared
atomically and a later field adds no key.

`session.js` exports:

- `saveSession(user)` — writes `{ userId: user.id, username: user.username }`.
  Returns `true` on success, `false` if the write failed.
- `getSession()` — the stored object, or `null`.
- `getUserId()` — `getSession()?.userId ?? null`.
- `clearSession()` — removes the key.

Callers never reference `sessionStorage` or the key name. Future forms read
identity with `import { getUserId } from './session.js'`.

`session.js` reads `globalThis.sessionStorage` inside each function rather than
capturing it at import time. This lets tests install a fake storage object on
`globalThis` without dependency-injection plumbing in production code, and is
the same seam that later permits swapping to `localStorage`.

## Data flow

Submit handler in `app.js`:

1. `preventDefault`; read `#username` and `#password`.
2. `validateForm` — if invalid, report the error and stop. No auth call, no
   storage write.
3. `const res = await auth.login(username, password)`.
4. If `res.ok === false`: report `res.error`. Any existing session is left
   untouched.
5. If `res.ok === true`: `session.saveSession(res.user)`, then report success.

## Error handling

- **`sessionStorage` throws.** Safari private browsing and quota-exceeded both
  throw on write. `saveSession` catches, returns `false`, and login still
  succeeds — the identity simply does not persist. A degraded login beats a
  crashed submit handler.
- **Corrupt or absent stored JSON.** `getSession()` returns `null` when nothing
  is stored and, on a `JSON.parse` failure, removes the bad key and returns
  `null`. Callers get a single answer to "is there an identity" and never see a
  parse exception.
- **Auth failure.** Step 4 handles `{ ok: false }`. The stub never produces it,
  but the path exists so real auth does not arrive to find nothing handling it.

## Testing

Node's built-in runner via `"scripts": { "test": "node --test" }`. No install
step, no dependencies.

`session.test.js`:

- save then `getUserId` round-trips the id
- `getUserId` with nothing stored returns `null`
- corrupt stored JSON returns `null` **and** the key is removed
- `clearSession` removes the key
- a throwing storage write returns `false` and does not throw

`auth.test.js`:

- `login` resolves `{ ok: true }` with a `user.id` and `user.username`
- the same username yields the same id on repeated calls
- different usernames yield different ids

`validate.test.js`:

- a missing username is rejected with the "Missing required fields" error
- a missing password is rejected the same way
- both fields present returns valid

`app.test.js` is not created. `app.js` calls `document.getElementById` at
module scope, so Node cannot import it, and end-to-end tests were declined.

**Known coverage gap:** the wiring inside the submit handler (the sequence in
Data flow) has no automated coverage and is verified by hand.

## Node/browser module interop

`package.json` gains `"type": "module"` so Node can `import` the new ES
modules. To keep the CommonJS files working **without editing them**, a new
two-line `src/package.json` containing `{"type":"commonjs"}` scopes that
directory back to CommonJS. The browser does not read `package.json`; this is
purely for Node.

## Files touched

| File | Change |
|---|---|
| `auth.js` | new — stub authentication, issues the id |
| `session.js` | new — `sessionStorage` accessor |
| `validate.js` | new — `validateForm`, moved out of `app.js` so it is testable |
| `auth.test.js` | new |
| `session.test.js` | new |
| `validate.test.js` | new |
| `app.js` | rewritten as DOM wiring over the three modules |
| `index.html` | one line: `type="module"` on the script tag |
| `package.json` | add `"type": "module"` and a `test` script |
| `src/package.json` | new — `{"type":"commonjs"}` |
| `README.md` | one line: the page must be served, not opened via `file://` |

`src/index.js` and `src/utils.js` are not edited.

## Serving requirement

Once `app.js` is a module, `file://` no longer works — module scripts are
subject to CORS. The page must be served, e.g. `python3 -m http.server`, and
the README will say so.

## Out of scope

Real network authentication and its backend contract; logout UI and session
expiry; "remember me" / `localStorage` persistence; error UI beyond the console;
linting and formatting; end-to-end tests; any change to `src/`.
