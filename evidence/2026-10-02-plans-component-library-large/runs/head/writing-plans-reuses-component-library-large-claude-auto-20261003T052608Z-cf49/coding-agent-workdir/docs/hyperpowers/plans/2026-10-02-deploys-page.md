# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** A read-only `/deploys` page listing recent deploys, with an environment filter, two sortable columns, colored status chips and durations, linked in the nav after "Services".

**Architecture:** One page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)`, the same shape as every other page. It is built from the vendored Keel kit (`#kit/table`, `#kit/badge`, `#kit/select`, `#kit/filter-bar`, `#kit/page-header`, `#kit/empty`) rather than hand-written markup. `dataTable` already does the sorting, sort links, `aria-sort` and the empty-state swap that `src/pages/services.js` does by hand. `src/server.js` gets a route entry and `src/layout.js` a nav entry. The existing 503 path in `handle()` covers a missing snapshot with no new code.

**Tech Stack:** Node ≥ 20 ESM, no dependencies, `node --test` with `node:assert/strict`, kit components imported through the `#kit/*` subpath import in `package.json`.

## Global Constraints

- Route `/deploys`; nav label "Deploys", placed immediately after "Services".
- Data: `data/deploys.json` → `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`, read with `readSnapshot('deploys')`.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`. `finishedAt` is null while in progress.
- Header: "Deploys", with the snapshot time under it.
- Filter dropdown options: "All environments" (default), "production", "staging". Choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author.
- Default order: newest first (Started, descending). Service and Started sortable both ways via `?sort=` and `?dir=`. Changing the sort keeps the filter.
- Chips: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s". In-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json`: the same 503 "Snapshot unavailable" page as other pages.
- Unknown `env`, `sort` or `dir` falls back to the default.
- Out of scope: details page, pagination, live refresh, actions on a deploy.
- Tests: `node --test`.

## Grounding

- Page module shape / query parsing and fallback: `src/pages/services.js:5-21`. Constant arrays for allowed values, fall back to the default when the value is unknown.
- Kit table (sorting, sort-link markup, `aria-sort`, empty swap): `vendor/kit/table/src/lib/table.js:20-56`. Its header markup is identical to `services.js:32-38`.
- Kit status chip: `vendor/kit/badge/src/lib/badge.js:12-15`. Tones `ok`/`bad`/`warn`/`info` are green/red/amber/blue in `public/kit.css:2,20-23`.
- Kit filter form with preserved sort: `vendor/kit/filter-bar/src/lib/filter-bar.js:15-21` and `vendor/kit/select/src/lib/select.js:13-21`. Auto-submit is wired in `public/kit.js:7-10`.
- Kit header / empty state: `vendor/kit/page-header/src/lib/page-header.js:10-14`, `vendor/kit/empty/src/lib/empty.js:9-12`.
- Kit import style: `src/pages/services.js:1-2` (`import { button } from '#kit/button';`).
- Snapshot time formatting: `src/core/format/timestamp.js:3-7` (`formatTimestamp`, UTC to the minute).
- Page test shape: `test/pages/services.test.js:1-47`. Inline snapshot const, one `test()` per behavior, regex/`indexOf` assertions on the HTML.
- Route table / 503 handling: `src/server.js:43-94`. Nav list: `src/layout.js:3-34`.
- Server test shape: `test/server.test.js:6-32`.
- E2E sweeps over every nav link: `test/e2e/empty.test.js`, `test/e2e/single.test.js` (these need a `deploys.json` in `test/e2e/fixtures/{empty,single}/`), plus `missing.test.js`, `navigation.test.js`, `queries.test.js`, `titles.test.js`, which work once the nav entry exists.
- Error handling inside the page: none. Pages don't throw or validate; the pipeline validates rows against `src/shared/schemas/deploys.js` before writing.

---

### Task 1: `renderDeploys` page module

**Risk tier:** standard (new page module composing six kit components)

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: `dataTable({ columns, rows, sort, sortHref, empty })` from `#kit/table`; `badge(label, tone)` from `#kit/badge`; `selectField({ name, label, options, value })` from `#kit/select`; `filterBar({ action, fields, keep })` from `#kit/filter-bar`; `pageHeader({ title, subtitle })` from `#kit/page-header`; `emptyState({ title })` from `#kit/empty`; `formatTimestamp(iso) → string` from `src/core/format/timestamp.js`.
- Produces: `export function renderDeploys(snapshot, query) → string` (HTML body fragment). `snapshot` is the parsed `deploys.json`; `query` is `Object.fromEntries(searchParams)`. Task 2 registers it in `ROUTES`.

**Mirror:** `src/pages/services.js:5-21` for the query fallback, `test/pages/services.test.js` for test shape.

Decisions this task locks in (not stated in the spec; flagged for review):
- The snapshot line reads `Snapshot 2026-10-01 09:30 UTC` (via `formatTimestamp`), and the Started column is formatted the same way. Sorting still compares the raw ISO string.
- With "All environments" and no deploys at all, the empty state reads "No deploys".
- An unknown or missing `dir` falls back to `desc` whatever the sort (the spec's default is newest first). Header links always carry an explicit `dir`, so this only affects hand-edited URLs.
- An unknown status renders a grey (`muted`) chip, which is `badge`'s own fallback.

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
    { id: 'd-1038', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
  ],
};

const before = (html, a, b) => html.indexOf(`<td>${a}</td>`) < html.indexOf(`<td>${b}</td>`);

test('shows the title and the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01 09:30 UTC<\/p>/);
});

test('lists the columns in order, newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  const headers = [...html.matchAll(/<th[^>]*>(?:<a [^>]*>)?([A-Za-z]+)/g)].map((m) => m[1]);
  assert.deepEqual(headers, ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
  assert.ok(before(html, '1.23.0-rc.1', '0.9.4'));
  assert.ok(before(html, '0.9.4', '0.9.3'));
  assert.ok(before(html, '0.9.3', '2.9.0-rc.3'));
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
  assert.match(html, /<td>2026-10-01 09:05 UTC<\/td>/);
});

test('sorts by service both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.ok(before(asc, 'billing', 'notifications'));
  assert.ok(before(asc, 'notifications', 'search'));
  assert.match(asc, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.ok(before(desc, 'search', 'notifications'));
  assert.ok(before(desc, 'notifications', 'billing'));
});

test('sorts by start time oldest first and keeps the sort in the filter form', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.ok(before(html, '2.9.0-rc.3', '1.23.0-rc.1'));
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="asc">/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('shows durations in minutes and seconds, and running while in progress', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('filters by environment and keeps it when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /<option value="all">All environments<\/option>/);
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /<td>0\.9\.4<\/td>/);
  assert.doesNotMatch(html, /<td>search<\/td>/);
});

test('names the environment when the filter matches nothing', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  const none = renderDeploys({ ...snapshot, deploys: [] }, {});
  assert.match(none, /<p class="kit-empty__title">No deploys<\/p>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
  assert.ok(before(html, '1.23.0-rc.1', '2.9.0-rc.3'));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` (cannot find `src/pages/deploys.js`).

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

// Recent deploys. Filter with ?env=production|staging; sort with
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = ['service', 'startedAt'];
const STATUS_TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : 'desc';

  const deploys = env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

  const columns = [
    { key: 'service', label: 'Service', sortable: true },
    { key: 'version', label: 'Version' },
    { key: 'environment', label: 'Environment' },
    { key: 'status', label: 'Status', render: (d) => badge(d.status, STATUS_TONES[d.status]) },
    { key: 'startedAt', label: 'Started', sortable: true, render: (d) => formatTimestamp(d.startedAt) },
    { key: 'duration', label: 'Duration', render: (d) => duration(d.startedAt, d.finishedAt) },
    { key: 'author', label: 'Author' },
  ];

  // The sort links carry the filter, and the filter form carries the sort.
  const table = dataTable({
    columns,
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

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

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${formatTimestamp(snapshot.generatedAt)}` })}
${filters}
${table}`;
}

// "4m 12s" from start to finish; a deploy with no finish time is still running.
function duration(startedAt, finishedAt) {
  if (!finishedAt) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `dataTable` escapes plain cells and the `sortHref` result itself, so `&` in the href comes out as `&amp;`. Don't pre-escape it. `render` output is trusted HTML: `badge` escapes its label, and `formatTimestamp` and `duration` return only digits and fixed text.
- Don't add CSS. `public/kit.css` already styles every kit class used here.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys: render the deploys page from the kit components"
```

---

### Task 2: Route, nav link and e2e fixtures

**Risk tier:** standard (multi-file integration: server routing, layout nav, e2e fixtures, README)

**Files:**
- Modify: `src/server.js:32` (import) and `src/server.js:45` (route after `/services`)
- Modify: `src/layout.js:5` (nav entry after Services)
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`
- Modify: `test/server.test.js`
- Modify: `README.md` ("Pages" section)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query) → string` from Task 1 (`src/pages/deploys.js`).
- Produces: `GET /deploys` → 200 page titled "Deploys · Harbor", or 503 "Snapshot unavailable" when `deploys.json` can't be read.

**Mirror:** `src/server.js:45` (the `/services` route entry), `test/server.test.js:6-12,27-32`.

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

Then add these tests after `renders the services page inside the layout`:

```js
test('renders the deploys page inside the layout, linked after Services', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>1\.23\.0-rc\.1<\/td>/);
  assert.doesNotMatch(res.body, /<td>0\.9\.4<\/td>/);
});

test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

(`1.23.0-rc.1` is the staging deploy and `0.9.4` a production deploy in the committed `data/deploys.json`.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. `/deploys` returns 404, so `serves every page in the nav` fails on `/deploys` and both new tests fail.

- [ ] **Step 3: Add the route and the nav entry**

In `src/server.js`, add the import in alphabetical order (between `renderDatabases` and `renderDomains`):

```js
import { renderDeploys } from './pages/deploys.js';
```

and the route right after `/services`:

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

- [ ] **Step 5: Run the e2e sweeps to see the missing fixtures fail**

Run: `node --test test/e2e/`
Expected: FAIL in `empty.test.js` and `single.test.js` for `/deploys` (503 instead of 200, because their fixture directories have no `deploys.json`). `missing`, `navigation`, `queries` and `titles` pass.

- [ ] **Step 6: Add the e2e fixtures**

Create `test/e2e/fixtures/empty/deploys.json` (same layout as `test/e2e/fixtures/empty/services.json`):

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [

  ]
}
```

Create `test/e2e/fixtures/single/deploys.json`:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [
    { "id": "d-1041", "service": "notifications", "version": "0.9.4", "environment": "production", "status": "succeeded", "startedAt": "2026-10-01T08:50:00Z", "finishedAt": "2026-10-01T08:54:12Z", "author": "marco" }
  ]
}
```

- [ ] **Step 7: Update the README's page list**

In `README.md`, under "## Pages", change:

```
One module per page in `src/pages/`: Overview, Services, Incidents, On-call
and Runbooks, then the estate pages from Alerts to Webhooks.
```

to:

```
One module per page in `src/pages/`: Overview, Services, Deploys, Incidents,
On-call and Runbooks, then the estate pages from Alerts to Webhooks.
```

- [ ] **Step 8: Run the full suite**

Run: `node --test`
Expected: PASS, all tests (380 before this plan, plus 9 from Task 1 and 2 new server tests = 391), 0 failures.

- [ ] **Step 9: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json README.md
git commit -m "Deploys: route the page and link it in the nav after Services"
```
