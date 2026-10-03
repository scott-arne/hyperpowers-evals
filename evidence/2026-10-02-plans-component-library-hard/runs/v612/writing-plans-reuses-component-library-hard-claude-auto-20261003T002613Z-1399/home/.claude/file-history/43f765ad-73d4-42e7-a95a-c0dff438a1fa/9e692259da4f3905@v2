# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** A read-only `/deploys` page listing recent deploys from `data/deploys.json`, with an environment filter, sortable Service/Started columns, colored status chips and durations, linked from the nav after "Services".

**Architecture:** One page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)` like the other pages, wired into the existing `ROUTES` table in `src/server.js` (which already gives the 503 "Snapshot unavailable" page for free) and the `NAV` list in `src/layout.js`. The page is built from the vendored Keel kit components (`#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge`, `#kit/empty`) instead of hand-rolled HTML: the kit's `dataTable` already does the sortable headers, arrows, `aria-sort`, sort links and empty-state swap that `src/pages/services.js` implements by hand, and `filterBar` + `selectField` give the auto-submitting GET form with hidden fields that keep the sort.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`. Kit components are imported through the `#kit/*` import map in `package.json`.

## Global Constraints

- Route is `/deploys`; nav label is "Deploys", placed directly after "Services".
- Data source is `data/deploys.json` (`{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`), read with the existing `readSnapshot('deploys')`.
- `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`; `finishedAt` is `null` while in progress.
- Header: "Deploys", with the snapshot time under it.
- Environment filter: "All environments" (default), "production", "staging"; choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` in minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as other pages.
- Unknown `env`, `sort` or `dir` → falls back to the default.
- Out of scope: details page, pagination, live refresh, actions on a deploy. Do not refactor `src/pages/services.js` onto the kit in this change.
- No new dependencies. No changes to `vendor/kit/` or `public/` (kit CSS already styles every component used).

## Decisions this plan makes (not spelled out in the spec)

- **Kit components, not a copy of services.js.** The spec says sorting and filtering *behave* as on the Services page; the kit's `dataTable`/`filterBar` produce the same behavior (same `?env=&sort=&dir=` links, same "clicking the active column flips it, others start ascending" rule, same ▲/▼ and `aria-sort`, hidden sort/dir fields in the filter form). The markup classes differ (`kit-table`, `kit-badge--ok`, …) — that is the point of the template.
- **Chip tones** map onto the kit badge tones: succeeded → `ok` (green), failed → `bad` (red), rolled-back → `warn` (amber), in-progress → `info` (blue). The chip label is the raw status string.
- **Default direction is `desc`** whenever `?dir=` is missing or unknown (the spec's default is "newest first"). The kit's header links always carry an explicit `dir`, so this only affects hand-typed URLs.
- **Ties within a service stay newest first.** Rows are pre-sorted by `startedAt` descending before `dataTable` sorts them; `Array.prototype.sort` is stable, so sorting by Service in either direction keeps each service's deploys newest first.
- **Unfiltered empty snapshot** shows "No deploys" (the spec only defines the filtered case).
- **Started** shows the raw ISO timestamp, as the Services page's Deployed column does.

## File Structure

- Create `src/pages/deploys.js` — `renderDeploys(snapshot, query)` and the exported `formatDuration(startedAt, finishedAt)` helper.
- Create `test/pages/deploys.test.js` — rendering tests.
- Modify `src/layout.js` — add the nav entry.
- Modify `src/server.js` — import and route.
- Modify `test/server.test.js` — route, nav placement and 503 tests.
- Modify `README.md` — list Deploys among the pages.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module composing six kit components; its query handling and sort semantics are behavior the spec pins down.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing, `vendor/kit`, imported via `#kit/<name>`):
  - `badge(label: string, tone?: 'ok'|'warn'|'bad'|'info'|'muted'): string`
  - `emptyState({ title: string, body?: string }): string`
  - `filterBar({ action: string, fields: string[], keep?: Record<string, string|undefined> }): string`
  - `pageHeader({ title: string, subtitle?: string, actions?: string }): string`
  - `selectField({ name: string, label: string, options: {value: string, label: string}[], value?: string }): string`
  - `dataTable({ columns, rows, sort?: {key, dir}, sortHref?: (key, dir) => string, empty?: string }): string` — sorts `rows` by `sort` itself, escapes plain cells and the `sortHref` result, returns `empty` when `rows` is empty.
- Produces:
  - `renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string, string>): string` — page body HTML (no layout).
  - `formatDuration(startedAt: string, finishedAt: string | null): string`

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-3', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-2', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
    { id: 'd-1', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-0', service: 'billing', version: '2.8.0', environment: 'production', status: 'succeeded', startedAt: '2026-09-29T11:40:00Z', finishedAt: '2026-09-29T11:44:12Z', author: 'sam' },
  ],
};

// Row order, read from the Version column (unique per deploy).
const versions = (html) => [...html.matchAll(/<tr><td>[^<]*<\/td><td>([^<]*)<\/td>/g)].map((m) => m[1]);

test('shows a header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
});

test('lists deploys newest first by default, with every column', () => {
  const html = renderDeploys(snapshot, {});
  assert.deepEqual(versions(html), ['1.23.0-rc.1', '0.9.3', '2.9.0-rc.3', '2.8.0']);
  assert.match(html, /<th>Version<\/th><th>Environment<\/th><th>Status<\/th>/);
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th><th>Duration<\/th><th>Author<\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
});

test('sorts by start time oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.deepEqual(versions(html), ['2.8.0', '2.9.0-rc.3', '0.9.3', '1.23.0-rc.1']);
  assert.match(html, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sorts by service both ways, newest first within a service', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.deepEqual(versions(asc), ['2.9.0-rc.3', '2.8.0', '0.9.3', '1.23.0-rc.1']);
  assert.match(asc, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.deepEqual(versions(desc), ['1.23.0-rc.1', '0.9.3', '2.9.0-rc.3', '2.8.0']);
  assert.match(desc, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('formats durations in minutes and seconds, and running deploys as running', () => {
  assert.equal(formatDuration('2026-10-01T08:50:00Z', '2026-10-01T08:54:12Z'), '4m 12s');
  assert.equal(formatDuration('2026-10-01T08:10:00Z', '2026-10-01T08:31:40Z'), '21m 40s');
  assert.equal(formatDuration('2026-10-01T08:10:00Z', '2026-10-01T08:10:05Z'), '0m 5s');
  assert.equal(formatDuration('2026-10-01T09:05:00Z', null), 'running');
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>2026-09-29T11:40:00Z<\/td><td>4m 12s<\/td>/);
  assert.match(html, /<td>2026-10-01T09:05:00Z<\/td><td>running<\/td>/);
});

test('filters by environment, keeping the sort, and sorting keeps the filter', () => {
  const html = renderDeploys(snapshot, { env: 'staging', sort: 'service', dir: 'asc' });
  assert.deepEqual(versions(html), ['2.9.0-rc.3', '1.23.0-rc.1']);
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
  assert.match(html, /href="\?env=staging&amp;sort=startedAt&amp;dir=asc"/);
});

test('names the environment when the filter matches no deploys', () => {
  const production = snapshot.deploys.filter((d) => d.environment === 'production');
  const html = renderDeploys({ ...snapshot, deploys: production }, { env: 'staging' });
  assert.match(html, /<div class="kit-empty"><p class="kit-empty__title">No deploys in staging<\/p><\/div>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assert.deepEqual(versions(html), ['1.23.0-rc.1', '0.9.3', '2.9.0-rc.3', '2.8.0']);
});
```

Note the fixture's snapshot order is already newest first; the service-sort test is what proves the pre-sort (both `billing` rows must come out `2.9.0-rc.3` before `2.8.0` in *both* directions). `sort: 'constructor'` guards against an `in`/prototype lookup sneaking into the query validation.

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
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending).
const ENVIRONMENTS = ['production', 'staging'];
const SORTS = ['service', 'startedAt'];
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
  { key: 'status', label: 'Status', render: (d) => badge(d.status, STATUS_TONES[d.status]) },
  { key: 'startedAt', label: 'Started', sortable: true },
  { key: 'duration', label: 'Duration', render: (d) => formatDuration(d.startedAt, d.finishedAt) },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : 'desc';

  // Newest first before the table sorts, so deploys of the same service stay
  // newest first whichever way the Service column is sorted.
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
    columns: COLUMNS,
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filters}
${table}`;
}

// "4m 12s" from two ISO timestamps; "running" while the deploy has no finish.
export function formatDuration(startedAt, finishedAt) {
  if (finishedAt === null) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Why it looks like this:
- `sortHref` returns a raw `&`; `dataTable` escapes it to `&amp;` (don't pre-escape, or you get `&amp;amp;`).
- `dataTable` escapes plain cells and `badge`/`emptyState` escape their labels, so no `escapeHtml` import is needed.
- `filterBar`'s `keep` emits the hidden `sort`/`dir` inputs; `selectField` adds `data-autosubmit`, which `public/kit.js` already handles — no inline `onchange`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 9 tests.

Then the whole suite: `npm test`
Expected: PASS, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the Deploys page renderer"
```

---

### Task 2: Route, nav link and README

**Risk tier:** standard — multi-file integration (server routing, shared layout, docs) with server-level tests.

**Files:**
- Modify: `src/layout.js:3-9` (the `NAV` array)
- Modify: `src/server.js:8-23` (imports and `ROUTES`)
- Modify: `README.md` (the "Pages" section)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1); existing `readSnapshot(name, dir)` and `handle(url, { dataDir })`.
- Produces: `GET /deploys` → 200 HTML page in the layout, or 503 when `deploys.json` can't be read.

- [ ] **Step 1: Write the failing tests**

In `test/server.test.js`, change the path list in `'serves every page in the nav'` to include `/deploys`:

```js
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
```

Append two tests to the end of the file:

```js
test('renders the deploys page inside the layout, after Services in the nav', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a><a href="\/incidents">/);
  assert.match(res.body, /<tr><td>notifications<\/td><td>0\.9\.4<\/td>/);
  assert.doesNotMatch(res.body, /<td>staging<\/td>/);
});

test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>\n<p class="muted">Snapshot unavailable, try again in a minute\.<\/p>/);
});
```

These read the real `data/deploys.json` (d-1041 is `notifications 0.9.4` in production), just as the existing services route test reads `data/services.json`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: 3 failures — `/deploys` returns 404 in the nav loop and the route test, and the 503 test gets 404.

- [ ] **Step 3: Add the nav entry**

In `src/layout.js`, the `NAV` array becomes:

```js
const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
  { href: '/incidents', label: 'Incidents' },
  { href: '/oncall', label: 'On-call' },
  { href: '/runbooks', label: 'Runbooks' },
];
```

- [ ] **Step 4: Add the route**

In `src/server.js`, add the import in alphabetical position (before `renderIncidents`):

```js
import { renderDeploys } from './pages/deploys.js';
```

and add the route after `/services` so `ROUTES` reads:

```js
const ROUTES = {
  '/': { title: 'Overview', snapshot: 'services', render: renderOverview },
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
  '/incidents': { title: 'Incidents', snapshot: 'incidents', render: renderIncidents },
  '/oncall': { title: 'On-call', snapshot: 'oncall', render: renderOncall },
  '/runbooks': { title: 'Runbooks', snapshot: 'runbooks', render: renderRunbooks },
};
```

Nothing else in `handle` changes: the existing `try/catch` around `readSnapshot` already produces the 503 page titled from `route.title`.

- [ ] **Step 5: Update the README**

In `README.md`, replace the first line of the "Pages" paragraph:

```markdown
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module each in
```

(the rest of the paragraph is unchanged).

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 0 failures (29 tests total).

- [ ] **Step 7: Check it in the browser**

Run: `npm start`, open `http://localhost:3000/deploys`. Confirm: the nav shows "Deploys" after "Services" and is underlined; chips are green/red/amber/blue; changing the environment dropdown reloads with `?env=` and keeps the sort; clicking "Started" and "Service" headers flips direction and keeps `env`; `?env=staging` on a snapshot with no staging deploys isn't reachable with real data, so rely on the unit test for the empty state. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add src/layout.js src/server.js test/server.test.js README.md
git commit -m "Route /deploys and link it from the nav"
```
