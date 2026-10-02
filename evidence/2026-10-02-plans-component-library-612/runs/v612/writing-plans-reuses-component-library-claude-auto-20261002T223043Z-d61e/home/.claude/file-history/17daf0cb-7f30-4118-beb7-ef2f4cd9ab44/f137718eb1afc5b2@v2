# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists recent deploys from `data/deploys.json`, with an environment filter, sortable Service/Started columns, colored status chips and durations, so whoever is on call can spot a failed or rolled-back deploy without opening the pipeline.

**Architecture:** A new page module `src/pages/deploys.js` exports `renderDeploys(snapshot, query)` and is composed entirely from the vendored component library in `src/ui/` (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `statusChip`, `emptyState`). `src/server.js` gets one new `ROUTES` entry, which gives it the existing 503 handling for free, and `src/layout.js` gets one new `NAV` entry after "Services".

**Tech Stack:** Node ≥20, ES modules, no dependencies, `node:test` + `node:assert/strict`.

## Global Constraints

- Node 20 or later (`"engines": { "node": ">=20" }`); no new dependencies.
- Tests run with `node --test` (`npm test`).
- Route is `/deploys`; the nav link label is "Deploys" and sits directly after "Services".
- Page title "Deploys"; snapshot time under it, rendered as `Snapshot <generatedAt>` (same as the Overview page).
- Environment filter options: "All environments" (default), "production", "staging". Query param `env`.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author.
- Default order: newest first (`startedAt` descending). Only Service and Started are sortable, via `?sort=` (`service` | `startedAt`) and `?dir=` (`asc` | `desc`).
- Changing the filter keeps the current sort; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s"; an in-progress deploy shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as the other pages.
- Unknown `env`, `sort` or `dir` value falls back to the default.
- Out of scope: details page, pagination, live refresh, actions on a deploy.
- **Build the page from `src/ui/` components.** Do not copy the hand-rolled markup in `src/pages/services.js` (its `escapeHtml`, `.pill-*` classes, inline `onchange`). The template's `harbor.css`/`harbor.js` already style and auto-submit the components, so **no CSS or JS changes are needed**.
- **Do not edit `src/ui/`.** It is vendored from the Harbor admin template ("Keep local edits small so template updates still apply").

## How the existing components map onto the spec

Read these before starting; the plan relies on their exact behavior.

| Spec element | Component | Notes |
|---|---|---|
| Header + snapshot time | `pageHeader({ title, subtitle })` | Escapes both. |
| Environment dropdown | `selectField({ name: 'env', label, options, value })` | Emits `data-autosubmit`; `public/harbor.js` submits the form on change. |
| Keep sort when filtering | `filterBar({ action, fields, keep })` | `keep` becomes hidden inputs; empty values are dropped. |
| Table, sorting, sort links | `dataTable({ columns, rows, sort, sortHref, empty })` | Sorts rows itself (stable sort, `localeCompare` on strings — ISO timestamps sort correctly). Active header gets `aria-sort` and ▲/▼; clicking an inactive header links to `asc`, the active one flips direction. |
| Status chip | `statusChip(label, tone)` | Tones: `ok` (green), `bad` (red), `warn` (amber, `--warn: #9a6700`), `info` (blue), `muted` (fallback). |
| Empty state | `emptyState({ title })` passed as `dataTable`'s `empty` | `dataTable` returns `empty` instead of a `<table>` when there are no rows. |

Interpretation decisions (spec is silent; flag in review if you disagree):

- "All environments" is the select option with value `''`, so the filter bar drops it and the URL has no `env` when "All" is chosen.
- `sort` and `dir` fall back independently: an unknown `sort` becomes `startedAt`, an unknown/missing `dir` becomes `desc`.
- If "All environments" is selected and the snapshot has no deploys at all, the empty state reads "No deploys".
- Ties under the Service sort keep snapshot order (the pipeline writes newest first), because `dataTable`'s sort is stable.

## File Structure

- Create `src/pages/deploys.js` — `renderDeploys(snapshot, query)`: query normalization, filtering, column definitions, status→tone mapping, duration format. One responsibility: the Deploys page body.
- Create `test/pages/deploys.test.js` — rendering tests.
- Modify `src/server.js` — import `renderDeploys`, add the `/deploys` route.
- Modify `src/layout.js` — add the "Deploys" nav entry.
- Modify `test/server.test.js` — route, nav and 503 tests.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module with filtering/sorting/fallback behavior.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: from `src/ui/index.js` — `dataTable`, `emptyState`, `filterBar`, `pageHeader`, `selectField`, `statusChip` (signatures as in the table above; do not modify them).
- Produces: `export function renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query?: Record<string, string>): string` — returns the page body HTML (no layout). `Deploy` is `{ id, service, version, environment, status, startedAt, finishedAt: string | null, author }`. Task 2 calls it as `route.render(snapshot, Object.fromEntries(searchParams))`.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`. The fixture is deliberately *not* in newest-first order, so the default-sort test proves the page sorts.

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-2', service: 'billing', version: '2.9.0-rc.3', environment: 'production', status: 'rolled-back', startedAt: '2026-09-30T06:45:00Z', finishedAt: '2026-09-30T06:47:30Z', author: 'sam' },
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'failed', startedAt: '2026-09-29T16:05:00Z', finishedAt: '2026-09-29T16:05:45Z', author: 'dana' },
    { id: 'd-3', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
  ],
};

// Service names in row order (Service is the first column).
function rowOrder(html) {
  return [...html.matchAll(/<tr><td>([^<]*)<\/td>/g)].map((m) => m[1]);
}

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1>/);
  assert.match(html, /Snapshot 2026-10-01T09:30:00Z/);
});

test('shows the columns in order', () => {
  const headers = [...renderDeploys(snapshot, {}).matchAll(/<th[^>]*>(?:<a [^>]*>)?([A-Za-z]+)/g)].map((m) => m[1]);
  assert.deepEqual(headers, ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
});

test('lists deploys newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.deepEqual(rowOrder(html), ['search', 'notifications', 'billing', 'api-gateway']);
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
});

test('sorts by started oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.deepEqual(rowOrder(html), ['api-gateway', 'billing', 'notifications', 'search']);
});

test('sorts by service both ways', () => {
  assert.deepEqual(rowOrder(renderDeploys(snapshot, { sort: 'service', dir: 'asc' })), [
    'api-gateway',
    'billing',
    'notifications',
    'search',
  ]);
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.deepEqual(rowOrder(desc), ['search', 'notifications', 'billing', 'api-gateway']);
  assert.match(desc, /<th aria-sort="descending"><a href="\/deploys\?sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('only Service and Started are sortable', () => {
  const links = [...renderDeploys(snapshot, {}).matchAll(/<th[^>]*><a /g)];
  assert.equal(links.length, 2);
});

test('sort links keep the environment filter', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.match(html, /<a href="\/deploys\?env=production&amp;sort=service&amp;dir=asc">Service<\/a>/);
  assert.match(html, /<a href="\/deploys\?env=production&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a>/);
});

test('filters by environment and keeps the current sort', () => {
  const html = renderDeploys(snapshot, { env: 'staging', sort: 'service', dir: 'asc' });
  assert.deepEqual(rowOrder(html), ['search']);
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="ui-select" data-autosubmit>/);
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="service">/);
  assert.match(html, /<input type="hidden" name="dir" value="asc">/);
});

test('defaults the filter to all environments', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.match(html, /<option value="production">production<\/option>/);
  assert.match(html, /<option value="staging">staging<\/option>/);
  assert.equal(rowOrder(html).length, 4);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="ui-chip ui-chip--ok">succeeded<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--bad">failed<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--info">in-progress<\/span>/);
});

test('formats the duration in minutes and seconds', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>0m 45s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('names the environment when the filter matches nothing', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="ui-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  assert.equal(renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'up' }), renderDeploys(snapshot, {}));
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

// Recent deploys. Filter with ?env=production|staging, sort with
// ?sort=service|startedAt and ?dir=asc|desc (newest first by default).
// Unknown values fall back to the defaults.
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = ['service', 'startedAt'];
const DIRS = ['asc', 'desc'];

const TONES = {
  succeeded: 'ok',
  failed: 'bad',
  'rolled-back': 'warn',
  'in-progress': 'info',
};

const COLUMNS = [
  { key: 'service', label: 'Service', sortable: true },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => statusChip(d.status, TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true },
  { key: 'duration', label: 'Duration', render: duration },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query = {}) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : '';
  const sort = {
    key: SORTS.includes(query.sort) ? query.sort : 'startedAt',
    dir: DIRS.includes(query.dir) ? query.dir : 'desc',
  };
  const deploys = env
    ? snapshot.deploys.filter((d) => d.environment === env)
    : snapshot.deploys;

  const filters = filterBar({
    action: '/deploys',
    fields: [
      selectField({
        name: 'env',
        label: 'Environment',
        value: env,
        options: [
          { value: '', label: 'All environments' },
          ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
        ],
      }),
    ],
    keep: { sort: sort.key, dir: sort.dir },
  });

  const table = dataTable({
    columns: COLUMNS,
    rows: deploys,
    sort,
    sortHref: (key, dir) => {
      const params = new URLSearchParams(env ? { env } : {});
      params.set('sort', key);
      params.set('dir', dir);
      return `/deploys?${params}`;
    },
    empty: emptyState({ title: env ? `No deploys in ${env}` : 'No deploys' }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filters}
${table}`;
}

// finishedAt is null while a deploy is in progress.
function duration({ startedAt, finishedAt }) {
  if (!finishedAt) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 13 tests.

Then run the whole suite: `npm test`
Expected: PASS, no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: Route and nav link

**Risk tier:** standard — multi-file integration (server routing + shared layout).

**Files:**
- Modify: `src/server.js` (imports at lines 6-8, `ROUTES` at lines 14-17)
- Modify: `src/layout.js` (`NAV` at lines 3-6)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query)` from `src/pages/deploys.js` (Task 1); `readSnapshot('deploys', dataDir)` via the existing route machinery in `handle()`.
- Produces: `GET /deploys` → 200 page wrapped in the layout, or 503 "Snapshot unavailable" when `data/deploys.json` cannot be read. Nav link `<a href="/deploys">Deploys</a>` after Services.

- [ ] **Step 1: Write the failing tests**

Append to `test/server.test.js`:

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<td>staging<\/td>/);
  assert.doesNotMatch(res.body, /<td>production<\/td>/);
});

test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /Snapshot unavailable/);
});

test('links Deploys in the nav after Services', async () => {
  const res = await handle('/');
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys">Deploys<\/a>/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: the three new tests FAIL (`/deploys` answers 404; nav has no Deploys link). The four existing tests still pass.

- [ ] **Step 3: Add the route**

In `src/server.js`, add the import after the `renderServices` import:

```js
import { renderDeploys } from './pages/deploys.js';
```

so the imports read:

```js
import { renderOverview } from './pages/overview.js';
import { renderServices } from './pages/services.js';
import { renderDeploys } from './pages/deploys.js';
import { pageHeader } from './ui/index.js';
```

and extend `ROUTES`:

```js
const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
};
```

No other server change: `handle()` already reads `route.snapshot`, returns the 503 page on a read failure, and passes the query as a plain object.

- [ ] **Step 4: Add the nav link**

In `src/layout.js`, replace `NAV` with:

```js
const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
];
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all tests, including the 3 new server tests and Task 1's 13 page tests.

- [ ] **Step 6: Check it in the browser**

Run: `npm start`, open `http://localhost:3000/deploys`.
Expected: "Deploys" is bold in the nav after "Services"; 10 rows from `data/deploys.json`, `search` (in-progress, "running") first; choosing "staging" reloads to `/deploys?env=staging&sort=startedAt&dir=desc` with 4 rows; clicking "Service" then gives `?env=staging&sort=service&dir=asc`. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Route /deploys and link it in the nav"
```
