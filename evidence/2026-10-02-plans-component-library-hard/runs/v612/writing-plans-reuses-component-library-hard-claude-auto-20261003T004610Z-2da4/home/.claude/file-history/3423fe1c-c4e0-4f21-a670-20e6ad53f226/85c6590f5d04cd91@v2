# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page listing recent deploys from `data/deploys.json`, with an environment filter, sortable Service/Started columns, colored status chips and durations, linked in the nav after "Services".

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)` like the other pages. It is assembled from the vendored Keel kit (`#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge`, `#kit/empty`) instead of hand-written markup: `dataTable` already does sorting, sort-header links with `aria-sort` and arrows, and the empty-state swap, and `filterBar` + `selectField` already do the auto-submitting GET filter that keeps the sort (`public/kit.js` handles `data-autosubmit`). The page then gets one route in `src/server.js` and one nav entry in `src/layout.js`; the existing route handler supplies the 503 "Snapshot unavailable" page for free.

**Tech Stack:** Node ≥20 ES modules, no dependencies, `node --test` with `node:assert/strict`. Kit modules are imported through the `#kit/*` subpath import in `package.json`.

## Global Constraints

- Route `/deploys`; nav label "Deploys", placed directly after "Services".
- Read-only. No deploy details page, no pagination, no live refresh, no actions on a deploy.
- Data: `data/deploys.json` → `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`, read with the existing `readSnapshot('deploys')`.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`; `finishedAt` is null while in progress.
- Header "Deploys" with the snapshot time under it.
- Environment dropdown: "All environments" (default), "production", "staging". Choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as other pages. Unknown `env`, `sort` or `dir` → the default.
- Tests run under `node --test` (`npm test`).

## Decisions this plan makes (not spelled out in the spec)

- **Reuse the kit, not the Services page markup.** "Behave as on the Services page" is read as behavior (same query parameters, same click-to-flip sort headers, same filter that keeps the sort), not as copying `services.js`'s hand-rolled `<table>`/`<form>`/`.pill` markup. The kit components produce the same behavior and the kit stylesheet is already loaded on every page by `src/layout.js`, so no CSS changes are needed.
- **Chip colors map to kit badge tones:** succeeded → `ok` (green `#1a7f37`), failed → `bad` (red `#cf222e`), rolled-back → `warn` (amber `#9a6700`), in-progress → `info` (blue `#0969da`). An unrecognized status gets the kit's grey `muted` tone.
- **Query values:** `sort` is `service` or `startedAt` (default `startedAt`); `dir` is `asc` or `desc` (default `desc`, so anything other than `asc` means `desc`, matching how `services.js` treats its default direction).
- **Ties when sorting by service** stay newest first in both directions: rows are pre-sorted newest first and the kit's sort is stable.
- **Snapshot time** reads "Snapshot 2026-10-01T09:30:00Z", the same raw-timestamp wording as the Overview page. Started is likewise shown as the raw ISO timestamp, as Services shows Deployed.
- **Empty with "All environments"** (snapshot has no deploys at all) reads "No deploys".
- **Duration** always shows both units ("0m 45s", "21m 40s"); no hours unit, since the snapshot only holds the last 50 deploys and these run minutes.

## File Structure

- Create `src/pages/deploys.js` — the page renderer. One responsibility: turn a deploys snapshot + query into page-body HTML.
- Create `test/pages/deploys.test.js` — rendering tests for the renderer.
- Modify `src/server.js` — register the `/deploys` route.
- Modify `src/layout.js` — add the nav entry.
- Modify `test/server.test.js` — route, nav position and 503 tests.
- Modify `README.md` — list the new page.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new module composing six kit components; behavior under test is the whole page.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (vendored kit, already present — read the JSDoc in each `vendor/kit/<name>/src/lib/*.js` if in doubt):
  - `pageHeader({ title, subtitle?, actions? }) → string` from `#kit/page-header`
  - `filterBar({ action, fields: string[], keep?: Record<string,string> }) → string` from `#kit/filter-bar`
  - `selectField({ name, label, options: {value,label}[], value? }) → string` from `#kit/select`
  - `dataTable({ columns, rows, sort?: {key, dir}, sortHref?: (key, dir) => string, empty?: string }) → string` from `#kit/table` — sorts the rows itself, escapes plain cells, escapes the `sortHref` result (so `&` becomes `&amp;`), returns `empty` instead of a table when `rows` is empty.
  - `badge(label, tone) → string` from `#kit/badge`, tones `ok|warn|bad|info|muted`
  - `emptyState({ title, body? }) → string` from `#kit/empty`
- Produces: `export function renderDeploys(snapshot, query): string` — `snapshot` is the parsed `deploys.json`; `query` is a plain object of query-string values (the server passes `Object.fromEntries(searchParams)`). Task 2 imports it.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

// Deliberately not in time order, so the default sort has work to do.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-1', service: 'billing', version: '2.8.0', environment: 'production', status: 'failed', startedAt: '2026-09-29T11:40:00Z', finishedAt: '2026-09-29T11:42:05Z', author: 'sam' },
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-2', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-09-30T08:10:00Z', finishedAt: '2026-09-30T08:31:40Z', author: 'marco' },
    { id: 'd-3', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'dana' },
  ],
};

// Row order, read off the version cells (each version is unique).
function versions(html) {
  return [...html.matchAll(/<td>([\d.]+(?:-rc\.\d+)?)<\/td>/g)].map((m) => m[1]);
}

test('shows the header, the columns and the newest deploy first', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
  assert.ok(
    html.includes(
      '<thead><tr><th><a href="?env=all&amp;sort=service&amp;dir=asc">Service</a></th><th>Version</th><th>Environment</th><th>Status</th><th aria-sort="descending"><a href="?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼</a></th><th>Duration</th><th>Author</th></tr></thead>',
    ),
  );
  assert.deepEqual(versions(html), ['1.23.0-rc.1', '3.14.2', '0.9.3', '2.8.0']);
});

test('sorts by start time both ways and keeps the sort in the filter form', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.deepEqual(versions(oldest), ['2.8.0', '0.9.3', '3.14.2', '1.23.0-rc.1']);
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
  assert.match(oldest, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="asc">/);
});

test('sorts by service both ways, newest first within a service', () => {
  const twice = {
    ...snapshot,
    deploys: [
      ...snapshot.deploys,
      { id: 'd-0', service: 'billing', version: '2.7.9', environment: 'production', status: 'succeeded', startedAt: '2026-09-28T10:00:00Z', finishedAt: '2026-09-28T10:03:00Z', author: 'sam' },
    ],
  };
  const az = renderDeploys(twice, { sort: 'service', dir: 'asc' });
  assert.deepEqual(versions(az), ['3.14.2', '2.8.0', '2.7.9', '0.9.3', '1.23.0-rc.1']);
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  assert.match(az, /<input type="hidden" name="sort" value="service">/);
  const za = renderDeploys(twice, { sort: 'service', dir: 'desc' });
  assert.deepEqual(versions(za), ['1.23.0-rc.1', '0.9.3', '2.8.0', '2.7.9', '3.14.2']);
});

test('shows the status as a colored chip', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('shows the duration in minutes and seconds, or running', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>2m 5s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('filters by environment and keeps the filter when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'asc' });
  assert.deepEqual(versions(html), ['3.14.2', '2.8.0', '0.9.3']);
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /href="\?env=production&amp;sort=startedAt&amp;dir=asc"/);
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assert.deepEqual(versions(html), ['1.23.0-rc.1', '3.14.2', '0.9.3', '2.8.0']);
});
```

Notes for the implementer: the `versions()` helper reads row order off the Version cells, which is why each fixture version is unique. `sort: 'constructor'` in the last test guards against looking sort keys up on a plain object (`'constructor' in {}` is true).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL — `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

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
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending,
// so newest first).
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
  // newest first when sorting by service (the table's sort is stable).
  let deploys = [...snapshot.deploys].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (env !== 'all') deploys = deploys.filter((d) => d.environment === env);

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
  if (!deploy.finishedAt) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Do not import `escapeHtml` or write any `<table>`, `<form>`, `<select>` or `.pill` markup by hand: every user-visible string goes through a kit component, and each of those escapes its text (`dataTable` escapes plain cells and hrefs; `badge`, `pageHeader`, `selectField`, `emptyState` and `filterBar` escape their arguments). `env`, `sort`, `dir` and the duration string are all whitelisted or computed, never raw query input.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 8 tests.

Then run the whole suite: `npm test`
Expected: PASS, 26 tests (18 existing + 8 new), 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: Route, nav link and README

**Risk tier:** standard — wires the page into the server and the shared layout (every page's nav changes); small, but multi-file integration.

**Files:**
- Modify: `src/server.js:8-23` (imports and `ROUTES`)
- Modify: `src/layout.js:3-9` (`NAV`)
- Modify: `test/server.test.js:14-18` (add two tests above "serves every page in the nav" and extend its path list)
- Modify: `README.md:16-18`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1); existing `handle(url, { dataDir })` from `src/server.js`, which reads `ROUTES[pathname].snapshot` with `readSnapshot` and answers 503 "Snapshot unavailable" when that read throws.
- Produces: `GET /deploys` → 200 page titled "Deploys · Harbor"; nav link `<a href="/deploys">Deploys</a>` immediately after Services.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, insert these two tests directly above `test('serves every page in the nav', ...)`:

```js
test('renders the deploys page inside the layout, linked after Services', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>notifications<\/td>/);
  assert.doesNotMatch(res.body, /<td>staging<\/td>/);
});

test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

and change the path list in "serves every page in the nav" from

```js
  for (const path of ['/', '/services', '/incidents', '/oncall', '/runbooks']) {
```

to

```js
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
```

The first test reads the real `data/deploys.json` (committed in `982bf38`), which has production `notifications` deploys and staging deploys, so the `?env=production` filter is visible end to end.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL — the three tests touching `/deploys` fail on `assert.equal(res.status, ...)` with 404 (no such route yet).

- [ ] **Step 3: Register the route and the nav link**

In `src/server.js`, add the import in alphabetical order with the other page imports:

```js
import { renderDeploys } from './pages/deploys.js';
import { renderIncidents } from './pages/incidents.js';
```

and add the route after `/services` in `ROUTES`:

```js
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
  '/incidents': { title: 'Incidents', snapshot: 'incidents', render: renderIncidents },
```

In `src/layout.js`, add the nav entry after Services:

```js
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
  { href: '/incidents', label: 'Incidents' },
```

No change to `handle()` is needed: its existing `try/catch` around `readSnapshot` already turns a missing or malformed `deploys.json` into the 503 page.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 28 tests, 0 failures.

- [ ] **Step 5: Update the README**

In `README.md`, replace

```
Overview, Services, Incidents, On-call and Runbooks, one module each in
```

with

```
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module each in
```

- [ ] **Step 6: Check it in the browser**

Run: `npm start`, open `http://localhost:3000/deploys`.
Expected: "Deploys" is highlighted in the nav after "Services"; ten deploys, newest (`search 1.23.0-rc.1`, blue "in-progress", "running") first; choosing "staging" in the dropdown reloads to `?env=staging&sort=startedAt&dir=desc` with four rows; clicking "Service" then sorts A→Z and keeps `env=staging`. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js README.md
git commit -m "Serve the deploys page and link it in the nav"
```
