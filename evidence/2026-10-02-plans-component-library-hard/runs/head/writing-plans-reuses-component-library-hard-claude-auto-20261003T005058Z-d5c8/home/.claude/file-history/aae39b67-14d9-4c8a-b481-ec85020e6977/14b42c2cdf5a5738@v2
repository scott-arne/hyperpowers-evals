# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page listing recent deploys from `data/deploys.json`. It gets an environment filter, sorting by Service or Started, colored status chips, durations and an empty state, and a "Deploys" nav link after "Services".

**Architecture:** A new page module `src/pages/deploys.js` exports `renderDeploys(snapshot, query)`, the same contract as every other page. It is built from the vendored Keel kit components already in the repo (`pageHeader`, `filterBar` + `selectField`, `dataTable`, `badge`, `emptyState`), so it doesn't hand-roll a table, select, sort headers or chips. The query parsing (an allowlist with fallback to the default) and the URL behavior (sort links carry `env`, the filter form carries `sort`/`dir`) match `src/pages/services.js`. `src/server.js` gets one route entry and `src/layout.js` gets one nav entry. The server's existing 503 path covers a missing snapshot.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`, kit imported through the `#kit/*` import map in `package.json`.

## Global Constraints

- Route `/deploys`; nav label "Deploys", placed directly after "Services".
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Data comes from `data/deploys.json`: `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`. `status` is one of `succeeded`, `failed`, `rolled-back`, `in-progress`. `finishedAt` is `null` while a deploy is in progress.
- Header: "Deploys", with the snapshot time under it.
- Environment filter options: "All environments" (default), "production", "staging". Choosing one reloads with `?env=` and keeps the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Service and Started sort both ways via `?sort=` and `?dir=`. Changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s". In-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- A missing or unreadable `deploys.json` gets the same 503 "Snapshot unavailable" page as other pages. An unknown `env`, `sort` or `dir` falls back to the default.
- Tests use `node --test`. No new dependencies (`README.md`: "No dependencies; Node 20 or later").

**Decisions the spec leaves open (flagged for review):**
- The default sort is `sort=startedAt`, `dir=desc`. An unknown or missing `dir` falls back to `desc`, the page default, so a hand-typed `?sort=service` with no `dir` sorts Z→A. Header links always carry an explicit `dir`, so clicking never hits this case. As in the kit's table and Services, clicking an inactive column starts ascending.
- Deploys of the same service stay newest-first under either Service sort. Rows are pre-sorted by `startedAt` descending, and the kit's sort is stable.
- With "All environments" and no deploys at all, the empty state reads "No deploys" because there is no environment to name.
- Durations under a minute render as "0m 45s" and durations over an hour as "75m 0s". The spec defines only minutes and seconds.
- Markup comes from the kit (`kit-table`, `kit-badge--ok|bad|warn|info`), not the Services page's hand-rolled `.services` table and `.pill-*` chips. Behavior matches Services; `public/kit.css` already styles every class used, so `public/app.css` does not change.

## Grounding

- Page module shape and query allowlist fallback: `src/pages/services.js:5-21`. It has a header comment that documents the query params, `ENVIRONMENTS` plus a sort allowlist, and an `'all'` default for `env`.
- Sort links carry the filter and the filter form carries the sort: `src/pages/services.js:30-38` (links `?env=…&sort=…&dir=…`) and `src/pages/services.js:88-94` (hidden `sort`/`dir` inputs).
- Snapshot time under the title: `src/pages/overview.js:29` (`Snapshot ${generatedAt}`).
- Kit import style: `src/pages/services.js:1-2` (`import { button } from '#kit/button'`), resolved by `package.json` `"imports": { "#kit/*": "./vendor/kit/*/src/index.js" }`.
- Kit components to reuse:
  - `vendor/kit/page-header/src/lib/page-header.js:10-14`: `pageHeader({ title, subtitle })`.
  - `vendor/kit/filter-bar/src/lib/filter-bar.js:15-21`: `filterBar({ action, fields, keep })`, with hidden inputs from `keep`.
  - `vendor/kit/select/src/lib/select.js:13-21`: `selectField({ name, label, options, value })`, marked `data-autosubmit`.
  - `public/kit.js:7-10` submits the form when an autosubmit field changes.
  - `vendor/kit/table/src/lib/table.js:20-69`: `dataTable({ columns, rows, sort, sortHref, empty })`. It sorts the rows, renders the ▲/▼ arrow and `aria-sort`, and escapes the `sortHref` result.
  - `vendor/kit/badge/src/lib/badge.js:12-15`: `badge(label, tone)`, tones `ok|warn|bad|info|muted`.
  - `public/kit.css:19-24`: badge colors (ok green, warn amber, bad red, info blue).
  - `vendor/kit/empty/src/lib/empty.js:9-12`: `emptyState({ title })`.
- Escaping: kit components escape their own text through `esc` (`vendor/kit/utils/src/lib/utils.js:2-9`). Hand-built markup elsewhere uses `escapeHtml` (`src/html.js:2-8`). This page has no hand-built markup containing data.
- Error handling: page modules don't handle read errors. `src/server.js:32-41` turns a failed `readSnapshot` into the 503 "Snapshot unavailable" page for any route.
- Route registration: `src/server.js:17-23` (`ROUTES` table: `{ title, snapshot, render }`). Nav: `src/layout.js:3-9` (`NAV` array).
- Page test shape: `test/pages/services.test.js:1-47`. It uses an inline fixture snapshot, `indexOf` comparisons for row order, `assert.match` on exact markup, and one `test()` per behavior.
- Server test shape: `test/server.test.js:6-25`. It covers a route inside the layout, the nav sweep, and a 503 via a missing `dataDir`.
- Duration formatting: `none`. No existing code formats time spans.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module that integrates six kit components. Its behavior has to match the Services page's query semantics.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: kit exports `pageHeader`, `filterBar`, `selectField`, `dataTable`, `badge`, `emptyState` (signatures in Grounding).
- Produces: `export function renderDeploys(snapshot: { generatedAt: string, deploys: Deploy[] }, query: Record<string, string>): string`. Task 2 registers it in `ROUTES`.

**Mirror:** `src/pages/services.js:5-21` for the header comment, the allowlist constants and the query fallback. `test/pages/services.test.js:1-47` for the test layout.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

// Deliberately not in time order, so the default sort is exercised.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-1038', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-1041', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-1042', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1040', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'marco' },
  ],
};

// True when the version cells appear in exactly this order.
function inOrder(html, ...versions) {
  const at = versions.map((v) => html.indexOf(`<td>${v}</td>`));
  return at.every((i) => i !== -1) && at.every((i, n) => n === 0 || at[n - 1] < i);
}

test('shows the title, the snapshot time and the columns', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01T09:30:00Z<\/p>/);
  assert.match(html, /<th><a href="[^"]*">Service<\/a><\/th><th>Version<\/th><th>Environment<\/th><th>Status<\/th><th aria-sort="descending"><a href="[^"]*">Started ▼<\/a><\/th><th>Duration<\/th><th>Author<\/th>/);
});

test('lists deploys newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.ok(inOrder(html, '1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3'));
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
});

test('sorts by start time oldest first', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.ok(inOrder(html, '2.9.0-rc.3', '0.9.3', '0.9.4', '1.23.0-rc.1'));
  assert.match(html, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sorts by service both ways, newest first within a service', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.ok(inOrder(az, '2.9.0-rc.3', '0.9.4', '0.9.3', '1.23.0-rc.1'));
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  assert.match(az, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.ok(inOrder(za, '1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3'));
  assert.match(za, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('shows durations in minutes and seconds, and running while in progress', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('filters by environment and keeps it when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /<option value="all">All environments<\/option><option value="production" selected>production<\/option><option value="staging">staging<\/option>/);
  assert.ok(inOrder(html, '0.9.4', '0.9.3'));
  assert.doesNotMatch(html, /<td>1\.23\.0-rc\.1<\/td>/);
  assert.doesNotMatch(html, /<td>2\.9\.0-rc\.3<\/td>/);
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
  assert.match(html, /href="\?env=production&amp;sort=startedAt&amp;dir=asc"/);
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<option value="staging" selected>/);
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assert.ok(inOrder(html, '1.23.0-rc.1', '0.9.4', '0.9.3', '2.9.0-rc.3'));
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
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : 'desc';

  // Newest first before the table sorts, so deploys of one service stay
  // newest first under either Service sort (the table's sort is stable).
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

// finishedAt minus startedAt, such as "4m 12s"; "running" while in progress.
function duration(deploy) {
  if (deploy.finishedAt === null) return 'running';
  const seconds = Math.round((Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 9 tests.

Then run: `npm test`
Expected: PASS, all tests (18 existing + 9 new).

- [ ] **Step 5: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the Deploys page renderer"
```

---

### Task 2: Route, nav link and README

**Risk tier:** standard — a multi-file integration across the server routes, the layout nav, the README and the server tests.

**Files:**
- Modify: `src/server.js:8-12` (imports) and `src/server.js:17-23` (`ROUTES`)
- Modify: `src/layout.js:3-9` (`NAV`)
- Modify: `README.md` (the "Pages" section)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query)` from `src/pages/deploys.js` (Task 1).
- Produces: `GET /deploys` serves the page inside the layout, with the "Deploys" nav link marked `aria-current="page"`, and answers 503 when `deploys.json` cannot be read.

**Mirror:** `test/server.test.js:6-25` for the route-in-layout test and the 503-via-missing-`dataDir` test.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, add this test after `'renders the services page inside the layout'`:

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=staging');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a><a href="\/incidents">/);
  assert.match(res.body, /<td>1\.23\.0-rc\.1<\/td>/);
  assert.doesNotMatch(res.body, /<td>0\.9\.4<\/td>/);
});
```

In `'serves every page in the nav'`, change the path list to:

```js
  for (const path of ['/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks']) {
```

Add this test after `'answers 503 when the snapshot cannot be read'`:

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
Expected: FAIL. `'renders the deploys page inside the layout'`, `'serves every page in the nav'` (path `/deploys`) and `'answers 503 when the deploys snapshot cannot be read'` all get status 404 instead of 200 or 503.

- [ ] **Step 3: Register the route and the nav link**

In `src/server.js`, add the import in alphabetical order (between `./layout.js` and `./pages/incidents.js`):

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

In `README.md`, replace the first sentence of the "Pages" section:

```
Overview, Services, Incidents, On-call and Runbooks, one module each in
`src/pages/`.
```

with:

```
Overview, Services, Deploys, Incidents, On-call and Runbooks, one module each
in `src/pages/`.
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS, 7 tests.

Then run: `npm test`
Expected: PASS, all tests.

Then smoke-check the real server: `PORT=3123 node src/server.js & sleep 1; curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3123/deploys?env=staging&sort=service&dir=asc'; kill %1`
Expected: `200`.

- [ ] **Step 5: Commit**

```bash
git add src/server.js src/layout.js README.md test/server.test.js
git commit -m "Serve the Deploys page and link it from the nav"
```
