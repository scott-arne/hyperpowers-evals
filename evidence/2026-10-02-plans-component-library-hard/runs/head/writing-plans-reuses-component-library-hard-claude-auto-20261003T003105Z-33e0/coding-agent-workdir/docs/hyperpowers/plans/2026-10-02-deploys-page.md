# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** A read-only `/deploys` page listing recent deploys from `data/deploys.json`, with an environment filter, Service/Started sorting, colored status chips and durations, linked from the nav after "Services".

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)` like every other page. It is built from the vendored Keel kit components the template already ships (`pageHeader`, `filterBar` + `selectField`, `dataTable`, `badge`, `emptyState`), instead of copying the hand-rolled table/form/pill markup in `src/pages/services.js`. The query handling (validate `env`/`sort`/`dir`, fall back to defaults, sort links that keep the filter, filter form that keeps the sort) behaves exactly like the Services page. `src/server.js` gets a route and `src/layout.js` a nav entry; the existing 503 path covers a missing snapshot with no new code.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`. Kit components are imported via the `#kit/*` import map in `package.json`.

## Global Constraints

- Route `/deploys`; nav link label "Deploys", placed directly after "Services".
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Data: `data/deploys.json` (already committed) — `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`. `status` ∈ `succeeded`, `failed`, `rolled-back`, `in-progress`. `finishedAt` is `null` while in progress.
- Header: "Deploys", with the snapshot time under it.
- Environment filter: dropdown with "All environments" (default), "production", "staging". Choosing one reloads with `?env=`, keeping the current sort.
- Table columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default. Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` in minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty: when the filter matches nothing, show "No deploys in staging" (naming the chosen environment) instead of the table.
- Missing/unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as the other pages. Unknown `env`, `sort` or `dir` → fall back to the default.
- Tests: `node --test` (`npm test`). No new dependencies (README: "No dependencies; Node 20 or later.").

## Grounding

- **Page module shape / naming:** `src/pages/services.js:13-97` — `export function renderX(snapshot, query)` returning an HTML string; header comment documents the query params (`:5-6`).
- **Query validation and fallback:** `src/pages/services.js:14-16` — `ENVIRONMENTS.includes(query.env)`, `Object.hasOwn(SORTS, query.sort ?? '')` (guards `constructor`), default otherwise.
- **Sort-link and filter-keeps-sort behavior to match:** `src/pages/services.js:30-38` (active column flips, others start ascending; links carry `env`) and `:88-94` (hidden `sort`/`dir` inputs in the GET form).
- **Kit components used (all exist, none yet used by a page):** `vendor/kit/page-header/src/lib/page-header.js:10-14`, `vendor/kit/filter-bar/src/lib/filter-bar.js:15-21`, `vendor/kit/select/src/lib/select.js:13-21`, `vendor/kit/table/src/lib/table.js:20-69` (its `headerCell` at `:46-56` implements the same flip-on-active-column rule as Services and escapes `sortHref` output), `vendor/kit/badge/src/lib/badge.js:12-15` (tones `ok`/`bad`/`warn`/`info` = green/red/amber/blue in `public/kit.css:2,19-24`), `vendor/kit/empty/src/lib/empty.js:9-12`. Auto-submit on change is handled by `public/kit.js:7-10` (`data-autosubmit`, which `selectField` sets).
- **Kit import style:** `src/pages/services.js:1-2` — `import { button } from '#kit/button';`.
- **Snapshot subtitle wording:** `src/pages/overview.js:29` — `Snapshot ${generatedAt}`.
- **Null-check convention for open/unfinished records:** `src/pages/incidents.js:9` — `i.resolvedAt === null`.
- **Error handling (503):** `src/server.js:32-41` — generic per-route; adding a `ROUTES` entry (`:17-23`) is all a new page needs.
- **Nav:** `src/layout.js:3-9` — `NAV` array of `{ href, label }`.
- **Page test shape:** `test/pages/services.test.js:1-47` — inline `snapshot` fixture, `assert.match` on exact markup, row order via `html.indexOf(...)`.
- **Server test shape:** `test/server.test.js:6-25` — `handle(path)` / `handle(path, { dataDir })` with a non-existent dir for 503.
- **Styling:** `public/kit.css:19-38` already styles every kit component used; no CSS changes needed.

---

## File Structure

- Create `src/pages/deploys.js` — the Deploys page renderer: query parsing, filter, column definitions, status→tone map, duration format.
- Create `test/pages/deploys.test.js` — rendering tests.
- Modify `src/server.js` — import and route `/deploys`.
- Modify `src/layout.js` — nav entry after Services.
- Modify `test/server.test.js` — route, nav position and 503 tests.
- Modify `README.md` — list the new page.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new module composing six kit components, plus its test file.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: kit components — `pageHeader({ title, subtitle })`, `filterBar({ action, fields, keep })`, `selectField({ name, label, options, value })`, `dataTable({ columns, rows, sort, sortHref, empty })`, `badge(label, tone)`, `emptyState({ title })` (signatures in the Grounding citations).
- Produces: `export function renderDeploys(snapshot, query): string` — `snapshot` is the parsed `deploys.json`, `query` is a plain object of search params (`Object.fromEntries(searchParams)`, as `src/server.js:42` passes). Task 2 routes to it.

**Mirror:** `src/pages/services.js:13-21` for query parsing and fallback; `test/pages/services.test.js` for test shape.

Markup notes for the implementer (from the kit source, so the test regexes below are exact):
- `dataTable` cells render as `<td>value</td>` with no whitespace between them; sortable headers render as `<th aria-sort="descending"><a href="?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼</a></th>` (active) or `<th><a href="...">Service</a></th>` (inactive). Pass `sortHref` an unescaped `&`-joined string; the kit escapes it.
- `filterBar` renders `keep` as `<input type="hidden" name="sort" value="…">` then `dir`.
- `selectField` renders `<option value="staging" selected>staging</option>`.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`. The fixture is deliberately not in date order so the default sort is really exercised. Versions are unique, so tests locate rows by their version cell.

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-3', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-1', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-09-30T06:45:00Z', finishedAt: '2026-09-30T06:47:30Z', author: 'sam' },
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-2', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'rolled-back', startedAt: '2026-09-30T16:05:00Z', finishedAt: '2026-09-30T16:12:48Z', author: 'dana' },
  ],
};

// Asserts the version cells appear in this order.
function assertOrder(html, versions) {
  const positions = versions.map((v) => html.indexOf(`<td>${v}</td>`));
  assert.ok(positions.every((p) => p >= 0), `missing a row: ${versions}`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, `wrong order: ${versions}`);
}

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
});

test('lists deploys newest first by default, with the columns in order', () => {
  const html = renderDeploys(snapshot, {});
  assertOrder(html, ['1.23.0-rc.1', '0.9.4', '3.14.2', '2.9.0-rc.3']);
  assert.match(
    html,
    /<thead><tr><th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th><th>Version<\/th><th>Environment<\/th><th>Status<\/th><th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th><th>Duration<\/th><th>Author<\/th><\/tr><\/thead>/,
  );
  assert.match(html, /<td>search<\/td><td>1\.23\.0-rc\.1<\/td><td>staging<\/td>/);
  assert.match(html, /<td>priya<\/td><\/tr>/);
});

test('sorts by start time oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assertOrder(html, ['2.9.0-rc.3', '3.14.2', '0.9.4', '1.23.0-rc.1']);
  assert.match(html, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sorts by service both ways and keeps the sort in the filter form', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assertOrder(asc, ['3.14.2', '2.9.0-rc.3', '0.9.4', '1.23.0-rc.1']);
  assert.match(asc, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  assert.match(asc, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);

  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assertOrder(desc, ['1.23.0-rc.1', '0.9.4', '2.9.0-rc.3', '3.14.2']);
  assert.match(desc, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('sorting by service alone starts A to Z', () => {
  assertOrder(renderDeploys(snapshot, { sort: 'service' }), ['3.14.2', '2.9.0-rc.3', '0.9.4', '1.23.0-rc.1']);
});

test('filters by environment and keeps it in the sort links', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /<option value="all">All environments<\/option><option value="production" selected>production<\/option><option value="staging">staging<\/option>/);
  assertOrder(html, ['0.9.4', '3.14.2']);
  assert.doesNotMatch(html, /<td>staging<\/td>/);
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\?env=production&amp;sort=startedAt&amp;dir=asc"/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('shows the duration in minutes and seconds, or running', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>7m 48s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<div class="kit-empty"><p class="kit-empty__title">No deploys in staging<\/p><\/div>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assertOrder(html, ['1.23.0-rc.1', '0.9.4', '3.14.2', '2.9.0-rc.3']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL — `Cannot find module '.../src/pages/deploys.js'`.

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
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, newest
// first).
const ENVIRONMENTS = ['production', 'staging'];
// The sortable columns and the direction each starts in when ?dir is absent.
const SORTS = { service: 'asc', startedAt: 'desc' };
const STATUS_TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

const COLUMNS = [
  { key: 'service', label: 'Service', sortable: true },
  { key: 'version', label: 'Version' },
  { key: 'environment', label: 'Environment' },
  { key: 'status', label: 'Status', render: (d) => badge(d.status, STATUS_TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true },
  { key: 'duration', label: 'Duration', render: duration },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = Object.hasOwn(SORTS, query.sort ?? '') ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : SORTS[sort];

  let deploys = snapshot.deploys;
  if (env !== 'all') deploys = deploys.filter((d) => d.environment === env);

  const header = pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` });

  // The bar carries the sort so filtering keeps it.
  const filters = filterBar({
    action: '/deploys',
    fields: [
      selectField({
        name: 'env',
        label: 'Environment',
        value: env,
        options: [
          { value: 'all', label: 'All environments' },
          ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
        ],
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

  return `${header}
${filters}
${table}`;
}

// finishedAt minus startedAt, such as "4m 12s"; "running" until it finishes.
function duration(deploy) {
  if (deploy.finishedAt === null) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes:
- `dataTable` sorts the rows itself from `sort` and the column's `row[key]`; ISO timestamps compare correctly as strings, so no `value` accessor is needed.
- Every cell is escaped by the kit (`dataTable` for plain cells, `badge` for the label); `duration` returns only digits and fixed text.
- An unexpected `status` gets `badge`'s `muted` fallback tone; no extra handling.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 10 tests.

Then run the whole suite: `npm test`
Expected: PASS, 28 tests (18 existing + 10 new).

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the Deploys page renderer"
```

---

### Task 2: Route, nav link and README

**Risk tier:** standard — touches the shared router and layout used by every page, across four files.

**Files:**
- Modify: `src/server.js:8-23` (import + `ROUTES` entry)
- Modify: `src/layout.js:3-9` (`NAV`)
- Modify: `README.md:16-18`
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1).
- Produces: `GET /deploys` → 200 page titled "Deploys · Harbor" with the nav's "Deploys" link marked current; 503 "Snapshot unavailable" when `deploys.json` cannot be read.

**Mirror:** `test/server.test.js:6-25`.

- [ ] **Step 1: Write the failing tests**

In `test/server.test.js`, change the nav list in `'serves every page in the nav'` (line 15) to include `/deploys`:

```js
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
```

and add these tests after `'renders the services page inside the layout'` (after line 12):

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>notifications<\/td>/);
  assert.doesNotMatch(res.body, /<td>staging<\/td>/);
});

test('puts Deploys in the nav right after Services', async () => {
  const res = await handle('/');
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys">Deploys<\/a>/);
});

test('answers 503 on the deploys page when its snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL — the three new tests and `'serves every page in the nav'` fail (`/deploys` is a 404; the nav has no Deploys link).

- [ ] **Step 3: Implement the route and nav entry**

In `src/server.js`, add the import in alphabetical order (after line 7, before `renderIncidents`):

```js
import { renderDeploys } from './pages/deploys.js';
```

and add the route after the `/services` entry in `ROUTES`:

```js
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

In `src/layout.js`, add to `NAV` after the Services entry:

```js
  { href: '/deploys', label: 'Deploys' },
```

In `README.md`, replace line 16:

```
Overview, Services, Incidents, On-call and Runbooks, one module each in
```

with:

```
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module each in
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS, 8 tests.

Then: `npm test`
Expected: PASS, 31 tests.

Then check it by hand: `npm start`, open `http://localhost:3000/deploys`, change the environment dropdown (the page reloads with `?env=`, sort kept), click the Service and Started headers (filter kept), and choose an environment with no deploys if the snapshot allows it. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/server.js src/layout.js README.md test/server.test.js
git commit -m "Route /deploys and link it from the nav"
```
