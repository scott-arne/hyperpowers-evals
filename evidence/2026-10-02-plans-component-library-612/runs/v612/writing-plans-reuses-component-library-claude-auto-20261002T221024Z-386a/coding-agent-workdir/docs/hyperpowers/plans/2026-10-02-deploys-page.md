# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists the last 50 deploys from `data/deploys.json` with an environment filter, Service/Started sorting, colored status chips and durations, so whoever is on call can spot a failed or rolled-back deploy without opening the pipeline.

**Architecture:** One new page module, `src/pages/deploys.js`, built entirely from the vendored Harbor component library in `src/ui/` (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `statusChip`, `emptyState`). The page only parses the query, filters, and maps statuses to chip tones; `dataTable` already does sorting, sort links, `aria-sort` and the empty swap. The page is wired in by one entry in `ROUTES` (`src/server.js`), which gives it the existing 503 "Snapshot unavailable" handling for free, and one entry in `NAV` (`src/layout.js`).

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`.

## Global Constraints

- Node 20 or later (`"engines": { "node": ">=20" }`); no new dependencies.
- Tests run with `node --test` (`npm test`), like the rest of the repository.
- Route is exactly `/deploys`; nav label "Deploys", placed after "Services".
- Data comes from `data/deploys.json` via `readSnapshot('deploys')`; read-only. Out of scope: deploy details page, pagination, live refresh, any action on a deploy.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`; `finishedAt` is null while in progress.
- Header "Deploys", with the snapshot time under it.
- Environment dropdown: "All environments" (default), "production", "staging"; choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default. Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Chips: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt` minus `startedAt` as "4m 12s"; in-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as the other pages. Unknown `env`, `sort` or `dir` → the default.
- **Build the page from `src/ui/` components.** Do not copy the hand-rolled markup in `src/pages/services.js` (its own `<select>`, `escapeHtml`, `.pill` classes, `onchange` attribute) — that page predates the template and is not the pattern to follow. Do not edit `src/ui/` (vendored; "keep local edits small so template updates still apply") or `public/` — every class the page emits is already styled in `public/harbor.css`.

## Design decisions (not spelled out in the spec)

- **Query values:** `sort` ∈ `service | startedAt` (default `startedAt`), `dir` ∈ `asc | desc` (default `desc`), `env` ∈ `production | staging` (default: all, represented as `''` so the "All environments" option has `value=""`, matching the `selectField` test fixture). Each falls back independently.
- **Chip tones** map onto the template's tones, whose CSS colors match the spec: `succeeded→ok` (green `#1a7f37`), `failed→bad` (red `#cf222e`), `rolled-back→warn` (amber `#9a6700`), `in-progress→info` (blue `#0969da`).
- **Keeping state:** the filter bar always carries the effective `sort` and `dir` as hidden inputs (via `filterBar`'s `keep`); sort header links carry `env` when one is chosen. Links are absolute (`/deploys?...`).
- **Tie order:** rows are put newest-first before `dataTable` sorts them. `Array.prototype.sort` is stable, so when sorting by Service, a service's deploys still read newest first.
- **Started** shows the raw ISO timestamp, as the Services page does for Deployed.
- **Empty with "All environments":** says "No deploys" (the spec only defines the filtered case; "No deploys in all environments" reads badly).
- **Duration** keys off `finishedAt` being null (that is what makes the subtraction impossible); per the spec that is exactly the in-progress case.

## File Structure

- Create `src/pages/deploys.js` — `renderDeploys(snapshot, query)` and `formatDuration(deploy)`. One responsibility: turn the deploys snapshot plus query into page HTML.
- Create `test/pages/deploys.test.js` — rendering tests.
- Modify `src/server.js` — import and add the `/deploys` route.
- Modify `src/layout.js` — add the nav entry.
- Modify `test/server.test.js` — route and 503 tests.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module whose behavior (filtering, sorting, query fallbacks) is the feature; the complete code is in the plan, but it is not mechanical transcription of a single file.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing, `src/ui/index.js`): `pageHeader({title, subtitle})`, `filterBar({action, fields, keep})`, `selectField({name, label, options, value})`, `dataTable({columns, rows, sort, sortHref, empty})`, `statusChip(label, tone)`, `emptyState({title})`. Read `src/ui/table.js` before starting: `dataTable` sorts the rows itself by `sort`, builds header links with `sortHref(key, nextDir)` (the next direction is `desc` only when that column is already active ascending), escapes plain cells, and returns `empty` instead of the table when `rows` is empty.
- Produces: `export function renderDeploys(snapshot: {generatedAt: string, deploys: Deploy[]}, query: Record<string, string>): string` — the same `(snapshot, query)` signature as every entry in `ROUTES`. Also `export function formatDuration({startedAt: string, finishedAt: string | null}): string`.

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
    { id: 'd-2', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
    { id: 'd-1', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-0', service: 'api', version: '3.14.2', environment: 'production', status: 'succeeded', startedAt: '2026-09-30T16:05:00Z', finishedAt: '2026-09-30T16:09:12Z', author: 'dana' },
  ],
};

// Service names in table order.
function order(html) {
  return [...html.matchAll(/<tr><td>([^<]+)<\/td>/g)].map((m) => m[1]);
}

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
});

test('lists deploys newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.deepEqual(order(html), ['search', 'notifications', 'billing', 'api']);
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th>Version<\/th>/);
});

test('sorts by started time oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.deepEqual(order(html), ['api', 'billing', 'notifications', 'search']);
});

test('sorts by service both ways', () => {
  assert.deepEqual(order(renderDeploys(snapshot, { sort: 'service', dir: 'asc' })), [
    'api',
    'billing',
    'notifications',
    'search',
  ]);
  assert.deepEqual(order(renderDeploys(snapshot, { sort: 'service', dir: 'desc' })), [
    'search',
    'notifications',
    'billing',
    'api',
  ]);
});

test('filters by environment and keeps the sort', () => {
  const html = renderDeploys(snapshot, { env: 'staging', sort: 'service', dir: 'asc' });
  assert.deepEqual(order(html), ['billing', 'search']);
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="service">/);
  assert.match(html, /<input type="hidden" name="dir" value="asc">/);
});

test('sort links keep the filter', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.match(html, /href="\/deploys\?env=production&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\/deploys\?env=production&amp;sort=startedAt&amp;dir=asc"/);
});

test('offers all environments by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="ui-select" data-autosubmit>/);
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.match(html, /<option value="production">production<\/option>/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="ui-chip ui-chip--ok">succeeded<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--bad">failed<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--info">in-progress<\/span>/);
});

test('shows durations in minutes and seconds, or running', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
  assert.equal(formatDuration({ startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z' }), '4m 12s');
  assert.equal(formatDuration({ startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:50:09Z' }), '0m 9s');
});

test('names the environment when no deploys match', () => {
  const html = renderDeploys({ ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') }, { env: 'staging' });
  assert.match(html, /<p class="ui-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'sideways' });
  assert.deepEqual(order(html), ['search', 'notifications', 'billing', 'api']);
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` … `Cannot find module '.../src/pages/deploys.js'`.

- [ ] **Step 3: Write the implementation**

Create `src/pages/deploys.js`:

```js
import {
  dataTable,
  emptyState,
  filterBar,
  pageHeader,
  selectField,
  statusChip,
} from '../ui/index.js';

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
  { key: 'duration', label: 'Duration', render: formatDuration },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : '';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = DIRS.includes(query.dir) ? query.dir : 'desc';

  // Newest first before the table sorts, so deploys of one service read
  // newest first when sorting by service.
  let deploys = [...snapshot.deploys].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (env) deploys = deploys.filter((d) => d.environment === env);

  const envField = selectField({
    name: 'env',
    label: 'Environment',
    options: [
      { value: '', label: 'All environments' },
      ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
    ],
    value: env,
  });

  const table = dataTable({
    columns: COLUMNS,
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => `/deploys?${new URLSearchParams({ ...(env && { env }), sort: key, dir: next })}`,
    empty: emptyState({ title: env ? `No deploys in ${env}` : 'No deploys' }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filterBar({ action: '/deploys', fields: [envField], keep: { sort, dir } })}
${table}`;
}

// "4m 12s" from start to finish; "running" while the deploy has no finish.
export function formatDuration({ startedAt, finishedAt }) {
  if (!finishedAt) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 11 tests, 0 failures.

Then run the whole suite: `npm test`
Expected: PASS, 30 tests, 0 failures (19 existing + 11 new).

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys: render the deploys page from the template components"
```

---

### Task 2: Route and nav link

**Risk tier:** standard — multi-file integration (server routing, shared layout, server tests).

**Files:**
- Modify: `src/server.js:6-17` (imports and `ROUTES`)
- Modify: `src/layout.js:3-6` (`NAV`)
- Test: `test/server.test.js` (append)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query)` from `src/pages/deploys.js` (Task 1).
- Produces: `GET /deploys` → 200 page titled "Deploys" inside the layout; 503 "Snapshot unavailable" when `deploys.json` cannot be read. No new exports.

- [ ] **Step 1: Write the failing tests**

Append to `test/server.test.js` (the file already imports `assert`, `test`, `fileURLToPath` and `handle`):

```js

test('renders the deploys page and links it after Services', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>notifications<\/td>/);
  assert.doesNotMatch(res.body, /1\.23\.0-rc\.1/);
});

test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

The first test reads the real `data/deploys.json`: `notifications` has production deploys, and `1.23.0-rc.1` is the only version of the staging-only in-progress `search` deploy, so it must be filtered out. (Don't assert on `<td>search</td>` — `search` also has production deploys.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: the two new tests FAIL (status 404 instead of 200/503); the four existing tests pass.

- [ ] **Step 3: Add the route and nav entry**

In `src/server.js`, add the import in alphabetical order with the other page imports:

```js
import { layout } from './layout.js';
import { renderDeploys } from './pages/deploys.js';
import { renderOverview } from './pages/overview.js';
import { renderServices } from './pages/services.js';
```

and the route after `/services`:

```js
const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
};
```

Do not touch `handle()` — its existing `catch` around `readSnapshot` already produces the 503 page for any route.

In `src/layout.js`:

```js
const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
];
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 32 tests, 0 failures.

- [ ] **Step 5: Check it in the browser**

Run: `npm start`, open `http://localhost:3000/deploys`. Confirm: nav shows Overview · Services · Deploys with Deploys underlined; newest deploy (search 1.23.0-rc.1, blue "in-progress" chip, "running") on top; choosing "staging" reloads to `/deploys?env=staging&sort=startedAt&dir=desc`; clicking "Service" sorts A→Z and keeps `env=staging`; clicking it again sorts Z→A. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Deploys: route /deploys and link it in the nav"
```

---

## Spec coverage

| Spec requirement | Task |
|---|---|
| `/deploys` route, nav link after Services | 2 |
| Header with snapshot time | 1 (`shows the header with the snapshot time`) |
| Environment filter, default all, keeps sort | 1 (`offers all environments by default`, `filters by environment and keeps the sort`) |
| Columns; newest first default | 1 (`lists deploys newest first by default`) |
| Service / Started sort both ways, keeps filter | 1 (`sorts by service both ways`, `sorts by started time oldest first`, `sort links keep the filter`) |
| Status chip colors | 1 (`colors each status`) |
| Duration "4m 12s" / "running" | 1 (`shows durations…`) |
| Empty state names the environment | 1 (`names the environment when no deploys match`) |
| Unknown `env`/`sort`/`dir` fall back | 1 (`falls back to the defaults for unknown query values`) |
| 503 on missing snapshot | 2 (`answers 503 when the deploys snapshot cannot be read`) |
