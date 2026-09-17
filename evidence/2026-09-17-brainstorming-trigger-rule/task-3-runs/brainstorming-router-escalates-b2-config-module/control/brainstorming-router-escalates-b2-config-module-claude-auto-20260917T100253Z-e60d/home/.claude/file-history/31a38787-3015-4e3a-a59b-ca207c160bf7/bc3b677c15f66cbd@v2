# Settings Module Design

Date: 2026-09-17
Status: Approved design, pending implementation plan

## Problem

The API endpoint is a literal embedded in application code:

```js
// app.js line 2
const API_ENDPOINT = "https://api.example.com/login";
```

Changing environments means editing application logic. There is no place in the
repository that answers "what endpoint does each environment use?" and no way to
run the same source against a different backend.

## Goal

Move the API endpoint configuration out of `app.js` into a dedicated settings
module, so that switching environments is a single edit in an obvious location
rather than a change to application code.

## Non-goals

- Implementing a real network request. `login()` remains a stub that logs and
  returns `{ success: true, user: username }`. Its behavior does not change.
- Introducing a bundler, transpiler, or build step.
- Sharing configuration with the CommonJS `src/` tree. That half of the
  repository has no configuration today and is out of scope.
- Adding secrets management. The endpoints here are public URLs.

## Context

The repository contains two disjoint halves that do not interoperate:

- **Browser half** (root): `index.html` loads `app.js` via a plain
  `<script src="app.js">` tag. No module system, no `process.env`, no bundler.
- **Node half** (`src/`): `index.js` and `utils.js` use CommonJS
  (`require`/`module.exports`). Never loaded by the browser.

`package.json` declares no dependencies, no scripts, and no test runner.

The configuration to be moved lives in the browser half — the half with no
module system. This constrains the design more than the size of the change
suggests.

## Decisions

Each decision below was presented with alternatives and approved.

### D1. Environment source: hostname detection

The settings module maps `window.location.hostname` to an environment.

Chosen because it requires no build tooling and no deploy choreography, and it
keeps every environment's configuration visible in one readable file. The page
remains a set of static files.

Rejected alternatives:

- *Deploy-time file swap* — correctness moves into the deploy process, and the
  source no longer answers which environment is which.
- *Build-time injection* — the standard answer at scale and the only one that
  keeps non-production endpoints out of the shipped artifact, but it introduces
  an entire toolchain for one string.
- *Runtime injected global* — one artifact across environments, but
  configuration lives partly outside the repository.

Migration note: every rejected alternative also ends with `app.js` reading a
named settings value rather than a literal. Switching later is a contained
change to `settings.js` alone.

### D2. Module format: plain global script

`settings.js` loads via its own `<script>` tag and exposes one global. `app.js`
reads it directly.

Chosen because `app.js` is already global-scope script code, and because
`type="module"` is fetched under CORS rules, which would break opening
`index.html` from disk and require a local dev server.

Accepted cost: one global, and load order in `index.html` becomes load-bearing.
Mitigated by D5.

### D3. Scope: browser only

`src/index.js` and `src/utils.js` are not modified. Making `settings.js`
reachable from CommonJS would require a dual-format file or a bundler, for
configuration the Node half does not use.

### D4. Unknown-hostname behavior: warn and fall back to local

An unrecognized hostname emits a `console.warn` naming the hostname and resolves
to the `local` environment.

Chosen for asymmetry of harm: this is a login form. An unrecognized preview or
test host silently authenticating against production is a materially bad
outcome; an unreachable development endpoint is an immediate, obvious, cheap
diagnosis.

Accepted cost: a genuinely new production hostname would be quietly wrong rather
than loudly broken. The `console.warn` is what makes this detectable, and is
therefore required, not decorative.

### D5. Config shape: `apiBaseUrl`, path owned by the caller

Settings stores the host portion per environment. `app.js` owns the `/login`
path.

Chosen because the host is what varies across environments; the path does not.
Storing complete URLs would duplicate `/login` across all three entries, which
rots as soon as a second endpoint exists.

## Design

### File layout

```
settings.js      (new)  -- browser half, beside app.js
app.js           (edit) -- constant removed, reads settings
index.html       (edit) -- one script tag added
test/settings.test.js (new) -- hostname resolution tests
package.json     (edit) -- test script
```

### Loading

`index.html` gains one tag, ordered before the existing one:

```html
<script src="settings.js"></script>
<script src="app.js"></script>
```

### Module contract

`settings.js` is an IIFE that assigns exactly one global, a frozen object:

```js
window.APP_SETTINGS = Object.freeze({
  environment: "local" | "staging" | "production",
  apiBaseUrl:  "https://..."
});
```

`Object.freeze` is deliberate: settings are readable everywhere and writable
nowhere. Runtime mutation of configuration is always a bug.

Internally the module holds two tables, both at the top of the file so that
changing an environment is a one-line edit in an obvious place:

- `ENVIRONMENTS` — environment name to its configuration.
- `HOSTNAMES` — hostname to environment name.

### Resolution algorithm

1. Read `window.location.hostname`.
2. Look it up in `HOSTNAMES`.
3. On a hit, resolve to that environment.
4. On a miss, `console.warn` naming the unrecognized hostname, then resolve to
   `local`.
5. Freeze and assign the result to `window.APP_SETTINGS`.

### `app.js` changes

- Delete line 2, the `API_ENDPOINT` literal.
- `login()` derives its URL from `window.APP_SETTINGS.apiBaseUrl` plus the
  `/login` path. The function remains a stub; no network call is added.
- Add a startup guard: if `window.APP_SETTINGS` is undefined — the script tag is
  missing or failed to load — log a clear error naming the cause rather than
  failing on an obscure property access. This is the direct cost of D2 and is
  required, not optional.

### Error handling summary

| Condition | Behavior |
|---|---|
| Known hostname | Resolve to its environment |
| Unknown hostname | `console.warn` with the hostname; resolve to `local` |
| `settings.js` not loaded | `app.js` logs a clear startup error |
| Attempted mutation of settings | Silently ignored (frozen object) |

## Testing

Hostname resolution is the only logic here, and a wrong fallback is precisely
the class of bug that stays invisible until it is expensive. It gets tests.

Browser-only scope (D3) means `settings.js` cannot be `require`d. Tests use
Node's built-in `node:test` with `node:vm`, evaluating `settings.js` against a
fabricated `window` object. Zero dependencies, no bundler.

Cases:

- Each hostname in `HOSTNAMES` resolves to its expected environment and
  `apiBaseUrl`.
- An unrecognized hostname resolves to `local`.
- An unrecognized hostname emits a warning naming the hostname.
- The exported settings object is frozen.

`package.json` gains a `test` script invoking `node --test`.

No linter or formatter is being added; that was considered and declined as
broader than this task.

## Assumptions

- *Assumption:* the environments are `local` (`localhost`, `127.0.0.1`),
  `staging`, and `production`. *Validate via:* user confirmation.
- *Assumption:* the real staging and production hostnames are not derivable from
  this repository and will ship as clearly-marked placeholders. *Validate via:*
  user supplying the actual hostnames before deployment.
- *Assumption:* `https://api.example.com` is the production API base, inferred
  from the current literal. *Validate via:* user confirmation.

## Risks

- Placeholder hostnames left unfilled would cause staging and production to
  silently resolve to `local` under D4. The `console.warn` is the mitigation,
  and the placeholders are marked in-file.
- Script ordering in `index.html` is load-bearing under D2. The startup guard in
  `app.js` converts a silent failure into a clear one.
