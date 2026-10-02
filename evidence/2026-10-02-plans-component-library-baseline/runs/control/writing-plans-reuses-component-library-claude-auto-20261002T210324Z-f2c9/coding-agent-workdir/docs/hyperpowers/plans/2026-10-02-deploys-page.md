# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page listing the pipeline's recent deploys, with an environment filter, sortable Service/Started columns, colored status chips, durations, and an empty state.

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)`. It is built entirely from the vendored component library in `src/ui/` (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `statusChip`, `emptyState`, `esc`), the way `src/pages/overview.js` is, **not** by hand-rolling HTML the way `src/pages/services.js` does. `dataTable` already sorts rows and renders sortable header links with `aria-sort`; `filterBar` already carries the current sort in hidden inputs; `public/harbor.js` already auto-submits `selectField` changes; `harbor.css` already styles every `ui-*` class including the four chip tones. So the page needs no new CSS, no JS, and no component changes. The route is one entry in `ROUTES` in `src/server.js` (which already provides the 503 path) plus one nav entry in `src/layout.js`.

**Tech Stack:** Node ≥20 ES modules, no dependencies, `node:test` + `node:assert/strict`.

## Global Constraints

- Route is `/deploys`; nav link label is "Deploys", placed after "Services".
- Snapshot is `data/deploys.json`, read through the existing `readSnapshot('deploys', dataDir)`.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`. Chip colors: succeeded green (`ok`), failed red (`bad`), rolled-back amber (`warn`), in-progress blue (`info`).
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author.
- Default order: newest first (`startedAt` descending). Service and Started sortable both ways via `?sort=` and `?dir=`; changing sort keeps `?env=`; changing env keeps sort.
- Filter dropdown options: "All environments" (default), "production", "staging"; uses `?env=`.
- Duration text: `"<m>m <s>s"`, e.g. "4m 12s"; in-progress (`finishedAt` null) shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json` → the existing 503 "Snapshot unavailable" page.
- Unknown `env`, `sort`, or `dir` values fall back to the default (all environments, `startedAt`, `desc`), each independently.
- Out of scope: details page, pagination, live refresh, any deploy actions.
- No new dependencies; tests run with `npm test` (`node --test`).
- Do not edit `src/ui/` — it is vendored from the Harbor template ("Keep local edits small so template updates still apply", `src/ui/index.js:1-2`). Everything the page needs already exists there.
- Do not copy `src/pages/services.js`'s pattern (inline `<table>`, `pill` classes, its own `escapeHtml`, inline `onchange`); it predates use of the component library.

## Grounding

- Page module shape and component use: `src/pages/overview.js:1-24`, imports from `../ui/index.js`, header via `pageHeader({ title, subtitle: \`Snapshot ${snapshot.generatedAt}\` })`, mapping domain state to a chip tone at the call site.
- Query parsing with fallback to default: `src/pages/services.js:3-7`, `ENVIRONMENTS` array and `includes()` check (imitate only this part of that file).
- Data table with sorting, sort links, empty content: `src/ui/table.js:3-56`, `columns` with `sortable`/`render`, `sort: {key, dir}`, `sortHref(key, dir)`, `empty`.
- Filter form keeping sort: `src/ui/filter-bar.js:3-21` and `src/ui/select.js:3-21`; select value `''` for "All" as in `test/ui/select.test.js:10`.
- Status chip tones: `src/ui/chip.js:3-15` (`ok|warn|bad|info|muted`, unknown → muted); colors in `public/harbor.css:2,23-27`.
- Empty state: `src/ui/empty-state.js:3-12`.
- Route table and 503 handling: `src/server.js:14-39`.
- Nav entries: `src/layout.js:3-6`.
- Naming: camelCase `renderX(snapshot, query)` page exports, `UPPER_SNAKE` module constants (`src/pages/services.js:3`, `src/server.js:11-17`).
- Error handling: pages don't handle I/O errors; `handle()` catches snapshot read/parse failures (`src/server.js:26-37`).
- Page test shape: `test/pages/services.test.js:1-37`, inline fixture snapshot, `assert.match` on HTML, `indexOf` for row order.
- Server test shape: `test/server.test.js:1-29`, call `handle(url, { dataDir })` directly; missing dir via `fileURLToPath(new URL('./no-such-dir/', import.meta.url))`.
- Malformed-snapshot fixture (temp dir with bad JSON): `none: no existing test writes a temp data dir`; Task 2 uses `node:fs/promises` `mkdtemp`/`writeFile` under `os.tmpdir()`.

---

### Task 1: Deploys page renderer

**Risk tier:** standard: new page module with query handling, composed from several components.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: from `src/ui/index.js`: `dataTable`, `emptyState`, `esc`, `filterBar`, `pageHeader`, `selectField`, `statusChip` (signatures as in the Grounding files).
- Produces:
  - `renderDeploys(snapshot: {generatedAt: string, deploys: Deploy[]}, query: Record<string, string>): string`: the page body HTML (no layout).
  - `formatDuration(deploy: {startedAt: string, finishedAt: string | null}): string`: `"running"` or `"<m>m <s>s"`.

**Mirror:** `src/pages/overview.js:1-24`, component imports, header/subtitle, tone mapping at the call site.

- [ ] **Step 1: Write the failing tests for the table**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

// Deliberately not in time order, so the default sort is exercised.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-2', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-0', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-3', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'dana' },
  ],
};

// Service names of the body rows, top to bottom.
function rowOrder(html) {
  return [...html.matchAll(/<tr><td>([^<]+)<\/td>/g)].map((m) => m[1]);
}

test('shows the title and the snapshot time', () => {
  assert.match(
    renderDeploys(snapshot, {}),
    /<h1>Deploys<\/h1><p class="ui-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/,
  );
});

test('lists deploys newest first with the spec columns', () => {
  const html = renderDeploys(snapshot, {});
  assert.deepEqual(rowOrder(html), ['search', 'notifications', 'api-gateway', 'billing']);
  assert.match(html, /<th><a href="\/deploys\?sort=service&amp;dir=asc">Service<\/a><\/th>/);
  assert.match(html, /<th>Version<\/th><th>Environment<\/th><th>Status<\/th>/);
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th>Duration<\/th><th>Author<\/th>/);
  assert.match(html, /<td>marco<\/td>/);
});

test('colors each status with a chip', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="ui-chip ui-chip--ok">succeeded<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--bad">failed<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--info">in-progress<\/span>/);
});

test('shows durations in minutes and seconds, and running while in progress', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('formatDuration', () => {
  assert.equal(formatDuration({ startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z' }), '4m 12s');
  assert.equal(formatDuration({ startedAt: '2026-10-01T08:00:00Z', finishedAt: '2026-10-01T08:03:00Z' }), '3m 0s');
  assert.equal(formatDuration({ startedAt: '2026-10-01T08:00:00Z', finishedAt: '2026-10-01T08:00:45Z' }), '0m 45s');
  assert.equal(formatDuration({ startedAt: '2026-10-01T08:00:00Z', finishedAt: null }), 'running');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL: `Cannot find module '.../src/pages/deploys.js'`.

- [ ] **Step 3: Write the failing tests for the query handling**

Append to `test/pages/deploys.test.js`:

```js
test('sorts by service both ways', () => {
  assert.deepEqual(rowOrder(renderDeploys(snapshot, { sort: 'service', dir: 'asc' })), [
    'api-gateway',
    'billing',
    'notifications',
    'search',
  ]);
  assert.deepEqual(rowOrder(renderDeploys(snapshot, { sort: 'service', dir: 'desc' })), [
    'search',
    'notifications',
    'billing',
    'api-gateway',
  ]);
});

test('sorts by start time both ways', () => {
  assert.deepEqual(rowOrder(renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' })), [
    'billing',
    'api-gateway',
    'notifications',
    'search',
  ]);
});

test('filters by environment and keeps the sort in the filter form', () => {
  const html = renderDeploys(snapshot, { env: 'staging', sort: 'service', dir: 'asc' });
  assert.deepEqual(rowOrder(html), ['billing', 'search']);
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="ui-select" data-autosubmit>/);
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
});

test('offers all environments by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<option value="" selected>All environments<\/option><option value="production">production<\/option><option value="staging">staging<\/option>/);
});

test('sort links keep the filter', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.match(html, /href="\/deploys\?env=staging&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\/deploys\?env=staging&amp;sort=startedAt&amp;dir=asc"/);
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="ui-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  assert.equal(
    renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'sideways' }),
    renderDeploys(snapshot, {}),
  );
});
```

- [ ] **Step 4: Implement the page**

Create `src/pages/deploys.js`:

```js
import {
  dataTable,
  emptyState,
  esc,
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
  { key: 'duration', label: 'Duration', render: (d) => esc(formatDuration(d)) },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : '';
  const sort = {
    key: SORTS.includes(query.sort) ? query.sort : 'startedAt',
    dir: DIRS.includes(query.dir) ? query.dir : 'desc',
  };

  // Newest first underneath any sort, so deploys of one service stay in time
  // order (dataTable's sort is stable).
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
    keep: { sort: sort.key, dir: sort.dir },
  });

  const table = dataTable({
    columns: COLUMNS,
    rows: deploys,
    sort,
    sortHref: (key, dir) => href({ env, sort: key, dir }),
    empty: emptyState({ title: env ? `No deploys in ${env}` : 'No deploys' }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filter}
${table}`;
}

// "4m 12s", or "running" while the deploy has not finished.
export function formatDuration({ startedAt, finishedAt }) {
  if (finishedAt == null) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

// Page link with the given query values; empty values are left out.
function href(params) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
  return `/deploys?${query}`;
}
```

Notes for the implementer:
- `esc` around `formatDuration` is because a column `render` returns trusted HTML (`src/ui/table.js:9`).
- Unknown statuses get `TONES[...] === undefined`, which `statusChip` renders as `muted`.
- The `'No deploys'` branch covers an empty snapshot with no filter, which the spec does not name; it keeps the page from saying "No deploys in ".

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 12 tests.

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: PASS, 31 tests, 0 failures.

- [ ] **Step 7: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys: render the deploys page from the template components"
```

---

### Task 2: `/deploys` route and nav link

**Risk tier:** standard: multi-file wiring (server routes, layout nav, server tests).

**Files:**
- Modify: `src/server.js:7-17` (import + `ROUTES` entry)
- Modify: `src/layout.js:3-6` (`NAV` entry)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1); existing `handle(url, { dataDir })`.
- Produces: `GET /deploys` → 200 page inside the layout, or 503 "Snapshot unavailable" when `deploys.json` is missing or unparseable; a "Deploys" nav link after "Services".

**Mirror:** `test/server.test.js:6-19`, direct `handle()` calls and the no-such-dir 503 test.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, replace the imports (lines 1-4) with:

```js
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/server.js';
```

and append:

```js
test('renders the deploys page inside the layout, linked after Services', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, />Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>search<\/td>/);
  assert.doesNotMatch(res.body, /<td>notifications<\/td>/);
});

test('answers 503 for deploys when the snapshot is missing', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot unavailable/);
});

test('answers 503 for deploys when the snapshot is half written', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'harbor-'));
  await writeFile(join(dataDir, 'deploys.json'), '{"generatedAt": "2026-10-01T09:30:00Z", "dep');
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /Snapshot unavailable/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: the three new tests FAIL (the first with status 404 instead of 200, the 503 tests with 404 instead of 503); the four existing tests pass.

- [ ] **Step 3: Add the route**

In `src/server.js`, add the import after the overview import (line 7):

```js
import { renderDeploys } from './pages/deploys.js';
```

and add the entry to `ROUTES` after `/services`:

```js
const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
};
```

(Import order: keep the existing alphabetical-by-path order: `./pages/deploys.js` goes before `./pages/overview.js`.)

- [ ] **Step 4: Add the nav link**

In `src/layout.js`:

```js
const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
];
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 34 tests, 0 failures.

- [ ] **Step 6: Check it in the real app**

Run: `PORT=3123 npm start` in the background, then:

```bash
curl -s 'http://localhost:3123/deploys?env=production&sort=service&dir=asc' | grep -o '<tr><td>[^<]*</td>'
```

Expected, in order: `api-gateway`, `billing`, `notifications`, `notifications`, `search`, `search` (the six production deploys in `data/deploys.json`; rows of the same service stay newest first). Stop the server afterwards.

- [ ] **Step 7: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Deploys: serve the page at /deploys and link it in the nav"
```
