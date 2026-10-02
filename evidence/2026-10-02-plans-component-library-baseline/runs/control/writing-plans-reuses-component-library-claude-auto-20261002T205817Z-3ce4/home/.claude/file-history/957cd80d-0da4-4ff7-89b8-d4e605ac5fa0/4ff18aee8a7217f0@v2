# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page listing recent deploys from `data/deploys.json`, with an environment filter, sortable Service and Started columns, colored status chips, durations, an empty state, and the shared 503 page.

**Architecture:** One new page module, `src/pages/deploys.js`, built entirely from the vendored Harbor component library in `src/ui/` (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `statusChip`, `emptyState`), the same way `src/pages/overview.js` uses it. The page does **not** copy `src/pages/services.js`, which predates the library and hand-rolls its own table, select, pills and escaping. Then a route in `src/server.js` and a nav entry in `src/layout.js`; the server's existing snapshot-read `try/catch` already gives the 503.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`.

## Global Constraints

- Route is `/deploys`; the nav link reads "Deploys" and sits after "Services".
- Read-only. No deploy details page, no pagination, no live refresh, no actions on a deploy.
- Snapshot is `data/deploys.json` (`{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`), read via `readSnapshot('deploys')`.
- Header: "Deploys", with the snapshot time under it.
- Environment filter: dropdown with "All environments" (default), "production", "staging"; choosing one reloads with `?env=`, keeping the current sort.
- Table columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default. Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt` minus `startedAt` in minutes and seconds, such as "4m 12s"; in-progress shows "running".
- Empty: when the filter matches nothing, show "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing or unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as the other pages.
- Unknown `env`, `sort` or `dir` falls back to the default.
- No new dependencies; tests use `node --test`.
- Do not edit files under `src/ui/` (its header asks to keep local edits small so template updates still apply); everything this page needs is already there.

**Decisions this plan makes where the spec is silent** (flag in review if you disagree):

- Query values are `sort=service|startedAt`, `dir=asc|desc`, `env=production|staging`; "All environments" submits `env=` (empty), which falls back to all.
- Default sort is `startedAt` / `desc`. When `sort` is valid but `dir` is missing or unknown, `dir` falls back to that column's natural default: `desc` for `startedAt` (newest first), `asc` for `service` (A→Z).
- Rows that tie on the sort key keep snapshot order (the pipeline writes newest first; `dataTable` uses a stable `Array#sort`).
- Status chips map to the template tones: succeeded → `ok` (green `#1a7f37`), failed → `bad` (red `#cf222e`), rolled-back → `warn` (amber `#9a6700`), in-progress → `info` (blue `#0969da`) — `public/harbor.css:2,23-26`. No new CSS.
- Started shows the raw ISO timestamp, as the Services page does for Deployed.
- With "All environments" and an empty snapshot, the empty state says "No deploys".

## Grounding

- Page built from the component library: `src/pages/overview.js:1-24` — imports from `../ui/index.js`, `pageHeader({ title, subtitle: \`Snapshot ${snapshot.generatedAt}\` })`, `statusChip(label, tone)`.
- Query parsing with fallback to defaults: `src/pages/services.js:3-7` — `ENVIRONMENTS.includes(query.env) ? query.env : 'all'`. Imitate only this part of the file; its markup is pre-library.
- Filter form that keeps the sort: `src/ui/filter-bar.js:15-21` (`keep`) with `src/ui/select.js:13-21` (`data-autosubmit`, submitted by `public/harbor.js:1-5`).
- Sorting, sort links, and the empty case: `src/ui/table.js:20-69` — `columns[].render`/`sortable`, `sort: {key, dir}`, `sortHref(key, dir)`, `empty`; it escapes `sortHref` output and cell text.
- Empty state: `src/ui/empty-state.js:9-12`.
- Escaping: `src/ui/escape.js:2-9` (`esc`, re-exported from `src/ui/index.js`); `dataTable`, `statusChip`, `pageHeader`, `selectField` already escape their text, so the page needs no escaping of its own.
- Routing and the 503: `src/server.js:14-39` — `ROUTES` table entry `{ title, snapshot, render }`; `render(snapshot, query)`; catch around `readSnapshot` returns 503 "Snapshot unavailable".
- Nav: `src/layout.js:3-12` — `NAV` array; `aria-current="page"` on the active href.
- Naming: camelCase `renderX` exports per page (`src/pages/overview.js:5`, `src/pages/services.js:5`); module-level UPPER_SNAKE constants (`src/pages/services.js:3`); a short comment at the top of the page module describing its query parameters (`src/pages/services.js:1-2`).
- Page test shape: `test/pages/services.test.js:1-37` — inline fixture snapshot, `renderX(snapshot, query)`, `assert.match` on HTML fragments, row order via `html.indexOf('<td>…</td>')`.
- Server test shape: `test/server.test.js:1-23` — `handle(url, { dataDir })`, missing dir via `fileURLToPath(new URL('./no-such-dir/', import.meta.url))` for the 503.
- Error handling inside pages: none — pages assume a well-formed snapshot; read/parse failures are handled once in `src/server.js:27-37`.

Baseline: `npm test` passes 19 tests on `feature/deploys-page` at `a60bf45`.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module with query handling and its test file.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: from `src/ui/index.js` — `pageHeader({title, subtitle})`, `filterBar({action, fields, keep})`, `selectField({name, label, options, value})`, `dataTable({columns, rows, sort, sortHref, empty})`, `statusChip(label, tone)`, `emptyState({title})`. All return HTML strings.
- Produces:
  - `renderDeploys(snapshot: {generatedAt: string, deploys: object[]}, query: Record<string, string>): string` — page body HTML (no layout). Task 2 registers it in `ROUTES`.
  - `formatDuration(deploy: {startedAt: string, finishedAt: string | null}): string` — `"4m 12s"` or `"running"`.

**Mirror:** `src/pages/overview.js:1-24` for library use and header; `test/pages/services.test.js:1-37` for test shape.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

// Newest first, as the pipeline writes it.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-3', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-2', service: 'billing', version: '2.9.0', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'sam' },
    { id: 'd-1', service: 'api-gateway', version: '3.15.0-rc.1', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'dana' },
  ],
};

function order(html, ...services) {
  const positions = services.map((s) => html.indexOf(`<td>${s}</td>`));
  assert.ok(positions.every((p) => p >= 0), `all of ${services} rendered`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, `rows in order ${services}`);
}

test('shows the header with the snapshot time and the columns in order', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
  const headers = [...html.matchAll(/<th[^>]*>(?:<a[^>]*>)?([A-Za-z]+)/g)].map((m) => m[1]);
  assert.deepEqual(headers, ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
});

test('lists newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  order(html, 'search', 'notifications', 'billing', 'api-gateway');
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
});

test('sorts by started time oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  order(html, 'api-gateway', 'billing', 'notifications', 'search');
  assert.match(html, /<th aria-sort="ascending"><a href="\/deploys\?sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sorts by service both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  order(asc, 'api-gateway', 'billing', 'notifications', 'search');
  assert.match(asc, /<th aria-sort="ascending"><a href="\/deploys\?sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);

  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  order(desc, 'search', 'notifications', 'billing', 'api-gateway');
});

test('filters by environment and keeps the filter in the sort links', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  order(html, 'search', 'api-gateway');
  assert.doesNotMatch(html, /<td>notifications<\/td>/);
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
  assert.match(html, /href="\/deploys\?env=staging&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\/deploys\?env=staging&amp;sort=startedAt&amp;dir=asc"/);
});

test('the environment filter keeps the current sort', () => {
  const html = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="ui-select" data-autosubmit>/);
  assert.match(html, /<option value="" selected>All environments<\/option><option value="production">production<\/option><option value="staging">staging<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="desc">/);
});

test('colors each status', () => {
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
  assert.equal(formatDuration({ startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:50:09Z' }), '0m 9s');
  assert.equal(formatDuration({ startedAt: '2026-10-01T08:00:00Z', finishedAt: '2026-10-01T09:05:00Z' }), '65m 0s');
  assert.equal(formatDuration({ startedAt: '2026-10-01T08:50:00Z', finishedAt: null }), 'running');
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<div class="ui-empty"><p class="ui-empty__title">No deploys in staging<\/p><\/div>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'sideways' });
  order(html, 'search', 'notifications', 'billing', 'api-gateway');
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
});

test('an unknown dir falls back to the sorted column\'s default direction', () => {
  const html = renderDeploys(snapshot, { sort: 'service', dir: 'sideways' });
  order(html, 'api-gateway', 'billing', 'notifications', 'search');
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

- [ ] **Step 3: Write the implementation**

Create `src/pages/deploys.js`:

```js
import { dataTable, emptyState, filterBar, pageHeader, selectField, statusChip } from '../ui/index.js';

// Recent deploys. Filter with ?env=production|staging, sort with
// ?sort=service|startedAt and ?dir=asc|desc (newest first by default).
const ENVIRONMENTS = ['production', 'staging'];
const DEFAULT_DIR = { service: 'asc', startedAt: 'desc' };
const STATUS_TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

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
  const sort = Object.hasOwn(DEFAULT_DIR, query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : DEFAULT_DIR[sort];

  const deploys = env ? snapshot.deploys.filter((d) => d.environment === env) : snapshot.deploys;

  const filters = filterBar({
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
${filters}
${table}`;
}

// "4m 12s" from startedAt to finishedAt; "running" until the deploy finishes.
export function formatDuration({ startedAt, finishedAt }) {
  if (finishedAt == null) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
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
- `dataTable` escapes `sortHref` output, so `&` becomes `&amp;` in the markup; the tests expect that.
- `dataTable` returns `empty` instead of a `<table>` when `rows` is empty — that is the empty state; do not add a separate branch.
- Do not add CSS: the `ui-chip--*` tones in `public/harbor.css` already give the four colors.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 12 tests.

Then: `npm test`
Expected: PASS, 31 tests (19 baseline + 12).

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: `/deploys` route and nav link

**Risk tier:** standard — multi-file integration (server routing, shared layout, server tests).

**Files:**
- Modify: `src/server.js:7-17` (import and `ROUTES`)
- Modify: `src/layout.js:3-6` (`NAV`)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1); `readSnapshot('deploys', dataDir)` via the existing `ROUTES` mechanism.
- Produces: `handle('/deploys…')` → `{ status: 200 | 503, type, body }`; nav link `<a href="/deploys">Deploys</a>` after Services on every page.

**Mirror:** `src/server.js:14-17` for the route entry; `test/server.test.js:6-19` for the tests.

- [ ] **Step 1: Write the failing tests**

In `test/server.test.js`, change the imports at the top to:

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
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<td>notifications<\/td>/);
  assert.doesNotMatch(res.body, /<td>staging<\/td>/);
});

test('links Deploys in the nav after Services', async () => {
  const res = await handle('/services');
  assert.match(res.body, /aria-current="page">Services<\/a><a href="\/deploys">Deploys<\/a>/);
});

test('answers 503 when the deploys snapshot is missing', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot unavailable/);
});

test('answers 503 when the deploys snapshot is unreadable', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'harbor-'));
  await writeFile(join(dataDir, 'deploys.json'), '{"generatedAt": "2026-10-01T09:3');
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /Snapshot unavailable/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: the four new tests FAIL — `/deploys` answers 404 (`404 !== 200` / `404 !== 503`) and the nav has no Deploys link; the four existing tests still pass.

- [ ] **Step 3: Add the route and the nav link**

In `src/server.js`, add the import, keeping the page imports alphabetical:

```js
import { renderDeploys } from './pages/deploys.js';
import { renderOverview } from './pages/overview.js';
import { renderServices } from './pages/services.js';
```

and add the route last in `ROUTES`:

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

No change to `handle`: its existing `try/catch` around `readSnapshot` already returns the 503 for a missing or unparsable file.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS, 8 tests.

Then: `npm test`
Expected: PASS, 35 tests.

- [ ] **Step 5: Check it in the browser**

Run: `npm start`, open `http://localhost:3000/deploys`. Confirm: Deploys is the current nav item after Services; the 15 snapshot deploys show newest first with green/red/amber/blue chips; choosing "staging" reloads with `?env=` and keeps the sort; clicking Service sorts A→Z then Z→A and keeps the filter. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Route /deploys and link it in the nav"
```
