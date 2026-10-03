# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page listing recent deploys from `data/deploys.json`, with an environment filter, sortable Service/Started columns, colored status chips, durations and an empty state.

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)` like the other pages. It is built from the vendored Keel kit components (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `badge`, `emptyState`) rather than hand-written HTML, so sorting, sort links, hidden-field filter state and autosubmit come from the kit. `src/server.js` gets a route and `src/layout.js` a nav entry; the existing 503 path in `handle()` covers a missing snapshot with no new code.

**Tech Stack:** Node ≥20, ES modules, no dependencies, `node --test` with `node:assert/strict`, kit imported via the `#kit/*` import map in `package.json`.

## Global Constraints

- Route is `/deploys`; nav link label "Deploys", placed after "Services".
- Read-only: no details page, no pagination, no live refresh, no deploy actions.
- Snapshot is `data/deploys.json`: `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`; `finishedAt` is null while in progress.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`.
- Header "Deploys", snapshot time under it.
- Environment filter options: "All environments" (default), "production", "staging"; choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Chips: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as other pages. Unknown `env`, `sort` or `dir` → the default.
- Tests use `node --test`.

Decisions this plan makes where the spec is silent (flag in review if you disagree):

- Query values: `sort=service|startedAt`, `dir=asc|desc`, `env=all|production|staging` (`all` mirrors the Services page's `?env=all`). Default `sort=startedAt`, `dir=desc`; an unknown `dir` falls back to `desc` (the page's default), so `?sort=service` alone sorts Z→A. Sort links always carry `dir`, so only hand-typed URLs hit this.
- Ties under the Service sort stay newest first (rows are pre-sorted newest first; `dataTable` sorts stably).
- With "All environments" and an empty snapshot the empty state says "No deploys".
- The subtitle reads `Snapshot <generatedAt>`, matching the Overview page.
- Chip colors use the kit badge tones: `ok` (green), `bad` (red), `warn` (amber), `info` (blue); an unexpected status gets `muted`.
- Under a minute the duration is "0m 45s" (always minutes and seconds).

## Grounding

- Page module shape (exported `renderX(snapshot, query)`, header comment documenting query params, query parsing with fallbacks): `src/pages/services.js:5-21`
- Prototype-safe query validation (`'constructor'` test case): `src/pages/services.js:15`, `test/pages/services.test.js:42-47` — this plan uses `Array.includes` instead of `Object.hasOwn`, which is equally safe.
- Domain state → color mapping at the call site: `src/pages/incidents.js:46-50`; kit badge tones and their colors: `vendor/kit/badge/src/lib/badge.js:3-15`, `public/kit.css:2,19-24`
- Kit components used, with their exact output: `vendor/kit/page-header/src/lib/page-header.js:10-14`, `vendor/kit/filter-bar/src/lib/filter-bar.js:15-21`, `vendor/kit/select/src/lib/select.js:13-21`, `vendor/kit/table/src/lib/table.js:20-69` (sort, sort links, `aria-sort`, arrows, `empty`), `vendor/kit/empty/src/lib/empty.js:9-12`
- Kit import style: `src/pages/services.js:1-2` (`import { button } from '#kit/button';`)
- Autosubmit of the filter: `public/kit.js:7-10` (no inline `onchange` needed)
- Snapshot time line: `src/pages/overview.js:29`
- Routing and the 503 error path: `src/server.js:17-43`
- Nav: `src/layout.js:3-9`
- Page test shape (fixture snapshot, `indexOf` ordering, regex on exact HTML): `test/pages/services.test.js:1-47`
- Server test shape (route inside layout, nav loop, 503 via missing `dataDir`): `test/server.test.js:6-25`
- Error handling inside page renderers: none — no page validates snapshot contents; they trust the pipeline's shape. This plan follows that.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new module with query handling and several behaviors; the plan contains the full code but it composes multiple kit components.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: kit exports `pageHeader({title, subtitle})`, `filterBar({action, fields, keep})`, `selectField({name, label, options, value})`, `dataTable({columns, rows, sort, sortHref, empty})`, `badge(label, tone)`, `emptyState({title})` — all return HTML strings.
- Produces: `export function renderDeploys(snapshot, query): string` — `snapshot` is the parsed `deploys.json`, `query` a plain object of query params (`Object.fromEntries(searchParams)`). Task 2 imports it from `./pages/deploys.js`.

**Mirror:** `src/pages/services.js:5-21` for the header comment and query parsing; `test/pages/services.test.js` for the test shape.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-2', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-0', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'failed', startedAt: '2026-09-30T16:05:00Z', finishedAt: '2026-09-30T16:05:45Z', author: 'dana' },
    { id: 'd-3', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1', service: 'billing', version: '2.8.0', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'sam' },
  ],
};

// Asserts the services appear in the page in exactly this order.
function assertOrder(html, services) {
  const positions = services.map((s) => html.indexOf(`<td>${s}</td>`));
  assert.ok(positions.every((p) => p !== -1), `missing one of ${services}`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, `expected order ${services}`);
}

test('shows the header with the snapshot time and the columns in order', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
  const headers = [...html.matchAll(/<th[^>]*>(?:<a [^>]*>)?([A-Za-z]+)/g)].map((m) => m[1]);
  assert.deepEqual(headers, ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
});

test('lists deploys newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assertOrder(html, ['search', 'notifications', 'billing', 'api-gateway']);
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
});

test('sorts by service and by start time both ways', () => {
  const byService = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assertOrder(byService, ['api-gateway', 'billing', 'notifications', 'search']);
  assert.match(byService, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  assertOrder(renderDeploys(snapshot, { sort: 'service', dir: 'desc' }), ['search', 'notifications', 'billing', 'api-gateway']);
  assertOrder(renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' }), ['api-gateway', 'billing', 'notifications', 'search']);
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
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>0m 45s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('filters by environment and keeps the filter in the sort links', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
  assert.match(html, /<td>search<\/td>/);
  assert.doesNotMatch(html, /<td>notifications<\/td>/);
  assert.match(html, /href="\?env=staging&amp;sort=service&amp;dir=asc"/);
});

test('keeps the sort when the filter changes', () => {
  const html = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="desc">/);
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(renderDeploys({ ...snapshot, deploys: [] }, {}), /<p class="kit-empty__title">No deploys<\/p>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assertOrder(html, ['search', 'notifications', 'billing', 'api-gateway']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

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
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = ['service', 'startedAt'];
const STATUS_TONES = {
  succeeded: 'ok',
  failed: 'bad',
  'rolled-back': 'warn',
  'in-progress': 'info',
};

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' ? 'asc' : 'desc';

  // Newest first before the table sorts, so deploys of the same service stay
  // newest first under the service sort.
  let deploys = [...snapshot.deploys].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (env !== 'all') deploys = deploys.filter((d) => d.environment === env);

  const filters = filterBar({
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

  const table = dataTable({
    columns: [
      { key: 'service', label: 'Service', sortable: true },
      { key: 'version', label: 'Version' },
      { key: 'environment', label: 'Environment' },
      { key: 'status', label: 'Status', render: (d) => badge(d.status, STATUS_TONES[d.status]) },
      { key: 'startedAt', label: 'Started', sortable: true },
      { key: 'duration', label: 'Duration', render: duration },
      { key: 'author', label: 'Author' },
    ],
    rows: deploys,
    sort: { key: sort, dir },
    // The links carry the filter so sorting keeps it.
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filters}
${table}`;
}

// "4m 12s" from start to finish; "running" until the deploy finishes.
function duration(deploy) {
  if (deploy.finishedAt === null) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 9 tests.

Then run the whole suite: `npm test`
Expected: PASS, 27 tests (18 existing + 9 new).

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the Deploys page renderer"
```

---

### Task 2: Route, nav link and README

**Risk tier:** standard — multi-file integration (server routing, shared layout, server tests, README).

**Files:**
- Modify: `src/server.js:8-23` (import and route)
- Modify: `src/layout.js:3-9` (nav entry)
- Modify: `test/server.test.js:14-25` (nav loop, new route and 503 tests)
- Modify: `README.md:16` (page list)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1).
- Produces: `GET /deploys` served by `handle(url, { dataDir })`; nav link `<a href="/deploys">Deploys</a>`.

**Mirror:** `src/server.js:17-23` for the route entry; `test/server.test.js:6-25` for the tests.

- [ ] **Step 1: Write the failing tests**

In `test/server.test.js`, add after the first test (`renders the services page inside the layout`):

```js
test('renders the deploys page inside the layout, linked after Services', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a><a href="\/incidents">/);
  assert.match(res.body, /<td>search<\/td>/);
  assert.doesNotMatch(res.body, /<td>notifications<\/td>/);
});
```

Change the nav loop's path list in `serves every page in the nav` to:

```js
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
```

Add after `answers 503 when the snapshot cannot be read`:

```js
test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL — the three deploys assertions get status 404 instead of 200/503.

- [ ] **Step 3: Add the route and the nav entry**

In `src/server.js`, add the import in alphabetical order, directly before `import { renderIncidents } from './pages/incidents.js';`:

```js
import { renderDeploys } from './pages/deploys.js';
```

and add the route after `/services` in `ROUTES`:

```js
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

In `src/layout.js`, add to `NAV` after the Services entry:

```js
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 29 tests, 0 failures.

- [ ] **Step 5: Update the README page list**

In `README.md`, change line 16 from

```
Overview, Services, Incidents, On-call and Runbooks, one module each in
```

to

```
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module each in
```

- [ ] **Step 6: Check the page in a browser**

Run: `npm start`, open `http://localhost:3000/deploys`. Confirm: chips are colored, choosing "staging" in the dropdown reloads with `?env=staging&sort=startedAt&dir=desc`, clicking "Service" keeps `env=staging`, and the nav shows Deploys after Services. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js README.md
git commit -m "Serve the Deploys page and link it in the nav"
```
