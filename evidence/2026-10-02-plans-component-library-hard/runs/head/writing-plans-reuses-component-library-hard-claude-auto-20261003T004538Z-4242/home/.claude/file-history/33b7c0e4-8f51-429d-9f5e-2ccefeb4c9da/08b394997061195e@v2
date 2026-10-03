# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** A read-only `/deploys` page listing recent deploys from `data/deploys.json`, with an environment filter, Service/Started sorting, colored status chips and durations, linked from the nav after "Services".

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)` like every other page, built from the vendored Keel kit components (`pageHeader`, `filterBar`, `selectField`, `dataTable`, `badge`, `emptyState`) instead of the hand-rolled table/form markup in `services.js`. The kit already implements the Services page's sort-header behavior (active column flips, others start ascending, `aria-sort`, ▲/▼) and the filter form's hidden "keep the sort" fields, and `public/kit.css` / `public/kit.js` are already loaded by the layout, so no CSS or client JS changes are needed. `src/server.js` gets one route entry, which brings the existing 503 "Snapshot unavailable" handling for free; `src/layout.js` gets one nav entry.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`. Kit components are imported through the `#kit/*` import map in `package.json`.

## Global Constraints

- Route `/deploys`; nav label "Deploys", placed directly after "Services".
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Data: `data/deploys.json` → `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`. `status` ∈ `succeeded`, `failed`, `rolled-back`, `in-progress`; `finishedAt` is `null` while in progress.
- Header "Deploys" with the snapshot time under it.
- Environment filter options: "All environments" (default), "production", "staging". Choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) instead of the table.
- Missing/unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as the others. Unknown `env`, `sort`, `dir` → defaults.
- Tests: `node --test` (`npm test`).

## Decisions this plan makes (not spelled out in the spec)

- **Kit, not hand-rolled markup.** The spec says sorting and filtering *behave* as on Services; it does not require Services' markup. The kit components produce the same behavior and the same link/hidden-field shapes, and they are what the project vendored the kit for. Services itself is not migrated (out of scope).
- **Chip colors map to kit badge tones:** succeeded → `ok` (green), failed → `bad` (red), rolled-back → `warn` (amber), in-progress → `info` (blue). An unexpected status falls back to the kit's grey `muted` tone.
- **Sort keys** are `service` and `startedAt` (the data field names, mirroring Services' `deployedAt`).
- **Default direction per sort when `?dir` is missing or unknown:** `startedAt` → `desc` (the spec's "newest first"), `service` → `asc`. Header links always carry an explicit `dir`, so this only matters for hand-typed URLs.
- **Ties within a service** stay newest first in both directions: rows are pre-sorted newest first and the kit table's sort is stable.
- **Empty with "All environments"** (only possible with an empty snapshot) says "No deploys".
- **Durations of an hour or more** stay in minutes ("75m 3s"), per the spec's "minutes and seconds".
- **Started** shows the raw ISO timestamp, as the Services page does for Deployed.

## Grounding

- Page module shape (named `render<Page>(snapshot, query)` export, top comment listing query params, `ENVIRONMENTS` + fallback parsing): `src/pages/services.js:5-16`
- Unknown-query fallback idiom (`includes`, `Object.hasOwn` to reject `constructor`, explicit `dir` check): `src/pages/services.js:14-16`
- Sort-link and keep-the-sort behavior to match: `src/pages/services.js:30-38` and `:88-94`; the kit equivalents: `vendor/kit/table/src/lib/table.js:46-56` (header links), `vendor/kit/filter-bar/src/lib/filter-bar.js:15-21` (hidden `keep` fields)
- Kit component use in a page (import via `#kit/<name>`): `src/pages/services.js:1-2`, `src/pages/overview.js:1,15-20`
- Kit components used, with their signatures: `vendor/kit/page-header/src/lib/page-header.js:10-14`, `vendor/kit/select/src/lib/select.js:13-21`, `vendor/kit/table/src/lib/table.js:20-44`, `vendor/kit/badge/src/lib/badge.js:12-15`, `vendor/kit/empty/src/lib/empty.js:9-12`
- Badge tone colors (ok green, warn amber, bad red, info blue): `public/kit.css:2,19-24`
- Auto-submit of the filter select (already wired, no new JS): `public/kit.js:7-10`
- "Snapshot <time>" subtitle wording: `src/pages/overview.js:29`
- Escaping: kit components escape text themselves (`vendor/kit/utils/src/lib/utils.js:2-9`); `render` callbacks return trusted HTML, so only pass kit output or computed strings from them.
- Routing and 503 handling: `src/server.js:17-43`
- Nav entries: `src/layout.js:3-9`
- Page test shape (inline snapshot fixture, `indexOf` ordering, regex on exact markup): `test/pages/services.test.js:1-47`
- Server test shape (`handle()` called directly, `dataDir` pointing at a missing dir for 503): `test/server.test.js:6-25`
- Error handling inside page renderers: none — no page throws or validates its snapshot; the server's try/catch around `readSnapshot` is the only error path (`src/server.js:32-41`).

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new module with filtering/sorting/formatting behavior and its full test suite.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: kit exports `pageHeader({title, subtitle})`, `filterBar({action, fields, keep})`, `selectField({name, label, options, value})`, `dataTable({columns, rows, sort, sortHref, empty})`, `badge(label, tone)`, `emptyState({title})` (all existing, see Grounding).
- Produces: `export function renderDeploys(snapshot, query): string` — `snapshot` is the parsed `deploys.json`, `query` is a plain object of query-string values (`{ env?, sort?, dir? }`). Returns the page body HTML (no layout). Task 2 registers it as a route.

**Mirror:** `src/pages/services.js:5-21`, query parsing and fallback; `test/pages/services.test.js`, test shape.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

// Out of order on purpose, so the tests prove the page sorts.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-3', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-1', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-09-30T08:10:00Z', finishedAt: '2026-09-30T08:31:40Z', author: 'marco' },
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-2', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
  ],
};

// Asserts the versions appear in this order in the rendered rows.
function assertOrder(html, versions) {
  const positions = versions.map((v) => html.indexOf(`<td>${v}</td>`));
  assert.ok(positions.every((p) => p >= 0), `missing a row in ${versions}`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, `expected order ${versions}`);
}

test('shows the header, the columns and the newest deploys first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
  assert.match(
    html,
    /<thead><tr><th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th><th>Version<\/th><th>Environment<\/th><th>Status<\/th><th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th><th>Duration<\/th><th>Author<\/th><\/tr><\/thead>/,
  );
  assertOrder(html, ['1.23.0-rc.1', '0.9.4', '2.9.0-rc.3', '0.9.3']);
});

test('sorts by start time both ways and keeps the sort in the filter form', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assertOrder(oldest, ['0.9.3', '2.9.0-rc.3', '0.9.4', '1.23.0-rc.1']);
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
  assert.match(oldest, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="asc">/);
  const newest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' });
  assertOrder(newest, ['1.23.0-rc.1', '0.9.4', '2.9.0-rc.3', '0.9.3']);
});

test('sorts by service both ways, newest first within a service', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assertOrder(az, ['2.9.0-rc.3', '0.9.4', '0.9.3', '1.23.0-rc.1']);
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  assert.match(az, /<th><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started<\/a><\/th>/);
  assert.match(az, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assertOrder(za, ['1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3']);
  assert.match(za, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
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
  assert.match(html, /<td>0\.9\.4<\/td>.*<td>4m 12s<\/td>/);
  assert.match(html, /<td>2\.9\.0-rc\.3<\/td>.*<td>2m 30s<\/td>/);
  assert.match(html, /<td>0\.9\.3<\/td>.*<td>21m 40s<\/td>/);
  assert.match(html, /<td>1\.23\.0-rc\.1<\/td>.*<td>running<\/td>/);
});

test('filters by environment and keeps it when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'asc' });
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit><option value="all">All environments<\/option><option value="production" selected>production<\/option><option value="staging">staging<\/option><\/select>/);
  assertOrder(html, ['0.9.4', '0.9.3']);
  assert.doesNotMatch(html, /<td>staging<\/td>/);
  assert.match(html, /href="\?env=production&amp;sort=startedAt&amp;dir=asc"/);
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
});

test('names the environment when no deploys match', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<div class="kit-empty"><p class="kit-empty__title">No deploys in staging<\/p><\/div>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assertOrder(html, ['1.23.0-rc.1', '0.9.4', '2.9.0-rc.3', '0.9.3']);
});
```

Notes for the implementer: each table row renders on one line, so the duration regexes' `.*` (which does not cross newlines) pins each duration to its own row. `sort: 'constructor'` guards against an `in`/property-lookup check accepting `Object.prototype` keys.

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
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending).
const ENVIRONMENTS = ['production', 'staging'];
// The direction each sort takes when ?dir is missing or unknown.
const DEFAULT_DIRS = { service: 'asc', startedAt: 'desc' };
const STATUS_TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = Object.hasOwn(DEFAULT_DIRS, query.sort ?? '') ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : DEFAULT_DIRS[sort];

  // Newest first before the table sorts, so deploys of one service stay
  // newest first when sorting by service.
  let deploys = [...snapshot.deploys].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (env !== 'all') deploys = deploys.filter((d) => d.environment === env);

  const envField = selectField({
    name: 'env',
    label: 'Environment',
    value: env,
    options: [
      { value: 'all', label: 'All environments' },
      ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
    ],
  });

  // The sort links carry the filter, and the filter form carries the sort.
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
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${snapshot.generatedAt}` })}
${filterBar({ action: '/deploys', fields: [envField], keep: { sort, dir } })}
${table}`;
}

// Minutes and seconds from start to finish, such as "4m 12s". A deploy in
// progress has no finish yet.
function duration(deploy) {
  if (deploy.finishedAt === null) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Why the `sortHref` uses raw `&`: `dataTable` escapes the href itself (`table.js:55`), producing the same `&amp;` markup the Services page writes by hand. Do not pre-escape it, or it will double-escape.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 8 tests.

Then run: `npm test`
Expected: all tests pass (the new module is not wired up yet, so nothing else changes).

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the Deploys page renderer"
```

---

### Task 2: Route, nav link and README

**Risk tier:** standard — multi-file integration (server routing, shared layout nav, docs), though each edit is a single line.

**Files:**
- Modify: `src/server.js:8` (import) and `src/server.js:17-23` (`ROUTES`)
- Modify: `src/layout.js:3-9` (`NAV`)
- Modify: `README.md:16`
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1); existing `handle(url, { dataDir })` from `src/server.js`.
- Produces: `GET /deploys` → 200 page wrapped in the layout, or 503 "Snapshot unavailable" when `data/deploys.json` cannot be read or parsed.

**Mirror:** `test/server.test.js:6-25`, server test shape; `src/server.js:19`, a route entry.

- [ ] **Step 1: Write the failing tests**

In `test/server.test.js`, insert this test after `'renders the services page inside the layout'` (after line 12):

```js
test('renders the deploys page inside the layout, after Services in the nav', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<td>0\.9\.4<\/td>/);
});
```

In `'serves every page in the nav'`, change the path list to:

```js
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
```

Insert this test after `'answers 503 when the snapshot cannot be read'`:

```js
test('answers 503 when the deploys snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

(`<td>0.9.4</td>` comes from the committed `data/deploys.json`, deploy `d-1041`.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL — the deploys page test and the 503 test fail with status `404 !== 200` / `404 !== 503`, and `'serves every page in the nav'` fails on `/deploys`.

- [ ] **Step 3: Register the route and the nav link**

In `src/server.js`, add the import in alphabetical order, before the `renderIncidents` import:

```js
import { renderDeploys } from './pages/deploys.js';
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

- [ ] **Step 4: Update the README's page list**

In `README.md`, change line 16 from

```
Overview, Services, Incidents, On-call and Runbooks, one module each in
```

to

```
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module each in
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 28 tests, 0 failures.

- [ ] **Step 6: Check it in the browser**

Run: `npm start`, open `http://localhost:3000/deploys`.
Expected: "Deploys" is in the nav after "Services" and highlighted; the table shows newest first with colored chips; choosing "staging" in the dropdown reloads with `?env=staging&sort=startedAt&dir=desc`; clicking "Service" sorts A→Z and keeps `env=staging`. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/server.js src/layout.js README.md test/server.test.js
git commit -m "Serve the Deploys page and link it from the nav"
```
