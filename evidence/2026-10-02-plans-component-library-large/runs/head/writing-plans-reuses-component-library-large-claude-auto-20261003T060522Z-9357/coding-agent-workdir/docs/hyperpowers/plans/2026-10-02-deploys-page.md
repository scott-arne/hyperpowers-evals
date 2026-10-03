# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists the last 50 deploys from `data/deploys.json`, with an environment filter, sorting by service or start time, colored status chips and durations, so whoever is on call can spot a failed or rolled-back deploy without opening the pipeline.

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)` like every other page. It is built from the vendored Keel kit components (`#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge`, `#kit/empty`), which already implement the Services page's sort-header, filter-form and empty-state behavior, instead of copying the hand-written markup in `src/pages/services.js`. `src/server.js` gets a route and `src/layout.js` a nav entry after "Services"; the existing 503 handling in `handle()` covers the missing-snapshot case with no new code.

**Tech Stack:** Node ≥ 20 ES modules, no dependencies; `node --test` with `node:assert/strict`; vendored kit imported through the `#kit/*` alias in `package.json`.

## Global Constraints

- Route is `/deploys`; nav label "Deploys", placed immediately after "Services".
- Read-only. Out of scope: deploy details page, pagination, live refresh, any action on a deploy.
- Header text "Deploys", with the snapshot time under it.
- Environment dropdown options: "All environments" (default), "production", "staging". Choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author.
- Default order: newest first. Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt` minus `startedAt` in minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json`: the same 503 "Snapshot unavailable" page as other pages.
- Unknown `env`, `sort` or `dir` falls back to the default.
- Tests run with `node --test` (`npm test`); no new dependencies.

## Grounding

- Page module shape and query parsing: `src/pages/services.js:5-21`, `renderServices(snapshot, query)` validates `env`/`sort`/`dir` against allow-lists and falls back to defaults.
- Sort header behavior (active column flips, others start ascending, links carry the filter): `src/pages/services.js:30-38`; the kit reimplements exactly this in `vendor/kit/table/src/lib/table.js:46-56`.
- Kit data table (columns, `render`, `sort`, `sortHref`, `empty`): `vendor/kit/table/src/lib/table.js:3-44`.
- Kit status chip with tones `ok|warn|bad|info|muted`: `vendor/kit/badge/src/lib/badge.js:3-15`; tone colors (ok green `#1a7f37`, warn amber `#9a6700`, bad red `#cf222e`, info blue `#0969da`) in `public/kit.css:2,19-24`.
- Kit filter form with hidden `keep` inputs: `vendor/kit/filter-bar/src/lib/filter-bar.js:3-21`; labeled select that autosubmits: `vendor/kit/select/src/lib/select.js:3-21`, wired by `public/kit.js:8-9`.
- Kit page title row with subtitle: `vendor/kit/page-header/src/lib/page-header.js:3-14`.
- Kit empty state: `vendor/kit/empty/src/lib/empty.js:3-12`.
- Kit import style in a page: `src/pages/services.js:1-3` (`import { button } from '#kit/button';`).
- UTC timestamp formatting: `src/core/format/timestamp.js:1-7` (`formatTimestamp(iso)` → `"2026-10-01 09:30 UTC"`).
- HTML escaping in pages: `src/html.js:1-8` (`escapeHtml`).
- Routing and 503 on unreadable snapshot: `src/server.js:43-94`.
- Nav list: `src/layout.js:3-34`.
- Page rendering test shape: `test/pages/services.test.js:1-47` (inline snapshot, `assert.match` on exact HTML fragments, `indexOf` for order).
- Server test shape: `test/server.test.js:6-32`.
- E2E tests walk every nav link against `test/e2e/fixtures/{empty,single}/` and a missing dir: `test/e2e/empty.test.js:8-16`, `test/e2e/single.test.js:8-16`, `test/e2e/missing.test.js:8-15`; fixture format `test/e2e/fixtures/empty/services.json`, `test/e2e/fixtures/single/services.json`.
- Error handling: none needed in the page; the server's `try/catch` around `readSnapshot` (`src/server.js:84-92`) is the only error path and is reused unchanged.
- Duration formatting: `none: no existing duration formatter in src/core/format/`; the plan adds a private one in the page module.

## Decisions an implementer should not re-litigate

- **Kit over hand-rolled markup.** The spec asks for the Services page's *behavior*, not its markup. The kit's `dataTable` header links, `filterBar` hidden inputs and `selectField` options produce the same behavior. HTML fragments therefore differ from Services (`kit-table`, `kit-badge`, `kit-filter-bar`); tests assert the kit fragments.
- **Defaults:** `env` = `all`, `sort` = `startedAt`, `dir` = `desc`. `dir` is `asc` only when the query says exactly `asc`; anything else (including missing) is `desc`. Sort-header links always carry an explicit `dir`, so this only matters for hand-edited URLs.
- **Sort ties** keep snapshot order (newest first) because `Array.prototype.sort` is stable; no secondary key.
- **Started column** shows `formatTimestamp(startedAt)` (e.g. "2026-10-01 09:05 UTC"); sorting still compares the raw ISO `startedAt`.
- **Snapshot time** renders as the header subtitle `Snapshot 2026-10-01 09:30 UTC`.
- **Unknown status** values render a `muted` (grey) chip; the kit badge already falls back to `muted` for an unknown tone.
- **Assumption:** with "All environments" selected and no deploys at all, the empty state reads "No deploys" (the spec only defines the message for a chosen environment). Validate via your human partner's plan review, before Task 1.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module composing six kit components; behavior is spec-defined and fully tested here.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: `badge(label, tone)`, `emptyState({ title })`, `filterBar({ action, fields, keep })`, `pageHeader({ title, subtitle })`, `selectField({ name, label, options, value })`, `dataTable({ columns, rows, sort, sortHref, empty })` from `#kit/*`; `formatTimestamp(iso)` from `src/core/format/timestamp.js`; `escapeHtml(value)` from `src/html.js`.
- Produces: `export function renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string, string>): string` where `Deploy = { id, service, version, environment, status, startedAt: string, finishedAt: string | null, author }`. Task 2 registers it as the `/deploys` route's `render`.

**Mirror:** `src/pages/services.js:5-21` for the header comment and query fallback; `test/pages/services.test.js:1-47` for test shape.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-1042', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1041', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-1040', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
    { id: 'd-1038', service: 'billing', version: '2.9.0', environment: 'production', status: 'failed', startedAt: '2026-10-01T07:00:00Z', finishedAt: '2026-10-01T07:03:05Z', author: 'ana' },
  ],
};

test('shows the title and the snapshot time', () => {
  assert.match(
    renderDeploys(snapshot, {}),
    /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01 09:30 UTC<\/p>/,
  );
});

test('lists the columns in order, newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  const headers = [...html.matchAll(/<th[^>]*>(?:<a [^>]*>)?([^<▲▼]+)/g)].map((m) => m[1].trim());
  assert.deepEqual(headers, ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
  assert.ok(html.indexOf('<td>1.23.0-rc.1</td>') < html.indexOf('<td>0.9.4</td>'));
  assert.ok(html.indexOf('<td>0.9.4</td>') < html.indexOf('<td>2.9.0</td>'));
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
  assert.match(html, /<td>2026-10-01 09:05 UTC<\/td>/);
});

test('sorts by start time both ways and keeps the sort in the filter form', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.ok(oldest.indexOf('<td>2.9.0</td>') < oldest.indexOf('<td>1.23.0-rc.1</td>'));
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
  assert.match(oldest, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(oldest, /<input type="hidden" name="dir" value="asc">/);
  const newest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' });
  assert.ok(newest.indexOf('<td>1.23.0-rc.1</td>') < newest.indexOf('<td>2.9.0</td>'));
});

test('sorts by service both ways', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.ok(az.indexOf('<td>billing</td>') < az.indexOf('<td>notifications</td>'));
  assert.ok(az.indexOf('<td>notifications</td>') < az.indexOf('<td>search</td>'));
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  assert.match(az, /<input type="hidden" name="sort" value="service">/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.ok(za.indexOf('<td>search</td>') < za.indexOf('<td>billing</td>'));
  // Ties keep the snapshot's newest-first order.
  assert.ok(za.indexOf('<td>0.9.4</td>') < za.indexOf('<td>0.9.3</td>'));
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
  assert.match(html, /<td>3m 5s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('filters by environment and keeps it when sorting', () => {
  const production = renderDeploys(snapshot, { env: 'production' });
  assert.match(production, /<option value="production" selected>production<\/option>/);
  assert.doesNotMatch(production, /<td>search<\/td>/);
  assert.match(production, /<td>billing<\/td>/);
  assert.match(production, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
  assert.match(production, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const staging = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(staging, /No deploys in staging/);
  assert.doesNotMatch(staging, /<table/);
  assert.match(staging, /<option value="staging" selected>/);
  const none = renderDeploys({ ...snapshot, deploys: [] }, {});
  assert.match(none, /No deploys/);
  assert.doesNotMatch(none, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
  assert.ok(html.indexOf('<td>1.23.0-rc.1</td>') < html.indexOf('<td>2.9.0</td>'));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

- [ ] **Step 3: Write the implementation**

Create `src/pages/deploys.js`:

```js
import { badge } from '#kit/badge';
import { emptyState } from '#kit/empty';
import { filterBar } from '#kit/filter-bar';
import { pageHeader } from '#kit/page-header';
import { selectField } from '#kit/select';
import { dataTable } from '#kit/table';
import { formatTimestamp } from '../core/format/timestamp.js';
import { escapeHtml } from '../html.js';

// Recent deploys. Filter with ?env=production|staging; sort with
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending,
// so the newest deploy comes first).
const ENVIRONMENTS = ['production', 'staging'];
const SORTABLE = ['service', 'startedAt'];
const STATUS_TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTABLE.includes(query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' ? 'asc' : 'desc';

  const deploys =
    env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

  const header = pageHeader({
    title: 'Deploys',
    subtitle: `Snapshot ${formatTimestamp(snapshot.generatedAt)}`,
  });

  // The bar keeps the sort, and the sort links carry the filter, so changing
  // one never drops the other.
  const filters = filterBar({
    action: '/deploys',
    fields: [
      selectField({
        name: 'env',
        label: 'Environment',
        value: env,
        options: [
          { value: 'all', label: 'All environments' },
          ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
        ],
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
      {
        key: 'startedAt',
        label: 'Started',
        sortable: true,
        render: (d) => escapeHtml(formatTimestamp(d.startedAt)),
      },
      { key: 'duration', label: 'Duration', render: (d) => formatDuration(d.startedAt, d.finishedAt) },
      { key: 'author', label: 'Author' },
    ],
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${header}
${filters}
${table}`;
}

// "4m 12s" from start to finish. finishedAt is null while the deploy runs.
function formatDuration(startedAt, finishedAt) {
  if (!finishedAt) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `dataTable` escapes `sortHref`'s return value, which is why the tests expect `&amp;` in the links.
- `dataTable` sorts the rows itself from `sort`; do not pre-sort.
- `SORTABLE.includes(...)` (not an object lookup) keeps `?sort=constructor` from matching a prototype key.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 9 tests.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS (the page is not routed yet, so nothing else changes).

- [ ] **Step 6: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys: render the page from the kit components"
```

---

### Task 2: Route, nav link and e2e fixtures

**Risk tier:** standard — multi-file integration (server, layout, fixtures, README) that changes what every nav-walking e2e test exercises.

**Files:**
- Modify: `src/server.js:32` (import) and `src/server.js:45` (route, after `/services`)
- Modify: `src/layout.js:5` (nav entry, after Services)
- Modify: `test/server.test.js:6-32`
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`
- Modify: `README.md:17-18`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1).
- Produces: `GET /deploys` → 200 page titled "Deploys · Harbor"; 503 "Snapshot unavailable" when `deploys.json` is unreadable; nav link `<a href="/deploys">Deploys</a>` directly after Services.

**Mirror:** `src/server.js:45` (route entry), `src/layout.js:5` (nav entry), `test/server.test.js:6-12,27-32` (route and 503 tests), `test/e2e/fixtures/{empty,single}/services.json` (fixture format).

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, add `'/deploys'` to the `paths` list in `'serves every page in the nav'`, right after `'/services'`:

```js
  const paths = [
    '/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
    '/clusters', '/databases', '/queues', '/jobs', '/certificates', '/domains',
    '/costs', '/capacity', '/slos', '/maintenance', '/changes', '/flags',
    '/backups', '/tokens', '/teams', '/audit', '/endpoints', '/regions',
    '/vendors', '/status', '/reports', '/secrets', '/webhooks',
  ];
```

Then add these two tests after `'renders the services page inside the layout'`:

```js
test('renders the deploys page inside the layout, after Services in the nav', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>1\.23\.0-rc\.1<\/td>/);
  assert.doesNotMatch(res.body, /<td>0\.9\.4<\/td>/);
});

test('answers 503 for deploys when its snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

(`1.23.0-rc.1` is the staging deploy `d-1042` and `0.9.4` the production deploy `d-1041` in `data/deploys.json`.)

- [ ] **Step 2: Run the server tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL — `'serves every page in the nav'` reports `404 !== 200` for `/deploys`, and both new tests fail on status 404.

- [ ] **Step 3: Add the route and nav entry**

In `src/server.js`, add the import in alphabetical position (after `renderDatabases`):

```js
import { renderDeploys } from './pages/deploys.js';
```

and the route right after `/services` in `ROUTES`:

```js
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

In `src/layout.js`, add the nav entry right after Services:

```js
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 4: Run the server tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS.

- [ ] **Step 5: Run the e2e tests to see the missing fixtures fail**

Run: `node --test test/e2e/`
Expected: FAIL in `empty.test.js` and `single.test.js` with `503 !== 200` for `/deploys` (no `deploys.json` in their fixture dirs). `missing`, `navigation`, `queries` and `titles` pass.

- [ ] **Step 6: Add the e2e fixtures**

Create `test/e2e/fixtures/empty/deploys.json`:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [

  ]
}
```

Create `test/e2e/fixtures/single/deploys.json` (an in-progress deploy, so the `finishedAt: null` path is exercised for `undefined`/`NaN`):

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [
    { "id": "d-1042", "service": "search", "version": "1.23.0-rc.1", "environment": "staging", "status": "in-progress", "startedAt": "2026-10-01T09:05:00Z", "finishedAt": null, "author": "priya" }
  ]
}
```

- [ ] **Step 7: Update the README's page list**

In `README.md`, change:

```
One module per page in `src/pages/`: Overview, Services, Incidents, On-call
and Runbooks, then the estate pages from Alerts to Webhooks. `src/server.js`
```

to:

```
One module per page in `src/pages/`: Overview, Services, Deploys, Incidents,
On-call and Runbooks, then the estate pages from Alerts to Webhooks. `src/server.js`
```

- [ ] **Step 8: Run the whole suite**

Run: `npm test`
Expected: PASS, 0 failures (380 existing tests + 9 page tests + 2 new server tests).

- [ ] **Step 9: Check the page in a browser**

Run: `npm start`, open `http://localhost:3000/deploys`. Confirm: "Deploys" is in the nav after "Services"; the four chip colors show; changing the Environment dropdown reloads with `?env=` and keeps the sort; clicking "Service" and "Started" flips the order and keeps the filter; `?env=staging` with production-only data is not reproducible on real data, so rely on the page test for the empty state.

- [ ] **Step 10: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json README.md
git commit -m "Deploys: route the page and link it after Services"
```
