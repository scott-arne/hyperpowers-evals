# Persistent User Tracking Id — Design

Date: 2026-09-30
Status: Approved in chat, pending written review
Branch: `feature/webapp-enhancement`

## Problem

The request was "add a `userId` parameter to the login function so we can
track who logged in." Two facts made the literal change the wrong one.

`login(username, password)` in `app.js` is called from exactly one place, the
form submit handler, which holds only the two form field values. Nothing in
the repository produces a `userId` for a caller to pass in, so a new parameter
would have to be filled with an invented value at its only call site.

More importantly, the identity is required to "work across the app and
persist, and other forms will need it later." That is not a function
parameter. It is a value that outlives a single call, survives page loads, and
has consumers that do not exist yet — which means it needs an owner, a storage
decision, and a stable interface for those future consumers to read.

## Goals

- A stable, opaque identifier for a browser, generated once and persisted
  across logins and browser restarts.
- Readable from anywhere in the app through one documented function, so forms
  unrelated to login can use it without depending on login.
- Present in log output so log lines can be correlated to a returning visitor.
- Impossible for the tracking code to break the login flow.

## Non-goals

These are deliberately excluded. Each is a clean addition on top of the
boundary described below, and none earns its keep yet.

- **Authentication and access control.** The id is descriptive telemetry only.
  It is client-generated and client-stored, so it is trivially forgeable and
  must never gate what a user may see or do.
- **Network transport.** Nothing is sent anywhere. The existing
  `API_ENDPOINT` constant remains an unused stub.
- **An analytics event layer.** No `track()` function, no event schema, no
  sink. Build it when there are real events and a real endpoint.
- **Per-login session ids, logout, or id rotation.** A per-login id can be
  added later as a second field without invalidating anything recorded under
  this one.
- **Changes to `src/`.** `src/index.js` and `src/utils.js` are unrelated
  CommonJS Node code. They are not touched.

## Global constraints

- **Unit tests via `node --test`.** Node's built-in runner; no dependencies
  added. The repository stays dependency-free.
- **No linter or formatter.** Declined for now; match the existing file style
  by hand (two-space indent, double-quoted strings, semicolons, as in
  `app.js`).
- **No end-to-end test infrastructure.** Declined as premature for a single
  stub form.
- Because Node unit tests must import the module, and `package.json` has no
  `"type"` field, new ES modules use the `.mjs` extension. Setting
  `"type": "module"` instead would break the CommonJS files in `src/`, which
  are out of scope.

## Identity semantics

The id answers "is this the same browser coming back," not "which login
session is this" and not "which human is this."

- **Opaque.** A UUID. It carries no username, no email, no PII.
- **Stable.** Generated once on first use, then reused indefinitely.
- **Per-browser.** Scoped to one browser profile on one device via
  `localStorage`. Two people sharing a browser share an id; one person on two
  devices has two. This is accepted: the alternative was storing the username,
  which puts PII in storage and in every log line.
- **Lazily created.** No id is generated for a visitor who never triggers a
  call, so merely loading the page does not mint one.

## Architecture

### `tracking.mjs` (new, repository root)

The single owner of the tracking identity and the only code that touches
storage. It sits beside `app.js` in the browser layer rather than in `src/`,
which is unrelated Node code.

Public interface — one function:

```js
export function getUserId()
```

Returns the stable id. Safe to call any number of times from anywhere;
repeated calls return the same value. Never throws.

Internals:

- A module-scope memo holds the resolved id. After the first call, later calls
  return it without touching storage.
- Storage key: `app.userId` in `localStorage`.
- Resolution order on first call: memo, then a valid stored value, then
  generate and attempt to persist.
- Id generation: `crypto.randomUUID()`, falling back to hex derived from
  `crypto.getRandomValues` when `randomUUID` is unavailable (it requires a
  secure context, so plain `http://` on a LAN address lacks it).
- Storage is reached through `globalThis.localStorage` rather than a captured
  reference, so tests can substitute a fake before importing the module.

### `app.js` (modified)

`login()` keeps its existing signature. It obtains the id itself rather than
receiving it, which is the point of the design: at the moment login runs, the
caller has nothing authoritative to pass.

```js
import { getUserId } from "./tracking.mjs";

function login(username, password) {
  const userId = getUserId();
  console.log("Logging in:", username, "userId:", userId);
  // Stub: would POST to API_ENDPOINT in real app
  return { success: true, user: username, userId };
}
```

`validateForm` and the submit handler are unchanged. The handler's existing
`console.log("Login result:", result)` now carries the id automatically,
because it is a field of the returned object.

Future forms call `getUserId()` directly. They do not read login's return
value — a form unrelated to authentication should not have to know login
exists.

### `index.html` (modified)

One attribute:

```html
<script src="app.js" type="module"></script>
```

The tag is already the last element in `<body>` and the form markup is parsed
before it, so the deferred execution that `type="module"` implies changes
nothing observable. Note that ES modules do not load over `file://`; viewing
the page requires a local static server, as any module-based page does.

### Data flow

```
form submit
  -> validateForm
  -> login(username, password)
       -> getUserId()
            -> memo hit
            -> else read localStorage["app.userId"]
            -> else generate UUID, write it back, memoize
       -> console.log with userId
       -> return { success, user, userId }
  -> console.log("Login result:", result)
```

## Error handling

The governing rule: **telemetry must never break login.** `getUserId()` has no
failure mode that propagates to its caller. It always returns a usable string.

| Condition | Behavior |
|---|---|
| `localStorage` read throws or is absent | Treat as no stored value; generate one. Wrapped in its own `try`/`catch`. |
| `localStorage` write throws (quota, blocked site data, private mode) | Keep the generated id in the memo and continue. Wrapped separately from the read, because a read can succeed where a write fails. |
| Write failed | Emit a one-time `console.warn` that the id could not be persisted. |
| Stored value is not a non-empty string | Treat as absent and regenerate. |
| `crypto.randomUUID` unavailable | Generate hex from `crypto.getRandomValues`. |

When persistence fails, the id remains stable for the lifetime of the page but
not across reloads. That degradation is announced rather than silent: without
the warning, every reload would look like a new visitor and the "stable
per-browser" numbers would quietly become meaningless. The warning fires once
per page, not once per call.

The id itself stays a bare UUID in every case. Tagging non-persistent ids with
a marker prefix was considered and rejected — nothing parses these values yet,
and a format decision baked into recorded log lines is expensive to reverse.

## Testing

`node --test`, with the suite in `test/tracking.test.mjs` and a `test` script
added to `package.json`.

Tests substitute a fake storage object on `globalThis.localStorage` before
importing the module. Because the memo lives in module scope, a test that
needs a fresh module state imports with a cache-busting query
(`await import("../tracking.mjs?case=N")`, relative to `test/`); this also
serves as the simulation of a page reload.

Cases:

1. Repeated calls within one module instance return the same id.
2. A fresh module instance with a populated store returns the stored id —
   the id survives a reload.
3. A fresh module instance with an empty store generates an id and writes it
   to the store.
4. Two fresh module instances with independent empty stores produce different
   ids.
5. A store whose `getItem` throws still yields a usable id and does not throw.
6. A store whose `setItem` throws still yields a usable id, does not throw,
   and warns exactly once across repeated calls.
7. A stored value that is an empty string is replaced by a freshly generated
   id.
8. Generated ids match the UUID shape.

`app.js` is not unit tested: it wires directly to `document` at import time,
and standing up a DOM harness for one stub form is not justified at this size.
The `login()`-returns-`userId` behavior is verified by reading the code during
review; if `app.js` later grows logic worth testing, extracting it from the
DOM wiring is the prerequisite and a separate change.

## Files touched

| File | Change |
|---|---|
| `tracking.mjs` | New. Owns id generation, persistence, and the `getUserId()` interface. |
| `app.js` | Add the import; `login()` resolves the id, logs it, and returns it. |
| `index.html` | Add `type="module"` to the existing script tag. |
| `test/tracking.test.mjs` | New. The eight cases above. |
| `package.json` | Add a `scripts.test` entry invoking `node --test`. |

`src/index.js`, `src/utils.js`, and `README.md` are untouched.

## Risks and accepted tradeoffs

- **A client-stored id is forgeable.** Accepted, because the id is telemetry
  only. This is the single most important constraint to preserve: if a later
  change makes an access decision based on this value, that change is a
  security bug, not a feature.
- **Clearing site data resets the id.** A returning visitor who clears storage
  looks new. Inherent to client-side storage; no mitigation is in scope.
- **`.mjs` must be served with a JavaScript MIME type.** Current static
  servers do this; some older ones do not. The alternative — setting
  `"type": "module"` — would break `src/`.
- **Shared browsers conflate users.** Stated under Identity semantics and
  accepted in exchange for storing no PII.
