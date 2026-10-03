# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists the recent deploys from `data/deploys.json`, so whoever is on call can spot a failed or rolled-back deploy without opening the pipeline.

**Architecture:** A new page module `src/pages/deploys.js` exports `renderDeploys(snapshot, query)`. Like every other page it is a pure function from snapshot plus query to an HTML string. It is built from the vendored Keel kit components (`#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge`, `#kit/empty`). The kit already does sorting, sort links, the filter form with kept query state, status chips and the empty state, so the page only maps deploy data onto those components. `src/server.js` gets the route, `src/layout.js` gets the nav link, and the e2e fixture directories get a `deploys.json` each, because the e2e suite walks every nav link.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node:test` + `node:assert/strict`, server-rendered HTML strings.

## Global Constraints

- No new dependencies; Node 20 or later (`package.json` `engines.node: ">=20"`).
- Tests run with `node --test` (`npm test` / `just test`). The whole suite must stay green; it is 380 passing tests before this work.
- Route `/deploys`, page title and nav label "Deploys", nav link placed directly after "Services".
- Read-only. Out of scope: a deploy details page, pagination (the snapshot keeps the last 50), live refresh, any action on a deploy.
- Filter dropdown options, exactly: "All environments" (default), "production", "staging". Choosing one reloads with `?env=` and keeps the current sort.
- Columns, in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default. Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s"; an in-progress deploy shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json` → the shared 503 "Snapshot unavailable" page. Unknown `env`, `sort` or `dir` → that parameter's default.

## Grounding

- Page module shape (pure `renderX(snapshot, query)`, query-param fallbacks, header comment documenting the params): `src/pages/services.js:5-21`.
- Sort/filter behavior the spec says to match (active column flips direction, other columns start ascending, links carry the filter, the form carries the sort): `src/pages/services.js:30-38` and `src/pages/services.js:88-94`. The kit reproduces this in `vendor/kit/table/src/lib/table.js:46-56` and `vendor/kit/filter-bar/src/lib/filter-bar.js:15-21`.
- Kit components the page reuses (imports go through the `#kit/*` alias in `package.json` `imports`, as in `src/pages/services.js:1-2`):
  - `dataTable({columns, rows, sort, sortHref, empty})`: `vendor/kit/table/src/lib/table.js:3-44`
  - `badge(label, tone)`, where tones `ok|warn|bad|info|muted` map to green/amber/red/blue/grey in `public/kit.css:2,19-24`: `vendor/kit/badge/src/lib/badge.js:5-15`
  - `selectField({name, label, options, value})`: `vendor/kit/select/src/lib/select.js:3-21`
  - `filterBar({action, fields, keep})`: `vendor/kit/filter-bar/src/lib/filter-bar.js:3-21`. Auto-submit on change is in `public/kit.js:8-9`.
  - `pageHeader({title, subtitle})`: `vendor/kit/page-header/src/lib/page-header.js:3-14`
  - `emptyState({title})`: `vendor/kit/empty/src/lib/empty.js:3-12`
  - `esc(value)`: `vendor/kit/utils/src/lib/utils.js:1-9`
- Timestamp display: `formatTimestamp(iso)` → `"2026-10-01 09:30 UTC"`, `src/core/format/timestamp.js:1-7`, tested in `test/core/timestamp.test.js:5-7`.
- Duration formatting: `none`. No existing helper formats an elapsed time; the page gets a small local `formatDuration`.
- Routing and the 503 path: `src/server.js:43-45` (ROUTES entry shape), `src/server.js:83-92` (snapshot read failure → 503 "Snapshot unavailable"). The page needs no error handling of its own.
- Nav: `src/layout.js:3-6` (NAV entry shape and Services position).
- Page test shape (inline snapshot const, one `test()` per behavior, regex/`indexOf` assertions on the HTML string): `test/pages/services.test.js:1-47`.
- Server test shape (`handle(path, { dataDir })`, status + body assertions, 503 via a missing `dataDir`): `test/server.test.js:6-32`.
- E2E fixtures that every nav link is rendered against: `test/e2e/fixtures/empty/services.json` and `test/e2e/fixtures/single/services.json`, consumed by `test/e2e/empty.test.js:9-16` and `test/e2e/single.test.js:9-16` (they also assert no `undefined`/`NaN` in the body).
- Snapshot schema (`finishedAt` is `timestamp?`, nullable): `src/shared/schemas/deploys.js:5-14`. Real data: `data/deploys.json`.
- Commit message style: sentence-case imperative ("Add the dashboard pages", "Pipeline: add the deploys snapshot"), from `git log`.

## Decisions the spec leaves open

These are the plan's choices. Each is pinned by a test so a reviewer can overrule it in one place.

1. **Kit markup instead of the Services page's hand-built markup.** The spec asks for the same *behavior* as Services. The page gets it from the kit (`kit-table`, `kit-badge`, `kit-filter-bar`) rather than copying Services' bespoke HTML. `public/app.css` has no blue `.pill`, and the kit badge's `info` tone supplies the blue in-progress chip. Services itself is not touched.
2. **Timestamps are shown with `formatTimestamp`.** That covers the Started cell and the snapshot time under the header ("2026-10-01 09:05 UTC"); sorting still compares the raw ISO `startedAt`.
3. **Default sort is `startedAt` descending**, so an unknown `dir` falls back to `desc`, the page default. Header links always carry an explicit `dir`, so only hand-edited URLs reach this fallback.
4. **Empty with "All environments" selected** (an empty snapshot) says "No deploys". The spec only defines the filtered wording.
5. **Duration under a minute** renders as "0m 45s", keeping the spec's "minutes and seconds" format throughout.

---

### Task 1: Deploys page renderer

**Risk tier:** standard — a new module with several spec behaviors (filter, two sorts, chips, duration, empty, fallbacks) built on six kit components.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes: kit components exactly as listed in Grounding; `formatTimestamp(iso: string): string` from `src/core/format/timestamp.js`.
- Produces: `export function renderDeploys(snapshot: {generatedAt: string, deploys: Deploy[]}, query: Record<string, string>): string`, where `Deploy` is `{id, service, version, environment, status, startedAt, finishedAt: string|null, author}`. Task 2 imports it as `import { renderDeploys } from './pages/deploys.js';`.

**Mirror:** `src/pages/services.js:5-21` for the header comment and the query fallback idiom; `test/pages/services.test.js` for test shape.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-4', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-3', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-2', service: 'api-gateway', version: '3.15.0', environment: 'production', status: 'failed', startedAt: '2026-09-30T16:05:00Z', finishedAt: '2026-09-30T16:05:45Z', author: 'lena' },
    { id: 'd-1', service: 'billing', version: '2.8.1', environment: 'production', status: 'rolled-back', startedAt: '2026-09-30T12:00:00Z', finishedAt: '2026-09-30T12:21:40Z', author: 'sam' },
  ],
};

// Row order, read from the Service cells.
const order = (html) => [...html.matchAll(/<tr><td>([^<]+)<\/td>/g)].map((m) => m[1]);

test('shows the title, the snapshot time and the columns in order', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1>/);
  assert.match(html, /<p class="kit-muted">Snapshot 2026-10-01 09:30 UTC<\/p>/);
  const headers = [...html.matchAll(/<th[^>]*>(?:<a [^>]+>)?([A-Za-z]+)/g)].map((m) => m[1]);
  assert.deepEqual(headers, ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
  assert.match(html, /<td>2026-10-01 09:05 UTC<\/td>/);
});

test('lists newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.deepEqual(order(html), ['search', 'notifications', 'api-gateway', 'billing']);
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th>/);
});

test('sorts by start time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  assert.deepEqual(order(oldest), ['billing', 'api-gateway', 'notifications', 'search']);
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sorts by service both ways and keeps the sort in the filter form', () => {
  const az = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  assert.deepEqual(order(az), ['api-gateway', 'billing', 'notifications', 'search']);
  assert.match(az, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  assert.match(az, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="asc">/);
  const za = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.deepEqual(order(za), ['search', 'notifications', 'billing', 'api-gateway']);
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
  assert.match(html, /<td>0m 45s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('filters by environment and keeps it when sorting', () => {
  const html = renderDeploys(snapshot, { env: 'production', sort: 'service', dir: 'asc' });
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.deepEqual(order(html), ['api-gateway', 'billing', 'notifications']);
  assert.match(html, /href="\?env=production&amp;sort=startedAt&amp;dir=asc"/);
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
});

test('names the environment when the filter matches nothing', () => {
  const production = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(production, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(renderDeploys({ ...snapshot, deploys: [] }, {}), /<p class="kit-empty__title">No deploys<\/p>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>All environments<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  assert.deepEqual(order(html), ['search', 'notifications', 'api-gateway', 'billing']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` (cannot find `src/pages/deploys.js`).

- [ ] **Step 3: Write the implementation**

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
const SORTS = ['service', 'startedAt'];
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = SORTS.includes(query.sort) ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : 'desc';

  let deploys = snapshot.deploys;
  if (env !== 'all') deploys = deploys.filter((d) => d.environment === env);

  const header = pageHeader({
    title: 'Deploys',
    subtitle: `Snapshot ${formatTimestamp(snapshot.generatedAt)}`,
  });

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

  // dataTable sorts the rows and builds the header links; the links carry the
  // filter so sorting keeps it.
  const table = dataTable({
    columns: [
      { key: 'service', label: 'Service', sortable: true },
      { key: 'version', label: 'Version' },
      { key: 'environment', label: 'Environment' },
      { key: 'status', label: 'Status', render: (d) => badge(d.status, TONES[d.status]) },
      { key: 'startedAt', label: 'Started', sortable: true, render: (d) => esc(formatTimestamp(d.startedAt)) },
      { key: 'duration', label: 'Duration', render: formatDuration },
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

// "4m 12s" from start to finish. finishedAt stays null while a deploy runs.
function formatDuration({ startedAt, finishedAt }) {
  if (!finishedAt) return 'running';
  const seconds = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 9 tests.

- [ ] **Step 5: Run the whole suite**

Run: `node --test`
Expected: PASS, 389 tests (380 + 9), 0 fail. The page is not routed yet, so no other test changes.

- [ ] **Step 6: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the Deploys page renderer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Route `/deploys` and link it in the nav

**Risk tier:** standard — integration across the server, layout, README and the e2e fixtures that every nav link is checked against.

**Files:**
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`
- Modify: `src/server.js:32` (import) and `src/server.js:45` (ROUTES)
- Modify: `src/layout.js:5` (NAV)
- Modify: `README.md` (Pages paragraph)
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from Task 1 (`src/pages/deploys.js`).
- Produces: route `/deploys` → `{ title: 'Deploys', snapshot: 'deploys', render: renderDeploys }` and nav entry `{ href: '/deploys', label: 'Deploys' }`. Nothing later depends on these.

**Mirror:** `src/server.js:45` and `src/layout.js:5` (the Services entries); `test/server.test.js:6-12` and `:27-32` for the route and 503 tests; `test/e2e/fixtures/{empty,single}/services.json` for the fixture shape.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, add after the existing `'renders the services page inside the layout'` test (after line 12):

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<td>notifications<\/td>/);
  assert.doesNotMatch(res.body, /<td>staging<\/td>/);
});
```

In the `'serves every page in the nav'` test, change the first line of `paths` from

```js
    '/', '/services', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
```

to

```js
    '/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
```

After the existing `'answers 503 when the snapshot cannot be read'` test, add:

```js
test('answers 503 on the deploys page when its snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. The three touched tests fail because `/deploys` answers 404 (`404 !== 200`, `404 !== 503`).

- [ ] **Step 3: Add the e2e fixtures**

The e2e suite renders every nav link against `test/e2e/fixtures/empty/` and `test/e2e/fixtures/single/`. Without these files the new nav link answers 503 there and those tests fail.

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

- [ ] **Step 4: Add the route**

In `src/server.js`, add the import in alphabetical position, between `renderDatabases` (line 17) and `renderDomains` (line 18):

```js
import { renderDeploys } from './pages/deploys.js';
```

In `ROUTES`, add directly after the `/services` entry:

```js
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

- [ ] **Step 5: Add the nav link**

In `src/layout.js` `NAV`, add directly after `{ href: '/services', label: 'Services' },`:

```js
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 6: Mention the page in the README**

In `README.md`, under `## Pages`, change

```
One module per page in `src/pages/`: Overview, Services, Incidents, On-call
and Runbooks, then the estate pages from Alerts to Webhooks.
```

to

```
One module per page in `src/pages/`: Overview, Services, Deploys, Incidents,
On-call and Runbooks, then the estate pages from Alerts to Webhooks.
```

- [ ] **Step 7: Run the server tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS, 7 tests.

- [ ] **Step 8: Run the whole suite**

Run: `node --test`
Expected: PASS, 391 tests (389 + 2 new server tests), 0 fail. The e2e tests (`navigation`, `titles`, `queries`, `empty`, `single`, `missing`) now cover `/deploys` through the nav and must all pass.

- [ ] **Step 9: Check it in the browser**

Run: `npm start`, then open `http://localhost:3000/deploys`.
Expected: "Deploys" is highlighted in the nav after "Services". The table is newest first, with the search deploy on top showing a blue "in-progress" chip and "running". Choosing "staging" reloads to `?env=staging&sort=startedAt&dir=desc`. Clicking "Service" keeps `env=staging`. Stop the server afterwards.

- [ ] **Step 10: Commit**

```bash
git add src/server.js src/layout.js README.md test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json
git commit -m "Route /deploys and link it in the nav

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
