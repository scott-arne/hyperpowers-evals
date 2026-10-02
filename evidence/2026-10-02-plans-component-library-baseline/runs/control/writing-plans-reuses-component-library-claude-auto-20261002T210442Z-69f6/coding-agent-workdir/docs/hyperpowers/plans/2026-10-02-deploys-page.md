# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** A read-only `/deploys` page that lists recent deploys from `data/deploys.json` with an environment filter, sortable Service and Started columns, colored status chips and durations, so on-call can spot a failed or rolled-back deploy without opening the pipeline.

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)`. It is built entirely from the vendored Harbor component library in `src/ui/` (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `statusChip`, `emptyState`, `esc`), which already provides the filter form with auto-submit and kept query state, sortable table headers with direction flipping, colored chips and the empty state. The server gets one more `ROUTES` entry, which gives the page the existing 503 handling for free, and the layout gets one nav link.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`.

## Global Constraints

- Route: `/deploys`; nav link label "Deploys", placed after "Services".
- Read-only. No deploy details page, no pagination, no live refresh, no actions on a deploy.
- Data: `data/deploys.json` → `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`. `status` ∈ `succeeded | failed | rolled-back | in-progress`; `finishedAt` is `null` while in progress.
- Header: "Deploys", with the snapshot time under it.
- Filter dropdown options, in order: "All environments" (default), "production", "staging". Choosing one reloads with `?env=`, keeping the current sort.
- Table columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default. Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty: when the filter matches nothing, show "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as the other pages. Unknown `env`, `sort` or `dir` → the default.
- No new dependencies (`README.md:12`: "No dependencies; Node 20 or later").
- **Use the `src/ui/` component library, not the hand-rolled markup in `src/pages/services.js`.** `services.js` predates the template and duplicates `escapeHtml`, `.pill` chips, `.filters` forms and `.services` tables; do not copy those, and do not add CSS to `public/app.css` — every class this page needs already exists in `public/harbor.css`. Do not edit files under `src/ui/` (`src/ui/index.js:1-2`: "Keep local edits small so template updates still apply"); nothing in this plan requires it.

## Grounding

- Page module naming and signature: `src/pages/services.js:5`, `export function renderServices(snapshot, query)` — pages export `render<Name>(snapshot, query)` and return an HTML string.
- Page built from `src/ui/` (imports from `../ui/index.js`, `pageHeader` with `Snapshot ${generatedAt}` subtitle, chip tone mapped at the call site): `src/pages/overview.js:1-23`.
- Query-value fallback (whitelist, else default): `src/pages/services.js:3-7`.
- Filter form with auto-submit and kept query state: `src/ui/filter-bar.js:15-21` + `src/ui/select.js:13-21`; `public/harbor.js` submits on `data-autosubmit` change. `filterBar` drops kept values that are `''`/`undefined`.
- Sortable table: `src/ui/table.js:20-69` — `dataTable` sorts rows by `sort` (stable `Array.prototype.sort`), links sortable headers via `sortHref(key, nextDir)` where `nextDir` is `desc` if the column is active ascending, else `asc`; it escapes the href (`&` → `&amp;`) and marks the active column with `aria-sort` and ▲/▼. Returns `empty` instead of the table when `rows` is empty.
- Status chip: `src/ui/chip.js:12-15` — tones `ok | warn | bad | info | muted`; colors in `public/harbor.css:2` (`--ok` green, `--warn` amber, `--bad` red, `--info` blue).
- Empty state: `src/ui/empty-state.js:9-12`.
- Routing and 503 error handling: `src/server.js:14-39` — a `ROUTES` entry `{ title, snapshot, render }`; a failed `readSnapshot` yields a 503 with "Snapshot unavailable" for any route.
- Nav: `src/layout.js:3-6` (`NAV` array, `aria-current="page"` on the active link).
- Page test shape: `test/pages/services.test.js:1-37` — inline fixture snapshot, `renderX(snapshot, query)`, `assert.match` on HTML and `indexOf` comparisons for order.
- Server test shape: `test/server.test.js:6-19` — `handle(url, { dataDir })`, missing `dataDir` for the 503.
- Error handling inside pages: none — pages do not catch; snapshot read errors are handled only in `src/server.js:27-37`.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module with filtering, sorting and formatting behavior.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: from `src/ui/index.js` — `pageHeader({ title, subtitle })`, `filterBar({ action, fields, keep })`, `selectField({ name, label, options, value })`, `dataTable({ columns, rows, sort, sortHref, empty })`, `statusChip(label, tone)`, `emptyState({ title })`, `esc(value)`.
- Produces: `export function renderDeploys(snapshot, query): string` in `src/pages/deploys.js`, where `snapshot` is the parsed `deploys.json` and `query` is a plain object of query-string values (`Object.fromEntries(searchParams)`, as `src/server.js:38` passes it). Task 2 registers it as a route.

**Mirror:** `src/pages/overview.js:1-23` — imports from `../ui/index.js`, `pageHeader` with the snapshot subtitle, tone mapped at the call site. Take only the naming and query-fallback idiom from `src/pages/services.js:3-7`, not its markup.

Behavior decisions this task locks in (all within the spec):
- "All environments" is the option with value `''`, so `filterBar`/`selectField` handle it natively; `env` is `''` for all.
- `sort` defaults to `startedAt`, `dir` defaults to `desc`. Each falls back independently: an unknown `dir` with a valid `sort` keeps the sort and uses `desc`.
- Sort links are absolute (`/deploys?…`) and include `env` only when a single environment is chosen.
- The filter bar always keeps the resolved `sort` and `dir`.
- With "All environments" and an empty snapshot, the empty state says "No deploys".

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-3', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-2', service: 'billing', version: '2.8.1', environment: 'production', status: 'failed', startedAt: '2026-10-01T08:00:00Z', finishedAt: '2026-10-01T08:01:05Z', author: 'lee' },
    { id: 'd-1', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T07:30:00Z', finishedAt: '2026-10-01T07:36:00Z', author: 'sam' },
  ],
};

// Positions of each service's cell, to compare row order.
function order(html, ...services) {
  return services.map((s) => html.indexOf(`<td>${s}</td>`));
}

function assertAscending(positions) {
  positions.forEach((p) => assert.notEqual(p, -1));
  for (let i = 1; i < positions.length; i++) assert.ok(positions[i - 1] < positions[i], `${positions}`);
}

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1>/);
  assert.match(html, /<p class="ui-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
});

test('shows the columns in order', () => {
  const html = renderDeploys(snapshot, {});
  const labels = ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author'];
  assertAscending(labels.map((l) => html.search(new RegExp(`<th[^>]*>(<a [^>]*>)?${l}`))));
});

test('lists newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assertAscending(order(html, 'search', 'notifications', 'billing', 'api-gateway'));
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
});

test('sorts by started oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assertAscending(order(html, 'api-gateway', 'billing', 'notifications', 'search'));
});

test('sorts by service both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assertAscending(order(asc, 'api-gateway', 'billing', 'notifications', 'search'));
  assert.match(asc, /<th aria-sort="ascending"><a href="\/deploys\?sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);

  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assertAscending(order(desc, 'search', 'notifications', 'billing', 'api-gateway'));
});

test('sort links keep the filter', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.match(html, /href="\/deploys\?env=production&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\/deploys\?env=production&amp;sort=startedAt&amp;dir=asc"/);
});

test('filters by environment and keeps the sort', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'desc' });
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="service">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
  assert.doesNotMatch(html, /<td>search<\/td>/);
  assertAscending(order(html, 'notifications', 'billing', 'api-gateway'));
});

test('offers all environments, production and staging', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(
    html,
    /<select name="env" class="ui-select" data-autosubmit><option value="" selected>All environments<\/option><option value="production">production<\/option><option value="staging">staging<\/option><\/select>/,
  );
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="ui-chip ui-chip--ok">succeeded<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--bad">failed<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--info">in-progress<\/span>/);
});

test('formats durations as minutes and seconds, running while in progress', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>1m 5s<\/td>/);
  assert.match(html, /<td>6m 0s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('names the environment when the filter matches nothing', () => {
  const production = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(production, { env: 'staging' });
  assert.match(html, /<p class="ui-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'sideways' });
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assertAscending(order(html, 'search', 'notifications', 'billing', 'api-gateway'));
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
});

test('keeps a valid sort when only dir is unknown', () => {
  const html = renderDeploys(snapshot, { sort: 'service', dir: 'up' });
  assertAscending(order(html, 'search', 'notifications', 'billing', 'api-gateway'));
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('escapes deploy fields', () => {
  const evil = { generatedAt: 'x', deploys: [{ ...snapshot.deploys[1], author: '<script>' }] };
  assert.match(renderDeploys(evil, {}), /<td>&lt;script&gt;<\/td>/);
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
  { key: 'duration', label: 'Duration', render: (d) => esc(duration(d)) },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : '';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = DIRS.includes(query.dir) ? query.dir : 'desc';

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
    sortHref: (key, next) =>
      `/deploys?${new URLSearchParams({ ...(env && { env }), sort: key, dir: next })}`,
    empty: emptyState({ title: env ? `No deploys in ${env}` : 'No deploys' }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filters}
${table}`;
}

// "4m 12s" from start to finish; "running" until the deploy finishes.
function duration(deploy) {
  if (deploy.status === 'in-progress' || !deploy.finishedAt) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 14 tests.

Then run the whole suite: `npm test`
Expected: PASS, 33 tests (19 existing + 14 new).

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: Route and nav link

**Risk tier:** standard — wires the page into the server and the shared layout (two source files plus tests), though every line is given here.

**Files:**
- Modify: `src/server.js:7-8` (import), `src/server.js:14-17` (`ROUTES`)
- Modify: `src/layout.js:3-6` (`NAV`)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1); `readSnapshot('deploys', dataDir)` via the existing route handling in `src/server.js:26-38`.
- Produces: `GET /deploys` → 200 page, or 503 "Snapshot unavailable" when `deploys.json` can't be read; a "Deploys" nav link after "Services" on every page.

**Mirror:** `src/server.js:15-16` (route entries) and `test/server.test.js:6-19` (route and 503 tests).

- [ ] **Step 1: Write the failing tests**

Append to `test/server.test.js`:

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<td>search<\/td>/);
  assert.doesNotMatch(res.body, /<td>production<\/td>/);
});

test('links Deploys in the nav after Services', async () => {
  const res = await handle('/');
  assert.match(res.body, />Services<\/a><a href="\/deploys">Deploys<\/a>/);
});

test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

(The first test reads the committed `data/deploys.json`, which has a staging `search` deploy, `d-1042`.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL — the deploys tests get status 404 instead of 200/503, and the nav test finds no Deploys link.

- [ ] **Step 3: Register the route and the nav link**

In `src/server.js`, add the import after the overview import:

```js
import { renderDeploys } from './pages/deploys.js';
import { renderOverview } from './pages/overview.js';
import { renderServices } from './pages/services.js';
```

and the route:

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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 36 tests.

Then check it by hand: `npm start`, open `http://localhost:3000/deploys`, change the environment dropdown (the page reloads with `?env=` and the sort kept), click the Service and Started headers (the filter is kept), and confirm the chips are green/red/amber/blue.

- [ ] **Step 5: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Serve the deploys page and link it in the nav"
```
