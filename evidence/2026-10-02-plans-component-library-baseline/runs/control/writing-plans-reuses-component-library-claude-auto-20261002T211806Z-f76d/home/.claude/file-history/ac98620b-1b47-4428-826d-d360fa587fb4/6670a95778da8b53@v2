# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page listing the pipeline's recent deploys, filterable by environment and sortable by service or start time, so whoever is on call can spot a failed or rolled-back deploy.

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)`, built entirely from the vendored component library in `src/ui/` (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `statusChip`, `emptyState`). `src/server.js` gets a `/deploys` route reading the `deploys` snapshot, which inherits the existing 503 handling, and `src/layout.js` gets a "Deploys" nav link after "Services".

**Tech Stack:** Node ≥ 20, ES modules, `node:test` + `node:assert/strict`, no dependencies.

## Global Constraints

- Node `>=20`, no dependencies (`package.json` `engines`, README "No dependencies; Node 20 or later.").
- Tests run with `node --test` (`npm test`).
- Route is `/deploys`; nav label is exactly `Deploys`, placed after `Services`.
- Build the page from `src/ui/` (import from `../ui/index.js`). Do **not** copy `src/pages/services.js`: it hand-rolls its own escaping, `<select>`, `.pill` chips and table, and is not the pattern for new pages.
- Do not edit files under `src/ui/` (`src/ui/index.js:1-2`: "Keep local edits small so template updates still apply."). No change to `public/` is needed; the template CSS already styles `ui-table`, `ui-chip--*`, `ui-filter-bar`, `ui-empty`.
- Copy, verbatim from the spec: header `Deploys`; filter options `All environments`, `production`, `staging`; columns `Service`, `Version`, `Environment`, `Status`, `Started`, `Duration`, `Author`; in-progress duration `running`; duration format like `4m 12s`; empty state `No deploys in <environment>`; error `Snapshot unavailable`.
- Status → chip tone: `succeeded` → `ok` (green), `failed` → `bad` (red), `rolled-back` → `warn` (amber), `in-progress` → `info` (blue) (`public/harbor.css:2,23-26`).
- Query params: `env` ∈ {`production`, `staging`}, default all; `sort` ∈ {`service`, `startedAt`}, default `startedAt`; `dir` ∈ {`asc`, `desc`}, default `desc`. Any other value falls back to that parameter's default, independently of the others.
- Changing the filter keeps the current sort; changing the sort keeps the filter.
- Out of scope: details page, pagination, live refresh, actions on a deploy.

## Grounding

- Page module shape (named `render<Page>(snapshot, query)` export, header comment documenting query params, whitelist-then-default query parsing): `src/pages/services.js:1-7` (shape only — not its markup).
- Component-library page composition (`pageHeader` with `Snapshot ${generatedAt}` subtitle, `statusChip` tone mapped at the call site): `src/pages/overview.js:1-23`.
- Table with sortable headers, `sortHref`, and `empty` replacement: `src/ui/table.js:3-56`; its test shape `test/ui/table.test.js:19-31`.
- Filter form that keeps sort state and autosubmits: `src/ui/filter-bar.js:3-21`, `src/ui/select.js:3-21`, `public/harbor.js:1-5`; test `test/ui/select.test.js:5-25`.
- Status chips and tones: `src/ui/chip.js:3-15`; empty state: `src/ui/empty-state.js:3-12`.
- Escaping: `src/ui/escape.js:1-9` (`dataTable` already escapes non-`render` cells; `render` output is trusted HTML).
- Routing, snapshot reads, 503 error handling: `src/server.js:14-39`; snapshot loader `src/data.js:9-11` (JSON parse errors are thrown inside the same `try`).
- Nav: `src/layout.js:3-12`.
- Naming: camelCase functions, `UPPER_CASE` module constants (`src/pages/services.js:3`, `src/server.js:11-17`).
- Page test shape (inline snapshot fixture, `assert.match` / `indexOf` ordering): `test/pages/services.test.js:1-37`.
- Server test shape (`handle(url, { dataDir })`, missing-dir 503): `test/server.test.js:1-19`.
- Malformed-JSON snapshot test: `none: no existing test writes a bad snapshot file`; Task 3 uses `node:fs/promises` `mkdtemp` + `writeFile` in `os.tmpdir()`.

---

### Task 1: Deploys page renders the table

**Risk tier:** standard — new page module plus its test file.

**Files:**
- Create: `src/pages/deploys.js`
- Create: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: `pageHeader`, `dataTable`, `statusChip` from `src/ui/index.js` (signatures in `src/ui/page-header.js:10`, `src/ui/table.js:20-26`, `src/ui/chip.js:12`).
- Produces: `export function renderDeploys(snapshot, query = {}): string` where `snapshot` is `{ generatedAt: string, deploys: Array<{ id, service, version, environment, status, startedAt: string, finishedAt: string | null, author }> }`. Task 1 ignores `query`; Task 2 implements it.

**Mirror:** `src/pages/overview.js:1-23` for composing a page from `../ui/index.js`.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`. The fixture is deliberately not in newest-first order, so the default sort is actually exercised.

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-1038', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-1042', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1040', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
    { id: 'd-1041', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'dana' },
  ],
};

// Service names in row order; Service is the first column.
function serviceOrder(html) {
  return [...html.matchAll(/<tr><td>([^<]*)<\/td>/g)].map((m) => m[1]);
}

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
});

test('has the spec columns in order', () => {
  const html = renderDeploys(snapshot, {});
  const labels = [...html.matchAll(/<th[^>]*>(?:<a [^>]*>)?([A-Za-z]+)/g)].map((m) => m[1]);
  assert.deepEqual(labels, ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
});

test('lists newest deploys first by default', () => {
  assert.deepEqual(serviceOrder(renderDeploys(snapshot, {})), ['search', 'api-gateway', 'notifications', 'billing']);
});

test('colors each status with its chip tone', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="ui-chip ui-chip--ok">succeeded<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--bad">failed<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--info">in-progress<\/span>/);
});

test('formats duration as minutes and seconds, and running while in progress', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL — `Cannot find module '.../src/pages/deploys.js'`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/pages/deploys.js`:

```js
import { dataTable, pageHeader, statusChip } from '../ui/index.js';

// Recent deploys from the pipeline's snapshot, newest first.
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

const COLUMNS = [
  { key: 'service', label: 'Service', sortable: true },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => statusChip(d.status, TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true },
  { key: 'duration', label: 'Duration', render: duration },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query = {}) {
  const table = dataTable({
    columns: COLUMNS,
    rows: snapshot.deploys,
    sort: { key: 'startedAt', dir: 'desc' },
  });
  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${table}`;
}

// "4m 12s"; a deploy still in progress has no finishedAt yet.
function duration(deploy) {
  if (deploy.finishedAt == null) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer: `startedAt` values are ISO-8601 UTC strings of identical shape, so `dataTable`'s string comparison orders them chronologically. `duration` output contains only digits, letters and spaces, so it is safe as trusted HTML. An unknown `status` falls through to `statusChip`'s `muted` default.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS, 24 tests (19 existing + 5 new).

- [ ] **Step 6: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys page: render the deploy table"
```

---

### Task 2: Environment filter, sorting, empty state, query fallback

**Risk tier:** standard — query parsing and state-preserving links on the page module.

**Files:**
- Modify: `src/pages/deploys.js` (whole file shown below)
- Modify: `test/pages/deploys.test.js` (append tests)

**Interfaces:**
- Consumes: `renderDeploys` and `COLUMNS` / `TONES` / `duration` from Task 1; `filterBar`, `selectField`, `emptyState` from `src/ui/index.js` (`src/ui/filter-bar.js:15`, `src/ui/select.js:13`, `src/ui/empty-state.js:9`).
- Produces: `renderDeploys(snapshot, query)` now honours `query.env`, `query.sort`, `query.dir` (strings, as built by `Object.fromEntries(searchParams)` in `src/server.js:38`). Sort links are absolute: `/deploys?[env=<env>&]sort=<key>&dir=<dir>`.

**Mirror:** `test/ui/table.test.js:19-28` and `test/ui/select.test.js:20-25` for asserting header links and kept hidden inputs.

- [ ] **Step 1: Write the failing tests**

Append to `test/pages/deploys.test.js`:

```js
test('filters by environment and marks the chosen option', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.deepEqual(serviceOrder(html), ['api-gateway', 'notifications']);
  assert.match(html, /<select name="env" class="ui-select" data-autosubmit>/);
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /<option value="">All environments<\/option>/);
});

test('defaults the filter to all environments', () => {
  assert.match(renderDeploys(snapshot, {}), /<option value="" selected>All environments<\/option>/);
});

test('the filter keeps the current sort', () => {
  const html = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<input type="hidden" name="sort" value="service">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
});

test('sorts by service both ways', () => {
  assert.deepEqual(serviceOrder(renderDeploys(snapshot, { sort: 'service', dir: 'asc' })), ['api-gateway', 'billing', 'notifications', 'search']);
  assert.deepEqual(serviceOrder(renderDeploys(snapshot, { sort: 'service', dir: 'desc' })), ['search', 'notifications', 'billing', 'api-gateway']);
});

test('sorts by start time both ways', () => {
  assert.deepEqual(serviceOrder(renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' })), ['billing', 'notifications', 'api-gateway', 'search']);
  assert.deepEqual(serviceOrder(renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' })), ['search', 'api-gateway', 'notifications', 'billing']);
});

test('sort links flip the active column and keep the filter', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?env=staging&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\/deploys\?env=staging&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
});

test('sort links omit env when showing all environments', () => {
  assert.match(renderDeploys(snapshot, {}), /<a href="\/deploys\?sort=service&amp;dir=asc">Service<\/a>/);
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="ui-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'sideways' });
  assert.deepEqual(serviceOrder(html), ['search', 'api-gateway', 'notifications', 'billing']);
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
});

test('falls back per parameter, keeping the valid ones', () => {
  const html = renderDeploys(snapshot, { env: 'staging', sort: 'service', dir: 'sideways' });
  assert.deepEqual(serviceOrder(html), ['search', 'billing']);
});
```

(The last test: valid `env=staging` and `sort=service` survive, unknown `dir` falls back to `desc`, so staging rows sort by service descending.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL — the new filter/sort/empty/fallback tests fail (no `<select>`, query ignored); the 5 Task 1 tests still pass.

- [ ] **Step 3: Implement query handling**

Replace `src/pages/deploys.js` with:

```js
import { dataTable, emptyState, filterBar, pageHeader, selectField, statusChip } from '../ui/index.js';

// Recent deploys. Filter with ?env=production|staging, sort with
// ?sort=service|startedAt and ?dir=asc|desc (newest first by default).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = ['service', 'startedAt'];
const DIRS = ['asc', 'desc'];
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

const COLUMNS = [
  { key: 'service', label: 'Service', sortable: true },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => statusChip(d.status, TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true },
  { key: 'duration', label: 'Duration', render: duration },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query = {}) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : '';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = DIRS.includes(query.dir) ? query.dir : 'desc';

  const deploys = env ? snapshot.deploys.filter((d) => d.environment === env) : snapshot.deploys;

  const filter = filterBar({
    action: '/deploys',
    fields: [
      selectField({
        name: 'env',
        label: 'Environment',
        options: [{ value: '', label: 'All environments' }, ...ENVIRONMENTS.map((e) => ({ value: e, label: e }))],
        value: env,
      }),
    ],
    keep: { sort, dir },
  });

  const table = dataTable({
    columns: COLUMNS,
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => {
      const params = new URLSearchParams(env ? { env } : {});
      params.set('sort', key);
      params.set('dir', next);
      return `/deploys?${params}`;
    },
    empty: emptyState({ title: env ? `No deploys in ${env}` : 'No deploys' }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filter}
${table}`;
}

// "4m 12s"; a deploy still in progress has no finishedAt yet.
function duration(deploy) {
  if (deploy.finishedAt == null) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer: "All environments" uses `value=""`, so submitting it sends `env=`, which the whitelist treats as all. `dataTable` escapes the `sortHref` result, which is why the tests expect `&amp;`. `"No deploys"` covers an empty snapshot with no filter, which the spec does not word explicitly.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 15 tests.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS, 34 tests.

- [ ] **Step 6: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys page: environment filter, sorting, empty state"
```

---

### Task 3: `/deploys` route and nav link

**Risk tier:** standard — multi-file integration (router, layout, server tests).

**Files:**
- Modify: `src/server.js:7-17` (import + route)
- Modify: `src/layout.js:3-6` (nav entry)
- Modify: `test/server.test.js` (append tests, add imports)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query)` from Task 2; `handle(url, { dataDir })` from `src/server.js:21`.
- Produces: `GET /deploys` → 200 page titled `Deploys · Harbor`; 503 `Snapshot unavailable` when `data/deploys.json` is missing or unparseable.

**Mirror:** `test/server.test.js:6-19` for route and 503 tests.

- [ ] **Step 1: Write the failing tests**

In `test/server.test.js`, add these imports at the top alongside the existing ones:

```js
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
```

Append:

```js
test('renders the deploys page with its nav link after Services', async () => {
  const res = await handle('/deploys');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>search<\/td>/);
});

test('passes the query to the deploys page', async () => {
  const res = await handle('/deploys?env=production');
  assert.match(res.body, /<option value="production" selected>/);
  assert.doesNotMatch(res.body, /<td>staging<\/td>/);
});

test('answers 503 when the deploys snapshot is missing', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /Snapshot unavailable/);
});

test('answers 503 when the deploys snapshot is unreadable', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'harbor-'));
  await writeFile(join(dataDir, 'deploys.json'), '{"generatedAt": ');
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /Snapshot unavailable/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL — the four new tests get status 404 instead of 200/503.

- [ ] **Step 3: Add the route and nav link**

In `src/server.js`, add the import after the overview import:

```js
import { renderDeploys } from './pages/deploys.js';
```

and the route after `/services`:

```js
const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
};
```

In `src/layout.js`:

```js
const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
];
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS, 8 tests.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS, 38 tests.

- [ ] **Step 6: Check it in the browser**

Run: `npm start`, open `http://localhost:3000/deploys`. Confirm: nav shows Overview · Services · Deploys with Deploys current; the `search` row has a blue `in-progress` chip and `running`; choosing "staging" reloads with `?env=staging&sort=startedAt&dir=desc`; clicking "Service" then sorts A→Z and keeps `env=staging`. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Add the /deploys route and nav link"
```
