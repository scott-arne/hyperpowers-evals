# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** A read-only `/deploys` page that lists the pipeline's recent deploys with an environment filter, sortable Service/Started columns, colored status chips and durations, so whoever is on call can spot a failed or rolled-back deploy without opening the pipeline.

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)`. It is built entirely from the vendored component library in `src/ui/` (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `statusChip`, `emptyState`, `esc`), which already provides the filter form with auto-submit and kept query state, sortable headers with direction flipping, tone-colored chips and the empty placeholder. The page only validates the query, filters, maps statuses to tones and formats durations. The server gains a `/deploys` route reading the `deploys` snapshot, so the existing 503 handling covers it for free, and the layout gains a nav link.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node:test` + `node:assert/strict`.

## Global Constraints

- Route is `/deploys`; nav label "Deploys", placed after "Services".
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Data comes from `data/deploys.json` via the existing `readSnapshot('deploys', dataDir)`; `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`; `finishedAt` is null while in progress.
- Header "Deploys" with the snapshot time under it.
- Environment dropdown: "All environments" (default), "production", "staging". Choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default. Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Chips: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt` minus `startedAt` as minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) instead of the table.
- Missing or unreadable `deploys.json`: the same 503 "Snapshot unavailable" page as the other pages. Unknown `env`, `sort` or `dir` falls back to the default.
- Tests run with `node --test` (`npm test`).
- **Use the `src/ui/` component library; do not copy `src/pages/services.js`.** That page predates the template and hand-rolls its form, table, `pill-*` chips and `escapeHtml`. The new page must not add page-specific CSS to `public/app.css` or a local escape helper; everything it needs is already styled in `public/harbor.css` (`ui-chip--ok|warn|bad|info` map to green/amber/red/blue via `--ok`, `--warn`, `--bad`, `--info`). `src/ui/` is vendored from the template — do not edit it for this feature.

## Decisions the spec leaves open

- **Query values:** `env` ∈ {`production`, `staging`}, otherwise all environments (represented as `''`, so the "All environments" option submits `env=`, which also falls back). `sort` ∈ {`service`, `startedAt`}, otherwise `startedAt`. `dir` ∈ {`asc`, `desc`}, otherwise the column's natural default: `desc` for `startedAt` (newest first), `asc` for `service` (A→Z).
- **Ties:** rows are pre-sorted newest first before `dataTable` sorts them; `Array.prototype.sort` is stable, so deploys of the same service stay newest first.
- **Started column** shows the raw ISO `startedAt`, like the Deployed column on Services and the snapshot time on Overview.
- **Durations over an hour** stay in minutes ("72m 5s"), as the spec says "minutes and seconds". Seconds are not zero-padded ("2m 5s").
- **Empty with "All environments"** (snapshot has no deploys at all) says "No deploys".

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `src/pages/deploys.js` | Create | `renderDeploys(snapshot, query)` and `formatDuration(deploy)` |
| `test/pages/deploys.test.js` | Create | Rendering tests: header, columns, default order, both sorts, filter, kept state, chips, durations, empty state, query fallbacks |
| `src/server.js` | Modify (imports, `ROUTES`) | Add the `/deploys` route on the `deploys` snapshot |
| `src/layout.js` | Modify (`NAV`) | Add the "Deploys" nav link after "Services" |
| `test/server.test.js` | Modify (append) | Route renders in the layout; 503 for missing and for unreadable snapshot |

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module with query validation and sorting behavior; the plan carries its full content, but it is two files of real behavior, not a transcription.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing, `src/ui/index.js`):
  - `pageHeader({ title, subtitle? }) → string`
  - `filterBar({ action, fields: string[], keep?: Record<string, string|undefined> }) → string` — drops `keep` entries that are `undefined` or `''`
  - `selectField({ name, label, options: {value,label}[], value? }) → string` — emits `data-autosubmit`; `public/harbor.js` submits the form on change
  - `dataTable({ columns, rows, sort?: {key, dir}, sortHref?: (key, dir) => string, empty? }) → string` — sorts rows itself, escapes the `sortHref` result, returns `empty` instead of a table when `rows` is empty; header for the active column links to the flipped direction, others link to `asc`
  - `statusChip(label, tone) → string` with tone `'ok'|'warn'|'bad'|'info'|'muted'` (unknown tone → `muted`)
  - `emptyState({ title }) → string`
  - `esc(value) → string`
- Produces:
  - `renderDeploys(snapshot: {generatedAt: string, deploys: Deploy[]}, query?: Record<string, string>) → string` (page body HTML, no layout)
  - `formatDuration(deploy: {startedAt: string, finishedAt: string|null}) → string`

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-3', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-2', service: 'billing', version: '2.8.1', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'sam' },
    { id: 'd-1', service: 'api-gateway', version: '3.15.0-rc.1', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'dana' },
  ],
};

// Service names in row order (the first cell of each body row).
function services(html) {
  return [...html.matchAll(/<tr><td>([^<]*)<\/td>/g)].map((m) => m[1]);
}

test('shows the header with the snapshot time', () => {
  assert.match(
    renderDeploys(snapshot, {}),
    /<h1>Deploys<\/h1><p class="ui-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/,
  );
});

test('lists the columns in order, newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.ok(
    html.includes(
      '<thead><tr>' +
        '<th><a href="/deploys?sort=service&amp;dir=asc">Service</a></th>' +
        '<th>Version</th><th>Environment</th><th>Status</th>' +
        '<th aria-sort="descending"><a href="/deploys?sort=startedAt&amp;dir=asc">Started ▼</a></th>' +
        '<th>Duration</th><th>Author</th>' +
        '</tr></thead>',
    ),
  );
  assert.deepEqual(services(html), ['search', 'notifications', 'billing', 'api-gateway']);
});

test('sorts by service both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.deepEqual(services(asc), ['api-gateway', 'billing', 'notifications', 'search']);
  assert.match(asc, /<th aria-sort="ascending"><a href="\/deploys\?sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.deepEqual(services(desc), ['search', 'notifications', 'billing', 'api-gateway']);
});

test('sorts by start time both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.deepEqual(services(asc), ['api-gateway', 'billing', 'notifications', 'search']);
  const desc = renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' });
  assert.deepEqual(services(desc), ['search', 'notifications', 'billing', 'api-gateway']);
});

test('keeps deploys of the same service newest first when sorted by service', () => {
  const older = { ...snapshot.deploys[0], id: 'd-0', startedAt: '2026-09-30T09:05:00Z', version: '1.22.0' };
  const html = renderDeploys({ ...snapshot, deploys: [older, ...snapshot.deploys] }, { sort: 'service' });
  assert.ok(html.indexOf('1.23.0-rc.1') < html.indexOf('1.22.0'));
});

test('filters by environment and keeps the filter in sort links', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.deepEqual(services(html), ['search', 'api-gateway']);
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
  assert.match(html, /href="\/deploys\?env=staging&amp;sort=service&amp;dir=asc"/);
});

test('offers all environments by default in an auto-submitting filter bar', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="ui-select" data-autosubmit>/);
  assert.match(html, /<option value="" selected>All environments<\/option>/);
  assert.match(html, /<option value="production">production<\/option>/);
});

test('keeps the current sort when the filter changes', () => {
  const html = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
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
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('formatDuration keeps long deploys in minutes', () => {
  assert.equal(formatDuration({ startedAt: '2026-10-01T08:00:00Z', finishedAt: '2026-10-01T09:12:05Z' }), '72m 5s');
  assert.equal(formatDuration({ startedAt: '2026-10-01T08:00:00Z', finishedAt: '2026-10-01T08:00:00Z' }), '0m 0s');
  assert.equal(formatDuration({ startedAt: '2026-10-01T08:00:00Z', finishedAt: null }), 'running');
});

test('names the environment when the filter matches nothing', () => {
  const production = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(production, { env: 'staging' });
  assert.match(html, /<p class="ui-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
});

test('falls back to the defaults for unknown query values', () => {
  const defaults = renderDeploys(snapshot, {});
  assert.equal(renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'sideways' }), defaults);
  assert.equal(renderDeploys(snapshot, { env: '' }), defaults);
  const service = renderDeploys(snapshot, { sort: 'service', dir: 'up' });
  assert.deepEqual(services(service), ['api-gateway', 'billing', 'notifications', 'search']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

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
// Sortable columns and the direction each starts in.
const SORTS = { service: 'asc', startedAt: 'desc' };
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

export function renderDeploys(snapshot, query = {}) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : '';
  const sort = Object.hasOwn(SORTS, query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : SORTS[sort];

  // Newest first before the table sorts, so ties on service stay newest first.
  const deploys = snapshot.deploys
    .filter((d) => !env || d.environment === env)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

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
    sortHref: (key, nextDir) => deploysHref(env, key, nextDir),
    empty: emptyState({ title: env ? `No deploys in ${env}` : 'No deploys' }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filter}
${table}`;
}

// "4m 12s" from start to finish; "running" while there is no finish yet.
export function formatDuration({ startedAt, finishedAt }) {
  if (!finishedAt) return 'running';
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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 13 tests.

Then run the whole suite: `npm test`
Expected: PASS, 32 tests (19 existing + 13 new), 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `/deploys` route and nav link

**Risk tier:** standard — wires the page into routing and the shared layout (two source files plus server tests); small, but it changes every page's nav.

**Files:**
- Modify: `src/server.js` (imports; `ROUTES`)
- Modify: `src/layout.js` (`NAV`)
- Test: `test/server.test.js` (append tests; add imports)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query) → string` from `src/pages/deploys.js` (Task 1); existing `handle(url, { dataDir }) → Promise<{status, type, body}>`, which passes `Object.fromEntries(searchParams)` as `query` and renders the 503 "Snapshot unavailable" page whenever `readSnapshot` throws (missing file or invalid JSON).
- Produces: `GET /deploys` → 200 page titled "Deploys"; "Deploys" link in `NAV` after "Services".

- [ ] **Step 1: Write the failing tests**

In `test/server.test.js`, replace the import block at the top with:

```js
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/server.js';
```

Append to the end of the file:

```js
test('renders the deploys page inside the layout, linked after Services', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, />Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>notifications<\/td>/);
  assert.doesNotMatch(res.body, /<td>staging<\/td>/);
});

test('answers 503 when the deploys snapshot is missing', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /Snapshot unavailable/);
});

test('answers 503 when the deploys snapshot is unreadable', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'harbor-'));
  await writeFile(join(dataDir, 'deploys.json'), '{"generatedAt": "2026-10-01T09');
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /Snapshot unavailable/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: the three new tests FAIL — `/deploys` answers 404 (`404 !== 200` / `404 !== 503`); the four existing tests still pass.

- [ ] **Step 3: Add the route**

In `src/server.js`, add the import after the overview import:

```js
import { renderDeploys } from './pages/deploys.js';
import { renderOverview } from './pages/overview.js';
```

and add the route to `ROUTES`:

```js
const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
};
```

- [ ] **Step 4: Add the nav link**

In `src/layout.js`, change `NAV` to:

```js
const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
];
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 35 tests, 0 failures.

- [ ] **Step 6: Check it in the browser**

Run: `npm start`, open `http://localhost:3000/deploys`.
Expected: "Deploys" is bold in the nav after "Services"; the table lists the snapshot's deploys newest first with green/red/amber/blue chips and "running" on the in-progress one; choosing "staging" reloads with `?env=staging&sort=startedAt&dir=desc`; clicking "Service" sorts A→Z and keeps `env=staging`. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Serve the deploys page and link it from the nav

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
