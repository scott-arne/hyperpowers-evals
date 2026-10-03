# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists recent deploys from `data/deploys.json`, with an environment filter, sorting by Service and Started, colored status chips and durations, linked in the nav after "Services".

**Architecture:** One new page module, `src/pages/deploys.js`, exports `renderDeploys(snapshot, query)` like every other page. It is built from the vendored Keel kit (`#kit/*`): `pageHeader`, `filterBar` + `selectField`, `dataTable` (which sorts the rows and renders the sort links), `badge` and `emptyState`. We do not hand-roll the table, select or sort headers the way the older `services.js` does. `src/server.js` gets a route and `src/layout.js` gets a nav entry. The existing 503 path in `handle()` covers a missing snapshot without any new code.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`. Kit components are imported through the `#kit/*` subpath import in `package.json`.

## Global Constraints

- Route `/deploys`, nav label "Deploys", placed directly after "Services" in the nav.
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Data: `data/deploys.json`, shape `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`. `status` ∈ `succeeded`, `failed`, `rolled-back`, `in-progress`. `finishedAt` is `null` while in progress.
- Header "Deploys", with the snapshot time under it.
- Environment dropdown: "All environments" (default), "production", "staging". Changing it reloads with `?env=` and keeps the current sort.
- Columns in this order: Service, Version, Environment, Status, Started, Duration, Author.
- Default order newest first. Service and Started are sortable both ways via `?sort=` and `?dir=`. Changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration is `finishedAt − startedAt` as minutes and seconds, e.g. `4m 12s`. In progress shows `running`.
- Empty filter result: "No deploys in staging" (naming the chosen environment) instead of the table.
- Missing or unreadable `deploys.json` gets the shared 503 "Snapshot unavailable" page. Unknown `env`, `sort` or `dir` falls back to the default.
- Tests: `node --test`. Rendering tests for filter, both sorts, chips, duration, empty state and unknown-value fallback, plus a server test for the route and its 503.

**Decisions this plan makes where the spec is silent** (please flag any you disagree with):
- Query values: `sort` ∈ `service` | `startedAt`, `dir` ∈ `asc` | `desc`. With no valid `dir`, `startedAt` defaults to `desc` and `service` defaults to `asc`. So the full default is `startedAt`/`desc`, i.e. newest first.
- Snapshot time and the Started column use the existing `formatTimestamp` (`2026-10-01 09:30 UTC`). The header subtitle reads `Snapshot 2026-10-01 09:30 UTC`.
- When "All environments" matches nothing (an empty snapshot), the message is "No deploys".
- Durations of an hour or more stay in minutes (`72m 5s`), which follows the spec's "minutes and seconds" literally.
- Chip tones map onto the kit badge palette (`public/kit.css:2`): `ok` #1a7f37 green, `bad` #cf222e red, `warn` #9a6700 amber, `info` #0969da blue. An unknown status gets the kit's `muted` default.

## Grounding

- Page module shape and naming (`renderX(snapshot, query)`, header comment listing query params, module-level constants): `src/pages/services.js:5-16`
- Query fallback to defaults (allow-list check, `Object.hasOwn` / `includes`): `src/pages/services.js:14-16`
- Filter keeps sort, sort keeps filter: `src/pages/services.js:30-38` and `src/pages/services.js:88-94` (hand-rolled). The kit equivalents to use instead are `vendor/kit/filter-bar/src/lib/filter-bar.js:15-21` (`keep`) and `vendor/kit/table/src/lib/table.js:46-56` (`sortHref`, arrows, `aria-sort`).
- Kit components used: `vendor/kit/page-header/src/lib/page-header.js:10-14`, `vendor/kit/select/src/lib/select.js:13-21`, `vendor/kit/table/src/lib/table.js:20-44`, `vendor/kit/badge/src/lib/badge.js:3-15`, `vendor/kit/empty/src/lib/empty.js:9-12`
- Kit import style in pages: `src/pages/services.js:1-2` (`import { button } from '#kit/button';`)
- Autosubmit wiring for `data-autosubmit` selects (already shipped, nothing to add): `public/kit.js:7-10`
- HTML escaping: the kit escapes labels and plain cells (`vendor/kit/utils/src/lib/utils.js:2-9`). A `render` callback returns trusted HTML (`vendor/kit/table/src/lib/table.js:9-10`), so render callbacks must only return kit output or values that cannot contain markup.
- Timestamp formatting: `src/core/format/timestamp.js:3-7`
- Domain-value → style mapping at the call site: `src/pages/services.js:99-103` (`healthClass`)
- Error handling (snapshot read failure → 503): `src/server.js:83-92`, generic per route, so nothing is page-specific
- Routing table: `src/server.js:43-46`. Nav list: `src/layout.js:3-6`
- Page rendering test shape (inline snapshot const, `assert.match` on exact HTML, `indexOf` for order): `test/pages/services.test.js:1-47`
- Server test shape: `test/server.test.js:6-32`
- E2E tests that crawl every nav link against fixture dirs (these need a `deploys.json` in each): `test/e2e/empty.test.js:6-16`, `test/e2e/single.test.js:6-16`. Fixture shape: `test/e2e/fixtures/empty/services.json`, `test/e2e/fixtures/single/services.json`
- Commit message style: short imperative sentence, e.g. `Add the dashboard pages`, `Pipeline: add the deploys snapshot` (`git log`)
- Duration formatting: `none: no existing duration formatter in src/core/format/`. It stays a page-local helper, like `healthClass`.

---

## File Structure

- Create `src/pages/deploys.js`: renders the Deploys page body from the snapshot and query. It owns the query parsing, column definitions, status → tone map and duration format.
- Create `test/pages/deploys.test.js`: rendering tests for the page module.
- Modify `src/server.js`: import `renderDeploys` and add the `/deploys` route.
- Modify `src/layout.js`: add the nav entry after Services.
- Modify `test/server.test.js`: route test, 503 test, nav-order test, and `/deploys` added to the "every page" list.
- Create `test/e2e/fixtures/empty/deploys.json` and `test/e2e/fixtures/single/deploys.json`: fixtures for the crawl-every-nav-link e2e tests.

---

### Task 1: Deploys page renderer

**Risk tier:** standard (new page module built from several kit components, with its own query-parsing behavior)

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: `badge(label, tone)` from `#kit/badge`; `emptyState({ title })` from `#kit/empty`; `filterBar({ action, fields, keep })` from `#kit/filter-bar`; `pageHeader({ title, subtitle })` from `#kit/page-header`; `selectField({ name, label, options, value })` from `#kit/select`; `dataTable({ columns, rows, sort, sortHref, empty })` from `#kit/table`; `formatTimestamp(iso)` from `src/core/format/timestamp.js`.
- Produces: `export function renderDeploys(snapshot, query): string`, where `snapshot` is `{ generatedAt: string, deploys: Deploy[] }` and `query` is a plain object of query-string values (`Object.fromEntries(searchParams)`). Task 2 imports it from `./pages/deploys.js`.

**Mirror:** `src/pages/services.js:5-21` for the module header comment, constants and query fallback. `test/pages/services.test.js:1-47` for test shape. Do **not** copy its hand-rolled `<select>`, `sortHeader` or `<table>`. Use the kit components named above.

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

// Versions are unique per row, so they identify rows in order checks.
const order = (html, versions) => versions.map((v) => html.indexOf(`<td>${v}</td>`));
const ascending = (positions) => positions.every((p, i) => p >= 0 && (i === 0 || positions[i - 1] < p));

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01 09:30 UTC<\/p>/);
});

test('lists deploys newest first by default, with every column', () => {
  const html = renderDeploys(snapshot, {});
  assert.ok(ascending(order(html, ['1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3'])));
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
  assert.match(html, /<th>Version<\/th><th>Environment<\/th><th>Status<\/th>/);
  assert.match(html, /<th>Duration<\/th><th>Author<\/th>/);
  assert.match(html, /<tr><td>notifications<\/td><td>0\.9\.4<\/td><td>production<\/td>/);
  assert.match(html, /<td>2026-10-01 08:50 UTC<\/td>/);
  assert.match(html, /<td>marco<\/td><\/tr>/);
});

test('sorts by service both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.ok(ascending(order(asc, ['2.9.0-rc.3', '0.9.4', '1.23.0-rc.1'])));
  assert.match(asc, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.ok(ascending(order(desc, ['1.23.0-rc.1', '0.9.4', '2.9.0-rc.3'])));
  assert.match(desc, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('sorts by start time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.ok(ascending(order(oldest, ['2.9.0-rc.3', '0.9.3', '0.9.4', '1.23.0-rc.1'])));
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
  const newest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' });
  assert.ok(ascending(order(newest, ['1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3'])));
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

test('filters by environment, keeps it when sorting, and keeps the sort when filtering', () => {
  const production = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'desc' });
  assert.match(production, /<td>0\.9\.4<\/td>/);
  assert.doesNotMatch(production, /<td>1\.23\.0-rc\.1<\/td>/);
  assert.doesNotMatch(production, /<td>2\.9\.0-rc\.3<\/td>/);
  assert.match(production, /<option value="production" selected>production<\/option>/);
  assert.match(production, /href="\?env=production&amp;sort=startedAt&amp;dir=asc"/);
  assert.match(production, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(production, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(production, /<input type="hidden" name="sort" value="service">/);
  assert.match(production, /<input type="hidden" name="dir" value="desc">/);
});

test('offers all environments by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<option value="all" selected>All environments<\/option><option value="production">production<\/option><option value="staging">staging<\/option>/);
});

test('names the environment when the filter matches no deploys', () => {
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
  assert.ok(ascending(order(html, ['1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3'])));
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

// Recent deploys. Filter with ?env=production|staging; sort with
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending,
// so newest first; service defaults to ascending).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = ['service', 'startedAt'];
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

const COLUMNS = [
  { key: 'service', label: 'Service', sortable: true },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => badge(d.status, TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true, render: (d) => formatTimestamp(d.startedAt) },
  { key: 'duration', label: 'Duration', render: duration },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = ['asc', 'desc'].includes(query.dir) ? query.dir : sort === 'startedAt' ? 'desc' : 'asc';

  let deploys = snapshot.deploys;
  if (env !== 'all') deploys = deploys.filter((d) => d.environment === env);

  const header = pageHeader({
    title: 'Deploys',
    subtitle: `Snapshot ${formatTimestamp(snapshot.generatedAt)}`,
  });

  const filters = filterBar({
    action: '/deploys',
    fields: [
      selectField({
        name: 'env',
        label: 'Environment',
        options: [
          { value: 'all', label: 'All environments' },
          ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
        ],
        value: env,
      }),
    ],
    keep: { sort, dir },
  });

  // dataTable sorts the rows and escapes the header links; the links carry
  // the filter so sorting keeps it.
  const table = dataTable({
    columns: COLUMNS,
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${header}
${filters}
${table}`;
}

// "4m 12s" from start to finish; a deploy still in progress has no finish.
function duration(deploy) {
  if (deploy.finishedAt == null) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `render` output is inserted unescaped (`vendor/kit/table/src/lib/table.js:9-10`). That is safe here because `badge` escapes its label and `formatTimestamp` and `duration` only produce digits and fixed text.
- `TONES['constructor']`-style lookups return something that is not a valid tone, and `badge` falls back to `muted` (`vendor/kit/badge/src/lib/badge.js:13`). No extra guard is needed.
- `Array.prototype.sort` is stable, so rows that tie on Service keep snapshot order.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: Route, nav link and fixtures

**Risk tier:** standard (multi-file integration touching the shared router, the nav, and the e2e fixtures every crawl test reads)

**Files:**
- Modify: `src/server.js:14` (imports, alphabetical) and `src/server.js:45` (routes)
- Modify: `src/layout.js:5` (nav)
- Modify: `test/server.test.js:6-32`
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1).
- Produces: `GET /deploys` served by `handle()`, plus a nav entry `{ href: '/deploys', label: 'Deploys' }`.

**Mirror:** `src/server.js:45` (the `/services` route entry), `src/layout.js:5` (nav entry), `test/server.test.js:6-12` and `:27-32` (route and 503 tests), and `test/e2e/fixtures/{empty,single}/services.json` (fixture shape).

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, add these tests after the existing `'renders the services page inside the layout'` test:

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<td>notifications<\/td>/);
  assert.doesNotMatch(res.body, /<td>1\.23\.0-rc\.1<\/td>/);
});

test('lists Deploys in the nav right after Services', async () => {
  const res = await handle('/');
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys">Deploys<\/a>/);
});
```

In the `'serves every page in the nav'` test, change the `paths` array's first line from:

```js
    '/', '/services', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
```

to:

```js
    '/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
```

After the existing `'answers 503 when the snapshot cannot be read'` test, add:

```js
test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

- [ ] **Step 2: Run the server tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. `renders the deploys page` gets status 404, the nav-order test finds no Deploys link, `serves every page` fails on `/deploys` (404), and the 503 test gets 404.

- [ ] **Step 3: Add the route and the nav entry**

In `src/server.js`, add the import in alphabetical position, between the `renderDatabases` and `renderDomains` imports:

```js
import { renderDeploys } from './pages/deploys.js';
```

In `ROUTES`, add directly after the `/services` entry:

```js
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

In `src/layout.js`, add directly after `{ href: '/services', label: 'Services' },` in `NAV`:

```js
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 4: Run the server tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS, all tests.

- [ ] **Step 5: Run the e2e crawl tests to see the missing fixtures**

Run: `node --test test/e2e/`
Expected: FAIL in `empty.test.js` and `single.test.js` on `/deploys` (status 503, because the fixture dirs have no `deploys.json`). The others (`missing`, `navigation`, `queries`, `titles`, `static`) pass.

- [ ] **Step 6: Add the fixtures**

Create `test/e2e/fixtures/empty/deploys.json`:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [

  ]
}
```

Create `test/e2e/fixtures/single/deploys.json`. The one row is in progress, so the `running` path and the `null` `finishedAt` both go through the `undefined|NaN` check:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [
    { "id": "d-1042", "service": "search", "version": "1.23.0-rc.1", "environment": "staging", "status": "in-progress", "startedAt": "2026-10-01T09:05:00Z", "finishedAt": null, "author": "priya" }
  ]
}
```

- [ ] **Step 7: Run the whole suite**

Run: `node --test`
Expected: PASS, every test including `test/e2e/*` and `test/pages/deploys.test.js`.

- [ ] **Step 8: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json
git commit -m "Add the Deploys page to the nav"
```
