# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page listing recent deploys from `data/deploys.json`, with an environment filter, sortable Service/Started columns, colored status chips and durations, so whoever is on call can spot a failed or rolled-back deploy.

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)`. Like `src/pages/overview.js`, it is built entirely from the vendored component library in `src/ui/` (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `statusChip`, `emptyState`, `esc`), which already does sorting, sort links, the auto-submitting filter form, escaping and the empty-state swap. The server gets one more `ROUTES` entry, so it inherits the existing snapshot read and 503 handling, and the layout gets one more nav item.

**Tech Stack:** Node ≥20 ES modules, no dependencies, `node:test` + `node:assert/strict` (`npm test` runs `node --test`).

## Global Constraints

- Route is exactly `/deploys`; nav label "Deploys", placed after "Services".
- Read-only: no details page, no pagination, no live refresh, no actions on a deploy.
- Data comes from `data/deploys.json` via the existing `readSnapshot('deploys', dataDir)`; `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`; `finishedAt` is null while in progress.
- Header "Deploys" with the snapshot time under it.
- Environment dropdown: "All environments" (default), "production", "staging"; choosing one reloads with `?env=` and keeps the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default. Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing or unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as the other pages. Unknown `env`, `sort` or `dir` → default.
- Tests use `node --test`.
- **Reuse `src/ui/`; do not copy `src/pages/services.js`.** That page predates the component library and hand-rolls its table, `pill-*` classes, `escapeHtml` and inline `onchange`. The deploys page must use the library components and the template's `ui-*` classes; it needs no changes to `public/app.css`, `public/harbor.css` or `public/harbor.js`. Do not edit `src/ui/` (the index says to keep template edits small, and nothing here needs one).

## Decisions the spec leaves open

- **Query values.** `sort` is `service` or `startedAt` (the column keys). The "All environments" option has value `""`, so `?env=` with no value means all — and `filterBar` already drops empty kept values.
- **Default direction per column.** With no valid `dir`, `startedAt` defaults to `desc` (newest first, the spec's default) and `service` defaults to `asc` (A→Z). An unknown `sort` falls back to `startedAt`.
- **Sort header links** follow `dataTable`'s existing behavior: clicking the active column flips its direction, clicking an inactive column sorts it `asc`.
- **Empty with "All environments"** (a snapshot with no deploys at all) says "No deploys".
- **Started** shows the ISO timestamp as-is, matching how the services page shows `deployedAt`.

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/pages/deploys.js` | Create | Resolve the query (with fallbacks), map statuses to chip tones, format durations, compose the page from `src/ui/` components. |
| `test/pages/deploys.test.js` | Create | Rendering tests: header, chips, durations, default order, both sorts both ways, sort links keeping the filter, filter keeping the sort, empty state, unknown query fallbacks. |
| `src/server.js` | Modify (`ROUTES`, imports) | Route `/deploys` to `renderDeploys` with the `deploys` snapshot. |
| `src/layout.js` | Modify (`NAV`) | Add the "Deploys" nav link after "Services". |
| `test/server.test.js` | Modify (append tests) | Route renders in the layout and passes the query; nav order; 503 for a missing and for a malformed `deploys.json`. |

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module whose query handling, sorting and filtering compose several library components; behavior beyond verbatim transcription.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing, from `src/ui/index.js`):
  - `pageHeader({ title, subtitle?, actions? }) → string`
  - `filterBar({ action, fields: string[], keep?: Record<string, string|undefined> }) → string` — empty/undefined `keep` values are dropped.
  - `selectField({ name, label, options: {value,label}[], value? }) → string` — rendered with `data-autosubmit`; `public/harbor.js` submits the form on change.
  - `dataTable({ columns, rows, sort?: {key, dir}, sortHref?: (key, dir) => string, empty?: string }) → string` — sorts `rows` by `sort` (string `localeCompare` for ISO timestamps and names), escapes cells without `render`, escapes `sortHref` output, returns `empty` instead of a table when `rows` is empty.
  - `statusChip(label, tone: 'ok'|'warn'|'bad'|'info'|'muted') → string` — `<span class="ui-chip ui-chip--<tone>">`; tone colors in `harbor.css`: ok green, warn amber, bad red, info blue.
  - `emptyState({ title, body? }) → string`
  - `esc(value) → string`
- Produces: `export function renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string, string>) → string` (HTML fragment for the layout body). Task 2 imports it from `./pages/deploys.js`.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`. The fixture is deliberately out of order so the default sort is actually exercised, and the start times are chosen so "by service" and "by start time" give different orders.

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-2', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-0', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-3', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:00:00Z', finishedAt: '2026-10-01T08:07:48Z', author: 'dana' },
  ],
};

// Service names in row order; the service is each row's first cell.
const order = (html) => [...html.matchAll(/<tr><td>([^<]+)<\/td>/g)].map((m) => m[1]);

test('shows the title and the snapshot time', () => {
  assert.match(
    renderDeploys(snapshot, {}),
    /<h1>Deploys<\/h1><p class="ui-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/,
  );
});

test('lists the columns in the spec order', () => {
  const heads = [...renderDeploys(snapshot, {}).matchAll(/<th[^>]*>(?:<a [^>]*>)?([A-Za-z]+)/g)].map((m) => m[1]);
  assert.deepEqual(heads, ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
});

test('lists newest deploys first by default', () => {
  assert.deepEqual(order(renderDeploys(snapshot, {})), ['search', 'notifications', 'api-gateway', 'billing']);
});

test('colors each status with its chip', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="ui-chip ui-chip--ok">succeeded<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--bad">failed<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--info">in-progress<\/span>/);
});

test('shows durations in minutes and seconds, and running while in progress', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>7m 48s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL — `Cannot find module '.../src/pages/deploys.js'`.

- [ ] **Step 3: Write the renderer with the default view**

Create `src/pages/deploys.js`:

```js
import { dataTable, esc, pageHeader, statusChip } from '../ui/index.js';

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
  { key: 'duration', label: 'Duration', render: (d) => esc(duration(d)) },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot) {
  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${dataTable({ columns: COLUMNS, rows: snapshot.deploys, sort: { key: 'startedAt', dir: 'desc' } })}`;
}

function duration(deploy) {
  if (!deploy.finishedAt) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Add the failing tests for sorting, filtering, the empty state and fallbacks**

Append to `test/pages/deploys.test.js`:

```js
test('sorts by service both ways', () => {
  assert.deepEqual(order(renderDeploys(snapshot, { sort: 'service', dir: 'asc' })), ['api-gateway', 'billing', 'notifications', 'search']);
  assert.deepEqual(order(renderDeploys(snapshot, { sort: 'service', dir: 'desc' })), ['search', 'notifications', 'billing', 'api-gateway']);
});

test('sorts by service A to Z when no direction is given', () => {
  assert.deepEqual(order(renderDeploys(snapshot, { sort: 'service' })), ['api-gateway', 'billing', 'notifications', 'search']);
});

test('sorts by start time both ways', () => {
  assert.deepEqual(order(renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' })), ['billing', 'api-gateway', 'notifications', 'search']);
  assert.deepEqual(order(renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' })), ['search', 'notifications', 'api-gateway', 'billing']);
});

test('links the sortable headers', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\/deploys\?sort=service&amp;dir=asc">Service<\/a><\/th>/);
  assert.match(html, /<th>Version<\/th>/);
});

test('keeps the filter when changing the sort', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.match(html, /href="\/deploys\?env=staging&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\/deploys\?env=staging&amp;sort=startedAt&amp;dir=asc"/);
});

test('filters by environment', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.deepEqual(order(html), ['search', 'billing']);
  assert.match(html, /<select name="env" class="ui-select" data-autosubmit>/);
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
  assert.match(html, /<option value="">All environments<\/option>/);
});

test('defaults the filter to all environments', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.match(html, /<option value="production">production<\/option>/);
  assert.equal(order(html).length, 4);
});

test('keeps the sort when changing the filter', () => {
  const html = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<input type="hidden" name="sort" value="service">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
});

test('names the environment when the filter matches nothing', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<div class="ui-empty"><p class="ui-empty__title">No deploys in staging<\/p><\/div>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'sideways' });
  assert.deepEqual(order(html), ['search', 'notifications', 'api-gateway', 'billing']);
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼/);
});
```

- [ ] **Step 6: Run the tests to verify the new ones fail**

Run: `node --test test/pages/deploys.test.js`
Expected: the 5 Step 1 tests PASS; the 10 new tests FAIL (rows stay newest-first, no `<form>`, no sort links, no empty state).

- [ ] **Step 7: Add query handling, the filter bar, sort links and the empty state**

Replace `src/pages/deploys.js` with the complete module:

```js
// Deploys list. Filter with ?env=production|staging, sort with
// ?sort=service|startedAt and ?dir=asc|desc (newest first by default).
import {
  dataTable,
  emptyState,
  esc,
  filterBar,
  pageHeader,
  selectField,
  statusChip,
} from '../ui/index.js';

const ENVIRONMENTS = ['production', 'staging'];
// Sortable columns and the direction each sorts in when ?dir is missing.
const SORT_DEFAULT_DIR = { service: 'asc', startedAt: 'desc' };

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
  { key: 'duration', label: 'Duration', render: (d) => esc(duration(d)) },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query = {}) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : '';
  const sort = Object.hasOwn(SORT_DEFAULT_DIR, query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : SORT_DEFAULT_DIR[sort];

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
    sortHref: (key, nextDir) => `/deploys?${new URLSearchParams({ ...(env && { env }), sort: key, dir: nextDir })}`,
    empty: emptyState({ title: env ? `No deploys in ${env}` : 'No deploys' }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filters}
${table}`;
}

function duration(deploy) {
  if (!deploy.finishedAt) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 8: Run the page tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 15 tests.

- [ ] **Step 9: Run the full suite**

Run: `npm test`
Expected: PASS, 34 tests (19 existing + 15 new), 0 failures.

- [ ] **Step 10: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: Route `/deploys` and add it to the nav

**Risk tier:** standard — touches the request router and layout shared by every page, across three files.

**Files:**
- Modify: `src/server.js` (imports; `ROUTES`, lines 14-17)
- Modify: `src/layout.js` (`NAV`, lines 3-6)
- Test: `test/server.test.js` (append)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query) → string` from `src/pages/deploys.js` (Task 1); existing `handle(url, { dataDir }) → Promise<{ status, type, body }>` and `readSnapshot(name, dir)`.
- Produces: `GET /deploys` → 200 page titled "Deploys · Harbor" with the nav item current, or 503 "Snapshot unavailable" when `deploys.json` is missing or not valid JSON.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, replace the import block at the top with:

```js
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/server.js';
```

Then append at the end of the file:

```js
test('renders the deploys page inside the layout', async () => {
  // In data/deploys.json, notifications only ever deploys to production.
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<td>search<\/td>/);
  assert.doesNotMatch(res.body, /<td>notifications<\/td>/);
});

test('links Deploys in the nav after Services', async () => {
  const res = await handle('/');
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys">Deploys<\/a>/);
});

test('answers 503 for deploys when deploys.json is missing or unreadable', async (t) => {
  const dataDir = await mkdtemp(join(tmpdir(), 'harbor-'));
  t.after(() => rm(dataDir, { recursive: true, force: true }));
  await writeFile(join(dataDir, 'services.json'), '{"generatedAt":"x","services":[]}');

  const missing = await handle('/deploys', { dataDir });
  assert.equal(missing.status, 503);
  assert.match(missing.body, /Snapshot unavailable/);
  assert.equal((await handle('/services', { dataDir })).status, 200);

  await writeFile(join(dataDir, 'deploys.json'), '{"generatedAt":');
  const unreadable = await handle('/deploys', { dataDir });
  assert.equal(unreadable.status, 503);
  assert.match(unreadable.body, /Snapshot unavailable/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: the 4 existing tests PASS; the 3 new ones FAIL (`/deploys` answers 404; nav has no Deploys link).

- [ ] **Step 3: Add the route**

In `src/server.js`, add the import after the services import:

```js
import { renderDeploys } from './pages/deploys.js';
```

so the page imports read:

```js
import { renderOverview } from './pages/overview.js';
import { renderServices } from './pages/services.js';
import { renderDeploys } from './pages/deploys.js';
```

and replace `ROUTES` with:

```js
const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
};
```

No other server change: `handle` already reads `route.snapshot`, serves the 503 page on any read or parse failure, and passes the query object to `render`.

- [ ] **Step 4: Add the nav item**

In `src/layout.js`, replace `NAV` with:

```js
const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
];
```

- [ ] **Step 5: Run the server tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS, 7 tests.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS, 37 tests, 0 failures.

- [ ] **Step 7: Check the page in the running app**

Run: `PORT=3123 npm start` in the background, then:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3123/deploys
curl -s 'http://localhost:3123/deploys?env=staging&sort=service&dir=desc' | grep -o '<tr><td>[^<]*</td>'
```

Expected: `200`, then four rows in Z→A service order — `search`, `billing`, `billing`, `api-gateway` (the staging deploys in `data/deploys.json`). Open `http://localhost:3123/deploys` in a browser and confirm that changing the dropdown reloads with `?env=` and the chips are colored. Stop the server afterwards.

- [ ] **Step 8: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Route /deploys and link it in the nav"
```
