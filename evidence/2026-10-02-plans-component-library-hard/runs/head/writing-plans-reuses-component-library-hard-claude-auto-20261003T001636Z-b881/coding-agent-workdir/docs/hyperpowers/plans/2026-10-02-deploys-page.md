# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page listing recent deploys from `data/deploys.json`, with an environment filter, sortable Service/Started columns, colored status chips and durations, linked from the nav after "Services".

**Architecture:** A new page module `src/pages/deploys.js` exports `renderDeploys(snapshot, query)`, which returns the page body HTML. It is built from the vendored Keel kit components (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `badge`, `emptyState`) rather than hand-written markup. It matches the Services page's *behavior* (query parsing, fallbacks, sort links that keep the filter, a filter form that keeps the sort) but not its markup. `src/server.js` gets a `/deploys` route reading the `deploys` snapshot, which also gives the page the existing 503 path. `src/layout.js` gets a nav entry.

**Tech Stack:** Node ≥ 20 ES modules, no dependencies, `node --test` with `node:assert/strict`, vendored kit under `vendor/kit/` imported as `#kit/<name>` (see `package.json` `imports`).

## Global Constraints

- Route is exactly `/deploys`; nav label is exactly "Deploys", placed directly after "Services".
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Snapshot shape: `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`; `status` ∈ `succeeded | failed | rolled-back | in-progress`; `finishedAt` is `null` while in progress.
- Header: "Deploys", with the snapshot time under it.
- Environment filter: dropdown with "All environments" (default), "production", "staging". Choosing one reloads with `?env=`, keeping the current sort.
- Table columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default. Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty: when the filter matches nothing, show "No deploys in staging" (naming the chosen environment) instead of the table.
- Missing or unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as other pages. Unknown `env`, `sort` or `dir` → the default.
- Tests: `node --test`. No new dependencies (`package.json` stays dependency-free).

**Spec interpretations (flag these if you disagree):**
- Query values: `sort` ∈ `service | startedAt` (default `startedAt`), `dir` ∈ `asc | desc` (default `desc`, because the default is newest first). So an unknown `dir` falls back to `desc`, and the same holds for a bare `?sort=service` with no `dir`. Sort header links always carry an explicit `dir`, so clicking never produces that case.
- The empty message for "All environments" (only reachable with an empty snapshot) is "No deploys".
- The snapshot time is shown as `Snapshot <generatedAt>`, matching the Overview page (`src/pages/overview.js:29`).
- Kit color tones map as: succeeded → `ok` (green `#1a7f37`), failed → `bad` (red `#cf222e`), rolled-back → `warn` (amber `#9a6700`), in-progress → `info` (blue `#0969da`). The colors are defined in `public/kit.css:2`. An unrecognized status falls back to the kit's `muted` grey.
- Ties in the Service sort keep snapshot order (the kit's sort is stable). The spec doesn't ask for a secondary key.

## Grounding

- Page module shape (named `renderX(snapshot, query)` export, top-of-file comment describing query params, module-level constants): `src/pages/services.js:5-16`.
- Query parsing with fallbacks to defaults, safe against prototype keys like `constructor`: `src/pages/services.js:14-16`.
- Sort header links carrying the filter (`?env=…&sort=…&dir=…`, the active column flips, others start ascending): `src/pages/services.js:30-38`. The kit reproduces this exactly in `vendor/kit/table/src/lib/table.js:46-56` when given `sortHref`.
- Filter form that keeps the sort as hidden inputs: `src/pages/services.js:88-94`. The kit equivalent is `filterBar({ keep })` in `vendor/kit/filter-bar/src/lib/filter-bar.js:15-21` plus `selectField` in `vendor/kit/select/src/lib/select.js:13-21`, auto-submitted by `public/kit.js:7-10`.
- Kit component use from a page, imported via `#kit/<name>`: `src/pages/services.js:1-2`, `src/pages/oncall.js:1-2`.
- Sortable table: `dataTable` in `vendor/kit/table/src/lib/table.js:20-44` (it sorts rows itself, takes `empty` HTML for no rows, and `render` cells are trusted HTML).
- Status chip: `badge(label, tone)` in `vendor/kit/badge/src/lib/badge.js:12-15`.
- Page title and subtitle: `pageHeader` in `vendor/kit/page-header/src/lib/page-header.js:10-14`.
- Empty state: `emptyState` in `vendor/kit/empty/src/lib/empty.js:9-12`.
- Escaping: kit components escape text via `esc` (`vendor/kit/utils/src/lib/utils.js:2-9`). App-written markup uses `escapeHtml` from `src/html.js:2-8`. This page writes no raw markup around snapshot values, so it needs no direct `escapeHtml`.
- Routing, snapshot read and 503 handling: `src/server.js:17-43` (a `ROUTES` table entry is all a page needs).
- Nav: `NAV` array in `src/layout.js:3-9`.
- Error handling: none in page modules. A bad snapshot read is handled centrally in `src/server.js:33-41`. Unknown query values are coerced, never rejected (`src/pages/services.js:14-16`).
- Page test shape (inline fixture snapshot, `renderX(snapshot, query)`, `assert.match` on exact HTML fragments, `indexOf` comparisons for row order): `test/pages/services.test.js:1-47`.
- Server test shape (call `handle(url, { dataDir })` directly, assert status and body): `test/server.test.js:1-29`.
- Temp-dir fixtures in tests: none (no existing pattern). Task 2 uses `node:fs/promises` `mkdtemp` with `node:os` `tmpdir()` for the malformed-snapshot case.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new module that composes several kit components and contains the page's logic (filter, sort, duration, chips, fallbacks).

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: kit exports `badge(label, tone)` from `#kit/badge`, `dataTable({ columns, rows, sort, sortHref, empty })` from `#kit/table`, `emptyState({ title })` from `#kit/empty`, `filterBar({ action, fields, keep })` from `#kit/filter-bar`, `pageHeader({ title, subtitle })` from `#kit/page-header`, `selectField({ name, label, options, value })` from `#kit/select`.
- Produces: `export function renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string, string>): string`, the page body HTML (not wrapped in the layout). Task 2 registers it in `ROUTES`.

**Mirror:** `src/pages/services.js:5-21`. Imitate the query parsing and constants; take markup from the kit components, not from this file.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

// Deliberately not in newest-first order, so the default sort is proven.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-2', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-09-30T06:45:00Z', finishedAt: '2026-09-30T06:47:30Z', author: 'sam' },
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'succeeded', startedAt: '2026-09-29T16:05:00Z', finishedAt: '2026-09-29T16:09:12Z', author: 'dana' },
    { id: 'd-3', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
  ],
};

const order = (html, services) => services.map((s) => html.indexOf(`<td>${s}</td>`));
const ascending = (positions) => positions.every((p, i) => p !== -1 && (i === 0 || positions[i - 1] < p));

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
});

test('lists every column, newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(
    html,
    /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th><th>Version<\/th><th>Environment<\/th><th>Status<\/th><th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th><th>Duration<\/th><th>Author<\/th>/,
  );
  assert.ok(ascending(order(html, ['search', 'notifications', 'billing', 'api-gateway'])));
  assert.match(html, /<td>api-gateway<\/td><td>3\.14\.2<\/td><td>production<\/td>/);
  assert.match(html, /<td>2026-09-29T16:05:00Z<\/td><td>4m 12s<\/td><td>dana<\/td>/);
});

test('sorts by service both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.ok(ascending(order(asc, ['api-gateway', 'billing', 'notifications', 'search'])));
  assert.match(asc, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.ok(ascending(order(desc, ['search', 'notifications', 'billing', 'api-gateway'])));
  assert.match(desc, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('sorts by start time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.ok(ascending(order(oldest, ['api-gateway', 'billing', 'notifications', 'search'])));
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
  const newest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' });
  assert.ok(ascending(order(newest, ['search', 'notifications', 'billing', 'api-gateway'])));
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
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>2026-10-01T09:05:00Z<\/td><td>running<\/td>/);
});

test('filters by environment, keeps the sort in the form and the filter in the sort links', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'desc' });
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<option value="all">All environments<\/option><option value="production" selected>production<\/option><option value="staging">staging<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="desc">/);
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\?env=production&amp;sort=startedAt&amp;dir=asc"/);
  assert.match(html, /<td>notifications<\/td>/);
  assert.match(html, /<td>api-gateway<\/td>/);
  assert.doesNotMatch(html, /<td>search<\/td>/);
  assert.doesNotMatch(html, /<td>billing<\/td>/);
});

test('names the environment when no deploys match', () => {
  const html = renderDeploys({ ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') }, { env: 'staging' });
  assert.match(html, /<option value="staging" selected>/);
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('says so when the snapshot has no deploys at all', () => {
  const html = renderDeploys({ ...snapshot, deploys: [] }, {});
  assert.match(html, /<p class="kit-empty__title">No deploys<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.ok(ascending(order(html, ['search', 'notifications', 'billing', 'api-gateway'])));
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

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

// Recent deploys. Filter with ?env=production|staging; sort with
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending,
// so newest first).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = ['service', 'startedAt'];
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
  { key: 'status', label: 'Status', render: (d) => badge(d.status, statusTone(d.status)) },
  { key: 'startedAt', label: 'Started', sortable: true },
  { key: 'duration', label: 'Duration', render: duration },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' ? 'asc' : 'desc';

  let deploys = snapshot.deploys;
  if (env !== 'all') deploys = deploys.filter((d) => d.environment === env);

  const filters = filterBar({
    action: '/deploys',
    fields: [
      selectField({
        name: 'env',
        label: 'Environment',
        options: ['all', ...ENVIRONMENTS].map((e) => ({ value: e, label: e === 'all' ? 'All environments' : e })),
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

function statusTone(status) {
  return Object.hasOwn(STATUS_TONES, status) ? STATUS_TONES[status] : 'muted';
}

// "4m 12s"; "running" until the deploy finishes.
function duration(deploy) {
  if (deploy.finishedAt === null) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `dataTable` sorts the rows itself, using `row[key]` as the value. ISO timestamps compare correctly as strings. Don't pre-sort.
- `sortHref` returns a raw `&`; the kit escapes it to `&amp;` (`vendor/kit/table/src/lib/table.js:55`).
- `render` output is trusted HTML. `badge` escapes its label, and `duration` only emits digits, `m`, `s`, spaces and "running".

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 10 tests.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS, 28 tests (18 existing + 10 new), 0 failures.

- [ ] **Step 6: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys: render the deploys page from the kit components"
```

---

### Task 2: Route, nav link and README

**Risk tier:** standard — multi-file integration (server routing, layout nav, README) with new server tests.

**Files:**
- Modify: `src/server.js:8-23` (import and `ROUTES` entry)
- Modify: `src/layout.js:3-9` (`NAV` entry)
- Modify: `README.md:14-18` (Pages list)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1). `handle(url, { dataDir })` from `src/server.js`. `readSnapshot('deploys', dir)` reads `<dir>/deploys.json`.
- Produces: `GET /deploys` → 200 page in the layout, or 503 "Snapshot unavailable" when `deploys.json` is missing or unparseable. Nav link `<a href="/deploys">Deploys</a>` after Services.

**Mirror:** `test/server.test.js:6-25` for test shape. `src/server.js:19` for the route entry.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, replace the imports at lines 1-4 with:

```js
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/server.js';
```

Change the path list in `serves every page in the nav` (line 15) to:

```js
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
```

Add these tests after `answers 503 when the snapshot cannot be read`:

```js
test('renders the deploys page inside the layout, with its link after Services', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>0\.9\.4<\/td>/);
  assert.doesNotMatch(res.body, /<td>1\.23\.0-rc\.1<\/td>/);
});

test('answers 503 on the deploys page when its snapshot is missing or unreadable', async () => {
  const missing = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const garbled = await mkdtemp(join(tmpdir(), 'harbor-'));
  await writeFile(join(garbled, 'deploys.json'), '{"generatedAt": ');
  for (const dataDir of [missing, garbled]) {
    const res = await handle('/deploys', { dataDir });
    assert.equal(res.status, 503, dataDir);
    assert.match(res.body, /<h1>Deploys<\/h1>/);
    assert.match(res.body, /Snapshot unavailable/);
  }
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. `serves every page in the nav` reports `404 !== 200` for `/deploys`, and the two new tests fail on status `404`.

- [ ] **Step 3: Add the route**

In `src/server.js`, add the import in alphabetical order (after line 7, before `renderIncidents`):

```js
import { renderDeploys } from './pages/deploys.js';
```

and add the route after the `/services` entry (line 19):

```js
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

- [ ] **Step 4: Add the nav link**

In `src/layout.js`, after `{ href: '/services', label: 'Services' },` (line 5), add:

```js
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `node --test test/server.test.js`
Expected: PASS, 7 tests.

- [ ] **Step 6: Update the README**

In `README.md`, replace line 16:

```
Overview, Services, Incidents, On-call and Runbooks, one module each in
```

with:

```
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module each in
```

- [ ] **Step 7: Run the full suite and smoke-test the page**

Run: `npm test`
Expected: PASS, 30 tests, 0 failures.

Run: `node --input-type=module -e "import { handle } from './src/server.js'; const r = await handle('/deploys?env=staging&sort=service&dir=asc'); console.log(r.status, r.body.match(/<tr>/g).length)"`
Expected: `200 5` (1 header row + the 4 staging deploys in `data/deploys.json`).

- [ ] **Step 8: Commit**

```bash
git add src/server.js src/layout.js README.md test/server.test.js
git commit -m "Deploys: route the page and link it from the nav"
```
