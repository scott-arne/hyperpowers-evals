# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists the last 50 deploys from `data/deploys.json`, with an environment filter, Service/Started sorting, colored status chips and durations, linked from the nav after "Services".

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)` in the same shape as every other page. It is built from the vendored Keel kit components (`#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge`, `#kit/empty`) rather than re-hand-rolling the table, sort headers and filter form that `src/pages/services.js` writes by hand. `src/server.js` gets a route and `src/layout.js` a nav entry. The existing 503 path in `handle()` already covers a missing snapshot, so nothing new is needed there.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test`, server-rendered HTML strings.

## Global Constraints

- Route: `/deploys`; nav label "Deploys", placed directly after "Services".
- Page title / header: "Deploys", with the snapshot time under it.
- Environment filter options, in order: "All environments" (default), "production", "staging". Choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author.
- Default order: newest first. Only Service and Started are sortable, both ways, through `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt` minus `startedAt` as minutes and seconds, such as "4m 12s"; in-progress shows "running".
- Empty: when the filter matches no deploys, show "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json`: the same 503 "Snapshot unavailable" page as other pages.
- Unknown `env`, `sort` or `dir` falls back to the default.
- Out of scope: deploy details page, pagination, live refresh, actions on a deploy.
- Tests: `node --test`. No new dependencies.

## Decisions the spec leaves open (flagged for review)

- **Query values.** `?sort=service` and `?sort=startedAt` (the column keys, matching the snapshot field names, as Services uses `deployedAt`). Default is `sort=startedAt`, `dir=desc`; any `dir` other than `asc` means `desc`. So `?sort=service` with no `dir` sorts Z→A; clicking the Service header always links with an explicit `dir=asc`, so a user only reaches that by hand-editing a URL.
- **Empty with "All environments".** The spec only words the filtered case. With `env=all` and zero deploys (the e2e `empty` fixture) the page says "No deploys".
- **Timestamps.** The snapshot time and the Started column use the existing `formatTimestamp` (`src/core/format/timestamp.js`, "2026-10-01 09:05 UTC") rather than raw ISO strings. No page uses it yet; Services shows raw ISO. Say if you'd rather match Services.
- **Duration rounding.** Whole seconds, floored; under a minute shows "0m 42s" so the format is uniform.
- **Ties.** The kit table's sort is stable, so deploys with the same service stay in snapshot order (newest first).

## Grounding

- Page module shape (exported `renderX(snapshot, query)`, query fallback with `ENVIRONMENTS.includes` / `Object.hasOwn`): `src/pages/services.js:5-21`
- Kit imports through the `#kit/*` import map: `package.json` `"imports"`, used at `src/pages/services.js:1-2`
- Kit data table with built-in sort, sort links, `aria-sort` and `empty`: `vendor/kit/table/src/lib/table.js:3-56`
- Kit filter form with hidden `keep` fields: `vendor/kit/filter-bar/src/lib/filter-bar.js:3-21`; auto-submit wiring in `public/kit.js:7-10`
- Kit select field (`data-autosubmit`): `vendor/kit/select/src/lib/select.js:3-21`
- Kit badge tones (`ok` green, `bad` red, `warn` amber, `info` blue): `vendor/kit/badge/src/lib/badge.js:3-15`, colors in `public/kit.css:2,19-24`
- Kit page header with subtitle: `vendor/kit/page-header/src/lib/page-header.js:3-14`
- Kit empty state: `vendor/kit/empty/src/lib/empty.js:3-12`
- Timestamp formatting: `src/core/format/timestamp.js:1-7`
- Routing table and 503 for unreadable snapshots: `src/server.js:43-94`
- Nav list: `src/layout.js:3-34`
- Page test shape (inline snapshot, `assert.match` on HTML fragments, `indexOf` for order): `test/pages/services.test.js:1-47`
- Server test shape (`handle(path, { dataDir })`): `test/server.test.js:6-32`
- E2E tests that walk every nav link against fixture dirs (so new fixtures are required): `test/e2e/empty.test.js:6-16`, `test/e2e/single.test.js:6-16`; fixture shape `test/e2e/fixtures/single/services.json`
- Error handling: none beyond the existing `handle()` 503 — pages do not catch; bad query values fall back silently (`src/pages/services.js:14-16`).
- Naming: kebab-case for files, camelCase for functions, one page per `src/pages/<name>.js` with test at `test/pages/<name>.test.js`.

## File Structure

- Create `src/pages/deploys.js` — renders the Deploys page body from a snapshot and query. Exports `renderDeploys` and `formatDuration`.
- Create `test/pages/deploys.test.js` — rendering tests.
- Modify `src/server.js` — import and route `/deploys`.
- Modify `src/layout.js` — nav entry after Services.
- Modify `test/server.test.js` — route + 503 tests, `/deploys` in the nav path list.
- Create `test/e2e/fixtures/empty/deploys.json`, `test/e2e/fixtures/single/deploys.json` — required because the e2e suites render every nav link against these dirs.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module with filter/sort/format logic; not mechanical.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: `pageHeader` from `#kit/page-header`, `filterBar` from `#kit/filter-bar`, `selectField` from `#kit/select`, `dataTable` from `#kit/table`, `badge` from `#kit/badge`, `emptyState` from `#kit/empty`, `formatTimestamp` from `src/core/format/timestamp.js`.
- Produces: `renderDeploys(snapshot: {generatedAt: string, deploys: Deploy[]}, query: Record<string,string>): string` and `formatDuration(startedAt: string, finishedAt: string | null): string`. Task 2 imports `renderDeploys` from `./pages/deploys.js`.

**Mirror:** `src/pages/services.js:5-21` for the query fallback and module comment; `test/pages/services.test.js` for test shape. Do **not** copy its hand-built `<table>`, `sortHeader` or `<form>`; use the kit components instead.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-3', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-2', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-1', service: 'billing', version: '2.8.0', environment: 'production', status: 'failed', startedAt: '2026-10-01T07:00:00Z', finishedAt: '2026-10-01T07:02:05Z', author: 'ana' },
    { id: 'd-0', service: 'api', version: '3.1.0', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T06:00:00Z', finishedAt: '2026-10-01T06:00:42Z', author: 'li' },
  ],
};

const order = (html, ...names) => names.map((n) => html.indexOf(`<td>${n}</td>`));
const ascending = (positions) => positions.every((p, i) => p >= 0 && (i === 0 || positions[i - 1] < p));

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01 09:30 UTC<\/p>/);
});

test('lists the columns in order, newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  const headers = [...html.matchAll(/<th[^>]*>(?:<a [^>]*>)?([A-Za-z]+)/g)].map((m) => m[1]);
  assert.deepEqual(headers, ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
  assert.ok(ascending(order(html, 'search', 'notifications', 'billing', 'api')));
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
  assert.match(html, /<th>Version<\/th>/);
  assert.match(html, /<td>2026-10-01 09:05 UTC<\/td>/);
});

test('sorts by service both ways', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.ok(ascending(order(az, 'api', 'billing', 'notifications', 'search')));
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.ok(ascending(order(za, 'search', 'notifications', 'billing', 'api')));
});

test('sorts by start time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.ok(ascending(order(oldest, 'api', 'billing', 'notifications', 'search')));
  const newest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' });
  assert.ok(ascending(order(newest, 'search', 'notifications', 'billing', 'api')));
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('formats durations in minutes and seconds', () => {
  assert.equal(formatDuration('2026-10-01T08:50:00Z', '2026-10-01T08:54:12Z'), '4m 12s');
  assert.equal(formatDuration('2026-10-01T06:00:00Z', '2026-10-01T06:00:42Z'), '0m 42s');
  assert.equal(formatDuration('2026-10-01T06:00:00Z', '2026-10-01T07:05:00Z'), '65m 0s');
  assert.equal(formatDuration('2026-10-01T09:05:00Z', null), 'running');
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('filters by environment and keeps the sort in the filter form', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'asc' });
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.equal(html.indexOf('<td>search</td>'), -1);
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
});

test('keeps the filter when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\?env=production&amp;sort=startedAt&amp;dir=asc"/);
});

test('names the environment when the filter matches nothing', () => {
  const onlyProduction = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(onlyProduction, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  const none = renderDeploys({ ...snapshot, deploys: [] }, {});
  assert.match(none, /<p class="kit-empty__title">No deploys<\/p>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assert.ok(ascending(order(html, 'search', 'notifications', 'billing', 'api')));
});

test('escapes snapshot text', () => {
  const html = renderDeploys({ ...snapshot, deploys: [{ ...snapshot.deploys[1], author: '<b>x</b>' }] }, {});
  assert.match(html, /<td>&lt;b&gt;x&lt;\/b&gt;<\/td>/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL — `Cannot find module '.../src/pages/deploys.js'`.

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
// so the newest deploy is first).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = ['service', 'startedAt'];
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' ? 'asc' : 'desc';

  const deploys =
    env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

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
      { key: 'status', label: 'Status', render: (d) => badge(d.status, TONES[d.status]) },
      { key: 'startedAt', label: 'Started', sortable: true, render: (d) => formatTimestamp(d.startedAt) },
      { key: 'duration', label: 'Duration', render: (d) => formatDuration(d.startedAt, d.finishedAt) },
      { key: 'author', label: 'Author' },
    ],
    rows: deploys,
    sort: { key: sort, dir },
    // The table escapes the href, so the raw & is right here.
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${formatTimestamp(snapshot.generatedAt)}` })}
${filters}
${table}`;
}

// "4m 12s" from start to finish; a deploy without a finish time is running.
export function formatDuration(startedAt, finishedAt) {
  if (!finishedAt) return 'running';
  const seconds = Math.max(0, Math.floor((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000));
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `formatTimestamp` returns trusted text (digits, `-`, `:`, `UTC`), and `formatDuration` likewise, so returning them from `render` without escaping is safe. `badge` escapes its label.
- `dataTable` sorts on `row[key]` by default; `service` and `startedAt` (ISO strings) both compare correctly with `localeCompare`, so no `value` function is needed.
- Unknown `status` values get `TONES[...] === undefined`, which `badge` turns into the `muted` tone.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the Deploys page renderer"
```

---

### Task 2: Route, nav link and e2e fixtures

**Risk tier:** standard — multi-file integration (server, layout, fixtures) that the whole-site e2e suites depend on.

**Files:**
- Modify: `src/server.js:32` (import) and `src/server.js:45` (route)
- Modify: `src/layout.js:5` (nav)
- Modify: `test/server.test.js:6-32`
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1).
- Produces: `GET /deploys` → 200 with the page inside the layout; 503 "Snapshot unavailable" when `deploys.json` can't be read.

**Mirror:** `src/server.js:45` (the `/services` route entry), `src/layout.js:5` (nav entry), `test/server.test.js:6-12,27-32` (route and 503 tests), `test/e2e/fixtures/{empty,single}/services.json` (fixture shape).

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, add after the first test (after line 12):

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>notifications<\/td>/);
  // search 1.23.0-rc.1 (d-1042) was deployed only to staging.
  assert.doesNotMatch(res.body, /<td>1\.23\.0-rc\.1<\/td>/);
});

test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

And in `serves every page in the nav`, change the first line of the `paths` array from:

```js
    '/', '/services', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
```

to:

```js
    '/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL — `/deploys` answers 404 (status assertions `404 !== 200` and `404 !== 503`).

- [ ] **Step 3: Add the route and the nav link**

In `src/server.js`, add the import in alphabetical order (after `renderDatabases`, line 17):

```js
import { renderDeploys } from './pages/deploys.js';
```

and the route directly after the `/services` entry:

```js
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

In `src/layout.js`, add directly after `{ href: '/services', label: 'Services' },`:

```js
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 4: Run the server tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS.

- [ ] **Step 5: Run the e2e suites and see the fixture failures**

Run: `node --test test/e2e/`
Expected: FAIL in `empty.test.js` and `single.test.js` with `503 !== 200` for `/deploys` — those fixture dirs have no `deploys.json` yet.

- [ ] **Step 6: Add the fixtures**

Create `test/e2e/fixtures/empty/deploys.json`:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [

  ]
}
```

Create `test/e2e/fixtures/single/deploys.json` (an in-progress deploy, since `finishedAt: null` is the row most likely to leak `NaN` or `null`):

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [
    { "id": "d-1042", "service": "search", "version": "1.23.0-rc.1", "environment": "staging", "status": "in-progress", "startedAt": "2026-10-01T09:05:00Z", "finishedAt": null, "author": "priya" }
  ]
}
```

- [ ] **Step 7: Run the full suite**

Run: `node --test`
Expected: PASS, all tests (380 before this plan, plus the 11 page tests from Task 1 and the 2 new server tests).

- [ ] **Step 8: Validate the fixtures against the schema**

Run: `node tools/harbor.js verify --data=test/e2e/fixtures/single --now=2026-10-01T09:30:00Z 2>&1 | grep deploys`
Expected: a single ok line for `deploys` and no `deploys: ...` problem lines. (`--now` is pinned the same way `scripts/check-data.sh` pins it; other snapshots' results are not this task's concern.)

- [ ] **Step 9: Check the page in a browser**

Run: `npm start`, open `http://localhost:3000/deploys`. Check: "Deploys" is in the nav after "Services" and is highlighted; the status chips are green/red/amber/blue; choosing "staging" reloads with `?env=staging` and keeps the sort; clicking "Service" then "Started" keeps the filter.

- [ ] **Step 10: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json
git commit -m "Route the Deploys page and link it from the nav"
```
