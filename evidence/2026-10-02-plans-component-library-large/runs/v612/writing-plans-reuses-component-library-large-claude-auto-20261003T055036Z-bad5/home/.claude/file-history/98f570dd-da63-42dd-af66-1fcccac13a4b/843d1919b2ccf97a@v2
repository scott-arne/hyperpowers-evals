# Deploys Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`

**Goal:** A read-only `/deploys` page listing the deploys from `data/deploys.json`, filterable by environment and sortable by service or start time, with a "Deploys" nav link after "Services".

**Architecture:** One new page module, `src/pages/deploys.js`, exporting `renderDeploys(snapshot, query)` like every other page. It is assembled from the vendored component kit (`#kit/page-header`, `#kit/filter-bar`, `#kit/select`, `#kit/table`, `#kit/badge`, `#kit/empty`) instead of hand-rolled HTML: `dataTable` already does the sorting, the sort-header links with arrows and `aria-sort`, and the empty fallback, and `filterBar` + `selectField` already do the auto-submitting env dropdown that keeps the sort in hidden inputs. The page itself only owns query validation, the env filter, the status→tone mapping and the duration text. A small `formatDuration` helper joins the existing formatters in `src/core/format/`. `src/server.js` and `src/layout.js` get one entry each.

**Tech Stack:** Node ≥ 20, ES modules, no dependencies; tests with `node --test` and `node:assert/strict`.

## Global Constraints

- Route `/deploys`; nav label "Deploys", placed directly after "Services". Page title "Deploys".
- Read-only. No details page, no pagination, no live refresh, no actions on a deploy.
- Data comes from `data/deploys.json` (`generatedAt`, `deploys[]` with `id`, `service`, `version`, `environment`, `status`, `startedAt`, `finishedAt`, `author`). `status` ∈ `succeeded`, `failed`, `rolled-back`, `in-progress`; `finishedAt` is null while in progress.
- Header "Deploys" with the snapshot time under it.
- Environment dropdown options: "All environments" (default), "production", "staging". Choosing one reloads with `?env=`, keeping the current sort.
- Columns in order: Service, Version, Environment, Status, Started, Duration, Author. Newest first by default.
- Service and Started sortable both ways via `?sort=` and `?dir=`; changing the sort keeps the filter.
- Status chip colors: succeeded green, failed red, rolled-back amber, in-progress blue.
- Duration: `finishedAt − startedAt` as minutes and seconds, e.g. "4m 12s"; in-progress shows "running".
- Empty filter result: "No deploys in staging" (naming the chosen environment) in place of the table.
- Missing/unreadable `deploys.json` → the shared 503 "Snapshot unavailable" page. Unknown `env`, `sort` or `dir` → fall back to the default.
- Tests run with `node --test`; no new dependencies.

## Decisions the spec leaves open

These are locked in by this plan; call them out at review if you disagree.

- **Reuse the kit, not the Services markup.** The spec says sorting and filtering *behave* as on Services. `src/pages/services.js` predates the kit's table/filter components and hand-rolls the same thing; the kit versions produce the same links, arrows, `aria-sort` and hidden inputs, so Deploys uses them. Services is not touched.
- **Chip colors** use `badge(label, tone)` with tones `ok` (green `#1a7f37`), `bad` (red), `warn` (amber), `info` (blue). The app's own `.pill-*` classes have no blue, so they can't satisfy the spec.
- **Default direction is per column.** `?sort=startedAt` with no/unknown `dir` → `desc` (newest first, the page default); `?sort=service` with no/unknown `dir` → `asc` (A→Z). The header links always carry an explicit `dir`, so this only matters for hand-edited URLs.
- **Empty with "All environments"** says "No deploys" (there is no environment to name).
- **Snapshot time** shows as `Snapshot 2026-10-01 09:30 UTC` via the existing `formatTimestamp`.
- **Started column** shows `formatTimestamp(startedAt)`; sorting compares the raw ISO string (which sorts chronologically).
- **Durations** always show both parts (`0m 45s`, `62m 3s`); seconds are rounded.

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/core/format/duration.js` | Create | `formatDuration(ms)` → `"4m 12s"` |
| `test/core/duration.test.js` | Create | Unit tests for `formatDuration` |
| `src/pages/deploys.js` | Create | `renderDeploys(snapshot, query)` |
| `test/pages/deploys.test.js` | Create | Rendering tests for the page |
| `src/server.js` | Modify (imports ~line 17, `ROUTES` line 45) | Route `/deploys` → `deploys` snapshot |
| `src/layout.js` | Modify (`NAV` line 5) | "Deploys" link after "Services" |
| `test/server.test.js` | Modify | Route test, 503 test, add to served paths |
| `test/e2e/fixtures/empty/deploys.json` | Create | Empty snapshot; required because `test/e2e/empty.test.js` walks every nav link |
| `test/e2e/fixtures/single/deploys.json` | Create | One-row snapshot; required by `test/e2e/single.test.js` |
| `README.md` | Modify (Pages section) | Mention Deploys in the page list |

---

### Task 1: Render the Deploys page

**Risk tier:** standard — new page module plus a new core helper, composed from several kit components; behavior carries most of the spec.

**Files:**
- Create: `src/core/format/duration.js`
- Create: `test/core/duration.test.js`
- Create: `src/pages/deploys.js`
- Create: `test/pages/deploys.test.js`

**Interfaces:**
- Consumes (existing, do not modify):
  - `formatTimestamp(iso: string): string` from `src/core/format/timestamp.js` — `'2026-10-01T09:30:42Z'` → `'2026-10-01 09:30 UTC'`, junk → `''`.
  - `pageHeader({ title, subtitle?, actions? }): string` from `#kit/page-header` — renders `<header class="kit-page-header"><div><h1>…</h1><p class="kit-muted">…</p></div></header>`.
  - `filterBar({ action, fields: string[], keep?: Record<string,string|undefined> }): string` from `#kit/filter-bar` — GET form; each `keep` entry becomes `<input type="hidden" name="k" value="v">`.
  - `selectField({ name, label, options: {value,label}[], value? }): string` from `#kit/select` — `<select … data-autosubmit>`; `public/kit.js` submits the form on change. Selected option renders as `<option value="x" selected>`.
  - `dataTable({ columns, rows, sort?: {key, dir}, sortHref?: (key, dir) => string, empty?: string }): string` from `#kit/table` — sorts `rows` by `sort` (comparing `col.value(row)` or `row[col.key]`, via `localeCompare` for strings; `Array#sort` is stable so ties keep snapshot order); sortable headers link to `sortHref(key, nextDir)` (escaped, so pass a raw `&`); active header gets ` ▲`/` ▼` and `aria-sort`; returns `empty` instead of a table when `rows` is empty. Cells are `<td>${col.render ? col.render(row) : esc(row[col.key])}</td>` with no whitespace between them.
  - `badge(label: string, tone?: 'ok'|'warn'|'bad'|'info'|'muted'): string` from `#kit/badge` — `<span class="kit-badge kit-badge--${tone}">label</span>`; an unknown or undefined tone falls back to `muted`.
  - `emptyState({ title, body? }): string` from `#kit/empty` — `<div class="kit-empty"><p class="kit-empty__title">title</p></div>`.
- Produces:
  - `formatDuration(ms: number): string` in `src/core/format/duration.js`.
  - `renderDeploys(snapshot: { generatedAt: string, deploys: object[] }, query: Record<string,string>): string` in `src/pages/deploys.js`. Task 2 wires it into the router.

- [ ] **Step 1: Write the failing `formatDuration` tests**

Create `test/core/duration.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration } from '../../src/core/format/duration.js';

test('formats minutes and seconds', () => {
  assert.equal(formatDuration(252_000), '4m 12s');
});

test('keeps the minutes under one minute and past an hour', () => {
  assert.equal(formatDuration(45_000), '0m 45s');
  assert.equal(formatDuration(3_723_000), '62m 3s');
});

test('rounds to the nearest second', () => {
  assert.equal(formatDuration(59_600), '1m 0s');
});

test('returns an empty string for junk', () => {
  assert.equal(formatDuration(Number.NaN), '');
  assert.equal(formatDuration(-1000), '');
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test test/core/duration.test.js`
Expected: FAIL — `Cannot find module '…/src/core/format/duration.js'`.

- [ ] **Step 3: Implement `formatDuration`**

Create `src/core/format/duration.js`:

```js
// A run time as minutes and seconds, such as "4m 12s". Deploys take minutes,
// so there is no hours part.
export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `node --test test/core/duration.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing page tests**

Create `test/pages/deploys.test.js`. The snapshot is deliberately out of order so the default sort is actually exercised:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeploys } from '../../src/pages/deploys.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  deploys: [
    { id: 'd-2', service: 'notifications', version: '0.9.4', environment: 'production', status: 'succeeded', startedAt: '2026-10-01T08:50:00Z', finishedAt: '2026-10-01T08:54:12Z', author: 'marco' },
    { id: 'd-0', service: 'billing', version: '2.8.0', environment: 'production', status: 'rolled-back', startedAt: '2026-10-01T07:00:00Z', finishedAt: '2026-10-01T07:03:05Z', author: 'sam' },
    { id: 'd-3', service: 'search', version: '1.23.0-rc.1', environment: 'staging', status: 'in-progress', startedAt: '2026-10-01T09:05:00Z', finishedAt: null, author: 'priya' },
    { id: 'd-1', service: 'api', version: '3.1.0', environment: 'production', status: 'failed', startedAt: '2026-10-01T08:10:00Z', finishedAt: '2026-10-01T08:31:40Z', author: 'dana' },
  ],
};

const order = (html, ...names) => {
  const at = names.map((n) => html.indexOf(`<td>${n}</td>`));
  assert.ok(at.every((i) => i >= 0), `all of ${names} are listed`);
  assert.deepEqual([...at].sort((a, b) => a - b), at, `listed in the order ${names}`);
};

test('shows the header with the snapshot time', () => {
  assert.match(
    renderDeploys(snapshot, {}),
    /<h1>Deploys<\/h1><p class="kit-muted">Snapshot 2026-10-01 09:30 UTC<\/p>/,
  );
});

test('lists the columns in order, newest first by default', () => {
  const html = renderDeploys(snapshot, {});
  const headers = [...html.matchAll(/<th[^>]*>(?:<a [^>]*>)?([^<]+)/g)].map((m) => m[1].replace(/ [▲▼]$/, ''));
  assert.deepEqual(headers, ['Service', 'Version', 'Environment', 'Status', 'Started', 'Duration', 'Author']);
  order(html, 'search', 'notifications', 'api', 'billing');
  assert.match(html, /<th aria-sort="descending"><a href="\?env=all&amp;sort=startedAt&amp;dir=asc">Started ▼<\/a><\/th>/);
  assert.match(html, /<td>2026-10-01 09:05 UTC<\/td>/);
  assert.match(html, /<td>priya<\/td>/);
});

test('sorts by service both ways', () => {
  const asc = renderDeploys(snapshot, { sort: 'service', dir: 'asc' });
  order(asc, 'api', 'billing', 'notifications', 'search');
  assert.match(asc, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=service&amp;dir=desc">Service ▲<\/a><\/th>/);
  const desc = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  order(desc, 'search', 'notifications', 'billing', 'api');
});

test('sorts by start time both ways', () => {
  const oldest = renderDeploys(snapshot, { sort: 'startedAt', dir: 'asc' });
  order(oldest, 'billing', 'api', 'notifications', 'search');
  assert.match(oldest, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=startedAt&amp;dir=desc">Started ▲<\/a><\/th>/);
});

test('sorting by service without a direction goes A to Z', () => {
  order(renderDeploys(snapshot, { sort: 'service' }), 'api', 'billing', 'notifications', 'search');
});

test('colors each status', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<span class="kit-badge kit-badge--ok">succeeded<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--bad">failed<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--warn">rolled-back<\/span>/);
  assert.match(html, /<span class="kit-badge kit-badge--info">in-progress<\/span>/);
});

test('shows how long each deploy took, or running', () => {
  const html = renderDeploys(snapshot, {});
  assert.match(html, /<td>4m 12s<\/td>/);
  assert.match(html, /<td>3m 5s<\/td>/);
  assert.match(html, /<td>21m 40s<\/td>/);
  assert.match(html, /<td>running<\/td>/);
});

test('filters by environment and keeps the filter in the sort links', () => {
  const html = renderDeploys(snapshot, { env: 'staging' });
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
  assert.match(html, /<td>search<\/td>/);
  assert.doesNotMatch(html, /<td>notifications<\/td>/);
  assert.match(html, /href="\?env=staging&amp;sort=service&amp;dir=asc"/);
});

test('keeps the sort in the filter form', () => {
  const html = renderDeploys(snapshot, { sort: 'service', dir: 'desc' });
  assert.match(html, /<form class="kit-filter-bar" method="get" action="\/deploys">/);
  assert.match(html, /<select name="env" class="kit-select" data-autosubmit>/);
  assert.match(html, /<option value="all" selected>All environments<\/option><option value="production">production<\/option><option value="staging">staging<\/option>/);
  assert.match(html, /<input type="hidden" name="sort" value="service"><input type="hidden" name="dir" value="desc">/);
});

test('names the environment when the filter matches nothing', () => {
  const productionOnly = { ...snapshot, deploys: snapshot.deploys.filter((d) => d.environment === 'production') };
  const html = renderDeploys(productionOnly, { env: 'staging' });
  assert.match(html, /<p class="kit-empty__title">No deploys in staging<\/p>/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<option value="staging" selected>/);
});

test('says there are no deploys when the snapshot is empty', () => {
  const html = renderDeploys({ ...snapshot, deploys: [] }, {});
  assert.match(html, /<p class="kit-empty__title">No deploys<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderDeploys(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="startedAt"><input type="hidden" name="dir" value="desc">/);
  order(html, 'search', 'notifications', 'api', 'billing');
});

test('escapes snapshot text', () => {
  const evil = { ...snapshot, deploys: [{ ...snapshot.deploys[0], author: '<script>' }] };
  assert.match(renderDeploys(evil, {}), /<td>&lt;script&gt;<\/td>/);
});
```

- [ ] **Step 6: Run them to verify they fail**

Run: `node --test test/pages/deploys.test.js`
Expected: FAIL — `Cannot find module '…/src/pages/deploys.js'`.

- [ ] **Step 7: Implement `renderDeploys`**

Create `src/pages/deploys.js`:

```js
import { badge } from '#kit/badge';
import { emptyState } from '#kit/empty';
import { filterBar } from '#kit/filter-bar';
import { pageHeader } from '#kit/page-header';
import { selectField } from '#kit/select';
import { dataTable } from '#kit/table';
import { formatDuration } from '../core/format/duration.js';
import { formatTimestamp } from '../core/format/timestamp.js';

// Recent deploys. Filter with ?env=production|staging; sort with
// ?sort=service|startedAt and ?dir=asc|desc (default: startedAt, newest first).
const ENVIRONMENTS = ['production', 'staging'];
// A sort without a valid direction gets the one that reads naturally.
const DEFAULT_DIR = { service: 'asc', startedAt: 'desc' };
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
  { key: 'startedAt', label: 'Started', sortable: true, render: (d) => formatTimestamp(d.startedAt) },
  { key: 'duration', label: 'Duration', render: duration },
  { key: 'author', label: 'Author' },
];

export function renderDeploys(snapshot, query) {
  const env = ENVIRONMENTS.includes(query.env) ? query.env : 'all';
  const sort = Object.hasOwn(DEFAULT_DIR, query.sort ?? '') ? query.sort : 'startedAt';
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : DEFAULT_DIR[sort];

  const deploys =
    env === 'all' ? snapshot.deploys : snapshot.deploys.filter((d) => d.environment === env);

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
    columns: COLUMNS,
    rows: deploys,
    sort: { key: sort, dir },
    sortHref: (key, next) => `?env=${env}&sort=${key}&dir=${next}`,
    empty: emptyState({ title: env === 'all' ? 'No deploys' : `No deploys in ${env}` }),
  });

  return `${pageHeader({ title: 'Deploys', subtitle: `Snapshot ${formatTimestamp(snapshot.generatedAt)}` })}
${filters}
${table}`;
}

function duration(deploy) {
  if (deploy.status === 'in-progress' || !deploy.finishedAt) return 'running';
  return formatDuration(Date.parse(deploy.finishedAt) - Date.parse(deploy.startedAt));
}
```

Notes for the implementer:
- `sortHref` returns a raw `&`; `dataTable` escapes the href, producing `&amp;` in the markup (the tests expect that).
- `Object.hasOwn` (not `in`) so `?sort=constructor` falls back, as on Services.
- `STATUS_TONES[unknown]` is `undefined`, and `badge` falls back to `muted` — an unexpected status still renders.
- The `!deploy.finishedAt` guard keeps a malformed row from rendering `NaN` (the e2e tests reject `NaN`).

- [ ] **Step 8: Run the page tests to verify they pass**

Run: `node --test test/pages/deploys.test.js test/core/duration.test.js`
Expected: PASS, 17 tests.

- [ ] **Step 9: Run the full suite**

Run: `node --test`
Expected: PASS, no failures (380 before this task + 17 new).

- [ ] **Step 10: Commit**

```bash
git add src/core/format/duration.js test/core/duration.test.js src/pages/deploys.js test/pages/deploys.test.js
git commit -m "Add the Deploys page renderer"
```

---

### Task 2: Route and nav for /deploys

**Risk tier:** standard — multi-file integration (router, nav, e2e fixtures that every nav-walking test depends on).

**Files:**
- Modify: `src/server.js` (import block, `ROUTES`)
- Modify: `src/layout.js` (`NAV`)
- Modify: `test/server.test.js`
- Create: `test/e2e/fixtures/empty/deploys.json`
- Create: `test/e2e/fixtures/single/deploys.json`
- Modify: `README.md` (Pages section)

**Interfaces:**
- Consumes: `renderDeploys(snapshot, query): string` from `src/pages/deploys.js` (Task 1); `readSnapshot('deploys', dataDir)` from `src/data.js` reads `<dataDir>/deploys.json` (default `data/`, which already holds a real snapshot).
- Produces: route `/deploys` (title "Deploys", snapshot `deploys`); nav link `{ href: '/deploys', label: 'Deploys' }` directly after Services.

- [ ] **Step 1: Write the failing server tests**

In `test/server.test.js`, add after the existing `'renders the services page inside the layout'` test:

```js
test('renders the deploys page inside the layout', async () => {
  const res = await handle('/deploys?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Deploys · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Deploys</);
  assert.match(res.body, /<a href="\/services">Services<\/a><a href="\/deploys" aria-current="page">Deploys<\/a><a href="\/incidents">/);
  assert.match(res.body, /<td>0\.9\.4<\/td>/);
  assert.doesNotMatch(res.body, /<td>1\.23\.0-rc\.1<\/td>/);
});

test('answers 503 for the deploys page without its snapshot', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/deploys', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /<h1>Deploys<\/h1>/);
  assert.match(res.body, /Snapshot unavailable/);
});
```

And in `'serves every page in the nav'`, change the first line of `paths` from:

```js
    '/', '/services', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
```

to:

```js
    '/', '/services', '/deploys', '/incidents', '/oncall', '/runbooks', '/alerts', '/hosts',
```

(`0.9.4` is the production notifications deploy in `data/deploys.json`; `1.23.0-rc.1` is the staging search deploy, so it proves the filter reached the page.)

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test test/server.test.js`
Expected: FAIL — the new tests and `serves every page in the nav` get status 404 for `/deploys`.

- [ ] **Step 3: Add the route**

In `src/server.js`, add the import in alphabetical order, between the `renderDatabases` and `renderDomains` imports:

```js
import { renderDeploys } from './pages/deploys.js';
```

And in `ROUTES`, directly after the `/services` entry:

```js
  '/deploys': { title: 'Deploys', snapshot: 'deploys', render: renderDeploys },
```

- [ ] **Step 4: Add the nav link**

In `src/layout.js`, in `NAV`, directly after `{ href: '/services', label: 'Services' },`:

```js
  { href: '/deploys', label: 'Deploys' },
```

- [ ] **Step 5: Run the server tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS, 7 tests.

- [ ] **Step 6: Run the e2e tests to see the missing fixtures**

Run: `node --test test/e2e/`
Expected: FAIL in `empty.test.js` and `single.test.js` with `503 !== 200` for `/deploys` — those tests walk every nav link against `test/e2e/fixtures/{empty,single}/`, which have no `deploys.json` yet. (`navigation`, `titles`, `queries`, `missing` should already pass.)

- [ ] **Step 7: Add the e2e fixtures**

Create `test/e2e/fixtures/empty/deploys.json` (same shape as the sibling `services.json`):

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [

  ]
}
```

Create `test/e2e/fixtures/single/deploys.json` — an in-progress deploy, the row with a null `finishedAt`, which is the one most likely to leak `NaN`:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [
    { "id": "d-1042", "service": "search", "version": "1.23.0-rc.1", "environment": "staging", "status": "in-progress", "startedAt": "2026-10-01T09:05:00Z", "finishedAt": null, "author": "priya" }
  ]
}
```

- [ ] **Step 8: Run the e2e tests to verify they pass**

Run: `node --test test/e2e/`
Expected: PASS.

- [ ] **Step 9: Update the README page list**

In `README.md`, in the Pages section, change:

```
One module per page in `src/pages/`: Overview, Services, Incidents, On-call
and Runbooks, then the estate pages from Alerts to Webhooks.
```

to:

```
One module per page in `src/pages/`: Overview, Services, Deploys, Incidents,
On-call and Runbooks, then the estate pages from Alerts to Webhooks.
```

- [ ] **Step 10: Run the full suite**

Run: `node --test`
Expected: PASS, no failures.

- [ ] **Step 11: Check the page in a browser**

Run: `npm start`, open `http://localhost:3000/deploys`, and confirm: "Deploys" is highlighted after "Services" in the nav; the chips are green/red/amber/blue; choosing "staging" in the dropdown reloads with `?env=staging` and keeps the sort; clicking "Service" then "Service" again flips the arrow and keeps `env`. Stop the server.

- [ ] **Step 12: Commit**

```bash
git add src/server.js src/layout.js test/server.test.js test/e2e/fixtures/empty/deploys.json test/e2e/fixtures/single/deploys.json README.md
git commit -m "Serve the Deploys page and link it from the nav"
```
