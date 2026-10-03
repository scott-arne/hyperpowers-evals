# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page, linked from the nav after "Services", that lists the deploys in `data/deploys.json` with an environment filter, sorting on Service and Started, colored status chips and durations.

**Architecture:** A new page module `src/pages/deploys.js` exports `renderDeploys(snapshot, query)`, the same shape as the other pages. It is built from the vendored Keel kit (`#kit/page-header`, `#kit/select`, `#kit/filter-bar`, `#kit/table`, `#kit/badge`, `#kit/empty`) instead of copying the hand-written markup in `src/pages/services.js`. The kit's `dataTable` already sorts rows and builds the sort-header links (with the same "the active column flips, any other column starts ascending" rule as Services), and `public/kit.js` already submits a `filterBar` when its select changes. `src/server.js` gets one route entry, so the existing 503 path covers the new snapshot. `src/layout.js` gets one nav entry.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`. Kit modules are imported through the `#kit/*` import map in `package.json`.

## Global Constraints

- Route `/deploys`; nav label "Deploys", placed right after "Services".
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Snapshot: `data/deploys.json` (`{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`), read through the existing `readSnapshot('deploys')`. Do not change the data file.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`. `finishedAt` is null while a deploy is in progress.
- Header "Deploys" with the snapshot time under it.
- Environment dropdown: "All environments" (default), "production", "staging". Choosing one reloads with `?env=` and keeps the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Service and Started sort both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt` minus `startedAt` as minutes and seconds, such as "4m 12s"; in progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing or unreadable `deploys.json` gets the same 503 "Snapshot unavailable" page as the other pages. Unknown `env`, `sort` or `dir` falls back to the default.
- Tests run with `node --test` (`npm test`).

## Decisions the spec leaves open

These follow from the spec plus existing conventions. Flag any you want changed before execution.

1. **Use the kit, not a copy of `services.js`.** The spec asks for the page to *behave* like Services. It doesn't ask for the same markup. The kit components produce the same behavior (same query parameters, same header-link rule, select auto-submit, hidden `sort`/`dir` inputs) with much less code. The Deploys page's classes will be `kit-*` (for example `kit-table`, `kit-badge--ok`) and not the `services`/`pill-*` classes in `app.css`, so `app.css` needs no change.
2. **Chip tones:** succeeded → `ok` (green), failed → `bad` (red), rolled-back → `warn` (amber), in-progress → `info` (blue). An unexpected status falls back to the kit's grey `muted` badge.
3. **Snapshot time** is rendered as `Snapshot 2026-10-01T09:30:00Z`, the same wording as the Overview page.
4. **Default direction per column:** a missing or unknown `dir` means `desc` for Started (newest first, the page default) and `asc` for Service. Clicking a non-active header starts it ascending (the kit's rule, the same as Services). So a first click on "Started" while sorted by Service shows the oldest deploys first.
5. **Ties when sorting by Service** keep the snapshot's order (`Array.prototype.sort` is stable). The pipeline writes newest first, so each service's deploys stay newest first in both directions.
6. **Durations** always use the `Xm Ys` form, including "0m 45s" and "75m 0s". Durations are rounded to whole seconds.
7. **Empty with "All environments"** (an empty snapshot) shows "No deploys".

## File Structure

- Create `src/pages/deploys.js`: the Deploys page renderer (`renderDeploys`) plus a private `formatDuration` helper.
- Create `test/pages/deploys.test.js`: rendering tests for the page.
- Modify `src/server.js`: import `renderDeploys` and add the `/deploys` route.
- Modify `src/layout.js`: add the nav entry after Services.
- Modify `test/server.test.js`: route, nav and 503 tests.
- Modify `README.md`: list Deploys among the pages.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module with filtering, sorting and fallback logic. It is new code with its own test file, not a mechanical transcription.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (vendored kit, already present, do not modify `vendor/`):
  - `pageHeader({ title, subtitle?, actions? }) → string` from `#kit/page-header`
  - `selectField({ name, label, options: Array<{value,label}>, value? }) → string` from `#kit/select`
  - `filterBar({ action, fields: string[], keep?: Record<string,string|undefined> }) → string` from `#kit/filter-bar`
  - `dataTable({ columns: Array<{key,label,sortable?,render?,value?}>, rows, sort?: {key,dir}, sortHref?: (key, dir) => string, empty? }) → string` from `#kit/table`. It escapes `sortHref` output and escapes cells that have no `render`. `render` output is trusted HTML.
  - `badge(label, tone?: 'ok'|'warn'|'bad'|'info'|'muted') → string` from `#kit/badge`
  - `emptyState({ title, body? }) → string` from `#kit/empty`
- Produces: `export function renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string, string>): string`. Task 2 wires it into `src/server.js`.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-3', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-2', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-1', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
    { id: 'd-0', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:05Z', author: 'sam' },
  ],
};

test('shows the title, the snapshot time and every column', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
  for (const label of ['Version', 'Environment', 'Status', 'Duration', 'Author']) {
    assert.match(html, new RegExp(`<th>${label}</th>`));
  }
});

test('lists newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.ok(html.indexOf('<td>1.23.0-rc.1</td>') < html.indexOf('<td>0.9.4</td>'));
  assert.ok(html.indexOf('<td>0.9.4</td>') < html.indexOf('<td>2.9.0-rc.3</td>'));
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
});

test('sorts by start time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.ok(oldest.indexOf('<td>2.9.0-rc.3</td>') < oldest.indexOf('<td>1.23.0-rc.1</td>'));
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sorts by service both ways and keeps the sort in the filter form', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.ok(az.indexOf('<td>billing</td>') < az.indexOf('<td>notifications</td>'));
  assert.ok(az.indexOf('<td>notifications</td>') < az.indexOf('<td>search</td>'));
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  assert.match(az, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.ok(za.indexOf('<td>search</td>') < za.indexOf('<td>billing</td>'));
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
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>2m 5s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('filters by environment and keeps it when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /<td>notifications<\/td>/);
  assert.doesNotMatch(html, /<td>search<\/td>/);
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assert.ok(html.indexOf('<td>1.23.0-rc.1</td>') < html.indexOf('<td>2.9.0-rc.3</td>'));
  const service = renderDeploys(snapshot, { sort: 'service', dir: 'sideways' });
  assert.match(service, /<input type="hidden" name="dir" value="asc">/);
});
```

Notes for the implementer: `sort: 'constructor'` checks that the sort lookup uses `Object.hasOwn` and not `in`/property access, the same guard `services.js` uses. The `2m 5s` case checks that seconds are not zero-padded.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL, with `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

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
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, newest first).
const ENVIRONMENTS = ['production', 'staging'];
// Each sortable column's direction when ?dir is missing or unknown.
const SORT_DEFAULT_DIR = { service: 'asc', startedAt: 'desc' };
const STATUS_TONES = {
  succeeded: 'ok',
  failed: 'bad',
  'rolled-back': 'warn',
  'in-progress': 'info',
};

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = Object.hasOwn(SORT_DEFAULT_DIR, query.sort ?? '') ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : SORT_DEFAULT_DIR[sort];

  const deploys =
    env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

  const header = pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` });

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

  // The kit table sorts the rows and builds the header links; the links carry
  // the filter so sorting keeps it.
  const table = dataTable({
    columns: [
      { key: 'service', label: 'Service', sortable: true },
      { key: 'version', label: 'Version' },
      { key: 'environment', label: 'Environment' },
      { key: 'status', label: 'Status', render: (d) => badge(d.status, STATUS_TONES[d.status]) },
      { key: 'startedAt', label: 'Started', sortable: true },
      { key: 'duration', label: 'Duration', render: formatDuration },
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

// "4m 12s" from start to finish. finishedAt is null while a deploy runs.
function formatDuration({ startedAt, finishedAt }) {
  if (finishedAt === null) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Why it is safe: `formatDuration` returns only digits, `m`, `s` and spaces, or `running`, so it can be a trusted `render`. `badge` escapes its label. `sortHref` output is escaped by `dataTable`, which turns `&` into `&amp;`. `env`, `sort` and `dir` are allow-listed before they reach any markup.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 9 tests.

Run: `npm test`
Expected: PASS, 27 tests (the 18 existing plus 9 new).

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys: render the deploys page from the kit components"
```

---

### Task 2: Route, nav link and README

**Risk tier:** low — three small edits whose full content is in this plan (one route entry plus import, one nav entry, one README line) and test additions whose strings appear verbatim here.

**Files:**
- Modify: `src/server.js:7-12` (imports) and `src/server.js:17-23` (`ROUTES`)
- Modify: `src/layout.js:3-9` (`NAV`)
- Modify: `README.md:16`
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1). Also the existing `handle(url, { dataDir })` and `readSnapshot(name, dir)`.
- Produces: the `/deploys` route and the nav entry `{ href: '/deploys', label: 'Deploys' }`.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, add `'/deploys'` to the nav loop, so the test reads:

```js
test('serves every page in the nav', async () => {
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
    assert.equal((await handle(path)).status, 200, path);
  }
});
```

Then add these two tests right before `test('answers 404 for an unknown path', ...)`:

```js
test('renders the deploys page inside the layout, after Services in the nav', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>search<\/td>/);
  assert.doesNotMatch(res.body, /<td>production<\/td>/);
});

test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

(The first test reads the real `data/deploys.json`, where `search` has a staging deploy.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. "serves every page in the nav" fails on `/deploys` with 404 !== 200. The two new tests fail with status 404.

- [ ] **Step 3: Add the route and the nav link**

In `src/server.js`, add the import in alphabetical order after the `layout` import:

```js
import { layout } from './layout.js';
import { renderDeploys } from './pages/deploys.js';
import { renderIncidents } from './pages/incidents.js';
```

and add the route after `/services`:

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

In `src/layout.js`, add the nav entry after Services:

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

No change to `handle()` is needed. Its existing `catch` around `readSnapshot` already renders the 503 "Snapshot unavailable" page with the route's title.

- [ ] **Step 4: Update the README**

In `README.md`, change line 16 from:

```
Overview, Services, Incidents, On-call and Runbooks, one module each in
```

to:

```
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module each in
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 29 tests, 0 failures.

- [ ] **Step 6: Check it in the browser**

Run: `npm start`, then open http://localhost:3000/deploys. Check that:
- "Deploys" is in the nav right after "Services" and is highlighted.
- Choosing "staging" reloads with `?env=staging&sort=startedAt&dir=desc`.
- Clicking "Service" keeps `env=staging`.
- The chips are green, red, amber and blue.
- The in-progress `search` deploy shows "running".

Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js README.md
git commit -m "Deploys: add the /deploys route and nav link"
```
