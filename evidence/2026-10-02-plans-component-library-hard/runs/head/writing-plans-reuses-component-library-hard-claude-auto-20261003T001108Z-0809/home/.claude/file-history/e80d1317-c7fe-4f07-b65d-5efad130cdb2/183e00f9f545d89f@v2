# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists recent deploys from `data/deploys.json`, with an environment filter, Service/Started sorting, colored status chips and durations, linked in the nav after "Services".

**Architecture:** A new page module `src/pages/deploys.js` exports `renderDeploys(snapshot, query)`, a pure function returning an HTML string, like the other pages. It is built from the vendored Keel kit components (`pageHeader`, `filterBar` + `selectField`, `dataTable`, `badge`, `emptyState`) instead of copying the hand-written markup in `src/pages/services.js`. The kit already does what the spec asks for: the table's sort headers (flip the active column, start other columns ascending, `aria-sort`, ▲/▼), the filter form that keeps hidden sort fields and submits itself, colored badges, and the empty state. `src/server.js` gets one `ROUTES` entry, which also gives it the existing 503 handling, and `src/layout.js` gets one `NAV` entry.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies. Tests use `node:test` + `node:assert/strict`, run with `npm test` (`node --test`). Kit modules are imported through the `#kit/*` subpath import in `package.json`.

## Global Constraints

- Route `/deploys`; nav link label "Deploys", placed directly after "Services".
- Read-only. No deploy details page, no pagination, no live refresh, no actions on a deploy.
- Data source: `data/deploys.json` → `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`; `status` ∈ `succeeded | failed | rolled-back | in-progress`; `finishedAt` is `null` while in progress.
- Header: "Deploys", with the snapshot time under it.
- Environment filter: dropdown "All environments" (default), "production", "staging"; choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty filter result: "No deploys in staging" (names the chosen environment) in place of the table.
- Missing or unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as the other pages.
- Unknown `env`, `sort` or `dir` → fall back to the default.
- Tests: `node --test`, covering the filter, both sorts, the chips, the duration format, the empty state, the unknown-value fallback, and a server test for the route and its 503.
- No new dependencies (`README.md`: "No dependencies; Node 20 or later.").

## Grounding

- Page module shape (pure `renderX(snapshot, query)` returning a string, header comment documenting the query params, `ENVIRONMENTS`/`SORTS` constants, fallback validation with `Object.hasOwn`): `src/pages/services.js:5-16`
- Filter/sort behavior the spec points at (sort links carry `env`, the filter form carries `sort`/`dir`, the active column flips, others start ascending): `src/pages/services.js:30-38` and `src/pages/services.js:88-94`. The kit reproduces this: `vendor/kit/table/src/lib/table.js:46-56` and `vendor/kit/filter-bar/src/lib/filter-bar.js:15-21`
- Kit components used, with their contracts: `vendor/kit/page-header/src/lib/page-header.js:10-14`, `vendor/kit/filter-bar/src/lib/filter-bar.js:15-21`, `vendor/kit/select/src/lib/select.js:13-21`, `vendor/kit/table/src/lib/table.js:20-69` (its `sortRows` uses `Array.prototype.sort`, which is stable, so tie order is the input order), `vendor/kit/badge/src/lib/badge.js:12-15` (tones `ok|warn|bad|info|muted`), `vendor/kit/empty/src/lib/empty.js:9-12`
- Kit import style (`#kit/<name>`): `src/pages/services.js:1-2`; mapping in `package.json` `"imports"`
- Auto-submit on change for kit filter fields: `public/kit.js:7-10` (`data-autosubmit`, which `selectField` emits). Kit styles already exist in `public/kit.css:19-38`, so no CSS changes are needed.
- Snapshot-time copy ("Snapshot <generatedAt>"): `src/pages/overview.js:29`
- Error handling (503 "Snapshot unavailable" for any route whose snapshot read fails): `src/server.js:32-41`. The page module itself does no error handling.
- Routing table: `src/server.js:17-23`; nav list: `src/layout.js:3-9`
- Page test shape (fixture snapshot const, `indexOf` ordering asserts, regex matches on exact markup, `doesNotMatch` for the empty state, a defaults-fallback test with `sort: 'constructor'`): `test/pages/services.test.js:1-47`
- Server test shape (`handle(url, { dataDir })`, missing `no-such-dir` for the 503): `test/server.test.js:6-25`
- Naming: camelCase functions, `renderX` per page, one file per route (`src/pages/<route>.js`, `test/pages/<route>.test.js`): `src/server.js:8-12` imports and `test/pages/services.test.js:3`

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/pages/deploys.js` | Create | `renderDeploys(snapshot, query)`: validate the query, filter, compose the kit components. `formatDuration(startedAt, finishedAt)`: the Duration cell text. |
| `test/pages/deploys.test.js` | Create | Rendering tests for everything in the spec's Page and Errors (query fallback) sections. |
| `src/server.js` | Modify `:8-12` (imports), `:17-23` (`ROUTES`) | Route `/deploys` to `renderDeploys` with snapshot `deploys`. |
| `src/layout.js` | Modify `:3-9` (`NAV`) | "Deploys" link after "Services". |
| `test/server.test.js` | Modify `:14-18`, insert after `:18` | Route, layout/nav and 503 tests for `/deploys`. |
| `README.md` | Modify `:16` | List Deploys among the pages. |

Design decisions worth reading before review:

1. **Kit over copy-paste.** `services.js` predates the kit and hand-rolls its table and form. The spec asks for the same *behavior*, and the kit's `dataTable`/`filterBar` produce the same links and hidden fields. The markup differs from Services, though (`kit-table`, `kit-filter-bar`, `kit-badge` instead of `services`, `filters`, `pill`), so the Deploys page will look like the kit rather than exactly like Services. The kit's colors (`--kit-ok/bad/warn/info`) give the spec's green/red/amber/blue.
2. **Ties within a service.** The kit table compares only the sort column. The page sorts the rows newest first before handing them over, so the stable sort keeps deploys of the same service newest first in both directions. A test checks this.
3. **Missing `dir`.** When `?dir=` is missing or unknown, each sortable column takes its natural direction: Service ascending, Started descending. With no query at all this gives the spec's default (Started, newest first). The generated links always carry `dir`, so this only affects hand-typed URLs.
4. **Empty with "All environments".** The spec only words the filtered case ("No deploys in staging"). If the snapshot itself is empty, the page says "No deploys" rather than "No deploys in all".

---

### Task 1: Deploys page renderer

**Risk tier:** standard — a new module that composes five kit components with query validation and sorting. Not a mechanical transcription.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: kit functions as they exist today:
  - `pageHeader({ title, subtitle }) → string`
  - `filterBar({ action, fields: string[], keep: Record<string,string> }) → string`
  - `selectField({ name, label, options: {value,label}[], value }) → string`
  - `dataTable({ columns: {key,label,sortable?,render?,value?}[], rows, sort: {key,dir}, sortHref: (key, dir) => string, empty: string }) → string`
  - `badge(label, tone) → string`
  - `emptyState({ title }) → string`
- Produces (Task 2 relies on this):
  - `export function renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string,string>): string`
  - `export function formatDuration(startedAt: string, finishedAt: string | null): string`
  - Sort keys accepted in `?sort=`: `service`, `startedAt`. `?env=` values: `production`, `staging` (anything else means `all`).

**Mirror:** `src/pages/services.js:5-16` for the module header comment, constants and query validation. `test/pages/services.test.js:1-47` for test shape.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`. The fixture is out of time order on purpose: `api` 3.0.9 (oldest) comes before `api` 3.1.0, so the tie-order test fails unless the page sorts newest first before the table sorts.

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-3', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-0', service: 'api', version: '3.0.9', environment: 'production', status: 'succeeded', startedAt: '2026-09-28T08:50:00Z', finishedAt: '2026-09-28T08:54:12Z', author: 'dana' },
    { id: 'd-1', service: 'billing', version: '2.8.0', environment: 'production', status: 'failed', startedAt: '2026-09-29T11:40:00Z', finishedAt: '2026-09-29T11:42:30Z', author: 'sam' },
    { id: 'd-2', service: 'api', version: '3.1.0', environment: 'production', status: 'rolled-back', startedAt: '2026-09-30T16:05:00Z', finishedAt: '2026-09-30T16:26:40Z', author: 'dana' },
  ],
};

// Index of each version cell, so tests can assert row order.
const at = (html, version) => html.indexOf(`<td>${version}</td>`);

test('shows the header with the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<header class="kit-page-header"><div><h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01T09:30:00Z<\/p><\/div><\/header>/);
});

test('lists deploys newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.ok(at(html, '1.23.0-rc.1') < at(html, '3.1.0'));
  assert.ok(at(html, '3.1.0') < at(html, '2.8.0'));
  assert.ok(at(html, '2.8.0') < at(html, '3.0.9'));
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
  assert.match(html, /<th>Version<\/th><th>Environment<\/th><th>Status<\/th>/);
  assert.match(html, /<th>Duration<\/th><th>Author<\/th>/);
});

test('sorts by start time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.ok(at(oldest, '3.0.9') < at(oldest, '2.8.0'));
  assert.ok(at(oldest, '3.1.0') < at(oldest, '1.23.0-rc.1'));
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sorts by service both ways, newest first within a service', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.ok(at(az, '3.1.0') < at(az, '3.0.9'));
  assert.ok(at(az, '3.0.9') < at(az, '2.8.0'));
  assert.ok(at(az, '2.8.0') < at(az, '1.23.0-rc.1'));
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.ok(at(za, '1.23.0-rc.1') < at(za, '2.8.0'));
  assert.ok(at(za, '2.8.0') < at(za, '3.1.0'));
  assert.ok(at(za, '3.1.0') < at(za, '3.0.9'));
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('formats the duration in minutes and seconds, or running', () => {
  assert.equal(formatDuration('2026-09-28T08:50:00Z', '2026-09-28T08:54:12Z'), '4m 12s');
  assert.equal(formatDuration('2026-09-30T16:05:00Z', '2026-09-30T16:26:40Z'), '21m 40s');
  assert.equal(formatDuration('2026-10-01T09:00:00Z', '2026-10-01T09:00:45Z'), '0m 45s');
  assert.equal(formatDuration('2026-10-01T09:05:00Z', null), 'running');
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('filters by environment and keeps the sort, and sorting keeps the filter', () => {
  const html = renderDeploys(snapshot, { env: 'staging', sort: 'service', dir: 'desc' });
  assert.ok(at(html, '1.23.0-rc.1') !== -1);
  assert.equal(at(html, '2.8.0'), -1);
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit><option value="all">All environments<\/option><option value="production">production<\/option><option value="staging" selected>staging<\/option><\/select>/);
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="desc">/);
  assert.match(html, /href="\?env=staging&amp;sort=startedAt&amp;dir=asc"/);
});

test('names the environment when the filter matches no deploys', () => {
  const html = renderDeploys({ ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') }, { env: 'staging' });
  assert.match(html, /<div class="kit-empty"><p class="kit-empty__title">No deploys in staging<\/p><\/div>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<select name="env"/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assert.ok(at(html, '1.23.0-rc.1') < at(html, '3.0.9'));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL. The file fails to load with `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

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
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, newest first).
const ENVIRONMENTS = ['production', 'staging'];
// Each sortable column and the direction it takes when ?dir is missing or unknown.
const SORTS = { service: 'asc', startedAt: 'desc' };
const STATUS_TONES = {
  succeeded: 'ok',
  failed: 'bad',
  'rolled-back': 'warn',
  'in-progress': 'info',
};

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = Object.hasOwn(SORTS, query.sort ?? '') ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : SORTS[sort];

  // Newest first before the table sorts, so deploys of the same service stay
  // newest first whichever way the table's stable sort runs.
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
      { key: 'duration', label: 'Duration', render: (d) => formatDuration(d.startedAt, d.finishedAt) },
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

// "4m 12s" from start to finish; "running" while the deploy has no finish.
export function formatDuration(startedAt, finishedAt) {
  if (finishedAt === null) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- Do not escape inside `sortHref` or the badge label: `dataTable` escapes the href (that is where `&amp;` comes from) and `badge` escapes its label. Plain cells (`service`, `version`, …) are escaped by `dataTable`. `env`, `sort` and `dir` are whitelisted before they reach any markup.
- An unknown `status` gets `undefined` as its tone, and `badge` falls back to `muted`. That is fine, so add no extra handling.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 9 tests, 0 failures.

Then the whole suite: `npm test`
Expected: PASS. Nothing else has changed yet.

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: Route `/deploys` and link it in the nav

**Risk tier:** standard — multi-file integration (server routing, layout, tests, README).

**Files:**
- Modify: `src/server.js:8-12` (imports), `src/server.js:17-23` (`ROUTES`)
- Modify: `src/layout.js:3-9` (`NAV`)
- Modify: `README.md:16`
- Test: `test/server.test.js:14-18`, plus two new tests inserted after line 18

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1). Also the existing `handle(url, { dataDir })` and `readSnapshot(name, dir)` behavior: `ROUTES[path].snapshot` names the `data/<name>.json` file.
- Produces: `GET /deploys` → 200 page titled "Deploys · Harbor", or 503 "Snapshot unavailable" when `deploys.json` cannot be read.

**Mirror:** `src/server.js:17-23` and `test/server.test.js:6-25`.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, change the nav-pages list in `serves every page in the nav` (line 15) to:

```js
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
```

Then insert these two tests right after that test (after line 18, before `answers 503 when the snapshot cannot be read`). They read the real `data/deploys.json`: 0.9.4 is a production deploy and 1.23.0-rc.1 is a staging one.

```js
test('renders the deploys page inside the layout, linked after Services', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>0\.9\.4<\/td>/);
  assert.doesNotMatch(res.body, /<td>1\.23\.0-rc\.1<\/td>/);
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
Expected: FAIL. Exactly 3 failures: `serves every page in the nav` (`/deploys` returns 404), `renders the deploys page inside the layout, linked after Services`, and `answers 503 on the deploys page when its snapshot cannot be read` (both get 404).

- [ ] **Step 3: Add the route and the nav link**

In `src/server.js`, add the import in alphabetical order, right above the `renderIncidents` import:

```js
import { renderDeploys } from './pages/deploys.js';
```

and add the route after `/services` in `ROUTES`:

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

In `src/layout.js`, change `NAV` to:

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

In `README.md`, change line 16 from

```
Overview, Services, Incidents, On-call and Runbooks, one module each in
```

to

```
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module each in
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 29 tests, 0 failures.

Manual check (optional): `npm start`, open `http://localhost:3000/deploys`, pick "staging" in the dropdown. The page should reload with `?env=staging&sort=startedAt&dir=desc`. Then click "Service" and confirm the URL keeps `env=staging`.

- [ ] **Step 5: Commit**

```bash
git add src/server.js src/layout.js README.md test/server.test.js
git commit -m "Route /deploys and link it in the nav"
```

---

## Spec coverage

| Spec requirement | Where |
|---|---|
| `/deploys` route, nav link after Services | Task 2 (route, `NAV`, server tests) |
| Header "Deploys" + snapshot time | Task 1, `shows the header with the snapshot time` |
| Environment filter, default All, reload keeps sort | Task 1, `filters by environment and keeps the sort…`; autosubmit via `data-autosubmit` + `public/kit.js` |
| Columns in order; newest first by default | Task 1, `lists deploys newest first by default` |
| Service and Started sortable both ways; sorting keeps filter | Task 1, `sorts by start time both ways`, `sorts by service both ways…`, `filters by environment…` (sort href carries `env=staging`) |
| Status chip colors | Task 1, `colors each status` |
| Duration format / "running" | Task 1, `formats the duration…` |
| Empty state naming the environment | Task 1, `names the environment when the filter matches no deploys` |
| Unknown `env`/`sort`/`dir` fall back | Task 1, `falls back to the defaults for unknown query values` |
| Missing/unreadable `deploys.json` → 503 | Task 2, `answers 503 on the deploys page…` |
| Out of scope (details page, pagination, refresh, actions) | Not built |
