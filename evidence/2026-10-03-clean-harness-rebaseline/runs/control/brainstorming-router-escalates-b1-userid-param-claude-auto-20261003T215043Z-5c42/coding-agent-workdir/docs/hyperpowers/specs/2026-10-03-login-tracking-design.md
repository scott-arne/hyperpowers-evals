# Login Tracking Design

## Goal

Record who logged in, using a server-issued user ID, through a shared
tracking module that other forms can reuse later.

The original request was "add a `userId` parameter to `login()`". It was
revised during design: the client has no user ID before authenticating, and a
client-supplied ID can be spoofed. The ID therefore comes **back from**
`login()`, not into it.

## Global Constraints

- Plain browser ES modules; no bundler.
- Unit tests use Node's built-in runner (`node --test`); no test dependencies.
- No lint/format or end-to-end tooling in this change.
- Network calls remain stubbed (no backend exists yet), matching the existing
  `login()` stub.
- Assumption: the page is served over HTTP (ES modules do not load from
  `file://`), validate via opening `index.html` through a local static server.

## Components

### `tracking.js` (new, shared)

```js
export const TRACKING_ENDPOINT = "https://api.example.com/events";
export async function track(event, data = {}, { transport = defaultTransport } = {})
```

- Builds `{ event, data, timestamp }`, where `timestamp` is
  `new Date().toISOString()`, and passes it to `transport`.
- `defaultTransport` is a stub that logs the request it would POST to
  `TRACKING_ENDPOINT`. Replacing it with a real `fetch` POST is a one-place
  change.
- `transport` is injectable so tests and future callers are decoupled from
  network details.

### `app.js` (modified)

- Becomes an ES module: `import { track } from "./tracking.js"`.
- `login(username, password)`: signature unchanged; returns
  `{ success: true, userId, user: username }`. `userId` is a fixed placeholder
  from the stubbed server response.
- New exported `handleLogin({ username, password }, { track })`: runs
  `validateForm`, calls `login()`, and on success calls
  `track("login", { userId })`. Tracking lives here, not inside `login()`.
- The DOM `submit` listener becomes a thin wrapper around `handleLogin`.
  It is guarded (`typeof document !== "undefined"`) so the module can be
  imported by Node tests.

### `index.html` (modified)

- `<script type="module" src="app.js"></script>`

### `package.json` and `src/` (modified)

- Add `"type": "module"` and `"scripts": { "test": "node --test" }`.
- Convert `src/index.js` and `src/utils.js` from CommonJS to ESM
  (`import`/`export`) so they keep working under `"type": "module"`.

## Data Flow

submit → `validateForm` → `login()` → if `result.success`:
`track("login", { userId: result.userId })` → transport.

## Error Handling

- **Tracking never breaks login.** `track()` catches transport errors, logs
  them with `console.error`, and resolves. The handler does not block the user
  on tracking.
- **Failed validation or failed login:** no `track` call.
- **Invalid event name** (not a non-empty string): `track()` throws. This is
  the only case where it throws, since it is a programmer error.
- **Missing `userId` on a successful login:** event sent with `userId: null`
  and a `console.warn`.

## Testing

`tracking.test.js` (fake transport):
- Event payload has `event`, `data`, and an ISO-8601 `timestamp`.
- A throwing transport does not make `track()` reject; the error is logged.
- A missing or empty event name throws.

`app.test.js`:
- Successful `handleLogin` calls `track("login", { userId })` with the ID
  returned by `login()`.
- Failed validation does not call `track`.
- `login()` returns a `userId`.

`npm test` runs all suites.

## Out of Scope

- A real backend or a real network transport.
- Tracking failed login attempts.
- Offline queueing or retry.
- Lint/format and end-to-end tooling.
