# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** A read-only `/deploys` page listing the recent deploys from `data/deploys.json`, with an environment filter, sortable Service and Started columns, colored status chips and durations, linked from the nav after "Services".

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)` like every other page. It is built from the vendored Keel kit (`pageHeader`, `filterBar` + `selectField`, `dataTable`, `badge`, `emptyState`). The kit already does what `src/pages/services.js` does by hand: the same sort-header links, the same arrows and `aria-sort`, the same hidden sort inputs in the filter form. So the page behaves like Services without copying its markup. `src/server.js` gets one route entry, and `src/layout.js` gets one nav entry. The existing 503 path covers the new route with no changes.

**Tech Stack:** Node ≥20 ES modules, no dependencies, server-rendered HTML strings, `node --test` with `node:assert/strict`, kit components imported through the `#kit/*` alias in `package.json`.

## Global Constraints

- Route `/deploys`, read-only. Add a "Deploys" nav link directly after "Services".
- Out of scope: deploy details page, pagination, live refresh, any action on a deploy.
- Data source: `data/deploys.json`, `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`. `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`. `finishedAt` is `null` while a deploy is in progress.
- Header: "Deploys", with the snapshot time under it.
- Environment filter options: "All environments" (default), "production", "staging". Choosing one reloads with `?env=` and keeps the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Only Service and Started are sortable, both directions, via `?sort=` and `?dir=`. Changing the sort keeps the filter.
- Status chips: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s". In-progress shows "running".
- Empty filter result: the text "No deploys in staging" (naming the chosen environment) replaces the table.
- Missing or unreadable `deploys.json` gets the same 503 "Snapshot unavailable" page as other pages.
- Unknown `env`, `sort` or `dir` values fall back to the default.
- Tests: `node --test`. No new dependencies (README: "No dependencies; Node 20 or later.").

**Interpretation for your human partner to confirm.** The spec says an unknown `dir` "falls back to the default", but with two sortable columns there are two reasonable defaults. This plan gives each sort its own default direction: `startedAt` → `desc` (newest first, the page default) and `service` → `asc` (A→Z). So `?sort=service` alone, or `?sort=service&dir=sideways`, lists A→Z. As on Services, clicking a column that isn't the active sort always starts it ascending; that comes from the kit's `dataTable`.

## Grounding

- **Page module shape and naming:** `src/pages/services.js:5-16`. It exports `renderX(snapshot, query)`, has a header comment documenting the query params, uses `ENVIRONMENTS`/`SORTS` constants, and parses the query with fallbacks (`Object.hasOwn` guards against `?sort=constructor`).
- **Kit imports through the alias:** `package.json` `"imports": { "#kit/*": ... }` and `src/pages/services.js:1-2` (`import { button } from '#kit/button'`).
- **Sortable header behavior that Services hand-rolls:** `src/pages/services.js:30-38`, and the identical logic in `vendor/kit/table/src/lib/table.js:46-56` (`headerCell`). `dataTable` also sorts the rows (`table.js:58-69`) and renders `empty` in place of the table when there are no rows (`table.js:27`).
- **Filter form that keeps the sort:** Services does it at `src/pages/services.js:88-94`. The kit equivalent is `vendor/kit/filter-bar/src/lib/filter-bar.js:15-21` (`keep` → hidden inputs) plus `vendor/kit/select/src/lib/select.js:13-21` (`data-autosubmit`, which `public/kit.js:7-10` submits on change).
- **Status → color mapping:** `src/pages/services.js:99-103` (`healthClass`) maps domain states to colors at the call site. `vendor/kit/badge/src/lib/badge.js:5-15` says "Map your domain's states to a tone at the call site". The tones `ok`/`bad`/`warn`/`info` are green/red/amber/blue in `public/kit.css:2,19-24`.
- **Header with snapshot time:** `src/pages/overview.js:29` (`Snapshot ${generatedAt}`) and `vendor/kit/page-header/src/lib/page-header.js:10-14` (`subtitle`).
- **Empty state:** `vendor/kit/empty/src/lib/empty.js:9-12`.
- **Error handling (503):** `src/server.js:32-41`. Any `readSnapshot` failure, missing file or bad JSON, renders `<h1>{title}</h1>` plus "Snapshot unavailable" with status 503.
- **Routing and nav:** `src/server.js:17-23` (`ROUTES` table) and `src/layout.js:3-9` (`NAV` array).
- **Page test shape:** `test/pages/services.test.js:1-47`. It uses an inline snapshot fixture, checks order with `indexOf` on `<td>` cells, and matches exact markup with regexes.
- **Server test shape:** `test/server.test.js:6-25`. It calls `handle(url, { dataDir })` directly and uses a nonexistent `dataDir` to force a 503.
- **Duration formatting:** none. No existing code formats a time span. The plan defines `formatDuration` in Task 1.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module that integrates six kit components, with behavior rules taken from the spec.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing kit, signatures from `vendor/kit/*/src/lib/*.js`):
  - `pageHeader({ title, subtitle })` → string
  - `filterBar({ action, fields: string[], keep: Record<string,string> })` → string
  - `selectField({ name, label, options: {value,label}[], value })` → string
  - `dataTable({ columns, rows, sort: {key, dir}, sortHref: (key, dir) => string, empty: string })` → string
  - `badge(label, tone)` → string
  - `emptyState({ title })` → string
- Produces: `export function renderDeploys(snapshot, query)` → HTML string. `snapshot` is the parsed `deploys.json`. `query` is a plain object of query-string values (`Object.fromEntries(searchParams)`, as `src/server.js:42` passes). Task 2 imports it from `./pages/deploys.js`.

**Mirror:** `src/pages/services.js:5-16`. Follow its header comment, constants and query fallbacks. Don't copy its hand-built `<table>`/`<form>`/`.pill` markup; the kit components replace them. For tests, mirror `test/pages/services.test.js:1-47`.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

// Deliberately not in time order, so the default sort has work to do.
// Newest first: search, api, notifications, billing.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-2', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-09-30T10:00:00Z', finishedAt: '2026-09-30T10:21:40Z', author: 'marco' },
    { id: 'd-1', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-09-29T11:40:00Z', finishedAt: '2026-09-29T11:42:30Z', author: 'sam' },
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-3', service: 'api', version: '3.15.0', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'dana' },
  ],
};

function assertOrder(html, services) {
  const positions = services.map((s) => html.indexOf(`<td>${s}</td>`));
  assert.ok(positions.every((p) => p >= 0), `missing a row: ${services}`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, `expected ${services}`);
}

test('shows the header with the snapshot time and the columns in order', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
  assert.match(
    html,
    /Service<\/a><\/th><th>Version<\/th><th>Environment<\/th><th>Status<\/th><th aria-sort="descending"><a [^>]*>Started ▼<\/a><\/th><th>Duration<\/th><th>Author<\/th>/,
  );
});

test('lists deploys newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assertOrder(html, ['search', 'api', 'notifications', 'billing']);
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
});

test('sorts by start time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assertOrder(oldest, ['billing', 'notifications', 'api', 'search']);
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
  const newest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'desc' });
  assertOrder(newest, ['search', 'api', 'notifications', 'billing']);
});

test('sorts by service both ways and keeps the sort in the filter form', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assertOrder(az, ['api', 'billing', 'notifications', 'search']);
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  assert.match(az, /<input type="hidden" name="sort" value="service">/);
  assert.match(az, /<input type="hidden" name="dir" value="asc">/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assertOrder(za, ['search', 'notifications', 'billing', 'api']);
  assert.match(za, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('shows durations in minutes and seconds, and running for an in-progress deploy', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(
    html,
    /<tr><td>api<\/td><td>3\.15\.0<\/td><td>production<\/td><td><span class="kit-badge kit-badge--ok">succeeded<\/span><\/td><td>2026-10-01T08:50:00Z<\/td><td>4m 12s<\/td><td>dana<\/td><\/tr>/,
  );
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<tr><td>search<\/td>.*<td>running<\/td><td>priya<\/td><\/tr>/);
});

test('filters by environment and keeps it when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<option value="all">All environments<\/option><option value="production">production<\/option><option value="staging" selected>staging<\/option>/);
  assertOrder(html, ['search', 'billing']);
  assert.doesNotMatch(html, /<td>api<\/td>|<td>notifications<\/td>/);
  assert.match(html, /href="\?env=staging&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\?env=staging&amp;sort=startedAt&amp;dir=asc"/);
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
  assertOrder(html, ['search', 'api', 'notifications', 'billing']);
  const service = renderDeploys(snapshot, { sort: 'service', dir: 'sideways' });
  assert.match(service, /<input type="hidden" name="dir" value="asc">/);
  assertOrder(service, ['api', 'billing', 'notifications', 'search']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL. The file errors with `ERR_MODULE_NOT_FOUND` for `src/pages/deploys.js`.

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
// Each sort's direction when ?dir is missing or unknown.
const SORTS = { service: 'asc', startedAt: 'desc' };
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
  const sort = Object.hasOwn(SORTS, query.sort ?? '') ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : SORTS[sort];

  let deploys = snapshot.deploys;
  if (env !== 'all') deploys = deploys.filter((d) => d.environment === env);

  const filters = filterBar({
    action: '/deploys',
    fields: [
      selectField({
        name: 'env',
        label: 'Environment',
        options: ['all', ...ENVIRONMENTS].map((e) => ({
          value: e,
          label: e === 'all' ? 'All environments' : e,
        })),
        value: env,
      }),
    ],
    keep: { sort, dir },
  });

  const table = dataTable({
    columns: COLUMNS,
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

// "4m 12s" from start to finish. An in-progress deploy has no finish yet.
function formatDuration(startedAt, finishedAt) {
  if (!finishedAt) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

Notes for the implementer:
- `dataTable` escapes plain cells and `sortHref` output, which turns the `&` in the href into `&amp;`. `badge` and `emptyState` escape their labels. Don't add an `escapeHtml` pass on top, or the output gets double-escaped.
- `Object.hasOwn` instead of `in` keeps `?sort=constructor` from matching inherited properties, as in `services.js:15`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 9 tests.

Then run: `npm test`
Expected: PASS, 27 tests (18 existing + 9 new).

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the deploys page renderer"
```

---

### Task 2: Route, nav link and README

**Risk tier:** standard — touches three source files plus the server tests. Each edit is small, but this task wires the page into routing and the shared layout.

**Files:**
- Modify: `src/server.js:8-12` (imports) and `src/server.js:17-23` (`ROUTES`)
- Modify: `src/layout.js:3-9` (`NAV`)
- Modify: `README.md:16`
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query)` from `src/pages/deploys.js` (Task 1).
- Produces: `GET /deploys` → 200 with the page inside the layout, or 503 "Snapshot unavailable" when `deploys.json` can't be read or parsed.

**Mirror:** `src/server.js:19` (the `/services` route entry) and `test/server.test.js:6-25`.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, replace the imports at lines 1-4 with:

```js
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/server.js';
```

Replace the path list on line 15:

```js
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
```

Then add these tests after the existing `answers 503 when the snapshot cannot be read` test:

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<td>notifications<\/td>/);
  assert.doesNotMatch(res.body, /<td>staging<\/td>/);
});

test('puts Deploys in the nav after Services', async () => {
  const { body } = await handle('/');
  assert.match(body, /<a href="\/services">Services<\/a><a href="\/deploys">Deploys<\/a>/);
});

test('answers 503 when the deploys snapshot is missing', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});

test('answers 503 when the deploys snapshot is unreadable', async () => {
  // The pipeline rewrites the file in place, so a read can catch it half written.
  const dataDir = await mkdtemp(join(tmpdir(), 'harbor-'));
  await writeFile(join(dataDir, 'deploys.json'), '{"generatedAt": "2026-10');
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /Snapshot unavailable/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. `serves every page in the nav` fails with `404 !== 200` for `/deploys`. The deploys-page, nav and both 503 tests fail too, since the route returns 404 and the nav has no Deploys link.

- [ ] **Step 3: Add the route and the nav link**

In `src/server.js`, add the import in alphabetical order with the other page imports (after line 7, before `renderIncidents`):

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

In `src/layout.js`, add the nav entry after Services:

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

No change to the 503 handling. `handle` already catches any `readSnapshot` failure, including `JSON.parse` errors (`src/server.js:33-41`).

- [ ] **Step 4: Update the README page list**

In `README.md`, change line 16 from:

```
Overview, Services, Incidents, On-call and Runbooks, one module each in
```

to:

```
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module each in
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS, 9 tests.

Then run: `npm test`
Expected: PASS, 31 tests.

- [ ] **Step 6: Check it in the browser**

Run: `npm start`, then open `http://localhost:3000/deploys`.
Expected: the Deploys nav link is highlighted. Rows run newest first, starting with `search` (in-progress, blue chip, "running"). Choosing "production" in the dropdown reloads with `?env=production&sort=startedAt&dir=desc`. Clicking "Service" while filtered gives `?env=production&sort=service&dir=asc`. Stop the server afterwards.

- [ ] **Step 7: Commit**

```bash
git add src/server.js src/layout.js README.md test/server.test.js
git commit -m "Serve the deploys page and link it from the nav"
```
