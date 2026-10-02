# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists the last 50 deploys from `data/deploys.json`, filterable by environment and sortable by service or start time, so whoever is on call can spot a failed or rolled-back deploy at a glance.

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)`. It is built **entirely from the vendored Harbor component library in `src/ui/`** (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `statusChip`, `emptyState`), the way `src/pages/overview.js` already is. The server gains a `/deploys` route and the layout gains a "Deploys" nav link; the existing route table and 503 handling cover the rest with no new error code.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`.

## Global Constraints

- Route: `/deploys`. Nav link label "Deploys", placed after "Services".
- Snapshot: `data/deploys.json`, read with the existing `readSnapshot('deploys', dataDir)`. It already exists in the repo.
- `status` values: `succeeded`, `failed`, `rolled-back`, `in-progress`. `finishedAt` is null while a deploy is in progress.
- Header: "Deploys", with the snapshot time under it.
- Environment filter options: "All environments" (default), "production", "staging". Choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author.
- Default order: newest first (`startedAt` descending). Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s"; an in-progress deploy shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json`: the same 503 "Snapshot unavailable" page as the other pages.
- Unknown `env`, `sort` or `dir` falls back to the default.
- Out of scope: details page, pagination, live refresh, actions on a deploy.
- Tests: `node --test` (`npm test`).
- No new dependencies. No new CSS: every class the page emits already exists in `public/harbor.css`.

## Reuse, not reinvention

`src/pages/services.js` predates the template and hand-rolls its own filter form, inline `onchange`, table markup, `.pill` classes and `escapeHtml`. **Do not copy it.** The template library already implements every piece the spec asks for:

| Spec need | Library component (`src/ui/index.js`) | Notes |
|---|---|---|
| Header + snapshot time | `pageHeader({ title, subtitle })` | Same call as `overview.js`. |
| Env dropdown that reloads | `filterBar({ action, fields, keep })` + `selectField({ name, label, options, value })` | `selectField` sets `data-autosubmit`; `public/harbor.js` submits the form on change. `keep` writes hidden inputs, so the filter keeps `sort`/`dir`. `keep` drops empty values. |
| Table with two-way sortable headers | `dataTable({ columns, rows, sort, sortHref, empty })` | Sorts rows itself by `sort.key`/`sort.dir`, renders ▲/▼ and `aria-sort`, links an active header to the flipped direction and an inactive one to `asc`. `Array.prototype.sort` is stable, so pre-sorting rows newest-first keeps ties newest-first. |
| Colored status chip | `statusChip(label, tone)` | Tones map to CSS vars: `ok` green `#1a7f37`, `bad` red `#cf222e`, `warn` amber `#9a6700`, `info` blue `#0969da`. Unknown tone → `muted`. |
| Empty state | `emptyState({ title })`, passed as `dataTable`'s `empty` | `dataTable` returns `empty` instead of the table when there are no rows. |
| Escaping | `esc` / built into every component | `dataTable` escapes plain cells; `render` cells are trusted HTML. |

Refactoring `services.js` onto the library is a reasonable follow-up but is **not** part of this plan (one problem per change).

## Design decisions the spec leaves open

- **"All environments" value:** the empty string. `?env=` (empty) and any unknown value both resolve to "all". Since `filterBar` drops empty `keep` values and sort links omit `env` when it is "all", URLs stay clean.
- **Each query value falls back independently:** `env` → all, `sort` → `startedAt`, `dir` → `desc`. So `?sort=service&dir=up` means service descending. (Users never produce this — `dataTable` links always carry a valid `dir`.)
- **Started column** shows the raw ISO `startedAt`, matching how `services.js` shows `deployedAt` and how the header shows `generatedAt`.
- **"running"** is keyed on `finishedAt == null` (the spec says that is exactly the in-progress case), which also avoids a `NaN` duration.
- **Durations ≥ 1 hour** stay in minutes ("75m 5s"); the spec specifies minutes and seconds only.
- **Unfiltered and empty** (the snapshot has no deploys at all) shows "No deploys". The spec only names the filtered case; this is the natural reading for "all".
- The filter keeps `sort` and `dir` even when they are the defaults — simpler, and harmless.

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/pages/deploys.js` | Create | `renderDeploys(snapshot, query)` and `formatDuration(deploy)`: query parsing with fallbacks, filtering, column definitions, composing the library components. |
| `test/pages/deploys.test.js` | Create | Rendering tests: header, filter, both sorts, sort links keep filter, chips, duration, empty state, fallbacks. |
| `src/server.js` | Modify (lines 7–8 imports, 14–17 `ROUTES`) | Register `/deploys`. |
| `src/layout.js` | Modify (lines 3–6 `NAV`) | Add the "Deploys" nav link after "Services". |
| `test/server.test.js` | Modify (append) | Route renders inside the layout, nav order, 503 for a missing snapshot. |

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new module with query parsing, sorting and filtering logic, not a pure transcription.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing, `src/ui/index.js`):
  - `pageHeader({ title: string, subtitle?: string, actions?: string }): string`
  - `filterBar({ action: string, fields: string[], keep?: Record<string, string|undefined> }): string`
  - `selectField({ name: string, label: string, options: Array<{value: string, label: string}>, value?: string }): string`
  - `dataTable({ columns, rows, sort?: {key, dir}, sortHref?: (key, dir) => string, empty?: string }): string`
  - `statusChip(label: string, tone?: 'ok'|'warn'|'bad'|'info'|'muted'): string`
  - `emptyState({ title: string, body?: string }): string`
- Produces:
  - `renderDeploys(snapshot: {generatedAt: string, deploys: Deploy[]}, query: Record<string, string>): string` — page body HTML (no layout). Task 2 registers it as a route renderer.
  - `formatDuration(deploy: {startedAt: string, finishedAt: string|null}): string` — `"4m 12s"` or `"running"`.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

// Deliberately not in date order, so the default sort is really exercised.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-1', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-3', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-0', service: 'api', version: '3.14.2', environment: 'production', status: 'rolled-back', startedAt: '2026-09-30T16:05:00Z', finishedAt: '2026-09-30T16:12:48Z', author: 'dana' },
    { id: 'd-2', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
  ],
};

// Asserts the service cells appear in exactly this order.
function assertOrder(html, services) {
  const positions = services.map((s) => html.indexOf(`<td>${s}</td>`));
  for (const p of positions) assert.notEqual(p, -1);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
}

test('shows the title and the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1>/);
  assert.match(html, /Snapshot 2026-10-01T09:30:00Z/);
});

test('lists the columns in order, newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(
    html,
    /<th><a [^>]*>Service<\/a><\/th><th>Version<\/th><th>Environment<\/th><th>Status<\/th><th aria-sort="descending"><a [^>]*>Started ▼<\/a><\/th><th>Duration<\/th><th>Author<\/th>/,
  );
  assertOrder(html, ['search', 'notifications', 'billing', 'api']);
});

test('sorts by service both ways', () => {
  assertOrder(renderDeploys(snapshot, { sort: 'service', dir: 'asc' }), ['api', 'billing', 'notifications', 'search']);
  assertOrder(renderDeploys(snapshot, { sort: 'service', dir: 'desc' }), ['search', 'notifications', 'billing', 'api']);
});

test('sorts by started oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assertOrder(html, ['api', 'billing', 'notifications', 'search']);
  assert.match(html, /<th aria-sort="ascending"><a href="\/deploys\?sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sort links keep the environment filter', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.match(html, /<a href="\/deploys\?env=staging&amp;sort=service&amp;dir=asc">Service<\/a>/);
  assert.match(html, /<a href="\/deploys\?env=staging&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a>/);
});

test('sort links leave env out for all environments', () => {
  assert.match(renderDeploys(snapshot, {}), /<a href="\/deploys\?sort=service&amp;dir=asc">Service<\/a>/);
});

test('filters by environment and keeps the sort in the filter form', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'desc' });
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="ui-select" data-autosubmit>/);
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="service">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
  assertOrder(html, ['notifications', 'api']);
  assert.doesNotMatch(html, /<td>search<\/td>/);
  assert.doesNotMatch(html, /<td>billing<\/td>/);
});

test('defaults the filter to all environments', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.match(html, /<option value="staging">staging<\/option>/);
});

test('colors each status with a chip', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="ui-chip ui-chip--ok">succeeded<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--bad">failed<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--info">in-progress<\/span>/);
});

test('shows durations in minutes and seconds, and running when unfinished', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>7m 48s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('formatDuration keeps long deploys in minutes', () => {
  assert.equal(formatDuration({ startedAt: '2026-10-01T09:00:00Z', finishedAt: '2026-10-01T10:15:05Z' }), '75m 5s');
  assert.equal(formatDuration({ startedAt: '2026-10-01T09:00:00Z', finishedAt: '2026-10-01T09:00:45Z' }), '0m 45s');
  assert.equal(formatDuration({ startedAt: '2026-10-01T09:00:00Z', finishedAt: null }), 'running');
});

test('names the environment when the filter matches nothing', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<div class="ui-empty"><p class="ui-empty__title">No deploys in staging<\/p><\/div>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  assert.equal(renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'up' }), renderDeploys(snapshot, {}));
});

test('falls back per value, keeping the valid ones', () => {
  assertOrder(renderDeploys(snapshot, { sort: 'service', dir: 'sideways' }), ['search', 'notifications', 'billing', 'api']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL — `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

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

// Deploys list. Filter with ?env=production|staging, sort with
// ?sort=service|startedAt and ?dir=asc|desc (newest first by default).
// Unknown values fall back to the default one by one.
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = ['service', 'startedAt'];
const DIRS = ['asc', 'desc'];

const STATUS_TONES = {
  succeeded: 'ok',
  failed: 'bad',
  'rolled-back': 'warn',
  'in-progress': 'info',
};

const COLUMNS = [
  { key: 'service', label: 'Service', sortable: true },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => statusChip(d.status, STATUS_TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true },
  { key: 'duration', label: 'Duration', render: formatDuration },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : '';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = DIRS.includes(query.dir) ? query.dir : 'desc';

  // Newest first before the table sorts, so deploys of the same service stay
  // newest first under the service sort.
  let deploys = [...snapshot.deploys].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (env) deploys = deploys.filter((d) => d.environment === env);

  const filter = filterBar({
    action: '/deploys',
    fields: [
      selectField({
        name: 'env',
        label: 'Environment',
        options: [
          { value: '', label: 'All environments' },
          ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
        ],
        value: env,
      }),
    ],
    keep: { sort, dir },
  });

  const table = dataTable({
    columns: COLUMNS,
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => deploysHref(env, key, next),
    empty: emptyState({ title: env ? `No deploys in ${env}` : 'No deploys' }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filter}
${table}`;
}

// "4m 12s", or "running" while the deploy has no finish time.
export function formatDuration(deploy) {
  if (deploy.finishedAt == null) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function deploysHref(env, sort, dir) {
  const params = new URLSearchParams();
  if (env) params.set('env', env);
  params.set('sort', sort);
  params.set('dir', dir);
  return `/deploys?${params}`;
}
```

Notes for the implementer:
- `render: formatDuration` works because `dataTable` calls `render(row)` with the deploy. Its output is digits and letters only, so it needs no escaping.
- Do not add CSS or edit anything under `src/ui/`. The vendored library is meant to stay close to the template (`src/ui/index.js` header comment).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, all 14 tests.

Then run the full suite: `npm test`
Expected: PASS, no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: `/deploys` route and nav link

**Risk tier:** standard — touches two source files plus tests (route table and shared layout), so not a single-file change.

**Files:**
- Modify: `src/server.js:7-8` (imports) and `src/server.js:14-17` (`ROUTES`)
- Modify: `src/layout.js:3-6` (`NAV`)
- Test: `test/server.test.js` (append)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1); existing `readSnapshot(name, dir)` via the route's `snapshot: 'deploys'`.
- Produces: `GET /deploys` → 200 page inside the layout, or 503 "Snapshot unavailable" when `deploys.json` cannot be read.

- [ ] **Step 1: Write the failing tests**

Append to `test/server.test.js`:

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<td>search<\/td>/);
  assert.match(res.body, /<option value="staging" selected>/);
});

test('links Deploys in the nav after Services', async () => {
  const res = await handle('/');
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys">Deploys<\/a>/);
});

test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

(`data/deploys.json` already contains a staging `search` deploy, `d-1042`.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: the three new tests FAIL (`/deploys` answers 404; the nav has no Deploys link). The four existing tests still pass.

- [ ] **Step 3: Register the route and the nav link**

In `src/server.js`, add the import after the overview import so the page imports stay alphabetical:

```js
import { renderDeploys } from './pages/deploys.js';
import { renderOverview } from './pages/overview.js';
import { renderServices } from './pages/services.js';
```

and add the route:

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

Nothing else changes: `handle` already passes `Object.fromEntries(searchParams)` as the query and already turns a failed snapshot read into the 503 page titled by the route.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS, all 7 tests.

Then: `npm test`
Expected: PASS, whole suite.

- [ ] **Step 5: Check it in the browser**

Run: `npm start`, open `http://localhost:3000/deploys`. Confirm: "Deploys" is underlined in the nav after "Services"; the chips are green/red/amber/blue; choosing "staging" reloads with `?env=staging` and the current sort; clicking "Service" twice flips ▲/▼ and keeps `env`. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Add the /deploys route and nav link"
```
