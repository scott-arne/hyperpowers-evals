# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists recent deploys from `data/deploys.json`, filterable by environment and sortable by service or start time, so whoever is on call can spot a failed or rolled-back deploy.

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)` like the other pages. It is assembled from the vendored Keel kit components already in the repo (`#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge`, `#kit/empty`) rather than hand-rolling the table, sort headers, filter form and chips the way `src/pages/services.js` does — the kit components produce the same query-string behavior (`?env=`, `?sort=`, `?dir=`, filter keeps sort, sort keeps filter) with far less code. `src/server.js` gets a route and `src/layout.js` a nav entry; the existing 503 path in `handle()` covers the missing-snapshot case with no new code.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`, kit imports through the `#kit/*` subpath map in `package.json`.

## Global Constraints

- Route is `/deploys`; nav label is "Deploys", placed directly after "Services".
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Data comes from `data/deploys.json` (snapshot name `deploys`), shape `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`; `finishedAt` is `null` while in progress.
- Header text "Deploys", with the snapshot time under it.
- Environment dropdown options, in order: "All environments" (default), "production", "staging". Changing it reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author.
- Default order newest first (Started, descending). Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration is `finishedAt` minus `startedAt` as minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty filter result shows "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as other pages.
- Unknown `env`, `sort` or `dir` values fall back to the defaults.
- Tests use `node --test`; no new dependencies (`package.json` stays dependency-free).

## Grounding

- Page module shape and naming (`renderX(snapshot, query)`, leading comment documenting query params, module-level allowlists): `src/pages/services.js:5-16`.
- Query fallback to defaults via allowlists (error handling for bad input): `src/pages/services.js:14-16`.
- Snapshot-time subtitle wording ("Snapshot <generatedAt>"): `src/pages/overview.js:29`.
- Missing-snapshot error handling (503 "Snapshot unavailable"), already generic over routes: `src/server.js:32-41`.
- Route table entry shape: `src/server.js:17-23`.
- Nav entry shape and order: `src/layout.js:3-9`.
- Kit import style (`import { button } from '#kit/button';`): `src/pages/services.js:1-2`; subpath map `package.json:6-8`.
- Kit components to reuse: `pageHeader` `vendor/kit/page-header/src/lib/page-header.js:10-14`; `filterBar` (with `keep` for hidden sort/dir) `vendor/kit/filter-bar/src/lib/filter-bar.js:15-21`; `selectField` (auto-submit via `data-autosubmit`, handled by `public/kit.js:7-10`) `vendor/kit/select/src/lib/select.js:13-21`; `dataTable` (sorting, sort headers with `aria-sort` and ▲/▼, empty slot) `vendor/kit/table/src/lib/table.js:20-69`; `badge` (tones ok/bad/warn/info → green/red/amber/blue per `public/kit.css:2,19-24`) `vendor/kit/badge/src/lib/badge.js:12-15`; `emptyState` `vendor/kit/empty/src/lib/empty.js:9-12`.
- Page rendering test shape (fixture snapshot at top, one `test()` per behavior, `assert.match` on exact HTML fragments, `indexOf` for ordering): `test/pages/services.test.js:1-47`.
- Server test shape (`handle()` called directly, 503 via a nonexistent `dataDir`): `test/server.test.js:6-25`.
- Duration formatting: `none: no existing time/duration formatting helper in the repo`.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new module composing several kit components; behavior is spread across filter, sort, chips, duration and empty state.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: kit components, exact signatures:
  - `pageHeader({ title, subtitle })` → `<header class="kit-page-header"><div><h1>…</h1><p class="kit-muted">…</p></div></header>`
  - `selectField({ name, label, options: [{value, label}], value })`
  - `filterBar({ action, fields: string[], keep: Record<string,string> })` → GET form with one hidden input per `keep` entry
  - `dataTable({ columns: [{key, label, sortable?, render?}], rows, sort: {key, dir}, sortHref: (key, nextDir) => string, empty })` — sorts rows itself; escapes `sortHref` output (so `&` becomes `&amp;`); returns `empty` when `rows` is empty
  - `badge(label, tone)` with tone `'ok' | 'bad' | 'warn' | 'info'` → `<span class="kit-badge kit-badge--<tone>">label</span>`
  - `emptyState({ title })` → `<div class="kit-empty"><p class="kit-empty__title">title</p></div>`
- Produces: `export function renderDeploys(snapshot, query)` → HTML string (the page body; `src/server.js` wraps it in the layout). `query` is a plain object of query params, possibly empty.

**Mirror:** `src/pages/services.js:5-16` for the module comment, allowlist constants and fallback logic; `test/pages/services.test.js` for test shape.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`. The fixture is deliberately not in start-time order so the default sort is actually exercised. Version strings are unique per row, so they serve as row markers.

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
    { id: 'd-1041', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
  ],
};

// Asserts the given cell texts all appear, in this order.
function assertOrder(html, cells) {
  const positions = cells.map((c) => html.indexOf(`<td>${c}</td>`));
  assert.ok(positions.every((p) => p !== -1), `missing one of ${cells.join(', ')}`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
}

test('shows the header with the snapshot time and the columns in order', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
  const headers = [...html.matchAll(/<th[^>]*>(?:<a [^>]*>)?([A-Za-z]+)/g)].map((m) => m[1]);
  assert.deepEqual(headers, ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
});

test('lists deploys newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assertOrder(html, ['1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3']);
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
});

test('sorts by start time oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assertOrder(html, ['2.9.0-rc.3', '0.9.3', '0.9.4', '1.23.0-rc.1']);
  assert.match(html, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sorts by service both ways and keeps the sort in the filter form', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assertOrder(az, ['2.9.0-rc.3', '0.9.3', '1.23.0-rc.1']);
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  assert.match(az, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assertOrder(za, ['1.23.0-rc.1', '0.9.3', '2.9.0-rc.3']);
  assert.match(za, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('shows how long each deploy took, or that it is still running', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('filters by environment and keeps it when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<option value="all">All environments<\/option><option value="production" selected>production<\/option><option value="staging">staging<\/option>/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /<td>notifications<\/td>/);
  assert.doesNotMatch(html, /<td>search<\/td>|<td>billing<\/td>/);
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<option value="staging" selected>/);
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assertOrder(html, ['1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL — `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

- [ ] **Step 3: Write the implementation**

Create `src/pages/deploys.js`:

```js
import { badge } from '#kit/badge';
import { emptyState } from '#kit/empty';
import { filterBar } from '#kit/filter-bar';
import { pageHeader } from '#kit/page-header';
import { selectField } from '#kit/select';
import { dataTable } from '#kit/table';

// Recent deploys. Filter with ?env=production|staging; sort with
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending,
// so newest first).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = ['service', 'startedAt'];
const STATUS_TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : 'desc';

  const deploys = env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

  // The bar carries the sort so filtering keeps it.
  const filters = filterBar({
    action: '/deploys',
    fields: [
      selectField({
        name: 'env',
        label: 'Environment',
        value: env,
        options: [{ value: 'all', label: 'All environments' }, ...ENVIRONMENTS.map((e) => ({ value: e, label: e }))],
      }),
    ],
    keep: { sort, dir },
  });

  const table = dataTable({
    columns: [
      { key: 'service', label: 'Service', sortable: true },
      { key: 'version', label: 'Version' },
      { key: 'environment', label: 'Environment' },
      { key: 'status', label: 'Status', render: (d) => badge(d.status, STATUS_TONES[d.status]) },
      { key: 'startedAt', label: 'Started', sortable: true },
      { key: 'duration', label: 'Duration', render: duration },
      { key: 'author', label: 'Author' },
    ],
    rows: deploys,
    sort: { key: sort, dir },
    // The sort links carry the filter so sorting keeps it.
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filters}
${table}`;
}

// Minutes and seconds from start to finish, such as "4m 12s".
function duration(deploy) {
  if (deploy.finishedAt === null) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `dataTable` does the sorting; do not pre-sort. Its sort is stable, so rows that tie on service keep snapshot order.
- `sortHref` returns a raw `&`; `dataTable` escapes it to `&amp;`. Do not escape it yourself or you get `&amp;amp;`.
- The "No deploys" title for the all-environments case is not in the spec (the spec only covers an empty filter result); it covers an empty snapshot without inventing new copy beyond dropping the environment name.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 9 tests.

Then the whole suite: `npm test`
Expected: PASS, 27 tests (18 existing + 9 new), 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the Deploys page renderer"
```

---

### Task 2: Route, nav link and README

**Risk tier:** standard — multi-file integration (server route, layout nav, README) with a server test; small, but it is the wiring that makes the page reachable.

**Files:**
- Modify: `src/server.js:8-23` (import and route)
- Modify: `src/layout.js:3-9` (nav entry)
- Modify: `README.md:16-18` (page list)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query)` from `src/pages/deploys.js` (Task 1).
- Produces: `GET /deploys` → 200 page titled "Deploys · Harbor" with the Deploys nav link current; 503 "Snapshot unavailable" when `deploys.json` cannot be read.

**Mirror:** `test/server.test.js:6-25` for test shape; `src/server.js:17-23` and `src/layout.js:3-9` for entry shape.

- [ ] **Step 1: Write the failing tests**

In `test/server.test.js`, add `'/deploys'` to the nav loop so the existing test reads:

```js
test('serves every page in the nav', async () => {
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
    assert.equal((await handle(path)).status, 200, path);
  }
});
```

Then append these two tests at the end of the file:

```js
test('renders the deploys page inside the layout, linked after Services', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>search<\/td>/);
});

test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

(`search` is a staging deploy in the committed `data/deploys.json`.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL — `/deploys` returns 404 in all three tests.

- [ ] **Step 3: Wire the route and nav**

In `src/server.js`, add the import in alphabetical position (after line 7, before `renderIncidents`):

```js
import { renderDeploys } from './pages/deploys.js';
```

and add the route after `/services` so `ROUTES` reads:

```js
const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
  '/incidents': { title: 'Incidents', snapshot: 'incidents', render: renderIncidents },
  '/oncall': { title: 'On-call', snapshot: 'oncall', render: renderOncall },
  '/runbooks': { title: 'Runbooks', snapshot: 'runbooks', render: renderRunbooks },
};
```

In `src/layout.js`, make `NAV` read:

```js
const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
  { href: '/incidents', label: 'Incidents' },
  { href: '/oncall', label: 'On-call' },
  { href: '/runbooks', label: 'Runbooks' },
];
```

In `README.md`, change line 16 from:

```
Overview, Services, Incidents, On-call and Runbooks, one module each in
```

to:

```
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module each in
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS, 7 tests.

Then: `npm test`
Expected: PASS, 29 tests, 0 failures.

Manual check: `npm start`, open `http://localhost:3000/deploys`; confirm the Deploys link sits after Services, the chips are colored, changing the environment dropdown reloads with `?env=` while keeping the sort, and clicking Service/Started flips the sort while keeping the filter.

- [ ] **Step 5: Commit**

```bash
git add src/server.js src/layout.js README.md test/server.test.js
git commit -m "Route /deploys and link it in the nav"
```
