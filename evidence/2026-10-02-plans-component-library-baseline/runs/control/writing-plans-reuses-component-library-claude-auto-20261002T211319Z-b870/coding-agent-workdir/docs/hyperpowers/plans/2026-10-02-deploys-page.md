# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists the last 50 deploys from `data/deploys.json`, with an environment filter, Service/Started sorting, colored status chips and durations, so whoever is on call can spot a failed or rolled-back deploy without opening the pipeline.

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)`. It is built entirely from the vendored component library in `src/ui/` (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `statusChip`, `emptyState`), the way `src/pages/overview.js` does, **not** by hand-rolling HTML the way the older `src/pages/services.js` does. The route is one entry in `ROUTES` in `src/server.js`, which already provides snapshot loading and the shared 503 page; the nav link is one entry in `NAV` in `src/layout.js`.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node:test` + `node:assert/strict`.

## Global Constraints

- Route is `/deploys`; nav label is "Deploys", placed after "Services".
- Read-only. Out of scope: deploy details page, pagination, live refresh, any action on a deploy.
- Data source is `data/deploys.json` (`readSnapshot('deploys')`), shape `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`; `finishedAt` is null while in progress.
- Header: "Deploys", with the snapshot time under it.
- Environment filter options: "All environments" (default), "production", "staging". Choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Chips: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as the other pages.
- Unknown `env`, `sort` or `dir` → falls back to the default.
- Tests run with `node --test` (`npm test`). No new dependencies.
- Do not edit `src/ui/` (vendored; `src/ui/index.js:1-2` asks to keep local edits small) — everything needed already exists there.

**Decisions this plan makes where the spec is silent** (flag any you disagree with before execution):

- Query values: `sort` ∈ `service | startedAt`, `dir` ∈ `asc | desc`, `env` ∈ `production | staging`. Default is `sort=startedAt&dir=desc`.
- A missing or unknown `dir` falls back to the chosen sort's natural direction: `desc` for `startedAt` (newest first), `asc` for `service` (A→Z).
- When sorting by Service, deploys of the same service stay newest first in both directions (rows are pre-sorted newest first and `dataTable`'s sort is stable).
- The "All environments" option has value `""`, so the empty-string `env` resolves to all (as `test/ui/select.test.js:10` already models).
- With "All environments" and an empty snapshot, the empty state reads "No deploys".
- Durations of an hour or more stay in minutes ("72m 5s"); seconds are floored.
- Started shows the raw ISO timestamp, matching the Deployed column on the Services page.
- Chip tones map onto the template palette in `public/harbor.css:2`: `ok` (green), `bad` (red), `warn` (amber), `info` (blue). No CSS changes are needed.

## Grounding

- Page module shape (exported `renderX(snapshot, query)`, built from `../ui/index.js`, header with `Snapshot ${generatedAt}`): `src/pages/overview.js:1-24`.
- Query fallback idiom (whitelist then default): `src/pages/services.js:3-7`. Mirror only this; its hand-rolled `<table>`, `.pill` classes and private `escapeHtml` are the pattern **not** to copy.
- Table, sortable headers, `sortHref`, `value` accessor, `empty` slot: `src/ui/table.js:3-56`.
- Filter form that keeps sort state in hidden inputs: `src/ui/filter-bar.js:3-21`; autosubmitting select: `src/ui/select.js:3-21`; client autosubmit: `public/harbor.js:1-5`.
- Status chip with call-site tone mapping: `src/ui/chip.js:3-15`; used at `src/pages/overview.js:10-13`.
- Empty state: `src/ui/empty-state.js:3-12`.
- HTML escaping: `src/ui/escape.js:1-9` (`esc`, re-exported from `src/ui/index.js:6`); `dataTable` already escapes `row[key]` cells.
- Routing, snapshot loading and the shared 503 page: `src/server.js:14-39`.
- Nav: `src/layout.js:3-6`.
- Naming: camelCase functions, `render<Page>` exports, file per page in `src/pages/`; comment at top of page module describing the query params (`src/pages/services.js:1-2`).
- Error handling: pages never catch; the server converts snapshot read failures to 503 (`src/server.js:26-37`). Pages trust snapshot shape.
- Page test shape (inline snapshot fixture, `assert.match` / `indexOf` ordering): `test/pages/services.test.js:1-37`, `test/pages/overview.test.js:1-19`.
- Server test shape (`handle(url, { dataDir })`, missing dir for 503): `test/server.test.js:1-23`.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/pages/deploys.js` | Create | Resolve query → state, build the Deploys page from `src/ui/` components |
| `test/pages/deploys.test.js` | Create | Rendering tests: header, chips, duration, default order, filter, sorts, empty, fallbacks |
| `src/server.js` | Modify `:7-17` | Import `renderDeploys`, add the `/deploys` route |
| `src/layout.js` | Modify `:3-6` | Add the "Deploys" nav entry after "Services" |
| `test/server.test.js` | Modify (append) | Route renders in layout with nav; 503 when snapshot missing |

---

### Task 1: Deploys table with chips and durations

**Risk tier:** standard — new page module with its own formatting logic (duration, tone mapping).

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: `pageHeader`, `dataTable`, `statusChip` from `src/ui/index.js` (signatures in Grounding).
- Produces: `export function renderDeploys(snapshot, query)` → HTML string. `snapshot` is the parsed `deploys.json`; `query` is a plain `Record<string, string>` (server passes `Object.fromEntries(searchParams)`). Also exports `formatDuration(deploy)` → `string` (`"4m 12s"` or `"running"`) for direct testing.

**Mirror:** `src/pages/overview.js:1-24` — imports from `../ui/index.js`, `pageHeader` with `Snapshot ${snapshot.generatedAt}`.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-3', service: 'billing', version: '2.9.0', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-5', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-4', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-2', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
    { id: 'd-1', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'succeeded', startedAt: '2026-09-30T15:00:00Z', finishedAt: '2026-09-30T16:12:05Z', author: 'dana' },
  ],
};

// Row order as the list of services in the order their rows appear.
function serviceOrder(html) {
  return [...html.matchAll(/<tr><td>([^<]+)<\/td>/g)].map((m) => m[1]);
}

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
});

test('has the columns in spec order', () => {
  const html = renderDeploys(snapshot, {});
  const headers = [...html.matchAll(/<th[^>]*>(?:<a [^>]*>)?([A-Za-z]+)/g)].map((m) => m[1]);
  assert.deepEqual(headers, ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
});

test('lists newest deploys first by default', () => {
  assert.deepEqual(serviceOrder(renderDeploys(snapshot, {})), [
    'search', 'notifications', 'notifications', 'billing', 'api-gateway',
  ]);
});

test('colors each status with a chip', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="ui-chip ui-chip--ok">succeeded<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--bad">failed<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="ui-chip ui-chip--info">in-progress<\/span>/);
});

test('formats durations in minutes and seconds', () => {
  assert.equal(formatDuration(snapshot.deploys[2]), '4m 12s');
  assert.equal(formatDuration(snapshot.deploys[0]), '2m 30s');
  assert.equal(formatDuration(snapshot.deploys[4]), '72m 5s');
  assert.equal(formatDuration({ startedAt: '2026-10-01T09:00:00Z', finishedAt: '2026-10-01T09:00:09Z' }), '0m 9s');
});

test('shows running for an in-progress deploy', () => {
  assert.equal(formatDuration(snapshot.deploys[1]), 'running');
  assert.match(renderDeploys(snapshot, {}), /<td>running<\/td>/);
});

test('escapes snapshot text', () => {
  const evil = { ...snapshot, deploys: [{ ...snapshot.deploys[0], author: '<script>' }] };
  assert.match(renderDeploys(evil, {}), /<td>&lt;script&gt;<\/td>/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL — `Cannot find module '.../src/pages/deploys.js'`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/pages/deploys.js`:

```js
import { dataTable, pageHeader, statusChip } from '../ui/index.js';

// Deploys list, newest first.
const TONES = {
  succeeded: 'ok',
  failed: 'bad',
  'rolled-back': 'warn',
  'in-progress': 'info',
};

const COLUMNS = [
  { key: 'service', label: 'Service' },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => statusChip(d.status, TONES[d.status]) },
  { key: 'startedAt', label: 'Started' },
  { key: 'duration', label: 'Duration', render: (d) => formatDuration(d) },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot) {
  const table = dataTable({
    columns: COLUMNS,
    rows: snapshot.deploys,
    sort: { key: 'startedAt', dir: 'desc' },
  });
  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${table}`;
}

// "4m 12s" from startedAt to finishedAt; "running" until the deploy finishes.
export function formatDuration({ startedAt, finishedAt }) {
  if (!finishedAt) return 'running';
  const seconds = Math.floor((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Note: `formatDuration` returns plain text with no HTML-special characters, so returning it from `render` is safe. Unknown statuses fall through to `statusChip`'s own `muted` default.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS (7 tests).

Then: `npm test`
Expected: all tests pass (19 existing + 7 new).

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys: render the table with status chips and durations"
```

---

### Task 2: Environment filter, sorting, empty state and query fallbacks

**Risk tier:** standard — query-state resolution and URL building across filter and sort, where the "keep the other one" requirement is easy to get wrong.

**Files:**
- Modify: `src/pages/deploys.js` (whole file replaced below)
- Test: `test/pages/deploys.test.js` (append)

**Interfaces:**
- Consumes: Task 1's `renderDeploys`, `formatDuration`, `TONES`, `COLUMNS`; `filterBar`, `selectField`, `emptyState` from `src/ui/index.js`.
- Produces: `renderDeploys(snapshot, query)` now honours `query.env` (`production|staging`), `query.sort` (`service|startedAt`), `query.dir` (`asc|desc`). Signature unchanged.

**Mirror:** `src/pages/services.js:3-7` for the whitelist-then-default query idiom only.

- [ ] **Step 1: Write the failing tests**

Append to `test/pages/deploys.test.js`:

```js
test('filters by environment and marks it selected', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.deepEqual(serviceOrder(html), ['notifications', 'notifications', 'api-gateway']);
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /<option value="">All environments<\/option>/);
  assert.match(html, /<option value="staging">staging<\/option>/);
});

test('the filter form keeps the current sort', () => {
  const html = renderDeploys(snapshot, { env: 'staging', sort: 'service', dir: 'desc' });
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="ui-select" data-autosubmit>/);
  assert.match(html, /<input type="hidden" name="sort" value="service">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
});

test('sorts by service both ways, newest first within a service', () => {
  assert.deepEqual(serviceOrder(renderDeploys(snapshot, { sort: 'service', dir: 'asc' })), [
    'api-gateway', 'billing', 'notifications', 'notifications', 'search',
  ]);
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.deepEqual(serviceOrder(desc), ['search', 'notifications', 'notifications', 'billing', 'api-gateway']);
  assert.ok(desc.indexOf('0.9.4') < desc.indexOf('0.9.3'));
});

test('sorts by started both ways', () => {
  assert.deepEqual(serviceOrder(renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' })), [
    'api-gateway', 'billing', 'notifications', 'notifications', 'search',
  ]);
  assert.deepEqual(serviceOrder(renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' })), [
    'search', 'notifications', 'notifications', 'billing', 'api-gateway',
  ]);
});

test('sort links keep the filter and flip the active direction', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?env=staging&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\/deploys\?env=staging&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
  assert.match(html, /<th>Version<\/th>/);
});

test('sort links omit env when showing all environments', () => {
  assert.match(renderDeploys(snapshot, {}), /href="\/deploys\?sort=service&amp;dir=asc"/);
});

test('names the environment when the filter matches nothing', () => {
  const html = renderDeploys({ ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment !== 'staging') }, { env: 'staging' });
  assert.match(html, /<p class="ui-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
});

test('says no deploys when the snapshot is empty', () => {
  assert.match(renderDeploys({ ...snapshot, deploys: [] }, {}), /<p class="ui-empty__title">No deploys<\/p>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'sideways' });
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.deepEqual(serviceOrder(html), ['search', 'notifications', 'notifications', 'billing', 'api-gateway']);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
});

test('an unknown dir falls back to the sort\'s natural direction', () => {
  assert.deepEqual(serviceOrder(renderDeploys(snapshot, { sort: 'service', dir: 'up' })), [
    'api-gateway', 'billing', 'notifications', 'notifications', 'search',
  ]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: the 7 Task 1 tests PASS; the 10 new tests FAIL (no filter form, query ignored, generic empty text).

- [ ] **Step 3: Implement**

Replace `src/pages/deploys.js` with:

```js
import { dataTable, emptyState, filterBar, pageHeader, selectField, statusChip } from '../ui/index.js';

// Deploys list. Filter with ?env=production|staging, sort with
// ?sort=service|startedAt and ?dir=asc|desc (default: newest first).
const ENVIRONMENTS = ['production', 'staging'];
const DEFAULT_DIR = { service: 'asc', startedAt: 'desc' };

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
  { key: 'duration', label: 'Duration', render: (d) => formatDuration(d) },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : '';
  const sort = Object.hasOwn(DEFAULT_DIR, query.sort ?? '') ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : DEFAULT_DIR[sort];

  // Newest first before the table's stable sort, so deploys of one service
  // stay newest first whichever way the Service column is sorted.
  let deploys = [...snapshot.deploys].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (env) deploys = deploys.filter((d) => d.environment === env);

  const filter = filterBar({
    action: '/deploys',
    fields: [
      selectField({
        name: 'env',
        label: 'Environment',
        options: [{ value: '', label: 'All environments' }, ...ENVIRONMENTS.map((e) => ({ value: e, label: e }))],
        value: env,
      }),
    ],
    keep: { sort, dir },
  });

  const table = dataTable({
    columns: COLUMNS,
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => `/deploys?${new URLSearchParams({ ...(env && { env }), sort: key, dir: next })}`,
    empty: emptyState({ title: env ? `No deploys in ${env}` : 'No deploys' }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filter}
${table}`;
}

// "4m 12s" from startedAt to finishedAt; "running" until the deploy finishes.
export function formatDuration({ startedAt, finishedAt }) {
  if (!finishedAt) return 'running';
  const seconds = Math.floor((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `Object.hasOwn` rather than `in`: `DEFAULT_DIR` is a plain object, so `in` would accept `?sort=toString` via the prototype.
- `dataTable` escapes the `sortHref` result (`src/ui/table.js:55`), which is why the tests expect `&amp;` in hrefs.
- `filterBar` drops empty `keep` values, but `sort` and `dir` are always resolved to non-empty values here, so both hidden inputs are always present.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS (17 tests).

Then: `npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys: filter by environment, sort by service or start time"
```

---

### Task 3: `/deploys` route and nav link

**Risk tier:** standard — multi-file integration (server routing, shared layout) though each edit is small.

**Files:**
- Modify: `src/server.js:7-17`
- Modify: `src/layout.js:3-6`
- Test: `test/server.test.js` (append)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query)` from Task 2; `handle(url, { dataDir })` from `src/server.js:21`.
- Produces: `GET /deploys` → 200 page titled "Deploys · Harbor", or 503 "Snapshot unavailable" when `deploys.json` can't be read.

**Mirror:** `test/server.test.js:6-19` for both new tests.

- [ ] **Step 1: Write the failing tests**

Append to `test/server.test.js`:

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>notifications<\/td>/);
  assert.doesNotMatch(res.body, /<td>staging<\/td>/);
});

test('answers 503 for deploys when its snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1><p class="ui-muted">Snapshot unavailable, try again in a minute\.<\/p>/);
});
```

(The first test reads the committed `data/deploys.json`, which has production `notifications` deploys and four staging deploys.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: the two new tests FAIL with status 404 ≠ 200 / 503.

- [ ] **Step 3: Implement**

In `src/server.js`, add the import after the overview import and the route after `/services`:

```js
import { renderDeploys } from './pages/deploys.js';
import { renderOverview } from './pages/overview.js';
import { renderServices } from './pages/services.js';
```

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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all pass (19 existing + 17 page + 2 server = 38).

- [ ] **Step 5: Check it in the browser**

Run: `npm start`, open `http://localhost:3000/deploys`. Confirm: nav shows Deploys after Services; changing the environment dropdown reloads with `?env=` and keeps `sort`/`dir`; clicking Service and Started toggles direction and keeps `env`; chips are green/red/amber/blue; the search row shows "running". Stop the server.

- [ ] **Step 6: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Deploys: add the /deploys route and nav link"
```
