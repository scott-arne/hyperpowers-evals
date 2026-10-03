# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists the last 50 deploys from `data/deploys.json`, with an environment filter, Service/Started sorting, colored status chips and durations, so whoever is on call can spot a failed or rolled-back deploy.

**Architecture:** A new page module `src/pages/deploys.js` exports `renderDeploys(snapshot, query)`. It is built from the vendored component kit (`vendor/kit`, imported as `#kit/*`): `pageHeader`, `filterBar` + `selectField`, `dataTable` (which sorts rows and builds the sort links), `badge` and `emptyState`. Nothing is hand-rolled. `src/server.js` routes `/deploys` to it through the existing snapshot/503 path, and `src/layout.js` adds the nav link after "Services".

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`.

## Global Constraints

- No new dependencies. Node 20 or later (`package.json` `engines`).
- Tests use `node --test`, like the rest of the repository. Run the whole suite with `npm test`.
- Route `/deploys`. Nav label "Deploys", placed right after "Services". Page title "Deploys", so the browser title reads `Deploys · Harbor`.
- Snapshot `data/deploys.json` (snapshot name `deploys`), shape `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`. `finishedAt` is null while a deploy is in progress.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`. Chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Environment filter options, in order: "All environments" (the default), "production", "staging". The query parameter is `?env=`.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default. Service and Started sort both ways through `?sort=` and `?dir=`.
- Changing the filter keeps the current sort, and changing the sort keeps the filter.
- Duration is shown as minutes and seconds, such as "4m 12s". An in-progress deploy shows "running".
- Empty state copy: "No deploys in staging", naming the chosen environment, in place of the table.
- A missing or unreadable `deploys.json` gets the same 503 "Snapshot unavailable" page as the other pages. An unknown `env`, `sort` or `dir` value falls back to the default.
- Out of scope: a deploy details page, pagination, live refresh, and any action on a deploy.
- Reuse the kit components (`#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge`, `#kit/empty`) instead of copying the hand-written markup in `src/pages/services.js`. Do not edit anything under `vendor/kit/`. Their styles are already in `public/kit.css`, and `public/kit.js` already submits a filter bar when a `data-autosubmit` select changes.

## Decisions the spec leaves open

These are visible in the tests below. Change them here before execution if you disagree.

1. **Timestamps** for both "Started" and the snapshot time under the header use the existing `formatTimestamp` (`src/core/format/timestamp.js`), which renders `2026-10-01 09:05 UTC`. The Services page shows raw ISO strings. The header reads `Snapshot 2026-10-01 09:30 UTC`.
2. **Default direction per column.** The page default is `sort=startedAt&dir=desc`. If `dir` is missing or unknown, it falls back to `desc` for Started and `asc` for Service. A hand-edited `?sort=service` therefore lists A→Z. The header links always carry an explicit `dir`.
3. **Empty with "All environments"** (an empty snapshot) says "No deploys". The spec only fixes the copy for a chosen environment.
4. **Sort ties.** Several deploys of the same service keep the snapshot order (newest first). `dataTable` uses the stable `Array.prototype.sort`, and the pipeline writes the snapshot newest first.
5. **Status chip tones:** `succeeded→ok` (green `#1a7f37`), `failed→bad` (red), `rolled-back→warn` (amber `#9a6700`), `in-progress→info` (blue). An unexpected status gets the kit's grey `muted` tone and is not dropped.

## File Structure

- Create `src/pages/deploys.js`: renders the page. Exports `renderDeploys(snapshot, query)`. Holds the private `formatDuration`.
- Create `test/pages/deploys.test.js`: rendering tests (filter, both sorts, chips, duration, empty state, fallbacks, escaping).
- Modify `src/server.js`: import and add the `/deploys` route after `/services`.
- Modify `src/layout.js`: add the `{ href: '/deploys', label: 'Deploys' }` nav entry after Services.
- Modify `test/server.test.js`: tests for the route, its nav position, and its 503 (missing and unreadable).
- Create `test/e2e/fixtures/empty/deploys.json` and `test/e2e/fixtures/single/deploys.json`. The e2e suites walk every nav link against these fixture directories, so they would answer 503 for `/deploys` without these files.
- Modify `README.md`: list Deploys among the pages.

---

### Task 1: Render the Deploys page

**Risk tier:** standard — a new module with filter, sort, fallback and duration logic, composed from five kit components.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing, do not modify):
  - `pageHeader({ title, subtitle?, actions? }) → string` from `#kit/page-header`. Escapes title and subtitle and renders `<header class="kit-page-header"><div><h1>…</h1><p class="kit-muted">…</p></div></header>`.
  - `filterBar({ action, fields: string[], keep?: Record<string,string> }) → string` from `#kit/filter-bar`. Renders `<form class="kit-filter-bar" method="get" action="…">` with the fields followed by one `<input type="hidden" name="k" value="v">` per `keep` entry, in insertion order.
  - `selectField({ name, label, options: {value,label}[], value }) → string` from `#kit/select`. Renders `<option value="v" selected>` for the selected value and marks the select `data-autosubmit`.
  - `dataTable({ columns, rows, sort?: {key, dir}, sortHref?: (key, dir) => string, empty?: string }) → string` from `#kit/table`. Sorts rows by `row[sort.key]` with `localeCompare`. Escapes `row[key]` unless the column has `render` (trusted HTML). Escapes `sortHref`'s return value, so pass raw `&` and the output shows `&amp;`. Sortable headers render `<th aria-sort="ascending|descending"><a href="…">Label ▲|▼</a></th>` when active and `<th><a href="…">Label</a></th>` otherwise. Clicking the active column flips `dir`; other columns start `asc`. With no rows it returns `empty` and no `<table>`.
  - `badge(label, tone) → string` from `#kit/badge`. Renders `<span class="kit-badge kit-badge--{tone}">label</span>`. An unknown tone becomes `muted`.
  - `emptyState({ title, body? }) → string` from `#kit/empty`. Renders `<div class="kit-empty"><p class="kit-empty__title">title</p></div>`.
  - `formatTimestamp(iso) → string` from `src/core/format/timestamp.js`. Returns `"YYYY-MM-DD HH:MM UTC"`, or `''` for an invalid date.
  - `escapeHtml(value) → string` from `src/html.js`.
- Produces: `export function renderDeploys(snapshot, query) → string`. `snapshot` is the parsed `deploys.json`. `query` is a plain object of the request's query parameters (`Object.fromEntries(searchParams)`), same contract as `renderServices`. Task 2 imports it from `./pages/deploys.js`.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

// Newest first, as the pipeline writes it. One deploy per status, two
// environments, and services whose names sort differently from their times.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-3', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
    { id: 'd-2', service: 'billing', version: '2.8.0', environment: 'production', status: 'failed', startedAt: '2026-09-29T11:40:00Z', finishedAt: '2026-09-29T11:44:12Z', author: 'sam' },
    { id: 'd-1', service: 'api', version: '3.1.0', environment: 'production', status: 'succeeded', startedAt: '2026-09-28T09:15:00Z', finishedAt: '2026-09-28T09:19:37Z', author: 'dana' },
  ],
};

// The services in the order the table lists them.
const order = (html) => [...html.matchAll(/<tr><td>([^<]+)<\/td>/g)].map((m) => m[1]);

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<header class="kit-page-header"><div><h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01 09:30 UTC<\/p><\/div><\/header>/);
});

test('lists deploys newest first by default, with the columns in order', () => {
  const html = renderDeploys(snapshot, {});
  assert.deepEqual(order(html), ['search', 'notifications', 'billing', 'api']);
  assert.match(
    html,
    /<thead><tr><th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th><th>Version<\/th><th>Environment<\/th><th>Status<\/th><th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th><th>Duration<\/th><th>Author<\/th><\/tr><\/thead>/,
  );
  assert.match(html, /<tr><td>search<\/td><td>1\.23\.0-rc\.1<\/td><td>staging<\/td><td><span[^>]*>in-progress<\/span><\/td><td>2026-10-01 09:05 UTC<\/td><td>running<\/td><td>priya<\/td><\/tr>/);
});

test('sorts by start time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.deepEqual(order(oldest), ['api', 'billing', 'notifications', 'search']);
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
  const newest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' });
  assert.deepEqual(order(newest), ['search', 'notifications', 'billing', 'api']);
});

test('sorts by service both ways', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.deepEqual(order(az), ['api', 'billing', 'notifications', 'search']);
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  assert.match(az, /<th><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started<\/a><\/th>/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.deepEqual(order(za), ['search', 'notifications', 'billing', 'api']);
  assert.match(za, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('filters by environment, and each control keeps the other', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'desc' });
  assert.deepEqual(order(html), ['notifications', 'billing', 'api']);
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit><option value="all">All environments<\/option><option value="production" selected>production<\/option><option value="staging">staging<\/option><\/select>/);
  // The filter form carries the sort...
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="desc"><\/form>/);
  // ...and the sort links carry the filter.
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\?env=production&amp;sort=startedAt&amp;dir=asc"/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('shows an unexpected status in grey rather than dropping it', () => {
  const odd = { ...snapshot, deploys: [{ ...snapshot.deploys[1], status: 'cancelled' }] };
  assert.match(renderDeploys(odd, {}), /<span class="kit-badge kit-badge--muted">cancelled<\/span>/);
});

test('shows durations in minutes and seconds, and running while in progress', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>4m 37s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('names the environment when the filter matches nothing', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<div class="kit-empty"><p class="kit-empty__title">No deploys in staging<\/p><\/div>/);
  assert.doesNotMatch(html, /<table/);
  // The filter stays so the reader can switch back.
  assert.match(html, /<option value="staging" selected>/);
});

test('says so when there are no deploys at all', () => {
  const html = renderDeploys({ ...snapshot, deploys: [] }, {});
  assert.match(html, /<p class="kit-empty__title">No deploys<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assert.deepEqual(order(html), ['search', 'notifications', 'billing', 'api']);
  // A known sort with an unknown direction keeps the sort.
  const byService = renderDeploys(snapshot, { sort: 'service', dir: 'sideways' });
  assert.deepEqual(order(byService), ['api', 'billing', 'notifications', 'search']);
});

test('escapes snapshot text', () => {
  const hostile = { ...snapshot, deploys: [{ ...snapshot.deploys[1], service: '<script>x</script>', author: 'a&b' }] };
  const html = renderDeploys(hostile, {});
  assert.match(html, /<td>&lt;script&gt;x&lt;\/script&gt;<\/td>/);
  assert.match(html, /<td>a&amp;b<\/td>/);
  assert.doesNotMatch(html, /<script>x/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

- [ ] **Step 3: Write the page**

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
// so the newest deploy is on top).
const ENVIRONMENTS = ['production', 'staging'];
const DEFAULT_DIR = { service: 'asc', startedAt: 'desc' };
const STATUS_TONES = {
  succeeded: 'ok',
  failed: 'bad',
  'rolled-back': 'warn',
  'in-progress': 'info',
};

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = Object.hasOwn(DEFAULT_DIR, query.sort ?? '') ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : DEFAULT_DIR[sort];

  const deploys =
    env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

  const header = pageHeader({
    title: 'Deploys',
    subtitle: `Snapshot ${formatTimestamp(snapshot.generatedAt)}`,
  });

  // The filter form carries the sort, and the sort links carry the filter, so
  // neither control resets the other.
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

// "4m 12s" from start to finish. A deploy without a finish time is still running.
function formatDuration(startedAt, finishedAt) {
  if (!finishedAt) return 'running';
  const seconds = Math.max(0, Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000));
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `Object.hasOwn` (rather than `in` or a plain lookup) makes `?sort=constructor` fall back like any other unknown value. The Services page does the same.
- `STATUS_TONES[d.status]` can come back `undefined` or as an inherited property for an unexpected status. `badge` only accepts its five known tones, so that case renders as `muted`. Do not add a separate guard.
- The Started column sorts by the raw ISO `row.startedAt`, which is `dataTable`'s default sort value for `key: 'startedAt'`. Only the display goes through `render`. ISO UTC strings compare correctly as text.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 12 tests.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS, nothing else affected. The page is not routed yet.

- [ ] **Step 6: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys page: render the deploy list from the kit components"
```

---

### Task 2: Route `/deploys` and add it to the nav

**Risk tier:** standard — multi-file integration: server routing, the layout nav that every e2e suite walks, e2e fixtures and the README.

**Files:**
- Modify: `src/server.js` (imports at lines 9-38, `ROUTES` at lines 43-74)
- Modify: `src/layout.js` (`NAV` at lines 3-34)
- Modify: `test/server.test.js`
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`
- Modify: `README.md` (the "Pages" paragraph)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query) → string` from `src/pages/deploys.js` (Task 1). Also `handle(url, { dataDir }) → Promise<{status, type, body}>` from `src/server.js`, which reads `route.snapshot` through `readSnapshot` and answers 503 "Snapshot unavailable" when that read or the JSON parse throws.
- Produces: route `/deploys` → `{ title: 'Deploys', snapshot: 'deploys', render: renderDeploys }`, and nav entry `{ href: '/deploys', label: 'Deploys' }` directly after Services.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, change the imports at the top to:

```js
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/server.js';
```

Add `'/deploys'` to the `paths` list in `serves every page in the nav`, after `'/services'`:

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
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<td>notifications<\/td>/);
  assert.doesNotMatch(res.body, /<td>staging<\/td>/);
});

test('lists Deploys in the nav right after Services', async () => {
  const res = await handle('/');
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys">Deploys<\/a>/);
});

test('answers 503 on the deploys page when its snapshot is missing or unreadable', async () => {
  const missing = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const gone = await handle('/deploys', { dataDir: missing });
  assert.equal(gone.status, 503);
  assert.match(gone.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(gone.body, /Snapshot unavailable/);

  // A half-written file, as when the pipeline is mid-rewrite.
  const dir = await mkdtemp(join(tmpdir(), 'harbor-deploys-'));
  try {
    await writeFile(join(dir, 'deploys.json'), '{"generatedAt": "2026-10-01T09:30:00Z", "deplo');
    const torn = await handle('/deploys', { dataDir: dir });
    assert.equal(torn.status, 503);
    assert.match(torn.body, /Snapshot unavailable/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the server tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. `renders the deploys page inside the layout` gets status 404, not 200. `serves every page in the nav` fails on `/deploys`. The nav test finds no Deploys link. The 503 test fails because the unknown route answers 404.

- [ ] **Step 3: Add the e2e fixtures**

Every e2e suite (`test/e2e/*.test.js`) walks each nav link. `empty.test.js` and `single.test.js` read snapshots from `test/e2e/fixtures/{empty,single}/`. Without a `deploys.json` there, `/deploys` would answer 503 once it is in the nav.

Create `test/e2e/fixtures/empty/deploys.json`:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [

  ]
}
```

Create `test/e2e/fixtures/single/deploys.json`. The one row is in progress, so it covers the `null` `finishedAt` path:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [
    { "id": "d-1042", "service": "search", "version": "1.23.0-rc.1", "environment": "staging", "status": "in-progress", "startedAt": "2026-10-01T09:05:00Z", "finishedAt": null, "author": "priya" }
  ]
}
```

- [ ] **Step 4: Add the route and the nav entry**

In `src/server.js`, add the import in alphabetical order between `renderDatabases` and `renderDomains`:

```js
import { renderDeploys } from './pages/deploys.js';
```

and add the route directly after `/services` in `ROUTES`:

```js
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

In `src/layout.js`, add the nav entry directly after Services in `NAV`:

```js
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 5: Run the server tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS, 8 tests.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS. In particular `test/e2e/navigation.test.js`, `titles.test.js`, `queries.test.js` (`/deploys?sort=bogus&dir=sideways&env=mars…` → 200), `missing.test.js` (503), `empty.test.js` and `single.test.js` (200, no `undefined`/`NaN`) now cover `/deploys` too.

- [ ] **Step 7: Update the README**

In `README.md`, under "## Pages", change the first sentence from:

```
One module per page in `src/pages/`: Overview, Services, Incidents, On-call
and Runbooks, then the estate pages from Alerts to Webhooks.
```

to:

```
One module per page in `src/pages/`: Overview, Services, Deploys, Incidents,
On-call and Runbooks, then the estate pages from Alerts to Webhooks.
```

- [ ] **Step 8: Check it in the browser**

Run: `npm start`, then open `http://localhost:3000/deploys`.
Expected:
- "Deploys" is in the nav right after Services and is highlighted.
- The header shows `Snapshot 2026-10-01 09:30 UTC`.
- Rows are newest first: `search` running, `notifications` succeeded `4m 12s`, `notifications` rolled-back (amber), and so on.
- Choosing "staging" reloads with `?env=staging&sort=startedAt&dir=desc`.
- Clicking "Service" keeps `env=staging`.

Stop the server.

- [ ] **Step 9: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json README.md
git commit -m "Deploys page: route /deploys and link it after Services"
```
