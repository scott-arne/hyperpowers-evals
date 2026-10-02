# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists the last 50 deploys from `data/deploys.json`, with an environment filter, Service/Started sorting, colored status chips and durations.

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)` like the other pages. It is built entirely from the vendored component library in `src/ui/` — `pageHeader`, `filterBar` + `selectField`, `dataTable` (which already does sorting, sort links with `aria-sort`, and the empty slot), `statusChip` and `emptyState` — so it needs no new CSS and no changes to `src/ui/`. The server gets one more route entry, which brings the existing 503 handling for free, and the layout nav gets one more link.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node:test` + `node:assert/strict`.

## Global Constraints

- No dependencies; `"engines": { "node": ">=20" }` stays as is.
- Tests run with `node --test` (`npm test`); tests live under `test/` mirroring `src/`.
- Do not edit `src/ui/` — it is vendored from the Harbor admin template ("Keep local edits small so template updates still apply"). Everything this page needs is already there.
- Do not add styles to `public/app.css`; `public/harbor.css` already styles `ui-table`, `ui-filter-bar`, `ui-field`, `ui-select`, `ui-chip--*` and `ui-empty`. `public/harbor.js` already auto-submits `data-autosubmit` selects, so no inline `onchange`.
- Route: `/deploys`. Nav label: "Deploys", placed after "Services".
- Header title: "Deploys", with the snapshot time under it (rendered as `Snapshot <generatedAt>`, matching the Overview page).
- Filter options: "All environments" (default), "production", "staging". Query param `env`. Changing it keeps the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author.
- Default order: newest first (`startedAt` descending). Sortable both ways: Service and Started, via `?sort=` (`service` | `startedAt`) and `?dir=` (`asc` | `desc`). Changing the sort keeps the filter.
- Status chip tones: `succeeded` → `ok` (green), `failed` → `bad` (red), `rolled-back` → `warn` (amber), `in-progress` → `info` (blue).
- Duration: `finishedAt − startedAt` as `<m>m <s>s`, e.g. "4m 12s". In-progress shows "running".
- Empty filter result: "No deploys in <env>" (e.g. "No deploys in staging") in place of the table.
- Missing/unreadable `deploys.json` → the shared 503 "Snapshot unavailable" page.
- Unknown `env`, `sort` or `dir` → that value falls back to its default (`env` → all, `sort` → `startedAt`, `dir` → `desc`).
- Out of scope: deploy details page, pagination, live refresh, actions on a deploy.

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `src/pages/deploys.js` | Create | `renderDeploys(snapshot, query)`: parse/fall back query, filter, compose `src/ui` components. `formatDuration(deploy)` helper. |
| `test/pages/deploys.test.js` | Create | Rendering tests: header, chips, duration, default/both sorts, filter, empty state, query fallbacks. |
| `src/server.js` | Modify (`ROUTES`, imports) | Route `/deploys` to `renderDeploys` with the `deploys` snapshot. |
| `src/layout.js` | Modify (`NAV`) | Add the "Deploys" nav link after "Services". |
| `test/server.test.js` | Modify (append) | Route renders in layout, nav order, 503 for the deploys page. |

Note for the implementer: `src/pages/services.js` hand-rolls its table, select, chips and escaping instead of using `src/ui/`. **Do not copy it.** The deploys page follows `src/pages/overview.js`, which uses the component library. Migrating the services page is not part of this plan.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new module with query parsing, filtering and sorting logic.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing, from `src/ui/index.js`, do not modify):
  - `pageHeader({ title, subtitle?, actions? }) → string`
  - `filterBar({ action, fields: string[], keep?: Record<string, string|undefined> }) → string` — drops `keep` entries that are `undefined` or `''`.
  - `selectField({ name, label, options: {value, label}[], value? }) → string` — emits `data-autosubmit`.
  - `dataTable({ columns, rows, sort?: {key, dir}, sortHref?: (key, dir) => string, empty?: string }) → string` — sorts rows by `sort` (stable; compares `col.value ?? row[key]`, strings via `localeCompare`), escapes `row[key]` unless the column has `render`, escapes the `sortHref` result, links the next direction (`asc` unless the column is active ascending), returns `empty` when `rows` is empty.
  - `statusChip(label, tone) → string` — unknown tone falls back to `muted`.
  - `emptyState({ title, body? }) → string`
  - `esc(value) → string`
- Produces:
  - `renderDeploys(snapshot: {generatedAt: string, deploys: Deploy[]}, query: Record<string, string>) → string` (page body HTML; the server wraps it in the layout)
  - `formatDuration(deploy: {status: string, startedAt: string, finishedAt: string|null}) → string`

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`. The fixture is deliberately out of order, and its service names are chosen so that all four orders (service asc/desc, started asc/desc) differ from each other.

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-2', service: 'api-gateway', version: '3.15.0-rc.1', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-4', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-09-30T16:05:00Z', finishedAt: '2026-09-30T16:12:48Z', author: 'dana' },
    { id: 'd-3', service: 'search', version: '1.22.2', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
  ],
};

// Service names of the body rows, top to bottom. Header rows start with <th>.
const order = (html) => [...html.matchAll(/<tr><td>([^<]+)<\/td>/g)].map((m) => m[1]);

test('shows the title and snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
});

test('lists every deploy newest first with the spec columns', () => {
  const html = renderDeploys(snapshot, {});
  assert.deepEqual(order(html), ['billing', 'search', 'api-gateway', 'notifications']);
  const headers = [...html.matchAll(/<th[^>]*>(?:<a [^>]*>)?([A-Za-z]+)/g)].map((m) => m[1]);
  assert.deepEqual(headers, ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\/deploys\?sort=service&amp;dir=asc">Service<\/a><\/th>/);
  assert.match(html, /<th>Version<\/th>/);
});

test('sorts by service both ways', () => {
  assert.deepEqual(order(renderDeploys(snapshot, { sort: 'service', dir: 'asc' })), [
    'api-gateway', 'billing', 'notifications', 'search',
  ]);
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.deepEqual(order(desc), ['search', 'notifications', 'billing', 'api-gateway']);
  assert.match(desc, /<th aria-sort="descending"><a href="\/deploys\?sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('sorts by started both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.deepEqual(order(asc), ['notifications', 'api-gateway', 'search', 'billing']);
  assert.match(asc, /<th aria-sort="ascending"><a href="\/deploys\?sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
  assert.deepEqual(order(renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' })), [
    'billing', 'search', 'api-gateway', 'notifications',
  ]);
});

test('colors each status with its chip tone', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="ui-chip ui-chip--ok">succeeded<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--bad">failed<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--info">in-progress<\/span>/);
});

test('formats durations in minutes and seconds, and running while in progress', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>7m 48s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
  assert.equal(formatDuration({ status: 'succeeded', startedAt: '2026-10-01T08:00:00Z', finishedAt: '2026-10-01T08:00:09Z' }), '0m 9s');
  assert.equal(formatDuration({ status: 'succeeded', startedAt: '2026-10-01T08:00:00Z', finishedAt: '2026-10-01T09:15:00Z' }), '75m 0s');
});

test('filters by environment and keeps the sort', () => {
  const html = renderDeploys(snapshot, { env: 'staging', sort: 'service', dir: 'asc' });
  assert.deepEqual(order(html), ['api-gateway', 'billing']);
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="ui-select" data-autosubmit>/);
  assert.match(html, /<option value="">All environments<\/option>/);
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="service">/);
  assert.match(html, /<input type="hidden" name="dir" value="asc">/);
});

test('sort links keep the filter', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.match(html, /href="\/deploys\?env=production&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\/deploys\?env=production&amp;sort=startedAt&amp;dir=asc"/);
});

test('names the environment when the filter matches nothing', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<div class="ui-empty"><p class="ui-empty__title">No deploys in staging<\/p><\/div>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'up' });
  assert.deepEqual(order(html), ['billing', 'search', 'api-gateway', 'notifications']);
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
  assert.doesNotMatch(html, /moon/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL — `Cannot find module '.../src/pages/deploys.js'` (ERR_MODULE_NOT_FOUND).

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
  { key: 'duration', label: 'Duration', render: (d) => esc(formatDuration(d)) },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  // Unknown values fall back to the defaults: all environments, newest first.
  const env = ENVIRONMENTS.includes(query.env) ? query.env : '';
  const sort = {
    key: SORTS.includes(query.sort) ? query.sort : 'startedAt',
    dir: DIRS.includes(query.dir) ? query.dir : 'desc',
  };

  const deploys = env
    ? snapshot.deploys.filter((d) => d.environment === env)
    : snapshot.deploys;

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
    sortHref: (key, dir) => `/deploys?${new URLSearchParams({ ...(env && { env }), sort: key, dir })}`,
    empty: emptyState({ title: env ? `No deploys in ${env}` : 'No deploys' }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filter}
${table}`;
}

// "4m 12s" from startedAt to finishedAt; "running" until the deploy finishes.
export function formatDuration({ status, startedAt, finishedAt }) {
  if (status === 'in-progress') return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Why this shape:
- `startedAt` values are UTC ISO-8601 strings in one format, so `dataTable`'s `localeCompare` orders them chronologically; no `value` function needed.
- `env` uses `''` for "all" so the "All environments" option has `value=""` and `?env=` (submitted by the form) falls back to all, the same convention as `test/ui/select.test.js`.
- `filterBar` always keeps the resolved sort, so changing the environment preserves it; `sortHref` includes `env` only when one is chosen, so sorting preserves the filter.
- When `env` is all and the snapshot has no deploys, the page says "No deploys" (the spec only names the filtered case).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS — 10 tests, 0 failures.

Then the whole suite: `npm test`
Expected: PASS — 29 tests (19 existing + 10 new), 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "feat: render the deploys page from the ui components"
```

---

### Task 2: Route `/deploys` and add it to the nav

**Risk tier:** standard — multi-file integration (server routing + layout) with server tests.

**Files:**
- Modify: `src/server.js` (imports; `ROUTES` object)
- Modify: `src/layout.js` (`NAV` array)
- Test: `test/server.test.js` (append three tests)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query) → string` from `src/pages/deploys.js` (Task 1); existing `handle(url, { dataDir }) → Promise<{status, type, body}>` and `readSnapshot(name, dir)` (reads `data/<name>.json`).
- Produces: `GET /deploys` → 200 page wrapped in the layout with `<title>Deploys · Harbor</title>`, or 503 "Snapshot unavailable" when `deploys.json` can't be read.

- [ ] **Step 1: Write the failing tests**

Append to `test/server.test.js`:

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<option value="production" selected>production<\/option>/);
  assert.match(res.body, /<td>0\.9\.4<\/td>/);
  assert.doesNotMatch(res.body, /<td>1\.23\.0-rc\.1<\/td>/);
});

test('links Deploys in the nav after Services', async () => {
  const { body } = await handle('/');
  const services = body.indexOf('<a href="/services">Services</a>');
  const deploys = body.indexOf('<a href="/deploys">Deploys</a>');
  assert.ok(services !== -1 && deploys > services);
});

test('answers 503 on the deploys page when its snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

(`0.9.4` is the production `notifications` deploy `d-1041` in `data/deploys.json`; `1.23.0-rc.1` is the staging `search` deploy `d-1042`, which the filter must hide.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL — the deploys-page and 503 tests get status 404, and the nav test finds no Deploys link. The four existing tests still pass.

- [ ] **Step 3: Add the route**

In `src/server.js`, add the import after the services page import:

```js
import { renderDeploys } from './pages/deploys.js';
```

so the page imports read:

```js
import { renderDeploys } from './pages/deploys.js';
import { renderOverview } from './pages/overview.js';
import { renderServices } from './pages/services.js';
```

and add the route entry after `/services`:

```js
const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
};
```

Nothing else in `handle` changes: it already reads `route.snapshot`, returns the shared 503 page with the route's title on a read or parse failure, and passes the query as a plain object.

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

Run: `node --test test/server.test.js`
Expected: PASS — 7 tests, 0 failures.

Then the whole suite: `npm test`
Expected: PASS — 32 tests, 0 failures.

- [ ] **Step 6: Check it in the browser**

Run: `npm start`, open `http://localhost:3000/deploys`.
Expected: "Deploys" is in the nav after "Services" and underlined; ten rows, the in-progress `search` deploy first with a blue chip and "running"; choosing "staging" reloads with `?env=staging&sort=startedAt&dir=desc` and four rows; clicking "Service" sorts A→Z and keeps `env=staging`. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "feat: serve the deploys page and link it in the nav"
```
