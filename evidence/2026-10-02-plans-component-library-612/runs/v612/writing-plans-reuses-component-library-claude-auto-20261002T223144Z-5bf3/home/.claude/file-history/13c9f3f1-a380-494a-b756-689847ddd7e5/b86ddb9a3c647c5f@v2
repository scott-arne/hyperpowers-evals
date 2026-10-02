# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists recent deploys from `data/deploys.json`, with an environment filter, sortable Service/Started columns, colored status chips and durations.

**Architecture:** A new page module `src/pages/deploys.js` exports `renderDeploys(snapshot, query)` and builds the page entirely from the vendored component library in `src/ui/` (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `statusChip`, `emptyState`). `src/server.js` gets a `/deploys` route that reads the `deploys` snapshot (its existing 503 path covers a missing/unreadable file), and `src/layout.js` gets the nav link.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node:test` + `node:assert/strict`.

## Global Constraints

- Page lives at `/deploys`; nav link label "Deploys", placed after "Services".
- Read-only: no details page, no pagination, no live refresh, no actions on a deploy.
- Data source: `data/deploys.json` (`{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`); `finishedAt` is null while in progress.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`.
- Header: "Deploys", with the snapshot time under it.
- Environment filter options: "All environments" (default), "production", "staging"; choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default. Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Chips: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as other pages. Unknown `env`, `sort` or `dir` → falls back to the default.
- Tests use `node --test`.
- **Reuse `src/ui/`.** Build the page from the component library, not from the hand-rolled markup in `src/pages/services.js` (`.pill`, `.services`, inline `onchange`, local `escapeHtml`). Do not add CSS: `public/harbor.css` already styles every `ui-*` class used here. Do not edit files in `src/ui/` (`src/ui/index.js`: "Keep local edits small so template updates still apply").

## Decisions the spec leaves open

These are fixed here so the tasks agree; flag any you disagree with when reviewing the plan.

- **Chip tones.** The template's tones map onto the spec's colors: `succeeded → ok` (green `#1a7f37`), `failed → bad` (red), `rolled-back → warn` (amber `#9a6700`), `in-progress → info` (blue `#0969da`). An unrecognized status falls through to `statusChip`'s `muted` default.
- **Default direction per column.** `startedAt` defaults to `desc` (newest first), `service` to `asc`. `sort` and `dir` fall back independently: `?sort=moon&dir=asc` is Started oldest first; `?sort=service&dir=up` is Service A→Z.
- **Ties.** Rows are pre-sorted newest first before `dataTable` sorts them; `Array.prototype.sort` is stable, so deploys of the same service stay newest first under either Service direction.
- **"All environments" value.** The option's value is `all` (matching the Services page's URLs); `all`, empty and unknown values all mean no filter. Sort links omit `env` when unfiltered.
- **Started column** shows the raw ISO timestamp, as the Services page does for `deployedAt`. **Snapshot time** is shown as `Snapshot <generatedAt>`, as the Overview page does.
- **Empty with no filter** (snapshot has zero deploys): "No deploys".
- **Durations over an hour** stay in minutes ("75m 3s"), per the spec's "minutes and seconds".

## File Structure

- Create `src/pages/deploys.js` — the page renderer: query parsing/fallbacks, status→tone map, duration formatting, and composition of `src/ui/` components.
- Create `test/pages/deploys.test.js` — rendering tests.
- Modify `src/server.js` — add the `/deploys` route.
- Modify `src/layout.js` — add the nav link.
- Modify `test/server.test.js` — route and 503 tests.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module with its own query/sort logic; the plan holds the full code, but it composes five library components and the fallback rules are judgment calls a reviewer should check.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing, from `src/ui/index.js`):
  - `pageHeader({ title: string, subtitle?: string, actions?: string }): string`
  - `filterBar({ action: string, fields: string[], keep?: Record<string, string|undefined> }): string` — `keep` entries become hidden inputs (empty/undefined skipped).
  - `selectField({ name: string, label: string, options: {value: string, label: string}[], value?: string }): string` — emits `data-autosubmit`; `public/harbor.js` submits the form on change.
  - `dataTable({ columns, rows, sort?: {key, dir: 'asc'|'desc'}, sortHref?: (key, dir) => string, empty?: string }): string` — sorts rows itself (stable, `localeCompare` for strings), escapes cells without `render`, escapes the `sortHref` result, returns `empty` instead of a table when `rows` is empty, marks the active header with `aria-sort` and ▲/▼ and links it to the opposite direction (inactive headers link to `asc`).
  - `statusChip(label: string, tone?: 'ok'|'warn'|'bad'|'info'|'muted'): string` → `<span class="ui-chip ui-chip--<tone>">label</span>`.
  - `emptyState({ title: string, body?: string }): string` → `<div class="ui-empty"><p class="ui-empty__title">title</p></div>`.
- Produces: `export function renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string, string>): string` — returns the page body HTML (no layout). Task 2 registers it as a route's `render`.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

// Deliberately out of order, so the default sort is doing the work.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-3', service: 'search', version: '1.2.0', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1', service: 'api', version: '3.0.0', environment: 'production', status: 'failed', startedAt: '2026-10-01T07:00:00Z', finishedAt: '2026-10-01T07:02:05Z', author: 'dana' },
    { id: 'd-2', service: 'billing', version: '2.0.0', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:00:00Z', finishedAt: '2026-10-01T08:04:12Z', author: 'marco' },
    { id: 'd-4', service: 'api', version: '3.0.1', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T09:00:00Z', finishedAt: '2026-10-01T09:10:00Z', author: 'dana' },
  ],
};

// Versions are unique in the fixture, so their order is the row order.
function versions(html) {
  return [...html.matchAll(/<td>(\d+\.\d+\.\d+)<\/td>/g)].map((m) => m[1]);
}

test('shows the title and the snapshot time', () => {
  assert.match(
    renderDeploys(snapshot, {}),
    /<h1>Deploys<\/h1><p class="ui-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/,
  );
});

test('lists the columns in order, newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  const headers = [...html.matchAll(/<th[^>]*>(?:<a [^>]*>)?([A-Za-z]+)/g)].map((m) => m[1]);
  assert.deepEqual(headers, ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
  assert.deepEqual(versions(html), ['1.2.0', '3.0.1', '2.0.0', '3.0.0']);
  assert.match(html, /<th aria-sort="descending"><a href="\/deploys\?sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
});

test('sorts by started oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.deepEqual(versions(html), ['3.0.0', '2.0.0', '3.0.1', '1.2.0']);
  assert.match(html, /<th aria-sort="ascending"><a href="\/deploys\?sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sorts by service both ways, newest first within a service', () => {
  assert.deepEqual(versions(renderDeploys(snapshot, { sort: 'service', dir: 'asc' })), ['3.0.1', '3.0.0', '2.0.0', '1.2.0']);
  assert.deepEqual(versions(renderDeploys(snapshot, { sort: 'service', dir: 'desc' })), ['1.2.0', '2.0.0', '3.0.1', '3.0.0']);
});

test('sort links keep the filter', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'asc' });
  assert.match(html, /<a href="\/deploys\?env=production&amp;sort=service&amp;dir=desc">Service ▲<\/a>/);
  assert.match(html, /<a href="\/deploys\?env=production&amp;sort=startedAt&amp;dir=asc">Started<\/a>/);
});

test('filters by environment and the filter keeps the sort', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'desc' });
  assert.deepEqual(versions(html), ['2.0.0', '3.0.1', '3.0.0']);
  assert.match(html, /<form class="ui-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="ui-select" data-autosubmit>/);
  assert.match(html, /<option value="all">All environments<\/option><option value="production" selected>production<\/option><option value="staging">staging<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="service">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
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
  assert.match(html, /<td>2m 5s<\/td>/);
  assert.match(html, /<td>10m 0s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('names the environment when the filter matches nothing', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="ui-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'author', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.deepEqual(versions(html), ['1.2.0', '3.0.1', '2.0.0', '3.0.0']);
  assert.match(html, /<th aria-sort="descending">/);
  assert.deepEqual(versions(renderDeploys(snapshot, { sort: 'service', dir: 'up' })), ['3.0.1', '3.0.0', '2.0.0', '1.2.0']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL — `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

- [ ] **Step 3: Write the renderer**

Create `src/pages/deploys.js`:

```js
import { dataTable, emptyState, filterBar, pageHeader, selectField, statusChip } from '../ui/index.js';

// Recent deploys. Filter with ?env=production|staging, sort with
// ?sort=service|startedAt and ?dir=asc|desc (newest first by default).
const ENVIRONMENTS = ['production', 'staging'];
const DEFAULT_DIR = { startedAt: 'desc', service: 'asc' };
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

const COLUMNS = [
  { key: 'service', label: 'Service', sortable: true },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => statusChip(d.status, TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true },
  { key: 'duration', label: 'Duration' },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = Object.hasOwn(DEFAULT_DIR, query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : DEFAULT_DIR[sort];

  // Newest first underneath, so deploys of the same service stay newest first
  // when sorting by service.
  let deploys = [...snapshot.deploys].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (env !== 'all') deploys = deploys.filter((d) => d.environment === env);
  const rows = deploys.map((d) => ({ ...d, duration: formatDuration(d) }));

  const envParam = env === 'all' ? {} : { env };
  const table = dataTable({
    columns: COLUMNS,
    rows,
    sort: { key: sort, dir },
    sortHref: (key, next) => `/deploys?${new URLSearchParams({ ...envParam, sort: key, dir: next })}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  const filter = filterBar({
    action: '/deploys',
    fields: [
      selectField({
        name: 'env',
        label: 'Environment',
        options: [
          { value: 'all', label: 'All environments' },
          ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
        ],
        value: env,
      }),
    ],
    keep: { sort, dir },
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filter}
${table}`;
}

// "4m 12s" from start to finish; a deploy still in progress has no finish.
function formatDuration(deploy) {
  if (!deploy.finishedAt) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 10 tests.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS, no failures (the existing page, UI and server tests are untouched).

- [ ] **Step 6: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Route and nav link

**Risk tier:** standard — multi-file integration (server routing table, shared layout nav) plus server tests.

**Files:**
- Modify: `src/server.js` (imports near line 7–8; `ROUTES` at lines 14–17)
- Modify: `src/layout.js` (`NAV` at lines 3–6)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1). `handle(url, { dataDir })` in `src/server.js` already reads `route.snapshot` via `readSnapshot(name, dir)`, returns the 503 "Snapshot unavailable" page on any read/parse failure, and passes `Object.fromEntries(searchParams)` as `query`.
- Produces: `GET /deploys` route; "Deploys" nav entry after "Services".

- [ ] **Step 1: Write the failing tests**

Append to `test/server.test.js`:

```js
test('renders the deploys page inside the layout, linked after services', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>1\.23\.0-rc\.1<\/td>/);
  assert.match(res.body, /<option value="staging" selected>/);
});

test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

(`<td>1.23.0-rc.1</td>` is the in-progress staging deploy `d-1042` in the committed `data/deploys.json`.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: the two new tests FAIL — `/deploys` answers 404 (`404 !== 200` and `404 !== 503`); the four existing tests pass.

- [ ] **Step 3: Add the route**

In `src/server.js`, add the import after the overview import:

```js
import { renderDeploys } from './pages/deploys.js';
```

so the page imports read:

```js
import { renderDeploys } from './pages/deploys.js';
import { renderOverview } from './pages/overview.js';
import { renderServices } from './pages/services.js';
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
Expected: PASS, all tests including the two new server tests.

- [ ] **Step 6: Check it in the running app**

Run: `PORT=3123 npm start` in the background, then:

```bash
curl -s localhost:3123/deploys | grep -c '<tr>'          # 11: header row + 10 deploys
curl -s 'localhost:3123/deploys?env=production&sort=service&dir=asc' | grep -o 'href="/deploys?[^"]*"'
curl -s -o /dev/null -w '%{http_code}\n' localhost:3123/deploys
```

Expected: `11`; header links that all carry `env=production`; `200`. Stop the server afterwards.

- [ ] **Step 7: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js
git commit -m "Serve the deploys page and link it from the nav

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
