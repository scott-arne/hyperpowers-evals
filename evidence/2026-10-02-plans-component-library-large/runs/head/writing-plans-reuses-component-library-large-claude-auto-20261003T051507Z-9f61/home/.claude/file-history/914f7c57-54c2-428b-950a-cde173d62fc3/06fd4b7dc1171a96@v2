# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** A read-only `/deploys` page listing the last 50 deploys from `data/deploys.json`, with an environment filter, Service/Started sorting, colored status chips and durations.

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)` like every other page. It is assembled from the vendored Keel kit (`#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge`, `#kit/empty`) rather than hand-written HTML: `dataTable` already sorts rows and renders the sort-link headers with `aria-sort` and arrows, `filterBar` + `selectField` already render the auto-submitting GET form that keeps the sort, and `badge` tones `ok`/`warn`/`bad`/`info` are already green/amber/red/blue in `public/kit.css`. The query handling (`env`/`sort`/`dir` validation and fallback) mirrors `src/pages/services.js`. `src/server.js` routes it, `src/layout.js` links it after "Services".

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`.

## Global Constraints

- Route `/deploys`; nav label "Deploys", placed immediately after "Services".
- Page title (and `<title>`) "Deploys"; snapshot time shown under the heading.
- Environment filter: "All environments" (default, value `all`), "production", "staging"; changing it reloads with `?env=` and keeps the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author.
- Default order: newest first (`startedAt` descending). Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json` → the existing 503 "Snapshot unavailable" page. Unknown `env`, `sort` or `dir` → the default.
- Out of scope: details page, pagination, live refresh, actions on a deploy.
- No new dependencies. Tests run with `node --test`.

## Grounding

- Page module shape, query validation/fallback, filter-keeps-sort and sort-keeps-filter: `src/pages/services.js:5-21` (constants, `ENVIRONMENTS.includes`, `dir` fallback) and `:30-38` (sort links carrying `?env=`).
- Kit imports through the `#kit/*` import map: `package.json` `"imports"`; in use at `src/pages/services.js:1-2`.
- Sortable table with headers and links: `vendor/kit/table/src/lib/table.js:20-69` (`dataTable`; sort is stable, so ties keep snapshot order; `sortHref` output is HTML-escaped, so `&` renders as `&amp;`).
- Filter form: `vendor/kit/filter-bar/src/lib/filter-bar.js:15-21` (`filterBar`, `keep` → hidden inputs) and `vendor/kit/select/src/lib/select.js:13-21` (`selectField`, `data-autosubmit`); auto-submit wired in `public/kit.js:7-10`.
- Status chip: `vendor/kit/badge/src/lib/badge.js:12-15`; tone colors `public/kit.css:2,19-24`.
- Heading + subtitle: `vendor/kit/page-header/src/lib/page-header.js:10-14`.
- Empty state: `vendor/kit/empty/src/lib/empty.js:9-12`.
- Escaping: kit components escape via `esc` (`vendor/kit/utils/src/lib/*.js:2-9`); a column `render` returns trusted HTML, so it must only return kit output or fixed text.
- Raw ISO timestamps on pages (no formatting): `src/pages/services.js:47`, `src/pages/overview.js:29` (`Snapshot ${generatedAt}`).
- Duration formatting: none: no existing duration formatter in `src/` (`src/core/format/` has bytes, number, percent, plural, timestamp only); it lives as a private helper in the page.
- Routes and nav: `src/server.js:42-73` (`ROUTES`), `src/layout.js:3-34` (`NAV`); 503 handling already generic at `src/server.js:81-90`.
- Page render test shape: `test/pages/services.test.js:1-47` (inline snapshot, `indexOf` ordering, `assert.match` on exact markup).
- Server test shape: `test/server.test.js:6-32`.
- E2E sweeps over every nav link with fixture data dirs: `test/e2e/empty.test.js`, `test/e2e/single.test.js` (fixtures `test/e2e/fixtures/{empty,single}/services.json` show the format).
- Snapshot schema already exists: `src/shared/schemas/deploys.js` (no change needed).

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new module, though self-contained and fully specified here.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: kit functions `pageHeader({title, subtitle})`, `filterBar({action, fields, keep})`, `selectField({name, label, options, value})`, `dataTable({columns, rows, sort, sortHref, empty})`, `badge(label, tone)`, `emptyState({title})`.
- Produces: `export function renderDeploys(snapshot: {generatedAt: string, deploys: Deploy[]}, query: Record<string, string>): string`, the HTML body (without layout). Task 2 imports it from `./pages/deploys.js`.

**Mirror:** `src/pages/services.js:5-21` for query validation; `test/pages/services.test.js` for test shape.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`. The fixture rows are deliberately *not* in newest-first order, so the default-sort test proves the page sorts rather than relying on snapshot order. Versions are unique per row, so `<td>version</td>` identifies a row.

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-3', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T05:10:00Z', finishedAt: '2026-10-01T05:31:40Z', author: 'marco' },
    { id: 'd-2', service: 'billing', version: '2.8.1', environment: 'production', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
  ],
};

const before = (html, a, b) => html.indexOf(a) !== -1 && html.indexOf(a) < html.indexOf(b);

test('shows the heading with the snapshot time and the columns in order', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
  const headers = [...html.matchAll(/<th[^>]*>(?:<a [^>]*>)?([A-Za-z]+)/g)].map((m) => m[1]);
  assert.deepEqual(headers, ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
});

test('lists the newest deploy first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.ok(before(html, '<td>1.23.0-rc.1</td>', '<td>0.9.4</td>'));
  assert.ok(before(html, '<td>0.9.4</td>', '<td>2.8.1</td>'));
  assert.ok(before(html, '<td>2.8.1</td>', '<td>0.9.3</td>'));
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
});

test('sorts by start time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.ok(before(oldest, '<td>0.9.3</td>', '<td>1.23.0-rc.1</td>'));
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sorts by service both ways and keeps the sort in the filter form', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.ok(before(az, '<td>billing</td>', '<td>notifications</td>'));
  assert.ok(before(az, '<td>notifications</td>', '<td>search</td>'));
  assert.match(az, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.ok(before(za, '<td>search</td>', '<td>billing</td>'));
  assert.match(za, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('shows the duration in minutes and seconds, or running', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('filters by environment and keeps it when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
  assert.doesNotMatch(html, /<td>search<\/td>/);
});

test('names the environment when the filter matches nothing', () => {
  const production = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(production, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assert.ok(before(html, '<td>1.23.0-rc.1</td>', '<td>0.9.3</td>'));
});

test('sorts a service link without a direction A to Z', () => {
  const html = renderDeploys(snapshot, { sort: 'service' });
  assert.match(html, /<input type="hidden" name="dir" value="asc">/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL. The run errors with `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

- [ ] **Step 3: Write the implementation**

Create `src/pages/deploys.js`:

```js
import { badge } from '#kit/badge';
import { emptyState } from '#kit/empty';
import { filterBar } from '#kit/filter-bar';
import { pageHeader } from '#kit/page-header';
import { selectField } from '#kit/select';
import { dataTable } from '#kit/table';

// Deploys list. Filter with ?env=production|staging; sort with
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending,
// so the newest deploy is on top).
const ENVIRONMENTS = ['production', 'staging'];
const SORTABLE = ['service', 'startedAt'];
const STATUS_TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

const COLUMNS = [
  { key: 'service', label: 'Service', sortable: true },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => badge(d.status, STATUS_TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true },
  { key: 'duration', label: 'Duration', render: duration },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTABLE.includes(query.sort) ? query.sort : 'startedAt';
  // Without a direction, Started means newest first and Service means A to Z.
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : sort === 'startedAt' ? 'desc' : 'asc';

  const deploys = env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

  const filters = filterBar({
    action: '/deploys',
    fields: [
      selectField({
        name: 'env',
        label: 'Environment',
        options: [{ value: 'all', label: 'All environments' }, ...ENVIRONMENTS.map((e) => ({ value: e, label: e }))],
        value: env,
      }),
    ],
    keep: { sort, dir },
  });

  // The sort links carry the filter so sorting keeps it.
  const table = dataTable({
    columns: COLUMNS,
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filters}
${table}`;
}

// finishedAt minus startedAt, such as "4m 12s". finishedAt stays null while
// a deploy is in progress.
function duration(d) {
  if (!d.finishedAt) return 'running';
  const seconds = Math.round((Date.parse(d.finishedAt) - Date.parse(d.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 10 tests.

Then run `node --test`. Expected: the existing suite still passes. The page is not routed yet, so nothing else changes.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys: render the deploys page from the kit components"
```

---

### Task 2: Route, nav link and e2e fixtures

**Risk tier:** standard — multi-file integration (server, layout, two e2e fixture sets, README). The e2e sweeps fail unless all of it lands together.

**Files:**
- Modify: `src/server.js` (import block at lines 9-38; `ROUTES` at lines 42-73)
- Modify: `src/layout.js:3-6` (`NAV`)
- Modify: `test/server.test.js:14-32`
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`
- Modify: `README.md` (the "Pages" paragraph)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query)` from Task 1 (`src/pages/deploys.js`).
- Produces: nothing later tasks use.

**Mirror:** the `/services` entries in `src/server.js:44` and `src/layout.js:5`; `test/server.test.js:6-12,27-32`.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, add `'/deploys'` after `'/services'` in the `paths` list of `serves every page in the nav`:

```js
  const paths = [
    '/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
    '/clusters', '/databases', '/queues', '/jobs', '/certificates', '/domains',
    '/costs', '/capacity', '/slos', '/maintenance', '/changes', '/flags',
    '/backups', '/tokens', '/teams', '/audit', '/endpoints', '/regions',
    '/vendors', '/status', '/reports', '/secrets', '/webhooks',
  ];
```

Add these two tests after `renders the services page inside the layout`:

```js
test('renders the deploys page inside the layout, linked after Services', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>search<\/td>/);
});

test('answers 503 for the deploys page when its snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. The new tests and `serves every page in the nav` get 404 (`/deploys` is not routed yet).

- [ ] **Step 3: Route the page and link it in the nav**

In `src/server.js`, add the import in alphabetical order, between `renderDatabases` and `renderDomains`:

```js
import { renderDeploys } from './pages/deploys.js';
```

and add the route right after `/services`:

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

- [ ] **Step 5: Run the full suite and watch the e2e sweeps fail**

Run: `node --test`
Expected: FAIL in `test/e2e/empty.test.js` and `test/e2e/single.test.js` at `/deploys`, which gets 503 instead of 200 because their fixture directories have no `deploys.json`.

- [ ] **Step 6: Add the e2e fixtures**

Create `test/e2e/fixtures/empty/deploys.json`, matching the format of `empty/services.json`:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [

  ]
}
```

Create `test/e2e/fixtures/single/deploys.json`. It uses the in-progress row so the null `finishedAt` path is swept for `undefined`/`NaN`:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [
    { "id": "d-1042", "service": "search", "version": "1.23.0-rc.1", "environment": "staging", "status": "in-progress", "startedAt": "2026-10-01T09:05:00Z", "finishedAt": null, "author": "priya" }
  ]
}
```

- [ ] **Step 7: Update the README's page list**

In `README.md`, replace the whole paragraph under `## Pages` with:

```
One module per page in `src/pages/`: Overview, Services, Deploys, Incidents,
On-call and Runbooks, then the estate pages from Alerts to Webhooks.
`src/server.js` routes requests and wraps each page in `src/layout.js`;
`public/app.css` holds the dashboard's styles.
```

- [ ] **Step 8: Run the full suite to verify everything passes**

Run: `node --test`
Expected: PASS. The count is 380 before this plan plus 10 page tests (Task 1) plus 2 server tests, so 392. The e2e sweeps (navigation, titles, queries, empty, single, missing) now include `/deploys`.

- [ ] **Step 9: Check the page by eye**

Run: `npm start`, open `http://localhost:3000/deploys`. Check that Deploys sits after Services in the nav, the chips are colored, choosing "staging" reloads with `?env=staging`, and clicking Service then Started keeps the filter. Stop the server.

- [ ] **Step 10: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json README.md
git commit -m "Deploys: route /deploys and link it after Services"
```
