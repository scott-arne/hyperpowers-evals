### Task 1: Settings module

**Risk tier:** standard — introduces a new module whose exported interface later code consumes, and establishes the repository's first ES-module pattern.

**Files:**
- Create: `settings.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `resolveEnvironmentName(hostname: string) => "development" | "production"` — named export, pure.
  - `settings` — named export, frozen object of shape `{ environment: "development" | "production", apiBaseUrl: string, endpoints: { login: string } }`. `endpoints` is frozen as well.

**Mirror:** `app.js:1-15` — imitate the comment-at-top style, two-space indent, double-quoted strings, semicolons, and the habit of returning plain values rather than throwing.

- [ ] **Step 1: Create `settings.js` with the complete content below**

```javascript
// Environment-specific API configuration. The environment is resolved once at
// load from the hostname, so switching environments needs no build step and no
// edit to application code.

const ENVIRONMENTS = {
  development: { apiBaseUrl: "https://api.dev.example.com" },
  production: { apiBaseUrl: "https://api.example.com" },
};

const DEV_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

// An unrecognized hostname resolves to production. An unknown host is far more
// likely to be a real deployment than an unconfigured dev machine, and pointing
// a real user's login at the development API is the worse of the two failures.
export function resolveEnvironmentName(hostname) {
  return DEV_HOSTNAMES.has(hostname) ? "development" : "production";
}

const environment = resolveEnvironmentName(window.location.hostname);
const { apiBaseUrl } = ENVIRONMENTS[environment];

export const settings = Object.freeze({
  environment,
  apiBaseUrl,
  endpoints: Object.freeze({
    login: `${apiBaseUrl}/login`,
  }),
});
```

- [ ] **Step 2: Verify the file parses as a module**

Run: `node --check settings.js`

Expected: exit status 0 with no output. (A syntax error exits 1 and prints the offending line.)

- [ ] **Step 3: Verify the development branch resolves correctly**

`settings.js` reads `window.location.hostname` at import time, so Node needs a `window` stub installed before the module is imported. A dynamic `import()` after assigning `globalThis.window` achieves that with no dependencies.

Run:

```bash
node --input-type=module -e "globalThis.window = { location: { hostname: 'localhost' } }; const m = await import('./settings.js'); console.log(m.settings.environment, m.settings.apiBaseUrl, m.settings.endpoints.login);"
```

Expected exactly:

```
development https://api.dev.example.com https://api.dev.example.com/login
```

- [ ] **Step 4: Verify the production branch and the unknown-host fallback**

Run:

```bash
node --input-type=module -e "globalThis.window = { location: { hostname: 'app.example.com' } }; const m = await import('./settings.js'); console.log(m.settings.environment, m.settings.endpoints.login); console.log(m.resolveEnvironmentName('127.0.0.1'), m.resolveEnvironmentName('[::1]'), m.resolveEnvironmentName('totally-unknown-host'));"
```

Expected exactly:

```
production https://api.example.com/login
development development production
```

The third value on the second line is the fallback: an unrecognized host resolves to `production`.

- [ ] **Step 5: Verify the settings object is frozen**

Run:

```bash
node --input-type=module -e "globalThis.window = { location: { hostname: 'localhost' } }; const m = await import('./settings.js'); try { m.settings.apiBaseUrl = 'mutated'; console.log('no throw'); } catch (e) { console.log('threw:', e.constructor.name); } console.log(m.settings.apiBaseUrl);"
```

Expected exactly:

```
threw: TypeError
https://api.dev.example.com
```

ES modules always run in strict mode, so writing to a frozen property throws rather than failing silently. Both lines matter: the `TypeError` proves the write was rejected, and the unchanged URL proves nothing was mutated. `no throw` on the first line means the `Object.freeze` call is missing.

- [ ] **Step 6: Commit**

```bash
git add settings.js
git commit -m "feat: add settings module for environment-specific API config"
```

---

