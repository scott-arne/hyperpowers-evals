# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** A read-only `/deploys` page listing the deploys in `data/deploys.json`, with an environment filter, Service/Started sorting, colored status chips, durations and an empty state, linked from the nav after "Services".

**Architecture:** One page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)` with the same signature and query handling as `renderServices`. It builds the page from the vendored component kit (`#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge`, `#kit/empty`) rather than hand-rolling HTML the way the older pages do: the kit's `dataTable` already sorts rows and renders the same sort headers as Services (arrows, `aria-sort`, flip-on-click), and `filterBar` carries the sort through the filter form. `src/server.js` gets a route and `src/layout.js` a nav entry; the existing 503 handling in `handle()` covers the error case unchanged.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`. Kit components resolve through the `#kit/*` subpath import in `package.json` (`./vendor/kit/*/src/index.js`).

## Global Constraints

- Route `/deploys`, page title and nav label "Deploys", nav entry directly after "Services".
- Read-only: no details page, no pagination, no live refresh, no actions on a deploy.
- Environment filter options: "All environments" (default, value `all`), "production", "staging". Choosing one reloads with `?env=`, keeping the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author.
- Default order newest first (Started, descending). Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json` → the same 503 "Snapshot unavailable" page as the other pages.
- Unknown `env`, `sort` or `dir` falls back to the default.
- Tests run with `node --test`; no new dependencies.

## Grounding

- Page module shape and query parsing: `src/pages/services.js:5-21`. A header comment documents the query params, `ENVIRONMENTS` and `SORTS` constants sit at module level, and `Object.hasOwn(SORTS, query.sort ?? '')` guards the sort (so `?sort=constructor` falls back).
- Kit usage from a page: `src/pages/services.js:1-2,68-82` imports `#kit/button` and `#kit/dialog` and composes their HTML strings into the page.
- Kit table, which sorts rows and renders sort headers: `vendor/kit/table/src/lib/table.js:3-71`. `render` returns trusted HTML, `sortHref(key, nextDir)` builds header links and is escaped by the kit, and `empty` replaces the table when there are no rows.
- Kit filter form: `vendor/kit/filter-bar/src/lib/filter-bar.js:3-22` (`keep` → hidden inputs) and `vendor/kit/select/src/lib/select.js:3-25` (`data-autosubmit`, submitted by `public/kit.js:8-9`).
- Kit chip: `vendor/kit/badge/src/lib/badge.js:3-16`, tones `ok|warn|bad|info|muted`, styled green/amber/red/blue/grey in `public/kit.css:2,19-24`.
- Kit header and empty state: `vendor/kit/page-header/src/lib/page-header.js:3-15`, `vendor/kit/empty/src/lib/empty.js:3-14`.
- Timestamp display: `src/core/format/timestamp.js:1-7` (`formatTimestamp(iso)` → `"2026-10-01 09:30 UTC"`), tested in `test/core/timestamp.test.js:5-7`.
- Duration formatting: none. No existing duration helper in `src/`, so this plan adds a module-private one in the page.
- Error handling (503): `src/server.js:83-92`. `handle()` catches any `readSnapshot` failure for any route, so the page itself needs no error code.
- Routing and nav: `src/server.js:43-74` (`ROUTES` map) and `src/layout.js:3-34` (`NAV` array).
- Page test shape: `test/pages/services.test.js:1-47`, with an inline snapshot, `renderServices(snapshot, query)` and regex/`indexOf` assertions on the HTML string.
- Server test shape: `test/server.test.js:6-32`, which calls `handle(path, { dataDir })` directly and uses a `no-such-dir` dataDir for the 503.
- E2E crawl over nav links: `test/e2e/empty.test.js:6-16` and `test/e2e/single.test.js:6-16` load every nav link against `test/e2e/fixtures/{empty,single}/`, so a new nav page needs a fixture in both. The fixture shape is `test/e2e/fixtures/empty/services.json` and `test/e2e/fixtures/single/services.json`.
- Naming: page modules are `src/pages/<plural>.js` exporting `render<Plural>`, and tests mirror them at `test/pages/<plural>.test.js`.

---

### Task 1: Deploys page renderer

**Risk tier:** standard (new page module plus its tests; composes six kit components)

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: kit exports `pageHeader({title, subtitle})`, `filterBar({action, fields, keep})`, `selectField({name, label, options, value})`, `dataTable({columns, rows, sort, sortHref, empty})`, `badge(label, tone)`, `emptyState({title})`, `esc(value)` from `#kit/utils`, and `formatTimestamp(iso)` from `src/core/format/timestamp.js`.
- Produces: `export function renderDeploys(snapshot, query): string`, where `snapshot` is `{ generatedAt: string, deploys: Deploy[] }` (shape in `src/shared/schemas/deploys.js`) and `query` is a plain object of query-string values (`Object.fromEntries(searchParams)`). Task 2 routes to it.

**Mirror:** `src/pages/services.js:5-21` for the header comment, module-level constants and query fallback. `test/pages/services.test.js:1-47` for the test shape.

**Query rules (decided here, since the spec only says "as on the Services page"):**
- `?sort=` accepts `service` or `startedAt`. Anything else means `startedAt`.
- `?dir=` accepts `asc` or `desc`. Anything else means that sort's natural direction: `startedAt` → `desc` (newest first), `service` → `asc`.
- `?env=` accepts `production` or `staging`. Anything else means `all`.
- Clicking a header behaves as the kit (and Services) does: the active column flips, and any other column starts ascending.
- With `env=all` and no deploys at all, the empty state reads "No deploys". With a chosen env it reads "No deploys in <env>".
- The Started column shows `formatTimestamp(startedAt)` (e.g. "2026-10-01 09:05 UTC") but sorts on the raw ISO string. The snapshot time under the header is shown the same way: "Snapshot 2026-10-01 09:30 UTC".

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

// Deliberately not in any sorted order, so every ordering below is the page's doing.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-1', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-3', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-0', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-09-30T16:05:00Z', finishedAt: '2026-09-30T16:26:00Z', author: 'marco' },
    { id: 'd-2', service: 'api-gateway', version: '3.14.2', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'dana' },
  ],
};

// Services in row order. Each row starts with its Service cell.
const order = (html) => [...html.matchAll(/<tr><td>([^<]+)<\/td>/g)].map((m) => m[1]);

test('shows the title and the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01 09:30 UTC<\/p>/);
});

test('lists deploys newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.deepEqual(order(html), ['search', 'api-gateway', 'billing', 'notifications']);
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
  assert.match(html, /<th>Version<\/th><th>Environment<\/th><th>Status<\/th>/);
  assert.match(html, /<th>Duration<\/th><th>Author<\/th>/);
  assert.match(html, /<td>2026-10-01 09:05 UTC<\/td>/);
});

test('sorts by service and by start time both ways, keeping the sort in the filter form', () => {
  const byName = renderDeploys(snapshot, { sort: 'service' });
  assert.deepEqual(order(byName), ['api-gateway', 'billing', 'notifications', 'search']);
  assert.match(byName, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  assert.match(byName, /<input type="hidden" name="sort" value="service">/);
  assert.match(byName, /<input type="hidden" name="dir" value="asc">/);

  const byNameDesc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.deepEqual(order(byNameDesc), ['search', 'notifications', 'billing', 'api-gateway']);

  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.deepEqual(order(oldest), ['notifications', 'billing', 'api-gateway', 'search']);
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('shows how long each deploy took, or that it is still running', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>21m 0s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('filters by environment and keeps it when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.deepEqual(order(html), ['api-gateway', 'notifications']);
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /<option value="all">All environments<\/option>/);
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
});

test('names the environment when the filter matches no deploys', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);

  const none = renderDeploys({ ...snapshot, deploys: [] }, {});
  assert.match(none, /<p class="kit-empty__title">No deploys<\/p>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
  assert.deepEqual(order(html), ['search', 'api-gateway', 'billing', 'notifications']);

  const byName = renderDeploys(snapshot, { sort: 'service', dir: 'sideways' });
  assert.match(byName, /<input type="hidden" name="dir" value="asc">/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` (cannot find `src/pages/deploys.js`).

- [ ] **Step 3: Write the page module**

Create `src/pages/deploys.js`:

```js
import { badge } from '#kit/badge';
import { emptyState } from '#kit/empty';
import { filterBar } from '#kit/filter-bar';
import { pageHeader } from '#kit/page-header';
import { selectField } from '#kit/select';
import { dataTable } from '#kit/table';
import { esc } from '#kit/utils';
import { formatTimestamp } from '../core/format/timestamp.js';

// Recent deploys. Filter with ?env=production|staging; sort with
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, descending).
const ENVIRONMENTS = ['production', 'staging'];
// Each sort's direction when ?dir is missing or unknown.
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

  const deploys =
    env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

  const header = pageHeader({
    title: 'Deploys',
    subtitle: `Snapshot ${formatTimestamp(snapshot.generatedAt)}`,
  });

  // The bar keeps the sort; the header links keep the filter.
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
      {
        key: 'startedAt',
        label: 'Started',
        sortable: true,
        render: (d) => esc(formatTimestamp(d.startedAt)),
      },
      { key: 'duration', label: 'Duration', render: (d) => duration(d.startedAt, d.finishedAt) },
      { key: 'author', label: 'Author' },
    ],
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${header}
${filters}
${table}`;
}

// "4m 12s" from start to finish. A deploy with no finish time is still running.
function duration(startedAt, finishedAt) {
  if (!finishedAt) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 8 tests, 0 failures.

- [ ] **Step 5: Run the whole suite**

Run: `node --test`
Expected: PASS, with nothing else affected (the page is not routed yet).

- [ ] **Step 6: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys: render the page from the kit components"
```

---

### Task 2: Route, nav link and e2e fixtures

**Risk tier:** standard (multi-file integration touching the router, the shared layout and the e2e fixtures every nav page is crawled against)

**Files:**
- Modify: `src/server.js:17-18` (import), `src/server.js:45-46` (route)
- Modify: `src/layout.js:5-6` (nav entry)
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`
- Modify: `test/server.test.js`
- Modify: `README.md:15-17` (page list)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1).
- Produces: `GET /deploys` → 200 page titled "Deploys · Harbor", or a 503 "Snapshot unavailable" page when `deploys.json` can't be read. The nav link `<a href="/deploys">Deploys</a>` comes right after Services.

**Mirror:** `test/server.test.js:6-12` for the route test and `test/server.test.js:27-32` for the 503 test. `test/e2e/fixtures/{empty,single}/services.json` for the fixture shape.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, add `'/deploys'` to the `paths` list in `'serves every page in the nav'` right after `'/services'`, so the first line of the array reads:

```js
    '/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
```

Then add these two tests after `'renders the services page inside the layout'`:

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a>/);
  assert.match(res.body, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.doesNotMatch(res.body, /in-progress/);
});

test('answers 503 on the deploys page when its snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

(`data/deploys.json` has a rolled-back production deploy, `d-1040`, and its only in-progress deploy, `d-1042`, is in staging.)

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. The three tests touching `/deploys` fail with status `404 !== 200` / `404 !== 503`.

- [ ] **Step 3: Add the route and the nav link**

In `src/server.js`, add the import in alphabetical order between `renderDatabases` and `renderDomains`:

```js
import { renderDatabases } from './pages/databases.js';
import { renderDeploys } from './pages/deploys.js';
import { renderDomains } from './pages/domains.js';
```

and the route right after `/services` in `ROUTES`:

```js
  '/services': { title: 'Services', snapshot: 'services', render: renderServices },
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

In `src/layout.js`, add the nav entry right after Services:

```js
  { href: '/services', label: 'Services' },
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 4: Run the server tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS, 7 tests, 0 failures.

- [ ] **Step 5: Run the whole suite and watch the e2e crawl fail**

Run: `node --test`
Expected: FAIL in `test/e2e/empty.test.js` and `test/e2e/single.test.js` with `503 !== 200` for `/deploys`, because their fixture directories have no `deploys.json`. Every other test passes (`missing`, `navigation`, `queries` and `titles` pick up `/deploys` and pass).

- [ ] **Step 6: Add the e2e fixtures**

Create `test/e2e/fixtures/empty/deploys.json`:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [

  ]
}
```

Create `test/e2e/fixtures/single/deploys.json`:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [
    { "id": "d-1041", "service": "notifications", "version": "0.9.4", "environment": "production", "status": "succeeded", "startedAt": "2026-10-01T08:50:00Z", "finishedAt": "2026-10-01T08:54:12Z", "author": "marco" }
  ]
}
```

- [ ] **Step 7: Run the whole suite to verify it passes**

Run: `node --test`
Expected: PASS, 0 failures. The count should be 380 before this plan, plus 8 from Task 1 and 2 new server tests, for 390.

- [ ] **Step 8: Mention the page in the README**

In `README.md`, change the page list sentence from

```
One module per page in `src/pages/`: Overview, Services, Incidents, On-call
and Runbooks, then the estate pages from Alerts to Webhooks.
```

to

```
One module per page in `src/pages/`: Overview, Services, Deploys, Incidents,
On-call and Runbooks, then the estate pages from Alerts to Webhooks.
```

- [ ] **Step 9: Check the page in a browser**

Run: `npm start`, open `http://localhost:3000/deploys`, and confirm:
- "Deploys" is highlighted in the nav after "Services".
- Choosing "staging" reloads with `?env=staging&sort=startedAt&dir=desc`.
- Clicking "Service" keeps `env=staging`.
- The chips are green, red, amber and blue.

Stop the server.

- [ ] **Step 10: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json README.md
git commit -m "Deploys: route the page and link it from the nav"
```
