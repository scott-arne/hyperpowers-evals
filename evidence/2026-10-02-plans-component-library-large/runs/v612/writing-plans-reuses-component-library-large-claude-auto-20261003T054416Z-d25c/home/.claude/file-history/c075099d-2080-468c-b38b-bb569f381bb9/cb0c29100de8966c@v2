# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** Add a read-only `/deploys` page that lists the last 50 deploys from `data/deploys.json`, with an environment filter, sortable Service/Started columns, colored status chips and a duration column.

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)` with the same signature as every other page. It is built from the vendored component kit (`vendor/kit`, imported as `#kit/*`). The kit already has every piece the page needs: `pageHeader`, `filterBar` + `selectField`, `dataTable` (it sorts and builds the sort links), `badge` and `emptyState`. The page itself only handles query parsing, the filter, the status-to-tone map and the duration format. `src/server.js` routes `/deploys` to it, and `src/layout.js` adds the nav link after "Services".

**Tech Stack:** Node ≥ 20, ES modules, no dependencies, `node --test` with `node:assert/strict`. Vendored kit at `vendor/kit/*/src/index.js`, mapped through `package.json` `"imports": { "#kit/*": ... }`.

## Global Constraints

- Route `/deploys`; nav label "Deploys", placed directly after "Services" in the nav.
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Data: `data/deploys.json` → `{ generatedAt, deploys: [{ id, service, version, environment, status, startedAt, finishedAt, author }] }`. `status` ∈ `succeeded | failed | rolled-back | in-progress`. `finishedAt` is null while a deploy is in progress.
- Header: "Deploys", with the snapshot time under it.
- Environment filter: a dropdown with "All environments" (the default), "production" and "staging". Choosing one reloads the page with `?env=`, keeping the current sort.
- Table columns, in this order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Service and Started can be sorted both ways through `?sort=` and `?dir=`. Changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue. These map to kit badge tones `ok`, `bad`, `warn` and `info` (`public/kit.css`: `--kit-ok #1a7f37`, `--kit-bad #cf222e`, `--kit-warn #9a6700`, `--kit-info #0969da`).
- Duration: `finishedAt` minus `startedAt` in minutes and seconds, such as "4m 12s". An in-progress deploy shows "running".
- Empty: when the filter matches no deploys, show "No deploys in staging" (naming the chosen environment) in place of the table.
- Errors: a missing or unreadable `deploys.json` gets the same 503 "Snapshot unavailable" page as the other pages (this already happens in `src/server.js` `handle()`; no new error code). An unknown `env`, `sort` or `dir` value falls back to the default.
- Testing: `node --test`. Rendering tests for the filter, both sorts, the chips, the duration format, the empty state and the fallback for unknown query values. A server test for the route and its 503.
- Reuse the kit components and the existing core helpers (`formatTimestamp`, `buildQuery`, `parseIso`). Do not hand-roll table, select, badge or header markup, and do not add new CSS. The kit classes are already styled in `public/kit.css`.

### Decisions this plan makes where the spec is silent

- **Default `dir` per sort.** `startedAt` defaults to `desc` (newest first, as the spec requires). `service` defaults to `asc`. An unknown `dir` falls back to the default for the chosen sort. As on Services (via the kit's `dataTable`), clicking the active column flips its direction and clicking an inactive column starts ascending.
- **Ties on Service** keep snapshot order. The kit's sort is stable, so deploys of the same service appear in the order they arrive.
- **Times** (snapshot time and Started) are shown through `formatTimestamp` as `2026-10-01 09:05 UTC`, the repo's UTC display helper. Sorting still compares the raw ISO strings.
- **Empty with "All environments"** (an empty snapshot) says "No deploys".
- **Unknown `status`** (not one of the four) renders a muted chip. That is the kit badge's default tone.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/pages/deploys.js` | Create | `renderDeploys(snapshot, query)`: parses the query, filters, and composes the kit components; local `duration()` helper |
| `test/pages/deploys.test.js` | Create | Rendering tests for the page |
| `src/server.js` | Modify (import block lines 9–38; `ROUTES` line 45) | Route `/deploys` → `renderDeploys` with snapshot `deploys` |
| `src/layout.js` | Modify (`NAV` line 5) | "Deploys" nav link after "Services" |
| `test/server.test.js` | Modify | Route test, 503 test, `/deploys` in the every-page list |
| `test/e2e/fixtures/empty/deploys.json` | Create | Empty snapshot, needed because `test/e2e/empty.test.js` walks every nav link |
| `test/e2e/fixtures/single/deploys.json` | Create | One-row snapshot, needed because `test/e2e/single.test.js` walks every nav link |
| `README.md` | Modify (Pages paragraph) | List Deploys among the pages |

---

### Task 1: Deploys page renderer

**Risk tier:** standard — new page module that composes several kit components. Two files, but the code is fully specified here.

**Files:**
- Create: `src/pages/deploys.js`
- Test: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing, do not modify):
  - `pageHeader({ title, subtitle?, actions? }) → string` from `#kit/page-header`. Escapes `subtitle` and renders it as `<p class="kit-muted">…</p>`.
  - `filterBar({ action, fields: string[], keep?: Record<string,string> }) → string` from `#kit/filter-bar`. Renders `keep` entries as hidden inputs: `<input type="hidden" name="sort" value="…">`.
  - `selectField({ name, label, options: {value,label}[], value }) → string` from `#kit/select`. Marks the matching option `selected` and carries `data-autosubmit`, which `public/kit.js` uses to submit the form on change.
  - `dataTable({ columns, rows, sort?: {key, dir}, sortHref?: (key, dir) => string, empty?: string }) → string` from `#kit/table`. Returns `empty` when `rows` is empty. Sorts by `sort` with a stable sort comparing `col.value ?? row[key]`. Renders a sortable header as `<th aria-sort="…"><a href="ESCAPED_HREF">Label ▲</a></th>` (the active column flips direction; others start at `asc`). Cells are `col.render(row)` (trusted HTML) or the escaped `row[key]`.
  - `badge(label, tone = 'muted') → string` from `#kit/badge`: `<span class="kit-badge kit-badge--TONE">label</span>`.
  - `emptyState({ title, body? }) → string` from `#kit/empty`: `<div class="kit-empty"><p class="kit-empty__title">title</p></div>`.
  - `formatTimestamp(iso) → string` from `src/core/format/timestamp.js` (`'2026-10-01 09:05 UTC'`, or `''` if invalid).
  - `buildQuery(params) → string` from `src/core/http/query-string.js` (`'?env=all&sort=service&dir=asc'`).
  - `parseIso(text) → number | null` from `src/core/time/parse-iso.js`.
  - `escapeHtml(value) → string` from `src/html.js`.
- Produces: `export function renderDeploys(snapshot, query) → string` (HTML body; `query` is a plain object of query-string values). Task 2 imports it.

- [ ] **Step 1: Write the failing tests**

Create `test/pages/deploys.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

// Out of order on purpose, so the default sort is doing the work.
const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-1038', service: 'billing', version: '2.9.0-rc.3', environment: 'staging', status: 'failed', startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:47:30Z', author: 'sam' },
    { id: 'd-1042', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1030', service: 'notifications', version: '0.9.3', environment: 'production', status: 'rolled-back', startedAt: '2026-09-30T08:10:00Z', finishedAt: '2026-09-30T08:31:40Z', author: 'marco' },
    { id: 'd-1041', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
  ],
};

const before = (html, a, b) => {
  assert.ok(html.includes(a), `missing ${a}`);
  assert.ok(html.includes(b), `missing ${b}`);
  assert.ok(html.indexOf(a) < html.indexOf(b), `${a} should come before ${b}`);
};

test('shows the title and the snapshot time', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<h1>Deploys<\/h1>/);
  assert.match(html, /<p class="kit-muted">Snapshot 2026-10-01 09:30 UTC<\/p>/);
});

test('lists deploys newest first by default, with every column', () => {
  const html = renderDeploys(snapshot, {});
  before(html, '<td>1.23.0-rc.1</td>', '<td>0.9.4</td>');
  before(html, '<td>0.9.4</td>', '<td>2.9.0-rc.3</td>');
  before(html, '<td>2.9.0-rc.3</td>', '<td>0.9.3</td>');
  assert.match(
    html,
    /<thead><tr><th><a href="\?env=all&amp;sort=service&amp;dir=asc">Service<\/a><\/th><th>Version<\/th><th>Environment<\/th><th>Status<\/th><th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th><th>Duration<\/th><th>Author<\/th><\/tr><\/thead>/,
  );
  assert.match(html, /<tr><td>search<\/td><td>1\.23\.0-rc\.1<\/td><td>staging<\/td><td><span class="kit-badge kit-badge--info">in-progress<\/span><\/td><td>2026-10-01 09:05 UTC<\/td><td>running<\/td><td>priya<\/td><\/tr>/);
});

test('sorts by service both ways and keeps the sort in the filter form', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  before(asc, '<td>billing</td>', '<td>notifications</td>');
  before(asc, '<td>notifications</td>', '<td>search</td>');
  assert.match(asc, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  assert.match(asc, /<input type="hidden" name="sort" value="service">/);
  assert.match(asc, /<input type="hidden" name="dir" value="asc">/);

  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  before(desc, '<td>search</td>', '<td>notifications</td>');
  before(desc, '<td>notifications</td>', '<td>billing</td>');
  assert.match(desc, /<th aria-sort="descending"><a href="\?env=all&amp;sort=service&amp;dir=asc">Service ▼<\/a><\/th>/);
});

test('sorts by start time oldest first when asked', () => {
  const html = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  before(html, '<td>0.9.3</td>', '<td>2.9.0-rc.3</td>');
  before(html, '<td>0.9.4</td>', '<td>1.23.0-rc.1</td>');
  assert.match(html, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
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
  assert.match(html, /<td>2m 30s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
  const quick = renderDeploys(
    { generatedAt: snapshot.generatedAt, deploys: [{ ...snapshot.deploys[0], startedAt: '2026-10-01T06:45:00Z', finishedAt: '2026-10-01T06:45:45Z' }] },
    {},
  );
  assert.match(quick, /<td>0m 45s<\/td>/);
});

test('filters by environment and keeps the filter in the sort links', () => {
  const html = renderDeploys(snapshot, { env: 'production' });
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /<option value="production" selected>production<\/option>/);
  assert.match(html, /<td>0\.9\.4<\/td>/);
  assert.doesNotMatch(html, /<td>search<\/td>/);
  assert.doesNotMatch(html, /<td>billing<\/td>/);
  assert.match(html, /href="\?env=production&amp;sort=service&amp;dir=asc"/);
});

test('offers all environments by default', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<option value="all" selected>All environments<\/option><option value="production">production<\/option><option value="staging">staging<\/option>/);
});

test('names the environment when the filter matches nothing', () => {
  const productionOnly = { generatedAt: snapshot.generatedAt, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  const none = renderDeploys({ generatedAt: snapshot.generatedAt, deploys: [] }, {});
  assert.match(none, /<p class="kit-empty__title">No deploys<\/p>/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt">/);
  assert.match(html, /<input type="hidden" name="dir" value="desc">/);
  before(html, '<td>1.23.0-rc.1</td>', '<td>0.9.3</td>');
  const service = renderDeploys(snapshot, { sort: 'service', dir: 'sideways' });
  assert.match(service, /<input type="hidden" name="dir" value="asc">/);
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
import { formatTimestamp } from '../core/format/timestamp.js';
import { buildQuery } from '../core/http/query-string.js';
import { parseIso } from '../core/time/parse-iso.js';
import { escapeHtml } from '../html.js';

// Recent deploys. Filter with ?env=production|staging; sort with
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, newest first).
const ENVIRONMENTS = ['production', 'staging'];
const DEFAULT_DIR = { service: 'asc', startedAt: 'desc' };
const TONES = { succeeded: 'ok', failed: 'bad', 'rolled-back': 'warn', 'in-progress': 'info' };

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = Object.hasOwn(DEFAULT_DIR, query.sort ?? '') ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : DEFAULT_DIR[sort];

  const deploys =
    env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

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
        value: env,
        options: [
          { value: 'all', label: 'All environments' },
          ...ENVIRONMENTS.map((e) => ({ value: e, label: e })),
        ],
      }),
    ],
    keep: { sort, dir },
  });

  // The sort links carry the filter, and the filter form carries the sort.
  const table = dataTable({
    columns: [
      { key: 'service', label: 'Service', sortable: true },
      { key: 'version', label: 'Version' },
      { key: 'environment', label: 'Environment' },
      { key: 'status', label: 'Status', render: (d) => badge(d.status, TONES[d.status]) },
      {
        key: 'startedAt',
        label: 'Started',
        sortable: true,
        render: (d) => escapeHtml(formatTimestamp(d.startedAt)),
      },
      { key: 'duration', label: 'Duration', render: duration },
      { key: 'author', label: 'Author' },
    ],
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => buildQuery({ env, sort: key, dir: next }),
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${header}
${filters}
${table}`;
}

// finishedAt minus startedAt as "4m 12s". finishedAt is null while the
// deploy is still in progress.
function duration(deploy) {
  if (deploy.finishedAt === null) return 'running';
  const start = parseIso(deploy.startedAt);
  const end = parseIso(deploy.finishedAt);
  if (start === null || end === null) return '';
  const seconds = Math.round((end - start) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/pages/deploys.test.js`
Expected: PASS, 10 tests, 0 failures.

- [ ] **Step 5: Run the full suite**

Run: `node --test`
Expected: PASS. 390 tests (the 380 baseline plus these 10), 0 failures. The page is not routed yet, so no other test can see it.

- [ ] **Step 6: Commit**

```bash
git add src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Deploys: render the deploys list from the kit components"
```

---

### Task 2: Route, nav link and fixtures

**Risk tier:** standard — integration across the server, layout, e2e fixtures and README.

**Files:**
- Modify: `src/server.js` (add the import alphabetically between `renderDatabases` line 17 and `renderDomains` line 18; add the route after `'/services'` on line 45)
- Modify: `src/layout.js` (add the nav entry after `{ href: '/services', label: 'Services' }` on line 5)
- Modify: `test/server.test.js`
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`
- Modify: `README.md` (Pages paragraph)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query) → string` from `src/pages/deploys.js` (Task 1). `readSnapshot('deploys', dataDir)` via the existing `handle()` in `src/server.js`.
- Produces: `GET /deploys` → 200 HTML page titled "Deploys · Harbor" with the nav link marked current. If the snapshot cannot be read → 503 with "Snapshot unavailable".

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, add these two tests after the existing `'renders the services page inside the layout'` test (after line 12):

```js
test('renders the deploys page inside the layout, after Services in the nav', async () => {
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

In the same file, in `'serves every page in the nav'`, add `'/deploys'` after `'/services'` so the first line of the `paths` array reads:

```js
    '/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
```

(`0.9.4` is the production deploy `d-1041` and `1.23.0-rc.1` is the staging deploy `d-1042` in the committed `data/deploys.json`.)

- [ ] **Step 2: Run the server tests to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL. The two new tests and `'serves every page in the nav'` fail because `/deploys` answers 404 (`404 !== 200` and `404 !== 503`).

- [ ] **Step 3: Add the route and the nav link**

In `src/server.js`, add the import between the `renderDatabases` and `renderDomains` imports:

```js
import { renderDeploys } from './pages/deploys.js';
```

and add the route directly after the `'/services'` entry in `ROUTES`:

```js
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

In `src/layout.js`, add the nav entry directly after the Services entry in `NAV`:

```js
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 4: Run the server tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS, 7 tests, 0 failures.

- [ ] **Step 5: Run the full suite and watch the e2e fixtures fail**

Run: `node --test`
Expected: FAIL in `test/e2e/empty.test.js` and `test/e2e/single.test.js` only, with `/deploys` reported as `503 !== 200`. Those suites walk every nav link against `test/e2e/fixtures/{empty,single}/`, and neither directory has a `deploys.json` yet. Everything else passes, including `navigation`, `titles`, `queries` and `missing`.

- [ ] **Step 6: Add the e2e fixtures**

Create `test/e2e/fixtures/empty/deploys.json` (same shape as the sibling `services.json`):

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [

  ]
}
```

Create `test/e2e/fixtures/single/deploys.json`. The one row is in progress so the `null` `finishedAt` path goes through the `undefined|NaN` check:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [
    { "id": "d-1042", "service": "search", "version": "1.23.0-rc.1", "environment": "staging", "status": "in-progress", "startedAt": "2026-10-01T09:05:00Z", "finishedAt": null, "author": "priya" }
  ]
}
```

- [ ] **Step 7: Run the full suite to verify everything passes**

Run: `node --test`
Expected: PASS. 392 tests (390 after Task 1 plus the 2 new server tests), 0 failures.

- [ ] **Step 8: Update the README**

In `README.md`, in the "Pages" section, change:

```
One module per page in `src/pages/`: Overview, Services, Incidents, On-call
and Runbooks, then the estate pages from Alerts to Webhooks.
```

to:

```
One module per page in `src/pages/`: Overview, Services, Deploys, Incidents,
On-call and Runbooks, then the estate pages from Alerts to Webhooks.
```

- [ ] **Step 9: Check the page by hand**

Run: `npm start`, then open `http://localhost:3000/deploys`.
Expected: "Deploys" is in the nav after "Services" and marked current. The table shows the newest deploy first, with green, red, amber and blue chips. Choosing "staging" in the dropdown reloads with `?env=staging&sort=startedAt&dir=desc`. Clicking "Service" keeps `env=staging`. Stop the server with Ctrl-C.

- [ ] **Step 10: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json README.md
git commit -m "Deploys: route the page and link it from the nav"
```
