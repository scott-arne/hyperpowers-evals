# Client-Side Session Identity — Design

Date: 2026-09-30
Status: Approved for planning
Branch: `feature/webapp-enhancement`

## Problem

The webapp has no notion of who is using it. `login` (`app.js:4`) is a stub
that logs the typed username to the console and returns it; nothing outlives
the function call. The originating request was "add a `userId` parameter to the
login function so we can track who logged in," but the requirement behind it is
broader: the identity must **identify who logged in, persist, and be readable
across the app**, because forms that do not exist yet will need it.

A parameter cannot satisfy that. A parameter is an input, and the only caller
(`app.js:23`) has no identifier to pass that it did not already type into the
username field. The identity is something login *establishes*, and the missing
piece is somewhere to put it.

## Scope

In scope:

- A persistent, app-wide client-side identity store.
- Recording the identity when login succeeds.
- An explicit logout path that clears it.
- Unit-test infrastructure and coverage for the store.

Out of scope:

- Real authentication. `login` remains a stub; `API_ENDPOINT` is still not
  contacted.
- Changing the `login` signature. It stays `login(username, password)`.
- Server-side session management, tokens, or cookies.
- Lint/format tooling and end-to-end tests (considered and declined).

## Global Constraints

1. **The stored identity is self-asserted, not authenticated.** It is whatever
   the user typed into a text input. No server vouches for it, and any user can
   set it to any value via devtools. It is suitable for display, greeting, and
   client-side convenience. It must not gate authorization, and it must not be
   treated as an audit trail, until a backend is vouching for the value. Every
   future consumer is bound by this.
2. **No new runtime dependencies.** `package.json` has none today; the design
   keeps it that way. The test runner is Node's built-in `node:test`
   (Node v26 confirmed present).
3. **No build step and no bundler.** Browser code is loaded as classic scripts,
   as it is today.
4. **`file://` development keeps working.** Opening `index.html` directly must
   continue to function; this is why ES modules were rejected.
5. **`AppSession` methods never throw.** Failure is reported as `null`, never
   as an exception.
6. Testing scope for this work: **unit tests only** (chosen from lint/format,
   unit, e2e, fuzz).

## Approaches Considered

Three approaches to how shared code reaches future pages, given that
`index.html:13` loads `app.js` as a classic script with no bundler:

| Approach | Buys | Costs | Verdict |
|---|---|---|---|
| **A. Namespaced global, classic scripts** | No tooling change; works from `file://`; matches existing code | One global; implicit script load order | **Chosen** |
| **B. Native ES modules** | Real module boundaries; no globals | Module scripts are blocked over `file://`, forcing a local HTTP server; adds a third module convention beside CommonJS `src/` | Rejected — workflow cost without a matching benefit at this size |
| **C. Build toolchain (npm + bundler)** | Conventional; easy deps and runners | A build step, `node_modules`, and config for a page with one form | Rejected — disproportionate today |

The session module's public interface is identical under all three, so
migrating A → B or A → C later changes how the file is *loaded*, not what it
does. That reversibility is why the lightest option is not a trap.

A Codex approach consultation was attempted per the brainstorming approach
gate. Preflight reported `ok`, but the resolved companion was a `0.0.0-stub`
build (version `0.0.0-stub`) and the call returned an empty payload. Per the
gate, an incomplete call degrades as absence: no independent approaches were
obtained, and the shortlist above is unaided.

## Architecture

A new `session.js`, loaded before `app.js`:

```html
<script src="session.js"></script>
<script src="app.js"></script>
```

It is an IIFE exposing a single namespaced global, `window.AppSession`.

### Interface

| Method | Returns | Behavior |
|---|---|---|
| `set(username)` | record, or `null` if rejected | Writes the identity record, replacing any existing one |
| `get()` | record or `null` | Reads and validates the record |
| `getUserId()` | string or `null` | Convenience accessor for `record.userId` |
| `clear()` | `void` | Removes the record — this is logout |
| `onChange(fn)` | unsubscribe fn | Invokes `fn` on cross-tab `storage` events for this key |

### Stored representation

Key: `appSession.identity`. Value: a JSON record, not a bare string.

```json
{
  "v": 1,
  "userId": "alice",
  "loginAt": "2026-09-30T14:02:11.000Z",
  "source": "client-asserted"
}
```

Two fields carry weight beyond the obvious:

- **`v`** — `localStorage` outlives deploys. Without a version, the first schema
  change meets records written by the previous code with no way to distinguish
  them. Unrecognized versions are treated as absent rather than coerced.
- **`source`** — records in the data itself that no server vouched for this
  value. When real authentication lands it writes `"server"`, and consumers
  that care about trust can discriminate. This is the seam for the backend
  swap.

`set` rejects a username that is not a non-empty string after trimming: it
stores nothing, leaves any existing record untouched, and returns `null`. This
keeps a record from ever holding an empty or non-string `userId`, which would
otherwise force every consumer to re-validate what it reads. `validateForm`
already blocks empty submissions today, so this is defense in depth rather than
the primary guard.

### Storage access

The module reads storage through an injectable reference defaulting to
`globalThis.localStorage`, and ends with a guarded CommonJS export tail
(`if (typeof module !== "undefined") module.exports = ...`). These are the only
two concessions the production file makes to testability, and together they let
the suite run under `node:test` with a fake store rather than jsdom.

## Data Flow

1. The submit handler validates input via `validateForm` (unchanged).
2. `login(username, password)` runs — still the stub, still returns
   `{ success, user }`.
3. On success, **the submit handler** calls `AppSession.set(result.user)`.
4. Any later form reads `AppSession.getUserId()`.
5. A logout control calls `AppSession.clear()`.

The handler records the identity rather than `login` doing it, so the
network-call function does not also own persistence. When `login` later becomes
async and returns a server-assigned id, only the handler changes.

Because "an explicit logout" is not real unless something can invoke it, the
change includes a minimal `<button id="logout">` in `index.html` wired to
`clear()`. It is a functional affordance, not a styled UI.

## Error Handling

`localStorage` is the failure surface, and it fails in several distinct ways:

| Failure | Handling |
|---|---|
| Access throws (Safari private browsing; site data blocked) | Caught; module falls back to an in-memory record for the tab |
| Quota exceeded on write | Caught; value retained in memory; `set` still returns the record |
| Malformed JSON under the key | Key cleared; `get()` returns `null` |
| Missing or unrecognized `v` | Treated as absent; key cleared |
| Key absent | `get()` returns `null` |

The contract, relied upon by every consumer: **`AppSession` methods never
throw, and `get`/`getUserId` return `null` for every failure mode.** Callers
handle one case — "no identity" — rather than five.

Rationale for the in-memory fallback: an unguarded `localStorage` access in
Safari private browsing raises an exception that propagates out of the submit
handler and kills the login flow. Failing to persist is a far better outcome
than failing to log in.

## Testing

Runner: `node --test`, wired as `"scripts": { "test": "node --test" }` in
`package.json`. No dependencies added.

Suite: `test/session.test.js`.

| Test | What it protects |
|---|---|
| `set` → `get` round trip | The happy path |
| `get()` on empty storage returns `null` | The most common real state |
| `clear()` removes the record | Logout actually works |
| Corrupt JSON returns `null` and clears the key | Self-healing without throwing |
| Unknown `v` treated as absent | The versioning earns its place |
| Storage access throws → in-memory fallback, no throw | The Safari-private case |
| Quota error on write → no throw, value readable in-tab | Graceful degradation |
| `onChange` fires on a `storage` event | Cross-tab synchronization |
| `set("")` / `set("   ")` / non-string rejected, prior record intact | The `userId` invariant holds |

Deliberately not covered: the DOM submit handler and the logout button.
Exercising those requires jsdom or a browser driver, reintroducing the
dependency and setup that were explicitly declined. The logic worth protecting
lives in `session.js` and is fully covered; the handler stays thin enough to
read directly.

## Files Touched

| File | Change |
|---|---|
| `session.js` | New — the session module |
| `test/session.test.js` | New — the unit suite |
| `app.js` | Handler records identity on success; logout wiring. `login` signature unchanged |
| `index.html` | Two script tags; logout button |
| `package.json` | `test` script |

## Open Risks

- **Self-asserted identity may be misread as authenticated.** Mitigated by the
  `source` field, the module header comment, and Global Constraint 1 — but
  mitigation is documentation, and documentation is not enforcement. The real
  fix is a backend, which is out of scope here.
- **Script load order is implicit.** `session.js` must precede `app.js`. Under
  approach A this is a convention, not something the runtime enforces. A future
  page that omits the tag fails at first use with an undefined global.
